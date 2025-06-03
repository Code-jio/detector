const { networkInterfaces } = require('os');

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

function showURLs() {
  const localIPs = getLocalIPs();
  
  console.log('\n' + '🔗'.repeat(25));
  console.log('   VR开发服务器访问地址');
  console.log('🔗'.repeat(25));
  
  console.log('\n🏠 本地访问:');
  console.log('   主页: https://localhost:3000');
  console.log('   VR场景: https://localhost:3000/#/webxr-test');
  
  if (localIPs.length > 0) {
    console.log('\n🌐 局域网访问 (VR设备使用):');
    localIPs.forEach((ip, index) => {
      console.log(`   ${index + 1}. https://${ip}:3000`);
      console.log(`      VR场景: https://${ip}:3000/#/webxr-test`);
    });
  } else {
    console.log('\n⚠️ 未检测到局域网IP地址');
  }
  
  console.log('\n📝 使用说明:');
  console.log('   • 在VR设备浏览器中输入局域网地址');
  console.log('   • 忽略SSL证书警告');
  console.log('   • 点击"进入VR"按钮开始体验');
  
  console.log('\n' + '🔗'.repeat(25) + '\n');
}

if (require.main === module) {
  showURLs();
}

module.exports = { getLocalIPs, showURLs }; 