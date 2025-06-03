<template>
  <div class="webxr-container">
    <div ref="threeContainer" class="three-container"></div>
    <div class="controls" v-if="!isVRMode">
      <button @click="enterVR" :disabled="!vrSupported" class="vr-button">
        {{ vrSupported ? '进入VR' : 'VR不支持' }}
      </button>
      <div class="info">
        <div class="info-section">
          <h4>🎮 场景状态</h4>
          <p>立方体数量: {{ cubeCount }}</p>
          <p>FPS: {{ fps }}</p>
          <p v-if="hoveredCube">🎯 悬停中</p>
          <p>控制器: {{ controllers.length }} 个已连接</p>
        </div>
        
        <div class="info-section">
          <h4>📊 场景统计</h4>
          <p>🔺 顶点: {{ formatNumber(sceneStats.vertices) }}</p>
          <p>📏 边: {{ formatNumber(sceneStats.edges) }}</p>
          <p>🔷 面: {{ formatNumber(sceneStats.faces) }}</p>
          <p>🧊 网格: {{ sceneStats.meshes }}</p>
          <p>🎨 材质: {{ sceneStats.materials }}</p>
          <p>🖼️ 纹理: {{ sceneStats.textures }}</p>
        </div>
        
        <div class="info-section">
          <h4>⚡ 性能指标</h4>
          <p>复杂度: {{ getComplexityLevel() }}</p>
          <p>渲染负载: {{ getRenderLoad() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import { markRaw } from 'vue'

export default {
  name: 'WebXRTest',
  data() {
    return {
      // 场景相关
      scene: null,
      camera: null,
      renderer: null,
      
      // VR相关
      isVRMode: false,
      vrSupported: false,
      
      // 立方体相关
      cubes: [],
      cubeCount: 5000,
      hoveredCube: null,
      
      // VR控制器相关
      controllers: [],
      controllerGrips: [],
      raycasters: [],
      
      // 性能监控
      fps: 0,
      frameCount: 0,
      lastTime: performance.now(),
      
      // 场景统计信息
      sceneStats: {
        vertices: 0,    // 顶点数
        edges: 0,       // 边数  
        faces: 0,       // 面数
        meshes: 0,      // 网格数
        materials: 0,   // 材质数
        textures: 0     // 纹理数
      },
      
               // 动画相关
         animationId: null,
         clock: markRaw(new THREE.Clock())
    }
  },
  
  mounted() {
    this.initThreeJS()
    this.loadSkybox()
    this.createCubes()
    this.setupVR()
    this.setupControllers()
    this.calculateSceneStats()
    this.startAnimation()
  },
  
  beforeUnmount() {
    this.cleanup()
  },
  
  methods: {
    // 初始化Three.js场景
         initThreeJS() {
       try {
         // 创建场景
         this.scene = markRaw(new THREE.Scene())
         
         // 创建相机
         this.camera = markRaw(new THREE.PerspectiveCamera(
           75, 
           window.innerWidth / window.innerHeight, 
           0.1, 
           1000
         ))
         this.camera.position.set(0, 1.6, 3)
         
         // 创建渲染器
         this.renderer = markRaw(new THREE.WebGLRenderer({ 
           antialias: true,
           alpha: true 
         }))
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setPixelRatio(window.devicePixelRatio)
        
        // 新版本Three.js使用outputColorSpace替代outputEncoding
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1
        
        // 添加到DOM
        this.$refs.threeContainer.appendChild(this.renderer.domElement)
        
        // 添加基础光照
        this.addLighting()
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.onWindowResize)
        
      } catch (error) {
        console.error('初始化Three.js失败:', error)
      }
    },
    
    // 添加光照
    addLighting() {
      // 环境光
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
      this.scene.add(ambientLight)
      
      // 方向光
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 10, 5)
      directionalLight.castShadow = true
      this.scene.add(directionalLight)
    },
    
    // 加载HDR天空盒
    async loadSkybox() {
      try {
        const loader = new RGBELoader()
        const texture = await new Promise((resolve, reject) => {
          loader.load(
            '/skybox/rustig_koppie_puresky_4k.hdr',
            resolve,
            undefined,
            reject
          )
        })
        
        texture.mapping = THREE.EquirectangularReflectionMapping
        this.scene.background = texture
        this.scene.environment = texture
        
        console.log('HDR天空盒加载成功')
      } catch (error) {
        console.error('加载HDR天空盒失败:', error)
        // 降级到默认天空盒
        this.createDefaultSkybox()
      }
    },
    
    // 创建默认天空盒（降级方案）
    createDefaultSkybox() {
      const geometry = new THREE.SphereGeometry(500, 60, 40)
      geometry.scale(-1, 1, 1)
      
      const material = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide
      })
      
      const skybox = new THREE.Mesh(geometry, material)
      this.scene.add(skybox)
    },
    
    // 创建立方体群
    createCubes() {
      try {
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
        
        for (let i = 0; i < this.cubeCount; i++) {
          // 随机材质颜色
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(
              Math.random(),
              0.7 + Math.random() * 0.3,
              0.5 + Math.random() * 0.3
            ),
            metalness: Math.random() * 0.8,
            roughness: 0.2 + Math.random() * 0.3
          })
          
          const cube = markRaw(new THREE.Mesh(geometry, material))
          
          // 随机位置
          cube.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
          )
          
          // 随机旋转
          cube.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          )
          
          // 随机运动参数
          cube.userData = {
            velocity: markRaw(new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            )),
            rotationSpeed: markRaw(new THREE.Vector3(
              (Math.random() - 0.5) * 4,
              (Math.random() - 0.5) * 4,
              (Math.random() - 0.5) * 4
            )),
            bounds: 10
          }
          
          this.cubes.push(cube)
          this.scene.add(cube)
        }
        
        console.log(`成功创建${this.cubeCount}个立方体`)
      } catch (error) {
        console.error('创建立方体失败:', error)
      }
    },
    
    // 设置VR支持
    setupVR() {
      try {
        if ('xr' in navigator) {
          navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
            this.vrSupported = supported
            
            if (supported) {
              this.renderer.xr.enabled = true
              
              // 创建VR按钮
              const vrButton = VRButton.createButton(this.renderer)
              vrButton.style.position = 'absolute'
              vrButton.style.bottom = '20px'
              vrButton.style.right = '20px'
              this.$refs.threeContainer.appendChild(vrButton)
            }
          }).catch(error => {
            console.warn('检查VR支持失败:', error)
          })
        }
      } catch (error) {
        console.error('设置VR失败:', error)
      }
    },
    
    // 设置VR控制器
    setupControllers() {
      try {
        const controllerModelFactory = new XRControllerModelFactory()
        
        // 创建两个手柄控制器
        for (let i = 0; i < 2; i++) {
          // 主控制器（用于输入）
          const controller = this.renderer.xr.getController(i)
          controller.addEventListener('selectstart', this.onSelectStart)
          controller.addEventListener('selectend', this.onSelectEnd)
          controller.addEventListener('connected', (event) => {
            this.onControllerConnected(event, i)
          })
          controller.addEventListener('disconnected', (event) => {
            this.onControllerDisconnected(event, i)
          })
          
          this.scene.add(controller)
          this.controllers.push(controller)
          
          // 控制器握把（用于显示手柄模型）
          const controllerGrip = this.renderer.xr.getControllerGrip(i)
          controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip))
          this.scene.add(controllerGrip)
          this.controllerGrips.push(controllerGrip)
          
          // 创建射线投射器
          const raycaster = markRaw(new THREE.Raycaster())
          this.raycasters.push(raycaster)
          
          // 为控制器添加射线可视化
          this.addControllerRay(controller, i)
        }
        
        console.log('VR控制器设置完成')
      } catch (error) {
        console.error('设置VR控制器失败:', error)
      }
    },
    
    // 为控制器添加射线可视化
    addControllerRay(controller, index) {
      // 创建射线线条
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -5)
      ])
      
      const material = new THREE.LineBasicMaterial({
        color: index === 0 ? 0x00ff00 : 0x0000ff,
        transparent: true,
        opacity: 0.8
      })
      
      const rayLine = new THREE.Line(geometry, material)
      rayLine.name = `controller-ray-${index}`
      rayLine.visible = false // 初始隐藏
      controller.add(rayLine)
      
      // 添加射线端点指示器
      const dotGeometry = new THREE.SphereGeometry(0.02, 16, 16)
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x00ff00 : 0x0000ff
      })
      
      const rayDot = new THREE.Mesh(dotGeometry, dotMaterial)
      rayDot.name = `controller-dot-${index}`
      rayDot.visible = false
      this.scene.add(rayDot)
      
      // 将射线点存储在控制器上
      controller.userData.rayDot = rayDot
      controller.userData.rayLine = rayLine
    },
    
    // 控制器连接事件
    onControllerConnected(event, index) {
      console.log(`控制器 ${index} 已连接:`, event.data.gamepad?.id || '未知控制器')
      
      // 显示射线
      const controller = this.controllers[index]
      if (controller.userData.rayLine) {
        controller.userData.rayLine.visible = true
      }
    },
    
    // 控制器断开事件
    onControllerDisconnected(event, index) {
      console.log(`控制器 ${index} 已断开`)
      
      // 隐藏射线
      const controller = this.controllers[index]
      if (controller.userData.rayLine) {
        controller.userData.rayLine.visible = false
      }
      if (controller.userData.rayDot) {
        controller.userData.rayDot.visible = false
      }
    },
    
    // 控制器选择开始事件
    onSelectStart(event) {
      const controller = event.target
      console.log('控制器按下')
      
      // 如果有悬停的立方体，触发点击效果
      if (this.hoveredCube) {
        this.onCubeClick(this.hoveredCube)
      }
    },
    
    // 控制器选择结束事件
    onSelectEnd(event) {
      console.log('控制器释放')
    },
    
    // 立方体点击效果
    onCubeClick(cube) {
      try {
        // 创建点击波纹效果
        const originalScale = new THREE.Vector3(cube.scale.x, cube.scale.y, cube.scale.z)
        
        // 缩放动画
        const scaleUp = () => {
          cube.scale.multiplyScalar(1.3)
          setTimeout(() => {
            cube.scale.set(originalScale.x, originalScale.y, originalScale.z)
          }, 200)
        }
        
        // 颜色闪烁效果
        const originalColor = new THREE.Color(cube.material.color.r, cube.material.color.g, cube.material.color.b)
        cube.material.color.setHex(0xffffff)
        setTimeout(() => {
          cube.material.color.setRGB(originalColor.r, originalColor.g, originalColor.b)
        }, 200)
        
        scaleUp()
        console.log('立方体被点击！')
      } catch (error) {
        console.error('立方体点击效果失败:', error)
      }
    },
    
    // 进入VR模式
    async enterVR() {
      if (!this.vrSupported) return
      
      try {
        const session = await navigator.xr.requestSession('immersive-vr')
        await this.renderer.xr.setSession(session)
        this.isVRMode = true
        
        session.addEventListener('end', () => {
          this.isVRMode = false
        })
      } catch (error) {
        console.error('进入VR模式失败:', error)
      }
    },
    
    // 更新立方体动画
    updateCubes() {
      const deltaTime = this.clock.getDelta()
      
      this.cubes.forEach(cube => {
        // 更新位置 - 避免clone方法
        const deltaVelocity = new THREE.Vector3(
          cube.userData.velocity.x * deltaTime,
          cube.userData.velocity.y * deltaTime,
          cube.userData.velocity.z * deltaTime
        )
        cube.position.add(deltaVelocity)
        
        // 边界检测和反弹
        const bounds = cube.userData.bounds
        if (Math.abs(cube.position.x) > bounds) {
          cube.userData.velocity.x *= -1
          cube.position.x = Math.sign(cube.position.x) * bounds
        }
        if (Math.abs(cube.position.y) > bounds) {
          cube.userData.velocity.y *= -1
          cube.position.y = Math.sign(cube.position.y) * bounds
        }
        if (Math.abs(cube.position.z) > bounds) {
          cube.userData.velocity.z *= -1
          cube.position.z = Math.sign(cube.position.z) * bounds
        }
        
        // 更新旋转
        cube.rotation.x += cube.userData.rotationSpeed.x * deltaTime
        cube.rotation.y += cube.userData.rotationSpeed.y * deltaTime
        cube.rotation.z += cube.userData.rotationSpeed.z * deltaTime
      })
    },
    
    // 更新控制器射线投射
    updateControllerRaycasting() {
      let newHoveredCube = null
      
      this.controllers.forEach((controller, index) => {
        if (!controller.userData.rayLine || !controller.userData.rayLine.visible) return
        
        // 设置射线投射器
        const raycaster = this.raycasters[index]
        const tempMatrix = new THREE.Matrix4()
        tempMatrix.identity().extractRotation(controller.matrixWorld)
        
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
        
        // 检测与立方体的交点
        const intersects = raycaster.intersectObjects(this.cubes)
        
        if (intersects.length > 0) {
          const intersect = intersects[0]
          newHoveredCube = intersect.object
          
          // 更新射线点位置
          if (controller.userData.rayDot) {
            controller.userData.rayDot.position.copy(intersect.point)
            controller.userData.rayDot.visible = true
          }
          
          // 更新射线长度到交点
          const distance = intersect.distance
          const rayLine = controller.userData.rayLine
          const positions = rayLine.geometry.attributes.position.array
          positions[3] = 0
          positions[4] = 0
          positions[5] = -distance
          rayLine.geometry.attributes.position.needsUpdate = true
        } else {
          // 没有交点，重置射线长度
          if (controller.userData.rayDot) {
            controller.userData.rayDot.visible = false
          }
          
          const rayLine = controller.userData.rayLine
          const positions = rayLine.geometry.attributes.position.array
          positions[3] = 0
          positions[4] = 0
          positions[5] = -5
          rayLine.geometry.attributes.position.needsUpdate = true
        }
      })
      
      // 更新悬停效果
      this.updateHoverEffect(newHoveredCube)
    },
    
    // 更新悬停效果
    updateHoverEffect(newHoveredCube) {
      // 移除之前的悬停效果
      if (this.hoveredCube && this.hoveredCube !== newHoveredCube) {
        this.removeHoverEffect(this.hoveredCube)
      }
      
      // 应用新的悬停效果
      if (newHoveredCube && newHoveredCube !== this.hoveredCube) {
        this.applyHoverEffect(newHoveredCube)
      }
      
      this.hoveredCube = newHoveredCube
    },
    
    // 应用悬停效果
    applyHoverEffect(cube) {
      try {
        // 保存原始状态
        if (!cube.userData.originalScale) {
          // 安全的保存方法，避免Vue响应式问题
          cube.userData.originalScale = new THREE.Vector3(cube.scale.x, cube.scale.y, cube.scale.z)
          cube.userData.originalColor = new THREE.Color(cube.material.color.r, cube.material.color.g, cube.material.color.b)
          cube.userData.originalEmissive = new THREE.Color(cube.material.emissive.r, cube.material.emissive.g, cube.material.emissive.b)
        }
        
        // 放大立方体
        cube.scale.multiplyScalar(1.2)
        
        // 添加发光效果
        cube.material.emissive.setHex(0x444444)
        
        // 轻微改变颜色，增加亮度 - 避免copy方法
        const hoverColor = new THREE.Color(
          cube.userData.originalColor.r * 1.5,
          cube.userData.originalColor.g * 1.5,
          cube.userData.originalColor.b * 1.5
        )
        cube.material.color.setRGB(hoverColor.r, hoverColor.g, hoverColor.b)
        
        // 添加边框发光效果
        if (!cube.userData.hoverOutline) {
          const outlineGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12)
          const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
          })
          
          const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
          cube.add(outline)
          cube.userData.hoverOutline = outline
        }
      } catch (error) {
        console.error('应用悬停效果失败:', error)
      }
    },
    
    // 移除悬停效果
    removeHoverEffect(cube) {
      try {
        if (cube.userData.originalScale) {
          // 恢复原始缩放 - 使用set方法避免copy问题
          cube.scale.set(
            cube.userData.originalScale.x,
            cube.userData.originalScale.y,
            cube.userData.originalScale.z
          )
          
          // 恢复原始颜色 - 使用setRGB方法
          cube.material.color.setRGB(
            cube.userData.originalColor.r,
            cube.userData.originalColor.g,
            cube.userData.originalColor.b
          )
          
          // 恢复原始发光 - 使用setRGB方法
          cube.material.emissive.setRGB(
            cube.userData.originalEmissive.r,
            cube.userData.originalEmissive.g,
            cube.userData.originalEmissive.b
          )
          
          // 移除边框
          if (cube.userData.hoverOutline) {
            cube.remove(cube.userData.hoverOutline)
            cube.userData.hoverOutline.geometry.dispose()
            cube.userData.hoverOutline.material.dispose()
            cube.userData.hoverOutline = null
          }
        }
      } catch (error) {
        console.error('移除悬停效果失败:', error)
      }
    },
    
    // 更新FPS计数
    updateFPS() {
      this.frameCount++
      const currentTime = performance.now()
      
      if (currentTime >= this.lastTime + 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
        this.frameCount = 0
        this.lastTime = currentTime
      }
    },
    
    // 统计场景几何信息
    calculateSceneStats() {
      try {
        let totalVertices = 0
        let totalFaces = 0
        let totalMeshes = 0
        const materials = new Set()
        const textures = new Set()
        
        // 递归遍历场景中的所有对象
        const traverseObject = (obj) => {
          if (obj.isMesh && obj.geometry) {
            totalMeshes++
            
            // 统计顶点数
            const geometry = obj.geometry
            if (geometry.attributes.position) {
              const vertexCount = geometry.attributes.position.count
              totalVertices += vertexCount
            }
            
            // 统计面数
            if (geometry.index) {
              // 有索引的几何体
              totalFaces += geometry.index.count / 3
            } else if (geometry.attributes.position) {
              // 无索引的几何体
              totalFaces += geometry.attributes.position.count / 3
            }
            
            // 统计材质
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => materials.add(mat.uuid))
              } else {
                materials.add(obj.material.uuid)
                
                // 统计纹理
                if (obj.material.map) textures.add(obj.material.map.uuid)
                if (obj.material.normalMap) textures.add(obj.material.normalMap.uuid)
                if (obj.material.roughnessMap) textures.add(obj.material.roughnessMap.uuid)
                if (obj.material.metalnessMap) textures.add(obj.material.metalnessMap.uuid)
                if (obj.material.emissiveMap) textures.add(obj.material.emissiveMap.uuid)
              }
            }
          }
          
          // 递归处理子对象
          if (obj.children) {
            obj.children.forEach(child => traverseObject(child))
          }
        }
        
        // 从场景根节点开始遍历
        traverseObject(this.scene)
        
        // 计算边数（每个三角形面有3条边，但边会被相邻面共享）
        // 对于闭合网格，欧拉公式：V - E + F = 2
        // 因此 E = V + F - 2，但这个公式对于我们的用例可能不够准确
        // 我们使用简化估算：每个面平均有1.5条独立边（考虑共享）
        const totalEdges = Math.round(totalFaces * 1.5)
        
        // 更新统计信息
        this.sceneStats = {
          vertices: totalVertices,
          edges: totalEdges,
          faces: Math.round(totalFaces),
          meshes: totalMeshes,
          materials: materials.size,
          textures: textures.size
        }
        
      } catch (error) {
        console.error('统计场景信息失败:', error)
      }
    },
    
    // 格式化数字显示 - 显示精确数字
    formatNumber(num) {
      // 使用千分位分隔符格式化数字
      return num.toLocaleString('zh-CN')
    },
    
    // 获取场景复杂度等级
    getComplexityLevel() {
      const totalPolys = this.sceneStats.faces
      if (totalPolys < 10000) return '🟢 低'
      if (totalPolys < 50000) return '🟡 中'
      if (totalPolys < 100000) return '🟠 高'
      return '🔴 极高'
    },
    
    // 获取渲染负载评估
    getRenderLoad() {
      const fps = this.fps
      if (fps >= 55) return '🟢 轻松'
      if (fps >= 45) return '🟡 正常'
      if (fps >= 30) return '🟠 繁重'
      return '🔴 卡顿'
    },
    
    // 动画循环
    animate() {
      let statsUpdateTimer = 0
      
      this.animationId = this.renderer.setAnimationLoop(() => {
        this.updateCubes()
        this.updateControllerRaycasting()
        this.updateFPS()
        
        // 每5秒更新一次场景统计（避免频繁计算影响性能）
        statsUpdateTimer++
        if (statsUpdateTimer >= 300) { // 60fps * 5秒 = 300帧
          this.calculateSceneStats()
          statsUpdateTimer = 0
        }
        
        this.renderer.render(this.scene, this.camera)
      })
    },
    
    // 开始动画
    startAnimation() {
      this.animate()
    },
    
    // 窗口大小变化处理
    onWindowResize() {
      if (!this.camera || !this.renderer) return
      
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    },
    
    // 清理资源
    cleanup() {
      try {
        // 停止动画
        if (this.animationId) {
          this.renderer.setAnimationLoop(null)
        }
        
        // 移除事件监听
        window.removeEventListener('resize', this.onWindowResize)
        
        // 清理立方体
        this.cubes.forEach(cube => {
          // 移除hover效果
          this.removeHoverEffect(cube)
          
          if (cube.geometry) cube.geometry.dispose()
          if (cube.material) cube.material.dispose()
        })
        
        // 清理控制器
        this.controllers.forEach((controller, index) => {
          if (controller.userData.rayDot) {
            this.scene.remove(controller.userData.rayDot)
            controller.userData.rayDot.geometry.dispose()
            controller.userData.rayDot.material.dispose()
          }
          if (controller.userData.rayLine) {
            controller.userData.rayLine.geometry.dispose()
            controller.userData.rayLine.material.dispose()
          }
        })
        
        // 清理渲染器
        if (this.renderer) {
          this.renderer.dispose()
        }
        
        console.log('资源清理完成')
      } catch (error) {
        console.error('清理资源失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.webxr-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.three-container {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  color: white;
  font-family: monospace;
}

.vr-button {
  padding: 12px 24px;
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
  margin-bottom: 15px;
}

.vr-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.vr-button:disabled {
  background: #666;
  cursor: not-allowed;
  opacity: 0.5;
}

.info {
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 12px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 280px;
  max-height: 80vh;
  overflow-y: auto;
}

.info-section {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.info-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #60a5fa;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(96, 165, 250, 0.3);
}

.info p {
  margin: 4px 0;
  font-size: 12px;
  line-height: 1.4;
  font-family: 'Courier New', monospace;
}

/* 滚动条样式 */
.info::-webkit-scrollbar {
  width: 4px;
}

.info::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.info::-webkit-scrollbar-thumb {
  background: rgba(96, 165, 250, 0.5);
  border-radius: 2px;
}

.info::-webkit-scrollbar-thumb:hover {
  background: rgba(96, 165, 250, 0.7);
}
</style>
