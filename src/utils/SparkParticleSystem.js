import * as THREE from 'three';

/**
 * 电火花粒子系统类
 * 用于创建和管理电弧和电火花粒子效果
 */
export class SparkParticleSystem {
    /**
     * 构造函数
     * @param {THREE.Scene} scene - Three.js场景对象
     * @param {Object} config - 配置参数
     * @param {THREE.Camera} camera - Three.js相机对象
     */
    constructor(scene, config, camera) {
        this.scene = scene;
        this.config = {
            position: new THREE.Vector3(0, 0, 0),
            direction: new THREE.Vector3(1, 0, 0),
            intensity: 5,
            color: new THREE.Color(0x00aaff),
            color1: '#0088ff', // 电弧主颜色（单色模式）
            color2: '#4488ff', // 电弧拖尾颜色
            enableMultiColor: true,  // 启用真实电弧颜色
            lifetime: 2,
            sparkLifetime: 1.5, // 火花粒子存活时间
            gravity: 9.8,
            airResistance: 0.1,
            maxParticles: 1000,
            cleanupInterval: 1.0,
            autoCleanup: true,
            ...config
        };
        this.camera = camera;
        this.particles = [];
        this.arcs = []; // 电弧线段
        this.sparkParticles = []; // 电火花粒子
        
        // 创建根实体组，整合所有元素
        this.rootGroup = new THREE.Group();
        this.rootGroup.name = 'SparkParticleSystem';
        
        // 创建子组管理不同类型的元素
        this.arcGroup = new THREE.Group();
        this.arcGroup.name = 'ArcGroup';
        this.sparkGroup = new THREE.Group();
        this.sparkGroup.name = 'SparkGroup';
        
        // 将子组添加到根组
        this.rootGroup.add(this.arcGroup);
        this.rootGroup.add(this.sparkGroup);
        this.clock = new THREE.Clock();
        
        // 显示控制相关属性
        this.isVisible = true;
        this.isPaused = false;
        this.savedStates = new Map(); // 保存的状态
        this.currentStateId = null;
        
        this.init();
    }
    
    /**
     * 初始化电火花系统
     */
    init() {
        // 创建电弧材质
        this.arcMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(this.config.color1 || '#0088ff'),
            transparent: true,
            opacity: 0.9,
            linewidth: 2
        });
        
        // 创建拖尾材质
        this.trailMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(this.config.color2 || '#4488ff'),
            transparent: true,
            opacity: 0.4,
            linewidth: 1
        });
        
        // 创建着色器材质（备用）
        this.createSparkShaderMaterial();
        
        // 创建基础平面几何体（备用）
        this.sparkGeometry = new THREE.PlaneGeometry(1, 1);
    }
    
    /**
     * 创建梭形粒子的着色器材质（性能优化版）
     */
    createSparkShaderMaterial() {
        const vertexShader = `
            uniform float size;
            varying vec2 vUv;
            
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            uniform vec3 color;
            varying vec2 vUv;
            
            void main() {
                vec2 uv = vUv - 0.5;
                
                // 创建菱形形状
                float diamond = 1.0 - (abs(uv.x) + abs(uv.y));
                diamond = smoothstep(0.0, 0.1, diamond);
                
                // 确保可见性
                float alpha = diamond * 0.9;
                
                if (alpha < 0.01) discard;
                
                gl_FragColor = vec4(color, alpha);
            }
        `;

        this.sparkShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xffaa00) },
                size: { value: 1.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    }
    
    /**
     * 创建锯齿状电弧路径
     * @param {THREE.Vector3} start - 起点
     * @param {THREE.Vector3} end - 终点
     * @param {number} segments - 分段数量
     * @returns {THREE.Vector3[]} 路径点数组
     */
    createArcPath(start, end, segments = 8) {
        const points = [];
        const direction = end.clone().sub(start);
        const length = direction.length();
        
        // 如果起点和终点相同，直接返回起点
        if (length < 0.001) {
            points.push(start.clone());
            return points;
        }
        
        // 创建垂直向量，避免NaN
        let perp = new THREE.Vector3();
        if (Math.abs(direction.x) > 0.001 || Math.abs(direction.y) > 0.001) {
            perp.set(-direction.y, direction.x, 0).normalize();
        } else {
            // 如果方向主要是Z轴，使用X轴作为垂直方向
            perp.set(1, 0, 0);
        }
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pos = start.clone().lerp(end, t);
            
            // 添加锯齿状偏移，确保不是NaN
            const offset = Math.sin(t * Math.PI * 4) * length * 0.05 * (1 - t) || 0;
            pos.add(perp.clone().multiplyScalar(offset));
            
            // 添加随机抖动
            pos.x += (Math.random() - 0.5) * 0.1;
            pos.y += (Math.random() - 0.5) * 0.1;
            pos.z += (Math.random() - 0.5) * 0.1;
            
            // 确保所有坐标都是有效数字
            if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z)) {
                pos.set(start.x, start.y, start.z);
            }
            
            points.push(pos);
        }
        
        return points;
    }
    
    /**
     * 发射电弧
     */
    emitArc() {
        const count = Math.floor(this.config.intensity / 20);
        const startPos = new THREE.Vector3(
            this.config.position.x || 0,
            this.config.position.y || 0,
            this.config.position.z || 0
        );

        for (let i = 0; i < count; i++) {
            // 创建电弧终点，确保所有值都是有效数字
            const dirX = this.config.direction.x || 0;
            const dirY = this.config.direction.y || 0;
            const dirZ = this.config.direction.z || 0;
            const speed = this.config.speed || 100;
            const lifetime = this.config.lifetime || 0.1;

            const endPos = new THREE.Vector3(
                dirX * speed * lifetime * 0.1,
                dirY * speed * lifetime * 0.1,
                dirZ * speed * lifetime * 0.1
            );

            // 添加扩散角度
            if (this.config.randomDirection) {
                const spread = this.config.spread || 0;
                endPos.x += (Math.random() - 0.5) * spread * 50;
                endPos.y += (Math.random() - 0.5) * spread * 50;
                endPos.z += (Math.random() - 0.5) * spread * 50;
            }

            // 应用重力影响
            const gravity = this.config.gravity || -100;
            endPos.y += 0.5 * gravity * lifetime * lifetime;

            // 将终点位置转换为世界坐标
            endPos.add(startPos);

            // 确保终点与起点有足够距离
            if (endPos.distanceTo(startPos) < 0.01) {
                endPos.x += 0.1;
                endPos.y += 0.1;
                endPos.z += 0.1;
            }

            // 创建电弧路径
            const points = this.createArcPath(
                startPos.clone(),
                endPos,
                6 + Math.floor(Math.random() * 4)
            );

            // 创建电弧线段
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const arc = new THREE.Line(geometry, this.arcMaterial.clone());

            // 设置电弧属性
            arc.userData = {
                age: 0,
                maxAge: this.config.lifetime * (0.5 + Math.random() * 0.5),
                startTime: this.clock.getElapsedTime()
            };

            // 设置电弧颜色（多彩效果）
            const material = arc.material;
            const arcColor = this.getRandomArcColor();
            material.color.set(arcColor);
            material.opacity = 0.9;

            this.arcGroup.add(arc);
            this.arcs.push(arc);

            // 创建拖尾效果
            this.createTrail(points);
            
            // 偶然发射电火花粒子（基于配置概率）
            if (Math.random() < (this.config.sparkProbability || 0.2)) {
                this.emitSparkParticles(startPos, endPos);
            }
        }
    }
    
    /**
     * 发射电火花粒子
     */
    emitSparkParticles(startPos, endPos) {
        const particleCount = 5 + Math.floor(Math.random() * 10);
        const baseDirection = endPos.clone().sub(startPos).normalize();
        
        for (let i = 0; i < particleCount; i++) {
            const spark = this.createSparkParticle(startPos, baseDirection);
            this.sparkParticles.push(spark);
        }
    }
    
    /**
     * 创建单个点状粒子
     * @param {THREE.Vector3} startPos - 起始位置
     * @param {THREE.Vector3} baseDirection - 基础方向
     * @returns {THREE.Mesh} 粒子对象
     */
    createSparkParticle(startPos, baseDirection) {
        // 随机方向偏移（缩小扩散角）
        const spreadAngle = Math.PI / 6; // 30度扩散角
        const randomAngle = Math.random() * spreadAngle - spreadAngle / 2;
        const randomAxis = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        
        const direction = baseDirection.clone().applyAxisAngle(randomAxis, randomAngle);
        
        // 增加速度
        const speed = 20.0 + Math.random() * 5.0;
        
        // 点状粒子使用更大的基础尺寸
        const baseSize = 0.3; // 增大基础尺寸
        const size = (this.config.sparkSize || baseSize) * (0.8 + Math.random() * 1.2);
        
        // 使用发光材质增强视觉效果
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xffaa00),
            transparent: true,
            opacity: 1.0, // 完全不透明
            side: THREE.DoubleSide
        });
        
        // 创建圆形点状几何体
        const geometry = new THREE.CircleGeometry(size, 8); // 8边形近似圆形
        
        // 创建粒子
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(startPos);
        
        // 让圆形平面朝向摄像机（始终面向观察者）
        particle.lookAt(this.camera.position);
        
        // 随机颜色变化（橙黄色系，更鲜艳）
        const hue = 0.05 + Math.random() * 0.15; // 橙黄到黄色
        const saturation = 0.9 + Math.random() * 0.1; // 高饱和度
        const lightness = 0.7 + Math.random() * 0.2; // 更亮
        particle.material.color.setHSL(hue, saturation, lightness);
        
        particle.userData = {
            velocity: direction.multiplyScalar(speed),
            life: 0,
            maxLife: this.config.sparkLifetime || (0.8 + Math.random() * 1.5), // 火花存活时间
            initialScale: size,
            direction: direction.clone(),
            gravity: this.config.gravity || 9.8, // 重力加速度
            airResistance: this.config.airResistance || 0.15 // 空气阻力
        };
        
        this.sparkGroup.add(particle);
        return particle;
    }
    
    /**
     * 创建拖尾效果
     * @param {THREE.Vector3[]} points - 路径点数组
     */
    createTrail(points) {
        const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const trailMaterial = this.trailMaterial.clone();
        
        // 为拖尾也添加多彩效果
        if (this.config.enableMultiColor) {
            const trailColor = this.getRandomArcColor();
            trailMaterial.color.set(trailColor);
            trailMaterial.opacity = 0.3; // 拖尾更透明
        }
        
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        trail.userData = {
            age: 0,
            maxAge: this.config.lifetime * 0.3,
            isTrail: true,
            color: trailMaterial.color.clone() // 保存颜色用于更新
        };
        
        this.arcGroup.add(trail);
        this.arcs.push(trail);
    }
    
    /**
     * 更新电弧系统
     * @param {number} deltaTime - 时间增量
     */
    update(deltaTime) {
        // 如果系统被暂停，则不更新
        if (this.isPaused) {
            return;
        }
        
        // 如果系统不可见，仍然需要更新生命周期，但不发射新电弧
        if (this.isVisible) {
            // 发射新电弧
            if(Math.random() < this.config.intensity / 1000) {
                this.emitArc();
            }
        }
        
        // 更新现有电弧（无论是否可见，都要更新生命周期）
        for (let i = this.arcs.length - 1; i >= 0; i--) {
            const arc = this.arcs[i];
            arc.userData.age += deltaTime;
            
            if (arc.userData.age >= arc.userData.maxAge) {
                if (arc.userData.isTrail) {
                    this.arcGroup.remove(arc);
                } else {
                    this.arcGroup.remove(arc);
                }
                arc.geometry.dispose();
                if (arc.material) arc.material.dispose();
                this.arcs.splice(i, 1);
                continue;
            }
            
            // 只有在可见时才更新外观
            if (this.isVisible) {
                // 更新电弧外观
                const lifeRatio = arc.userData.age / arc.userData.maxAge;
                
                if (arc.userData.isTrail) {
                    // 拖尾效果
                    arc.material.opacity = 0.4 * (1 - lifeRatio);
                    if (!this.config.enableMultiColor) {
                        arc.material.color.lerpColors(
                            new THREE.Color(this.config.color2 || '#4488ff'),
                            new THREE.Color(0x001122),
                            lifeRatio
                        );
                    } else {
                        // 多彩模式下，使用保存的颜色进行渐变
                        arc.material.color.lerpColors(
                            arc.userData.color,
                            new THREE.Color(0x001122),
                            lifeRatio
                        );
                    }
                } else {
                    // 主电弧
                    arc.material.opacity = 0.9 * (1 - lifeRatio);
                    
                    // 电弧闪烁效果
                    if (Math.random() < 0.1) {
                        arc.material.opacity *= 0.3;
                    }
                }
            }
        }

        // 更新电火花粒子（无论是否可见，都要更新生命周期）
        for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
            const particle = this.sparkParticles[i];
            const userData = particle.userData;
            
            userData.life += deltaTime;
            
            // 只有在可见时才更新位置和外观
            if (this.isVisible) {
                // 应用重力影响
                userData.velocity.y -= userData.gravity * deltaTime;
                
                // 应用空气阻力
                userData.velocity.multiplyScalar(1 - userData.airResistance * deltaTime);
                
                // 更新位置
                particle.position.add(userData.velocity.clone().multiplyScalar(deltaTime));
                
                // 让圆形粒子始终面向摄像机
                particle.lookAt(this.camera.position);
            }
            
            const progress = userData.life / userData.maxLife;
            
            if (progress >= 1) {
                this.sparkGroup.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                this.sparkParticles.splice(i, 1);
            } else if (this.isVisible) {
                // 更新透明度（淡出效果）
                particle.material.opacity = 0.8 * (1 - progress);
                
                // 更新大小（缩小效果）- 点状粒子均匀缩放
                const scale = userData.initialScale * (1 - progress * 0.5);
                particle.scale.set(scale, scale, scale);
            }
        }
    }
    
    /**
     * 重置粒子系统
     */
    reset() {
        // 清空所有电弧
        for (const arc of this.arcs) {
            this.arcGroup.remove(arc);
            arc.geometry.dispose();
            if (arc.material) arc.material.dispose();
        }
        this.arcs = [];
        
        // 清理电火花粒子
        for (const spark of this.sparkParticles) {
            this.sparkGroup.remove(spark);
            spark.geometry.dispose();
            spark.material.dispose();
        }
        this.sparkParticles = [];
    }
    
    /**
     * 显示粒子系统
     */
    show() {
        this.isVisible = true;
        this._updateVisibility();
    }

    /**
     * 隐藏粒子系统
     */
    hide() {
        this.isVisible = false;
        this._updateVisibility();
    }

    /**
     * 切换显示/隐藏状态
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this._updateVisibility();
    }

    /**
     * 更新所有对象的可见性
     * @private
     */
    _updateVisibility() {
        const visible = this.isVisible;
        
        // 更新电弧可见性
        this.arcs.forEach(arc => {
            arc.visible = visible;
        });
        
        // 更新电火花粒子可见性
        this.sparkParticles.forEach(particle => {
            particle.visible = visible;
        });
    }

    /**
     * 暂停粒子系统
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * 恢复粒子系统
     */
    resume() {
        this.isPaused = false;
    }

    /**
     * 检查是否暂停
     * @returns {boolean} 是否暂停
     */
    isPaused() {
        return this.isPaused;
    }

    /**
     * 保存当前状态
     * @param {string} stateId - 状态ID
     * @param {Object} additionalData - 额外保存的数据
     */
    saveState(stateId, additionalData = {}) {
        const state = {
            config: { ...this.config },
            isVisible: this.isVisible,
            isPaused: this.isPaused,
            arcsCount: this.arcs.length,
            particlesCount: this.sparkParticles.length,
            timestamp: Date.now(),
            ...additionalData
        };
        
        this.savedStates.set(stateId, state);
        this.currentStateId = stateId;
        
        return state;
    }

    /**
     * 加载保存的状态
     * @param {string} stateId - 状态ID
     * @returns {boolean} 是否成功加载
     */
    loadState(stateId) {
        const state = this.savedStates.get(stateId);
        if (!state) {
            console.warn(`状态 ${stateId} 不存在`);
            return false;
        }
        
        // 更新配置
        Object.assign(this.config, state.config);
        
        // 更新显示状态
        this.isVisible = state.isVisible;
        this.isPaused = state.isPaused;
        
        this.currentStateId = stateId;
        
        // 更新可见性
        this._updateVisibility();
        
        return true;
    }

    /**
     * 获取所有保存的状态ID
     * @returns {string[]} 状态ID数组
     */
    getSavedStateIds() {
        return Array.from(this.savedStates.keys());
    }

    /**
     * 获取保存的状态信息
     * @param {string} stateId - 状态ID
     * @returns {Object|null} 状态信息
     */
    getStateInfo(stateId) {
        const state = this.savedStates.get(stateId);
        if (!state) return null;
        
        return {
            ...state,
            id: stateId
        };
    }

    /**
     * 删除保存的状态
     * @param {string} stateId - 状态ID
     * @returns {boolean} 是否成功删除
     */
    deleteState(stateId) {
        if (this.savedStates.has(stateId)) {
            this.savedStates.delete(stateId);
            if (this.currentStateId === stateId) {
                this.currentStateId = null;
            }
            return true;
        }
        return false;
    }

    /**
     * 导出所有状态到JSON
     * @returns {string} JSON字符串
     */
    exportStates() {
        const exportData = {
            states: Array.from(this.savedStates.entries()).map(([id, state]) => [id, state]),
            currentStateId: this.currentStateId,
            version: '1.0.0'
        };
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 从JSON导入状态
     * @param {string} jsonData - JSON字符串
     * @returns {boolean} 是否成功导入
     */
    importStates(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (importData.states && Array.isArray(importData.states)) {
                this.savedStates.clear();
                
                importData.states.forEach(([id, state]) => {
                    this.savedStates.set(id, state);
                });
                
                if (importData.currentStateId) {
                    this.currentStateId = importData.currentStateId;
                }
                
                return true;
            }
        } catch (error) {
            console.error('导入状态失败:', error);
        }
        return false;
    }

    /**
     * 获取整体实体，包含所有电弧和火花粒子
     * @returns {THREE.Group} 包含所有元素的根实体组
     */
    getEntity() {
        return this.rootGroup;
    }
    
    /**
     * 将整体实体添加到指定场景
     * @param {THREE.Scene} scene - 目标场景
     */
    addToScene() {
        this.scene.add(this.rootGroup);
    }
    
    /**
     * 从指定场景移除整体实体
     * @param {THREE.Scene} scene - 目标场景
     */
    removeFromScene(scene) {
        scene.remove(this.rootGroup);
    }
    
    /**
     * 获取当前状态摘要
     * @returns {Object} 当前状态摘要
     */
    getCurrentStateSummary() {
        return {
            isVisible: this.isVisible,
            isPaused: this.isPaused,
            arcsCount: this.arcs.length,
            particlesCount: this.sparkParticles.length,
            currentStateId: this.currentStateId,
            savedStatesCount: this.savedStates.size,
            entity: this.rootGroup
        };
    }

    /**
     * 获取随机电弧颜色（基于真实电弧光谱）
     * @returns {string} 随机颜色值
     */
    getRandomArcColor() {
        if (!this.config.enableMultiColor) {
            return this.config.color1;
        }
        
        // 真实电弧颜色库
        const arcColors = [
            '#A6D1FF',  // 淡蓝色 - 低压电弧
            '#8A2BE2',  // 紫罗兰色 - 高压电离
            '#1E90FF',  // 道奇蓝 - 标准电弧
            '#FFFACD',  // 柠檬绸色 - 高温火花
            '#7CFC00'   // 草绿色 - 铜离子电弧
        ];
        
        // 根据实际电弧出现概率分配权重
        const colorWeights = {
            '#A6D1FF': 0.40,  // 淡蓝色最常见
            '#1E90FF': 0.40,  // 道奇蓝较常见
            '#FFFACD': 0.15,  // 柠檬绸色中等
            '#8A2BE2': 0.05,  // 紫罗兰色较少
        };
        
        // 使用权重随机选择颜色
        const random = Math.random();
        let cumulative = 0;
        
        for (const color of arcColors) {
            cumulative += colorWeights[color];
            if (random <= cumulative) {
                return color;
            }
        }
        
        return '#A6D1FF'; // 默认返回淡蓝色
    }
    
    /**
     * 更新颜色配置
     * @param {string} color1 - 电弧主颜色
     * @param {string} color2 - 电弧拖尾颜色
     */
    updateColors(color1, color2) {
        this.config.color1 = color1;
        this.config.color2 = color2;
        
        // 更新材质颜色
        this.arcMaterial.color.set(color1);
        this.trailMaterial.color.set(color2);
    }
    
    /**
     * 销毁粒子系统
     */
    dispose() {
        // 清空所有电弧
        this.reset();
        
        // 清理材质
        if (this.arcMaterial) {
            this.arcMaterial.dispose();
        }
        if (this.trailMaterial) {
            this.trailMaterial.dispose();
        }
        if (this.sparkShaderMaterial) {
            this.sparkShaderMaterial.dispose();
        }
        if (this.sparkGeometry) {
            this.sparkGeometry.dispose();
        }
        
        // 清理保存的状态
        this.savedStates.clear();
    }
}