<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
 
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

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
        
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
});
</script>
<style scoped lang='scss'>
.container {
    width: 100%;
    height: 100%;
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
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 20px;
    border-radius: 10px;
    min-width: 250px;
    z-index: 10;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 255, 255, 0.3);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
    
    h3 {
        margin: 0 0 15px 0;
        color: #00ffff;
        text-align: center;
        font-size: 16px;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }
    
    .control-group {
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        
        label {
            min-width: 80px;
            font-size: 12px;
            color: #ccc;
        }
        
        input[type="range"] {
            flex: 1;
            height: 4px;
            background: rgba(0, 255, 255, 0.3);
            border-radius: 2px;
            outline: none;
            
            &::-webkit-slider-thumb {
                appearance: none;
                width: 12px;
                height: 12px;
                background: #00ffff;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
            }
        }
        
        input[type="color"] {
            width: 30px;
            height: 20px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        input[type="checkbox"] {
            margin-right: 5px;
        }
        
        span {
            min-width: 40px;
            font-size: 11px;
            color: #00ffff;
            text-align: right;
        }
    }
    
    .color-group {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .control-buttons {
        display: flex;
        gap: 10px;
        margin-top: 15px;
        
        button {
            flex: 1;
            padding: 8px 12px;
            background: rgba(0, 255, 255, 0.2);
            border: 1px solid #00ffff;
            color: #00ffff;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            
            &:hover {
                background: rgba(0, 255, 255, 0.4);
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            }
            
            &:active {
                transform: scale(0.95);
            }
        }
    }
    
    @media (max-width: 768px) {
        top: 10px;
        right: 10px;
        left: 10px;
        min-width: auto;
        padding: 15px;
        
        .control-group {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
            
            label {
                min-width: auto;
            }
            
            input[type="range"] {
                width: 100%;
            }
        }
    }
}
</style>