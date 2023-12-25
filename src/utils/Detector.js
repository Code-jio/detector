import * as THREE from 'three';
import Stats from 'three/examples/js/libs/stats.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { random } from '@/utils/tools.js';

// 创建性能检测器：
/**
 * @class Detector
 * @description 3D场景检测器
 * @param { Object } option 配置项
 */
class Detector {
  camera = null; // 相机
  scene = null; // 场景
  renderer = null; // 渲染器
  stats = null; // 性能监视器
  viewCircle = {}; // 视点圆
  frustum = null; // 视锥体
  controls = null; // 控制器
  GLTFLloader = new GLTFLoader(); // 创建模型加载器
  clock = new THREE.Clock(); // 创建时钟对象Clock
  raycaster = new THREE.Raycaster(); // 创建射线
  mouse = new THREE.Vector2(); // 创建鼠标向量
  camera_frustum = null; // 视锥体相机
  sceneInfo = {
    side_num: 0, // 面数
    material_num: 0, // 材质数
    texture_num: 0, // 贴图数
    mesh_num: 0, // 网格数
  }; // 场景信息
  mixers = []; // 动画播放器数组

  constructor() {}

  /**
   * 创建性能监视器
   * @param { Object } Dom DOM节点
   * @returns
   */
  createStats(Dom) {
    this.stats = new Stats(); // 创建性能监视器
    this.stats.showPanel(0, 1, 2); // 0: fps:帧率, 1: ms:渲染时间, 2: mb:内存占用
    Dom.appendChild(this.stats.dom); // 将性能监视器添加到页面中
    return this.stats;
  }

  /**
   * 创建渲染器
   * @param {Object} dom DOM object
   * @param {Object} option 配置项
   * @returns
   */
  createRender(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true, // 开启硬件反走样
      alpha: true, // 背景透明
      precision: 'highp', // 着色精度选择
      powerPreference: 'high-performance', // 高性能模式-优先使用GPU
    }); // 创建渲染器
    this.renderer.gammaOutput = true; // 设置输出为sRGB格式
    this.renderer.physicallyCorrectLights = true; // 设置光照正确性
    this.renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比 作用：防止高分屏下模糊
    this.renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    this.renderer.logarithmicDepthBuffer = true;
    return this.renderer;
  }

  /**
   * 创建透视相机
   * @param { Object } option 相机配置项
   * @returns { Object } camera 相机
   */
  createPerspectiveCamera(option) {
    console.log(option);
    const { fov, aspect, near, far, position } = option;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far); // 创建相机

    // this.camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
    this.camera.updateProjectionMatrix(); // 更新相机投影矩阵
    this.camera.position.copy(position); // 设置相机位置

    return this.camera;
  }

  /**
   * 创建正交相机
   * @param { Object } option 相机配置项
   * @returns
   */
  createOrthographicCamera(option) {
    const { left, right, top, bottom, near, far, position } = option;
    this.camera = new THREE.OrthographicCamera(
      left,
      right,
      top,
      bottom,
      near,
      far
    ); // 创建相机

    this.camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
    this.camera.updateProjectionMatrix(); // 更新相机投影矩阵

    this.camera.position.x = position[0];
    this.camera.position.y = position[1];
    this.camera.position.z = position[2];
    return this.camera;
  }

  /**
   * 创建场景
   * @param { Object } options 场景配置项
   * @returns
   */
  createScene(options) {
    const { color, fog } = options;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(color);
    // this.scene.fog = new THREE.Fog(...fog);
    return this.scene;
  }

  /**
   * 创建轨道控制器
   * @param {Object} camera 相机
   * @param {Object} canvas DOM object
   * @returns
   */
  createOrbitControls(camera, canvas) {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; // 启用阻尼效果
    controls.dampingFactor = 0.3; // 阻尼系数
    controls.enableZoom = true; // 启用缩放
    controls.autoRotate = false; // 关闭自动旋转
    controls.enablePan = true; // 启用平移
    controls.enableRotate = true; // 启用旋转
    controls.rotateSpeed = 0.5; // 旋转速度
    controls.zoomSpeed = 1.2; // 缩放速度
    controls.panSpeed = 0.1; // 平移速度
    controls.minDistance = 1; // 最小缩放距离
    controls.maxDistance = 100000; // 最大缩放距离
    controls.minPolarAngle = 0; // 最小仰角
    controls.maxPolarAngle = Math.PI; // 最大仰角
    controls.minAzimuthAngle = -Infinity; // 最小方位角
    controls.maxAzimuthAngle = Infinity; // 最大方位角
    controls.screenSpacePanning = false; // 屏幕空间平移
    controls.maxZoom = Infinity; // 最大缩放
    controls.minZoom = 0; // 最小缩放
    controls.enableKeys = true; // 启用键盘控制
    controls.keys = {
      LEFT: 37, // 左键
      UP: 38, // 上键
      RIGHT: 39, // 右键
      BOTTOM: 40, // 下键
    };
    controls.target.set(0, 0, 0); // 设置控制器的焦点
    controls.update(); // 更新控制器

    return controls;
  }

  /**
   * 创建光源
   * @param { Object } options 光源配置项
   * @returns
   */
  createLight(options) {
    const { color, intensity, position } = options;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    return light;
  }

  /**
   *  创建环境光
   * @param { Object } options 环境光配置项
   * @returns
   */
  createAmbientLight(options) {
    const { color, intensity } = options;
    const light = new THREE.AmbientLight(color, intensity);
    return light;
  }

  /**
   * 创建点光源
   * @param { Object } options 点光源配置项
   * @returns
   */
  createPointLight(options) {
    const { color, intensity, position } = options;
    const light = new THREE.PointLight(color, intensity);
    light.position.set(...position);
    return light;
  }

  /**
   * 创建视锥体
   * @param { Object } option 视锥体配置项
   * @returns { Object } frustum: 视锥体, camera_frustum: 视锥体相机
   */
  createFrustum(option) {
    this.scene.children.forEach((item) => {
      if (item.name === 'CameraHelper') {
        this.removeEntity(item);
      }
    });
    this.frustum = new THREE.Frustum(); // 创建视锥体
    // console.log('createFrustum', option);
    // 创建camerahelper
    // 附属相机默认指向 Z 轴负方向，上方向指向 Y 轴正方向
    this.camera_frustum = this.createPerspectiveCamera({
      fov: option.fov,
      aspect: option.height / option.width,
      near: option.ClippingPlane[0],
      far: option.ClippingPlane[1],
      position: this.camera.position,
    }); // 创建相机  视角、长宽比、近裁剪面、远裁剪面

    this.camera_frustum.rotation.copy(this.camera.rotation);
    this.camera_frustum.updateMatrixWorld(); // 更新相机的世界坐标矩阵

    // 创建helper
    const helper = new THREE.CameraHelper(this.camera_frustum);
    helper.name = 'CameraHelper';
    this.scene.add(helper);

    this.frustum.setFromMatrix(
      new THREE.Matrix4().multiplyMatrices(
        this.camera_frustum.projectionMatrix,
        this.camera_frustum.matrixWorldInverse
      )
    );

    return { frustum: this.frustum, camera_frustum: this.camera_frustum };
  }

  /**
   * 创建视点圆
   * @param {Number} radius
   */
  createViewCircle(radius) {
    // 渲染该圆
    let geometry = new THREE.SphereGeometry(radius, 32, 16); // 创建球体几何体: 参数：半径、水平分段数、垂直分段数
    // 设置透明材质
    let material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
    });

    let mesh = new THREE.Mesh(geometry, material);

    // mesh.rotation.x = -Math.PI / 2; // 设置圆形几何体旋转角度
    mesh.position.set(0, 0, 0);
    // 设置id
    mesh.name = 'ViewCircle';
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * 移除实体
   * @param {Object} entity
   */
  removeEntity(entity) {
    // 递归遍历组对象group释放所有后代网格模型绑定几何体占用内存
    entity.traverse(function (obj) {
      if (obj.type === 'Mesh') {
        // 释放几何体所占用的内存
        if (obj.geometry) {
          obj.geometry.dispose();
          obj.geometry = null;
        }
        // 释放材质所占用的内存
        if (obj.material) {
          // 修复合并渲染之后释放材质内存出错的bug
          if (obj.material instanceof Array) {
            obj.material.forEach((item) => {
              if (item) {
                item.dispose();
              }
            });
          } else {
            obj.material.dispose();
          }
          obj.material = null;
        }
      }
    });
    // 删除场景对象scene的子对象group
    this.scene.remove(entity);
    entity = null; // 删除变量group
  }

  /**
   *  搜索实体
   * @param { String } name
   * @returns { Object } entity
   */
  searchEntityByName(name) {
    let entity = null;
    this.scene.children.forEach((item) => {
      if (item.name === name) {
        entity = item;
      }
    });
    return entity;
  }

  /**
   * 创建螺旋曲线
   * @returns { Object } path: 路径, start: 起点, end: 终点
   */
  createRandomCurve() {
    const points = [];
    // 创建一系列三位向量，使每条曲线所在位置不同
    for (let i = 0; i < 100; i++) {
      points.push(
        new THREE.Vector3(
          Math.sin(i * 0.2) * 10 + 5,
          Math.cos(i * 0.2) * 10 + 5,
          // i * Math.random() * 0.2
          i * 0.2
        )
      );
    }
    // 三维样条曲线
    const path = new THREE.CatmullRomCurve3([...points]);
    // 首尾两点
    const start = points[0];
    const end = points[points.length - 1];
    // console.log(path);
    return { path, start, end };
  }

  /**
   * 创建网格
   * @param { Number } size
   * @param { Number } divisions
   * @returns { Object } gridHelper
   */
  createGridHelper(size, divisions) {
    const gridHelper = new THREE.GridHelper(size, divisions);
    gridHelper.name = 'gridHelperHelper';
    gridHelper.material.opacity = 0.2; // 设置网格透明度
    gridHelper.material.transparent = true; // 设置网格透明度
    gridHelper.position.y = 0; // 设置网格位置
    gridHelper.position.x = 0; // 设置网格位置
    gridHelper.position.z = 0; // 设置网格位置
    // gridHelper.visible = true; // 设置网格是否可见
    gridHelper.material.depthTest = true; // 设置网格材质是否深度测试
    // gridHelper.renderOrder = -1; // 设置网格渲染顺序
    return gridHelper;
  }

  /**
   * 创建坐标轴辅助
   * @param { Number } size
   * @returns { Object } axesHelper
   */
  createAxesHelper(size) {
    const axesHelper = new THREE.AxesHelper(size);

    axesHelper.name = 'AxesHelper';
    return axesHelper;
  }

  /**
   * 创建默认场景
   * @param {Object} param0
   */
  createDefaultScene({ state, container }) {
    // 初始化
    this.camera = this.createPerspectiveCamera({
      fov: 45,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 10000,
      position: {
        x: 100,
        y: 100,
        z: 100,
      },
    });
    // 创建场景
    this.scene = this.createScene({
      color: 0xffffff,
      fog: { color: 0xffffff, near: 0.1, far: 1000 },
    });
    // 创建性能监视器
    this.stats = this.createStats(state);
    // 创建渲染器
    this.renderer = this.createRender(container);
    // 创建控制器
    this.controls = this.createOrbitControls(this.camera, container);

    // // 创建环境光
    this.light = this.createAmbientLight({ color: 0xffffff, intensity: 0.7 });
    this.scene.add(this.light);

    // console.log(r1, r2);
    // 创建网格
    this.grid = this.createGridHelper(1000, 100);
    this.scene.add(this.grid);
    // 创建坐标轴
    this.axesHelper = this.createAxesHelper(1000);
    this.scene.add(this.axesHelper);
    // console.log(detector, camera, scene, renderer,);

    // 监听窗口变化
    // if (resize) {
    //   window.addEventListener('resize', () => {
    //     this.camera.aspect = window.innerWidth / window.innerHeight; // 设置相机长宽比
    //     this.camera.updateProjectionMatrix(); // 更新相机投影矩阵
    //     this.renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器尺寸
    //     this.renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比：最小值为2
    //   });
    // }

    // 渲染函数
    const render = () => {
      this.stats.update();
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  /**
   * 通过射线改变实体颜色
   * @param {Object} event 事件对象
   * @returns {Object} intersects: 射线焦点数组, obj: 焦点对象
   */
  changeColorByRay(event) {
    // 1.计算鼠标点击位置
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // 计算鼠标点击位置x
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // 计算鼠标点击位置y

    // 2.设置射线的起点和方向
    this.raycaster.setFromCamera(this.mouse, this.camera); // 设置射线的起点和方向

    // 3.计算射线和模型的焦点
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    ); // 计算射线和模型的焦点

    if (intersects.length === 0) return;
    const obj = intersects[0].object; // 获取焦点对象
    console.log(obj);
    if (obj.type === 'Mesh') {
      // 如果焦点对象是网格模型
      // obj.material.color.set(Math.random() * 0xffffff); // 设置焦点对象的颜色

      // 如果焦点对象是合并渲染的网格模型，判断选中的是其中哪一个
      if (obj.geometry instanceof THREE.BufferGeometry) {
        // 根据焦点对象的face确定选中的是哪一个对象
        const face = intersects[0].face; // 获取焦点对象的face
        let a = face.a; // 获取焦点对象的face的a点
        // 根据group判断具体选中了哪一个
        console.log(obj);

        // 现有机制下：如果bufferGeometry材质共享的话，则该对象仅有两种材质，且材质索引为0和1
        // 材质不共享
        if (obj.material.length !== 2) {
          for (let i = 0; i < obj.geometry.groups.length; i++) {
            const item = obj.geometry.groups[i];
            if (a >= item.start && a <= item.start + item.count) {
              // console.log(
              //   '选中了第' + i + '个,',
              //   `且选中的是第${a - item.start}个面,对应的材质索引是${
              //     item.materialIndex
              //   }`
              // );
              obj.material[item.materialIndex].color.set(
                Math.random() * 0xffffff
              ); // 设置焦点对象的颜色
            }
          }
        } else {
          // 如果bufferGeometry材质共享
          obj.material[0].color.set(Math.random() * 0xffffff); // 设置焦点对象的颜色
        }
      } else {
        obj.material.color.set(Math.random() * 0xffffff); // 设置焦点对象的颜色
      }
    } else if (obj.type === 'Sprite') {
      // 如果焦点对象是精灵
      obj.material.color.set(Math.random() * 0xffffff); // 设置焦点对象的颜色
    }
  }

  /**
   * 通过射线删除实体
   * @param {Object} intersects 射线焦点数组
   */
  removeEntityByRay(event) {
    // 1.计算鼠标点击位置
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // 计算鼠标点击位置x
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // 计算鼠标点击位置y

    // 2.设置射线的起点和方向
    this.raycaster.setFromCamera(this.mouse, this.camera); // 设置射线的起点和方向

    // 3.计算射线和模型的焦点
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    ); // 计算射线和模型的焦点

    if (intersects.length === 0) return;
    // 判断焦点是否存在
    const obj = intersects[0].object; // 获取焦点对象
    console.log(obj);
    // 如果是普通mesh对象,则直接删除,如果是合并渲染的mesh对象,则删除对应的group
    if (obj.type === 'Mesh') {
      if (obj.geometry instanceof THREE.BufferGeometry) {
        // 如果焦点对象是合并渲染的网格模型，判断选中的是其中哪一个
        const face = intersects[0].face; // 获取焦点对象的face
        let a = face.a; // 获取焦点对象的face的a点

        // 根据group判断具体选中了哪一个
        for (let i = 0; i < obj.geometry.groups.length; i++) {
          const item = obj.geometry.groups[i];
          if (a >= item.start && a <= item.start + item.count) {
            // console.log("选中了第" + i + "个,", `且选中的是第${a - item.start}个面,对应的材质索引是${item.materialIndex}`);

            // 删除对应的group
            obj.geometry.groups.splice(i, 1);
            obj.geometry.groupsNeedUpdate = true;

            // 如果group全部删除,则删除整个mesh
            if (obj.geometry.groups.length === 0) {
              this.removeEntity(obj);
              // 删除完毕后,跳出循环
              break;
            }
          }
        }
      } else {
        this.removeEntity(obj);
      }
    } else if (obj.type === 'Sprite') {
      // 如果焦点对象是精灵
      this.removeEntity(obj);
    }
  }

  /**
   * 清空场景
   * @returns {Object} object
   */
  clearAll() {
    // 查找所有的mesh、sprite、scene对象
    let item = this.scene.children.find(
      (item) =>
        item.type === 'Mesh' || item.type === 'Sprite' || item.type === 'Scene'
    );
    if (item) {
      this.removeEntity(item);
      this.scene.dispose();
      this.clearAll();
    } else {
      return;
    }
  }

  /**
   * 展现页面渲染信息
   * @param {Object} dom 页面元素
   */
  showRenderPannel(dom) {
    // 输入dom元素，是页面中呈现出对应组件
    dom.innerHTML = `
      <div class="render-pannel">
        <div class="render-pannel__title">
          <span>渲染信息</span>
          <span class="render-pannel__title__close">X</span>
        </div>
        <div class="render-pannel__content">
          <div class="render-pannel__content__item">
            <span>面数：</span>
            <span>${this.sceneInfo.side_num}</span>
          </div>
          <div class="render-pannel__content__item">
            <span>材质数：</span>
            <span>${this.sceneInfo.material_num}</span>
          </div>
          <div class="render-pannel__content__item">
            <span>贴图数：</span>
            <span>${this.sceneInfo.texture_num}</span>
          </div>
          <div class="render-pannel__content__item">
            <span>网格数：</span>
            <span>${this.sceneInfo.mesh_num}</span>
          </div>
        </div>
      </div>
    `;

    // 关闭按钮
    const closeBtn = dom.querySelector('.render-pannel__title__close');
    closeBtn.addEventListener('click', () => {
      dom.innerHTML = '';
    });
  }

  /**
   * 创建管道几何体
   * @param { Object } params 管道几何体参数
   * @param { Array } path 路径
   * @returns { Object } geometry: 几何体, material: 材质
   */
  createTubeGeometry(params, path) {
    const { radius, radialSegments, tubularSegments, closed = false } = params;
    const geometry = new THREE.TubeGeometry(
      path,
      tubularSegments,
      radius,
      radialSegments,
      closed
    );
    const material = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load(params.material),
    });
    return { geometry, material };
  }

  /**
   * 创建挤压几何体
   * @param { Object } params 挤压几何体参数
   * @returns { Object } geometry: 几何体, material: 材质
   */
  createExtrudeGeometry(params) {
    let shape = new THREE.Shape(); //创建一个形状

    // 创建点集生成正N边形
    let n = params.edgeNum; // 边数
    let r = 10; // 半径
    let angle = (360 / n / 180) * Math.PI; // 每个角度
    let x = r * Math.sin(angle); // x坐标
    let y = r * Math.cos(angle); // y坐标
    let h = Math.sqrt(Math.pow(r, 2) - Math.pow(x / 2, 2)); // 高度
    shape.moveTo(x, y); // 设置起点

    for (let i = 0; i < n; i++) {
      shape.lineTo(x, y); // 连线
      x = r * Math.sin(angle * (i + 1)); // x坐标
      y = r * Math.cos(angle * (i + 1)); // y坐标
      shape.lineTo(x, y); // 连线
    }
    // console.log(params);
    let extrudeSettings = {
      depth: params.depth, // 拉伸长度
      bevelEnabled: true, // 斜角
      bevelSegments: params.bevelSegments, //斜角分段数
      steps: params.steps, // 拉伸分段数
      bevelSize: params.bevelSize, // 斜角长度
      bevelThickness: params.bevelThickness, // 斜角高度
    };

    let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings); //拉伸造型
    let material = new THREE.MeshPhongMaterial({
      color: Math.random().toFixed(6) * 0xffffff,
    }); //材质对象Material
    // let mesh = new THREE.Mesh(geometry, material); //网格模型对象Mesh
    return { geometry, material };
  }

  /**
   * 创建精灵材质
   * @param { Object } params 精灵材质参数
   * @returns { Object } material: 材质
   */
  createSpriteMaterial(params) {
    let material;
    // 创建图片纹理
    if (params.type === '图片纹理') {
      // console.log(params);
      // 创建图片对象==》修改图片分辨率==》加载图片纹理
      let img = new Image();
      img.src = params.image.url;
      img.width = params.resolution.value;
      img.height = params.resolution.value;

      let texture = new THREE.TextureLoader().load(img.src, (texture) => {
        // console.log(texture);
        texture.needsUpdate = true;
      }); // 加载贴图
      material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      // // 释放纹理
      // texture.dispose();

      // 创建颜色纹理
    } else if (params.type === '颜色纹理') {
      material = new THREE.SpriteMaterial({
        color: params.color,
      });
      // 创建canvas纹理
    } else if (params.type === '自定义Canvas') {
      const canvas = document.createElement('canvas');
      canvas.width = params.width;
      canvas.height = params.height;
      const c = canvas.getContext('2d');

      c.fillStyle = params.color;
      c.fillRect(0, 0, params.width, params.height); // 绘制矩形：左上角坐标(0,0)，宽高(256,256)
      c.beginPath(); // 文字
      // c.translate(256, 64); // 变换：平移至(256,64)
      c.fillStyle = '#000000'; // 文本填充颜色
      c.font = 'bold 48px 宋体'; // 字体样式设置
      c.textBaseline = 'middle'; // 文本与fillText定义的纵坐标
      c.textAlign = 'center'; // 文本居中(以fillText定义的横坐标)
      c.fillText('自定义Canvas', params.width / 2, params.height / 2); // 文本填充内容，坐标为(0,0)

      material = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
      });
    }
    return material;
  }

  /**
   * 创建立方体
   * @returns { Object } geometry: 几何体, material: 材质
   */
  createGeometry() {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    // 材质设置为随机颜色
    const material = new THREE.MeshPhongMaterial({
      // 随机颜色
      color: Math.random().toFixed(6) * 0xffffff,
    });

    // const cube = new THREE.Mesh(geometry, material);
    return { geometry, material };
  }

  /**
   * 更新视锥体
   * @param {Object} params
   * @returns { Object } frustum: 视锥体
   */
  updateFrustum(params) {
    // 更新视锥体
    this.scene.children.forEach((item) => {
      if (item.name === 'CameraHelper') {
        this.removeEntity(item);
      }
    });
    this.frustum = this.createFrustum(params).frustum; // 创建视锥体对象
    return this.frustum;
  }

  /**
   * 创建shader透明材质
   * @returns { Object } material: 材质
   */
  createShaderMaterial() {
    // 顶点着色器程序
    const vertexShader = `
      void main(){
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `;
    // 片元着色器程序
    const fragmentShader = `
      void main(){
        gl_FragColor = vec4(0.0,0.0,0.0,0.0);
      }
    `;
    // 创建材质对象
    const material = new THREE.ShaderMaterial({
      uniforms: {}, // uniform属性对象
      vertexShader, // 顶点着色器程序
      fragmentShader, // 片元着色器程序
      transparent: true, // 开启透明效果
    });
    return material;
  }

  /**
   * 创建普通高光材质
   * @returns { Object } material: 材质
   */
  createPhongMaterial() {
    // 创建材质对象
    const material = new THREE.MeshPhongMaterial({
      color: 0x0000ff, //三角面颜色
      specular: 0x4488ee, //高光部分的颜色
      shininess: 12, //高光部分的亮度，默认30
    });
    return material;
  }

  /**
   * 更新视点球
   * @param { Number } radius
   */
  updateViewCircle(radius) {
    this.viewCircle.radius = radius;
    this.scene.traverse((item) => {
      if (item.name === 'ViewCircle') {
        item.geometry = new THREE.SphereGeometry(radius, 32, 16);
        console.log(item);
      }
    });
  }

  /**
   * 改变控制器
   * @param {Object} params 控制器参数
   */
  changeControl(params) {
    if (params.value === '视锥体控制器') {
      // 找到name为ViewCircle的网格对象 删除该对象
      this.scene.children.forEach((item) => {
        if (item.name === 'ViewCircle') {
          this.removeEntity(item);
        }
      });
      // 创建视锥体
      this.createFrustum(params.Frustum);
    } else if (params.value === '视点控制器') {
      // 删除视锥体
      this.scene.children.forEach((item) => {
        if (item.name === 'CameraHelper') {
          this.removeEntity(item);
        }
      });
      this.createViewCircle(params.radius); // 创建视点球
    } else if (params.value === '正常渲染') {
      // 清除视点球，清除视锥体
      this.scene.children.forEach((item) => {
        if (item.name === 'CameraHelper' || item.name === 'ViewCircle') {
          this.removeEntity(item);
        }
        // 恢复所有模型的可见性
        if (item.type === 'Mesh') {
          item.visible = true;
        }
      });
    }
  }

  /**
   * 通过名称删除模型
   * @param {String } modelName
   */
  removeEntityByName(modelName) {
    // 查找是否有同名模型
    let model = this.scene.children.find((item) => item.name === modelName);
    if (model) {
      this.removeEntity(model);
      this.removeEntityByName(modelName);
    } else {
      return;
    }
  }

  /**
   * 加载GLTF模型
   * @param {Object} params
   * @returns {Object} gltf
   */
  addGLTFModel(params) {
    this.GLTFLloader.load(
      params.url,
      async (gltf) => {
        gltf.scene.name = params.name; // 设置模型名称
        gltf.scene.scale.set(params.scale, params.scale, params.scale); // 设置模型缩放

        gltf.scene.position.set(random(-1000, 1000), 0, random(-1000, 1000));

        // 材质共享
        if (params.isShare) {
          // 找到同名模型,如果存在同名模型，则将同名模型的各个mesh的材质取出压入栈中，再逐一取出赋值给新模型  ===> 实现同名模型共享材质
          let sameNameModel = this.scene.children.find(
            (item) => item.name === params.name
          );
          // 找到同名模型后，即可认为这两个模型是同一模型，所以递归时的次序应该也会相同，所以可以直接递归遍历两个模型的mesh，然后逐一取出，逐一赋值
          if (sameNameModel) {
            // 取出材质和对应的uuid值
            let materialList = [];
            sameNameModel.traverse((item) => {
              if (item.isMesh) {
                materialList.push(item.material);
              }
            });

            // 将新模型的材质替换成同名模型的材质
            gltf.scene.traverse((item) => {
              if (item.isMesh) {
                // 逆序取出材质
                item.material = materialList.pop();
              }
            });
          }
        }
        this.scene.add(gltf.scene);
        const mixer = new THREE.AnimationMixer(gltf.scene); // 创建动画播放器
        this.mixers.push(mixer); // 将动画播放器压入栈中
        // 如果需要渲染的目标模型参数中包含了需要渲染的动画，那就从gltf对象中找出对应的动画并渲染它
        if (params.currentCartoon === '自旋转') {
          const animation = new TWEEN.Tween(gltf.scene.rotation)
            .to(
              {
                y: Math.PI * random(2, 5),
              },
              random(1000, 2000)
            )
            .repeat(Infinity)
            .start();
        } else if (params.currentCartoon === '自由运动') {
          const animation = new TWEEN.Tween(gltf.scene.position)
            .to(
              {
                x: random(-1000, 1000),
                y: 0,
                z: random(-1000, 1000),
              },
              random(1000, 2000)
            )
            .repeat(Infinity)
            .start();
        } else {
          gltf.animations.forEach((item) => {
            if (item.name === params.currentCartoon) {
              mixer.clipAction(item).play(); // 播放动画
            }
          });
        }
      },
      null,
      (e) => {
        console.log('加载失败', e);
      }
    );
  }

  /**
   * 管道首尾相连
   * @param {Object} connextParams
   * @param {Object} tubeSettings
   * @returns {Array} meshList
   */
  tubeClosed(connextParams, tubeSettings) {
    let pointList = [];
    let meshList = [];
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
        )
      ); // 添加第i个起点
      pointList.push(
        new THREE.Vector3(
          dx + connextParams.endList[i].x,
          dy + connextParams.endList[i].y,
          dz + connextParams.endList[i].z
        )
      ); // 添加第i个终点
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

      let texture = new THREE.TextureLoader().load(require('@/assets/1.jpg')); // 加载贴图
      let material = new THREE.MeshPhongMaterial({
        map: texture,
      }); // 材质对象Material

      let mesh = new THREE.Mesh(geometry, material); // 网格模型对象Mesh
      meshList.push(mesh);
    }
    return meshList;
  }
}

export default new Detector();
