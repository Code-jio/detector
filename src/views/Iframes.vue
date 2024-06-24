<template>
    <div class='container' ref="container">
        <div ref="left" class="left">
            <!-- <div class="layout"></div> -->
            <iframe  src="https://www.esmap.cn" frameborder="0"></iframe>
        </div>
        <div ref="right" class="right">
            <!-- <div class="layout"></div> -->
            <iframe src="https://www.esmap.cn" frameborder="0"></iframe>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const container = ref(null)
const slider = ref(null)
const left= ref(null)
const right= ref(null)
let sliderPos = 0.5
let iframeDom 

const SliderChange = () => {
    const slider = document.createElement("div");
    slider.className = "slider";

    slider.style.position = "absolute";
    slider.style.width = "20px";
    slider.style.height = "100%";
    slider.style.borderRadius = "5px";
    slider.style.zIndex = "10";

    slider.style.top = "50%";
    slider.style.left = "50%";
    slider.style.transform = "translate(-50%, -50%)";

    slider.style.background = "rgba(255,255,255,0.5)";
    slider.style.cursor = "ew-resize";
    document.body.appendChild(slider);

    // 鼠标按下事件
    function onPointerDown(e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.isPrimary === false) return;
        // controls.enabled = false;
        iframeDom.forEach(element => {
            element.style.pointerEvents = 'none'
        });
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    }

    // 鼠标抬起事件
    function onPointerUp(e) {
        e.stopPropagation();
        e.preventDefault();
        // controls.enabled = true;
        iframeDom.forEach(element => {
            element.style.pointerEvents = 'auto'
        });
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
    }

    // 鼠标移动事件
    function onPointerMove(e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.isPrimary === false) return;
        sliderPos = Math.min(
            Math.max((e.clientX - 10) / window.innerWidth, 0.1),
            0.9
        );
        // console.log(sliderPos)
        slider.style.left = sliderPos * window.innerWidth + "px";


        // 设置左右两个iframe的宽度
        left.value.style.width = sliderPos * 100 + "%";
        right.value.style.width = (1 - sliderPos) * 100 + "%";
    }

    slider.style.touchAction = "none"; // disable touch scroll
    slider.addEventListener("pointerdown", onPointerDown);
}

onMounted(() => {
    iframeDom = container.value.querySelectorAll('iframe')
    iframeDom.forEach(element => {
       element.onload = function() {
           console.log('iframe loaded')
       }
       // 设置连接
       element.src = "http://192.168.1.11:8080/Detector"
    })
    SliderChange()
})

</script>


<style scoped lang='less'>
.container {
    width: 100%;
    height: 919px;

    // 内部元素横向排列
    display: flex;
    flex-direction: row;

    .left{
        width: 50%;
        height: 100%;
        position: relative;
        // background: greenyellow;
        border: 1px solid #000;
        // padding: 10px;
        .layout {
            height: 100%;
            width: 100%;  
            z-index: 10;
            overflow: hidden;
            background: rgba(0,0,0,0);
        }
        iframe {
            height: 100%;
            width: 100%;
            z-index: 5;
            overflow: hidden;
        }
    }
    .right{
        width: 50%;
        height: 100%;
        position: relative;
        // background: blueviolet;
        border: 1px solid #000;
        .layout {
            height: 100%;
            width: 100%;  
            z-index: 10;
            overflow: hidden;
            background: rgba(0,0,0,0);
        }
        iframe {
            height: 100%;
            width: 100%;  
            z-index: 5;
            overflow: hidden;
        }
    }
}
</style>