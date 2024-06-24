<template>
    <div class='overlay' ref="overlay" @click="handleClick">
        父标签
        <div class="box">
            子标签
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
const overlay = ref(null)
import Lable2D from '../utils/Lable';

const handleClick = () => {
    console.log('点击了', overlay.value)
}

onMounted(() => {
    let lable2D = new Lable2D(overlay.value)
})


</script>


<style scoped lang='scss'>
.overlay {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 999;
    width: 100px;
    height: 100px;
    pointer-events: auto;
    background-color: rgba(0, 0, 0, 0.5);
    // transform-style: -100% -100%;
    transform-origin:center bottom;
    overflow: auto;
    .box{
        color: aqua;
        background-color: red;
    }
}
</style>