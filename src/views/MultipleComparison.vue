<template>
    <canvas class="container" ref="container">
    </canvas>
    <div class="slider"></div>
    <div class="state" ref="state"></div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import * as THREE from 'three';
import Stats from 'three/examples/js/libs/stats.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';

let stats, renderer, scene

// 创建相机
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.updateProjectionMatrix(); // 更新相机投影矩阵
camera.position.set(10, 10, 10); // 设置相机位置
camera.lookAt(0, 0, 0); // 设置相机焦点
let sceneL, sceneR;
let controls;
const clock = new THREE.Clock();// 创建时钟对象Clock
const container = ref(null) // 画布dom
const state = ref(null) // 性能监视器dom
let sliderPos = window.innerWidth / 2; // 滑块位置

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
    renderer.setScissorTest(true); // 设置裁剪测试
}

// 创建性能监视器
const createStats = (dom) => {
    stats = new Stats(); // 创建性能监视器
    stats.showPanel(0, 1, 2); // 0: fps:帧率, 1: ms:渲染时间, 2: mb:内存占用
    dom.appendChild(stats.dom);
}

// 创建场景
const createScene = () => {
    sceneL = new THREE.Scene();
    sceneL.background = new THREE.Color(0xBCD48F);

    sceneR = new THREE.Scene();
    sceneR.background = new THREE.Color(0x8FBCD4);
}

// // 射线拾取
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
    // const intersects = raycaster.intersectObjects(sceneR.children, true); // 获取射线和模型相交的数组
    const intersects = raycaster.intersectObjects([...sceneL.children,...sceneR.children], true); // 获取射线和模型相交的数组
    if (intersects.length > 0) { // 判断是否有相交的模型
        const obj = intersects[0]; // 获取相交的模型
        console.log(obj); // 输出相交的点
    }
}

// 初始化滑块
const initSlider = () => {
    const slider = document.querySelector('.slider');
    function onPointerDown() {
        if (event.isPrimary === false) return;
        controls.enabled = false;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    function onPointerUp() {
        controls.enabled = true;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
        if (event.isPrimary === false) return;
        sliderPos = Math.max(0, Math.min(window.innerWidth, e.pageX));
        slider.style.left = sliderPos - (slider.offsetWidth / 2) + 'px';
    }

    slider.style.touchAction = 'none'; // disable touch scroll
    slider.addEventListener('pointerdown', onPointerDown);
}

onMounted(() => {
    createStats(state.value); // 创建性能监视器
    createScene(); // 创建场景
    createRender(container.value) // 创建渲染器
    // 创建控制器
    controls = new OrbitControls(camera, renderer.domElement);
    // 创建环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneL.add(ambientLight.clone()); // 添加环境光
    sceneR.add(ambientLight.clone()); // 添加环境光
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 3); // 创建半球光
    light.position.set(- 2, 2, 2);
    sceneL.add(light.clone());
    sceneR.add(light.clone());

    renderer.setAnimationLoop(render);

    initSlider();
    const geometry = new THREE.IcosahedronGeometry(5,3); 
    const meshL = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    sceneL.add(meshL);
    const meshR = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ wireframe: true }));
    sceneR.add(meshR);

    // 左键点击事件
    container.value.addEventListener('click', clickScene, false);

    // resize自适应
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
        camera.updateProjectionMatrix(); // 更新相机投影矩阵
        renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    }, false);

    // console.log(animate_List[0]);

    // 逐帧渲染
    const render = () => {
        stats.update(); // 开始性能监视器
        controls.update(); // 更新控制器

        renderer.setScissor(0, 0, sliderPos, window.innerHeight); // 设置裁剪区域
        renderer.render(sceneL, camera);

        renderer.setScissor(sliderPos, 0, window.innerWidth - sliderPos, window.innerHeight);
        renderer.render(sceneR, camera);

        requestAnimationFrame(render); // 请求再次执行渲染函数render
    }
    render();
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

.slider {
    position: absolute;
    cursor: ew-resize;

    width: 40px;
    height: 40px;
    background-color: #F32196;
    opacity: 0.7;
    border-radius: 50%;

    top: calc(50% - 20px);
    left: calc(50% - 20px);
}
</style>