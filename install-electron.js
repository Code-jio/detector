const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始安装Electron相关依赖...\n');

/**
 * 检查Node.js版本
 */
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  console.log(`📋 当前Node.js版本: ${nodeVersion}`);
  
  if (majorVersion < 16) {
    console.log('⚠️  警告: 建议使用Node.js 16或更高版本');
    console.log('   某些依赖可能无法正常工作');
  } else if (majorVersion >= 18) {
    console.log('✅ Node.js版本符合要求');
  } else {
    console.log('✅ Node.js版本可用（推荐升级到18+）');
  }
  console.log('');
}

/**
 * 执行npm安装命令
 */
function runNpmInstall(packages, isDev = false) {
  return new Promise((resolve, reject) => {
    const args = ['install'];
    if (isDev) args.push('--save-dev');
    args.push(...packages);

    console.log(`📦 安装${isDev ? '开发' : '生产'}依赖: ${packages.join(', ')}`);
    
    const npm = spawn('npm', args, {
      stdio: 'inherit',
      shell: true
    });

    npm.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${isDev ? '开发' : '生产'}依赖安装完成\n`);
        resolve();
      } else {
        reject(new Error(`安装失败，退出码: ${code}`));
      }
    });

    npm.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * 创建启动脚本
 */
function createStartScript() {
  const scriptContent = `@echo off
echo 🚀 启动Detector Electron应用...
echo.

REM 检查是否安装了依赖
if not exist "node_modules" (
    echo ❌ 未找到node_modules目录
    echo 请先运行: npm install
    pause
    exit /b 1
)

REM 启动应用
echo 📦 启动webpack开发服务器...
start /B npm run dev

REM 等待webpack启动
echo ⏳ 等待webpack启动完成...
timeout /t 5 /nobreak > nul

REM 启动electron
echo 🖥️  启动Electron应用...
npm run electron

pause
`;

  fs.writeFileSync('start-electron.bat', scriptContent);
  console.log('✅ 创建启动脚本: start-electron.bat');
}

/**
 * 主安装流程
 */
async function main() {
  try {
    checkNodeVersion();

    // 根据Node.js版本选择合适的依赖版本
    const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
    
    let electronPackages;
    if (nodeVersion >= 18) {
      electronPackages = [
        'electron@^28.0.0',
        'electron-builder@^24.0.0',
        'concurrently@^8.0.0',
        'wait-on@^7.0.0'
      ];
    } else {
      electronPackages = [
        'electron@^25.0.0',
        'electron-builder@^24.0.0',
        'concurrently@^7.6.0',
        'wait-on@^7.0.1'
      ];
    }

    // 安装Electron相关依赖
    await runNpmInstall(electronPackages, true);

    // 创建启动脚本（Windows）
    if (process.platform === 'win32') {
      createStartScript();
    }

    console.log('🎉 Electron依赖安装完成！');
    console.log('');
    console.log('📖 使用说明:');
    console.log('   开发模式: npm run electron-dev');
    console.log('   构建应用: npm run build');
    console.log('   打包应用: npm run dist');
    console.log('');
    console.log('📚 更多信息请查看: README-ELECTRON.md');

  } catch (error) {
    console.error('❌ 安装失败:', error.message);
    console.log('');
    console.log('🔧 手动安装方法:');
    console.log('   npm install --save-dev electron electron-builder concurrently wait-on');
    process.exit(1);
  }
}

main(); 