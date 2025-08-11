<template>
    <div class="smoke-controls">
        <div class="control-panel">
            <h3>烟雾效果控制面板</h3>
            
            <div class="control-group">
                <label>主烟雾发射率</label>
                <input type="range" v-model="controls.mainEmissionRate" min="0" max="100" step="1" />
                <span>{{ controls.mainEmissionRate }}</span>
            </div>

            <div class="control-group">
                <label>次烟雾发射率</label>
                <input type="range" v-model="controls.secondaryEmissionRate" min="0" max="100" step="1" />
                <span>{{ controls.secondaryEmissionRate }}</span>
            </div>

            <div class="control-group">
                <label>第三烟雾发射率</label>
                <input type="range" v-model="controls.thirdEmissionRate" min="0" max="50" step="1" />
                <span>{{ controls.thirdEmissionRate }}</span>
            </div>

            <div class="control-group">
                <label>风力 X</label>
                <input type="range" v-model="controls.windX" min="-2" max="2" step="0.1" />
                <span>{{ controls.windX.toFixed(1) }}</span>
            </div>

            <div class="control-group">
                <label>风力 Y</label>
                <input type="range" v-model="controls.windY" min="-2" max="4" step="0.1" />
                <span>{{ controls.windY.toFixed(1) }}</span>
            </div>

            <div class="control-group">
                <label>风力 Z</label>
                <input type="range" v-model="controls.windZ" min="-2" max="2" step="0.1" />
                <span>{{ controls.windZ.toFixed(1) }}</span>
            </div>

            <div class="control-group">
                <label>湍流强度</label>
                <input type="range" v-model="controls.turbulence" min="0" max="2" step="0.1" />
                <span>{{ controls.turbulence.toFixed(1) }}</span>
            </div>

            <div class="control-group">
                <label>粒子大小</label>
                <input type="range" v-model="controls.particleSize" min="0.5" max="5" step="0.1" />
                <span>{{ controls.particleSize.toFixed(1) }}</span>
            </div>

            <div class="control-group">
                <label>粒子生命周期</label>
                <input type="range" v-model="controls.lifetime" min="1" max="10" step="0.5" />
                <span>{{ controls.lifetime.toFixed(1) }}s</span>
            </div>

            <div class="button-group">
                <button @click="resetToDefaults">重置默认</button>
                <button @click="createBurst">爆发效果</button>
                <button @click="togglePause">{{ isPaused ? '继续' : '暂停' }}</button>
            </div>

            <div class="info-panel">
                <p>点击场景任意位置创建临时烟雾</p>
                <p>使用鼠标拖拽旋转视角</p>
                <p>滚轮缩放场景</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import * as THREE from "three"
const controls = reactive({
    mainEmissionRate: 100,
    secondaryEmissionRate: 50,
    thirdEmissionRate: 30,
    windX: 0.3,
    windY: 1.2,
    windZ: 0.1,
    turbulence: 0.4,
    particleSize: 3.0,
    lifetime: 6.0
})
console.log(controls)
const isPaused = ref(false)

const defaults = {
    mainEmissionRate: 100,
    secondaryEmissionRate: 50,
    thirdEmissionRate: 30,
    windX: 0.3,
    windY: 1.2,
    windZ: 0.1,
    turbulence: 0.4,
    particleSize: 3.0,
    lifetime: 6.0
}

// 监听控制变化
watch(controls, (newControls) => {
    if (window.smokeControls) {
        Object.assign(window.smokeControls, newControls)
    }
}, { deep: true })

const resetToDefaults = () => {
    Object.assign(controls, defaults)
}

const createBurst = () => {
    if (window.smokeManager) {
        // 在随机位置创建爆发烟雾
        const positions = [
            { x: 0, y: 0, z: 0 },
            { x: -20, y: -5, z: 10 },
            { x: 25, y: -8, z: -15 }
        ]
        
        positions.forEach(pos => {
            const burst = window.smokeManager.createSmokeEffect({
                maxParticles: 150,
                particleSize: 4.0,
                emissionRate: 100,
                lifetime: 3.0,
                position: new THREE.Vector3(pos.x, pos.y, pos.z),
                spread: new THREE.Vector3(15, 8, 15),
                colorStart: new THREE.Color(0xaaaaaa),
                colorEnd: new THREE.Color(0x444444),
                turbulence: 0.8,
                windForce: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    2 + Math.random(),
                    (Math.random() - 0.5) * 2
                )
            })

            // 2秒后移除爆发效果
            setTimeout(() => {
                window.smokeManager.removeEffect(burst)
            }, 2000)
        })
    }
}

const togglePause = () => {
    isPaused.value = !isPaused.value
    // 暂停/继续所有烟雾效果
    if (window.smokeManager) {
        const effects = window.smokeManager.effects
        effects.forEach(({ effect }) => {
            if (isPaused.value) {
                effect.options.emissionRate = 0
            } else {
                // 恢复原始值
                const originalRates = {
                    0: controls.mainEmissionRate,
                    1: controls.secondaryEmissionRate,
                    2: controls.thirdEmissionRate
                }
                effect.options.emissionRate = originalRates[effects.indexOf({ effect })] || 100
            }
        })
    }
}

onMounted(() => {
    // 同步初始值
    if (window.smokeControls) {
        Object.assign(controls, window.smokeControls)
    }
})
</script>

<style scoped lang="scss">
.smoke-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    font-family: Arial, sans-serif;
}

.control-panel {
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    padding: 20px;
    color: white;
    min-width: 250px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-panel h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    text-align: center;
    color: #4CAF50;
}

.control-group {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.control-group label {
    font-size: 12px;
    min-width: 80px;
    color: #ccc;
}

.control-group input[type="range"] {
    flex: 1;
    height: 4px;
    background: #333;
    outline: none;
    border-radius: 2px;
}

.control-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #4CAF50;
    border-radius: 50%;
    cursor: pointer;
}

.control-group span {
    font-size: 11px;
    min-width: 30px;
    text-align: right;
    color: #4CAF50;
}

.button-group {
    display: flex;
    gap: 5px;
    margin: 15px 0;
}

.button-group button {
    flex: 1;
    padding: 8px 4px;
    font-size: 11px;
    background: #333;
    color: white;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.button-group button:hover {
    background: #4CAF50;
    border-color: #4CAF50;
}

.info-panel {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.info-panel p {
    margin: 5px 0;
    font-size: 11px;
    color: #aaa;
    line-height: 1.4;
}

@media (max-width: 768px) {
    .smoke-controls {
        top: 10px;
        right: 10px;
    }
    
    .control-panel {
        padding: 15px;
        min-width: 200px;
    }
}
</style>