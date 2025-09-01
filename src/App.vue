<template>
  <div id="app">
    <!-- 硬件检查对话框 -->
    <HardwareCheckDialog 
      v-if="showHardwareCheck"
      @check-complete="handleHardwareCheckComplete"
    />
    
    <!-- 主应用内容 -->
    <router-view v-if="hardwareCheckPassed"></router-view>
    
    <!-- 兼容性警告 -->
    <div v-else-if="showCompatibilityWarning" class="compatibility-warning">
      <el-result
        icon="warning"
        title="系统兼容性问题"
        sub-title="您的系统可能无法正常渲染3D内容，应用无法启动"
      >
        <template #extra>
          <el-button type="primary" @click="retryHardwareCheck">重新检查</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HardwareCheckDialog from '@/components/HardwareCheckDialog.vue'

const showHardwareCheck = ref(true)
const hardwareCheckPassed = ref(false)
const showCompatibilityWarning = ref(false)

const handleHardwareCheckComplete = (result) => {
  console.log('硬件检查结果:', result)
  
  showHardwareCheck.value = false
  
  if (result.compatible) {
    hardwareCheckPassed.value = true
    showCompatibilityWarning.value = false
    
    // 保存检查结果到全局状态
    window.hardwareCheckResult = result
  } else {
    showCompatibilityWarning.value = true
  }
}

const retryHardwareCheck = () => {
  showCompatibilityWarning.value = false
  showHardwareCheck.value = true
}

onMounted(() => {
  // 检查是否已有检查结果（避免重复检查）
  if (window.hardwareCheckResult) {
    showHardwareCheck.value = false
    hardwareCheckPassed.value = true
  }
})
</script>

<style scoped>
#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.compatibility-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
}
</style>