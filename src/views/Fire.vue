<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
    
    <div class="controls">
        <h3>火焰控制面板</h3>
        
        <div class="control-group">
            <label>粒子数量: <span id="particleCountValue">800</span></label>
            <input type="range" id="particleCount" min="100" max="2000" value="800" step="50">
        </div>
        
        <div class="control-group">
            <label>火焰强度: <span id="intensityValue">2.0</span></label>
            <input type="range" id="intensity" min="0.5" max="5.0" value="2.0" step="0.1">
        </div>
        
        <div class="control-group">
            <label>上升速度: <span id="speedValue">2.0</span></label>
            <input type="range" id="speed" min="0.5" max="5.0" value="2.0" step="0.1">
        </div>
        
        <div class="control-group">
            <label>湍流强度: <span id="turbulenceValue">1.5</span></label>
            <input type="range" id="turbulence" min="0.0" max="3.0" value="1.5" step="0.1">
        </div>
        
        <div class="control-group">
            <label>火焰大小: <span id="sizeValue">2.5</span></label>
            <input type="range" id="fireSize" min="0.5" max="5.0" value="2.5" step="0.1">
        </div>
        
        <button id="resetFire">重置火焰</button>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let stats, renderer, scene, camera;
const container = ref(null);
const state = ref(null);
let updateFire

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
    // scene.fog = new THREE.Fog(0x050510, 50, 200); // 添加雾效果
    return scene;
};

// 创建性能监视器
const createStats = (dom) => {
    stats = new Stats();
    stats.showPanel(0);
    dom.appendChild(stats.dom);
};

let fireConfig = {
    particleCount: 800,
    maxLifetime: 3.0,
    baseSize: 0.5,
    maxSize: 2.5,
    baseSpeed: 2.0,
    turbulence: 1.5,
    gravity: -0.5,
    colorStart: new THREE.Color(0xFF4500),
    colorMid: new THREE.Color(0xFF8C00),
    colorEnd: new THREE.Color(0x8B0000),
    emissionRate: 100,
    emissionRadius: 2.0
};

let currentFireSystem = null;
let fireLight = null;

const createFire = (config = fireConfig) => {
    // 如果已存在火焰系统，先移除
    if (currentFireSystem) {
        scene.remove(currentFireSystem);
        if (fireLight) scene.remove(fireLight);
    }

    // 创建粒子几何体
    const particleGeometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(config.particleCount * 3);
    const colors = new Float32Array(config.particleCount * 3);
    const sizes = new Float32Array(config.particleCount);
    const lifetimes = new Float32Array(config.particleCount);
    const startTimes = new Float32Array(config.particleCount);

    for (let i = 0; i < config.particleCount; i++) {
        const i3 = i * 3;
        
        positions[i3] = (Math.random() - 0.5) * config.emissionRadius;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = (Math.random() - 0.5) * config.emissionRadius;
        
        colors[i3] = config.colorStart.r;
        colors[i3 + 1] = config.colorStart.g;
        colors[i3 + 2] = config.colorStart.b;
        
        sizes[i] = config.baseSize + Math.random() * 0.5;
        lifetimes[i] = config.maxLifetime * (0.5 + Math.random() * 0.5);
        startTimes[i] = Math.random() * config.maxLifetime;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const vertexShader = `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        
        uniform float time;
        uniform float maxLifetime;
        uniform float baseSpeed;
        uniform float turbulence;
        uniform float fireSize;
        
        void main() {
            vColor = color;
            
            float life = mod(time, maxLifetime);
            float age = life / maxLifetime;
            
            vAlpha = 1.0 - age;
            
            vec3 pos = position;
            pos.y += age * baseSpeed * 5.0;
            
            float noise = sin(time * 2.0 + position.x + position.z) * turbulence;
            pos.x += noise;
            pos.z += cos(time * 1.5 + position.x) * turbulence;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 - age * 0.5) * fireSize;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        precision mediump float;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            if (dist > 0.5) {
                discard;
            }
            
            float alpha = vAlpha * (1.0 - dist * 2.0);
            if (alpha < 0.01) {
                discard;
            }
            
            vec3 fireColor = mix(vColor, vec3(1.0, 0.3, 0.0), dist);
            gl_FragColor = vec4(fireColor, alpha);
        }
    `;

    const fireMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            maxLifetime: { value: config.maxLifetime },
            baseSpeed: { value: config.baseSpeed },
            turbulence: { value: config.turbulence },
            fireSize: { value: config.maxSize }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
    });

    const fireParticles = new THREE.Points(particleGeometry, fireMaterial);
    scene.add(fireParticles);

    fireLight = new THREE.PointLight(0xff6600, 2, 20);
    fireLight.position.set(0, 5, 0);
    scene.add(fireLight);

    currentFireSystem = fireParticles;

    const updateFire = (time) => {
        fireMaterial.uniforms.time.value = time * 0.001;
        
        fireLight.intensity = 1.5 + Math.sin(time * 0.01) * 0.5;
        fireLight.position.y = 3 + Math.sin(time * 0.005) * 1;
        
        const colors = particleGeometry.attributes.color.array;
        const positions = particleGeometry.attributes.position.array;
        
        for (let i = 0; i < config.particleCount; i++) {
            const i3 = i * 3;
            const currentTime = time * 0.001;
            const lifeTime = lifetimes[i];
            const startTime = startTimes[i];
            const age = ((currentTime - startTime) % lifeTime) / lifeTime;
            
            let color;
            if (age < 0.3) {
                color = config.colorStart;
            } else if (age < 0.7) {
                color = config.colorMid.clone().lerp(config.colorStart, (age - 0.3) / 0.4);
            } else {
                color = config.colorEnd.clone().lerp(config.colorMid, (age - 0.7) / 0.3);
            }
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            if (age < 0.1) {
                positions[i3] = (Math.random() - 0.5) * config.emissionRadius;
                positions[i3 + 1] = 0;
                positions[i3 + 2] = (Math.random() - 0.5) * config.emissionRadius;
            }
        }
        
        particleGeometry.attributes.color.needsUpdate = true;
        particleGeometry.attributes.position.needsUpdate = true;
    };

    return updateFire;
};

// 控制面板事件监听
const setupControls = () => {
    const particleCountSlider = document.getElementById('particleCount');
    const intensitySlider = document.getElementById('intensity');
    const speedSlider = document.getElementById('speed');
    const turbulenceSlider = document.getElementById('turbulence');
    const fireSizeSlider = document.getElementById('fireSize');
    const resetButton = document.getElementById('resetFire');

    const updateDisplay = (id, value) => {
        document.getElementById(id + 'Value').textContent = value;
    };

    particleCountSlider?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        updateDisplay('particleCount', value);
        fireConfig.particleCount = value;
        updateFire = createFire(fireConfig);
    });

    intensitySlider?.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        updateDisplay('intensity', value);
        if (fireLight) {
            fireLight.intensity = value;
        }
    });

    speedSlider?.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        updateDisplay('speed', value);
        fireConfig.baseSpeed = value;
        updateFire = createFire(fireConfig);
    });

    turbulenceSlider?.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        updateDisplay('turbulence', value);
        fireConfig.turbulence = value;
        updateFire = createFire(fireConfig);
    });

    fireSizeSlider?.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        updateDisplay('fireSize', value);
        fireConfig.maxSize = value;
        updateFire = createFire(fireConfig);
    });

    resetButton?.addEventListener('click', () => {
        fireConfig = {
            particleCount: 800,
            maxLifetime: 3.0,
            baseSize: 0.5,
            maxSize: 2.5,
            baseSpeed: 2.0,
            turbulence: 1.5,
            gravity: -0.5,
            colorStart: new THREE.Color(0xFF4500),
            colorMid: new THREE.Color(0xFF8C00),
            colorEnd: new THREE.Color(0x8B0000),
            emissionRate: 100,
            emissionRadius: 2.0
        };
        
        // 重置滑块值
        if (particleCountSlider) particleCountSlider.value = 800;
        if (intensitySlider) intensitySlider.value = 2.0;
        if (speedSlider) speedSlider.value = 2.0;
        if (turbulenceSlider) turbulenceSlider.value = 1.5;
        if (fireSizeSlider) fireSizeSlider.value = 2.5;
        
        updateDisplay('particleCount', 800);
        updateDisplay('intensity', 2.0);
        updateDisplay('speed', 2.0);
        updateDisplay('turbulence', 1.5);
        updateDisplay('fireSize', 2.5);
        
        updateFire = createFire(fireConfig);
    });
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
    
    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // 创建火焰特效
    updateFire = createFire();
    
    // 设置控制面板
    setTimeout(setupControls, 100);
    
    const animate = () => {
        stats.update();
        controls.update();
        
        // 更新火焰特效
        updateFire(Date.now());
        
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

.controls {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 20px;
    border-radius: 10px;
    z-index: 1000;
    min-width: 250px;
    backdrop-filter: blur(10px);
}

.controls h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #ff6600;
    text-align: center;
}

.control-group {
    margin-bottom: 15px;
}

.control-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
}

.control-group input[type="range"] {
    width: 100%;
    height: 5px;
    background: #333;
    outline: none;
    border-radius: 5px;
}

.control-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 15px;
    height: 15px;
    background: #ff6600;
    cursor: pointer;
    border-radius: 50%;
}

.controls button {
    width: 100%;
    padding: 10px;
    background: #ff6600;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.3s;
}

.controls button:hover {
    background: #ff8833;
}
</style>