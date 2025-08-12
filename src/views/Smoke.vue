<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
    <SmokeControls />
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
import SmokeControls from '@/components/SmokeControls.vue';
import {SmokeEffectManager} from "../utils/SmokeParticleSystem"

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

    // 添加测试几何体来测试深度冲突
    const testGeometries = [];
    
    // 创建不同深度的立方体
    const cubeGeometry = new THREE.BoxGeometry(5, 5, 5);
    const cubeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4444ff, 
        transparent: true, 
        opacity: 1,
        side: THREE.DoubleSide
    });
    
    const cube1 = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube1.position.set(0, 2.5, 0); // 与主烟雾重叠
    scene.add(cube1);
    testGeometries.push(cube1);
    
    const cube2 = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
    cube2.material.color.setHex(0xff4444);
    cube2.position.set(-15, 2.5, 5); // 与secondary烟雾重叠
    scene.add(cube2);
    testGeometries.push(cube2);
    
    const cube3 = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
    cube3.material.color.setHex(0x44ff44);
    cube3.position.set(20, 2.5, -10); // 与third烟雾重叠
    scene.add(cube3);
    testGeometries.push(cube3);

    // 创建球体测试
    const sphereGeometry = new THREE.SphereGeometry(3, 32, 16);
    const sphereMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff00, 
        transparent: true, 
        opacity: 1,
        side: THREE.DoubleSide
    });
    
    const sphere1 = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere1.position.set(8, 3, 8); // 与烟雾区域相交
    scene.add(sphere1);
    testGeometries.push(sphere1);
    
    const sphere2 = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
    sphere2.material.color.setHex(0xff00ff);
    sphere2.position.set(-8, 4, -8);
    scene.add(sphere2);
    testGeometries.push(sphere2);

    // 创建圆柱体测试
    const cylinderGeometry = new THREE.CylinderGeometry(2, 2, 8, 16);
    const cylinderMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 1,
        side: THREE.DoubleSide
    });
    
    const cylinder1 = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder1.position.set(0, 4, 15);
    scene.add(cylinder1);
    testGeometries.push(cylinder1);
    
    const cylinder2 = new THREE.Mesh(cylinderGeometry, cylinderMaterial.clone());
    cylinder2.material.color.setHex(0xff8800);
    cylinder2.position.set(-20, 4, 0);
    scene.add(cylinder2);
    testGeometries.push(cylinder2);

    // 创建薄板测试深度精度
    const thinGeometry = new THREE.PlaneGeometry(20, 10);
    const thinMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888, 
        transparent: true, 
        opacity: 1,
        side: THREE.DoubleSide
    });
    
    const thin1 = new THREE.Mesh(thinGeometry, thinMaterial);
    thin1.position.set(0, 5, 5);
    thin1.rotation.x = Math.PI / 4;
    scene.add(thin1);
    testGeometries.push(thin1);

    // 创建半透明平面网格测试
    const gridHelper2 = new THREE.GridHelper(50, 20, 0x00ff00, 0x00ff00);
    gridHelper2.position.y = 1;
    gridHelper2.material.opacity = 1;
    gridHelper2.material.transparent = true;
    scene.add(gridHelper2);

    // 将测试几何体暴露给全局，便于调试
    window.testGeometries = testGeometries;

    // 添加深度冲突测试控制
    const depthTestControls = {
        geometryOpacity: 1,
        wireframeMode: false,
        showGeometry: true,
        showSmoke: true,
        enableDepthTest: true,
        enableDepthWrite: true
    };

    // 深度测试控制函数
    const updateDepthTestControls = () => {
        testGeometries.forEach(geometry => {
            if (geometry.material) {
                geometry.material.opacity = depthTestControls.geometryOpacity;
                geometry.material.wireframe = depthTestControls.wireframeMode;
                geometry.visible = depthTestControls.showGeometry;
                geometry.material.depthTest = depthTestControls.enableDepthTest;
                geometry.material.depthWrite = depthTestControls.enableDepthWrite;
            }
        });

        // 控制烟雾显示
        if (depthTestControls.showSmoke) {
            [mainSmoke, secondarySmoke, thirdSmoke].forEach(smoke => {
                if (smoke && smoke.system) {
                    smoke.system.visible = true;
                }
            });
        } else {
            [mainSmoke, secondarySmoke, thirdSmoke].forEach(smoke => {
                if (smoke && smoke.system) {
                    smoke.system.visible = false;
                }
            });
        }
    };

    // 暴露到全局
    window.depthTestControls = depthTestControls;
    window.updateDepthTestControls = updateDepthTestControls;

    // 创建烟雾效果管理器
    const smokeManager = new SmokeEffectManager(scene);

    // 创建基础烟雾效果 - 增加初始发射率
    const mainSmoke = smokeManager.createSmokeEffect({
        maxParticles: 1000,
        particleSize: 3.0,
        emissionRate: 100,  // 增加初始发射率
        lifetime: 10.0,
        position: new THREE.Vector3(0, 0, 0),  // 提高位置使其可见
        spread: new THREE.Vector3(8, 3, 8),
        colorStart: new THREE.Color(0x666666),
        colorEnd: new THREE.Color(0x222222),
        turbulence: 0.4,
        windForce: new THREE.Vector3(0.3, 1.2, 0.1)
    });

    // 创建额外的烟雾源
    const secondarySmoke = smokeManager.createSmokeEffect({
        maxParticles: 500,
        particleSize: 2.0,
        emissionRate: 50,  // 增加发射率
        lifetime: 4.0,
        position: new THREE.Vector3(-20, 0, 10),  // 调整位置
        spread: new THREE.Vector3(5, 2, 5),
        colorStart: new THREE.Color(0x777777),
        colorEnd: new THREE.Color(0x333333),
        turbulence: 0.5,
        windForce: new THREE.Vector3(0.5, 0.8, 0.2)
    });

    // 创建第三个烟雾源
    const thirdSmoke = smokeManager.createSmokeEffect({
        maxParticles: 300,
        particleSize: 1.5,
        emissionRate: 30,  // 增加发射率
        lifetime: 3.5,
        position: new THREE.Vector3(25, -3, -15),  // 调整位置
        spread: new THREE.Vector3(4, 2, 4),
        colorStart: new THREE.Color(0x888888),
        colorEnd: new THREE.Color(0x444444),
        turbulence: 0.3,
        windForce: new THREE.Vector3(-0.2, 1.0, 0.3)
    });

    // 初始化烟雾效果 - 立即应用初始发射率并发射粒子
    setTimeout(() => {
        if (typeof updateSmokeControls === 'function') {
            updateSmokeControls();
        }
        
        // 强制预填充一些粒子，让烟雾立即可见
        const preFillDelta = 0.1; // 较大的时间步长快速填充
        for (let i = 0; i < 30; i++) {
            mainSmoke.update(preFillDelta);
            secondarySmoke.update(preFillDelta);
            thirdSmoke.update(preFillDelta);
        }
    }, 100); // 确保所有对象已初始化
    // 添加烟雾控制面板
    const smokeControls = {
        mainEmissionRate: 100,      // 提高初始发射率，确保初始可见
        secondaryEmissionRate: 50,  // 提高初始发射率
        thirdEmissionRate: 30,      // 提高初始发射率
        windX: 0.3,
        windY: 1.2,
        windZ: 0.1,
        turbulence: 0.4
    };

    // 将控制器暴露给全局，便于调试
    window.smokeControls = smokeControls;
    window.smokeManager = smokeManager;
    
    // 定义烟雾控制更新函数（移到前面）
    const updateSmokeControls = () => {
        if (!mainSmoke || !secondarySmoke || !thirdSmoke) return;
        
        mainSmoke.setEmissionRate(smokeControls.mainEmissionRate);
        secondarySmoke.setEmissionRate(smokeControls.secondaryEmissionRate);
        thirdSmoke.setEmissionRate(smokeControls.thirdEmissionRate);
        
        const windForce = new THREE.Vector3(
            smokeControls.windX,
            smokeControls.windY,
            smokeControls.windZ
        );
        
        mainSmoke.options.windForce = windForce;
        secondarySmoke.options.windForce = windForce;
        thirdSmoke.options.windForce = windForce;
        
        mainSmoke.options.turbulence = smokeControls.turbulence;
        secondarySmoke.options.turbulence = smokeControls.turbulence;
        thirdSmoke.options.turbulence = smokeControls.turbulence;
    };
    
    // 将控制器暴露到全局
    window.updateSmokeControls = updateSmokeControls;

    // 添加控制台调试信息
    console.log('=== 深度冲突测试已启用 ===');
    console.log('可用控制：');
    console.log('window.depthTestControls - 深度测试控制对象');
    console.log('window.testGeometries - 测试几何体数组');
    console.log('window.smokeControls - 烟雾控制对象');
    console.log('示例：');
    console.log('window.depthTestControls.geometryOpacity = 0.3; // 调整几何体透明度');
    console.log('window.depthTestControls.wireframeMode = true; // 切换线框模式');
    console.log('window.depthTestControls.showGeometry = false; // 隐藏几何体');
    console.log('window.depthTestControls.showSmoke = false; // 隐藏烟雾');

    // 左键点击事件 - 在点击位置创建临时烟雾
    container.value.addEventListener('click', (event) => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const dom = container.value;
        const rect = dom.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        mouse.x = x;
        mouse.y = y;
        raycaster.setFromCamera(mouse, camera);
        
        // 创建一个平面用于射线检测
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        // 在点击位置创建临时烟雾
        const clickSmoke = smokeManager.createSmokeEffect({
            maxParticles: 200,
            particleSize: 2.5,
            emissionRate: 30,
            lifetime: 2.5,
            position: intersectPoint,
            spread: new THREE.Vector3(3, 1, 3),
            colorStart: new THREE.Color(0x999999),
            colorEnd: new THREE.Color(0x555555),
            turbulence: 0.6,
            windForce: new THREE.Vector3(0.2, 1.5, 0)
        });

        // 3秒后自动移除临时烟雾
        setTimeout(() => {
            smokeManager.removeEffect(clickSmoke);
        }, 3000);
    }, false);

    // resize自适应
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false)
    
    // 逐帧渲染
    let lastTime = 0;
    const render = (currentTime) => {
        const deltaTime = Math.max(0.001, Math.min((currentTime - lastTime) / 1000, 0.1));
        lastTime = currentTime;

        stats.update();
        controls.update();
        
        // 更新烟雾控制器
        if (typeof updateSmokeControls === 'function') {
            updateSmokeControls();
        }

        // 更新深度测试控制
        if (typeof updateDepthTestControls === 'function') {
            updateDepthTestControls();
        }

        // 更新相机位置到着色器
        if (mainSmoke && mainSmoke.material && mainSmoke.material.uniforms) {
            mainSmoke.material.uniforms.cameraPos.value.copy(camera.position);
        }
        if (secondarySmoke && secondarySmoke.material && secondarySmoke.material.uniforms) {
            secondarySmoke.material.uniforms.cameraPos.value.copy(camera.position);
        }
        if (thirdSmoke && thirdSmoke.material && thirdSmoke.material.uniforms) {
            thirdSmoke.material.uniforms.cameraPos.value.copy(camera.position);
        }

        // 更新所有粒子系统
        if (window.effects && window.effects.length > 0) {
            window.effects.forEach(effect => {
                if (effect.type === 'smoke' && effect.update) {
                    effect.update(deltaTime);
                }
            });
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
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