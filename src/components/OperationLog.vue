<template>
    <el-table :data="Record.operation_log" style="width: 100%" :highlight-current-row="true" empty-text="暂无数据"
        header-align="center" @row-click="pickLog" :border="true" max-height="400">
        <el-table-column prop="date" label="时间" width="90" align="center" />
        <el-table-column prop="name" label="操作名称" width="100" align="center" />
        <el-table-column prop="desc" label="描述" align="center" />
    </el-table>
    <!-- 性能变化 -->
    <div class="graph" ref="graph"></div>
</template>

<script setup>
import Record from "@/utils/record.js";
import { ref, onMounted, reactive, watch } from "vue";
import * as echarts from "echarts";

let graph = ref(null);
// 处理日期格式

let FPSdata = reactive([]) // FPS数据
let memoryList = reactive([]) // 内存数据
let timeList = reactive([]) // 时间
let detail = reactive({}) // 详情


// 选取日志
const pickLog = (e, i) => {
    // 找到该日志的index 
    let index = Record.operation_log.findIndex(item => item.timestamp === e.timestamp)
    let thisChange
    // 如果选取的是第一个日志
    if (index === 0) {
        console.log(Record.operation_log);

        // 如果仅仅只有一条日志信息
        if (Record.operation_log.length === 1) {
            thisChange = Record.performance_record
        } else {
            let nextTime = Record.operation_log[index + 1].timestamp // 获取index + 1的时间戳
            thisChange = Record.performance_record.filter(item => item.timestamp <= nextTime) // 获取0~index + 1时间段内的性能数据
        }
    } else if (index === Record.operation_log.length - 1) {
        // 如果选取的是最后一个日志
        let prevTime = Record.operation_log[index - 1].timestamp
        thisChange = Record.performance_record.filter(item => item.timestamp >= prevTime)
    } else {
        // 如果选取的是中间的日志
        let prevTime = Record.operation_log[index - 1].timestamp
        let nextTime = Record.operation_log[index + 1].timestamp
        thisChange = Record.performance_record.filter(item => item.timestamp >= prevTime && item.timestamp <= nextTime)
    }

    // 重置为空数组
    FPSdata.splice(0, FPSdata.length)
    memoryList.splice(0, memoryList.length)
    timeList.splice(0, timeList.length)
    // 重新赋值
    thisChange.forEach(item => {
        FPSdata.push(item.FPS)
        memoryList.push(item.MEM)
        timeList.push(new Date(item.timestamp).toLocaleTimeString())
    })
    // console.log(FPSdata, memoryList, timeList);
    // 获取当前选中的日志详情信息
    detail.value = e
}

watch(FPSdata, () => {
    // 重新渲染图表
    let myChart = echarts.init(graph.value);
    option && myChart.setOption(option);
})

// 配置项
let option = reactive({
    backgroundColor: "",
    title: {
        text: "性能监测",
        left: "left",
    },
    tooltip: {
        trigger: "axis",
        snap: true, // 是否显示提示框的辅助线
        formatter: `{a}time: {b}<br/> FPS: {c0}<br/> 内存消耗: {c1}MB`, // 提示框的内容
    },
    xAxis: [
        {
            type: "category", // 坐标轴类型
            boundaryGap: false,// 坐标轴两边留白策略
            data: timeList,
            axisLabel: {
                formatter: "{value}",
            },
            axisPointer: {
                snap: true,
            },
        },
    ],
    yAxis: [
        {
            type: "value",
        },
        {
            type: "value",
            show: true,
            splitLine: {
                show: true,
            },
            axisLabel: {
                formatter: "{value} MB",
            },
        }],
    dataZoom: [
        {
            type: "inside"
        },
    ],
    // 图例
    legend: {
        show: true,
        zlevel: 100,
        top: "top",
        data: [
            {
                name: "FPS",
            },
            {
                name: "内存消耗"
            }
        ],
    },
    series: [
        {
            name: "FPS",
            type: "line",
            data: FPSdata,
            smooth: true,
        },
        {
            name: "内存消耗",
            type: "line",
            data: memoryList,
            smooth: true,
        },
    ],
    //  工具栏
    toolbox: {
        show: true,
        zlevel: 100,
        right: "right",
        feature: {
            restore: {
                title: "还原",
            },
            saveAsImage: {
                title: "保存为图片",
            },
            maginType: {
                type: ["line", "bar", "stack", "tiled"],
            },
        },
        showTitle: true,
        iconStyle: {
            borderColor: "#000",
        },
    },
})

onMounted(() => {
    Record.operation_log.forEach(item => {
        item.date = new Date(item.timestamp).toLocaleString();
    });

    // 初始化图表
    let myChart = echarts.init(graph.value);
    option && myChart.setOption(option);

    // 监听窗口变化
    window.addEventListener("resize", () => {
        myChart.resize();
    });
});
</script>

<style lang="scss" scoped>
.graph {
    margin-top: 20px;
    width: 460px;
    height: 300px;
}

.detail {
    margin: 10px 0;

    .title {
        font-size: 16px;
        font-weight: bold;
    }

    .content {
        height: 90px;
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        overflow: auto;
    }
}
</style>