<template>
    <canvas class="contain" ref="contain"> </canvas>
    <div class="state" ref="stateContain"></div>
    <!-- 当前场景的面数、材质数、贴图数 -->
    <div class="scene_info" ref="scene_info"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"; // 控制器
import Stats from "three/examples/js/libs/stats.min.js";

// 创建画布
const contain = ref(null);
// 创建性能监视器
const stateContain = ref(null);
let canvas, state, stats, renderer, controls, light;


// 创建性能监视器
const createStats = (state) => {
    const stats = new Stats(); // 创建性能监视器
    stats.showPanel(0, 1, 2); // 0: fps:帧率, 1: ms:渲染时间, 2: mb:内存占用
    state.appendChild(stats.dom); // 将性能监视器添加到页面中
    return stats
}

// 创建渲染器render
const createRender = (canvas) => {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true, // 开启硬件反走样
        alpha: true, // 背景透明
        precision: "highp", // 着色精度选择
        powerPreference: "high-performance", // 高性能模式-优先使用GPU
    }); // 创建渲染器
    renderer.gammaOutput = true; // 设置输出为sRGB格式
    renderer.physicallyCorrectLights = true; // 设置光照正确性
    renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比 作用：防止高分屏下模糊
    renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    renderer.logarithmicDepthBuffer = true; // 设置渲染器是否使用对数深度缓冲

    return renderer
}

// 创建相机
const createCamera = () => {
    const fov = 45; // 视角
    const near = 1; // 近裁剪面
    const far = 100000; // 远裁剪面
    // 透视相机默认指向 Z 轴负方向，上方向指向 Y 轴正方向
    const camera = new THREE.PerspectiveCamera(
        fov,
        window.innerHeight / window.innerWidth,
        near,
        far
    ); // 创建相机  视角、长宽比、近裁剪面、远裁剪面
    camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
    camera.updateProjectionMatrix(); // 更新相机投影矩阵

    // 设置相机位置
    camera.position.x = 100.0
    camera.position.y = 100.0
    camera.position.z = 100.0
    return camera
}

// 创建控制器
const createOrbitControls = (camera, canvas) => {
    const controls = new OrbitControls(camera, canvas); // 创建控制器
    controls.enableDamping = true; // 启用阻尼效果
    controls.dampingFactor = 0.05; // 阻尼系数
    controls.enableZoom = true; // 启用缩放
    controls.autoRotate = false; // 关闭自动旋转
    controls.enablePan = true; // 启用平移
    controls.enableRotate = true; // 启用旋转
    controls.rotateSpeed = 0.1; // 旋转速度
    controls.zoomSpeed = 1.2; // 缩放速度
    controls.panSpeed = 0.05; // 平移速度
    controls.minDistance = 1; // 最小缩放距离
    controls.maxDistance = 10000; // 最大缩放距离
    controls.minPolarAngle = 0; // 最小仰角
    controls.maxPolarAngle = Math.PI; // 最大仰角
    controls.minAzimuthAngle = -Infinity; // 最小方位角
    controls.maxAzimuthAngle = Infinity; // 最大方位角
    controls.screenSpacePanning = false; // 屏幕空间平移
    controls.maxZoom = Infinity; // 最大缩放
    controls.minZoom = 0; // 最小缩放
    controls.enableKeys = true; // 启用键盘控制
    controls.keys = {
        LEFT: 37, // 左键
        UP: 38, // 上键
        RIGHT: 39, // 右键
        BOTTOM: 40, // 下键
    };
    controls.target.set(0, 0, 0); // 设置控制器的焦点
    controls.update(); // 更新控制器
    return controls
}

// 创建场景
const createScene = () => {
    const scene = new THREE.Scene(); // 创建场景
    // scene.fog = new THREE.FogExp2(0x000000, 0.001); // 创建雾化效果
    const grid = new THREE.GridHelper(1000, 100); // 创建网格 参数：网格尺寸，每个小网格的长度=网格尺寸/网格数
    // console.log(grid);
    grid.name = "GridHelper";
    grid.material.opacity = 0.2; // 设置网格透明度
    grid.material.transparent = true; // 设置网格透明度
    grid.position.y = 0; // 设置网格位置
    grid.position.x = 0; // 设置网格位置
    grid.position.z = 0; // 设置网格位置
    // grid.rotation.x = Math.PI / 2; // 设置网格旋转角度
    grid.visible = true; // 设置网格是否可见
    grid.material.depthTest = false; // 设置网格材质是否深度测试
    scene.add(grid); // 将网格添加到场景中
    scene.add(new THREE.AxesHelper(1000)); // 创建坐标轴辅助线
    scene.background = new THREE.Color(0xffffff); // 设置背景颜色

    return scene
}

// 创建光照
const createlight = () => {
    const color = 0xffffff; // 光照颜色
    const intensity = 1; // 光照强度
    const light = new THREE.DirectionalLight(color, intensity); // 创建平行光
    light.position.set(10, 10, 1000);

    let ambientLight = new THREE.AmbientLight(); //设置环境光
    scene.add(ambientLight); //将环境光添加到场景中
    let pointLight = new THREE.PointLight();
    pointLight.position.set(200, 200, 200); //设置点光源位置
    scene.add(pointLight); //将点光源添加至场景

    return light;
}

const scene = createScene(); // 创建场景
const camera = createCamera() // 创建相机
onMounted(() => {

    canvas = contain.value; // 获取画布
    state = stateContain.value; // 获取性能监视器容器
    stats = createStats(state); // 创建性能监视器
    renderer = createRender(canvas) // 创建渲染器
    controls = createOrbitControls(camera, canvas) // 创建控制器
    light = createlight(); // 创建光照
    scene.add(light);


    // 监听窗口变化
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
        camera.updateProjectionMatrix(); // 更新相机投影矩阵
        renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
        renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比：最小值为2
    });


    // 渲染函数
    function render(timestamp) {
        renderer.render(scene, camera); // 渲染场景
        controls.update(); // 更新控制器
        stats.update(); // 更新性能监控 一定要放在最后
        requestAnimationFrame(render); // 请求再次执行渲染函数
    }
    requestAnimationFrame(render); // 请求执行渲染函数
});

onUnmounted(() => {
    window.removeEventListener("resize", () => { }); // 移除窗口变化监听
    window.removeEventListener("click", () => { }); // 移除点击事件监听
    window.removeEventListener("contextmenu", () => { }); // 移除右键点击事件监听
});
</script>

<style lang="less" scoped>
canvas {
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

.scene_info {
    position: absolute;
    top: 40px;
    left: 0;
    z-index: 2;
    font-size: 12px;
    padding: 10px;
    color: #000;
}
</style>
