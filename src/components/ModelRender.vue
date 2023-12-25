<template>
    <!-- 模型列表 名称-数量-是否渲染 -->
    <el-scrollbar class="list" height="300px">
        <table>
            <!-- 固定表头 -->
            <thead>
                <tr>
                    <th class="name">名称</th>
                    <th class="count">数量</th>
                    <th class="cartoon">动画</th>
                    <th class="share">材质共享</th>
                    <th class="render">渲染</th>
                </tr>
            </thead>

            <tbody>
                <tr v-for="(item, index) in model_list" :key="index">
                    <td class="name">{{ item.name }}</td>
                    <td class="count">
                        <input type="number" class="input" v-model="item.count" min="0" />
                    </td>
                    <!-- 下拉框 选择动画 -->
                    <td class="cartoon">
                        <el-select v-model="item.currentCartoon" placeholder="请选择动画">
                            <el-option v-for="item in item.animationList" :key="item" :label="item" :value="item" />
                        </el-select>
                    </td>
                    <td class="share">
                        <el-checkbox v-model="item.isShare" @click="toggle" />
                    </td>
                    <td class="render">
                        <el-checkbox v-model="item.visible" @click="renderModel(item)" />
                    </td>
                </tr>
            </tbody>
        </table>
    </el-scrollbar>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Bus from "../utils/EventBus.js" // 事件总线
import { modelList } from "@/utils/data.js" // 模型列表
import Detector from "@/utils/Detector.js";
import Record from "@/utils/record.js";

const model_list = ref(); // 模型列表

// 渲染模型
const renderModel = (item) => {
    item.visible = !item.visible;
    if (item.visible) {
        for (let i = 0; i < item.count; i++) {
            Detector.addGLTFModel(item)
        }

        // 记录操作日志  
        Record.recordOperationLog({
            name: "添加模型",
            type: "click",
            timestamp: new Date().getTime(),
            target: item.name,
            item,
            real_time_perfermance: Record.real_time_perfermance,
            desc: `添加了${item.count}个${item.name},施加${item.currentCartoon ? item.currentCartoon : "无动画"}`
        })
        item.visible = false
    } else {
        // Bus.emit("removeModel", item);
        // 一次性删除干净
        Detector.removeEntityByName(item.name);
        // 记录操作记录
        Record.recordOperationLog({
            name: "移除实体",
            type: "switch",
            timestamp: new Date().getTime(),
            target: item.name,
            item,
            real_time_perfermance: Record.real_time_perfermance,
            desc: `移除了${item.count}个${item.name}`
        })

        // 数据初始化
        item.count = 0;
        item.currentCartoon = ""
        item.isShare = false;
        item.visible = true;
    }
};

// 切换是否共享材质
const toggle = (item) => {
    item.isShare = item.isShare ? false : true;
};

Bus.on("dataInit", () => {
    for (let i = 0; i < model_list.value.length; i++) {
        // 将count置0 清空场景
        model_list.value[i].count = 0;
        model_list.value[i].visible = false;
        model_list.value[i].currentCartoon = ""
    }
});

onMounted(() => {
    model_list.value = modelList; // 模型列表
});
</script>

<style lang="scss" scoped>
table {
    width: 100%;
    height: 200px;
    border-collapse: collapse;
    border-spacing: 0;
    font-size: 14px;
    text-align: center;
    margin: 10px 0;
    overflow: scroll;

    th {
        height: 40px;
        line-height: 40px;
        text-align: center;

    }

    td {
        height: 40px;
        line-height: 40px;
        text-align: center;

    }

    tr {
        border-bottom: 1px solid #ccc;

        &:hover {
            background-color: #f5f5f5;
        }
    }

    .name {
        width: 20%;
    }

    .count {
        width: 16%;

        .input {
            width: 100%;
            height: 100%;
            border: none;
            outline: none;
            border-radius: 5px;
            // box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            color: #000;
            padding: 5px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
        }
    }

    .cartoon {
        width: 34%;
    }

    .share {
        width: 15%;
    }


    .render {
        width: 15%;
    }
}
</style>