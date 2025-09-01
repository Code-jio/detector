/**
 * 硬件检测工具类
 * 用于检测系统硬件是否满足3D渲染要求
 */

class HardwareChecker {
    constructor() {
        this.requirements = {
            minVRAM: 2 * 1024 * 1024 * 1024, // 2GB 显存（字节）
            recommendedVRAM: 4 * 1024 * 1024 * 1024, // 4GB 推荐显存
            minRAM: 4 * 1024 * 1024 * 1024, // 4GB 内存
            recommendedRAM: 8 * 1024 * 1024 * 1024, // 8GB 推荐内存
            webGL2Supported: true,
            webGPURequired: false
        };
        
        this.checkResults = {
            gpu: null,
            vram: null,
            ram: null,
            webgl: null,
            overall: false,
            warnings: []
        };
    }

    /**
     * 检测WebGL支持
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (!gl) {
                this.checkResults.webgl = {
                    supported: false,
                    version: null,
                    error: 'WebGL不支持'
                };
                return false;
            }

            const version = gl.getParameter(gl.VERSION);
            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);

            this.checkResults.webgl = {
                supported: true,
                version: version,
                renderer: renderer,
                vendor: vendor
            };

            return true;
        } catch (error) {
            this.checkResults.webgl = {
                supported: false,
                error: error.message
            };
            return false;
        }
    }

    /**
     * 检测显存大小（估算）
     */
    async checkVRAM() {
        try {
            // 使用WebGL的MAX_TEXTURE_SIZE和MAX_VIEWPORT_DIMS来估算
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (!gl) {
                this.checkResults.vram = {
                    estimated: 0,
                    meetsMinimum: false,
                    meetsRecommended: false,
                    error: 'WebGL不支持'
                };
                return 0;
            }

            // 获取GPU能力指标
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
            const maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
            
            // 基于这些参数估算显存（这不是精确的，但是一个合理的估算）
            let estimatedVRAM = 512 * 1024 * 1024; // 默认512MB
            
            if (maxTextureSize >= 16384) {
                estimatedVRAM = 8 * 1024 * 1024 * 1024; // 8GB
            } else if (maxTextureSize >= 8192) {
                estimatedVRAM = 4 * 1024 * 1024 * 1024; // 4GB
            } else if (maxTextureSize >= 4096) {
                estimatedVRAM = 2 * 1024 * 1024 * 1024; // 2GB
            } else if (maxTextureSize >= 2048) {
                estimatedVRAM = 1 * 1024 * 1024 * 1024; // 1GB
            }

            this.checkResults.vram = {
                estimated: estimatedVRAM,
                meetsMinimum: estimatedVRAM >= this.requirements.minVRAM,
                meetsRecommended: estimatedVRAM >= this.requirements.recommendedVRAM,
                maxTextureSize: maxTextureSize,
                maxViewportDims: maxViewportDims,
                maxFragmentUniforms: maxFragmentUniforms
            };

            return estimatedVRAM;
        } catch (error) {
            this.checkResults.vram = {
                estimated: 0,
                error: error.message
            };
            return 0;
        }
    }

    /**
     * 检测系统内存
     */
    checkSystemRAM() {
        try {
            // 使用performance.memory API（Chrome/Edge支持）
            if (performance.memory) {
                const ram = performance.memory.jsHeapSizeLimit;
                
                this.checkResults.ram = {
                    total: ram,
                    meetsMinimum: ram >= this.requirements.minRAM,
                    meetsRecommended: ram >= this.requirements.recommendedRAM,
                    jsHeapSizeLimit: ram
                };
                
                return ram;
            } else {
                // 如果浏览器不支持，返回一个保守估算
                const estimatedRAM = 4 * 1024 * 1024 * 1024; // 假设4GB
                this.checkResults.ram = {
                    total: estimatedRAM,
                    estimated: true,
                    meetsMinimum: estimatedRAM >= this.requirements.minRAM,
                    meetsRecommended: estimatedRAM >= this.requirements.recommendedRAM,
                    note: '使用估算值，浏览器不支持精确检测'
                };
                return estimatedRAM;
            }
        } catch (error) {
            this.checkResults.ram = {
                error: error.message
            };
            return 0;
        }
    }

    /**
     * 检测GPU信息
     */
    checkGPUInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (!gl) {
                this.checkResults.gpu = {
                    detected: false,
                    error: 'WebGL不支持'
                };
                return false;
            }

            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);
            
            // 检测是否为集成显卡
            const isIntegrated = /intel|integrated|hd graphics|uhd graphics/i.test(renderer + vendor);
            const isDiscrete = /nvidia|amd|ati|geforce|radeon/i.test(renderer + vendor);
            
            this.checkResults.gpu = {
                detected: true, // 标记为已检测
                renderer: renderer, // 渲染器名称
                vendor: vendor, // 显卡厂商
                isIntegrated: isIntegrated, // 是否为集成显卡
                isDiscrete: isDiscrete, // 是否为独立显卡
                isHighPerformance: isDiscrete && !isIntegrated // 是否为高性能显卡
            };

            return true;
        } catch (error) {
            this.checkResults.gpu = {
                detected: false,
                error: error.message
            };
            return false;
        }
    }

    /**
     * 执行完整的硬件检查
     */
    async performFullCheck() {
        console.log('开始硬件兼容性检查...');
        
        // 执行各项检查
        this.checkWebGLSupport();
        await this.checkVRAM();
        this.checkSystemRAM();
        this.checkGPUInfo();

        // 生成警告信息
        this.generateWarnings();

        // 判断总体兼容性
        this.checkResults.overall = this.evaluateOverallCompatibility();

        console.log('硬件检查结果:', this.checkResults);
        return this.checkResults;
    }

    /**
     * 生成警告信息
     */
    generateWarnings() {
        this.checkResults.warnings = [];

        if (!this.checkResults.webgl?.supported) {
            this.checkResults.warnings.push({
                type: 'critical',
                message: 'WebGL不支持，无法进行3D渲染'
            });
        }

        if (this.checkResults.vram && !this.checkResults.vram.meetsMinimum) {
            this.checkResults.warnings.push({
                type: 'warning',
                message: `显存不足：检测到的显存约为 ${this.formatBytes(this.checkResults.vram.estimated)}，建议至少 ${this.formatBytes(this.requirements.minVRAM)}`
            });
        }

        if (this.checkResults.ram && !this.checkResults.ram.meetsMinimum) {
            this.checkResults.warnings.push({
                type: 'warning',
                message: `内存不足：检测到的内存约为 ${this.formatBytes(this.checkResults.ram.total)}，建议至少 ${this.formatBytes(this.requirements.minRAM)}`
            });
        }

        if (this.checkResults.gpu?.isIntegrated && !this.checkResults.gpu.isDiscrete) {
            this.checkResults.warnings.push({
                type: 'info',
                message: '检测到集成显卡，性能可能受限，建议使用独立显卡'
            });
        }
    }

    /**
     * 评估总体兼容性
     */
    evaluateOverallCompatibility() {
        // 基本条件：必须支持WebGL
        if (!this.checkResults.webgl?.supported) {
            return false;
        }

        // 显存检查
        if (this.checkResults.vram && !this.checkResults.vram.meetsMinimum) {
            return false;
        }

        // 内存检查
        if (this.checkResults.ram && !this.checkResults.ram.meetsMinimum) {
            return false;
        }

        return true;
    }

    /**
     * 格式化字节大小
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 获取检查报告
     */
    getReport() {
        return {
            overall: this.checkResults.overall,
            details: {
                webgl: this.checkResults.webgl,
                vram: this.checkResults.vram,
                gpu: this.checkResults.gpu,
                ram: this.checkResults.ram
            }
        };
    }

    /**
     * 获取改进建议
     */
    getRecommendations() {
        const recommendations = [];

        if (!this.checkResults.overall) {
            recommendations.push('建议使用支持WebGL的现代浏览器');
            recommendations.push('请确保显卡驱动已更新到最新版本');
            recommendations.push('关闭其他占用显存的应用程序');
            
            if (this.checkResults.vram && !this.checkResults.vram.meetsMinimum) {
                recommendations.push('考虑升级显卡以获得更好的3D性能');
            }
        }

        if (this.checkResults.gpu?.isIntegrated) {
            recommendations.push('使用独立显卡可显著提升3D渲染性能');
        }

        return recommendations;
    }
}

// 创建单例实例
const hardwareChecker = new HardwareChecker();

export default hardwareChecker;
export { HardwareChecker };