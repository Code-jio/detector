<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let stats, renderer, scene, camera;
const container = ref(null);
const state = ref(null);

// 创建相机
const createCamera = () => {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    return camera;
};

// 创建渲染器
const createRenderer = (dom) => {
    renderer = new THREE.WebGLRenderer({
        canvas: dom,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    return renderer;
};

// 创建场景
const createScene = () => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    return scene;
};

// 创建性能监视器
const createStats = (dom) => {
    stats = new Stats();
    stats.showPanel(0);
    dom.appendChild(stats.dom);
};

// 创建简单的粒子系统
const createParticles = () => {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 50;
        positions[i3 + 1] = Math.random() * 30;
        positions[i3 + 2] = (Math.random() - 0.5) * 50;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0x00ff00,
        size: 2,
        transparent: true,
        opacity: 0.8
    });
    
    const particles = new THREE.Points(geometry, material);
    
    // 添加动画方法
    particles.update = function() {
        const positions = this.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3 + 1] += 0.1;
            if (positions[i3 + 1] > 30) {
                positions[i3 + 1] = 0;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    };
    
    return particles;
};

onMounted(() => {
    createStats(state.value);
    createScene();
    createCamera();
    createRenderer(container.value);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    
    // 添加坐标轴和网格
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);
    
    const gridHelper = new THREE.GridHelper(100, 10);
    scene.add(gridHelper);
    
    // 添加粒子系统
    const particles = createParticles();
    scene.add(particles);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);
    
    // 渲染循环
    const animate = () => {
        stats.update();
        controls.update();
        
        if (particles && particles.update) {
            particles.update();
        }
        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    
    animate();
    
    // 窗口大小调整
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
</script>

<style scoped>
.container {
    width: 100%;
    height: 100vh;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
}

.state {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 999;
}
</style>