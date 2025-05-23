<template>
  <div class="electron-info">
    <el-card class="info-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>🖥️ Electron 环境信息</span>
          <el-tag v-if="isElectron" type="success">Electron环境</el-tag>
          <el-tag v-else type="warning">浏览器环境</el-tag>
        </div>
      </template>
      
      <div v-if="isElectron" class="electron-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="平台">
            {{ electronInfo.platform }}
          </el-descriptions-item>
          <el-descriptions-item label="Node.js版本">
            {{ electronInfo.versions.node }}
          </el-descriptions-item>
          <el-descriptions-item label="Chrome版本">
            {{ electronInfo.versions.chrome }}
          </el-descriptions-item>
          <el-descriptions-item label="Electron版本">
            {{ electronInfo.versions.electron }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="control-buttons">
          <el-button-group>
            <el-button @click="minimizeWindow" icon="Minus">最小化</el-button>
            <el-button @click="maximizeWindow" icon="FullScreen">
              {{ isMaximized ? '还原' : '最大化' }}
            </el-button>
            <el-button @click="closeWindow" type="danger" icon="Close">关闭</el-button>
          </el-button-group>
        </div>
        
        <div class="app-info">
          <el-alert
            title="应用信息"
            type="info"
            :closable="false"
            show-icon
          >
            <p>应用名称: {{ appInfo.name }}</p>
            <p>应用版本: {{ appInfo.version }}</p>
          </el-alert>
        </div>
      </div>
      
      <div v-else class="browser-content">
        <el-alert
          title="浏览器环境"
          type="warning"
          description="当前运行在浏览器环境中，Electron API不可用"
          :closable="false"
          show-icon
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 响应式数据
const isElectron = ref(false);
const electronInfo = ref({
  platform: '',
  versions: {
    node: '',
    chrome: '',
    electron: ''
  }
});
const appInfo = ref({
  name: '',
  version: ''
});
const isMaximized = ref(false);

/**
 * 检查是否在Electron环境中
 */
function checkElectronEnvironment() {
  isElectron.value = !!(window.electronAPI);
  
  if (isElectron.value) {
    electronInfo.value = {
      platform: window.electronAPI.platform,
      versions: window.electronAPI.versions
    };
    
    // 获取应用信息
    loadAppInfo();
    checkWindowState();
  }
}

/**
 * 加载应用信息
 */
async function loadAppInfo() {
  try {
    if (window.electronAPI?.app) {
      appInfo.value.name = await window.electronAPI.app.getName();
      appInfo.value.version = await window.electronAPI.app.getVersion();
    }
  } catch (error) {
    console.error('获取应用信息失败:', error);
  }
}

/**
 * 检查窗口状态
 */
async function checkWindowState() {
  try {
    if (window.electronAPI?.window) {
      isMaximized.value = await window.electronAPI.window.isMaximized();
    }
  } catch (error) {
    console.error('检查窗口状态失败:', error);
  }
}

/**
 * 最小化窗口
 */
async function minimizeWindow() {
  try {
    await window.electronAPI.window.minimize();
  } catch (error) {
    console.error('最小化窗口失败:', error);
  }
}

/**
 * 最大化/还原窗口
 */
async function maximizeWindow() {
  try {
    await window.electronAPI.window.maximize();
    // 更新状态
    setTimeout(checkWindowState, 100);
  } catch (error) {
    console.error('切换窗口状态失败:', error);
  }
}

/**
 * 关闭窗口
 */
async function closeWindow() {
  try {
    await window.electronAPI.window.close();
  } catch (error) {
    console.error('关闭窗口失败:', error);
  }
}

// 组件挂载时检查环境
onMounted(() => {
  checkElectronEnvironment();
});
</script>

<style scoped>
.electron-info {
  margin: 20px;
}

.info-card {
  max-width: 600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.electron-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-buttons {
  display: flex;
  justify-content: center;
}

.app-info p {
  margin: 5px 0;
}

.browser-content {
  text-align: center;
}
</style> 