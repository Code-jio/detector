<template>
    <!-- 下拉列表 -->
    <div class="collapse-container">
        <el-collapse v-model="activeNames" @change="handleChange">
            <el-collapse-item v-for="(item, index) in componentsList" :key="index" :title="item.name" :name="item.name">
                <Component :is="item.component"></Component>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script setup>
import { ref, markRaw } from 'vue'
import EntityListVue from "./EntityList"
import ModelRender from "./ModelRender"
import ControlItem from "./ControlItem"

const activeNames = ref(['模型列表']) // 默认展开的面板

const componentsList = ref([
    {
        name: "实体渲染",
        component: markRaw(EntityListVue)
    },
    {
        name: "模型渲染",
        component: markRaw(ModelRender)
    },
    {
        name: "控制项",
        component: markRaw(ControlItem)
    },

])

const handleChange = (val) => {
    // console.log(val)
}
</script>

<style lang="scss" scoped>
/* 悬挂于右上角 */
.collapse-container {
    position: absolute;
    pointer-events: auto;
    top: 10px;
    right: 20px;
    width: 400px;
    background-color: #cccccc60;
    border-radius: 10px;
    transition: all .3s ease;
    padding: 10px;
    overflow: hidden;
    z-index: 10;
}
</style>