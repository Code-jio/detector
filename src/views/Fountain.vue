<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
</template>
<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';
import { FountainParticleSystem } from '@/utils/FountainParticleSystem.js';

let stats, renderer, scene, textureLoader;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.updateProjectionMatrix(); 
camera.position.set(100, 100, 100); 
camera.lookAt(0, 0, 0); 

textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const container = ref(null) 
const state = ref(null)



const createRender = (dom) => {
    renderer = new THREE.WebGLRenderer({
        canvas: dom,
        antialias: true,
        alpha: true,
        precision: 'highp', 
        powerPreference: 'high-performance',
    });
    renderer.gammaOutput = true;
    renderer.physicallyCorrectLights = true; 
    renderer.setPixelRatio(window.devicePixelRatio); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.logarithmicDepthBuffer = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

const createStats = (dom) => {
    stats = new Stats();
    stats.showPanel(0, 1, 2);
    dom.appendChild(stats.dom);
}

const createScene = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.3,
        roughness: 0.7
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    return scene;
}

const createAxesHelper = () => {
    const axesHelper = new THREE.AxesHelper(1000);
    return axesHelper;
}

const createGridHelper = () => {
    const gridHelper = new THREE.GridHelper(1000, 100); 
    gridHelper.name = 'gridHelperHelper';
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true; 
    gridHelper.position.y = 0;
    gridHelper.position.x = 0;
    gridHelper.position.z = 0;
    // gridHelper.visible = true;
    gridHelper.material.depthTest = true;
    // gridHelper.renderOrder = -1; 
    return gridHelper;
}

const clickScene = (event) => {
    const raycaster = new THREE.Raycaster(); 
    const mouse = new THREE.Vector2();
    const dom = container.value; 
    const rect = dom.getBoundingClientRect(); 
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1; 
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1; 
    mouse.x = x; 
    mouse.y = y; 
    raycaster.setFromCamera(mouse, camera); 
    const intersects = raycaster.intersectObjects(scene.children, true); 
    if (intersects.length > 0) { 
        const obj = intersects[0].object; 
        console.log(obj);
    }
}

onMounted(() => {
    createStats(state.value);
    scene = createScene();
    createRender(container.value);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    scene.add(createAxesHelper());
    scene.add(createGridHelper());
    
    // 添加方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
    
    // 添加额外的点光源以增强照明
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
    pointLight1.position.set(0, 50, 0);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.3);
    pointLight2.position.set(-50, 30, 50);
    scene.add(pointLight2);
    
    // 创建喷水粒子系统
    const fountain = new FountainParticleSystem(scene, new THREE.Vector3(0, 5, 0));
    
    // 示例：设置不同的喷水方向和速度
    fountain.setDirection(new THREE.Vector3(1, 1, 1)); // 斜向喷射
    fountain.setInitialSpeed(50); // 设置初始速度
    fountain.setGravity(-60); // 增强重力效果
    
    container.value.addEventListener('click', clickScene, false);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
    }, false);
    
    const render = () => {
        stats.update();
        controls.update();
        
        const deltaTime = clock.getDelta();
        
        // 更新喷水粒子系统
        fountain.update(deltaTime);
        
        renderer.render(scene, camera);
        
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
});
</script>

<style scoped lang='scss'>
.container {
    width: 100%;
    height: 100vh;
    display: block;
    z-index: 1;
}

.state {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
}

.outline-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px;
    border-radius: 8px;
    width: 300px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.outline-controls h3 {
    margin: 0 0 15px 0;
    color: #00ffff;
    text-align: center;
    font-size: 16px;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.outline-controls .control-group {
    margin-bottom: 15px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.outline-controls .control-group label {
    display: block;
    font-size: 12px;
    font-weight: bold;
    color: #ccc;
    min-width: 100px;
}

.outline-controls .control-group input[type="range"] {
    flex: 1;
    height: 4px;
    background: rgba(0, 255, 255, 0.3);
    border-radius: 2px;
    outline: none;
}

.outline-controls .control-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #00ffff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
}

.outline-controls .control-group input[type="color"] {
    width: 50px;
    height: 25px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
}

.outline-controls .control-group span {
    color: #00ffff;
    font-size: 12px;
    min-width: 30px;
}

.outline-controls .control-buttons {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.outline-controls .control-buttons button {
    flex: 1;
    padding: 8px 12px;
    background: rgba(0, 255, 255, 0.2);
    border: 1px solid #00ffff;
    color: #00ffff;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s ease;
}

.outline-controls .control-buttons button:hover {
    background: rgba(0, 255, 255, 0.4);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.outline-controls::-webkit-scrollbar {
    width: 6px;
}

.outline-controls::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.outline-controls::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
}

.outline-controls::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
}

.spark-controls {
    display: none;
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px;
    border-radius: 8px;
    width: 280px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 255, 255, 0.3);
}

.spark-controls h3 {
    margin: 0 0 15px 0;
    color: #4CAF50;
    text-align: center;
    font-size: 16px;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.spark-controls h4 {
    margin: 15px 0 10px 0;
    color: #FFC107;
    font-size: 14px;
}

.control-group {
    margin-bottom: 15px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.control-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: bold;
    color: #ccc;
    min-width: 80px;
}

.control-group input[type="range"] {
    flex: 1;
    height: 4px;
    background: rgba(0, 255, 255, 0.3);
    border-radius: 2px;
    outline: none;
    width: 100%;
}

.control-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #00ffff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
}

.control-group input[type="color"] {
    width: 50px;
    height: 25px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
}

.control-group select {
    width: 100%;
    padding: 3px;
    background: rgba(255, 255, 255, 0.9);
    color: black;
    border: none;
    border-radius: 3px;
    font-size: 12px;
}

.control-buttons {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 15px;
}

.control-buttons button {
    flex: 1;
    min-width: 60px;
    padding: 6px 8px;
    background: rgba(0, 255, 255, 0.2);
    border: 1px solid #00ffff;
    color: #00ffff;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s ease;
}

.control-buttons button:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.4);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.control-buttons button:disabled {
    background: #6c757d;
    cursor: not-allowed;
}

.system-info {
    font-size: 11px;
    line-height: 1.4;
}

.system-info div {
    margin-bottom: 2px;
}

input[type="text"] {
    padding: 4px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 12px;
}

.spark-controls::-webkit-scrollbar {
    width: 6px;
}

.spark-controls::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.spark-controls::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
}

.spark-controls::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
}

.color-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0;
    font-size: 11px;
    line-height: 1.2;
}

.color-preview span {
    margin-right: 3px;
    font-size: 14px;
    text-shadow: 0 0 3px rgba(0,0,0,0.5);
}

.color-preview small {
    color: #aaa;
    font-size: 10px;
    margin-top: 5px;
    display: block;
    width: 100%;
}

@media (max-width: 768px) {
    .spark-controls {
        top: 10px;
        right: 10px;
        left: 10px;
        min-width: auto;
        padding: 15px;
    }
    
    .control-group {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
    }
    
    .control-group label {
        min-width: auto;
    }
    
    .control-group input[type="range"] {
        width: 100%;
    }
}
</style>
