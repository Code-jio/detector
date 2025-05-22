<template>
  <div>
    <canvas class="container" ref="container"></canvas>
    <div class="state" ref="state"></div>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from "vue";
import * as THREE from "three";
import Stats from "stats.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as TWEEN from "@tweenjs/tween.js";
import { random } from "@/utils/tools.js";

let stats, renderer, scene;

// 创建相机
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100000
);
camera.updateProjectionMatrix(); // 更新相机投影矩阵
camera.position.set(100, 100, -100); // 设置相机位置
camera.lookAt(0, 0, 0); // 设置相机焦点

const url = "/gltf/chache/chache-1.gltf";
// const url = "/gltf/test/duiduoji-1.gltf"
// const url = "/gltf/Horse.glb"

let mixer;
let time = ref(1000);
const clock = new THREE.Clock(); // 创建时钟对象Clock
const container = ref(null); // 画布dom
const state = ref(null); // 性能监视器dom
const value = ref(0); // 进度条值

const frameNum = ref(0); // 帧数

let current_animate = {}; // 当前动画
const animate_List = reactive([]); // 动画列表
const current_animate_options = reactive([]); // 当前动画列表
let shaderMaterial

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
  renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比 作用:防止高分屏下模糊
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
  scene.background = new THREE.Color(0xffffff); // 设置背景颜色
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
  gridHelper.material.opacity = 0.2; // 设置网格透明度
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
  const geometry = new THREE.BoxGeometry(10, 10, 10); // 创建立方体几何体
  shaderMaterial = getShaderMaterial();
  const mesh = new THREE.Mesh(geometry, shaderMaterial); // 创建立方体网格模型
  mesh.position.set(0, 0, 0); // 设置立方体网格模型位置
  scene.add(mesh); // 添加立方体网格模型到场景
};

// 添加sprite精灵 shader材质
const addSprite = () => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2() },
    },
    vertexShader: /* glsl */ `
          void main() {
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
    fragmentShader: /* glsl */ `
            uniform float u_time;
            uniform vec2 u_resolution;
            void main() {
                vec2 st = gl_FragCoord.xy/u_resolution.xy;
                gl_FragColor = vec4(st.x,st.y,0.5,1.0);
            }
        `,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(100, 100, 100);
  sprite.position.set(10, 10, 10);
  console.log(sprite);
  scene.add(sprite);
}

const createLine = () => {
  shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2() },
    },
    vertexShader: /* glsl */ `
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
    fragmentShader: /* glsl */ `
        uniform float u_time;
        void main() {
          vec3 color = vec3(0.5 + 0.5 * cos(u_time), 0.5 + 0.5 * sin(u_time), 0.5);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    transparent: true,
  });
  const geometry = new THREE.BufferGeometry();

  // 创建随机三维路径点
  const vertices = new Float32Array(1000 * 3);
  for (let i = 0; i < 1000; i++) {
    vertices[i * 3] = random(-100, 100);
    vertices[i * 3 + 1] = random(-100, 100);
    vertices[i * 3 + 2] = random(-100, 100);
  }


  geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const line = new THREE.Line(geometry, shaderMaterial);
  // line.scale.set(100, 100, 100);
  scene.add(line);
};

const createTriangle = () => {
  // 从创建一个 三角形并利用shader赋予渐变色材质
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -1.0, -1.0, 0.0,
    1.0, -1.0, 0.0,
    1.0, 1.0, 0.0,
    // 第二个三角形
    -1.0, -1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0,
  ]);
  geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      // u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_time: { value: 0.0 },
    },
    vertexShader: `
      uniform vec2 u_resolution;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    // 随时间变化的颜色
    fragmentShader: `
        uniform float u_time;
        void main() {
            vec3 color = vec3(0.5 + 0.5 * cos(u_time), 0.5 + 0.5 * sin(u_time), 0.5);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
  });
  const triangle = new THREE.Mesh(geometry, material);
  triangle.scale.set(100, 100, 100);
  // 双面显示
  triangle.material.side = THREE.DoubleSide;
  scene.add(triangle);
};

// 延时函数
const sleep = (time) => {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, time);
  });
};

// 创建shader材质
function getShaderMaterial() {
  // attribute:attribute关键字一般用来声明与顶点数据有关变量。
  // attribute vec3 pos:表示用attribute声明了一个变量pos，attribute的作用就是指明pos是顶点相关变量，pos的数类型是三维向量vec3，三维向量vec3意味着pos表示的顶点数据有x、y、z三个分量。
  const shader = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2() },
    },
    vertexShader: /*glsl*/ `
          // 顶点着色器
          void main(void){
            // 处理定点数据
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); // 顶点坐标
          }
        `, // 顶点着色器:定义如何处理3D模型的顶点。
    fragmentShader: /*glsl*/ `
      // 片元着色器
      uniform float time; // 时间
      // 随机数生成函数
      float random (in vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233)))*43758.5453123); // 生成随机数
      }
      // 主函数

      void main(){
        // 颜色随机变化
        vec3 color = vec3(random(gl_FragCoord.xy), random(gl_FragCoord.xy), random(gl_FragCoord.xy)); // 随机颜色
        gl_FragColor = vec4(color, 1.0); // 片元颜色
      }
    `, // 片元着色器:负责处理每一个像素的颜色和光照等效果。
  });
  return shader;
}

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
  console.log(scene);
  // addMesh(); // 添加立方体
  createLine(); // 创建线
  // createTriangle(); // 创建三角形
  // addSprite(); // 添加sprite精灵
  // 左键点击事件
  container.value.addEventListener("click", clickScene, false);
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
    const frameT = clock.getDelta();
    shaderMaterial.uniforms.u_time.value = clock.getElapsedTime();

    // 更新播放器相关的时间
    if (mixer) {
      mixer.update(frameT); // 更新动画
    }

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

.animate-slider {
  position: absolute;
  bottom: 0;
  left: 0;
  // z-index: 2;
  width: 100%;
  height: 100px;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;

  .el-slider {
    width: 50%;
  }

  .select {
    margin: 0 10px;
  }

  .el-button {
    margin: 0 10px;
  }

  .circle {
    background-color: #fff;
    border: 2px solid #0f0;
    z-index: 3;
  }
}
</style>
