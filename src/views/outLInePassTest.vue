<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
    
    <!-- 外轮廓控制面板 -->
    <div class="outline-controls">
        <h3>外轮廓效果控制</h3>
        
        <div class="control-group">
            <label>边缘强度:</label>
            <input 
                type="range" 
                v-model="outlineParams.edgeStrength" 
                min="0" max="10" step="0.1"
                @input="updateOutlineParams"
            >
            <span>{{ outlineParams.edgeStrength.toFixed(1) }}</span>
        </div>
        
        <div class="control-group">
            <label>发光效果:</label>
            <input 
                type="range" 
                v-model="outlineParams.edgeGlow" 
                min="0" max="1" step="0.01"
                @input="updateOutlineParams"
            >
            <span>{{ outlineParams.edgeGlow.toFixed(2) }}</span>
        </div>
        
        <div class="control-group">
            <label>边缘厚度:</label>
            <input 
                type="range" 
                v-model="outlineParams.edgeThickness" 
                min="0" max="5" step="0.1"
                @input="updateOutlineParams"
            >
            <span>{{ outlineParams.edgeThickness.toFixed(1) }}</span>
        </div>
        
        <div class="control-group">
            <label>可见边缘颜色:</label>
            <input 
                type="color" 
                v-model="outlineParams.visibleEdgeColor"
                @input="updateOutlineParams"
            >
        </div>
        
        <div class="control-group">
            <label>隐藏边缘颜色:</label>
            <input 
                type="color" 
                v-model="outlineParams.hiddenEdgeColor"
                @input="updateOutlineParams"
            >
        </div>
        
        <div class="control-buttons">
            <button @click="clearSelection">清除选择</button>
            <button @click="selectAll">选择全部</button>
        </div>
    </div>
</template>
<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';

let stats, renderer, scene, textureLoader, composer, outlinePass

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.updateProjectionMatrix(); 
camera.position.set(100, 100, 100); 
camera.lookAt(0, 0, 0); 

textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const container = ref(null) 
const state = ref(null)

// 外轮廓参数
const outlineParams = reactive({
    edgeStrength: 3.0,
    edgeGlow: 0.5,
    edgeThickness: 1.0,
    visibleEdgeColor: '#ff0000',
    hiddenEdgeColor: '#00ff00'
})

// 存储所有几何体
const allGeometries = ref([])

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

// 创建几何体的函数
const createGeometries = () => {
    const geometries = [];
    
    // 创建立方体
    const cubeGeometry = new THREE.BoxGeometry(20, 20, 20);
    const cubeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        metalness: 0.3,
        roughness: 0.7
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(-30, 15, 30);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.name = 'greenCube';
    geometries.push(cube);
    
    // 创建球体
    const sphereGeometry = new THREE.SphereGeometry(15, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        metalness: 0.3,
        roughness: 0.7
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 15, 30);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.name = 'redSphere';
    geometries.push(sphere);
    
    // 创建圆柱体
    const cylinderGeometry = new THREE.CylinderGeometry(10, 10, 30, 32);
    const cylinderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0000ff,
        metalness: 0.3,
        roughness: 0.7
    });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(30, 15, 30);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.name = 'blueCylinder';
    geometries.push(cylinder);
    
    // 创建圆环
    const torusGeometry = new THREE.TorusGeometry(15, 5, 16, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff00,
        metalness: 0.3,
        roughness: 0.7
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.set(-15, 15, 0);
    torus.rotation.x = Math.PI / 2;
    torus.castShadow = true;
    torus.receiveShadow = true;
    torus.name = 'yellowTorus';
    geometries.push(torus);
    
    // 创建圆锥
    const coneGeometry = new THREE.ConeGeometry(15, 30, 32);
    const coneMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff00ff,
        metalness: 0.3,
        roughness: 0.7
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.set(15, 15, 0);
    cone.castShadow = true;
    cone.receiveShadow = true;
    cone.name = 'purpleCone';
    geometries.push(cone);
    
    return geometries;
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
        
        // 点击物体时添加外轮廓效果
        if (outlinePass) {
            outlinePass.selectedObjects = [obj];
        }
    }
}

// 设置后期处理
const setupPostProcessing = () => {
    // 创建EffectComposer
    composer = new EffectComposer(renderer);
    
    // 创建渲染通道
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // 创建外轮廓通道
    outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene,
        camera
    );
    
    // 设置外轮廓参数
    updateOutlineParams();
    
    composer.addPass(outlinePass);
    
    // 添加抗锯齿
    const effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    composer.addPass(effectFXAA);
}

// 更新外轮廓参数
const updateOutlineParams = () => {
    if (outlinePass) {
        outlinePass.edgeStrength = outlineParams.edgeStrength;
        outlinePass.edgeGlow = outlineParams.edgeGlow;
        outlinePass.edgeThickness = outlineParams.edgeThickness;
        outlinePass.visibleEdgeColor.set(outlineParams.visibleEdgeColor);
        outlinePass.hiddenEdgeColor.set(outlineParams.hiddenEdgeColor);
    }
}

// 清除选择
const clearSelection = () => {
    if (outlinePass) {
        outlinePass.selectedObjects = [];
    }
}

// 选择所有几何体
const selectAll = () => {
    if (outlinePass && allGeometries.value.length > 0) {
        outlinePass.selectedObjects = allGeometries.value;
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
    
    // 添加几何体到场景
    const geometries = createGeometries();
    
    allGeometries.value = geometries;
    geometries.forEach(geometry => {
        scene.add(geometry);
    });
    
    // 设置后期处理
    setupPostProcessing();
    
    container.value.addEventListener('click', clickScene, false);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // 更新后期处理尺寸
        if (composer) {
            composer.setSize(window.innerWidth, window.innerHeight);
        }
        if (outlinePass) {
            outlinePass.resolution.set(window.innerWidth, window.innerHeight);
        }
    }, false);
    
    const render = () => {
        stats.update();
        controls.update();
        
        const deltaTime = clock.getDelta();
        
        // 使用后期处理渲染
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
        
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
