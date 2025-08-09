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
    scene.background = new THREE.Color(0x050510); // 深蓝色背景，突出烟雾效果
    scene.fog = new THREE.Fog(0x050510, 50, 200); // 添加雾效果
    return scene;
};

// 创建性能监视器
const createStats = (dom) => {
    stats = new Stats();
    stats.showPanel(0);
    dom.appendChild(stats.dom);
};

// 创建逼真的烟雾粒子系统
const createParticles = () => {
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    
    // 为每个粒子创建属性
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);
    
    // 初始化粒子
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 初始位置 - 从底部中心区域生成
        positions[i3] = (Math.random() - 0.5) * 10;
        positions[i3 + 1] = Math.random() * 5;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;
        
        // 初始速度 - 向上为主，带有随机扩散
        velocities[i3] = (Math.random() - 0.5) * 0.5;
        velocities[i3 + 1] = Math.random() * 0.8 + 0.3; // 主要向上
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
        
        // 粒子大小 - 更大更蓬松的烟雾
        sizes[i] = Math.random() * 12 + 8;
        
        // 透明度 - 更淡的烟雾
            opacities[i] = Math.random() * 0.3 + 0.1;
        
        // 生命周期
        lifetimes[i] = Math.random() * 100 + 50;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    
    // 使用着色器材质创建更真实的烟雾效果
    const vertexShader = `
        attribute float size;
        attribute float opacity;
        attribute vec3 velocity;
        
        varying float vOpacity;
        varying vec3 vPosition;
        
        void main() {
            vOpacity = opacity;
            vPosition = position;
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    
    const fragmentShader = `
        varying float vOpacity;
        varying vec3 vPosition;
        
        void main() {
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - (dist * 2.0);
            alpha = pow(alpha, 0.4);  // 更柔和的边缘
            alpha *= vOpacity;
            
            // 烟雾颜色 - 从浅灰色到深灰色的渐变
            vec3 smokeColor = mix(vec3(0.3, 0.3, 0.3), vec3(0.05, 0.05, 0.05), vPosition.y / 50.0);
            
            gl_FragColor = vec4(smokeColor * 0.15, alpha * 0.3);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particles = new THREE.Points(geometry, material);
    
    // 添加物理动画 - 持续生成烟雾
    particles.update = function(deltaTime) {
        const positions = this.geometry.attributes.position.array;
        const velocities = this.geometry.attributes.velocity.array;
        const opacities = this.geometry.attributes.opacity.array;
        const lifetimes = this.geometry.attributes.lifetime?.array || new Float32Array(positions.length / 3);
        
        const time = Date.now() * 0.001;
        this.material.uniforms.time.value = time;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // 更新位置
            positions[i3] += velocities[i3] * deltaTime * 10;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime * 10;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime * 10;
            
            // 添加湍流效果
            const turbulence = Math.sin(time + i * 0.1) * 0.1;
            velocities[i3] += turbulence * deltaTime;
            velocities[i3 + 2] += turbulence * deltaTime;
            
            // 上升速度逐渐减小，模拟空气阻力
            velocities[i3 + 1] *= 0.995;
            
            // 水平扩散
            velocities[i3] *= 1;
            velocities[i3 + 2] *= 1;
            
            // 生命周期管理
            lifetimes[i] -= deltaTime * 10;
            opacities[i] = Math.max(0, lifetimes[i] / 100);
            
            // 持续重置粒子，形成连续烟雾
            if (lifetimes[i] <= 0 || positions[i3 + 1] > 50) {
                // 从底部中心生成新烟雾
                positions[i3] = (Math.random() - 0.5) * 2; // 更窄的生成区域
                positions[i3 + 1] = Math.random() * 0.5;   // 靠近底部
                positions[i3 + 2] = (Math.random() - 0.5) * 2;
                
                velocities[i3] = (Math.random() - 0.5) * 0.3; // 更集中的上升
                velocities[i3 + 1] = Math.random() * 0.8; // 更稳定的上升速度
                velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
                
                lifetimes[i] = Math.random() * 100 ; // 稍短的生命周期
                opacities[i] = Math.random() * 0.2 + 0.05; // 更淡的烟雾
            }
        }
        
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.opacity.needsUpdate = true;
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
    let lastTime = 0;
    const animate = (currentTime) => {
        const deltaTime = (currentTime - lastTime) * 0.001; // 转换为秒
        lastTime = currentTime;
        
        stats.update();
        controls.update();
        
        if (particles && particles.update) {
            particles.update(deltaTime);
        }
        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    
    animate(0);
    
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