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

function createSmokeEffect(params) {
    // 使用传入的参数，没有时才使用默认值
    const {
        meshPosition,
        name,
        color = '#888888',
        size = 2.5,        // 默认增大烟雾范围
        height = 1,        // 默认增大高度
        range = 4.0,       // 默认增大扩散范围
        particleCount = 1500 // 默认粒子数量
    } = params;

    // 加载烟雾纹理
    const smokeTexture = textureLoader.load("./texture/smoke1.png");

    // 粒子系统参数
    const PARTICLE_COUNT = particleCount;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const lifetimes = new Float32Array(PARTICLE_COUNT);
    const startTimes = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // 保持当前的生命周期
    const maxLifetime = 8.0; // 烟雾粒子最大存活时间（秒）

    // 初始化粒子 - 使用传入的参数
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // 在小范围内随机分布，形成烟雾源
        const emitRadius = Math.random() * (size * 0.3); // 基于size参数调整发射半径
        const emitAngle = Math.random() * Math.PI * 2;

        positions[3 * i] = Math.cos(emitAngle) * emitRadius;
        positions[3 * i + 1] = -0.2 + Math.random() * 0.2; // 略低于地面
        positions[3 * i + 2] = Math.sin(emitAngle) * emitRadius;

        // 速度：基于传入的height和range参数
        const upwardSpeed = (0.05 + Math.random() * 0.1) * height; // 使用height参数
        const horizontalSpeed = (0.15 + Math.random()) * range; // 使用range参数

        velocities[3 * i] = (Math.random() - 0.5) * horizontalSpeed;
        velocities[3 * i + 1] = upwardSpeed;
        velocities[3 * i + 2] = (Math.random() - 0.5) * horizontalSpeed;

        // 生命周期，错开时间让烟雾连续
        lifetimes[i] = maxLifetime * (0.7 + Math.random() * 0.3);

        // 错开起始时间，确保烟雾从一开始就存在
        const currentTime = clock.getElapsedTime();
        startTimes[i] = currentTime - Math.random() * maxLifetime;

        // 初始粒子大小 - 直接使用size参数
        sizes[i] = size * (0.5 + Math.random() * 1.0);

        // 烟雾颜色 - 使用传入的color参数
        let colorValue;
        if (typeof color === 'string') {
            const c = new THREE.Color(color);
            colorValue = { r: c.r, g: c.g, b: c.b };
        } else {
            colorValue = color;
        }

        // 设置颜色，应用随机灰度变化
        const shade = 0.8 + Math.random() * 0.2;
        colors[3 * i] = colorValue.r * shade;
        colors[3 * i + 1] = colorValue.g * shade;
        colors[3 * i + 2] = colorValue.b * shade;
    }


    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('startTime', new THREE.BufferAttribute(startTimes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 4.0 * size, // 增大基础大小，从3.0到4.0
        map: smokeTexture,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        opacity: 0.6, // 稍微降低不透明度，从0.7到0.6
        blending: THREE.NormalBlending,
    });
    // 注意：纹理不应立即释放，材质还在使用
    smokeTexture.dispose();

    const particles = new THREE.Points(geometry, material);
    particles.name = name;
    particles.userData.effectMethod = 'CreateSmokeEffect'
    particles.userData.size = size;
    particles.userData.height = height;
    particles.userData.range = range;
    particles.position.copy(meshPosition);

    // 添加到场景
    scene.add(particles)

    // 返回粒子系统对象，便于外部管理
    return particles;
}

// 更新烟雾效果的函数
function updateSmokeEffect(effect, delta, elapsed) {

    const geometry = effect.geometry;
    const posAttr = geometry.getAttribute('position');
    const velAttr = geometry.getAttribute('velocity');
    const startAttr = geometry.getAttribute('startTime');
    const lifeAttr = geometry.getAttribute('lifetime');
    const sizeAttr = geometry.getAttribute('size');
    const colorAttr = geometry.getAttribute('color');

    const count = posAttr.count;
    for (let i = 0; i < count; i++) {
        let age = elapsed - startAttr.getX(i);
        const lifetime = lifeAttr.getX(i);

        // 如果粒子已超出生命周期，则重置它
        if (age > lifetime) {
            startAttr.setX(i, elapsed);
            age = 0;
            
            // 从effect对象获取原始参数
            const originalSize = effect.userData.size || 2.5;
            const originalHeight = effect.userData.height || 4;
            const originalRange = effect.userData.range || 4.0;
            
            // 重置位置到底部发射区 - 基于原始参数
            const emitRadius = Math.random() * (originalSize * 0.3);
            const emitAngle = Math.random() * Math.PI * 2;

            posAttr.setXYZ(i, Math.cos(emitAngle) * emitRadius, -0.2 + Math.random() * 0.2, Math.sin(emitAngle) * emitRadius);

            // 重置速度 - 基于原始height和range参数，增强扩散效果
        const upwardSpeed = (0.08 + Math.random() * 0.15) * originalHeight;  // 增大上升速度
        const horizontalSpeed = (0.3 + Math.random() * 0.5) * originalRange; // 大幅增强水平扩散

            velAttr.setXYZ(
                i,
                (Math.random() - 0.5) * horizontalSpeed,
                upwardSpeed,
                (Math.random() - 0.5) * horizontalSpeed
            );

            // 重置大小 - 基于原始size参数
            sizeAttr.setX(i, originalSize * (0.5 + Math.random() * 1.0));

            // 重置颜色 - 保持原始颜色
            const shade = 0.8 + Math.random() * 0.2;
            colorAttr.setXYZ(i, shade, shade, shade);
        }

        // 更新位置：p += v * dt + 增强摆动
        const swayX = Math.sin(elapsed * 0.5 + i * 0.08) * 0.02; // 大幅增强摆动幅度
        const swayZ = Math.cos(elapsed * 0.4 + i * 0.1) * 0.02; // 大幅增强摆动幅度

        posAttr.setXYZ(
            i,
            posAttr.getX(i) + velAttr.getX(i) * delta + swayX,
            posAttr.getY(i) + velAttr.getY(i) * delta,
            posAttr.getZ(i) + velAttr.getZ(i) * delta + swayZ
        );

        // 获取当前高度用于计算
        const currentHeight = posAttr.getY(i);
        const t = age / lifetime; // 生命周期进度

        // 随高度调整速度 - 越高水平扩散越大
        if (currentHeight > 0.5) {
            const heightFactor = Math.min(1, currentHeight / 3.0);
            const horizontalSpread = 0.02 * heightFactor; // 增大扩散系数，从0.01到0.02

            // 向上速度随高度降低，水平扩散增加
            velAttr.setXYZ(
                i,
                velAttr.getX(i) + (Math.random() - 0.5) * horizontalSpread * delta,
                velAttr.getY(i) * (1 - 0.02 * delta), // 减缓上升速度减少率，从0.03到0.02，让烟雾上升更高
                velAttr.getZ(i) + (Math.random() - 0.5) * horizontalSpread * delta
            );
        }

        // 随高度增大粒子尺寸 - 模拟扩散
        const growthFactor = 1 + (0.15 + currentHeight * 0.15) * delta; // 增大生长因子，从0.1到0.15
        sizeAttr.setX(i, sizeAttr.getX(i) * growthFactor);

        // 随高度和年龄调整颜色 - 烟雾越高越淡
        if (currentHeight > 0.3) {
            const heightRatio = Math.min(1, currentHeight / 3.0);
            // 随着高度，颜色稍微变暗
            const newShade = Math.max(0.7, 0.8 - heightRatio * 0.1);
            colorAttr.setXYZ(i, newShade, newShade, newShade);
        }
    }

    // 标记属性已更新
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    startAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    velAttr.needsUpdate = true;
}

onMounted(() => {
    createStats(state.value); // 创建性能监视器
    scene = createScene(); // 创建场景
    createRender(container.value) // 创建渲染器
    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    // 创建环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight); // 添加环境光
    scene.add(createAxesHelper()) // 添加坐标轴辅助
    scene.add(createGridHelper()) // 添加坐标轴辅助

    // 存储所有特效以便更新
    window.effects = [];

    // 创建烟雾效果示例 - 使用可调整的参数
    const smokeEffect = createSmokeEffect({
        meshPosition: new THREE.Vector3(0, 3, 0),
        name: 'exampleSmoke',
        color: '#666666',
        size: 5.0,      // 增大烟雾尺寸
        height: 8,      // 增加上升高度
        range: 6.0,     // 扩大扩散范围
        particleCount: 2000  // 增加粒子数量
    });

    if (smokeEffect) window.effects.push(smokeEffect);

    // 左键点击事件
    container.value.addEventListener('click', clickScene, false);

    // resize自适应
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
        camera.updateProjectionMatrix(); // 更新相机投影矩阵
        renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    }, false);

    // console.log(animate_List[0]);

    // 添加全局烟雾控制对象
    window.smokeControls = {
        size: 5.0,
        height: 8,
        range: 6.0,
        particleCount: 2000,
        speed: 1.0,
        spread: 1.0
    };

    // 逐帧渲染
    let lastTime = 0;
    const render = (currentTime) => {
        const deltaTime = Math.max(0.001, Math.min((currentTime - lastTime) / 1000, 0.1)); // 限制delta范围
        lastTime = currentTime;

        stats.update(); // 开始性能监视器
        controls.update();

        // 更新所有烟雾效果
        if (window.effects) {
            window.effects.forEach(effect => {
                if (effect && effect.userData && effect.userData.effectMethod === 'CreateSmokeEffect') {
                    // 实时更新参数
                    effect.userData.size = window.smokeControls.size;
                    effect.userData.height = window.smokeControls.height;
                    effect.userData.range = window.smokeControls.range;
                    updateSmokeEffect(effect, deltaTime, currentTime);
                }
            });
        }

        // 注意：mesh相关代码需要createCloud函数实际创建云模型
        if (mesh && mesh.material && mesh.material.uniforms) {
            mesh.material.uniforms.cameraPos.value.copy(camera.position);
            mesh.material.uniforms.frame.value++;
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
</style>