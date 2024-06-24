import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import Detector from '@/utils/Detector.js';

/**
 * Lable基类，将html结构转化成可加载到3D场景中的2D对象，仅创造对象，不做更新
 *
 * @param {Dom} HTML 文本内容 ,必须项，否则无法创建，未传入时报告错误
 * @param {Number} scale 放缩比例
 * @param {Object} position 位置
 * @param {Boolean} visible 是否可见
 */
export default class Lable2D {
  constructor(HTML, scale, position, visible) {
    // 参数判断
    if (!HTML) {
      console.error('Lable2D: HTML is required!');
      return;
    }

    this.HTML = HTML;
    this.scale = scale || 1;
    this.position = position || { x: 0, y: 0, z: 0 };
    this.visible = visible || true;
    this.lable = null;

    this.init(); // 初始化
  }
  // 初始化创建2D对象，并加入到场景中
  init() {
    this.lable = new CSS2DObject(this.HTML); // 对象转化
    this.lable.scale.set(this.scale, this.scale, this.scale);
    this.lable.position.set(
      Math.floor(Math.random() * 10000),
      Math.floor(Math.random() * 10000),
      Math.floor(Math.random() * 10000)
    );
    this.lable.visible = this.visible;

    Detector.scene.add(this.lable);
  }
}
