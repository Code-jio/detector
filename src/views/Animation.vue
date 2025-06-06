<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>

    <!-- 进度条 -->
    <div class="animate-slider">
        <el-slider v-model="value" tooltip-class="circle" @input="drag" show-stops :step="1" :max="frameNum" />
        <!-- 暂停按钮 -->
        <el-button type="primary" @click="pause">暂停</el-button>
        <!-- 播放按钮 -->
        <el-button type="primary" @click="play">播放</el-button>
        <!-- 倒带按钮 -->
        <!-- <el-button type="primary" @click="animationReverse">倒带</el-button> -->
    </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';

let stats, renderer, scene

// 创建相机
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.updateProjectionMatrix(); // 更新相机投影矩阵
camera.position.set(100, 100, -100); // 设置相机位置
camera.lookAt(0, 0, 0); // 设置相机焦点

// const url = "/gltf/chache/chache-1.gltf"
// const url = "/gltf/test/duiduoji-1.gltf"
// const url = "/gltf/Horse.glb"
// const url = "/gltf/Duck/glTF/Duck.gltf"
const url = "/gltf/RobotExpressive/RobotExpressive.glb"

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
        opacity: 0.5, // 设置材质透明度
    });
    const mesh = new THREE.Mesh(geometry, material); // 创建立方体网格模型
    mesh.name = 'mesh'; // 设置立方体网格模型名称
    mesh.position.set(0, 0, 0); // 设置立方体网格模型位置
    scene.add(mesh); // 添加立方体网格模型到场景
}

// 添加模型
const addModel = () => {
    // const dracoLoader = DRACOLoader();
    // dracoLoader.setDecoderPath('/draco/gltf/');
    const loader = new GLTFLoader(); // 创建gltf加载器
    loader.load(url, (gltf) => { // 加载模型
        const model = gltf.scene; // 获取模型
        model.scale.set(10, 10, 10); // 设置模型缩放
        model.position.set(0, 0, 0); // 设置模型位置
        model.rotation.set(0, 0, 0); // 设置模型旋转
        model.name = 'chache'; // 设置模型名称
        scene.add(model); // 添加模型到场景
        console.log(gltf);
        mixer = new THREE.AnimationMixer(gltf.scene); // 创建动画播放器
        // 获取动画列表
        const actions = gltf.animations.map(item => mixer.clipAction(item));
        model.actions = actions; // 将模型动画列表添加到模型对象上
        animate_List.splice(0, animate_List.length, ...actions); // 将动画列表添加到动画列表数组中
        // 播放动画
        time.value = animate_List[2]._clip.duration * 1000;
        value.value = animate_List[2].time;
        current_animate_options.push(animate_List[2]); // 将当前动画添加到当前动画列表中
        setMaxTime(current_animate_options); // 设置最大播放秒数

        frameNum.value = animate_List[2]._clip.tracks[0].times.length - 1; // 设置帧数

        // console.log(actions);

    });
}

// 延时函数
const sleep = (time) => {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    });
}

// 选中值改变
const valueChange = (item) => {
    // console.log(current_animate.value, "current_animate");
    // 把选中值赋值给current_animate
    console.log(item);
}

/**
 * 递归获取上层模型的actions，如果找到则返回该动画，如果没有则返回false
 * @param { Object3D } obj 模型对象
 */
const getActions = (obj) => {
    if (!obj.parent) {
        return false;
    }
    if (obj.parent.type === "Scene" && obj.parent.actions) {
        return obj.parent.actions;
    } else {
        return getActions(obj.parent);
    }
}

// 设置最大播放秒数
const setMaxTime = (item) => {
    console.log(item);
    // 在当前动画组中找到最大的播放秒数
    const maxTime = item.reduce((prev, current) => {
        return prev._clip.duration > current._clip.duration ? prev : current;
    })._clip.duration.toFixed(2) * 1000;
    time.value = maxTime;
    value.value = 0;
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
        if (getActions(obj)) {
            animate_List.splice(0, animate_List.length, ...getActions(obj));
            // console.log(getActions(obj));
        }
    }
}

// 动画播放
const play = () => {
    // 同一模型的两个动画同时播放
    animate_List[2].paused = false;
    Promise.all([
        current_animate_options.forEach((item) => {
            animationStart(item);
        })
    ]).then(() => {
        console.log('动画播放');
    }).catch((err) => {
        console.log(err);
    })
}

// 动画开始
const animationStart = (AnimationAction) => {
    AnimationAction.clampWhenFinished = true; // 动画播放完毕后是否保持最后一帧
    // AnimationAction.loop = THREE.LoopOnce; // 动画循环方式
    if (AnimationAction.paused) {
        AnimationAction.paused = false
    } else {
        AnimationAction.play();
    }
    console.log(AnimationAction);
}

// 动画暂停
const pause = () => {
    Promise.all([
        // animate_List[0].paused = true,
        // animate_List[2].paused = true
        current_animate_options.forEach((item) => {
            item.paused = true;
        })
    ]).then(() => {
        console.log('动画暂停');
    }).catch((err) => {
        console.log(err);
    })

}

// 动画暂停
const animationPause = (AnimationAction) => {
    AnimationAction.paused = true
}



// 拖曳进度条
const drag = () => {
    // 利用value的值来控制动画播放,使多个持续时间不同的动画同步播放至指定帧
    current_animate_options.forEach((item) => {
        // 获取该动画的关键帧
        let keyframe = item._clip.tracks[0].times[value.value];
        // 该关键帧的时间赋值给动画
        // item.time = keyframe;
        console.log(keyframe);
    })
    // console.log(value.value);
}


onMounted(() => {
    createStats(state.value); // 创建性能监视器
    scene = createScene(); // 创建场景
    createRender(container.value) // 创建渲染器
    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement); // 控制器传入相机对象和渲染器dom元素
    console.log(controls);
    // 创建环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight); // 添加环境光
    scene.add(createAxesHelper()) // 添加坐标轴辅助
    scene.add(createGridHelper()) // 添加网格辅助

    addModel() // 添加模型
    // addMesh() // 添加立方体
    // 左键点击事件
    container.value.addEventListener('click', clickScene, false);
    console.log(new THREE.Matrix4())
    // resize自适应
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
        camera.updateProjectionMatrix(); // 更新相机投影矩阵
        renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    }, false);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

    console.log(quaternion);

    // const vector = new THREE.Vector3(1, 0, 0);
    // vector.applyQuaternion(quaternion);

    // console.log(animate_List[0]);

    // 逐帧渲染
    const render = () => {
        stats.update(); // 开始性能监视器
        controls.update();
        const frameT = clock.getDelta();
        // 更新播放器相关的时间
        if (mixer) {
            mixer.update(frameT); // 更新动画
        }

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