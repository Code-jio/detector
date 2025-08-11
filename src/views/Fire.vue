<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 火焰配置
let fireConfig = {
    particleCount: 1000,
    baseSpeed: 6.0,
    turbulence: 1.5,
    emissionRadius: 2.0,
    intensity: 1.5,
    maxLifetime: 3.0,
    baseSize: 3.0,
    colorStart: { r: 1.0, g: 0.8, b: 0.0 },  // 黄色
    colorEnd: { r: 1.0, g: 0.0, b: 0.0 }     // 红色
};

let updateFire = null;

let stats, renderer, scene, camera;
const container = ref(null);
const state = ref(null);

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

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    
    // 动画循环
    const clock = new THREE.Clock();
    const animate = () => {
        stats.update();
        controls.update();
        
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