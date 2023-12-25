import * as THREE from 'three';

export const random = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

export const randomColor = () => {
  // 随机颜色
  return `rgb(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)})`;
};

// 两点之间的距离(三维空间)
export const distanceBetweenTwoPoints = (p1, p2) => {
  const a = p1.x - p2.x;
  const b = p1.y - p2.y;
  const c = p1.z - p2.z;
  return Math.sqrt(a * a + b * b + c * c);
};

// 输入：三维向量1，三维向量2
// 输出：向量1至向量2的变换矩阵
export const getTransformMatrix = (v1, v2) => {
  const distance = distanceBetweenTwoPoints(v1, v2); // 两点之间的距离
  const translate = new THREE.Matrix4().makeTranslation(v1.x, v1.y, v1.z); // 平移 : 以v1为原点, 以v2为目标点, 平移矩阵
  // 旋转
  const rotate = new THREE.Matrix4().makeRotationZ(
    Math.atan2(v2.y - v1.y, v2.x - v1.x)
  );
  const scale = new THREE.Matrix4().makeScale(distance, 1, 1); // 缩放: x轴方向缩放distance倍 y轴方向缩放1倍  z轴方向缩放1倍
  return translate.multiply(rotate).multiply(scale); // 矩阵相乘
};

// 输入: 三维向量1 变换矩阵Matrix4
// 输出：变换后的三维向量
export const getTransformVector = (v1, m) => {
  const v = new THREE.Vector3(v1.x, v1.y, v1.z); // 三维向量
  v.applyMatrix4(m); // 向量应用矩阵
  return v;
};

// 输入:四阶矩阵1,四阶矩阵2
// 输出:矩阵1至矩阵2的变换矩阵
export const getTransformMatrix4 = (m1, m2) => {
  const m1Inverse = new THREE.Matrix4().getInverse(m1); // 矩阵1的逆矩阵
  return m1Inverse.multiply(m2); // 矩阵相乘
};

// 输入：角度 Number
// 输出：弧度
export const degToRad = (angle) => {
  return (angle * Math.PI) / 180;
};
