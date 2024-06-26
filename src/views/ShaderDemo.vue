<template>
    <canvas class="container" ref="container"></canvas>
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
camera.position.set(0, 200, 0); // 设置相机位置
camera.lookAt(0, 0, 0); // 设置相机焦点

const url = "/gltf/chache/chache-1.gltf"
// const url = "/gltf/test/duiduoji-1.gltf"
// const url = "/gltf/Horse.glb"

let mixer, shader
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
    shader = getShaderMaterial(); // 创建shader材质
    // shader = createShader(); // 创建shader材质
    const geometry = new THREE.PlaneGeometry(100, 100); // 创建几何体
    const mesh = new THREE.Mesh(geometry, shader); // 创建网格模型
    scene.add(mesh); // 添加网格模型到场景

    // mesh平铺在xOz平面上
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 1;
    return mesh;
}


// 延时函数
const sleep = (time) => {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    });
}

// 创建shader材质
const getShaderMaterial = () => {
    let texture = createCanvasTexture(); // 创建纹理

    const shader = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }, // 时间
            mouse: { value: new THREE.Vector2(0.0, 0.0) },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            texture: { value: texture }, // 传入纹理
            // startAngle: { value: 0.0 }, // 起始角度
            // endAngle: { value: 0.5 }, // 结束角度   
        },
        vertexShader: `
            varying vec2 vUv; // 传递纹理坐标
            void main(){
                vUv = uv; // 纹理坐标赋值给vUv
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0 );
            }
        `,
        // 像素颜色随时间变化
        fragmentShader: `
        // 定义π值
        #define PI 3.14159265359
        
        varying vec2 vUv;
        uniform float time;
        uniform vec2 mouse;
        uniform vec2 resolution;
        uniform sampler2D texture;

        // 绘制圆形 smoothstep 带毛边
        float circle_smoothstep(vec2 st, vec2 center, float radius) {
            float dis = distance(st, center); // 计算纹理坐标和圆心的距离
            return smoothstep(radius - 0.01, radius + 0.01, dis); 
        }

        // 绘制圆形 step 带毛边
        float circle_step(vec2 st, vec2 center, float radius){
            float dis = distance(st, center); // 计算纹理坐标和圆心的距离
            return step(radius, dis); // 绘制圆形
        }

        // 绘制扇形
        float sector(vec2 st, vec2 center, float startAngle, float endAngle, float radius){
            float dis = distance(st, center); // 计算纹理坐标和圆心的距离
            float angle = atan(st.y - center.y, st.x - center.x); // 计算纹理坐标和圆心的角度
            float sector = step(radius, dis) * step(startAngle, angle) * (1.0 - step(endAngle, angle)); // 绘制扇形
            return sector;
        }

        // 绘制主函数
        void main(){
            vec2 uv = vUv; // 纹理坐标
            vec2 center = vec2(0.5); // 圆心
            float radius = 0.4; // 半径
            // 绘制圆环
            float circle_small = circle_smoothstep(uv, center, radius);
            float circle_max = circle_step(uv, center, radius + 0.02);
            float circle = circle_small - circle_max; // 用小圆减去大圆
            circle = 1.0 - circle; // 反转颜色
            vec4 circle_color = vec4(vec3(circle), 0) + vec4(0.0, 0.0, 0.7, 0.2); // 设置颜色

            // 创建两个半径不同扇形 
            float radius_sector = 0.3;
            float startAngle = 0.5 * PI;
            float endAngle = 1.8 * PI;
            float sector1 = sector(uv, center, startAngle, endAngle, radius_sector);
            float sector2 = sector(uv, center, startAngle, endAngle, radius_sector - 0.03);

            // 用小扇形减去大扇形得到圆弧线
            float sector = sector1 - sector2; 

            // 计算当前像素点的角度
            vec2 dir = uv - center;
            float angle = atan(dir.y, dir.x);
            if (angle < 0.0) {
                angle += 2.0 * PI;
            }

            // 定义颜色渐变的起始和结束颜色
            vec4 startColor = vec4(1.0, 0.0, 0.0, 1.0); // 红色
            vec4 endColor = vec4(0.0, 0.0, 1.0, 1.0); // 蓝色

            // 计算颜色渐变的比例
            float t = (angle - startAngle) / (endAngle - startAngle);

            // 使用mix函数计算颜色 clamp函数限制t的范围在0.0到1.0之间
            vec4 sector_color = mix(startColor, endColor, clamp(t, 0.0, 1.0));
            sector_color = sector_color * sector; // 取sector_color与circle_color的并集

            
            // 取sector_color与circle_color的并集
            // vec4 Fan_And_Ring = max(sector_color, circle_color); // 取并集
            // vec4 Fan_And_Ring = vec4(vec3(shape), 0) + vec4(0.0, 0.0, 0.7, 0.3); // 设置颜色
            vec4 Fan_And_Ring = sector_color + circle_color; // 取并集


            // 绘制纹理
            vec4 color = texture2D(texture, uv);
            if (color.a < 0.7) {
                gl_FragColor = Fan_And_Ring; // 设置颜色
            } else {
                gl_FragColor = color; // 设置颜色
            }
        }
        `,
        side: THREE.DoubleSide, // 设置材质的两面都可见
        transparent: true, // 启用透明度
    });
    return shader;
}

// sdf距离场
const createShader = () => {
    const shader = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }, // 时间
        },
        vertexShader: `
            varying vec2 vUv; // 传递纹理坐标
            void main(){
                vUv = uv; // 纹理坐标赋值给vUv
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0 );
            }
        `,
        // 像素颜色随时间变化
        fragmentShader: `
            // 定义π值
            #define PI 3.14159265359
            
            varying vec2 vUv;
            
            // 利用有向距离场 绘制扇形
            float SDF_Pie (vec2 st, float angle, float radius) {
                float angle2 = angle + PI / 4.0; // 扇形的角度
                vec2 dir = vec2(cos(angle), sin(angle)); // 扇形的方向
                vec2 dir2 = vec2(cos(angle2), sin(angle2)); // 扇形的方向
                vec2 p = st - 0.5;
                float d = max(dot(normalize(p), dir), dot(normalize(p), dir2)); // 计算距离
                return d - radius;
            }

            // 绘制主函数
            void main(){
                vec2 uv = vUv; // 纹理坐标
                vec2 center = vec2(0.5); // 圆心
                float radius = 0.4; // 半径
                float angle = PI / 4.0; // 角度
                float sector = SDF_Pie(uv, angle, radius); // 绘制扇形

                vec4 sector_color = vec4(vec3(sector), 1.0);

                gl_FragColor = sector_color; // 设置颜色
            }
           
        `,
        side: THREE.DoubleSide, // 设置材质的两面都可见
        transparent: true, // 启用透明度
    });
    return shader;
}

// 创建canvas纹理
const createCanvasTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    // 设置文字样式
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 在在四个方向上绘制"东南西北" 正上方：北，正下方：南，正左方：西，正右方：东
    // 北字为红色，其余为蓝色
    ctx.fillStyle = "#dd7675"
    ctx.fillText('北', 128, 32);

    ctx.fillStyle = '#244ecf';
    ctx.fillText('南', 128, 224);
    ctx.fillText('西', 32, 128);
    ctx.fillText('东', 224, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
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
    scene.add(createGridHelper()) // 添加坐标轴辅助

    renderer.backgroundColor = new THREE.Color(0x000000); // 设置渲染器背景颜色

    let mesh = addMesh() // 添加立方体
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
        controls.update();
        let frameT = clock.getDelta();

        // 获取自上次调用.elapsedTime()以来经过的时间
        let elapsedTime = clock.getElapsedTime();
        // 更新shader的time变量
        shader.uniforms.time.value = elapsedTime;
        // mesh.lookAt(camera.position); // 立方体始终朝向相机
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