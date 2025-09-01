<template>
  <el-dialog
    v-model="dialogVisible"
    :title="checkResults.overall ? '系统检查完成' : '系统兼容性问题'"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="500px"
    center
  >
    <div class="hardware-check">
      <div class="check-status" :class="{ success: checkResults.overall, warning: !checkResults.overall }">
        <el-icon v-if="checkResults.overall" size="48" color="#67C23A">
          <CircleCheck />
        </el-icon>
        <el-icon v-else size="48" color="#F56C6C">
          <CircleClose />
        </el-icon>
        <h3>{{ checkResults.overall ? '系统兼容，可以开始3D渲染' : '系统不兼容，无法运行3D应用' }}</h3>
      </div>

      <div v-if="!checkResults.overall" class="warning-message">
        <el-icon><InfoFilled /></el-icon>
        <span>当前硬件配置不符合要求，无法运行3D应用</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button 
          type="primary" 
          @click="handleContinue"
          :disabled="!checkResults.overall"
        >
          {{ checkResults.overall ? '开始运行' : '关闭应用' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { CircleCheck, CircleClose, InfoFilled } from '@element-plus/icons-vue'
import hardwareChecker from '@/utils/HardwareChecker.js'

const emit = defineEmits(['check-complete'])

const dialogVisible = ref(true)
const checkResults = ref({
  overall: false,
  details: {}
})

const performCheck = async () => {
    console.log('执行硬件检查...')
    await hardwareChecker.performFullCheck()
    checkResults.value = hardwareChecker.getReport()
    
    // 如果通过检查，自动关闭对话框
    if (checkResults.value.overall) {
      setTimeout(() => {
        handleContinue()
      }, 1000)
    }
  }

const handleContinue = () => {
  dialogVisible.value = false
  emit('check-complete', {
    compatible: checkResults.value.overall,
    details: checkResults.value.details
  })
}

onMounted(() => {
  performCheck()
})
</script>

<style scoped>
.hardware-check-content {
  padding: 20px 0;
}

.check-status {
  text-align: center;
  margin-bottom: 30px;
}

.check-status h3 {
  margin-top: 15px;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.check-details {
  margin-top: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.success {
  color: var(--el-color-success);
}

.warning {
  color: var(--el-color-warning);
}

.error {
  color: var(--el-color-danger);
}

.warning-item {
  margin-bottom: 10px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>