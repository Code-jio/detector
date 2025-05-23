const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 启动Detector Electron应用...\n');

/**
 * 检查端口是否可用
 */
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * 等待webpack服务器启动
 */
function waitForWebpackServer(maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    const checkServer = () => {
      const req = http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Webpack开发服务器已启动并响应');
          resolve();
        } else {
          retryCheck();
        }
      });
      
      req.on('error', () => {
        retryCheck();
      });
      
      req.setTimeout(3000, () => {
        req.destroy();
        retryCheck();
      });
    };
    
    const retryCheck = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error('等待webpack服务器启动超时'));
        return;
      }
      console.log(`⏳ 等待webpack启动... (${retries}/${maxRetries})`);
      setTimeout(checkServer, 2000);
    };
    
    checkServer();
  });
}

/**
 * 启动webpack开发服务器
 */
function startWebpackServer() {
  return new Promise((resolve, reject) => {
    console.log('📦 启动Webpack开发服务器...');
    
    const webpack = spawn('npm', ['run', 'dev'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    webpack.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      
      // 检查是否包含成功启动的标志
      if (output.includes('webpack compiled') || output.includes('Local:')) {
        setTimeout(() => resolve(webpack), 2000); // 延迟确保完全启动
      }
    });

    webpack.stderr.on('data', (data) => {
      const error = data.toString();
      process.stderr.write(error);
      
      // 如果是端口占用错误
      if (error.includes('EADDRINUSE') || error.includes('EACCES')) {
        console.log('\n❌ 端口被占用，请检查是否有其他服务在运行');
        console.log('可以尝试以下解决方案：');
        console.log('1. 关闭占用3000端口的程序');
        console.log('2. 或者以管理员身份运行此命令');
        reject(new Error('端口占用错误'));
      }
    });

    webpack.on('error', (err) => {
      reject(err);
    });

    webpack.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Webpack进程退出，代码: ${code}`));
      }
    });

    // 30秒后如果还没有启动成功就超时
    setTimeout(() => {
      resolve(webpack);
    }, 30000);
  });
}

/**
 * 启动Electron应用
 */
function startElectronApp() {
  return new Promise((resolve, reject) => {
    console.log('🖥️  启动Electron应用...');
    
    const electron = spawn('electron', ['.'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    electron.on('error', (err) => {
      console.error('❌ Electron启动失败:', err);
      reject(err);
    });

    electron.on('close', (code) => {
      console.log('👋 Electron应用已关闭');
      resolve(code);
    });

    resolve(electron);
  });
}

/**
 * 主启动流程
 */
async function main() {
  let webpackProcess = null;
  let electronProcess = null;

  try {
    // 检查端口
    console.log('🔍 检查端口3000是否可用...');
    const portAvailable = await checkPortAvailable(3000);
    if (!portAvailable) {
      console.log('⚠️  端口3000被占用');
      console.log('尝试查找占用进程...');
      
      // 尝试显示占用端口的进程
      const netstat = spawn('netstat', ['-ano'], { shell: true });
      netstat.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        const line3000 = lines.find(line => line.includes(':3000'));
        if (line3000) {
          console.log('占用端口的进程:', line3000);
        }
      });
      
      console.log('请手动关闭占用端口的程序，然后重试');
      process.exit(1);
    }

    // 启动webpack服务器
    webpackProcess = await startWebpackServer();
    
    // 等待webpack服务器完全启动
    await waitForWebpackServer();
    
    // 启动electron应用
    electronProcess = await startElectronApp();

    // 处理优雅退出
    process.on('SIGINT', () => {
      console.log('\n🛑 正在关闭应用...');
      if (webpackProcess) webpackProcess.kill();
      if (electronProcess) electronProcess.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 接收到终止信号...');
      if (webpackProcess) webpackProcess.kill();
      if (electronProcess) electronProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    
    // 清理进程
    if (webpackProcess) webpackProcess.kill();
    if (electronProcess) electronProcess.kill();
    
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 以管理员身份运行命令');
    console.log('2. 检查防火墙设置');
    console.log('3. 关闭占用端口的其他程序');
    console.log('4. 重启计算机后重试');
    
    process.exit(1);
  }
}

main(); 