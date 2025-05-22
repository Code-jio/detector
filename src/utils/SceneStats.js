import * as THREE from "three";

/**
 * 场景性能统计类
 */
class SceneStats {
    constructor() {
        this.reset();
    }

    reset() {
        this.meshCount = 0;      // 网格数
        this.vertexCount = 0;    // 顶点数
        this.faceCount = 0;      // 面数
        this.triangleCount = 0;  // 三角形数
        this.materialCount = 0;  // 材质数
        this.textureCount = 0;   // 贴图数
    }

    /**
     * 统计几何体的顶点和面数
     * @param {THREE.BufferGeometry|THREE.Geometry} geometry - 几何体
     * @returns {Object} 统计结果
     */
    countGeometry(geometry) {
        let vertices = 0;
        let faces = 0;

        if (!geometry) return { vertices, faces };

        // BufferGeometry (新版)
        if (geometry.isBufferGeometry) {
            // 获取顶点数
            if (geometry.attributes.position) {
                vertices = geometry.attributes.position.count;
            }

            // 计算面数
            if (geometry.index) {
                // 如果有索引缓冲区
                faces = geometry.index.count / 3;
            } else {
                // 没有索引缓冲区，则按顶点数计算
                faces = vertices / 3;
            }
        } 
        // 老版 Geometry
        else if (geometry.vertices && geometry.faces) {
            vertices = geometry.vertices.length;
            faces = geometry.faces.length;
        }

        return { vertices, faces };
    }

    /**
     * 统计材质与贴图
     * @param {THREE.Material|Array<THREE.Material>} material - 材质
     * @param {Set} materialsSet - 材质集合
     * @param {Set} texturesSet - 贴图集合
     */
    countMaterialAndTextures(material, materialsSet, texturesSet) {
        if (Array.isArray(material)) {
            material.forEach(mat => {
                if (mat) {
                    materialsSet.add(mat);
                    this.collectTextures(mat, texturesSet);
                }
            });
        } else if (material) {
            materialsSet.add(material);
            this.collectTextures(material, texturesSet);
        }
    }

    /**
     * 收集材质中的所有贴图
     * @param {THREE.Material} material - 材质
     * @param {Set} texturesSet - 贴图集合
     */
    collectTextures(material, texturesSet) {
        // 常见的贴图类型
        const textureTypes = [
            'map', 'normalMap', 'bumpMap', 'displacementMap', 
            'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap',
            'emissiveMap', 'envMap', 'lightMap', 'specularMap'
        ];

        textureTypes.forEach(type => {
            if (material[type] && material[type].isTexture) {
                texturesSet.add(material[type]);
            }
        });
    }

    /**
     * 统计场景中的性能指标
     * @param {THREE.Scene} scene - Three.js场景对象
     * @returns {Object} 统计结果
     */
    update(scene) {
        this.reset();
        
        // 使用Set来去重统计材质和贴图
        const materials = new Set();
        const textures = new Set();

        // 遍历场景
        scene.traverse((object) => {
            // 网格对象
            if (object.isMesh) {
                this.meshCount++;
                
                // 统计几何体信息
                if (object.geometry) {
                    const { vertices, faces } = this.countGeometry(object.geometry);
                    this.vertexCount += vertices;
                    this.faceCount += faces;
                    this.triangleCount += faces; // 假设所有面都是三角形
                }

                // 统计材质和贴图
                this.countMaterialAndTextures(object.material, materials, textures);
            } 
            // 精灵对象
            else if (object.isSprite) {
                this.meshCount++;
                this.vertexCount += 4;  // 精灵由2个三角形组成，共4个顶点
                this.faceCount += 2;    // 2个三角形面
                this.triangleCount += 2;
                
                this.countMaterialAndTextures(object.material, materials, textures);
            }
            // 点云对象
            else if (object.isPoints) {
                this.meshCount++;
                if (object.geometry && object.geometry.attributes.position) {
                    this.vertexCount += object.geometry.attributes.position.count;
                }
                
                this.countMaterialAndTextures(object.material, materials, textures);
            }
            // 线对象
            else if (object.isLine) {
                this.meshCount++;
                if (object.geometry && object.geometry.attributes.position) {
                    this.vertexCount += object.geometry.attributes.position.count;
                    // 线段数 = 顶点数 - 1 (对于LineSegments)
                    if (object.isLineSegments) {
                        this.faceCount += object.geometry.attributes.position.count / 2;
                    }
                }
                
                this.countMaterialAndTextures(object.material, materials, textures);
            }
        });

        this.materialCount = materials.size;
        this.textureCount = textures.size;

        return {
            meshes: this.meshCount,
            vertices: this.vertexCount,
            faces: Math.round(this.faceCount),
            triangles: Math.round(this.triangleCount),
            materials: this.materialCount,
            textures: this.textureCount
        };
    }

    /**
     * 获取格式化的统计信息
     * @returns {string} 格式化的统计信息
     */
    getFormattedStats() {
        return `网格数: ${this.meshCount}, 顶点数: ${this.vertexCount}, 面数: ${Math.round(this.faceCount)}, 三角面数: ${Math.round(this.triangleCount)}, 材质数: ${this.materialCount}, 贴图数: ${this.textureCount}`;
    }
}

export default new SceneStats(); 