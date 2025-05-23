const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// 保持对窗口对象的全局引用，避免被垃圾回收
let mainWindow;

/**
 * 创建主窗口
 */
function createMainWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // 安全考虑，禁用node集成
      contextIsolation: true, // 启用上下文隔离
      enableRemoteModule: false, // 禁用remote模块
      preload: path.join(__dirname, 'preload.js') // 预加载脚本
    },
    icon: path.join(__dirname, '../public/favicon.ico'), // 应用图标
    show: false // 先不显示，等加载完成后再显示
  });

  // 加载应用
  if (isDev) {
    // 开发环境加载本地服务器，明确导航到home页面
    mainWindow.loadURL('http://localhost:3000/#/home');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // 在页面加载完成后导航到home页面
    mainWindow.webContents.once('dom-ready', () => {
      mainWindow.webContents.executeJavaScript(`
        if (window.location.hash !== '#/home') {
          window.location.hash = '#/home';
        }
      `);
    });
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 当窗口被关闭时，取消引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 设置应用菜单
 */
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '切换开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 设置IPC处理程序
 */
function setupIpcHandlers() {
  // 应用相关API
  ipcMain.handle('app:getName', () => {
    return app.getName();
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  // 窗口控制API
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // 文件系统API（示例）
  ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile(filePath, 'utf8');
      return data;
    } catch (error) {
      throw new Error(`读取文件失败: ${error.message}`);
    }
  });

  ipcMain.handle('fs:writeFile', async (event, filePath, data) => {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(filePath, data, 'utf8');
      return true;
    } catch (error) {
      throw new Error(`写入文件失败: ${error.message}`);
    }
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(() => {
  createMainWindow();
  createMenu();
  setupIpcHandlers();

  // 在macOS上，当点击dock图标且没有其他窗口打开时，重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，应用通常会保持活动状态，直到用户明确退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全：防止新窗口创建
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    event.preventDefault();
  });
}); 