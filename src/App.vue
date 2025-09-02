<template>
  <div id="app">
    <!-- 主应用内容 - 如果检查通过直接渲染 -->
    <router-view v-if="hardwareCheckPassed"></router-view>
    
    <!-- 加载中状态 -->
    <div v-else-if="isChecking" class="loading-container">
      <el-loading :loading="true" text="正在检查系统兼容性..." size="large" />
    </div>
    
    <!-- 硬件检查失败对话框 -->
    <HardwareCheckFailureDialog
      v-model="showHardwareDialog"
      :details="checkResults.details"
      @retry="retryHardwareCheck"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HardwareCheckFailureDialog from '@/components/HardwareCheckFailureDialog.vue'
import hardwareChecker from '@/utils/HardwareChecker.js'

const hardwareCheckPassed = ref(false)
const isChecking = ref(true)
const showHardwareDialog = ref(false)
const checkResults = ref({})

const performHardwareCheck = async () => {
  console.log('执行硬件检查...')
  isChecking.value = true
  
  try {
    await hardwareChecker.performFullCheck()
    const result = hardwareChecker.getReport()
    checkResults.value = result
    
    if (result.overall) {
      // 检查通过，直接渲染
      hardwareCheckPassed.value = true
      // 保存检查结果到全局状态
      window.hardwareCheckResult = result
    } else {
      // 检查失败，显示对话框
      showHardwareDialog.value = true
    }
  } catch (error) {
    console.error('硬件检查失败:', error)
    showHardwareDialog.value = true
  } finally {
    isChecking.value = false
  }
}

const retryHardwareCheck = () => {
  showHardwareDialog.value = false
  performHardwareCheck()
}

onMounted(() => {
  // 检查是否已有检查结果（避免重复检查）
  if (window.hardwareCheckResult) {
    hardwareCheckPassed.value = true
    isChecking.value = false
  } else {
    performHardwareCheck()
  }
})
</script>

<style scoped>
#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
}
</style>