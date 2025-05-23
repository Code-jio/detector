const { contextBridge, ipcRenderer } = require('electron');

/**
 * 预加载脚本 - 在渲染进程中运行，但可以访问Node.js API
 * 通过contextBridge安全地暴露API给渲染进程
 */

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,
  
  // 版本信息
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // 应用信息
  app: {
    getName: () => ipcRenderer.invoke('app:getName'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    quit: () => ipcRenderer.invoke('app:quit')
  },

  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },

  // 文件系统操作（如果需要的话）
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data)
  },

  // 事件监听
  on: (channel, callback) => {
    // 只允许特定的频道
    const validChannels = ['app:update', 'window:resize', 'theme:change'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // 移除事件监听
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 在窗口加载完成后执行
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron预加载脚本已加载');
  
  // 可以在这里添加一些初始化逻辑
  // 比如设置主题、检查更新等
}); 