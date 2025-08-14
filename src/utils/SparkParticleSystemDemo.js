/**
 * SparkParticleSystem 使用示例
 * 
 * 这个文件展示了如何使用新添加的显示/隐藏控制和保存管理功能
 */

import { SparkParticleSystem } from './SparkParticleSystem.js';

/**
 * 示例：电火花特效管理器
 */
export class SparkEffectManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.sparkSystems = new Map();
    }

    /**
     * 创建新的电火花系统
     * @param {string} id - 系统ID
     * @param {Object} config - 配置参数
     * @returns {SparkParticleSystem} 创建的粒子系统
     */
    createSparkSystem(id, config) {
        const sparkSystem = new SparkParticleSystem(this.scene, config, this.camera);
        this.sparkSystems.set(id, sparkSystem);
        return sparkSystem;
    }

    /**
     * 获取电火花系统
     * @param {string} id - 系统ID
     * @returns {SparkParticleSystem|null} 粒子系统或null
     */
    getSparkSystem(id) {
        return this.sparkSystems.get(id) || null;
    }

    /**
     * 显示指定电火花系统
     * @param {string} id - 系统ID
     */
    showSparkSystem(id) {
        const system = this.sparkSystems.get(id);
        if (system) {
            system.show();
        }
    }

    /**
     * 隐藏指定电火花系统
     * @param {string} id - 系统ID
     */
    hideSparkSystem(id) {
        const system = this.sparkSystems.get(id);
        if (system) {
            system.hide();
        }
    }

    /**
     * 暂停指定电火花系统
     * @param {string} id - 系统ID
     */
    pauseSparkSystem(id) {
        const system = this.sparkSystems.get(id);
        if (system) {
            system.pause();
        }
    }

    /**
     * 恢复指定电火花系统
     * @param {string} id - 系统ID
     */
    resumeSparkSystem(id) {
        const system = this.sparkSystems.get(id);
        if (system) {
            system.resume();
        }
    }

    /**
     * 保存电火花系统状态
     * @param {string} systemId - 系统ID
     * @param {string} stateId - 状态ID
     * @param {Object} additionalData - 额外数据
     */
    saveState(systemId, stateId, additionalData = {}) {
        const system = this.sparkSystems.get(systemId);
        if (system) {
            return system.saveState(stateId, additionalData);
        }
        return null;
    }

    /**
     * 加载电火花系统状态
     * @param {string} systemId - 系统ID
     * @param {string} stateId - 状态ID
     */
    loadState(systemId, stateId) {
        const system = this.sparkSystems.get(systemId);
        if (system) {
            return system.loadState(stateId);
        }
        return false;
    }

    /**
     * 导出所有电火花系统的状态
     * @returns {Object} 导出数据
     */
    exportAllStates() {
        const exportData = {};
        this.sparkSystems.forEach((system, id) => {
            exportData[id] = system.exportStates();
        });
        return exportData;
    }

    /**
     * 导入所有电火花系统的状态
     * @param {Object} importData - 导入数据
     */
    importAllStates(importData) {
        Object.keys(importData).forEach(systemId => {
            const system = this.sparkSystems.get(systemId);
            if (system) {
                system.importStates(importData[systemId]);
            }
        });
    }

    /**
     * 获取所有系统的状态摘要
     * @returns {Object} 状态摘要
     */
    getAllSystemsSummary() {
        const summary = {};
        this.sparkSystems.forEach((system, id) => {
            summary[id] = system.getCurrentStateSummary();
        });
        return summary;
    }

    /**
     * 更新所有电火花系统
     * @param {number} deltaTime - 时间增量
     */
    updateAll(deltaTime) {
        this.sparkSystems.forEach(system => {
            system.update(deltaTime);
        });
    }

    /**
     * 销毁所有电火花系统
     */
    disposeAll() {
        this.sparkSystems.forEach(system => {
            system.dispose();
        });
        this.sparkSystems.clear();
    }
}

/**
 * 示例配置模板
 */
export const SparkConfigTemplates = {
    // 小型电火花
    smallSpark: {
        position: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 1, z: 0 },
        intensity: 50,
        speed: 100,
        lifetime: 0.5,
        color1: '#ffffff',
        randomDirection: true,
        spread: 0.3,
        gravity: -50,
        sparkProbability: 0.3,
        sparkSize: 0.2
    },

    // 大型电火花
    largeSpark: {
        position: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 1, z: 0 },
        intensity: 200,
        speed: 200,
        lifetime: 1.0,
        color1: '#ffffff',
        randomDirection: true,
        spread: 0.5,
        gravity: -100,
        sparkProbability: 0.8,
        sparkSize: 0.5
    },

    // 持续电火花
    continuousSpark: {
        position: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 1, z: 0 },
        intensity: 100,
        speed: 150,
        lifetime: 0.3,
        color1: '#ffffff',
        randomDirection: true,
        spread: 0.2,
        gravity: -80,
        sparkProbability: 0.5,
        sparkSize: 0.3
    }
};

/**
 * 使用示例
 */
export function demonstrateSparkSystemUsage(scene, camera) {
    const manager = new SparkEffectManager(scene, camera);
    
    // 创建电火花系统
    const sparkSystem = manager.createSparkSystem('mainSpark', SparkConfigTemplates.smallSpark);
    
    // 示例操作
    console.log('=== 电火花系统使用示例 ===');
    
    // 1. 显示/隐藏控制
    console.log('1. 显示/隐藏控制');
    sparkSystem.hide(); // 隐藏
    sparkSystem.show(); // 显示
    sparkSystem.toggleVisibility(); // 切换
    
    // 2. 暂停/恢复控制
    console.log('2. 暂停/恢复控制');
    sparkSystem.pause(); // 暂停
    sparkSystem.resume(); // 恢复
    
    // 3. 状态保存和加载
    console.log('3. 状态保存和加载');
    
    // 保存当前状态
    sparkSystem.saveState('defaultState', { description: '默认状态' });
    
    // 修改配置后保存为新状态
    const newConfig = { ...SparkConfigTemplates.smallSpark };
    newConfig.intensity = 150;
    sparkSystem.config = newConfig;
    sparkSystem.saveState('highIntensityState', { description: '高强度状态' });
    
    // 加载状态
    sparkSystem.loadState('defaultState');
    
    // 4. 状态管理
    console.log('4. 状态管理');
    console.log('保存的状态ID:', sparkSystem.getSavedStateIds());
    console.log('当前状态摘要:', sparkSystem.getCurrentStateSummary());
    
    // 5. 导出/导入状态
    console.log('5. 导出/导入状态');
    const exportedStates = sparkSystem.exportStates();
    console.log('导出的状态:', exportedStates);
    
    // 导入状态
    sparkSystem.importStates(exportedStates);
    
    return { manager, sparkSystem };
}