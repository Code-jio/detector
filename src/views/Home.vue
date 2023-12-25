<template>
    <canvas class="contain" ref="contain"> </canvas>
    <div class="state" ref="stateContain"></div>
    <!-- 当前场景的面数、材质数、贴图数 -->
    <div class="scene_info" ref="scene_info"></div>
    <!-- 折叠面板 -->
    <CollapsePanel></CollapsePanel>
    <!-- <Performance></Performance> -->
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from "vue";
import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as TWEEN from '@tweenjs/tween.js'

import Bus from "@/utils/EventBus.js" // 事件总线
import CollapsePanel from "@/components/CollapsePanel";
// import Performance from "./components/PerformanceGraph";
import { random, distanceBetweenTwoPoints } from '@/utils/tools.js';
import Record from "@/utils/record.js";
import Detector from "@/utils/Detector.js";
// console.log(Record);
// 创建画布
const contain = ref(null);
// 创建性能监视器
const stateContain = ref(null);
// const panel = ref(null);
const scene_info = ref(null);

let canvas, state, stats, renderer, controls, light;
let side_num = ref(0); // 面数
let material_num = ref(0); // 材质数
let texture_num = ref(0); // 贴图数
let mesh_num = ref(0); // 贴图数

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

let count = 0; // 计算 fps 的次数
let prevTimestamp; // 上一次计算 fps 的时间戳

const mixers = []; // 动画列表

const GLTFLloader = new GLTFLoader(); // 创建模型加载器
// const detector = new Detector(); // 创建检测器
window.Detector = Detector;


const scene = Detector.createScene({
    color: new THREE.Color(0xffffff),
    // fog: new THREE.FogExp2(0x000000, 0.001),
}); // 创建场景

const camera = Detector.createPerspectiveCamera({
    fov: 45,
    aspect: window.innerWidth / window.innerHeight,
    near: 1,
    far: 100000,
    position: { x: 100.0, y: 100.0, z: 100.0 },
}) // 创建相机

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
    let texture = 0; // 贴图数
    let mesh = 0; // 网格数

    // 递归遍历场景对象scene的子对象group
    scene.traverse(function (obj) {
        // 网格模型对象
        if (obj.isMesh) {
            // console.log(obj);
            // 考虑合并渲染之后的情况
            // 1.如果是合并渲染的网格模型
            if (obj.geometry instanceof THREE.BufferGeometry) {
                // 网格数
                mesh += 1;
                side += obj.geometry.attributes.position.count / 3; // 累加面数
                // 如果有多种材质
                if (obj.material instanceof Array) {
                    material += obj.material.length; // 累加材质数
                    obj.material.forEach((item) => {
                        if (item) {
                            texture += item.map ? 1 : 0;
                        }
                    })
                } else {
                    // 单材质
                    material += 1;
                    // 如果有贴图
                    texture += obj.material.map ? 1 : 0;
                }
                // 2.如果是普通网格模型
            } else {
                mesh += 1;
                side += obj.geometry ? obj.geometry.faces.length : 0; // 累加面数
                // 如果有多种材质
                if (obj.material instanceof Array) {
                    material += obj.material.length; // 累加材质数
                    obj.material.forEach((item) => {
                        if (item) {
                            texture += item.map ? 1 : 0;
                        }
                    })
                } else {
                    // 单材质
                    material += 1;
                    // 如果有贴图
                    texture += obj.material.map ? 1 : 0;
                }
            }
        } else if (obj.isSprite) {
            // 精灵对象
            mesh += 1; // 网格数
            side += 1; // 累加面数
            material += 1; // 累加材质数
            texture += obj.material.map ? 1 : 0; // 累加贴图数
        } else if (obj.isScene) {
            // 如果是场景对象（gltf模型）
            // 递归计算gltf模型的面数、材质数、贴图数、网格数
            obj.traverse(function (item) {
                // 新方法计算gltf模型的面数、材质数、贴图数、网格数
                if (item.isMesh) {
                    // 考虑合并渲染之后的情况
                    // 1.如果是合并渲染的网格模型
                    if (item.geometry instanceof THREE.BufferGeometry) {
                        // 网格数
                        mesh += 1;
                        side += item.geometry.attributes.position.count / 3; // 累加面数
                        if (item.material instanceof Array) {
                            item.material.forEach((item) => {
                                if (item) {
                                    texture += item.map ? 1 : 0;
                                }
                            })
                            material += item.material.length; // 累加材质数
                        } else {
                            material += 1
                        }

                        // 2.如果是普通网格模型
                    } else {
                        mesh += 1;
                        side += item.geometry ? item.geometry.faces.length : 0; // 累加面数
                        material += 1; // 累加材质数
                        texture += item.material.map ? 1 : 0; // 累加贴图数
                    }
                }
            })
        }
    })
    side_num.value = side.toFixed(0);
    material_num.value = material.toFixed(0);
    texture_num.value = texture.toFixed(0);
    mesh_num.value = mesh.toFixed(0);
}

// 监听场景变化
const onSceneChange = () => {
    getSideMaterialTextureNum();
    // 更新页面中的面数、材质数、贴图数
    scene_info.value = document.querySelector(".scene_info");
    scene_info.value.innerHTML = `网格数:${mesh_num.value}，面数：${side_num.value}，材质数：${material_num.value}，贴图数：${texture_num.value}`;
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
                ({ geometry, material } = Detector.createGeometry());
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
                    //    如果需要共享材质
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
    console.log(mesh);
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
                    ({ geometry, material } = Detector.createGeometry());
                }
                for (let i = 0; i < e.count; i++) {
                    // 如果不需要共享材质
                    if (!e.shareMaterial) {
                        ({ geometry, material } = Detector.createGeometry());
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

onMounted(() => {
    // 获取dom元素
    console.log("CollapsePanel", CollapsePanel);
    canvas = contain.value; // 获取画布
    state = stateContain.value; // 获取性能监视器容器
    stats = Detector.createStats(state); // 创建性能监视器
    renderer = Detector.createRender(canvas) // 创建渲染器
    controls = Detector.createOrbitControls(camera, canvas) // 创建控制器
    light = Detector.createAmbientLight({
        color: 0xffffff,
        intensity: 0.5,
    }); // 创建环境光
    scene.add(light);

    scene.add(Detector.createGridHelper(1000, 100)); // 创建网格线
    scene.add(Detector.createAxesHelper(1000)); // 坐标轴辅助线
    Detector.showRenderPannel(scene_info.value); // 显示渲染器状态

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
        renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比：最小值为2
    });

    // 渲染函数
    function render(timestamp) {
        renderer.render(scene, camera); // 渲染场景
        TWEEN.update(); // 更新动画（TWEENjs库更新动画）
        controls.update(); // 更新控制器
        stats.update(); // 更新性能监控 一定要放在最后

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
        Detector.changeColorByRay(e);
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
    Detector.clearAll(); // 清空场景
    timer = null; // 清除定时器
});
</script>

<style lang="less" scoped>
canvas {
    width: 100%;
    height: 100%;
    z-index: 1;
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
    color: #000;
}
</style>
