<template>
    <!-- 针对所有模型的顶点、三角面、材质数量统计 -->
    <el-button type="primary" @click="drawer = true" class="btn Stat">
        面片统计
    </el-button>
    <el-button type="primary" @click="openMaterialList()" class="btn materialStat">
        已渲染模型材质统计
    </el-button>
    <el-drawer v-model="drawer" :with-header="false" title="面片统计" direction="ltr" size="450">
        <div class='meshList'>
            <!-- 表格 -->
            <el-table :data="modelList" style="width: 100%; margin-bottom: 20px" row-key="id" default-expand-all border
                :default-sort="{ prop: 'ID', order: 'descending' }">
                <!-- 展示顶点、三角面、材质数量 -->
                <el-table-column label="ID" width="60">
                    <template v-slot="{ row }">
                        <span>{{ row.id }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="Name" width="120">
                    <template v-slot="{ row }">
                        <span>{{ row.name }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="Vertices" width="82">
                    <template v-slot="{ row }">
                        <span>{{ row.vertices }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="Faces" width="82">
                    <template v-slot="{ row }">
                        <span>{{ row.faces }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="Materials" width="89">
                    <template v-slot="{ row }">
                        <span>{{ row.materials }}</span>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-drawer>
    <el-drawer v-model="showMaterialList" :with-header="false" title="材质统计" direction="ltr" size="550"
        default-expand-all>
        <el-collapse>
            <el-collapse-item v-for="i in materialList" :key="i" :name="i.name">
                <template #title>
                    模型名称:{{ i.name }} 材质：{{ i.materialCount }} 纹理：{{ i.textureCount }} 贴图：{{ i.mapCount }} 主资源大小：{{ i.ratio }}
                </template>

                <div class="content">
                    <el-table :data="i.children" style="width: 100%">
                        <el-table-column prop="name" label="材质名" width="80" />
                        <el-table-column prop="src" label="图片" width="200" />
                        <!-- <el-table-column prop="size" label="Date" width="180" /> -->
                        <el-table-column label="尺寸" width="100">
                            <template v-slot="{ row }">
                                <span>{{ row.size.height }}×{{ row.size.width }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="ratio" label="大小" width="100" />
                    </el-table>
                </div>
            </el-collapse-item>
        </el-collapse>
    </el-drawer>
</template>

<script setup>
import Detector from '@/utils/Detector.js'
import Bus from "@/utils/EventBus.js" // 事件总线
import * as THREE from "three";
import a from "@/global.js";

let { imgList, binList } = a;
import { ref, defineProps, onMounted } from 'vue'

const drawer = ref(false)
const modelList = ref([]) // 模型列表
const showMaterialList = ref(false) // 展示标识
const materialList = ref() // 材质列表


// 计算模型列表中各个子mesh的顶点、三角面、材质数量
const computeModelList = () => {
    // `console.log('scene', scene)

    Bus.on("modelload", (model) => {
        model.traverse(function (item) {
            if (item.isObject3D) {
                let vertices = 0, faces = 0, materials = 0, name = item.name

                if (item.geometry) {

                    // 统计三角面数量
                    if (item.geometry instanceof THREE.BufferGeometry) {
                        faces = item.geometry.index ? item.geometry.index.count / 3 : item.geometry.attributes.position.count / 9;
                    } else {
                        faces = item.geometry.faces.length
                    }
                    vertices = item.geometry.attributes.position.count
                }
                if (item.material) {
                    //    检查该item用了多少个贴图
                    if (item.material instanceof Array) {
                        item.material.forEach((currentMaterial) => {
                            for (const key in currentMaterial) {
                                if (Object.hasOwnProperty.call(currentMaterial, key)) {
                                    const element = currentMaterial[key];
                                    if (element instanceof THREE.Texture) {
                                        // let map = element;
                                        materials++ // 贴图信息统计
                                        // 贴图信息统计
                                    }
                                }
                            }
                        })
                    } else {
                        // 如果是单材质
                        for (const key in item.material) {
                            if (Object.hasOwnProperty.call(item.material, key)) {
                                const element = item.material[key];
                                // 判断材质属性下是否有贴图
                                if (element instanceof THREE.Texture) {
                                    let map = element;
                                    // 贴图信息统计
                                    materials++ // 贴图信息统计
                                }
                            }
                        }
                    }
                }

                modelList.value.push({
                    id: item.id,
                    name,
                    vertices,
                    faces,
                    materials,
                })
            }
            // console.log('item', item)
        })
    })
    console.log('modelList', modelList.value)
}

// 打开材质列表
const openMaterialList = async () => {
    // 统计材质
    let list = await Detector.getSceneModelInfo();
    console.log('list', list)

    for (let i = 0; i < list.length; i++) {
        const element = list[i];
        if (element.children.length > 0) {
            for (let j = 0; j < element.children.length; j++) {
                const item = element.children[j];
                for (let k = 0; k < imgList.length; k++) {
                    const image = imgList[k];
                    if (image.name === item.src) {
                        item.ratio = image.size;
                    }
                }
            }
        }

        binList.forEach((bin) => {
            if (bin.name.includes(element.name)) {
                element.ratio = bin.size;
                console.log('element', element)
            }
        })
    }

    if (list.length > 0) {
        showMaterialList.value = true;
        materialList.value = list;
        console.log('materialList', materialList.value)
    } else {
        showMaterialList.value = false;
    }
}

onMounted(() => {
    // 初始化模型列表
    // modelList.value = scene.children
    computeModelList();
})
</script>


<style scoped lang='scss'>
.meshList {
    position: absolute;
    top: 70px;
    left: 0;
    width: 450px;
    height: calc(100% - 80px);
    background-color: rgba($color: #ffffff, $alpha: 0.6);
    overflow-y: auto;
    overflow-x: hidden;

    line-height: 20px;
}

.btn {
    position: absolute;
    z-index: 999;
    background-color: #409EFF;
    border-color: #409EFF;
    color: #fff;
    font-size: 14px;
    padding: 0 15px;
    height: 32px;
    line-height: 30px;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #66b1ff;
        border-color: #66b1ff;
    }

    &:active {
        background-color: #3a8ee6;
        border-color: #3a8ee6;
    }

    &:focus {
        background-color: #3a8ee6;
        border-color: #3a8ee6;
    }
}

.materialStat {
    top: 100px;
    left: 0px;
}

.Stat {
    top: 140px;
    left: 0px;
    margin-left: 12px;
}
</style>