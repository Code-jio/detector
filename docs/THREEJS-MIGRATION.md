# Three.js 版本迁移指南

本文档记录了在项目中遇到的Three.js版本升级导致的API变化以及解决方案。

## 🔄 已修复的问题

### 1. geometry.addAttribute() 已弃用

**问题**: `geometry.addAttribute is not a function`

**原因**: 在Three.js r125版本之后，`geometry.addAttribute()`方法被移除。

**解决方案**: 
```javascript
// ❌ 旧方法 (已弃用)
geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));

// ✅ 新方法 (推荐)
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
```

**影响文件**:
- `src/views/ShaderDemo.vue` - createLine()函数
- `src/views/ShaderDemo.vue` - createTriangle()函数

## 🚨 可能存在的其他兼容性问题

### 1. Geometry 构造函数变化

```javascript
// ❌ 旧版本
const geometry = new THREE.Geometry();

// ✅ 新版本
const geometry = new THREE.BufferGeometry();
```

### 2. 材质属性变化

```javascript
// ❌ 旧版本
material.map.wrapS = THREE.RepeatWrapping;

// ✅ 新版本  
material.map.wrapS = THREE.RepeatWrapping;
// (这个API没变，但需要注意纹理加载方式的变化)
```

### 3. 渲染器变化

```javascript
// ❌ 旧版本
renderer.gammaInput = true;
renderer.gammaOutput = true;

// ✅ 新版本
renderer.outputEncoding = THREE.sRGBEncoding;
```

### 4. 光照系统变化

```javascript
// ❌ 旧版本中某些光照计算
// 新版本中光照计算更加物理准确

// ✅ 建议使用新的光照模型
const light = new THREE.DirectionalLight(0xffffff, 1);
```

## 🔧 迁移检查清单

在升级Three.js版本时，请检查以下项目：

- [ ] **几何体创建**: 确保使用`BufferGeometry`而不是`Geometry`
- [ ] **属性设置**: 使用`setAttribute()`替代`addAttribute()`
- [ ] **材质属性**: 检查材质属性是否有变化
- [ ] **渲染设置**: 更新渲染器配置
- [ ] **加载器**: 检查模型和纹理加载器的API变化
- [ ] **动画系统**: 验证动画混合器和关键帧动画
- [ ] **着色器**: 检查自定义着色器的uniform变量

## 📚 版本对应关系

| Three.js版本 | 主要变化 | 项目状态 |
|-------------|---------|---------|
| r125-r130   | 移除addAttribute | ✅ 已修复 |
| r131-r135   | 材质系统优化 | ⚠️ 需检查 |
| r136+       | 渲染管线更新 | ⚠️ 需检查 |

## 🛠️ 调试技巧

### 1. 控制台错误排查

常见错误及解决方案：

```javascript
// 错误: geometry.addAttribute is not a function
// 解决: 使用 geometry.setAttribute()

// 错误: THREE.Geometry has been removed
// 解决: 使用 THREE.BufferGeometry

// 错误: material.map.flipY is not defined
// 解决: 检查纹理加载方式
```

### 2. 性能优化建议

```javascript
// 对于大量顶点数据，使用InstancedMesh
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

// 合理使用BufferGeometry的attributes
geometry.setAttribute('position', positionAttribute);
geometry.setAttribute('normal', normalAttribute);
geometry.setAttribute('uv', uvAttribute);
```

## 🔗 参考资源

- [Three.js 官方迁移指南](https://threejs.org/docs/#manual/en/introduction/How-to-update-things)
- [Three.js 版本发布日志](https://github.com/mrdoob/three.js/releases)
- [BufferGeometry 文档](https://threejs.org/docs/#api/en/core/BufferGeometry)

## 📝 更新日志

- **2024-12-23**: 修复`addAttribute()`兼容性问题
- **2024-12-23**: 创建迁移文档

---

如果遇到新的Three.js兼容性问题，请及时更新此文档。 