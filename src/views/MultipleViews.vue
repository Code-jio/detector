<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
    <div class="slider"></div>
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
const container = ref(null) // 画布dom
const state = ref(null) // 性能监视器dom
let windowWidth, windowHeight;
let sliderPos = 0.5; // 滑块位置
let controls

const views = [
    {
        left: 0,
        bottom: 0,
        width: sliderPos, // 视口宽度
        height: 1.0, // 视口高度
        background: new THREE.Color().setRGB(0.5, 0.5, 0.7),
        eye: [0, 300, 1800],
        up: [0, 1, 0],
        fov: 30,
        layout: null,
        updateCamera: function (camera, scene, x, y) {
            camera.aspect = this.width / this.height;
            camera.updateProjectionMatrix();
        }
    },
    {
        left: 0.5, // 视口左边距
        bottom: 0, // 视口底边距
        width: 1 - sliderPos, // 视口宽度
        height: 1, // 视口高度 
        background: new THREE.Color().setRGB(0.7, 0.5, 0.5),
        eye: [0, 1800, 0],
        up: [0, 1, 0],
        fov: 45,
        layout: null,
        updateCamera: function (camera, scene, x, y) {
            camera.aspect = this.width / this.height;
            camera.updateProjectionMatrix();
        }
    },
    // {
    //     left: 0.5, // 视口左边距
    //     bottom: 0.5, // 视口底边距
    //     width: 0.5,
    //     height: 0.5,
    //     background: new THREE.Color().setRGB(0.5, 0.7, 0.7),
    //     eye: [1400, 800, 1400],
    //     up: [0, 1, 0],
    //     fov: 60,
    //     layout: null,
    // }
];

for (let ii = 0; ii < views.length; ++ii) {

    const view = views[ii];
    const camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.fromArray(view.eye);
    camera.up.fromArray(view.up);
    view.camera = camera;

    // 创建一个新的透明的div元素，按比例缩放，然后将其添加到DOM中
    const elem = document.createElement('div');
    elem.className = 'layout-' + ii;
    elem.style.position = 'absolute';
    elem.style.left = Math.floor(view.left * window.innerWidth) + 'px';
    elem.style.bottom = Math.floor(view.bottom * window.innerHeight) + 'px';
    elem.style.width = Math.floor(view.width * window.innerWidth) + 'px';
    elem.style.height = Math.floor(view.height * window.innerHeight) + 'px';
    elem.style.background = "rgba(0,0,0,0.0)";
    document.body.appendChild(elem);
    view.layout = elem;
    view.rect = elem.getBoundingClientRect();

    controls = new OrbitControls(views[ii].camera, views[ii].layout);
    controls.enableDamping = true;
    views[ii].controls = controls;

    // 为每个分屏分别设置射线拾取
    elem.addEventListener('click', (event) => {
        const raycaster = new THREE.Raycaster(); // 创建射线投射器对象
        const mouse = new THREE.Vector2(); // 创建二维平面

        // const x = ((event.clientX - view.left * window.innerWidth) / view.width * window.innerWidth) * 2 - 1; // 获取鼠标点击位置x
        // const y = -((event.clientY - (view.height - view.bottom - 1) * window.innerWidth) / view.height * window.innerHeight) * 2 + 1; // 获取鼠标点击位置y

        const x = ((event.clientX - view.rect.left) / view.rect.width) * 2 - 1; // 获取鼠标点击位置x
        const y = -((event.clientY - view.rect.top) / view.rect.height) * 2 + 1; // 获取鼠标点击位置y

        mouse.x = x; // 设置鼠标向量x
        mouse.y = y; // 设置鼠标向量y

        // 更新相机的世界矩阵
        views[ii].camera.updateMatrixWorld();
        raycaster.setFromCamera(mouse, camera); // 设置射线投射器起点和方向
        const intersects = raycaster.intersectObjects(scene.children, true); // 对场景中的所有模型进行拾取
        console.log(intersects);
        if (intersects.length > 0) {
            // 将选中物体更改至随机颜色
            if (intersects[0].object instanceof THREE.Mesh) {
                intersects[0].object.material.color.setRGB(random(0, 1), random(0, 1), random(0, 1));
            }
        }
    }, false);
}

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
    renderer.logarithmicDepthBuffer = true; // 设置深度缓冲区为对数深度缓冲区
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
    // scene.background = new THREE.Color(0xffffff); // 设置背景颜色
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

// 创建一个立方体
const createCube = () => {
    const geometry = new THREE.BoxGeometry(10, 10, 10); // 创建立方体几何体
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 }); // 材质对象
    const mesh = new THREE.Mesh(geometry, material); // 网格模型对象
    mesh.position.set(10, 0, 10); // 设置立方体位置
    return mesh;
}

// 更新视口尺寸
const updateSize = () => {
    if (windowWidth != window.innerWidth || windowHeight != window.innerHeight) {

        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        // 更新layout尺寸
        for (let ii = 0; ii < views.length; ++ii) {
            const view = views[ii];
            const layout = view.layout;

            const left = Math.floor(windowWidth * view.left);
            const bottom = Math.floor(windowHeight * view.bottom);
            const width = Math.floor(windowWidth * view.width);
            const height = Math.floor(windowHeight * view.height);

            layout.style.left = left + 'px';
            layout.style.bottom = bottom + 'px';
            layout.style.width = width + 'px';
            layout.style.height = height + 'px';

            // 根据view给出的left、bottom、width、height重新计算view.rect
            view.rect = {
                bottom: (1 - view.bottom) * view.height * windowHeight,
                left: view.left * windowWidth,
                top: (1 - view.height - view.bottom) * window.innerWidth,
                right: -1 * (view.width - view.left - 1) * window.innerWidth,
                width: width,
                height: height,
            };

        }

        renderer.setSize(windowWidth, windowHeight);
    }
}

const initSlider = () => {
    const slider = document.querySelector('.slider');
    function onPointerDown() {
        if (event.isPrimary === false) return;
        // controls.enabled = false;
        views.map(view => view.controls.enabled = false);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    function onPointerUp() {
        // controls.enabled = true;
        views.map(view => view.controls.enabled = true);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
        if (event.isPrimary === false) return;
        sliderPos = Math.max(0, Math.min(window.innerWidth, e.pageX)) / window.innerWidth;
        slider.style.left = sliderPos * window.innerWidth - (slider.offsetWidth / 2) + 'px';

        views[0].width = sliderPos;
        views[1].width = 1 - sliderPos;
        views[0].layout.style.width = views[0].width * window.innerWidth + 'px';
        views[1].layout.style.width = views[1].width * window.innerWidth + 'px';

        views[1].left = sliderPos;
        views[1].layout.style.left = views[1].left * window.innerWidth + 'px';

        views[0].left = 0;
        views[0].layout.style.left = views[0].left * window.innerWidth + 'px';
    }

    slider.style.touchAction = 'none'; // disable touch scroll
    slider.addEventListener('pointerdown', onPointerDown);
}

const fn = async () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('success');
        }, 1000);
    })
}

onMounted(() => {
    createStats(state.value);
    scene = createScene();
    console.log(scene)
    createRender(container.value)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight); // 添加环境光
    scene.add(createAxesHelper()) // 添加坐标轴辅助
    scene.add(createGridHelper()) // 添加坐标轴辅助
    scene.add(createCube()) // 添加立方体

    initSlider();
    // console.log(fn())
    // fn()
    const multiViewUpdate = () => {
        updateSize();

        for (let ii = 0; ii < views.length; ++ii) {
            const view = views[ii];
            const camera = view.camera;

            const left = Math.floor(windowWidth * view.left);
            const bottom = Math.floor(windowHeight * view.bottom);
            const width = Math.floor(windowWidth * view.width);
            const height = Math.floor(windowHeight * view.height);

            renderer.setViewport(left, bottom, width, height); // 设置视口
            renderer.setScissor(left, bottom, width, height); // 设置裁剪区域
            renderer.setScissorTest(true); // 开启裁剪测试

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            view.controls.update();
            renderer.render(scene, camera);
        }
    }

    // 逐帧渲染
    const render = () => {
        stats.update();
        multiViewUpdate();
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
    z-index: 10;
    width: 40px;
    height: 40px;
    background-color: #D3D3D3;
    opacity: 0.7;
    border-radius: 50%;

    top: calc(50% - 20px);
    left: calc(50% - 20px);
}
</style>