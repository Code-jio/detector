<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
    <div class="controls">
        <h3>🔥 火焰控制面板</h3>
        
        <div class="control-group">
            <label>火焰强度: {{ Math.round(fireIntensity * 100) }}%</label>
            <input type="range" v-model="fireIntensity" min="0" max="2" step="0.1" @input="updateFireIntensity">
        </div>
        
        <div class="control-group">
            <label>烟雾强度: {{ Math.round(smokeIntensity * 100) }}%</label>
            <input type="range" v-model="smokeIntensity" min="0" max="2" step="0.1" @input="updateSmokeIntensity">
        </div>
        
        <div class="control-group">
            <label>湍流强度: {{ Math.round(turbulence * 100) }}%</label>
            <input type="range" v-model="turbulence" min="0" max="2" step="0.1" @input="updateTurbulence">
        </div>
        
        <div class="control-group">
            <label>锥形角度: {{ Math.round((coneAngle * 180 / Math.PI)) }}°</label>
            <input type="range" v-model="coneAngle" min="0.1" max="1.0" step="0.05" @input="updateConeAngle">
        </div>
        
        <div class="control-group">
            <label>火焰颜色:</label>
            <div class="color-controls">
                <input type="color" v-model="fireColorStart" @input="updateFireColor">
                <input type="color" v-model="fireColorMid" @input="updateFireColor">
                <input type="color" v-model="fireColorEnd" @input="updateFireColor">
            </div>
        </div>
        
        <div class="control-group">
            <button @click="resetFire">重置火焰</button>
            <button @click="toggleAnimation">{{ isAnimating ? '暂停' : '播放' }}</button>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, reactive } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let stats, renderer, scene, camera;
let fireEffects = [];
let fireLight;
const container = ref(null);
const state = ref(null);

// 控制面板数据
const fireIntensity = ref(1.0);
const smokeIntensity = ref(1.0);
const turbulence = ref(1.0);
const coneAngle = ref(Math.PI / 5);
const fireColorStart = ref('#ff4500');
const fireColorMid = ref('#ff8c00');
const fireColorEnd = ref('#ffd700');
const isAnimating = ref(true);

// 创建相机
const createCamera = () => {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 20);
    camera.lookAt(0, 5, 0); // 看向火焰位置
    return camera;
};

// 创建渲染器
const createRenderer = (dom) => {
    renderer = new THREE.WebGLRenderer({
        canvas: dom,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    return renderer;
};

// 创建场景
const createScene = () => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // 深蓝色背景，突出烟雾效果
    // scene.fog = new THREE.Fog(0x050510, 50, 200); // 添加雾效果
    return scene;
};

// 创建性能监视器
const createStats = (dom) => {
    stats = new Stats();
    stats.showPanel(0);
    dom.appendChild(stats.dom);
};

// 控制方法
const updateFireIntensity = () => {
    fireEffects.forEach(effect => {
        if (effect && effect.setIntensity) {
            effect.setIntensity(fireIntensity.value);
        }
    });
};

const updateSmokeIntensity = () => {
    fireEffects.forEach(effect => {
        if (effect && effect.setEmissionRates) {
            const baseFireRate = effect.options ? effect.options.fireEmissionRate : 60;
            const baseSmokeRate = effect.options ? effect.options.smokeEmissionRate : 20;
            effect.setEmissionRates(
                baseFireRate * fireIntensity.value,
                baseSmokeRate * smokeIntensity.value
            );
        }
    });
};

const updateTurbulence = () => {
    fireEffects.forEach(effect => {
        if (effect && effect.options) {
            effect.options.turbulence = turbulence.value * 1.2;
        }
    });
};

const updateConeAngle = () => {
    fireEffects.forEach(effect => {
        if (effect && effect.options) {
            effect.options.coneAngle = coneAngle.value;
        }
    });
};

const updateFireColor = () => {
    fireEffects.forEach(effect => {
        if (effect && effect.options) {
            effect.options.fireColorStart = new THREE.Color(fireColorStart.value);
            effect.options.fireColorMid = new THREE.Color(fireColorMid.value);
            effect.options.fireColorEnd = new THREE.Color(fireColorEnd.value);
        }
    });
};

const resetFire = () => {
    fireIntensity.value = 1.0;
    smokeIntensity.value = 1.0;
    turbulence.value = 1.0;
    coneAngle.value = Math.PI / 5;
    fireColorStart.value = '#ff4500';
    fireColorMid.value = '#ff8c00';
    fireColorEnd.value = '#ffd700';
    
    updateFireIntensity();
    updateSmokeIntensity();
    updateTurbulence();
    updateConeAngle();
    updateFireColor();
};

const toggleAnimation = () => {
    isAnimating.value = !isAnimating.value;
    if (!isAnimating.value) {
        // 暂停动画时停止粒子发射
        fireEffects.forEach(effect => {
            if (effect && effect.setEmissionRates) {
                effect.setEmissionRates(0, 0);
            }
        });
    } else {
        // 恢复动画
        updateFireIntensity();
        updateSmokeIntensity();
    }
};



onMounted(() => {
    createStats(state.value);
    createScene();
    createCamera();
    createRenderer(container.value);
    const controls = new OrbitControls(camera, renderer.domElement);
    
    // 添加坐标轴和网格
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(100, 10);
    scene.add(gridHelper);

    // 添加环境光和点光源（模拟火焰光照）
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // 创建火焰光源
    const fireLight = new THREE.PointLight(0xff6600, 2, 20);
    fireLight.position.set(0, 3, 0);
    scene.add(fireLight);

    // 创建火焰效果
        import('../utils/FireParticleSystem.js').then(({ FireEffectManager }) => {
            const fireManager = new FireEffectManager(scene);
            fireEffects = fireManager.effects.map(e => e.effect);
            
            // 创建主要火焰效果
        const mainFire = fireManager.createFireEffect({
            position: new THREE.Vector3(0, 0, 0),
            maxFireParticles: 800,
            maxSmokeParticles: 400,
            fireEmissionRate: 80,
            smokeEmissionRate: 30,
            coneAngle: Math.PI / 5, // 36度锥形角
            coneHeight: 6.0,
            turbulence: 1.2
        });

        // 创建辅助小火焰
        const sideFire1 = fireManager.createFireEffect({
            position: new THREE.Vector3(-1.5, 0, 0),
            maxFireParticles: 300,
            maxSmokeParticles: 150,
            fireEmissionRate: 30,
            smokeEmissionRate: 12,
            coneAngle: Math.PI / 6,
            coneHeight: 3.0,
            turbulence: 0.8
        });

        const sideFire2 = fireManager.createFireEffect({
            position: new THREE.Vector3(1.5, 0, 0),
            maxFireParticles: 300,
            maxSmokeParticles: 150,
            fireEmissionRate: 30,
            smokeEmissionRate: 12,
            coneAngle: Math.PI / 6,
            coneHeight: 3.0,
            turbulence: 0.8
        });

        // 动画循环
        const clock = new THREE.Clock();
        let flickerTime = 0;

        const animate = () => {
            const deltaTime = clock.getDelta();
            const elapsedTime = clock.getElapsedTime();
            
            stats.update();
            controls.update();

            // 更新火焰光照强度（闪烁效果）
            flickerTime += deltaTime * 10;
            fireLight.intensity = 1.5 + Math.sin(flickerTime) * 0.5 + Math.sin(flickerTime * 1.3) * 0.3;
            fireLight.position.y = 2.5 + Math.sin(flickerTime * 0.8) * 0.2;

            // 更新所有粒子系统
            if (window.effects) {
                window.effects.forEach(effect => {
                    if (effect.update) {
                        effect.update(deltaTime);
                    }
                });
            }

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };

        animate();

        // 窗口大小调整
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    });
});
</script>

<style scoped>
.container {
    width: 100%;
    height: 100vh;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
}

.state {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 999;
}

.controls {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 20px;
    border-radius: 10px;
    z-index: 1000;
    min-width: 250px;
    backdrop-filter: blur(10px);
}

.controls h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #ff6600;
    text-align: center;
}

.control-group {
    margin-bottom: 15px;
}

.control-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
}

.control-group input[type="range"] {
    width: 100%;
    height: 5px;
    background: #333;
    outline: none;
    border-radius: 5px;
}

.control-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 15px;
    height: 15px;
    background: #ff6600;
    cursor: pointer;
    border-radius: 50%;
}

.controls button {
    width: 100%;
    padding: 10px;
    background: #ff6600;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.3s;
}

.controls button:hover {
    background: #ff8833;
}

.color-controls {
    display: flex;
    gap: 10px;
    margin-top: 5px;
}

.color-controls input[type="color"] {
    width: 40px;
    height: 30px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

@media (max-width: 768px) {
    .controls {
        right: 10px;
        top: 10px;
        padding: 15px;
        min-width: 200px;
    }
    
    .controls h3 {
        font-size: 16px;
    }
    
    .control-group label {
        font-size: 12px;
    }
}
</style>