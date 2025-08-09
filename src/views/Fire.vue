<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
  
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let stats, renderer, scene, camera;
const container = ref(null);
const state = ref(null);

// 创建相机
const createCamera = () => {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
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
    scene.background = new THREE.Color(0x050510); // 深蓝色背景，突出烟雾效果
    // scene.fog = new THREE.Fog(0x050510, 50, 200); // 添加雾效果
    return scene;
};

// 创建性能监视器
const createStats = (dom) => {
    stats = new Stats();
    stats.showPanel(0);
    dom.appendChild(stats.dom);
};

// 仿照官方示例，创建逼真的火焰粒子系统
const createFire = () => {
    // 创建纹理加载器
    const textureLoader = new THREE.TextureLoader();
    
    // 加载烟雾纹理（参考demo.js）
    const smokeTexture = textureLoader.load('/texture/smoke1.png');
    
    // 创建烟雾粒子系统（仿照demo.js的烟雾效果）
    const smokeCount = 2000;
    const smokeGeometry = new THREE.PlaneGeometry(1, 1);
    
    // 烟雾材质（仿照demo.js的SpriteNodeMaterial）
    const smokeMaterial = new THREE.MeshBasicMaterial({
        map: smokeTexture,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: 0x2c1501
    });
    
    const smokeParticles = new THREE.InstancedMesh(smokeGeometry, smokeMaterial, smokeCount);
    smokeParticles.scale.setScalar(400);
    smokeParticles.position.y = 0;
    scene.add(smokeParticles);
    
    // 烟雾粒子属性数组
    const smokeData = {
        life: new Float32Array(smokeCount),
        offset: new Float32Array(smokeCount * 3),
        speed: new Float32Array(smokeCount),
        scale: new Float32Array(smokeCount)
    };
    
    // 初始化烟雾粒子（仿照demo.js的范围设置）
    for (let i = 0; i < smokeCount; i++) {
        smokeData.life[i] = Math.random();
        // 使用Vector3范围，仿照demo.js的range(-2,3,-2)到(2,5,2)
        smokeData.offset[i * 3] = THREE.MathUtils.lerp(-400, 400, Math.random()); // x范围-400到400
        smokeData.offset[i * 3 + 1] = THREE.MathUtils.lerp(-100, 500, Math.random()); // y范围-100到500
        smokeData.offset[i * 3 + 2] = THREE.MathUtils.lerp(-400, 400, Math.random()); // z范围-400到400
        smokeData.speed[i] = 0.1 + Math.random() * 0.3;
        smokeData.scale[i] = 0.3 + Math.random() * 1.7;
    }
    
    // 创建火焰粒子系统（仿照demo.js的火焰效果）
    const fireCount = 1000;
    const fireGeometry = new THREE.PlaneGeometry(1, 1);
    
    // 火焰材质
    const fireMaterial = new THREE.MeshBasicMaterial({
        color: 0xb72f17,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const fireParticles = new THREE.InstancedMesh(fireGeometry, fireMaterial, fireCount);
    fireParticles.scale.setScalar(400);
    fireParticles.position.y = -100;
    fireParticles.renderOrder = 1; // 确保火焰在烟雾前面渲染
    scene.add(fireParticles);
    
    // 火焰粒子属性数组
    const fireData = {
        life: new Float32Array(fireCount),
        offset: new Float32Array(fireCount * 3),
        speed: new Float32Array(fireCount),
        scale: new Float32Array(fireCount)
    };
    
    // 初始化火焰粒子（仿照demo.js的范围设置）
    for (let i = 0; i < fireCount; i++) {
        fireData.life[i] = Math.random();
        // 使用Vector3范围，仿照demo.js的range(-1,1,-1)到(1,2,1)
        fireData.offset[i * 3] = THREE.MathUtils.lerp(-100, 100, Math.random()); // x范围-100到100
        fireData.offset[i * 3 + 1] = THREE.MathUtils.lerp(0, 200, Math.random()); // y范围0到200
        fireData.offset[i * 3 + 2] = THREE.MathUtils.lerp(-100, 100, Math.random()); // z范围-100到100
        fireData.speed[i] = 0.2 + Math.random() * 0.2;
        fireData.scale[i] = 0.3 + Math.random() * 1.7;
    }
    
    // 创建变换矩阵
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    // 动画更新函数（仿照demo.js的渲染逻辑）
    const updateParticles = (time) => {
        const elapsedTime = time * 0.001; // 转换为秒
        const speed = 0.2; // 仿照demo.js的speed uniform
        
        // 更新烟雾粒子
        for (let i = 0; i < smokeCount; i++) {
            smokeData.life[i] += smokeData.speed[i] * 0.01;
            if (smokeData.life[i] > 1) {
                smokeData.life[i] = 0;
            }
            
            const life = smokeData.life[i];
            const lifeTime = (elapsedTime * speed + 5) * smokeData.speed[i];
            const modLife = (lifeTime % 1); // 仿照demo.js的mod(1)
            
            // 计算位置（仿照demo.js的偏移计算）
            const offsetX = smokeData.offset[i * 3] * modLife;
            const offsetY = smokeData.offset[i * 3 + 1] + modLife * 50;
            const offsetZ = smokeData.offset[i * 3 + 2] * modLife;
            
            position.set(offsetX, offsetY, offsetZ);
            
            // 计算缩放（仿照demo.js的缩放计算）
            const currentScale = smokeData.scale[i] * Math.max(modLife * 0.3, 0.3);
            scale.set(currentScale, currentScale, currentScale);
            
            // 设置旋转（添加随机旋转）
            rotation.set(0, 0, elapsedTime * 0.5 + i * 0.1);
            quaternion.setFromEuler(rotation);
            
            matrix.compose(position, quaternion, scale);
            smokeParticles.setMatrixAt(i, matrix);
        }
        
        smokeParticles.instanceMatrix.needsUpdate = true;
        
        // 更新火焰粒子
        for (let i = 0; i < fireCount; i++) {
            fireData.life[i] += fireData.speed[i] * 0.01;
            if (fireData.life[i] > 1) {
                fireData.life[i] = 0;
            }
            
            const life = fireData.life[i];
            const lifeTime = (elapsedTime * speed + 5) * fireData.speed[i];
            const modLife = (lifeTime % 1); // 仿照demo.js的mod(1)
            
            // 计算位置（仿照demo.js的偏移计算）
            const offsetX = fireData.offset[i * 3] * modLife;
            const offsetY = fireData.offset[i * 3 + 1] * modLife;
            const offsetZ = fireData.offset[i * 3 + 2] * modLife;
            
            position.set(offsetX, offsetY, offsetZ);
            
            // 计算缩放
            const currentScale = fireData.scale[i] * Math.max(modLife * 0.3, 0.3);
            scale.set(currentScale, currentScale, currentScale);
            
            // 设置旋转（添加随机旋转）
            rotation.set(0, 0, elapsedTime * 0.8 + i * 0.15);
            quaternion.setFromEuler(rotation);
            
            matrix.compose(position, quaternion, scale);
            fireParticles.setMatrixAt(i, matrix);
        }
        
        fireParticles.instanceMatrix.needsUpdate = true;
        
        // 添加脉动效果（仿照demo.js的脉动）
        const pulseFactor = 0.9 + Math.sin(elapsedTime * 3) * 0.1;
        fireParticles.scale.setScalar(400 * pulseFactor);
        
        // 烟雾脉动效果
        const smokePulse = 0.8 + Math.sin(elapsedTime * 2) * 0.1;
        smokeParticles.scale.setScalar(400 * smokePulse);
        
        // 添加颜色变化（仿照demo.js的颜色混合）
        const fireHue = 0.05 + Math.sin(elapsedTime * 2) * 0.02;
        fireMaterial.color.setHSL(fireHue, 1.0, 0.5);
    };
    
    return updateParticles;
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

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // 添加微弱的蓝色补光
    const directionalLight = new THREE.DirectionalLight(0x4444ff, 0.2);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);
    
    // 渲染循环
    let lastTime = 0;
    let updateParticles = null;
    
    // 创建火焰效果
    updateParticles = createFire();
    
    const animate = (currentTime) => {
        const deltaTime = (currentTime - lastTime) * 0.001; // 转换为秒
        lastTime = currentTime;
        
        stats.update();
        controls.update();
        
        // 更新火焰粒子系统
        if (updateParticles) {
            updateParticles(currentTime);
        }
        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    
    animate(0);
    
    // 窗口大小调整
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
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
</style>