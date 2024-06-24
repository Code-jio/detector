// 检查本地资源是否存在
const fs = require("fs");
const path = require("path");

// 清空global.js文件
fs.writeFileSync(path.resolve(__dirname, "../src/global.js"), "");

const url = path.resolve(__dirname, "../public/gltf");
// 深度循环遍历url中所有文件 并求出文件大小以列表的形式返回
function check() {
  let fileList = [];
  function deepLoop(url) {
    let files = fs.readdirSync(url);

    files.forEach((file) => {
      let stat = fs.statSync(url + "/" + file);
      if (stat.isDirectory()) {
        deepLoop(url + "/" + file);
      } else {
        // 转为kb
        let size = (stat.size / 1024).toFixed(2) + "kb";
        fileList.push({
          name: file,
          size,
        });
      }
    });
  }
  deepLoop(url);

  // 筛选出图片文件和bin文件
  let imgList = fileList.filter((item) => {
    return item.name.includes(".jpg") || item.name.includes(".png") || item.name.includes(".jpeg");
  });
  let binList = fileList.filter((item) => {
    return item.name.includes(".bin")|| item.name.includes(".glb");
  });
  return {
    imgList,
    binList,
  };
}

// 挂载到全局
// 输出成json格式 并写入到global.js文件中
const json = JSON.stringify(check());
fs.writeFileSync(path.resolve(__dirname, "../src/global.js"), `export default ${json}`);