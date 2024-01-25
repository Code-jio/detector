<template>
  <div>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
    <MathTranslate></MathTranslate>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from "vue";
import * as THREE from "three";
import Stats from "three/examples/js/libs/stats.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import MathTranslate from "../components/MathTranslate.vue";
import Bus from "@/utils/EventBus.js"; // 事件总线
let stats, renderer, scene;

// 创建相机
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100000
);
camera.updateProjectionMatrix(); // 更新相机投影矩阵
camera.position.set(200, 200, 200); // 设置相机位置
camera.lookAt(0, 0, 0); // 设置相机焦点

const container = ref(null); // 画布dom
const state = ref(null); // 性能监视器dom

// 创建渲染器
const createRender = (dom) => {
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    canvas: dom,
    antialias: true, // 开启硬件反走样
    alpha: true, // 背景透明
    precision: "highp", // 着色精度选择
    powerPreference: "high-performance", // 高性能模式-优先使用GPU
  }); // 创建渲染器
  renderer.gammaOutput = true; // 设置输出为sRGB格式
  renderer.physicallyCorrectLights = true; // 设置光照正确性
  renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比 作用：防止高分屏下模糊
  renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
  renderer.logarithmicDepthBuffer = true;
};

// 创建性能监视器
const createStats = (dom) => {
  stats = new Stats(); // 创建性能监视器
  stats.showPanel(0, 1, 2); // 0: fps:帧率, 1: ms:渲染时间, 2: mb:内存占用
  dom.appendChild(stats.dom);
};

// 创建场景
const createScene = () => {
  const scene = new THREE.Scene(); // 创建场景
  scene.background = new THREE.Color(0x000000); // 设置背景颜色
  return scene;
};

// 创建坐标轴辅助
const createAxesHelper = () => {
  const axesHelper = new THREE.AxesHelper(1000); // 创建坐标轴辅助
  return axesHelper;
};

// 创建网格辅助
const createGridHelper = () => {
  const gridHelper = new THREE.GridHelper(1000, 100); // 创建网格辅助
  gridHelper.name = "gridHelperHelper";
  gridHelper.material.opacity = 0.4; // 设置网格透明度
  gridHelper.material.transparent = true; // 设置网格透明度
  gridHelper.position.y = 0; // 设置网格位置
  gridHelper.position.x = 0; // 设置网格位置
  gridHelper.position.z = 0; // 设置网格位置
  // gridHelper.visible = true; // 设置网格是否可见
  gridHelper.material.depthTest = true; // 设置网格材质是否深度测试
  // gridHelper.renderOrder = -1; // 设置网格渲染顺序
  return gridHelper;
};

// 添加mesh立方体
const addMesh = () => {
  // 创建立方体、且每个面的写上对应的索引值
  const geometry = new THREE.BoxGeometry(100, 100, 100);
  const material = [
    new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide }),
  ];
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0);
  scene.add(mesh);
  return mesh;
};

// 延时函数
const sleep = (time) => {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, time);
  });
};

// 射线拾取
const clickScene = (event) => {
  const raycaster = new THREE.Raycaster(); // 创建射线
  const mouse = new THREE.Vector2(); // 创建鼠标向量
  const dom = container.value; // 获取dom
  const rect = dom.getBoundingClientRect(); // 获取dom的尺寸和位置
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1; // 获取鼠标点击位置x
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1; // 获取鼠标点击位置y
  mouse.x = x; // 设置鼠标向量x
  mouse.y = y; // 设置鼠标向量y
  raycaster.setFromCamera(mouse, camera); // 设置射线相机和鼠标向量
  const intersects = raycaster.intersectObjects(scene.children, true); // 获取射线和模型相交的数组
  if (intersects.length > 0) {
    // 判断是否有相交的模型
    const obj = intersects[0].object; // 获取相交的模型
    console.log(obj);
  }
};

onMounted(() => {
  createStats(state.value); // 创建性能监视器
  scene = createScene(); // 创建场景
  createRender(container.value); // 创建渲染器
  // 创建控制器
  const controls = new OrbitControls(camera, renderer.domElement); // 控制器传入相机对象和渲染器dom元素
  console.log(controls);
  // 创建环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight); // 添加环境光
  scene.add(createAxesHelper()); // 添加坐标轴辅助
  scene.add(createGridHelper()); // 添加坐标轴辅助

  let mesh = addMesh(); // 添加立方体
  Bus.on("transform", (data) => {
    // data是一个四元数，插值运算
    // mesh.quaternion.slerp(data, 0.5);
    mesh.quaternion.copy(data);
  });
  // 左键点击事件
  container.value.addEventListener("click", clickScene, false);
  console.log(new THREE.Matrix4());
  // resize自适应
  window.addEventListener(
    "resize",
    () => {
      camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
      camera.updateProjectionMatrix(); // 更新相机投影矩阵
      renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    },
    false
  );

  // const vector = new THREE.Vector3(1, 0, 0);
  // vector.applyQuaternion(quaternion);

  // console.log(animate_List[0]);

  // 逐帧渲染
  const render = () => {
    stats.update(); // 开始性能监视器
    controls.update();

    renderer.render(scene, camera); // 渲染场景
    requestAnimationFrame(render); // 请求再次执行渲染函数render
  };
  requestAnimationFrame(render);
});
</script>
<style scoped lang="scss">
.container {
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
</style>
