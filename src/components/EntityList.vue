<template>
    <div class="model-list">
        <!-- 实体表单 -->
        <el-form :inline="true" v-model="params" class="demo-form-inline" label-position="left" label-width="80px">

            <div class="slider-demo-block">
                <span class="demonstration">个数:</span>
                <el-input v-model="params.count" placeholder="个数" clearable type="number" :step="100" :min="0" />
            </div>

            <div class="slider-demo-block">
                <span class="demonstration">实体列表:</span>
                <el-select v-model="currentValue" placeholder="实体列表" value-key="name">
                    <el-option v-for="item in model_list" :key="item" :label="item.name" :value="item" />
                </el-select>
            </div>

            <div class="slider-demo-block">
                <span class="demonstration">间距:</span>
                <el-input v-model="params.gutter" placeholder="个数" clearable type="number" :step="10" :min="0" />
            </div>

            <div class="slider-demo-block" v-if="currentValue.type !== 'Sprite'">
                <span class="demonstration">材质共享:</span>
                <el-switch v-model="params.shareMaterial" />
            </div>
            <div class="slider-demo-block" v-if="currentValue.type !== 'Sprite'">
                <span class="demonstration">合并渲染:</span>
                <!-- <el-switch v-model="params.shareMaterial" /> -->
                <el-switch v-model="params.merge" class="mb-2" />
            </div>

            <!-- 挤压几何体设置 -->
            <div class="slider" v-if="currentValue.type === 'ExtrudeGeometry'">

                <div class="slider-demo-block">
                    <span class="demonstration">边数:</span>
                    <el-slider v-model="extrudeSettings.edgeNum" :min="3" :max="10" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">深度:</span>
                    <el-slider v-model="extrudeSettings.depth" :min="1" :max="10" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">斜角段数:</span>
                    <el-slider v-model="extrudeSettings.bevelSegments" :min="1" :max="10" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">深度段数:</span>
                    <el-slider v-model="extrudeSettings.steps" :min="1" :max="20" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">斜角大小:</span>
                    <el-slider v-model="extrudeSettings.bevelSize" :min="1" :max="20" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">斜角厚度:</span>
                    <el-slider v-model="extrudeSettings.bevelThickness" :min="1" :max="20" />
                </div>

            </div>

            <!-- 管道几何体设置 -->
            <div class="slider" v-if="currentValue.type === 'TubeGeometry'">

                <div class="slider-demo-block">
                    <span class="demonstration">半径:</span>
                    <el-slider v-model="tubeSettings.radius" :min="1" :max="10" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">管道拟合点数:</span>
                    <el-slider v-model="tubeSettings.points" :min="3" :max="10" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">管道段数:</span>
                    <el-slider v-model="tubeSettings.radialSegments" :min="5" :max="20" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">是否首尾相连:</span>
                    <el-switch v-model="params.closed" class="mb-2" active-text="是" inactive-text="否" />
                </div>

            </div>

            <!-- 精灵设置 -->
            <div class="slider" v-if="currentValue.type === 'Sprite'">

                <div class="slider-demo-block">
                    <span class="demonstration">高度:</span>
                    <el-input-number v-model="spriteSettings.height" :min="1" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">宽度:</span>
                    <el-input-number v-model="spriteSettings.width" :min="1" />
                </div>

                <div class="slider-demo-block">
                    <span class="demonstration">纹理类型:</span>
                    <el-select v-model="spriteSettings.type" placeholder="纹理类型">
                        <el-option v-for="item in spriteSelectList.type" :key="item" :label="item" :value="item" />
                    </el-select>
                </div>



                <div class="slider-demo-block" v-if="spriteSettings.type === '颜色纹理'">
                    <span class="demonstration">颜色选择:</span>
                    <el-color-picker v-model="spriteSettings.color" show-alpha
                        :predefine="spriteSelectList.predefineColors" />
                </div>

                <div class="slider-demo-block" v-if="spriteSettings.type === '图片纹理'">
                    <span class="demonstration">图片选择:</span>
                    <el-select v-model="spriteSettings.image" placeholder="选择图片" value-key="name">
                        <el-option v-for="(item, index) in spriteSelectList.imageList" :key="index" :label="item.name"
                            :value="item" />
                    </el-select>
                </div>

                <div class="slider-demo-block" v-if="spriteSettings.type === '图片纹理'">
                    <span class="demonstration">图片分辨率:</span>
                    <el-select v-model="spriteSettings.resolution" placeholder="选择分辨率">
                        <el-option v-for="(item, index) in spriteSelectList.resolutionList" :key="index" :label="item.lable"
                            :value="item" />
                    </el-select>
                </div>

            </div>

            <el-form-item>
                <!-- <el-switch v-model="params.merge" class="mb-2" active-text="合并渲染" inactive-text="普通渲染" /> -->
                <el-button type="primary" class="btn render" @click="renderEntity">渲染</el-button>
                <el-button type="primary" class="btn clearScene" @click="clearScene">清空</el-button>
            </el-form-item>

        </el-form>
    </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { geometryList } from "../utils/data";
import Bus from "../utils/EventBus";
import Detector from "@/utils/Detector.js";
import Record from "@/utils/record.js";


const model_list = ref(geometryList); // 模型列表
const currentValue = ref(""); // 当前选中实体

// 管道几何体设置
const tubeSettings = reactive({
    points: 3, // 路径点数
    radius: 2, // 半径
    radialSegments: 8, // 管道段数
    material: require("../assets/1.jpg"),
})
// 挤压几何体设置
const extrudeSettings = reactive({
    edgeNum: 3,
    depth: 5, // 深度
    bevelSegments: 2, // 斜角段数
    steps: 2, // 深度段数
    bevelSize: 1, // 斜角大小
    bevelThickness: 1, // 斜角厚度
});
// 精灵设置
const spriteSettings = reactive({
    height: 10,
    width: 10,
    type: "图片纹理",
    image: {
        name: "莲花1",
        url: require("../assets/1.jpg")
    },
    resolution: {
        label: "128×128",
        value: 128
    },
    color: 'rgba(255, 69, 0, 0.68)',
})
// 精灵参数
const spriteSelectList = reactive({
    type: ["图片纹理", "自定义Canvas", "颜色纹理"],
    predefineColors: ['#ff4500',
        '#ff8c00',
        '#ffd700',
        '#90ee90',
        '#00ced1',
        '#1e90ff',
        '#c71585',
        'rgba(255, 69, 0, 0.68)',
        'rgb(255, 120, 0)',
        'hsv(51, 100, 98)',
        'hsva(120, 40, 94, 0.5)',
        'hsl(181, 100%, 37%)',
        'hsla(209, 100%, 56%, 0.73)',
        '#c7158577',],
    imageList: [
        {
            name: "莲花1",
            url: require("../assets/1.jpg")
        },
        {
            name: "莲花2",
            url: require("../assets/2.jpg")
        },
        {
            name: "星空",
            url: require("../assets/3.jpg")
        },
        {
            name: "海岛",
            url: require("../assets/4.jpg")
        },
        {
            name: "瀑布",
            url: require("../assets/5.jpg")
        },
    ],
    // 分辨率
    resolutionList: [
        {
            lable: "128×128",
            value: 128
        },
        {
            lable: "256×256",
            value: 256
        },
        {
            lable: "512×512",
            value: 512
        },
        {
            lable: "1024×1024",
            value: 1024
        }
    ]
})
// 表单参数
const params = reactive({
    gutter: 10, // 间距
    count: 0,  // 个数
    currentValue: "", // 当前选中实体
    merge: false, // 渲染方式
    visible: true, // 是否渲染
    closed: false, // 是否首尾相连
    tubeSettings,
    extrudeSettings,
    spriteSettings,
    shareMaterial: false, // 是否共享材质
})

// 提交表单
const renderEntity = () => {
    params.currentValue = currentValue.value // 当前选中实体
    Bus.emit("createGeometry", params) // 创建实体
    // console.log(params);
}

// 删除所有模型
const clearScene = () => {
    Detector.clearAll(); // 清空场景
    // 记录操作记录
    Record.recordOperationLog({
        name: "清空场景",
        type: "click",
        timestamp: new Date().getTime(),
        target: "",
        params: null,
        real_time_perfermance: Record.real_time_perfermance,
        desc: "清空场景"
    })

    // 数据初始化
    Bus.emit("dataInit");
    params.gutter = 10;
    params.count = 0;
    params.currentValue = "";
    params.merge = false;
    params.visible = true;
    params.closed = false;
    params.shareMaterial = false;
    currentValue.value = "";
}
</script>

<style lang="scss" scoped>
.model-list {
    z-index: 10;
    width: 100%;
    height: 100%;
    transition: all 0.3s ease;
    overflow: hidden;

    table {
        width: 100%;
        border-collapse: collapse;

        th {
            padding: 10px 0;
            text-align: center;
            border-bottom: 1px solid #eee;
        }

        td {
            padding: 10px 0;
            text-align: center;
            border-bottom: 1px solid #eee;

            input {
                width: 100%;
                height: 100%;
                border: none;
                outline: none;
                text-align: center;
            }
        }
    }

}

.demo-form-inline .el-input {
    --el-input-width: 220px;
}

.demo-form-inline .el-form-item {
    margin-right: 0;
}


.render {
    margin: 0 10px;
}

.clearScene {
    margin-right: 10px;
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