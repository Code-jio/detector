import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';  

/**
 * 烟雾粒子系统类
 * 使用particle-engine库创建逼真的烟雾效果
 */
export class SmokeParticleSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            maxParticles: options.maxParticles || 1000,
            particleSize: options.particleSize || 2.0,
            emissionRate: options.emissionRate || 50,
            lifetime: options.lifetime || 5.0,
            windForce: options.windForce || new THREE.Vector3(0.5, 0.8, 0.1),
            turbulence: options.turbulence || 0.3,
            colorStart: options.colorStart || new THREE.Color(0x888888),
            colorEnd: options.colorEnd || new THREE.Color(0x333333),
            position: options.position || new THREE.Vector3(0, 0, 0),
            spread: options.spread || new THREE.Vector3(10, 5, 10),
            ...options
        };

        this.particles = [];
        this.activeParticles = [];
        this.clock = new THREE.Clock();
        this.emitter = null;
        
        this.init();
    }

    init() {
        // 创建粒子几何体
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.options.maxParticles * 3);
        this.colors = new Float32Array(this.options.maxParticles * 3);
        this.sizes = new Float32Array(this.options.maxParticles);
        this.alphas = new Float32Array(this.options.maxParticles);
        this.ages = new Float32Array(this.options.maxParticles);
        this.velocities = new Float32Array(this.options.maxParticles * 3);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

        // 创建烟雾材质
        // 创建烟雾材质
        const smokeTexture = new THREE.TextureLoader().load('/texture/smoke1.png', 
            (texture) => {
                // 纹理加载成功
                console.log('烟雾纹理加载成功');
            },
            undefined,
            (error) => {
                // 纹理加载失败，使用备用纹理
                console.warn('烟雾纹理加载失败，使用备用纹理', error);
                // 创建一个简单的白色纹理作为备用
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                
                // 创建径向渐变作为烟雾纹理
                const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
                gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 256, 256);
                
                this.material.uniforms.smokeTexture.value = new THREE.CanvasTexture(canvas);
            }
        );
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                smokeTexture: { value: smokeTexture },
                cameraPos: { value: new THREE.Vector3() }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float time;
                uniform vec3 cameraPos;
                
                void main() {
                    vColor = color;
                    vAlpha = alpha;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // 根据距离调整大小
                    float distance = length(mvPosition.xyz);
                    float sizeFactor = 1.0 + distance * 0.01;
                    
                    gl_PointSize = size * sizeFactor * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D smokeTexture;
                uniform float time;
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vec4 texColor = texture2D(smokeTexture, gl_PointCoord);
                    
                    // 烟雾效果混合
                    vec3 finalColor = vColor * texColor.rgb;
                    float finalAlpha = texColor.a * vAlpha * 0.6;
                    
                    gl_FragColor = vec4(finalColor, finalAlpha);
                    
                    // 边缘柔化
                    if (gl_FragColor.a < 0.01) discard;
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this.particleSystem = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particleSystem);

        // 初始化粒子池
        for (let i = 0; i < this.options.maxParticles; i++) {
            this.particles.push({
                index: i,
                active: false,
                age: 0,
                lifetime: 0,
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                color: new THREE.Color(),
                size: 0,
                alpha: 0
            });
        }
    }

    emitParticle() {
        if (this.activeParticles.length >= this.options.maxParticles) return;

        // 找到第一个非活动粒子
        let particle = null;
        for (let i = 0; i < this.particles.length; i++) {
            if (!this.particles[i].active) {
                particle = this.particles[i];
                break;
            }
        }

        if (!particle) return;

        // 重置粒子属性
        particle.active = true;
        particle.age = 0;
        particle.lifetime = this.options.lifetime * (0.8 + Math.random() * 0.4);
        
        // 随机初始位置
        particle.position.copy(this.options.position);
        particle.position.x += (Math.random() - 0.5) * this.options.spread.x;
        particle.position.y += (Math.random() - 0.5) * this.options.spread.y;
        particle.position.z += (Math.random() - 0.5) * this.options.spread.z;

        // 初始速度
        particle.velocity.set(
            (Math.random() - 0.5) * this.options.turbulence,
            1.0 + Math.random() * 0.5, // 向上漂浮
            (Math.random() - 0.5) * this.options.turbulence
        );

        particle.size = this.options.particleSize * (0.5 + Math.random() * 0.5);
        particle.color.copy(this.options.colorStart);
        particle.alpha = 0.8 + Math.random() * 0.2;

        this.activeParticles.push(particle);
    }

    update(deltaTime) {
        const currentTime = this.clock.getElapsedTime();
        
        // 更新着色器时间
        this.material.uniforms.time.value = currentTime;

        // 发射新粒子
        const particlesToEmit = Math.floor(this.options.emissionRate * deltaTime);
        for (let i = 0; i < particlesToEmit; i++) {
            this.emitParticle();
        }

        // 更新活动粒子
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            particle.age += deltaTime;

            if (particle.age >= particle.lifetime) {
                // 粒子生命周期结束
                particle.active = false;
                this.activeParticles.splice(i, 1);
                continue;
            }

            // 计算生命周期比例
            const lifeRatio = particle.age / particle.lifetime;

            // 更新位置
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            
            // 添加风力和湍流
            const turbulence = new THREE.Vector3(
                (Math.random() - 0.5) * this.options.turbulence,
                0,
                (Math.random() - 0.5) * this.options.turbulence
            );
            particle.velocity.add(turbulence);
            particle.velocity.add(this.options.windForce.clone().multiplyScalar(deltaTime));

            // 速度衰减
            particle.velocity.multiplyScalar(0.99);

            // 更新颜色（从浅到深）
            particle.color.lerpColors(
                this.options.colorStart,
                this.options.colorEnd,
                lifeRatio
            );

            // 更新大小（逐渐增大）
            particle.size *= 1.01;

            // 更新透明度（逐渐减小）
            particle.alpha = Math.max(0, 1.0 - lifeRatio);

            // 更新缓冲区数据
            const index = particle.index;
            this.positions[index * 3] = particle.position.x;
            this.positions[index * 3 + 1] = particle.position.y;
            this.positions[index * 3 + 2] = particle.position.z;

            this.colors[index * 3] = particle.color.r;
            this.colors[index * 3 + 1] = particle.color.g;
            this.colors[index * 3 + 2] = particle.color.b;

            this.sizes[index] = particle.size;
            this.alphas[index] = particle.alpha;
            this.ages[index] = particle.age;
        }

        // 更新几何体缓冲区
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.alpha.needsUpdate = true;
    }

    setPosition(position) {
        this.options.position.copy(position);
    }

    setEmissionRate(rate) {
        this.options.emissionRate = rate;
    }

    setMaxParticles(max) {
        this.options.maxParticles = max;
    }

    destroy() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.geometry.dispose();
            this.material.dispose();
        }
    }
}

/**
 * 烟雾效果管理器
 * 提供简化的烟雾效果创建接口
 */
export class SmokeEffectManager {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
  }

  createSmokeEffect(options = {}) {
    const smokeEffect = new SmokeParticleSystem(this.scene, options);
    this.effects.push({
      type: "smoke",
      effect: smokeEffect,
    });

    // 添加到全局效果列表
    if (!window.effects) window.effects = [];
    window.effects.push({
      type: "smoke",
      update: (deltaTime) => smokeEffect.update(deltaTime),
    });

    return smokeEffect;
  }

  removeEffect(effect) {
    const index = this.effects.findIndex((e) => e.effect === effect);
    if (index !== -1) {
      this.effects[index].effect.destroy();
      this.effects.splice(index, 1);

      // 从全局效果列表中移除
      if (window.effects) {
        const globalIndex = window.effects.findIndex(
          (e) => e.effect === effect
        );
        if (globalIndex !== -1) {
          window.effects.splice(globalIndex, 1);
        }
      }
    }
  }

  update(deltaTime) {
    this.effects.forEach(({ effect }) => {
      if (effect.update) {
        effect.update(deltaTime);
      }
    });
  }

  destroy() {
    this.effects.forEach(({ effect }) => {
      effect.destroy();
    });
    this.effects = [];
  }
    
  /**
   * 让烟雾逐渐变大
   * @param {number} targetScale - 目标缩放倍数 (默认2.0)
   * @param {number} duration - 变大持续时间（秒，默认3.0）
   * @param {Function} onComplete - 完成回调函数
   */
  growSmoke(targetScale = 2.0, duration = 3.0, onComplete = null) {
    if (this.growAnimation) {
      this.growAnimation.stop();
    }

    this.growAnimation = new TWEEN.Tween({ scale: 1.0 })
      .to({ scale: targetScale }, duration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        this.currentScale = obj.scale;
        this.particleSystem.scale.setScalar(obj.scale);

        // 同步调整发射位置的范围
        const scaleFactor = obj.scale;
        this.options.spread.multiplyScalar(1 + (scaleFactor - 1) * 0.1);
      })
      .onComplete(() => {
        if (onComplete) onComplete();
        this.growAnimation = null;
      })
      .start();
  }

  /**
   * 让烟雾逐渐变小直到消失
   * @param {number} duration - 变小持续时间（秒，默认2.0）
   * @param {Function} onComplete - 完成回调函数
   */
  shrinkSmoke(duration = 2.0, onComplete = null) {
    if (this.shrinkAnimation) {
      this.shrinkAnimation.stop();
    }

    // 获取当前缩放值
    const currentScale = this.currentScale || 1.0;

    this.shrinkAnimation = new TWEEN.Tween({
      scale: currentScale,
      opacity: 1.0,
    })
      .to({ scale: 0.0, opacity: 0.0 }, duration * 1000)
      .easing(TWEEN.Easing.Quadratic.In)
      .onUpdate((obj) => {
        this.currentScale = obj.scale;
        this.particleSystem.scale.setScalar(obj.scale);

        // 同时降低透明度
        if (this.material.uniforms) {
          this.material.uniforms.globalOpacity = { value: obj.opacity };
        }

        // 逐渐减小发射率
        const emissionRatio = obj.scale / currentScale;
        this.originalEmissionRate =
          this.originalEmissionRate || this.options.emissionRate;
        this.options.emissionRate = this.originalEmissionRate * emissionRatio;
      })
      .onComplete(() => {
        // 完全停止发射
        this.options.emissionRate = 0;

        // 隐藏粒子系统
        this.particleSystem.visible = false;

        if (onComplete) onComplete();
        this.shrinkAnimation = null;
      })
      .start();
  }

  /**
   * 重置烟雾到初始状态
   */
  resetSmoke() {
    if (this.growAnimation) {
      this.growAnimation.stop();
      this.growAnimation = null;
    }
    if (this.shrinkAnimation) {
      this.shrinkAnimation.stop();
      this.shrinkAnimation = null;
    }

    // 重置缩放
    this.currentScale = 1.0;
    this.particleSystem.scale.setScalar(1.0);

    // 重置透明度
    if (this.material.uniforms) {
      this.material.uniforms.globalOpacity = { value: 1.0 };
    }

    // 重置发射率
    if (this.originalEmissionRate) {
      this.options.emissionRate = this.originalEmissionRate;
    }

    // 显示粒子系统
    this.particleSystem.visible = true;
  }

  /**
   * 检查动画状态
   * @returns {Object} 动画状态信息
   */
  getAnimationStatus() {
    return {
      isGrowing: !!this.growAnimation,
      isShrinking: !!this.shrinkAnimation,
      currentScale: this.currentScale || 1.0,
      emissionRate: this.options.emissionRate,
    };
  }
}
