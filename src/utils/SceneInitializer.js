/**
 * 3D场景初始化工具
 * 提供统一的硬件检查和场景初始化功能
 */

import * as THREE from 'three'

class SceneInitializer {
    constructor() {
        this.initialized = false
        this.hardwareCheck = null
    }

    /**
     * 执行硬件检查
     */
    async performHardwareCheck() {
        // 使用全局的检查结果
        this.hardwareCheck = window.hardwareCheckResult || { compatible: true }
        
        if (!this.hardwareCheck.compatible && !this.hardwareCheck.forceStart) {
            console.error('硬件检查未通过，无法启动3D渲染')
            return false
        }
        
        return true
    }

    /**
     * 根据硬件配置优化渲染器设置
     */
    optimizeRendererConfig(renderer) {
        if (!this.hardwareCheck || !this.hardwareCheck.details) {
            return renderer
        }

        const { vram, gpu } = this.hardwareCheck.details

        // 显存优化
        if (vram && vram.estimated < 2 * 1024 * 1024 * 1024) {
            console.warn('显存较小，启用低质量渲染模式')
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
            renderer.shadowMap.enabled = false
        }

        // 集成显卡优化
        if (gpu && gpu.isIntegrated) {
            console.warn('检测到集成显卡，启用性能优化模式')
            renderer.shadowMap.enabled = false
            renderer.antialias = false
        }

        // 高性能显卡优化
        if (gpu && gpu.isDiscrete && vram && vram.estimated >= 4 * 1024 * 1024 * 1024) {
            console.log('检测到高性能显卡，启用高质量渲染模式')
            renderer.shadowMap.enabled = true
            renderer.shadowMap.type = 2 // PCFSoftShadowMap
            renderer.antialias = true
        }

        return renderer
    }

    /**
     * 检查WebGL支持
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas')
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
            
            if (!gl) {
                console.error('您的浏览器不支持WebGL')
                return false
            }

            return true
        } catch (error) {
            console.error('WebGL检查失败:', error)
            return false
        }
    }

    /**
     * 创建渲染器时的硬件适配
     */
    createRendererWithHardwareCheck(options = {}) {
        if (!this.checkWebGLSupport()) {
            throw new Error('WebGL不支持')
        }

        const defaultOptions = {
            antialias: true,
            alpha: true,
            precision: 'highp',
            powerPreference: 'high-performance'
        }

        // 根据硬件调整选项
        if (this.hardwareCheck && this.hardwareCheck.details) {
            const { vram, gpu } = this.hardwareCheck.details

            if (vram && vram.estimated < 2 * 1024 * 1024 * 1024) {
                defaultOptions.antialias = false
                defaultOptions.precision = 'mediump'
            }

            if (gpu && gpu.isIntegrated) {
                defaultOptions.powerPreference = 'low-power'
            }
        }

        return new THREE.WebGLRenderer({
            ...defaultOptions,
            ...options
        })
    }

    /**
     * 获取性能建议
     */
    getPerformanceAdvice() {
        if (!this.hardwareCheck || !this.hardwareCheck.details) {
            return []
        }

        const advice = []
        const { vram, gpu, ram } = this.hardwareCheck.details

        if (vram && vram.estimated < 2 * 1024 * 1024 * 1024) {
            advice.push({
                type: 'warning',
                message: '显存较小，建议降低渲染质量'
            })
        }

        if (gpu && gpu.isIntegrated) {
            advice.push({
                type: 'info',
                message: '集成显卡性能有限，建议关闭阴影和抗锯齿'
            })
        }

        if (ram && ram.total < 4 * 1024 * 1024 * 1024) {
            advice.push({
                type: 'warning',
                message: '内存较小，建议关闭其他应用程序'
            })
        }

        return advice
    }

    /**
     * 初始化场景前的完整检查
     */
    async initializeScene() {
        // 检查硬件
        const hardwareOk = await this.performHardwareCheck()
        if (!hardwareOk) {
            return false
        }

        // 检查WebGL
        const webglOk = this.checkWebGLSupport()
        if (!webglOk) {
            return false
        }

        this.initialized = true
        return true
    }
}

// 创建单例
const sceneInitializer = new SceneInitializer()

export default sceneInitializer