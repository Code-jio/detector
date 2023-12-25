<template>
    <!-- 切换 -->
    <div class="slider-demo-block">
        <span class="demonstration">控制渲染:</span>
        <el-select v-model="value" placeholder="Select" @change="changeControl">
            <el-option v-for="item in control" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
    </div>

    <div v-if="value === '视点控制器'">
        <div class="slider-demo-block">
            <span class="demonstration">视点半径：</span>
            <el-input-number v-model="radius" :step="10" :min="1" :max="10000" @change="changeRadius" />
        </div>
    </div>

    <div v-if="value === '视锥体控制器'">
        <div class="slider-demo-block">
            <span class="demonstration">裁切面范围：</span>
            <el-slider v-model="Frustum.ClippingPlane" range :min="1" :max="10000" @change="updateFrustum" />
        </div>
        <div class="slider-demo-block">
            <span class="demonstration">视角：</span>
            <el-input-number v-model="Frustum.fov" :min="1" :max="180" @change="updateFrustum" />
        </div>
        <div class="slider-demo-block">
            <span class="demonstration">宽度：</span>
            <el-input-number v-model="Frustum.width" :min="1" :max="1920" @change="updateFrustum" />
        </div>
        <div class="slider-demo-block">
            <span class="demonstration">高度：</span>
            <el-input-number v-model="Frustum.height" :min="1" :max="1080" @change="updateFrustum" />
        </div>
    </div>

    <div class="slider-demo-block">
        <span class="demonstration">操作日志:</span>
        <el-button type="primary" @click="openLog">查看操作日志</el-button>
    </div>

    <el-drawer v-model="drawer" title="操作日志" :with-header="true" :size=500>
        <OperationLog></OperationLog>
    </el-drawer>
</template>

<script setup>
import { ref, onMounted, reactive } from "vue";
import Bus from "../utils/EventBus";
import OperationLog from "./OperationLog";
import Detector from "@/utils/Detector.js";
import Record from "@/utils/record.js";


let control = reactive(
    [
        {
            value: "视点控制器",
            label: "视点控制器",
            disabled: false,
        },
        {
            value: "视锥体控制器",
            label: "视锥体控制器",
            disabled: false,
        },
        {
            value: "正常渲染",
            label: "正常渲染",
            disabled: false,
        }
    ]
); // 渲染控制器
let value = ref(); // 当前渲染控制器
let radius = ref(10); // 视点半径
let drawer = ref(false)
let Frustum = reactive({
    ClippingPlane: [1, 1000],
    fov: 45,
    width: 16,
    height: 9,
}); // 裁切面范围


// 切换渲染控制：视点控制器/视锥体控制器
const changeControl = () => {
    Bus.emit("changeControl", {
        value: value.value,
        radius: radius.value,
        Frustum,
    });
};

// 视点半径
const changeRadius = () => {
    // Bus.emit("changeRadius", radius.value);
    Detector.updateViewCircle(radius.value); // 创建视点球

    // 记录操作记录
    Record.recordOperationLog({
        name: "更新视点球",
        type: "click",
        timestamp: new Date().getTime(),
        target: "视点控制器",
        params: radius.value,
        real_time_perfermance: Record.real_time_perfermance,
        desc: `改变视点球半径`
    })
};

const updateFrustum = () => {
    // 更新视锥体
    Detector.updateFrustum(Frustum)

    // 记录操作记录
    Record.recordOperationLog({
        name: "更新视锥体",
        type: "click",
        timestamp: new Date().getTime(),
        target: "视锥体控制器",
        params: Frustum,
        real_time_perfermance: Record.real_time_perfermance,
        desc: "更新视锥体"
    })
};

const openLog = () => {
    drawer.value = !drawer.value
}

onMounted(() => {
});
</script>

<style lang="scss" scoped>
.select-box {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    color: #000;
    padding: 5px;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    margin: 10px;

    option {
        text-align: center;
    }
}

.btn {
    margin: 10px;
}

.renderNum {
    width: 220px;
}

.slider-demo-block {
    display: flex;
    align-items: center;
}

.slider-demo-block .el-slider {
    margin-top: 0;
    margin-left: 12px;
}

.slider-demo-block .demonstration {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 44px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0;
}

.slider-demo-block .demonstration+.el-slider {
    flex: 0 0 70%;
}
</style>