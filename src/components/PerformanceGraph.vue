<template>
  <div class="graph" ref="graph"></div>
</template>

<script setup>
// 引入 ECharts 主模块
import * as echarts from "echarts";
import { ref, onMounted, onUnmounted } from "vue";
import { performance_record, real_time_perfermance } from "@/utils/record.js";

const graph = ref(null);

let FPSdata = [];

let count = 0; // 计算 fps 的次数
let prevTimestamp; // 上一次计算 fps 的时间戳

function loop(timestamp) {
  if (prevTimestamp) {
    count++;
    // 间隔超过 1s，将之前计算的 count 输出
    if (timestamp - prevTimestamp >= 1000) {
      // showFPS(count);
      FPSdata.push(count); // 将数据添加到数组中
      let MEM = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
      // 记录性能变化
      performance_record.push({
        timestamp: new Date().getTime(),
        FPS: count,
        MEM,
      });
      // 记录实时性能
      real_time_perfermance.FPS = count;
      real_time_perfermance.MEM = MEM;

      if (FPSdata.length > 60) {
        FPSdata.shift(); // 删除数组中的第一个元素
      }
      prevTimestamp = timestamp;
      count = 0;
    }
  } else {
    prevTimestamp = timestamp;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

let memoryList = [];

// 获取实时内存
// 每秒输出当前页面占用的内存大小
let timer;
timer = setInterval(() => {
  const memory = performance.memory;
  let memoryData = memory.usedJSHeapSize / 1024 / 1024;
  memoryList.push(memoryData.toFixed(2));
  if (memoryList.length > 60) {
    memoryList.shift();
  }
}, 1000);

let option = {
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
};

onMounted(() => {
  const myChart = echarts.init(graph.value);
  setInterval(() => {
    option &&
      myChart.setOption({
        xAxis: [
          {
            type: "category", // 坐标轴类型
            boundaryGap: true,// 坐标轴两边留白策略
          },
        ],
        legend: {
          show: true,
          zlevel: 100,
          bottom: "bottom",
          data: [
            {
              name: "FPS"
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
          },
          {
            name: "内存消耗",
            type: "line",
            data: memoryList,
          },
        ],
      });
  }, 1000);
  option && myChart.setOption(option);

  // 监听窗口变化
  window.addEventListener("resize", () => {
    myChart.resize();
  });
});
// 卸载
onUnmounted(() => {
  window.removeEventListener("resize", () => { });
  clearInterval(timer);
});
</script>

<style lang="scss" scoped>
.graph {
  width: 600px;
  height: 400px;
  padding: 10px;

  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 1;

  background-color: #ffffff50;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}
</style>