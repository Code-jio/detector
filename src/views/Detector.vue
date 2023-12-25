<template>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import Detector from "@/utils/Detector.js"

const container = ref(null)
const state = ref(null)

onMounted(() => {
    // 创建默认场景
    Detector.createDefaultScene({
        state: state.value,
        container: container.value,
        // resize: true,
    })
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