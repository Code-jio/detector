# 🚀 Detector Electron 快速设置指南

## 📋 前置要求

- Node.js >= 16.0.0 (推荐 18+)
- npm >= 8.0.0
- Git

## 🛠️ 安装步骤

### 方法一：自动安装（推荐）

```bash
# 1. 进入detector目录
cd detector

# 2. 运行自动安装脚本
node install-electron.js
```

### 方法二：手动安装

```bash
# 1. 安装基础依赖（如果还没安装）
npm install

# 2. 安装Electron相关依赖
npm install --save-dev electron@^25.0.0 electron-builder@^24.0.0 concurrently@^7.6.0 wait-on@^7.0.1
```

## 🎯 运行应用

### 开发模式

```bash
# 方式1：一键启动（推荐）
npm run electron-dev

# 方式2：分步启动
npm run dev        # 终端1：启动webpack开发服务器
npm run electron   # 终端2：启动electron应用
```

### 生产模式

```bash
# 构建并运行
npm run electron-build

# 打包成安装程序
npm run dist        # 自动检测平台
npm run dist-win    # Windows
npm run dist-mac    # macOS  
npm run dist-linux  # Linux
```

## 📁 新增文件说明

```
detector/
├── electron/                 # Electron相关文件
│   ├── main.js              # 主进程（窗口管理、菜单等）
│   └── preload.js           # 预加载脚本（安全API桥接）
├── src/
│   └── components/
│       └── ElectronInfo.vue # Electron信息展示组件
├── scripts/
│   └── dev.js               # 开发启动脚本
├── install-electron.js      # 自动安装脚本
├── start-electron.bat       # Windows启动脚本
├── README-ELECTRON.md       # 详细文档
└── ELECTRON-SETUP.md        # 本文件
```

## 🔧 配置修改

### 窗口设置
编辑 `electron/main.js` 中的 `createMainWindow` 函数：

```javascript
mainWindow = new BrowserWindow({
  width: 1200,        // 窗口宽度
  height: 800,        // 窗口高度
  minWidth: 800,      // 最小宽度
  minHeight: 600,     // 最小高度
  // ... 其他配置
});
```

### 应用图标
替换 `public/favicon.ico` 文件

### 打包配置
编辑 `package.json` 中的 `build` 字段

## 🐛 常见问题

### Q: 启动时出现空白窗口？
**A:** 确保webpack开发服务器已启动并在3000端口运行
```bash
# 检查端口占用
netstat -ano | findstr :3000
```

### Q: 安装依赖时出现版本警告？
**A:** 这是正常的，Node.js 16可以运行但建议升级到18+

### Q: 遇到"geometry.addAttribute is not a function"错误？
**A:** 这是Three.js版本兼容性问题，已经修复。如果还有问题请查看`docs/THREEJS-MIGRATION.md`

### Q: 打包后的应用很大？
**A:** 这是正常的，Electron应用包含了完整的Chrome运行时

### Q: 如何修改窗口大小和图标？
**A:** 在 `electron/main.js` 中修改 `BrowserWindow` 配置

### Q: 如何添加自定义菜单？
**A:** 编辑 `electron/main.js` 中的 `createMenu` 函数

### Q: 如何在Vue组件中调用Electron API？
**A:** 参考 `src/components/ElectronInfo.vue` 组件的示例

## 🎨 自定义开发

### 添加新的Electron API

1. **在预加载脚本中定义API** (`electron/preload.js`)：
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // 添加新API
  myCustomAPI: {
    doSomething: () => ipcRenderer.invoke('custom:doSomething')
  }
});
```

2. **在主进程中处理API** (`electron/main.js`)：
```javascript
function setupIpcHandlers() {
  // 添加处理程序
  ipcMain.handle('custom:doSomething', async () => {
    // 实现具体逻辑
    return 'result';
  });
}
```

3. **在Vue组件中使用**：
```javascript
if (window.electronAPI?.myCustomAPI) {
  const result = await window.electronAPI.myCustomAPI.doSomething();
}
```

## 📚 更多资源

- [Electron官方文档](https://www.electronjs.org/docs)
- [Vue 3官方文档](https://vuejs.org/)
- [Element Plus组件库](https://element-plus.org/)
- [Three.js文档](https://threejs.org/docs/)

## 🆘 获取帮助

如果遇到问题：
1. 查看控制台错误信息
2. 检查 `README-ELECTRON.md` 详细文档
3. 确认Node.js和npm版本
4. 重新安装依赖：`rm -rf node_modules && npm install` 