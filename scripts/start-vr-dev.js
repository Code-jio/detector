const { spawn } = require('child_process');
const { networkInterfaces } = require('os');
const path = require('path');

// 获取本地IP地址
function getLocalIPs() {
  const nets = networkInterfaces();
  const localIPs = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIPs.push(net.address);
      }
    }
  }
  
  return localIPs;
}

// 显示启动信息
function showStartupInfo() {
  const localIPs = getLocalIPs();
  
  console.clear(); // 清屏
  console.log('\n' + '🌟'.repeat(30));
  console.log('   VR开发环境启动中...');
  console.log('🌟'.repeat(30));
  
  console.log('\n📋 准备信息:');
  console.log('   • 正在启动HTTPS开发服务器...');
  console.log('   • 正在生成SSL证书...');
  console.log('   • 正在扫描网络接口...');
  
  if (localIPs.length > 0) {
    console.log('\n🌐 检测到网络接口:');
    localIPs.forEach((ip, index) => {
      console.log(`   ${index + 1}. ${ip}`);
    });
  }
  
  console.log('\n⏰ 请稍等，服务器启动需要几秒钟...\n');
}

// 显示二维码（简化版）
function showQRInfo(url) {
  console.log('📱 移动设备访问:');
  console.log(`   扫描二维码或手动输入: ${url}`);
  console.log('   ┌─────────────────┐');
  console.log('   │  [QR Code]      │');
  console.log('   │  ████ ██ ████   │');
  console.log('   │  ██ ████ ██ ██  │');
  console.log('   │  ████ ██ ████   │');
  console.log('   └─────────────────┘');
}

// 主函数
function main() {
  showStartupInfo();
  
  // 启动webpack开发服务器
  const webpackServer = spawn('npm', ['run', 'dev'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    cwd: path.resolve(__dirname, '..')
  });

  let hasShownAccessInfo = false;

  // 处理标准输出
  webpackServer.stdout.on('data', (data) => {
    const output = data.toString();
    
    // 检查是否编译成功
    if (!hasShownAccessInfo && output.includes('compiled successfully')) {
      hasShownAccessInfo = true;
      setTimeout(() => {
        const localIPs = getLocalIPs();
        
        console.log('\n' + '✅'.repeat(30));
        console.log('   服务器启动成功！');
        console.log('✅'.repeat(30));
        
        console.log('\n🔗 访问链接:');
        console.log(`\n   🏠 本地开发:`);
        console.log(`      https://localhost:3000`);
        console.log(`      https://localhost:3000/#/webxr-test (直接访问VR场景)`);
        
        if (localIPs.length > 0) {
          console.log(`\n   🌐 局域网访问:`);
          localIPs.forEach(ip => {
            console.log(`      https://${ip}:3000`);
            console.log(`      https://${ip}:3000/#/webxr-test (VR场景)`);
          });
          
          console.log('\n');
          showQRInfo(`https://${localIPs[0]}:3000/#/webxr-test`);
        }
        
        console.log('\n🎮 VR设备使用指南:');
        console.log('   1. 确保VR设备与电脑在同一网络');
        console.log('   2. 在VR浏览器中输入局域网地址');
        console.log('   3. 忽略证书警告，选择继续访问');
        console.log('   4. 点击"进入VR"按钮开始体验');
        
        console.log('\n🛠️ 开发工具:');
        console.log('   • 实时热重载已启用');
        console.log('   • 代码修改会自动更新');
        console.log('   • 控制台错误会显示在页面上');
        
        console.log('\n📊 性能监控:');
        console.log('   • FPS显示在页面左上角');
        console.log('   • 500个动态立方体');
        console.log('   • 支持VR控制器交互');
        
        console.log('\n' + '💡'.repeat(30));
        console.log('   按 Ctrl+C 停止服务器');
        console.log('💡'.repeat(30) + '\n');
      }, 1000);
      return;
    }
    
    // 过滤掉webpack进度信息和其他冗余输出
    const linesToFilter = [
      '[webpack.Progress]',
      'webpack compiled',
      'Generating SSL certificate',
      'compiled successfully',
      'compiled with warnings',
      'asset processing',
      'sealing',
      'building',
      'emitting',
      'cache store',
      'setup watch run',
      'setup compilation'
    ];
    
    const shouldFilter = linesToFilter.some(filter => output.includes(filter));
    if (shouldFilter) {
      return; // 不显示这些信息
    }
    
    // 只显示真正的错误和警告
    if (output.includes('error:') || 
        output.includes('Error:') || 
        (output.includes('WARNING') && !output.includes('[webpack.Progress]'))) {
      console.log(output.trim());
    }
  });

  // 处理错误输出
  webpackServer.stderr.on('data', (data) => {
    const error = data.toString();
    
    // 过滤掉已知的警告和进度信息
    const errorsToFilter = [
      'DeprecationWarning',
      'webpack-dev-server',
      '[webpack.Progress]',
      '❌ 错误: <s> [webpack.Progress]',
      '<s> [webpack.Progress]'
    ];
    
    const shouldFilter = errorsToFilter.some(filter => error.includes(filter));
    if (shouldFilter) {
      return; // 不显示这些信息
    }
    
    // 只显示真正的错误
    if (error.trim()) {
      console.error('❌ 错误:', error.trim());
    }
  });

  // 处理服务器错误
  webpackServer.on('error', (error) => {
    console.error('\n❌ 服务器启动失败:', error.message);
    console.log('\n🔧 可能的解决方案:');
    console.log('   1. 检查端口3000是否被占用');
    console.log('   2. 确保Node.js版本 >= 14');
    console.log('   3. 重新安装依赖: npm install');
    process.exit(1);
  });

  // 处理服务器关闭
  webpackServer.on('close', (code) => {
    if (code !== 0) {
      console.log(`\n⚠️ 服务器异常退出，代码: ${code}`);
    } else {
      console.log('\n👋 服务器已正常关闭');
    }
  });

  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n\n🛑 正在关闭开发服务器...');
    webpackServer.kill('SIGINT');
    setTimeout(() => {
      console.log('✅ 服务器已关闭，感谢使用！');
      process.exit(0);
    }, 1000);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 收到终止信号，正在关闭...');
    webpackServer.kill('SIGTERM');
    process.exit(0);
  });
}

// 启动
main(); 