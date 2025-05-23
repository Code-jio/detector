const { spawn } = require('child_process');
const { createServer } = require('http');

/**
 * 检查端口是否可用
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * 等待webpack-dev-server启动
 */
function waitForWebpack() {
  return new Promise((resolve) => {
    const checkServer = () => {
      const http = require('http');
      const req = http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Webpack开发服务器已启动');
          resolve();
        } else {
          setTimeout(checkServer, 1000);
        }
      });
      req.on('error', () => {
        setTimeout(checkServer, 1000);
      });
    };
    checkServer();
  });
}

/**
 * 启动webpack-dev-server
 */
function startWebpack() {
  console.log('🚀 启动Webpack开发服务器...');
  const webpack = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  webpack.on('error', (err) => {
    console.error('❌ Webpack启动失败:', err);
    process.exit(1);
  });

  return webpack;
}

/**
 * 启动Electron
 */
function startElectron() {
  console.log('🖥️  启动Electron应用...');
  const electron = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electron.on('error', (err) => {
    console.error('❌ Electron启动失败:', err);
    process.exit(1);
  });

  electron.on('close', () => {
    console.log('👋 Electron应用已关闭');
    process.exit(0);
  });

  return electron;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 检查端口
    const portAvailable = await checkPort(3000);
    if (!portAvailable) {
      console.log('⚠️  端口3000被占用，请检查是否有其他服务在运行');
      process.exit(1);
    }

    // 启动webpack
    const webpackProcess = startWebpack();

    // 等待webpack启动完成
    await waitForWebpack();

    // 启动electron
    const electronProcess = startElectron();

    // 处理进程退出
    process.on('SIGINT', () => {
      console.log('\n🛑 正在关闭应用...');
      webpackProcess.kill();
      electronProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

main(); 