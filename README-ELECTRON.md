# Detector Electron 应用

基于Vue3、Three.js和Electron构建的桌面检测器应用。

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 方式1：使用自定义脚本（推荐）
npm run electron-dev

# 方式2：手动启动
npm run dev        # 启动webpack开发服务器
npm run electron   # 在另一个终端启动electron
```

### 生产构建
```bash
# 构建Web版本
npm run build

# 构建并运行Electron
npm run electron-build

# 打包成安装包
npm run dist        # 自动检测平台
npm run dist-win    # Windows安装包
npm run dist-mac    # macOS安装包
npm run dist-linux  # Linux安装包
```

## 📁 项目结构

```
detector/
├── electron/           # Electron主进程文件
│   ├── main.js        # 主进程入口
│   └── preload.js     # 预加载脚本
├── src/               # Vue应用源码
├── config/            # Webpack配置
├── scripts/           # 构建脚本
├── public/            # 静态资源
└── dist/              # 构建输出
```

## 🔧 配置说明

### Electron配置
- **主进程**: `electron/main.js` - 负责创建窗口和应用生命周期管理
- **预加载脚本**: `electron/preload.js` - 提供安全的API接口
- **打包配置**: `package.json` 中的 `build` 字段

### 安全特性
- ✅ 禁用Node.js集成
- ✅ 启用上下文隔离
- ✅ 使用预加载脚本暴露API
- ✅ 禁用remote模块

## 🛠️ 开发指南

### 在渲染进程中使用Electron API
```javascript
// 通过预加载脚本暴露的API
if (window.electronAPI) {
  // 获取平台信息
  console.log('平台:', window.electronAPI.platform);
  
  // 获取版本信息
  console.log('版本:', window.electronAPI.versions);
  
  // 窗口控制
  window.electronAPI.window.minimize();
  window.electronAPI.window.maximize();
  
  // 应用控制
  window.electronAPI.app.quit();
}
```

### 添加新的API
1. 在 `electron/preload.js` 中添加API定义
2. 在 `electron/main.js` 中添加对应的处理逻辑
3. 在Vue组件中使用新API

### 调试技巧
- 开发模式下会自动打开开发者工具
- 使用 `console.log` 在主进程和渲染进程中调试
- 检查 `electron/main.js` 中的错误处理

## 📦 打包说明

### Windows
- 生成 `.exe` 安装程序
- 支持自定义安装路径
- 自动创建桌面和开始菜单快捷方式

### macOS
- 生成 `.dmg` 磁盘映像
- 支持拖拽安装

### Linux
- 生成 `.AppImage` 便携应用
- 无需安装即可运行

## 🔍 常见问题

### Q: 开发模式下Electron窗口空白？
A: 确保webpack-dev-server已启动并在8080端口运行

### Q: 打包后的应用无法启动？
A: 检查 `dist` 目录是否包含完整的构建文件

### Q: 如何修改窗口大小和图标？
A: 在 `electron/main.js` 中修改 `BrowserWindow` 配置

### Q: 如何添加原生菜单？
A: 在 `electron/main.js` 的 `createMenu` 函数中修改菜单模板

## 🎯 性能优化

1. **减少包体积**
   - 使用 `devDependencies` 安装开发依赖
   - 配置 `files` 字段只打包必要文件

2. **提升启动速度**
   - 使用 `show: false` 延迟显示窗口
   - 优化预加载脚本大小

3. **内存优化**
   - 及时清理事件监听器
   - 避免内存泄漏

## 📱 功能特性

- ✅ **跨平台支持**: Windows、macOS、Linux
- ✅ **安全架构**: 禁用node集成，启用上下文隔离
- ✅ **开发工具**: 开发模式自动打开DevTools
- ✅ **菜单系统**: 自定义应用菜单
- ✅ **IPC通信**: 安全的主进程与渲染进程通信
- ✅ **默认页面**: 启动时自动导航到Home页面
- ✅ **Hash路由**: 使用hash模式路由，适合Electron环境

## �� 许可证

MIT License 