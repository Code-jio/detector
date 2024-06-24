<template>
    <canvas class="contain" ref="contain"> </canvas>
    <div class="state" ref="stateContain"></div>
    <!-- 当前场景的面数、材质数、贴图数 -->
    <div class="scene_info" ref="scene_info"></div>
    <!-- 折叠面板 -->
    <CollapsePanel></CollapsePanel>
    <!-- <Performance></Performance> -->
    <!-- <OverLay v-for="index in num" :key="index"></OverLay> -->
    <!-- 页面加载时间开销 -->
    <TimeSpend></TimeSpend>
    <!-- 面片信息 -->
    <MeshList></MeshList>

    <!-- 截图
    <div class="screenShot">
        图片尺寸倍率：<input type="value" class="times" value="1" />
        <button class="shot">截图</button>
    </div> -->
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from "vue";
import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as TWEEN from '@tweenjs/tween.js'
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';// 引入渲染器通道RenderPass
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'; // 引入轮廓通道OutlinePass
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
// import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
// import {DRACOLoader} from "@/utils/dracoLoader.js";

import Bus from "@/utils/EventBus.js" // 事件总线
import CollapsePanel from "@/components/CollapsePanel";
// import Performance from "./components/PerformanceGraph";
import { random, distanceBetweenTwoPoints } from '@/utils/tools.js';
import Record from "@/utils/record.js";
import Detector from "@/utils/Detector.js";
import MeshList from "../components/MeshList.vue";
import TimeSpend from "../components/TimeSpend.vue";

// 创建画布
const contain = ref(null);
// 创建性能监视器
const stateContain = ref(null);
// const panel = ref(null);
const scene_info = ref(null);
const mapList = ref([]);


let canvas, state, stats, renderer, controls, light;
let side_num = ref(0); // 面数
let material_num = ref(0); // 材质数
let texture_num = ref(0); // 贴图数
let mesh_num = ref(0); // 贴图数
let vertices_num = ref(0); // 顶点数


let frustumParams = reactive({
    ClippingPlane: [1, 1000],
    fov: 45,
    width: 16,
    height: 9,
}); // 裁切面范围

const clock = new THREE.Clock();// 创建时钟对象Clock
let frustum; // 视锥体
let camera_frustum; // 视锥体附属相机
let timer = null; // 定时器

let radius = ref(10); // 默认视点半径
let flag = ref(""); // 渲染控制器：true 视锥体控制器，false 视点控制器
let overlay = ref(""); // 覆盖层
let count = 0; // 计算 fps 的次数
let prevTimestamp; // 上一次计算 fps 的时间戳

const mixers = []; // 动画列表

const GLTFLloader = new GLTFLoader(); // 创建模型加载器

const onUpPosition = new THREE.Vector2();
const onDownPosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let outlinePass // 轮廓通道
let transformControl // 变换控制器
let currentModel = null; // 当前模型

const scene = Detector.createScene({
    color: new THREE.Color(0xffffff),
    // fog: new THREE.FogExp2(0x000000, 0.001),
}); // 创建场景

Detector.scene = scene; 
window.Detector = Detector;

const camera = Detector.createPerspectiveCamera({
    fov: 45,
    aspect: window.innerWidth / window.innerHeight,
    near: 1,
    far: 100000,
    position: { x: 500.0, y: 1000, z: 500.0 },
}) // 创建相机
Detector.camera = camera; // 将相机对象保存到检测器中

// 切换渲染控制器
Bus.on("changeControl", (e) => {
    flag.value = e.value;
    // 记录操作记录
    Record.recordOperationLog({
        name: "切换渲染控制器",
        type: "select",
        timestamp: new Date().getTime(),
        target: e.value,
        params: e,
        real_time_perfermance: Record.real_time_perfermance,
        desc: `切换成${e.value}`
    })
    if (e.value === "视锥体控制器") {
        // 找到name为ViewCircle的网格对象 删除该对象
        scene.children.forEach((item) => {
            if (item.name === "ViewCircle") {
                Detector.removeEntity(item);
            }
        });
        // 创建视锥体
        Detector.createFrustum(e.Frustum);


    } else if (e.value === "视点控制器") {
        // 删除视锥体
        scene.children.forEach((item) => {
            if (item.name === "CameraHelper") {
                Detector.removeEntity(item);
            }
        });
        Detector.createViewCircle(e.radius); // 创建视点球
    } else if (e.value === "正常渲染") {
        // 清除视点球，清除视锥体
        scene.children.forEach((item) => {
            if (item.name === "CameraHelper" || item.name === "ViewCircle") {
                Detector.removeEntity(item);
            }
            // 恢复所有模型的可见性
            if (item.type === "Mesh") {
                item.visible = true;
            }
        });
    }
})

// 递归方式计算场景内的所有实体的网格数、面数、材质数、贴图数 （geometry、sprite）
const getSideMaterialTextureNum = () => {
    let side = 0; // 面数
    let material = 0; // 材质数
    let texture = 0; // 纹理数
    let mesh = 0; // 网格数
    let vertices = 0; // 顶点数

    let materialList = []; // 材质列表
    let textureList = []; // 纹理列表

    // 递归遍历场景对象scene的子对象group
    // traverse(callback)方法用来遍历场景对象的子对象   callback回调函数
    scene.traverse(function (obj) {
        // 排除光源、网格辅助、坐标轴辅助
        if (obj instanceof THREE.AmbientLight || obj instanceof THREE.GridHelper || obj instanceof THREE.AxesHelper) return

        if (obj.isObject3D) {
            if (obj.geometry instanceof THREE.BufferGeometry) {
                mesh++;
                side += obj.geometry.index ? obj.geometry.index.count / 3 : obj.geometry.attributes.position.count / 9;

                // 如果有多种材质
                if (obj.material instanceof Array) {
                    material += obj.material.length; // 累加材质数
                    obj.material.forEach((item) => {
                        let materialInfo = {
                            name: item.type,
                            id: item.uuid,
                        }
                        // materialList中验证是否有重复的材质
                        if (!materialList.some((item) => item.id === materialInfo.id)) {
                            materialList.push(materialInfo);
                        }

                        // texture += item.map ? 1 : 0;
                        for (const key in item) {
                            if (Object.hasOwnProperty.call(item, key)) {
                                const element = item[key];
                                // 判断材质属性下是否有贴图
                                if (element instanceof THREE.Texture) {
                                    // texture++;
                                    let textureInfo = {
                                        name: element.image.currentSrc || "undefined",
                                        id: element.uuid,
                                        size: `${element.image.width}x${element.image.height}`,
                                    }
                                    // textureList中验证是否有重复的贴图
                                    if (!textureList.some((item) => item.id === textureInfo.id)) {
                                        textureList.push(textureInfo);
                                    }
                                }
                            }
                        }
                    })
                } else {
                    // 单材质
                    // material++;

                    let materialInfo = {
                        name: obj.material.type,
                        id: obj.material.uuid,
                    }
                    // materialList中验证是否有重复的材质
                    if (!materialList.some((item) => item.id === materialInfo.id)) {
                        materialList.push(materialInfo);
                    }

                    for (const key in obj.material) {
                        if (Object.hasOwnProperty.call(obj.material, key)) {
                            const element = obj.material[key];
                            // 判断材质属性下是否有贴图
                            if (element instanceof THREE.Texture) {
                                // texture++;
                                let textureInfo = {
                                    name: element.image.currentSrc || "undefined",
                                    id: element.uuid,
                                    size: `${element.image.width}x${element.image.height}`,
                                }
                                // textureList中验证是否有重复的贴图
                                if (!textureList.some((item) => item.id === textureInfo.id)) {
                                    textureList.push(textureInfo);
                                }
                            }
                        }
                    }
                }
            } else {
                mesh++;
                if (obj.geometry) side += obj.geometry.faces.length;
                // 如果有多种材质
                if (obj.material instanceof Array) {
                    material += obj.material.length; // 累加材质数
                    obj.material.forEach((item) => {

                        let materialInfo = {
                            name: item.type,
                            id: item.uuid,
                        }
                        // materialList中验证是否有重复的材质
                        if (!materialList.some((item) => item.id === materialInfo.id)) {
                            materialList.push(materialInfo);
                        }

                        // texture += item.map ? 1 : 0;
                        for (const key in item) {
                            if (Object.hasOwnProperty.call(item, key)) {
                                const element = item[key];
                                // 判断材质属性下是否有贴图
                                if (element instanceof THREE.Texture) {
                                    // texture++;
                                    console.log(element);
                                    let textureInfo = {
                                        name: element.image.currentSrc || "undefined",
                                        id: element.uuid,
                                        size: `${element.image.width}x${element.image.height}`,
                                    }
                                    // textureList中验证是否有重复的贴图
                                    if (!textureList.some((item) => item.id === textureInfo.id)) {
                                        textureList.push(textureInfo);
                                    }
                                }
                            }
                        }

                    })
                } else {
                    if (obj.material) {
                        // 单材质
                        // material++;
                        let materialInfo = {
                            name: obj.material.type,
                            id: obj.material.uuid,
                        }
                        // materialList中验证是否有重复的材质
                        if (!materialList.some((item) => item.id === materialInfo.id)) {
                            materialList.push(materialInfo);
                        }
                        // 如果有贴图
                        // texture += obj.material.map ? 1 : 0;
                        for (const key in obj.material) {
                            if (Object.hasOwnProperty.call(obj.material, key)) {
                                const element = obj.material[key];
                                // 判断材质属性下是否有贴图
                                if (element instanceof THREE.Texture) {
                                    // texture++;
                                    let textureInfo = {
                                        name: element.image.currentSrc || "undefined",
                                        id: element.uuid,
                                        size: `${element.image.width}x${element.image.height}`,
                                    }
                                    // textureList中验证是否有重复的贴图
                                    if (!textureList.some((item) => item.id === textureInfo.id)) {
                                        textureList.push(textureInfo);
                                    }
                                }
                            }
                        }
                    }

                }
            }
        }
        if (obj?.geometry?.attributes?.position?.count) {
            vertices += obj.geometry.attributes.position.count;
        }
    })

    side_num.value = side.toFixed(0);
    material_num.value = materialList.length.toFixed(0);
    texture_num.value = textureList.length.toFixed(0);
    mesh_num.value = mesh.toFixed(0);
    vertices_num.value = vertices.toFixed(0);
}

// 监听场景变化
const onSceneChange = () => {
    getSideMaterialTextureNum();
    // 更新页面中的面数、材质数、贴图数
    scene_info.value = document.querySelector(".scene_info");
    scene_info.value.innerHTML = `网格数:${mesh_num.value}，面数：${side_num.value}，材质数：${material_num.value}，贴图数：${texture_num.value}，顶点数：${vertices_num.value}`;
}

// 监听场景变化
timer = setInterval(() => {
    onSceneChange();
}, 500);

// 统计信息初始化
Bus.on("dataInit", () => {
    side_num.value = 0;
    material_num.value = 0;
    texture_num.value = 0;
    mesh_num.value = 0;
    vertices_num.value = 0;
});

// 合并网格对象 统一渲染
const mergeRender = (params) => {
    if (!params.count) return

    let meshList = []; // 网格对象数组
    let materialList = [];
    let geometry, material;

    switch (params.currentValue.type) {
        case "BoxGeometry":
            for (let i = 0; i < params.count; i++) {
                ({ geometry, material } = Detector.createGeometry(params));
                let cube = new THREE.Mesh(geometry, material);
                // 模型平铺x-z平面(最中间的方块位置位于原点)
                cube.position.set(
                    (i % Math.floor(Math.sqrt(params.count))) * params.gutter,
                    0,
                    Math.floor(i / Math.sqrt(params.count)) * params.gutter
                ); // 设置mesh位置
                cube.updateMatrixWorld(); // 更新网格模型的世界矩阵 ===>不主动更新世界矩阵，合并渲染后，所有mesh都会集中于原点
                let BufferGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
                BufferGeometry.applyMatrix(cube.matrixWorld); // 矩阵变换
                // 共享材质仅接受一个颜色材质
                if (!params.shareMaterial) {
                    materialList.push(material);
                }
                meshList.push(BufferGeometry);
            }
            geometry = BufferGeometryUtils.mergeBufferGeometries(
                meshList,
                true,
            );
            break;
        case "ExtrudeGeometry":
            for (let i = 0; i < params.count; i++) {
                let { geometry, material } = Detector.createExtrudeGeometry(params.extrudeSettings);
                let mesh = new THREE.Mesh(geometry, material);
                // 模型平铺x-z平面(最中间的方块位置位于原点)
                mesh.position.set(
                    (i % Math.floor(Math.sqrt(params.count))) * params.gutter,
                    0,
                    Math.floor(i / Math.sqrt(params.count)) * params.gutter
                ); // 设置mesh位置
                mesh.updateMatrixWorld(); // 更新网格模型的世界矩阵 ===>不主动更新世界矩阵，合并渲染后，所有mesh都会集中于原点
                // scene.add(mesh); // 网格模型添加到场景中
                // console.log(mesh);
                let BufferGeometry = new THREE.BufferGeometry().fromGeometry(mesh.geometry);
                BufferGeometry.applyMatrix(mesh.matrixWorld); // 矩阵变换
                meshList.push(BufferGeometry);
                if (!params.shareMaterial) {
                    materialList.push(material);
                }
            }

            geometry = BufferGeometryUtils.mergeBufferGeometries(
                meshList,
                true
            );
            break;
        case "TubeGeometry":
            // 管道的连接参数
            const connextParams = {
                matrixList: [], // 矩阵列表
                startList: [], // 起点列表
                endList: [],  // 终点列表
                position: [], // 位置列表
            }
            for (let i = 0; i < params.count; i++) {
                let path = Detector.createRandomCurve().path; // 创建随机曲线函数
                let { geometry, material } = Detector.createTubeGeometry(params.tubeSettings, path);
                let mesh = new THREE.Mesh(geometry, material);
                // 模型平铺x-z平面(最中间的方块位置位于原点)
                mesh.position.set(
                    (i % Math.floor(Math.sqrt(params.count))) * params.gutter,
                    0,
                    Math.floor(i / Math.sqrt(params.count)) * params.gutter
                ); // 设置mesh位置
                mesh.updateMatrixWorld(); // 更新网格模型的世界矩阵 ===>不主动更新世界矩阵，合并渲染后，所有mesh都会集中于原点

                let list = mesh.geometry.parameters.path.points
                connextParams.matrixList.push(mesh.matrixWorld);
                connextParams.startList.push(list[0]);
                connextParams.endList.push(list[list.length - 1]);
                connextParams.position.push(mesh.position);

                // scene.add(mesh); // 网格模型添加到场景中
                // console.log(mesh);
                let BufferGeometry = new THREE.BufferGeometry().fromGeometry(mesh.geometry);
                BufferGeometry.applyMatrix(mesh.matrixWorld); // 矩阵变换
                meshList.push(BufferGeometry);
                if (!params.shareMaterial) {
                    materialList.push(material);
                }
            }

            // 如果是闭合管道
            if (params.closed) {
                tubeClosed(connextParams, params.tubeSettings).forEach((item) => {
                    // item 是mesh对象
                    let BufferGeometry = new THREE.BufferGeometry().fromGeometry(item.geometry);
                    BufferGeometry.applyMatrix(item.matrixWorld); // 矩阵变换
                    meshList.push(BufferGeometry);
                    //    如果需要共享材质Material()
                    if (!params.shareMaterial) {
                        materialList.push(material);
                    }
                })
            }

            geometry = BufferGeometryUtils.mergeBufferGeometries(
                meshList,
                true
            );
            break;
        default:
            break;
    }

    Detector.clearAll(); // 清空场景
    if (params.shareMaterial) {
        materialList.push(new Detector.createPhongMaterial(), new Detector.createShaderMaterial());
        // 共享材质，将所有的mesh的材质都替换成同一个材质
        geometry.groups.forEach((item) => {
            item.materialIndex = 0;
        })
    }
    // 渲染合并后的网格对象
    let mesh = new THREE.Mesh(geometry, materialList);
    scene.add(mesh);
    // console.log(mesh);
    // console.log(geometry, materialList);
};

// 渲染几何体
Bus.on("createGeometry", (e) => {
    Detector.clearAll(); // 清空场景
    // 判断是否要合并渲染
    if (e.merge) {
        // 合并渲染
        // console.log(e);
        mergeRender(e);

        Record.recordOperationLog({
            name: "渲染网格",
            type: "click",
            timestamp: new Date().getTime(),
            target: e.currentValue.type,
            params: e,
            real_time_perfermance: Record.real_time_perfermance,
            desc: `合并渲染：${e.count}个${e.currentValue.type}`,
        })
    } else {
        let geometry, material
        // 普通渲染
        switch (e.currentValue.type) {
            // 渲染立方几何体
            case "BoxGeometry":
                // 如果需要共享材质
                if (e.shareMaterial) {
                    ({ geometry, material } = Detector.createGeometry(e));
                }
                for (let i = 0; i < e.count; i++) {
                    // 如果不需要共享材质
                    if (!e.shareMaterial) {
                        ({ geometry, material } = Detector.createGeometry(e));
                    }
                    let cube = new THREE.Mesh(geometry, material);
                    // 模型平铺x-z平面(最中间的方块位置位于原点)
                    cube.position.set(
                        (i % Math.floor(Math.sqrt(e.count))) * e.gutter,
                        0,
                        Math.floor(i / Math.sqrt(e.count)) * e.gutter
                    ); // 设置mesh位置
                    scene.add(cube); // 网格模型添加到场景中
                }

                Record.recordOperationLog({
                    name: "渲染网格",
                    type: "click",
                    timestamp: new Date().getTime(),
                    target: e.currentValue.type,
                    params: e,
                    real_time_perfermance: Record.real_time_perfermance,
                    desc: `普通渲染：${e.count}个BoxGeometry`,
                })
                break;
            // 渲染挤压几何体
            case "ExtrudeGeometry":
                // 如果需要共享材质
                if (e.shareMaterial) {
                    ({ geometry, material } = Detector.createExtrudeGeometry(e.extrudeSettings));
                }
                for (let i = 0; i < e.count; i++) {
                    // 如果不需要共享材质
                    if (!e.shareMaterial) {
                        ({ geometry, material } = Detector.createExtrudeGeometry(e.extrudeSettings));
                    }
                    let mesh = new THREE.Mesh(geometry, material);
                    // 模型平铺x-z平面(最中间的方块位置位于原点)
                    mesh.position.set(
                        (i % Math.floor(Math.sqrt(e.count))) * e.gutter,
                        0,
                        Math.floor(i / Math.sqrt(e.count)) * e.gutter
                    ); // 设置mesh位置
                    scene.add(mesh); // 网格模型添加到场景中
                }

                Record.recordOperationLog({
                    name: "渲染网格",
                    type: "click",
                    timestamp: new Date().getTime(),
                    target: e.currentValue.type,
                    params: e,
                    real_time_perfermance: Record.real_time_perfermance,
                    desc: `普通渲染：${e.count}个ExtrudeGeometry`,
                })
                break;
            // 渲染管道几何体
            case "TubeGeometry":
                const connextParams = {
                    matrixList: [], // 矩阵列表
                    startList: [], // 起点列表
                    endList: [],  // 终点列表
                    position: [], // 位置列表
                }
                let path = Detector.createRandomCurve().path; // 创建随机曲线函数                

                // 如果需要共享材质
                if (e.shareMaterial) {
                    ({ geometry, material } = Detector.createTubeGeometry(e.tubeSettings, path));
                }
                for (let i = 0; i < e.count; i++) {
                    // 如果不需要共享材质
                    if (!e.shareMaterial) {
                        ({ geometry, material } = Detector.createTubeGeometry(e.tubeSettings, path));
                    }
                    let mesh = new THREE.Mesh(geometry, material);

                    // let mesh = Detector.createTubeGeometry(e.tubeSettings, path);
                    // 模型平铺x-z平面(最中间的方块位置位于原点)
                    mesh.position.set(
                        (i % Math.floor(Math.sqrt(e.count))) * e.gutter,
                        0,
                        Math.floor(i / Math.sqrt(e.count)) * e.gutter
                    ); // 设置mesh位置

                    let list = mesh.geometry.parameters.path.points
                    connextParams.matrixList.push(mesh.matrixWorld);
                    connextParams.startList.push(list[0]);
                    connextParams.endList.push(list[list.length - 1]);
                    connextParams.position.push(mesh.position);
                    // mesh.updateMatrixWorld(); // 更新网格模型的世界矩阵
                    scene.add(mesh); // 网格模型添加到场景中
                }

                Record.recordOperationLog({
                    name: "渲染网格",
                    type: "click",
                    timestamp: new Date().getTime(),
                    target: e.currentValue.type,
                    params: e,
                    real_time_perfermance: Record.real_time_perfermance,
                    desc: `普通渲染：${e.count}个TubeGeometry,${e.closed ? "首尾合并" : "非首尾合并"}`,
                })
                // 如果是闭合管道
                if (e.closed) {
                    tubeClosed(connextParams, e.tubeSettings).forEach((item) => {
                        scene.add(item);
                    })
                }
                break;
            // 创建精灵
            case "Sprite":

                if (e.shareMaterial) {
                    material = Detector.createSpriteMaterial(e.spriteSettings);
                }

                for (let i = 0; i < e.count; i++) {
                    if (!e.shareMaterial) {
                        material = Detector.createSpriteMaterial(e.spriteSettings);
                    }
                    const sprite = new THREE.Sprite(material);
                    sprite.name = e.spriteSettings.image.name; // 设置模型名称
                    sprite.scale.set(e.spriteSettings.width, e.spriteSettings.height, 1); // 设置精灵大小:宽度、高度、深度
                    // 模型平铺x-z平面(最中间的方块位置位于原点)
                    sprite.position.set(
                        (i % Math.floor(Math.sqrt(e.count))) * e.gutter,
                        0,
                        Math.floor(i / Math.sqrt(e.count)) * e.gutter
                    ); // 设置mesh位置
                    scene.add(sprite); // 网格模型添加到场景中
                }

                Record.recordOperationLog({
                    name: "渲染网格",
                    type: "click",
                    timestamp: new Date().getTime(),
                    target: e.currentValue.type,
                    params: e,
                    real_time_perfermance: Record.real_time_perfermance,
                    desc: `渲染：${e.count}个Sprite,使用${e.spriteSettings.type}`,
                })

                break;
            // 几何体嵌套
            case "NestedGeometry":
                let material;
                // 判断是否需要材质共享
                if (e.shareMaterial) {
                    // 如果需要材质共享 就先创建一个材质作为源材质，然后在创建立方体的时候，将这个材质作为参数传入
                    material = getMaterial(e.NestedGeometrySettings.type);
                }

                for (let i = 0; i < e.count; i++) {
                    let group = e.NestedGeometrySettings.nest ? geometryNest(e, material) : groupLoad(e, material);
                    group.position.set(
                        (i % Math.floor(Math.sqrt(e.count))) * e.gutter,
                        0,
                        Math.floor(i / Math.sqrt(e.count)) * e.gutter
                    ); // 设置mesh位置
                    scene.add(group); // 网格模型添加到场景中
                }
                break;
            default:
                break;
        }
    }
});

// 管道首尾相连
const tubeClosed = (connextParams, tubeSettings) => {
    let pointList = [];
    let meshList = []
    // 提取起点终点
    for (let i = 0; i < connextParams.position.length; i++) {
        let dx = connextParams.position[i].x;
        let dy = connextParams.position[i].y;
        let dz = connextParams.position[i].z;
        pointList.push(
            new THREE.Vector3(
                dx + connextParams.startList[i].x,
                dy + connextParams.startList[i].y,
                dz + connextParams.startList[i].z
            )); // 添加第i个起点
        pointList.push(
            new THREE.Vector3(
                dx + connextParams.endList[i].x,
                dy + connextParams.endList[i].y,
                dz + connextParams.endList[i].z
            )); // 添加第i个终点
    }

    // 依次连接首尾点
    for (let i = 1; i < pointList.length; i += 2) {
        let line = new THREE.LineCurve3(pointList[i], pointList[i + 1]); // 创建线条
        let geometry = new THREE.TubeGeometry(
            line, // 路径
            tubeSettings.points, // 路径上的点数
            tubeSettings.radius, // 管道半径
            tubeSettings.radialSegments, // 管道半径分段数
            false // 是否闭合
        ); // 创建管道缓冲几何体

        let texture = new THREE.TextureLoader().load(require("@/assets/1.jpg")); // 加载贴图
        let material = new THREE.MeshPhongMaterial({
            map: texture,
        }); // 材质对象Material

        let mesh = new THREE.Mesh(geometry, material); // 网格模型对象Mesh
        meshList.push(mesh);
    }
    return meshList;
};

// 几何体嵌套
const geometryNest = (params, material) => {
    let prevCube = null;
    let count = 0;
    let group = new THREE.Group();
    let material_use = null;
    // console.log(material_use);
    const createCube = (size) => {
        let geometry = new THREE.BoxGeometry(size, size, size);
        // 判定材质共享
        if (params.shareMaterial) {
            material_use = new THREE.Material().copy(material);
        } else {
            material_use = getMaterial(params.NestedGeometrySettings.type);
        }
        let cube = new THREE.Mesh(geometry, material_use);
        // 创建随机四元数
        const quaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                random(-Math.PI, Math.PI),
                random(-Math.PI, Math.PI),
                random(-Math.PI, Math.PI)
            )
        );
        cube.quaternion.copy(quaternion); // 设置四元数
        cube.position.set(0, 0, 0);
        cube.updateMatrixWorld(); // 更新网格模型的世界矩阵
        if (prevCube) {
            prevCube.add(cube);
        } else {
            group.add(cube);
        }
        prevCube = cube;
        count++;
        if (count < params.NestedGeometrySettings.count) {
            createCube(size - 0.1);
        }
    }
    createCube(params.NestedGeometrySettings.count);
    return group;
}

// group装载
const groupLoad = (params, material) => {
    let group = new THREE.Group();

    let material_use = null;

    for (let i = 0; i < params.count; i++) {
        let geometry = new THREE.BoxGeometry(10, 10, 10);
        if (params.NestedGeometrySettings.shareMaterial) {
            // 共享材质
            material_use = new THREE.Material().copy(material);
        } else {
            // 不共享材质
            material_use = getMaterial(params.NestedGeometrySettings.type);
        }

        let cube = new THREE.Mesh(geometry, material_use);
        // 创建随机四元数
        const quaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                random(-Math.PI, Math.PI),
                random(-Math.PI, Math.PI),
                random(-Math.PI, Math.PI)
            )
        );
        cube.quaternion.copy(quaternion); // 设置四元数
        group.add(cube);
    }
    return group;
}

// 生产材质
const getMaterial = (type) => {
    let material;
    switch (type) {
        case "MeshBasicMaterial":
            material = new THREE.MeshBasicMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
                // wireframe: true, // 以线框方式渲染几何体
            });
            break;
        case "MeshLambertMaterial":
            material = new THREE.MeshLambertMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
                emissive: Math.random().toFixed(6) * 0xffffff, // 自发光颜色
                emissiveIntensity: 0.5, // 发光强度
            });
            break;
        case "MeshPhongMaterial":
            material = new THREE.MeshPhongMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
                specular: Math.random().toFixed(6) * 0xffffff, // 镜面光颜色
                shininess: 30, // 镜面指数
            });
            break;
        case "MeshStandardMaterial":
            material = new THREE.MeshStandardMaterial({
                // color: Math.random().toFixed(6) * 0xffffff,
                roughness: 0.5, // 粗糙度
                metalness: 0.5, // 金属度
                // 贴图
                map: new THREE.TextureLoader().load(require("@/assets/1.jpg")),
            });
            break;
        case "MeshPhysicalMaterial":
            material = new THREE.MeshPhysicalMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
                roughness: 0.5,
                metalness: 0.5,
                clearcoat: 1.0, // 透明度
                clearcoatRoughness: 0.1, // 透明度粗糙度
            });
            break;
        case "MeshToonMaterial":
            material = new THREE.MeshToonMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
                gradientMap: new THREE.TextureLoader().load(require("@/assets/1.jpg")), // 渐变贴图
            });
            break;
        case "MeshMatcapMaterial":
            material = new THREE.MeshMatcapMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
                matcap: new THREE.TextureLoader().load(require("@/assets/1.jpg")), // 材质球贴图
            });
            break;
        case "MeshDepthMaterial":
            material = new THREE.MeshDepthMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
                wireframe: true,
            });
            break;
        case "MeshNormalMaterial":
            material = new THREE.MeshNormalMaterial({
                color: Math.random().toFixed(6) * 0xffffff,
            });
            break;
        default:
            break;
    }
    return material;
}

// 压平模型
const flattenModel = (scene) => {
    // 新模型部分子mesh大小与原模型不一致，mesh数量正确
    // const childrenCopy = JSON.parse(JSON.stringify(scene.children));
    const childrenCopy = [...scene.children];

    childrenCopy.forEach((item) => {
        const itemChildrenCopy = [...item.children];
        itemChildrenCopy.forEach((i) => {
            // 为保持位置、大小一致，保持原有的世界变换矩阵
            let mesh = i.clone();
            // console.log(mesh, "mesh", mesh.applyMatrix);
            // mesh.applyMatrix(i.matrixWorld);
            scene.add(mesh);
            item.remove(i);
            Detector.removeEntity(i);
        });
    });

    if (scene.children.some(child => child.children.length > 0)) {
        return flattenModel(scene);
    } else {
        return scene;
    }
}

/**
 * 获取模型的贴图参数，保存其分辨率、大小、格式等信息
 */
const getMapInfo = (scene) => {
    let mapList = [];
    scene.traverse(function (obj) {
        // 先判断obj内是否有贴图
        if (obj.material) {
            // 一般情况下可能会有多个材质
            if (obj.material instanceof Array) {
                obj.material.forEach((item) => {
                    for (const key in item) {
                        if (Object.hasOwnProperty.call(item, key)) {
                            const element = item[key];
                            if (element instanceof THREE.Texture) {
                                let map = element;
                                let mapInfo = {
                                    name: map.image.currentSrc,
                                    id: map.uuid,
                                    size: `${map.image.width}x${map.image.height}`,
                                }
                                // mapList中验证是否有重复的贴图
                                if (!mapList.some((item) => item.id === mapInfo.id)) {
                                    mapList.push(mapInfo);
                                }
                            }
                        }
                    }
                })
            } else {
                // 如果是单材质
                for (const key in obj.material) {
                    if (Object.hasOwnProperty.call(obj.material, key)) {
                        const element = obj.material[key];
                        // 判断材质属性下是否有贴图
                        if (element instanceof THREE.Texture) {
                            let map = element;
                            let mapInfo = {
                                name: map.image.currentSrc && map.image.currentSrc,
                                id: map.uuid,
                                size: `${map.image.width}x${map.image.height}`,
                            }
                            // mapList中验证是否有重复的贴图
                            if (!mapList.some((item) => item.id === mapInfo.id)) {
                                mapList.push(mapInfo);
                            }
                            // mapList.push(mapInfo);
                        }
                    }
                }
            }
        }
    })
    return mapList;
}

/**
 * 添加模型到场景
 * @param {Object} model 模型对象
 * @param {Object} position 位置
 */
const addScene = (model, position) => {
    let gltf = model.clone()
    gltf.scale.set(10, 10, 10);
    gltf.position.set(position.x, position.y, position.z);
    scene.add(gltf)
}

/**
 * 模型加载
 * @param {String} url 模型地址
 * @param {Number} space 间距
 * @param {Number} num 数量
 * @param {Boolean} isTiled 是否平铺
 * @param {Boolean} flatten 是否压平
 */
const loadModel = (url, space, num, isTiled, flatten) => {
    console.time("模型加载时间");
    let model = null;
    // let loader = new GLTFLoader();
    let loader = new GLTFLoader();
    // let dracoLoader  = new DRACOLoader();
    // // 设置Draco解码器的路径
    // dracoLoader.setDecoderPath('./decoder/');
    // loader.setDRACOLoader(DRACOLoader);

    // 加载模型
    loader.load(url, (gltf) => {
        console.log(gltf);
        if (flatten) {
            if (gltf.scene.children.length > 1) {
                model = flattenModel(gltf.scene);
            } else {
                model = gltf.scene;
            }
        } else {
            model = gltf.scene;
        }
        currentModel = model;
        Bus.emit("modelload", model); // 初始化数据
        // console.log(model);
        // 清除指定子集
        // model.children[0].children.forEach((item) => {
        //     if (item.name === "对象025_11" || item.name === "对象025_18") {
        //         item.geometry.dispose();
        //         item.material.dispose();
        //         item.parent.remove(item);

        //         scene.remove(item);
        //         // Detector.removeEntity(item);
        //     }
        // });
        for (let i = 0; i < num; i++) {
            // 排列
            let position = isTiled ? {
                x: (i % Math.floor(Math.sqrt(num))) * space,
                y: 0,
                z: Math.floor(i / Math.sqrt(num)) * space
            } : {
                x: 0,
                y: i * space,
                z: 0
            }

            if (i === 0) {
                // 获取模型的贴图数 与嵌套深度
                mapList.value.push(...getMapInfo(model)) // 获取贴图参数
                let depth = getDepth(model); // 获取模型的深度
                console.log(mapList.value, depth, model);
            }
            addScene(model.clone(), position) // 添加模型
        }
    }, (progress) => { }, (err) => { console.log(err) })
    console.timeEnd("模型加载时间");
}

/**
 * 获取模型的深度
 * @param {Object} scene 场景对象
 * @returns {Number} 深度
 */
const getDepth = (scene) => {
    let depth = 0; // 最终结果
    let currentDeep = 0; // 当前深度
    // 每次递归深度+1
    const getDeep = (scene) => {
        currentDeep++;
        scene.children.forEach((item) => {
            if (item.children.length > 0) {
                getDeep(item);
            }
        });
        if (currentDeep > depth) {
            depth = currentDeep;
        }
        currentDeep--;
    }
    getDeep(scene);
    return depth;
}

// 鼠标左键按下
const onPointerDown = (event) => {
    onDownPosition.x = event.clientX;
    onDownPosition.y = event.clientY;
}
// 鼠标左键抬起
const onPointerUp = (event) => {
    onUpPosition.x = event.clientX;
    onUpPosition.y = event.clientY;
    if (onDownPosition.distanceTo(onUpPosition) === 0) {
        transformControl.detach(); // 取消选中对象
    }
}

// 鼠标移动
const onPointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    let intersects
    if (currentModel) {
        intersects = raycaster.intersectObjects(currentModel.children, false); // 射线与对象求交
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object !== transformControl.object) {
                transformControl.attach(object); // 选中对象
            }
        }
    }
}

onMounted(() => {
    side_num.value = 0;
    material_num.value = 0;
    texture_num.value = 0;
    vertices_num.value = 0;
    Detector.clearAll(); // 清空场景

    // 添加场景必要元素
    canvas = contain.value;
    state = stateContain.value;
    stats = Detector.createStats(state);
    renderer = Detector.createRender(canvas)

    // // 获取用户设置的图片尺寸
    // let size = {
    //     x: window.innerWidth,
    //     y: window.innerHeight
    // }

    // let times = document.getElementsByClassName("times")[0];
    // let time = 1;
    // times.addEventListener("change", function () {
    //     time = times.value;
    // })


    // // 获取
    // let shot = document.getElementsByClassName("shot");
    // // 添加点击事件
    // shot[0].addEventListener("click", function () {
    //     console.log("截图", size);
    //     // 设置尺寸
    //     renderer.setSize(size.x * time, size.y * time);
    //     // 截图
    //     renderer.render(scene, camera);

    //     var fileName = 'testImg.jpg';
    //     var dataImg = new Image();
    //     var imgData = canvas.toDataURL('image/png');
    //     dataImg.src = imgData;
    //     var blob = dataURLtoBlob(imgData);
    //     var objurl = URL.createObjectURL(blob);
    //     var alink = document.createElement("a");
    //     alink.href = objurl;
    //     alink.download = fileName;
    //     alink.click();

    //     function dataURLtoBlob(dataurl) {
    //         var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    //             bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    //         while (n--) {
    //             u8arr[n] = bstr.charCodeAt(n);
    //         }
    //         return new Blob([u8arr], { type: mime });
    //     }

    //     // 尺寸恢复
    //     renderer.setSize(window.innerWidth, window.innerHeight);

    // });

    controls = Detector.createOrbitControls(camera, canvas)
    light = Detector.createAmbientLight({
        color: 0xffffff,
        intensity: 1,
    });
    scene.add(light);
    scene.background = new THREE.Color(0xffffff); // 设置背景颜色

    // 场景辅助元素
    scene.add(Detector.createGridHelper(1000, 100)); // 添加网格辅助
    scene.add(Detector.createAxesHelper(1000)); // 添加坐标轴辅助
    Detector.showRenderPannel(scene_info.value);

    transformControl = new TransformControls(camera, renderer.domElement);

    // transformControl.addEventListener('change', render);
    transformControl.addEventListener('dragging-changed', function (event) {
        controls.enabled = !event.value;
    });
    scene.add(transformControl);

    // 创建后处理对象EffectComposer，WebGL渲染器作为参数
    // const composer = new EffectComposer(renderer);
    // 创建一个渲染器通道，场景和相机作为参数
    // const renderPass = new RenderPass(scene, camera);
    // 设置renderPass通道
    // composer.addPass(renderPass);
    // OutlinePass第一个参数v2的尺寸和canvas画布保持一致
    // const v2 = new THREE.Vector2(window.innerWidth, window.innerHeight);
    // outlinePass = new OutlinePass(v2, scene, camera); // 创建一个轮廓通道
    // composer.addPass(outlinePass); // 添加轮廓通道
    // outlinePass.visibleEdgeColor.set(0xffffff); // 设置可见边缘颜色

    // let FXAAShader = {
    //     uniforms: {
    //         "tDiffuse": { value: null },
    //         "resolution": { value: new THREE.Vector2(1 / window.innerWidth, 1 / window.innerHeight) }
    //     },
    //     vertexShader: `
    //     varying vec2 vUv;
    //     void main() {
    //         vUv = uv;
    //         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    //     }
    // `,
    //     fragmentShader: `
    //     uniform sampler2D tDiffuse;
    //     uniform vec2 resolution;
    //     varying vec2 vUv;
    //     void main() {
    //         vec2 texel = 1.0 / resolution;
    //         vec2 coord = vUv;
    //         vec4 color = texture2D(tDiffuse, coord);
    //         vec4 colorL = texture2D(tDiffuse, coord + texel * vec2(-1.0, 0.0));
    //         vec4 colorR = texture2D(tDiffuse, coord + texel * vec2(1.0, 0.0));
    //         vec4 colorU = texture2D(tDiffuse, coord + texel * vec2(0.0, 1.0));
    //         vec4 colorD = texture2D(tDiffuse, coord + texel * vec2(0.0, -1.0));
    //         color += colorL + colorR + colorU + colorD;
    //         color *= 0.25;
    //         gl_FragColor = color;
    //     }
    // `
    // }

    // const effectFXAA = new ShaderPass(FXAAShader); // 创建一个抗锯齿通道
    // effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight); // 设置抗锯齿通道的分辨率
    // composer.addPass(effectFXAA); // 添加抗锯齿通道

    // const glitchPass = new GlitchPass();
    // // glitchPass.goWild = true; // 疯狂模式
    // glitchPass.renderToScreen = true;
    // window.glitchPass = glitchPass;
    // composer.addPass(glitchPass); // 添加故障通道

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointermove', onPointerMove);

    // loadModel("./gltf/factory.glb", 10, 3, true, true); // 加载模型 url space num isTiled flatten
    // loadModel("./gltf-Transform/factory-T.glb", 10, 1, true, false); // 加载模型 url space num isTiled flatten
    // loadModel("./gltf/factory.glb", 10, 1, true, false); // 加载模型 url space num isTiled flatten
    // loadModel("./gltf-Transform/factory2-T.glb", 10, 1, true, false); // 加载模型 url space num isTiled flatten
    // loadModel("./gltf/factory2.glb", 10, 1, true, false); // 加载模型 url space num isTiled flatten

    // loadModel("./gltf/zhusuji.gltf", 100, 1, true, false);
    // loadModel("./gltf-Transform/boombox-T.glb", 100, 1, true, false); // 
    // loadModel("./gltf/BoomBox/gltf/BoomBox.gltf", 100, 1, true, false);


    // loadModel("./export/huoche-1.gltf", 100, 1, true, false);
    // loadModel("./gltf/huoche-1/huoche-1.gltf", 100, 1, true, false);
    // loadModel("./gltf/scene.glb", 100, 1, true, false);
    // loadModel("./export/output.glb", 100, 1, true, false);

    // loadModel("./model/gltf/huowu-1baimo.gltf", 100, 1, true, false);
    // loadModel("./model/huowu/huowu-1baimo.gltf", 100, 1, true, false);

    // loadModel("./model/wall-2/huoti-02.gltf", 100, 1, true, false);
    // loadModel("./model/wall-gltf/huoti-02.gltf", 100, 1, true, false);

    // loadModel("./model/luone/luone31-1__nomerge.gltf", 100, 1, true, false);
    // loadModel("./export/export/output.gltf", 100, 1, true, false);

    // loadModel("./gltf/zhusuji.gltf", 100, 25, true, false);
    // loadModel("./gltf/zhusuji/zhusuji-1-ceshi.gltf", 100, 1, true, false);
    // loadModel("./gltf/zhusuji/file3.gltf", 100, 1, true, false);

    // loadModel("./gltf/package.gltf", 100, 2, true, false);
    // loadModel("./gltf/25_zhusuji.gltf", 100, 1, true, false);
    // loadModel("./gltf/zhusuji_zip.gltf", 100, 1, true, false);
    // loadModel("./gltf/zhusuji.glb", 100, 25, true, false);

    // loadModel("./gltf/zhusuji/zhusuji-1-ceshi.gltf", 10, 1, true, false);



    // // 开启LOD层次优化
    // let lod = new THREE.LOD();
    // scene.add(lod);

    // htmlRender(); // 渲染标签

    // 监听控制器变化
    controls.addEventListener("change", (e) => {
        let controls = e.target; // 获取控制器
        // 如果开启视锥体控制器
        if (flag.value === "视锥体控制器") {
            // 让camera_frustum跟随主相机
            // console.log(Detector.camera_frustum);
            Detector.camera_frustum.position.copy(camera.position);
            Detector.camera_frustum.rotation.copy(camera.rotation);
            Detector.camera_frustum.updateMatrixWorld(); // 更新相机的世界坐标矩阵

            // 更新视锥体:
            Detector.frustum.setFromMatrix(
                new THREE.Matrix4().multiplyMatrices(
                    Detector.camera_frustum.projectionMatrix,
                    Detector.camera_frustum.matrixWorldInverse
                )
            );
            // 移动过程中判断mesh对象是否在视锥体内
            scene.children.forEach((item) => {
                if (item.type === "Mesh") {
                    // 如果是合并渲染的网格模型==》逐个创建点，判断点是否在视锥体内
                    if (item.geometry instanceof THREE.BufferGeometry) {
                        // let positionList = [];

                        item.geometry.groups.forEach((element) => {
                            // 创建点
                            let position = new THREE.Vector3();
                            // 获取子对象的端点位置
                            position.x = item.geometry.attributes.position.array[element.start * 3];
                            position.y = item.geometry.attributes.position.array[element.start * 3 + 1];
                            position.z = item.geometry.attributes.position.array[element.start * 3 + 2];
                            // 根据点是否在视锥体内决定是否渲染

                            if (item.material.length === 2) {
                                // 如果是共享材质
                                // item.material[0].visible = Detector.frustum.containsPoint(position);
                                element.materialIndex = Detector.frustum.containsPoint(position) ? 0 : 1;
                            } else {
                                // 如果是不共享材质
                                item.material[element.materialIndex].visible = Detector.frustum.containsPoint(position);
                            }
                        })


                    } else if (item.type === "Mesh") {
                        item.visible = frustum.intersectsObject(item); //  如果在视锥体内,则渲染
                    }
                } else if (item.type === "Scene" || item.type === "Sprite") {
                    // 其他 就是gltf模型、精灵
                    // item.visible = frustum.intersectsObject(item); //  如果在视锥体内,则渲染
                    item.visible = Detector.frustum.containsPoint(item.position); //  如果在视锥体内,则渲染
                }
            });
        } else if (flag.value === "视点控制器") {
            // 如果开启视点控制器
            scene.children.forEach((item) => {
                // 寻找id为ViewPoint的网格对象,动态改变其位置
                if (item.name === "ViewCircle") {
                    item.position.set(
                        controls.target.x,
                        controls.target.y,
                        controls.target.z
                    );
                }
                // 判断每个mesh对象与视点球的距离
                if (item.type === "Mesh") {
                    // 如果是合并渲染的网格模型
                    if (item.geometry instanceof THREE.BufferGeometry) {
                        // 材质不共享
                        if (item.material.length !== 2) {
                            item.geometry.groups.forEach((element, index) => {
                                let position = new THREE.Vector3();
                                // 获取子对象的端点位置
                                position.x = item.geometry.attributes.position.array[element.start * 3];
                                position.y = item.geometry.attributes.position.array[element.start * 3 + 1];
                                position.z = item.geometry.attributes.position.array[element.start * 3 + 2];
                                let distance = distanceBetweenTwoPoints(
                                    position,
                                    controls.target
                                );
                                item.material[index].visible = distance < Detector.viewCircle.radius; // 如果距离小于视点半径，则渲染,否则不渲染
                            })

                        } else {
                            // 材质共享
                            item.geometry.groups.forEach((element, index) => {
                                let position = new THREE.Vector3();
                                // 获取子对象的端点位置
                                position.x = item.geometry.attributes.position.array[element.start * 3];
                                position.y = item.geometry.attributes.position.array[element.start * 3 + 1];
                                position.z = item.geometry.attributes.position.array[element.start * 3 + 2];
                                let distance = distanceBetweenTwoPoints(
                                    position,
                                    controls.target
                                );
                                // item.material[0].visible = distance < Detector.viewCircle.radius; // 如果距离小于视点半径，则渲染,否则不渲染
                                element.materialIndex = distance < Detector.viewCircle.radius ? 0 : 1;
                            })
                        }
                    } else {
                        let distance = distanceBetweenTwoPoints(
                            item.position,
                            controls.target
                        );
                        item.visible = distance < Detector.viewCircle.radius; // 如果距离小于视点半径，则渲染,否则不渲染
                    }
                } else if (item.type === "Scene" || item.type === "Sprite") {
                    // 其他 就是gltf模型、精灵
                    let distance = distanceBetweenTwoPoints(
                        item.position,
                        controls.target
                    );
                    item.visible = distance < Detector.viewCircle.radius; // 如果距离小于视点半径，则渲染,否则不渲染
                }
            });
        } else {
            // 正常渲染：所有实体都显示
            scene.children.forEach((item) => {
                if (item.type === "Mesh") {
                    // 如果是合并渲染的网格模型
                    if (item.geometry instanceof THREE.BufferGeometry) {
                        item.geometry.groups.forEach((element) => {
                            element.materialIndex = 0;
                        })
                    } else {
                        item.visible = true;
                    }
                } else if (item.type === "Scene" || item.type === "Sprite") {
                    // 其他 就是gltf模型、精灵
                    item.visible = true;
                }
            });
            return
        }
    });

    // 监听窗口变化
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
        camera.updateProjectionMatrix(); // 更新相机投影矩阵
        renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
        Detector.HTML2DRenderer.setSize(window.innerWidth, window.innerHeight); // 设置2D标签渲染器尺寸
        Detector.HTML3DRenderer.setSize(window.innerWidth, window.innerHeight); // 设置3D标签渲染器尺寸

        renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比：最小值为2
        // size.x = window.innerWidth;
        // size.y = window.innerHeight;
    });

    // 渲染函数
    function render(timestamp) {
        renderer.render(scene, camera); // 渲染场景
        Detector.HTML2DRenderer.render(scene, camera); // 渲染标签
        Detector.HTML2DRenderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
        // Detector.HTML3DRenderer.render(scene, camera);
        // Detector.HTML3DRenderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
        // HTML2DRenderer.render(scene, camera);

        TWEEN.update(); // 更新动画（TWEENjs库更新动画）
        controls.update(); // 更新控制器
        stats.update(); // 更新性能监控 一定要放在最后
        // composer.render();
        // 自身动画播放器
        let delta = clock.getDelta()
        for (const mixer of Detector.mixers) {
            mixer.update(delta); // 更新动画
            // console.log(delta);
        }

        if (prevTimestamp) {
            count++;
            // 间隔超过 1s，将之前计算的 count 输出
            if (timestamp - prevTimestamp >= 1000) {
                let MEM = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
                // 记录性能变化
                Record.recordPerformance({
                    timestamp: new Date().getTime(),
                    FPS: count,
                    MEM,
                });
                // 记录实时性能
                Record.real_time_perfermance.FPS = count;
                Record.real_time_perfermance.MEM = MEM;
                Record.real_time_perfermance.Meshs = mesh_num.value;
                Record.real_time_perfermance.Sides = side_num.value;
                Record.real_time_perfermance.Materials = material_num.value;
                Record.real_time_perfermance.Textures = texture_num.value;
                Record.real_time_perfermance.Vertices = vertices_num.value;
                prevTimestamp = timestamp;
                count = 0;
            }
        } else {
            prevTimestamp = timestamp;
        }

        requestAnimationFrame(render); // 请求再次执行渲染函数
    }
    requestAnimationFrame(render); // 请求执行渲染函数
});

// 左键点击选取
window.addEventListener("click", (e) => {
    // 如果目标不是canvas画布，则不执行
    if (e.target.tagName === "CANVAS") {
        // 鼠标左键选取然后点击物体高亮
        let mouse = new THREE.Vector2();
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        let intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            if (obj.isMesh) {
                // 添加物体边缘高亮
                outlinePass.selectedObjects = [obj];

                // 添加变换控制器选取
                transformControl.attach(obj);
            }
        }
    }
}); // 监听点击事件

// 监听右键点击事件
window.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "CANVAS") {
        Detector.removeEntityByRay(e);
    }
});

onUnmounted(() => {
    window.removeEventListener("resize", () => { }); // 移除窗口变化监听
    window.removeEventListener("click", () => { }); // 移除点击事件监听
    window.removeEventListener("contextmenu", () => { }); // 移除右键点击事件监听
    side_num.value = 0; // 面数
    material_num.value = 0; // 材质数
    texture_num.value = 0; // 贴图数
    vertices_num.value = 0; // 顶点数
    Detector.clearAll(); // 清空场景
    timer = null; // 清除定时器
});

</script>

<style lang="less" scoped>
canvas {
    width: 100%;
    height: 100%;
    z-index: 1;
    overflow: hidden;
}

.state {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
}

.scene_info {
    position: absolute;
    top: 40px;
    left: 0;
    z-index: 2;
    font-size: 12px;
    padding: 10px;
    color: #fff;
    color: #000;
}

// .screenShot {
//     position: absolute;
//     bottom: 20px;
//     left: 20px;
//     z-index: 2;
//     padding: 10px;
//     background-color: #fff;
//     color: #000;
// }

// .sizeX {
//     width: 50px;
//     height: 20px;
//     margin-right: 10px;
// }

// .sizeY {
//     width: 50px;
//     height: 20px;
//     margin-right: 10px;
// }

// .shot {
//     width: 60px;
//     height: 30px;
//     background-color: #fff;
//     color: #000;
//     border: 1px solid #666;
//     border-radius: 5px;
//     cursor: pointer;
//     text-align: center;
//     margin-left: 10px;
// }

.shot:active {
    scale: 0.98;
}
</style>
