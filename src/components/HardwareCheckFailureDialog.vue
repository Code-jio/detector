<template>
  <el-dialog
    v-model="visible"
    title="系统兼容性问题"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="500px"
    center
  >
    <div class="hardware-check">
      <div class="check-status warning">
        <el-icon size="48" color="#F56C6C">
          <CircleClose />
        </el-icon>
        <h3>系统不兼容，无法运行3D应用</h3>
      </div>

      <div class="warning-message">
        <el-icon><InfoFilled /></el-icon>
        <span>当前硬件配置不符合要求，无法运行3D应用</span>
      </div>

      <div v-if="details" class="check-details">
        <div class="detail-item">
          <span class="label">WebGL支持:</span>
          <span :class="details.webgl ? 'success' : 'error'">
            {{ details.webgl ? '支持' : '不支持' }}
          </span>
        </div>
        <div class="detail-item">
          <span class="label">显存:</span>
          <span :class="details.vram >= 2048 ? 'success' : 'error'">
            {{ details.vram ? `${details.vram}MB` : '未知' }}
          </span>
        </div>
        <div class="detail-item">
          <span class="label">系统内存:</span>
          <span :class="details.memory >= 4096 ? 'success' : 'error'">
            {{ details.memory ? `${details.memory}MB` : '未知' }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="handleRetry">重新检查</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { CircleClose, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  details: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'retry'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleRetry = () => {
  emit('retry')
}
</script>

<style scoped>
.hardware-check {
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

.warning-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  color: var(--el-color-danger);
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

.error {
  color: var(--el-color-danger);
}

.warning {
  color: var(--el-color-warning);
}

.dialog-footer {
  display: flex;
  justify-content: center;
}
</style>