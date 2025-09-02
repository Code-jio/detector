import * as THREE from 'three';

/**
 * 喷水粒子系统类
 * 用于创建和控制喷水特效，支持自定义方向、速度和重力
 */
export class FountainParticleSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // 将输入参数转换为Three.js对象
        this.position = new THREE.Vector3(
            options.position?.x ?? 0,
            options.position?.y ?? 0,
            options.position?.z ?? 0
        );
        
        // 保存初始位置用于重置
        this.initialPosition = this.position.clone();
        
        this.particles = [];
        this.maxParticles = options.maxParticles ?? 3000;
        this.gravity = options.gravity ?? -9.8;
        
        // 可配置参数（支持对象格式输入）
        this.direction = new THREE.Vector3(
            options.direction?.x ?? 0,
            options.direction?.y ?? 1,
            options.direction?.z ?? 0
        ).normalize();
        
        this.initialSpeed = options.initialSpeed ?? 50; // 初始喷射速度
        this.spread = options.spread ?? 0.1; // 喷射扩散角度
        this.particleSize = options.particleSize ?? 1; // 粒子大小
        this.particleLife = options.particleLife ?? 2; // 粒子生命周期（秒）
        this.emissionRate = options.emissionRate ?? 1500; // 每秒发射粒子数
        this.airResistance = options.airResistance ?? 1.0; // 无空气阻力
        this.sizeDecay = options.sizeDecay ?? 0.8; // 粒子大小随时间衰减
        
        this.clock = new THREE.Clock();
        this.lastEmitTime = 0; // 上次发射时间
        
        this.createParticleMaterial();
        this.createParticleGeometry();
    }
    
    /**
     * 创建粒子材质
     * 使用更真实的水材质：淡蓝色、透明度变化、大小衰减
     */
    createParticleMaterial() {
        // 创建渐变纹理用于更真实的水滴效果
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // 创建径向渐变的水滴纹理
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(200, 230, 255, 0.8)');
        gradient.addColorStop(0.4, 'rgba(150, 200, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(100, 170, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(50, 100, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        this.particleMaterial = new THREE.PointsMaterial({
            map: texture,
            color: 0x88ccff,
            size: this.particleSize,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            alphaTest: 0.1 // 提高边缘透明度
        });
    }
    
    /**
     * 创建粒子几何体
     * 使用BufferGeometry优化性能，预分配内存
     */
    createParticleGeometry() {
        this.particleGeometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = new Float32Array(this.maxParticles * 3);
        this.lifetimes = new Float32Array(this.maxParticles);
        this.startTimes = new Float32Array(this.maxParticles);
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        
        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.particleSystem.position.copy(this.position);
        this.particleSystem.name = "fountain"
        this.scene.add(this.particleSystem);
    }
    
    /**
     * 发射新粒子
     * 当粒子数量达到上限时重用最旧的粒子
     */
    emitParticle() {
        if (this.particles.length >= this.maxParticles) {
            // 重用最旧的粒子
            const oldestParticle = this.particles.shift();
            this.resetParticle(oldestParticle.index);
            this.particles.push(oldestParticle);
        } else {
            // 创建新粒子
            const particleIndex = this.particles.length;
            this.resetParticle(particleIndex);
            this.particles.push({ index: particleIndex });
        }
    }
    
    /**
     * 重置粒子状态
     * 设置初始位置、速度和生命周期，添加随机变化
     * @param {number} index - 粒子索引
     */
    resetParticle(index) {
        const i3 = index * 3;
        
        // 初始位置（重置到发射点）
        this.positions[i3] = 0;
        this.positions[i3 + 1] = 0;
        this.positions[i3 + 2] = 0;
        
        // 初始速度（基于方向和扩散角度，添加速度变化）
        const spreadX = (Math.random() - 0.5) * this.spread * 1.2;
        const spreadZ = (Math.random() - 0.5) * this.spread * 1.2;
        const speedVariation = 0.8 + Math.random() * 0.4; // 80%-120%速度变化
        
        const direction = this.direction.clone();
        direction.x += spreadX;
        direction.z += spreadZ;
        direction.normalize();
        
        this.velocities[i3] = direction.x * this.initialSpeed * speedVariation;
        this.velocities[i3 + 1] = direction.y * this.initialSpeed * speedVariation;
        this.velocities[i3 + 2] = direction.z * this.initialSpeed * speedVariation;
        
        // 重置生命周期（用于持续循环）
        this.lifetimes[index] = 0;
        this.startTimes[index] = this.clock.getElapsedTime();
    }
    
    /**
     * 更新粒子系统
     * 每帧调用，处理粒子循环运动和物理模拟
     * @param {number} deltaTime - 时间增量（秒）
     */
    update(deltaTime) {
        const currentTime = this.clock.getElapsedTime();        
        // 持续发射新粒子
        this.lastEmitTime += deltaTime;
        const emitInterval = 1 / this.emissionRate;
        while (this.lastEmitTime >= emitInterval) {
            this.emitParticle();
            this.lastEmitTime -= emitInterval;
        }
        
        // 更新所有粒子，永久循环运动
        const positions = this.particleGeometry.attributes.position.array;
        const sizes = this.particleGeometry.attributes.size?.array || new Float32Array(this.maxParticles);
        
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const index = particle.index;
            const i3 = index * 3;
            
            // 应用重力和空气阻力
            this.velocities[i3] *= Math.pow(this.airResistance, deltaTime * 60);
            this.velocities[i3 + 1] += this.gravity * deltaTime;
            this.velocities[i3 + 1] *= Math.pow(this.airResistance, deltaTime * 60);
            this.velocities[i3 + 2] *= Math.pow(this.airResistance, deltaTime * 60);
            
            // 更新位置
            this.positions[i3] += this.velocities[i3] * deltaTime;
            this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
            this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;
            
            // 当粒子落到足够低的位置时，重置回发射点（循环运动）
            if (this.positions[i3 + 1] < -10) { // 当粒子落得太远时重置
                this.resetParticle(index);
            }
            
            // 保持粒子大小恒定（移除生命周期相关的变化）
            sizes[index] = this.particleSize;
        }
        
        // 更新几何体缓冲区
        this.particleGeometry.attributes.position.needsUpdate = true;
        
        // 确保size属性存在并更新
        if (!this.particleGeometry.attributes.size) {
            this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        }
        this.particleGeometry.attributes.size.needsUpdate = true;
        
        // 保持恒定透明度
        this.particleMaterial.opacity = 0.8;
    }
    
    /**
     * 设置喷射方向
     * @param {Object|THREE.Vector3} direction - 喷射方向向量，支持{x,y,z}对象格式
     */
    setDirection(direction) {
        if (direction && typeof direction === 'object') {
            if (direction instanceof THREE.Vector3) {
                this.direction.copy(direction).normalize();
            } else {
                // 支持普通对象格式{x,y,z}
                this.direction.set(
                    direction.x ?? this.direction.x,
                    direction.y ?? this.direction.y,
                    direction.z ?? this.direction.z
                ).normalize();
            }
        }
    }
    
    /**
     * 设置粒子系统位置
     * @param {Object|THREE.Vector3} position - 位置坐标，支持{x,y,z}对象格式
     */
    setPosition(position) {
        if (position && typeof position === 'object') {
            if (position instanceof THREE.Vector3) {
                this.position.copy(position);
                this.particleSystem.position.copy(position);
            } else {
                // 支持普通对象格式{x,y,z}
                this.position.set(
                    position.x ?? this.position.x,
                    position.y ?? this.position.y,
                    position.z ?? this.position.z
                );
                this.particleSystem.position.copy(this.position);
            }
        }
    }
    
    /**
     * 设置初始喷射速度
     * @param {number} speed - 速度值（单位/秒）
     */
    setInitialSpeed(speed) {
        this.initialSpeed = Math.max(0, speed);
    }
    
    /**
     * 设置重力加速度
     * @param {number} gravity - 重力值（向下为负）
     */
    setGravity(gravity) {
        this.gravity = gravity;
    }
    
    /**
     * 设置粒子大小
     * @param {number} size - 粒子大小
     */
    setParticleSize(size) {
        this.particleSize = Math.max(0.1, size);
        this.particleMaterial.size = this.particleSize;
    }
    
    /**
     * 设置粒子生命周期
     * @param {number} life - 生命周期（秒）
     */
    setParticleLife(life) {
        this.particleLife = Math.max(0.1, life);
    }
    
    /**
     * 设置发射频率
     * @param {number} rate - 每秒发射粒子数
     */
    setEmissionRate(rate) {
        this.emissionRate = Math.max(0, rate);
    }
    
    /**
     * 批量更新配置参数
     * @param {Object} config - 配置对象，支持所有可配置参数的对象格式
     */
    updateConfig(config) {
        if (!config || typeof config !== 'object') return;
        
        // 位置（包括初始位置）
        if (config.initialPosition) {
            this.setInitialPosition(config.initialPosition);
        } else if (config.position) {
            this.setPosition(config.position);
        }
        
        // 方向
        if (config.direction) {
            this.setDirection(config.direction);
        }
        
        // 其他数值参数
        const numericParams = [
            'initialSpeed', 'spread', 'particleSize', 'particleLife',
            'emissionRate', 'airResistance', 'sizeDecay', 'gravity',
            'maxParticles'
        ];
        
        numericParams.forEach(param => {
            if (typeof config[param] === 'number') {
                this[param] = config[param];
                if (param === 'particleSize') {
                    this.particleMaterial.size = this.particleSize;
                }
            }
        });
    }
    
    /**
     * 清理资源
     * 从场景中移除并释放内存
     */
    dispose() {
        this.scene.remove(this.particleSystem);
        this.particleGeometry.dispose();
        this.particleMaterial.dispose();
    }
}