<template>
  <div class="math">
    <!-- 角度取值 -->
    <div class="title">Angle</div>
    <div class="angle">
      deg:<input type="number" name="" id="" :step="5" v-model="angle" />
      <span @click="saveAtClipboard(sin)">sin：{{ sin }}</span>
      <span @click="saveAtClipboard(cos)">cos：{{ cos }}</span>
    </div>
    <!-- 矩阵 -->
    <div class="title">
      Matrix4
      <button class="apply" @click="apply({ data: mat4, type: 'Matrix4' })">
        应用
      </button>
    </div>
    <div class="matrix">
      <table>
        <tr v-for="(row, i) in mat4" :key="i">
          <td v-for="(col, j) in row" :key="j">
            <input type="number" name="" id="" v-model="mat4[i][j]" />
          </td>
        </tr>
      </table>
    </div>
    <!-- 欧拉角 -->
    <div class="title">
      Euler
      <button class="apply" @click="apply({ value: mat4, type: 'Euler' })">
        应用
      </button>
    </div>
    <div class="euler">
      x: <input type="number" name="" id="" v-model="euler.x" :step="5" /> y:
      <input type="number" name="" id="" v-model="euler.y" :step="5" /> z:
      <input type="number" name="" id="" v-model="euler.z" :step="5" />
      order: XYZ
    </div>
    <!-- 四元数 -->
    <div class="title">
      Quaternion
      <button class="apply" @click="apply({ data: mat4, type: 'Quaternion' })">
        应用
      </button>
    </div>
    <div class="quaternion">
      x: <input type="number" name="" id="" v-model="quaternion.x" /> y:
      <input type="number" name="" id="" v-model="quaternion.y" /> z:
      <input type="number" name="" id="" v-model="quaternion.z" /> w:
      <input type="number" name="" id="" v-model="quaternion.w" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import * as THREE from "three";
import Bus from "@/utils/EventBus.js"; // 事件总线
// import MathUtils from "three/js/utils/MathUtils.js";
// let math = THREE.MathUtils;
console.log(THREE.Math);
let angle = ref(0);
let mat4 = reactive([
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
]);
let euler = reactive({ x: 0, y: 0, z: 0 });
let quaternion = reactive({ x: 0, y: 0, z: 0, w: 0 });

let sin = ref(0);
let cos = ref(0);

let Matrix4 = new THREE.Matrix4();
let Euler = new THREE.Euler();
let Quaternion = new THREE.Quaternion();

// 监听angle的变化,保留7位小数
watch(
  () => angle.value,
  (newVal, oldVal) => {
    sin.value = Math.sin((newVal * Math.PI) / 180).toFixed(7);
    cos.value = Math.cos((newVal * Math.PI) / 180).toFixed(7);
    console.log(sin.value, cos.value);
  }
);
// 监听Matrix4的变化
// watch(
//   () => mat4,
//   (newVal, oldVal) => {
//     // 应用矩阵
//     Matrix4.set(
//       newVal[0][0],
//       newVal[0][1],
//       newVal[0][2],
//       newVal[0][3],
//       newVal[1][0],
//       newVal[1][1],
//       newVal[1][2],
//       newVal[1][3],
//       newVal[2][0],
//       newVal[2][1],
//       newVal[2][2],
//       newVal[2][3],
//       newVal[3][0],
//       newVal[3][1],
//       newVal[3][2],
//       newVal[3][3]
//     );
//     // 矩阵转欧拉角
//     Euler.setFromRotationMatrix(Matrix4, "XYZ");
//     THREE.Math.degToRad();
//     euler.x = THREE.Math.radToDeg(Euler.x);
//     euler.y = THREE.Math.radToDeg(Euler.y);
//     euler.z = THREE.Math.radToDeg(Euler.z);
//     // 欧拉角转四元数
//     Quaternion.setFromEuler(Euler);
//     quaternion.x = Quaternion.x;
//     quaternion.y = Quaternion.y;
//     quaternion.z = Quaternion.z;
//     quaternion.w = Quaternion.w;
//     Bus.emit("transform", Quaternion);
//   },
//   { deep: true }
// );
// 监听Euler的变化
watch(
  () => euler,
  (newVal, oldVal) => {
    // 应用欧拉角 newval是一个对象，对应绕x,y,z轴旋转的角度
    // 角度转弧度
    Euler.set(
      THREE.Math.degToRad(newVal.x),
      THREE.Math.degToRad(newVal.y),
      THREE.Math.degToRad(newVal.z),
      "XYZ"
    );
    // 欧拉角转四元数
    Quaternion.setFromEuler(Euler);
    quaternion.x = Quaternion.x;
    quaternion.y = Quaternion.y;
    quaternion.z = Quaternion.z;
    quaternion.w = Quaternion.w;
    // 欧拉角转矩阵
    Matrix4 = new THREE.Matrix4().makeRotationFromEuler(Euler);
    mat4[0][0] = Matrix4.elements[0];
    mat4[0][1] = Matrix4.elements[1];
    mat4[0][2] = Matrix4.elements[2];
    mat4[0][3] = Matrix4.elements[3];
    mat4[1][0] = Matrix4.elements[4];
    mat4[1][1] = Matrix4.elements[5];
    mat4[1][2] = Matrix4.elements[6];
    mat4[1][3] = Matrix4.elements[7];
    mat4[2][0] = Matrix4.elements[8];
    mat4[2][1] = Matrix4.elements[9];
    mat4[2][2] = Matrix4.elements[10];
    mat4[2][3] = Matrix4.elements[11];
    mat4[3][0] = Matrix4.elements[12];
    mat4[3][1] = Matrix4.elements[13];
    mat4[3][2] = Matrix4.elements[14];
    mat4[3][3] = Matrix4.elements[15];
    Bus.emit("transform", Quaternion);
  },
  { deep: true }
);
// 监听Quaternion的变化
// watch(
//   () => quaternion,
//   (newVal, oldVal) => {
//     // 应用四元数
//     Quaternion.set(newVal.x, newVal.y, newVal.z, newVal.w);
//     // 四元数转欧拉角
//     Euler.setFromQuaternion(Quaternion, "XYZ");
//     euler.x = THREE.Math.radToDeg(Euler.x);
//     euler.y = THREE.Math.radToDeg(Euler.y);
//     euler.z = THREE.Math.radToDeg(Euler.z);
//     // 四元数转矩阵
//     Matrix4 = new THREE.Matrix4().makeRotationFromQuaternion(Quaternion);
//     mat4[0][0] = Matrix4.elements[0];
//     mat4[0][1] = Matrix4.elements[1];
//     mat4[0][2] = Matrix4.elements[2];
//     mat4[0][3] = Matrix4.elements[3];
//     mat4[1][0] = Matrix4.elements[4];
//     mat4[1][1] = Matrix4.elements[5];
//     mat4[1][2] = Matrix4.elements[6];
//     mat4[1][3] = Matrix4.elements[7];
//     mat4[2][0] = Matrix4.elements[8];
//     mat4[2][1] = Matrix4.elements[9];
//     mat4[2][2] = Matrix4.elements[10];
//     mat4[2][3] = Matrix4.elements[11];
//     mat4[3][0] = Matrix4.elements[12];
//     mat4[3][1] = Matrix4.elements[13];
//     mat4[3][2] = Matrix4.elements[14];
//     mat4[3][3] = Matrix4.elements[15];

//     Bus.emit("transform", Quaternion);
//   },
//   { deep: true }
// );

// 应用矩阵、欧拉角、四元数
const apply = (data) => {
  switch (data.type) {
    case "Matrix4":
      Matrix4.set(
        data.value[0][0],
        data.value[0][1],
        data.value[0][2],
        data.value[0][3],
        data.value[1][0],
        data.value[1][1],
        data.value[1][2],
        data.value[1][3],
        data.value[2][0],
        data.value[2][1],
        data.value[2][2],
        data.value[2][3],
        data.value[3][0],
        data.value[3][1],
        data.value[3][2],
        data.value[3][3]
      );
      break;
    case "Euler":
      Euler.set(data.value.x, data.value.y, data.value.z, "XYZ");
      break;
    case "Quaternion":
      Quaternion.set(data.value.x, data.value.y, data.value.z, data.value.w);
      break;
    default:
      break;
  }
};

// 保存至剪贴板
const saveAtClipboard = () => {
  const input = document.createElement("input");
  document.body.appendChild(input);
  input.setAttribute("value", sin.value);
  input.select();
  if (document.execCommand("copy")) {
    document.execCommand("copy");
    ElMessage("复制成功");
  }
  document.body.removeChild(input);
  input.remove();
  input.style.display = "none";
};

onMounted(() => {
  console.log("mounted");
});
</script>

<style lang="less" scoped>
.math {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 384px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(100, 100, 100, 0.5);
  color: #fff;
  padding: 10px;
  border-radius: 10px;
  z-index: 2;
  .title {
    margin-bottom: 10px;
    font-size: 20px;
    font-weight: bold;
    width: 95%;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .apply {
      position: relative;

      right: 5px;
      margin-left: 10px;
      padding: 2px 5px;
      border: none;
      border-radius: 5px;
      background: #fff;
      color: #000;
      cursor: pointer;
      outline: none;

      &:hover {
        background: #000;
        color: #fff;
        transition: 0.3s;
        transition-property: background, color;
        transition-timing-function: ease;
        transition-delay: 0s;
        transition-duration: 0.3s;
      }

      //  点击时的样式
      &:active {
        scale: 0.99;
      }
    }
  }
  .angle {
    width: 95%;
    margin-bottom: 10px;
    font-size: 16px;
    font-family: "Courier New", Courier, monospace;
    line-height: 1.5;
    word-break: break-all;
    word-wrap: break-word;
    white-space: pre;
    overflow: auto;
    // min-height: 100px;
    // min-width: 100px;
    padding: 10px;
    background: rgba(100, 100, 100, 0.5);
    border-radius: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    input {
      width: 100px;
      background: transparent;
      border: none;
      color: #fff;
      text-align: center;

      //   去掉点击时的白色框线
      outline: none;
    }
    span {
      margin-left: 10px;
      color: #fff;
      font-size: 14px;
      font-weight: bold;
      flex: 1;
      cursor: pointer;
    }
  }
  .matrix {
    margin-bottom: 10px;
    font-size: 16px;
    font-family: "Courier New", Courier, monospace;
    line-height: 1.5;
    word-break: break-all;
    word-wrap: break-word;
    white-space: pre;
    overflow: auto;
    width: 95%;
    padding: 10px;
    background: rgba(100, 100, 100, 0.5);
    border-radius: 10px;
    table {
      width: 100%;
      height: 100%;
      border-collapse: collapse;
      td {
        width: 80px;
        height: 40px;
        // border: 1px solid #fff;
        input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          color: #fff;
          text-align: center;

          //   去掉点击时的白色框线
          outline: none;
        }
      }
    }
  }
  .euler {
    width: 95%;
    margin-bottom: 10px;
    font-size: 16px;
    font-family: "Courier New", Courier, monospace;
    line-height: 1.5;
    word-break: break-all;
    word-wrap: break-word;
    white-space: pre;
    overflow: auto;
    padding: 10px;
    background: rgba(100, 100, 100, 0.5);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;

    input {
      //   width: 100px;
      background: transparent;
      border: none;
      color: #fff;
      text-align: center;

      //   去掉点击时的白色框线
      outline: none;
    }
  }
  .quaternion {
    width: 95%;
    margin-bottom: 10px;
    font-size: 16px;
    font-family: "Courier New", Courier, monospace;
    line-height: 1.5;
    word-break: break-all;
    word-wrap: break-word;
    white-space: pre;
    overflow: auto;

    padding: 10px;
    background: rgba(100, 100, 100, 0.5);
    border-radius: 10px;

    display: flex;
    align-items: center;
    justify-content: center;
    span {
      margin-left: 10px;
      color: #fff;
      font-size: 14px;
      font-weight: bold;
      flex: 1;
    }
    input {
      width: 100px;
      background: transparent;
      border: none;
      color: #fff;
      text-align: center;

      //   去掉点击时的白色框线
      outline: none;
    }
  }
}
</style>
