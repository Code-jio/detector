<template>
  <div class="model-view-container">
    <div class="model-controls">
      <h3>模型文件列表</h3>
      <div class="model-list">
        <div 
          v-for="(file, index) in modelFiles" 
          :key="index"
          class="model-item"
          :class="{ active: currentModelIndex === index }"
          @click="loadModel(index)"
        >
          <span class="model-name">{{ getModelName(file) }}</span>
          <span class="model-status" :class="modelStatus[index]">
            {{ getStatusText(modelStatus[index]) }}
          </span>
        </div>
      </div>
      
      <div class="view-controls">
        <h4>视图控制</h4>
        <button @click="resetCamera" class="control-btn">重置视角</button>
        <button @click="toggleWireframe" class="control-btn">
          {{ showWireframe ? '关闭' : '开启' }}线框
        </button>
        <button @click="toggleAutoRotate" class="control-btn">
          {{ autoRotate ? '停止' : '开始' }}旋转
        </button>
      </div>
    </div>
    
    <div class="model-viewer" ref="modelViewer">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>正在加载模型...</p>
      </div>
      
      <div v-if="error" class="error-overlay">
        <p>{{ error }}</p>
        <button @click="retryLoad" class="retry-btn">重试</button>
      </div>
      
      <div class="model-info" v-if="currentModel">
        <h4>当前模型信息</h4>
        <p>文件名: {{ currentModel.name }}</p>
        <p>顶点数: {{ currentModel.vertices || 'N/A' }}</p>
        <p>面数: {{ currentModel.faces || 'N/A' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default {
  name: 'ModelView',
  data() {
    return {
      modelFiles: [],
      currentModelIndex: -1,
      currentModel: null,
      loading: false,
      error: null,
      showWireframe: false,
      autoRotate: false,
      
        // Three.js 相关
       scene: null,
       camera: null,
       renderer: null,
       controls: null,
       gltfLoader: null,
       dracoLoader: null,
       currentMesh: null,
      
             // 模型状态
       modelStatus: reactive({}) // 'loading', 'loaded', 'error'
    };
  },
  
  mounted() {
    this.initThreeJS();
    this.loadModelFiles();
  },
  
  beforeUnmount() {
    this.cleanup();
  },
  
  methods: {
    async loadModelFiles() {
      try {
        const response = await fetch('/model-files.json');
        const data = await response.json();
        this.modelFiles = data.files || [];
        
                 // 初始化模型状态
         this.modelFiles.forEach((_, index) => {
           this.modelStatus[index] = 'idle';
         });
        
        // 自动加载第一个模型
        if (this.modelFiles.length > 0) {
          this.loadModel(0);
        }
      } catch (error) {
        console.error('加载模型文件列表失败:', error);
        this.error = '无法加载模型文件列表';
      }
    },
    
    initThreeJS() {
      const container = this.$refs.modelViewer;
      if (!container) return;
      
      // 创建场景
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf0f0f0);
      
      // 创建相机
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      this.camera.position.set(5, 5, 5);
      
      // 创建渲染器
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(this.renderer.domElement);
      
      // 创建控制器
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      
      // 添加光源
      this.addLighting();
      
             // 创建GLTF加载器（先不设置DRACO，避免初始化错误）
       this.gltfLoader = new GLTFLoader();
       
       // 尝试设置DRACO解码器
       this.setupDracoLoader();
      
      // 开始渲染循环
      this.animate();
      
      // 监听窗口大小变化
      window.addEventListener('resize', this.onWindowResize);
    },
    
         addLighting() {
       // 环境光
       const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
       this.scene.add(ambientLight);
       
       // 主光源
       const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
       directionalLight.position.set(10, 10, 5);
       directionalLight.castShadow = true;
       directionalLight.shadow.mapSize.width = 2048;
       directionalLight.shadow.mapSize.height = 2048;
       this.scene.add(directionalLight);
       
       // 补充光源
       const pointLight = new THREE.PointLight(0xffffff, 0.5);
       pointLight.position.set(-10, 10, -10);
       this.scene.add(pointLight);
     },
     
     setupDracoLoader() {
       try {
         console.log('正在设置DRACO解码器...');
         this.dracoLoader = new DRACOLoader();
         
         // 使用CDN路径，强制使用JavaScript解码器（不使用Worker）
         this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
         this.dracoLoader.setDecoderConfig({ type: 'js' });
         
         // 设置DRACO到GLTF加载器
         this.gltfLoader.setDRACOLoader(this.dracoLoader);
         
         console.log('DRACO解码器设置成功 (JS模式)');
       } catch (error) {
         console.warn('DRACO解码器设置失败:', error);
         // 即使设置失败，也继续使用GLTF加载器，可能会有其他错误处理
       }
     },
    
    async loadModel(index) {
      if (index < 0 || index >= this.modelFiles.length) return;
      
             this.currentModelIndex = index;
       this.loading = true;
       this.error = null;
       this.modelStatus[index] = 'loading';
      
      // 清除当前模型
      if (this.currentMesh) {
        this.scene.remove(this.currentMesh);
        this.currentMesh = null;
      }
      
      try {
        const modelPath = this.modelFiles[index].replace(/\\/g, '/');
        const modelUrl = `/${modelPath}`;
        
        const gltf = await this.loadGLTF(modelUrl);
        
        // 添加模型到场景
        this.currentMesh = gltf.scene;
        this.scene.add(this.currentMesh);
        
        // 计算模型信息
        const box = new THREE.Box3().setFromObject(this.currentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // 居中模型
        this.currentMesh.position.sub(center);
        
        // 调整相机位置
        const maxDim = Math.max(size.x, size.y, size.z);
        const fitHeightDistance = maxDim / (2 * Math.atan(Math.PI * this.camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / this.camera.aspect;
        const distance = Math.max(fitHeightDistance, fitWidthDistance);
        
        this.camera.position.copy(center);
        this.camera.position.z += distance * 1.5;
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        
        // 计算模型统计信息
        let vertices = 0;
        let faces = 0;
        this.currentMesh.traverse((child) => {
          if (child.isMesh) {
            vertices += child.geometry.attributes.position.count;
            faces += child.geometry.index ? child.geometry.index.count / 3 : vertices / 3;
          }
        });
        
                 this.currentModel = {
           name: this.getModelName(this.modelFiles[index]),
           vertices: vertices,
           faces: Math.floor(faces)
         };
         
         this.modelStatus[index] = 'loaded';
         this.loading = false;
        
             } catch (error) {
         console.error('加载模型失败:', error);
         this.error = `加载模型失败: ${error.message}`;
         this.modelStatus[index] = 'error';
         this.loading = false;
       }
    },
    
         loadGLTF(url) {
       return new Promise((resolve, reject) => {
         this.gltfLoader.load(
           url,
           (gltf) => {
             console.log('模型加载成功');
             resolve(gltf);
           },
           (progress) => {
             const percent = progress.total > 0 ? (progress.loaded / progress.total * 100).toFixed(1) : 0;
             console.log('加载进度:', percent + '%');
           },
           (error) => {
             console.error('GLTF加载失败:', error);
             
             // 如果是DRACO相关错误，尝试重新设置DRACO解码器
             if (error.message.includes('DRACO') || error.message.includes('No DRACOLoader')) {
               console.warn('检测到DRACO错误，尝试重新配置解码器...');
               this.retryWithBetterDraco(url).then(resolve).catch(reject);
             } else {
               reject(error);
             }
           }
         );
       });
     },
     
     retryWithBetterDraco(url) {
       return new Promise((resolve, reject) => {
         try {
           // 重新创建一个更简单的DRACO配置
           const newDracoLoader = new DRACOLoader();
           
           // 尝试不同的CDN
           const cdnUrls = [
             'https://unpkg.com/three@latest/examples/jsm/libs/draco/',
             'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/libs/draco/'
           ];
           
           newDracoLoader.setDecoderPath(cdnUrls[0]);
           newDracoLoader.setDecoderConfig({ type: 'js' });
           
           // 创建新的GLTF加载器
           const newGltfLoader = new GLTFLoader();
           newGltfLoader.setDRACOLoader(newDracoLoader);
           
           console.log('使用新的DRACO配置重试加载...');
           newGltfLoader.load(
             url,
             (gltf) => {
               console.log('重试加载成功！');
               resolve(gltf);
             },
             (progress) => {
               const percent = progress.total > 0 ? (progress.loaded / progress.total * 100).toFixed(1) : 0;
               console.log('重试进度:', percent + '%');
             },
             (retryError) => {
               console.error('重试也失败了:', retryError);
               reject(retryError);
             }
           );
           
         } catch (setupError) {
           console.error('无法重新设置DRACO:', setupError);
           reject(setupError);
         }
       });
     },
    
    animate() {
      requestAnimationFrame(this.animate);
      
      if (this.controls) {
        this.controls.update();
        this.controls.autoRotate = this.autoRotate;
      }
      
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },
    
    onWindowResize() {
      const container = this.$refs.modelViewer;
      if (!container || !this.camera || !this.renderer) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    },
    
    resetCamera() {
      if (this.currentMesh && this.camera && this.controls) {
        const box = new THREE.Box3().setFromObject(this.currentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fitHeightDistance = maxDim / (2 * Math.atan(Math.PI * this.camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / this.camera.aspect;
        const distance = Math.max(fitHeightDistance, fitWidthDistance);
        
        this.camera.position.copy(center);
        this.camera.position.z += distance * 1.5;
        this.camera.lookAt(center);
        this.controls.target.copy(center);
      }
    },
    
    toggleWireframe() {
      this.showWireframe = !this.showWireframe;
      if (this.currentMesh) {
        this.currentMesh.traverse((child) => {
          if (child.isMesh) {
            child.material.wireframe = this.showWireframe;
          }
        });
      }
    },
    
    toggleAutoRotate() {
      this.autoRotate = !this.autoRotate;
    },
    
    retryLoad() {
      if (this.currentModelIndex >= 0) {
        this.loadModel(this.currentModelIndex);
      }
    },
    
    getModelName(filePath) {
      return filePath.split('\\').pop().split('/').pop().replace('.gltf', '');
    },
    
    getStatusText(status) {
      switch (status) {
        case 'loading': return '加载中...';
        case 'loaded': return '已加载';
        case 'error': return '加载失败';
        default: return '未加载';
      }
    },
    
         cleanup() {
       if (this.renderer) {
         this.renderer.dispose();
       }
       if (this.controls) {
         this.controls.dispose();
       }
       if (this.dracoLoader) {
         this.dracoLoader.dispose();
       }
       window.removeEventListener('resize', this.onWindowResize);
     }
  }
};
</script>

<style scoped>
.model-view-container {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.model-controls {
  width: 300px;
  background: white;
  padding: 20px;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.model-controls h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.model-list {
  margin-bottom: 30px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.model-item:hover {
  background: #e9ecef;
  transform: translateX(5px);
}

.model-item.active {
  background: #007bff;
  color: white;
}

.model-name {
  font-weight: 500;
  flex: 1;
}

.model-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: #6c757d;
  color: white;
}

.model-status.loading {
  background: #ffc107;
  color: #000;
}

.model-status.loaded {
  background: #28a745;
}

.model-status.error {
  background: #dc3545;
}

.view-controls h4 {
  color: #333;
  margin-bottom: 15px;
}

.control-btn {
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.control-btn:hover {
  background: #0056b3;
}

.model-viewer {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.loading-overlay, .error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-overlay p {
  color: #dc3545;
  margin-bottom: 20px;
  text-align: center;
}

.retry-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #0056b3;
}

.model-info {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.model-info h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
}

.model-info p {
  margin: 5px 0;
  color: #666;
  font-size: 14px;
}
</style>
