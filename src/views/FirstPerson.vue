<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import * as THREE from 'three';
import  Stats from 'three/examples/js/libs/stats.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
// import { MapControls } from "three/examples/jsm/controls/MapControls";


let stats, renderer, scene

// 创建相机
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.updateProjectionMatrix(); // 更新相机投影矩阵
camera.position.set(100, 100, 100); // 设置相机位置
// camera.lookAt(0, 0, 0); // 设置相机焦点

const url = "/gltf/chache/chache-1.gltf"
// const url = "/gltf/test/duiduoji-1.gltf"
// const url = "/gltf/Horse.glb"

let mixer
let time = ref(1000)
const clock = new THREE.Clock();// 创建时钟对象Clock
const container = ref(null) // 画布dom
const state = ref(null) // 性能监视器dom
const value = ref(0) // 进度条值

const frameNum = ref(0) // 帧数

let current_animate = {} // 当前动画
const animate_List = reactive([]) // 动画列表
const current_animate_options = reactive([]) // 当前动画列表

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
    scene.background = new THREE.Color(0xffffff); // 设置背景颜色
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

// 添加mesh立方体
const addMesh = () => {
    const geometry = new THREE.BoxGeometry(10, 10, 10); // 创建立方体几何体
    const material = new THREE.MeshLambertMaterial({ // 创建材质
        color: 0x0000ff,
        transparent: true, // 设置材质透明
        // opacity: 0.5, // 设置材质透明度
    });
    // let ShaderMaterial = getShaderMaterial(); // 创建shader材质
    const mesh = new THREE.Mesh(geometry, material); // 创建立方体网格模型
    mesh.name = 'mesh'; // 设置立方体网格模型名称
    mesh.position.set(10, 0, 0); // 设置立方体网格模型位置
    scene.add(mesh); // 添加立方体网格模型到场景
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


// 创建第一人称控制
const createFirstPersonControls = () => {
    const controls = new FirstPersonControls(camera, container.value); // 创建第一人称控制器
    controls.movementSpeed = 100; // 设置移动速度
    controls.lookSpeed = 0.1; // 设置视角速度
    controls.lookVertical = true; // 设置是否可以垂直视角
    controls.constrainVertical = true; // 设置视角垂直约束
    controls.verticalMin = 1.0; // 设置垂直视角最小值
    controls.verticalMax = 2.0; // 设置垂直视角最大值
    controls.lon = -150; // 设置视角水平初始值
    controls.lat = 120; // 设置视角垂直初始值
    controls.enabled = true; // 设置控制器是否可用
    controls.enableDamping = true; // 设置是否开启惯性
    controls.dampingFactor = 0.05; // 设置惯性阻尼系数
    controls.minDistance = 0; // 设置视角最小距离
    controls.maxDistance = Infinity; // 设置视角最大距离
    controls.mouseButtons = { // 设置鼠标按键
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    }
    return controls;
}

onMounted(() => {
    createStats(state.value); // 创建性能监视器
    scene = createScene(); // 创建场景
    createRender(container.value) // 创建渲染器
    // 创建控制器
    // const controls = new OrbitControls(camera, renderer.domElement); // 控制器传入相机对象和渲染器dom元素
    // const controls = new MapControls(camera, renderer.domElement);

    // console.log(controls);
    // 创建环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight); // 添加环境光
    scene.add(createAxesHelper()) // 添加坐标轴辅助
    scene.add(createGridHelper()) // 添加坐标轴辅助

    addMesh() // 添加立方体

    // 第一人称控制
    const firstPerson = createFirstPersonControls();
    console.log(firstPerson);



    // 左键点击事件
    container.value.addEventListener('click', clickScene, false);
    console.log(new THREE.Matrix4())
    // resize自适应
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
        camera.updateProjectionMatrix(); // 更新相机投影矩阵
        renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    }, false);


    // const vector = new THREE.Vector3(1, 0, 0);
    // vector.applyQuaternion(quaternion);
    // console.log(animate_List[0]);

    // 逐帧渲染
    const render = () => {
        stats.update(); // 开始性能监视器
        // controls.update();
        // pointerLockControls.getObject().update();
        const frameT = clock.getDelta();
        // 更新播放器相关的时间
        if (mixer) {
            mixer.update(frameT); // 更新动画
        }
        firstPerson.update(frameT); // 更新第一人称控制器
        renderer.render(scene, camera); // 渲染场景
        requestAnimationFrame(render); // 请求再次执行渲染函数render
    }
    requestAnimationFrame(render);
})

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

.animate-slider {
    position: absolute;
    bottom: 0;
    left: 0;
    // z-index: 2;
    width: 100%;
    height: 100px;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;

    .el-slider {
        width: 50%;
    }

    .select {
        margin: 0 10px;
    }

    .el-button {
        margin: 0 10px;
    }

    .circle {
        background-color: #fff;
        border: 2px solid #0f0;
        z-index: 3;
    }
}
</style>