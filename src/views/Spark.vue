<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
    <div class="spark-controls">
        <h3>电火花参数控制</h3>
        
        <div class="control-group">
            <label>强度: {{ sparkConfig.intensity }}</label>
            <input type="range" v-model="sparkConfig.intensity" min="20" max="200" step="10">
        </div>

        <div class="control-group">
            <label>速度: {{ sparkConfig.speed }}</label>
            <input type="range" v-model="sparkConfig.speed" min="200" max="1000" step="50">
        </div>

        <div class="control-group">
            <label>粗细: {{ sparkConfig.size }}</label>
            <input type="range" v-model="sparkConfig.size" min="0.01" max="0.2" step="0.01">
        </div>
        
        <div class="control-group">\             <label>梭形大小: {{ sparkConfig.sparkSize }}</label>\             <input type="range" v-model="sparkConfig.sparkSize" min="0.01" max="0.5" step="0.01">\         </div>
         
         <div class="control-group">\             <label>火花概率: {{ sparkConfig.sparkProbability }}</label>\             <input type="range" v-model="sparkConfig.sparkProbability" min="0" max="1" step="0.05">
         </div>

        <div class="control-group">
            <label>持续时间: {{ sparkConfig.lifetime }}s</label>
            <input type="range" v-model="sparkConfig.lifetime" min="0.05" max="0.5" step="0.05">
        </div>

        <div class="control-group">
            <label>重力: {{ sparkConfig.gravity }}</label>
            <input type="range" v-model="sparkConfig.gravity" min="-1000" max="-100" step="50">
        </div>

        <div class="control-group">
            <label>随机方向</label>
            <input type="checkbox" v-model="sparkConfig.randomDirection">
        </div>

        <div class="control-group">
            <label>扩散角度: {{ sparkConfig.spread }}</label>
            <input type="range" v-model="sparkConfig.spread" min="0" max="1" step="0.05">
        </div>
        
        <div class="control-group">
            <label>发射源位置</label>
            <div>X: <input type="range" v-model="sparkConfig.position.x" min="-10" max="10" step="0.5"></div>
            <div>Y: <input type="range" v-model="sparkConfig.position.y" min="-10" max="10" step="0.5"></div>
            <div>Z: <input type="range" v-model="sparkConfig.position.z" min="-10" max="10" step="0.5"></div>
        </div>
        
        <div class="control-group">
            <label>发射方向</label>
            <div>X: <input type="range" v-model="sparkConfig.direction.x" min="-2" max="2" step="0.1"></div>
            <div>Y: <input type="range" v-model="sparkConfig.direction.y" min="-2" max="2" step="0.1"></div>
            <div>Z: <input type="range" v-model="sparkConfig.direction.z" min="-2" max="2" step="0.1"></div>
        </div>
        
        <div class="control-group">
            <label>电弧颜色</label>
            <input type="color" v-model="sparkConfig.color1">
        </div>
        
        <div class="control-group">
            <label>拖尾颜色</label>
            <input type="color" v-model="sparkConfig.color2">
        </div>
        
        <div class="control-group">
            <label>
                <input type="checkbox" v-model="sparkConfig.randomDirection">
                随机方向
            </label>
        </div>

        <div class="control-buttons">
            <button @click="toggleSpark">{{ isSparkActive ? '暂停' : '启动' }}</button>
            <button @click="resetSpark">重置</button>
            <button @click="toggleVisibility">{{ isVisible ? '隐藏' : '显示' }}</button>
        </div>
        
        <div class="control-group">
            <h4>状态管理</h4>
            <div>
                <button @click="saveCurrentState">保存当前状态</button>
                <input v-model="stateName" placeholder="状态名称" style="width: 100px; margin-left: 5px;">
            </div>
            <div style="margin-top: 10px;">
                <select v-model="selectedState" @change="loadSelectedState" style="width: 150px;">
                    <option value="">选择状态...</option>
                    <option v-for="state in savedStates" :key="state.id" :value="state.id">
                        {{ state.name }} ({{ state.timestamp }})
                    </option>
                </select>
                <button @click="deleteSelectedState" :disabled="!selectedState">删除</button>
            </div>
        </div>
        
        <div class="control-group">
            <h4>系统信息</h4>
            <div>电弧数量: {{ systemInfo.arcsCount }}</div>
            <div>粒子数量: {{ systemInfo.particlesCount }}</div>
            <div>保存状态: {{ systemInfo.savedStatesCount }}</div>
            <div>当前状态: {{ systemInfo.currentStateId || '无' }}</div>
            <div>可见: {{ systemInfo.isVisible ? '是' : '否' }}</div>
            <div>暂停: {{ systemInfo.isPaused ? '是' : '否' }}</div>
        </div>
    </div>
</template>
<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { SparkParticleSystem } from '@/utils/SparkParticleSystem.js';

let stats, renderer, scene, textureLoader

// 创建相机
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.updateProjectionMatrix(); // 更新相机投影矩阵
camera.position.set(100, 100, 100); // 设置相机位置
camera.lookAt(0, 0, 0); // 设置相机焦点

textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();// 创建时钟对象Clock
const container = ref(null) // 画布dom
const state = ref(null) // 性能监视器dom

let mesh = null; // 云模型

// 电火花粒子系统配置
const sparkConfig = reactive({
    enabled: false,
    intensity: 100,      // 发射强度（降低频率）
    speed: 400,         // 电弧速度
    size: 0.05,         // 电弧粗细
    lifetime: 0.15,     // 电弧持续时间（更短）
    gravity: -800,      // 更强的重力
    direction: { x: 1, y: 0, z: 0 }, // 向上倾斜的发射方向
    color1: '#ffffff',  // 电弧主颜色（亮白色）
    color2: '#0066ff',  // 电弧边缘颜色（蓝色）
    randomDirection: true, // 允许随机方向
    spread: 0.3,        // 更大的扩散角度
    trailLength: 3,     // 更短的拖尾
    position: { x: 10, y: 10, z: 10 }, // 电弧发射源位置
    sparkSize: 0.15,      // 梭形粒子大小
    sparkProbability: 0.1  // 火花粒子发射概率
});

const isSparkActive = ref(true);
let sparkSystem = null;
let sparkParticles = null;

// 新添加的状态管理变量
const isVisible = ref(true);
const stateName = ref('');
const selectedState = ref('');
const savedStates = ref([]);
const systemInfo = ref({
    arcsCount: 0,
    particlesCount: 0,
    savedStatesCount: 0,
    currentStateId: null,
    isVisible: true,
    isPaused: false
});


// 创建渲染器
const createRender = (dom) => {
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({
        canvas: dom,
        antialias: true, // 开启硬件反走样
        alpha: true, // 背景透明
        precision: 'highp', // 着色精度选择
        powerPreference: 'high-performance', // 高性能模式-优先使用GPU
    }); // 创建渲染器
    renderer.gammaOutput = true; // 设置输出为sRGB格式
    renderer.physicallyCorrectLights = true; // 设置光照正确性
    renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比 作用：防止高分屏下模糊
    renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    renderer.logarithmicDepthBuffer = true;
}

// 创建性能监视器
const createStats = (dom) => {
    stats = new Stats(); // 创建性能监视器
    stats.showPanel(0, 1, 2); // 0: fps:帧率, 1: ms:渲染时间, 2: mb:内存占用
    dom.appendChild(stats.dom);
}

// 创建场景
const createScene = () => {
    const scene = new THREE.Scene(); // 创建场景
    scene.background = new THREE.Color(0x000000); // 设置背景颜色
    return scene;
}

// 创建坐标轴辅助
const createAxesHelper = () => {
    const axesHelper = new THREE.AxesHelper(1000); // 创建坐标轴辅助
    return axesHelper;
}

// 创建网格辅助
const createGridHelper = () => {
    const gridHelper = new THREE.GridHelper(1000, 100); // 创建网格辅助
    gridHelper.name = 'gridHelperHelper';
    gridHelper.material.opacity = 0.2; // 设置网格透明度
    gridHelper.material.transparent = true; // 设置网格透明度
    gridHelper.position.y = 0; // 设置网格位置
    gridHelper.position.x = 0; // 设置网格位置
    gridHelper.position.z = 0; // 设置网格位置
    // gridHelper.visible = true; // 设置网格是否可见
    gridHelper.material.depthTest = true; // 设置网格材质是否深度测试
    // gridHelper.renderOrder = -1; // 设置网格渲染顺序
    return gridHelper;
}

// 射线拾取
const clickScene = (event) => {
    const raycaster = new THREE.Raycaster(); // 创建射线
    const mouse = new THREE.Vector2(); // 创建鼠标向量
    const dom = container.value; // 获取dom
    const rect = dom.getBoundingClientRect(); // 获取dom的尺寸和位置
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1; // 获取鼠标点击位置x
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1; // 获取鼠标点击位置y
    mouse.x = x; // 设置鼠标向量x
    mouse.y = y; // 设置鼠标向量y
    raycaster.setFromCamera(mouse, camera); // 设置射线相机和鼠标向量
    const intersects = raycaster.intersectObjects(scene.children, true); // 获取射线和模型相交的数组
    if (intersects.length > 0) { // 判断是否有相交的模型
        const obj = intersects[0].object; // 获取相交的模型
        console.log(obj);

    }
}

// 控制函数
const toggleSpark = () => {
    isSparkActive.value = !isSparkActive.value;
};

// 重置电火花
const resetSpark = () => {
    if (sparkSystem) {
        sparkSystem.reset();
    }
}

// 切换可见性
const toggleVisibility = () => {
    if (sparkSystem) {
        if (isVisible.value) {
            sparkSystem.hide();
        } else {
            sparkSystem.show();
        }
        isVisible.value = !isVisible.value;
        updateSystemInfo();
    }
}

// 保存当前状态
const saveCurrentState = () => {
    if (sparkSystem && stateName.value) {
        const state = sparkSystem.saveState(stateName.value, {
            name: stateName.value,
            description: `保存于 ${new Date().toLocaleTimeString()}`
        });
        
        // 更新保存状态列表
        updateSavedStatesList();
        stateName.value = '';
        updateSystemInfo();
    }
}

// 加载选中的状态
const loadSelectedState = () => {
    if (sparkSystem && selectedState.value) {
        sparkSystem.loadState(selectedState.value);
        updateSystemInfo();
    }
}

// 删除选中的状态
const deleteSelectedState = () => {
    if (sparkSystem && selectedState.value) {
        sparkSystem.deleteState(selectedState.value);
        selectedState.value = '';
        updateSavedStatesList();
        updateSystemInfo();
    }
}

// 更新保存状态列表
const updateSavedStatesList = () => {
    if (sparkSystem) {
        const stateIds = sparkSystem.getSavedStateIds();
        savedStates.value = stateIds.map(id => {
            const info = sparkSystem.getStateInfo(id);
            return {
                id,
                name: info.name || id,
                timestamp: new Date(info.timestamp).toLocaleTimeString(),
                ...info
            };
        });
    }
}

// 更新系统信息
const updateSystemInfo = () => {
    if (sparkSystem) {
        const summary = sparkSystem.getCurrentStateSummary();
        systemInfo.value = summary;
    }
}

// 监听配置变化
watch(sparkConfig, () => {
    if (sparkSystem) {
        sparkSystem.reset();
    }
}, { deep: true });

// 在onMounted中添加
onMounted(() => {
    createStats(state.value);
    scene = createScene();
    createRender(container.value);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    scene.add(createAxesHelper());
    scene.add(createGridHelper());
    
    // 创建电火花粒子系统
    sparkSystem = new SparkParticleSystem(scene, sparkConfig, camera);
    
    container.value.addEventListener('click', clickScene, false);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);
    
    const render = (currentTime) => {
        stats.update();
        controls.update();
        
        const deltaTime = clock.getDelta();
        
        // 更新电火花粒子系统
        if (sparkSystem) {
            sparkSystem.update(deltaTime);
            
            // 每30帧更新一次系统信息（避免频繁更新）
            if (Math.random() < 0.03) {
                updateSystemInfo();
            }
        }
        
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

.spark-controls {
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