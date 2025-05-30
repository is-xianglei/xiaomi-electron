<template>
  <div v-if="isFolderPathEmpty" class="root">
    <img alt="logo" class="logo" src="./assets/electron.svg" />
    <div class="creator">Powered by Anlan</div>
    <div class="text">
      Video Management Tool for
      <span class="vue">Xiaomi SU7</span>
    </div>
    <p class="tip">Click the button to select a disk</p>
    <div class="actions">
      <!--    <div class="action">-->
      <!--      <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>-->
      <!--    </div>-->
      <div class="action">
        <a target="_blank" rel="noreferrer" @click="selectDisk">选择 U 盘</a>
      </div>
    </div>
  </div>
  <Index v-if="!isFolderPathEmpty" :folder-path="folderPath"/>

  <!-- 更新提示对话框 -->
  <div v-if="updateDialogVisible" class="update-dialog-overlay">
    <div class="update-dialog">
      <div class="update-dialog-header">
        <h2>发现新版本</h2>
        <button class="close-btn" @click="updateDialogVisible = false">&times;</button>
      </div>
      
      <div class="update-dialog-content">
        <div v-if="updateInfo" class="update-info">
          <p class="version">新版本: {{ updateInfo.version }}</p>
          <div class="release-notes">
            <h3>更新说明:</h3>
            <div v-html="updateInfo.releaseNotes"></div>
          </div>
        </div>
        
        <div v-if="downloadProgress" class="download-progress">
          <p>下载进度: {{ Math.floor(downloadProgress.percent) }}%</p>
          <div class="progress-bar">
            <div class="progress-bar-fill" :style="{ width: downloadProgress.percent + '%' }"></div>
          </div>
        </div>
      </div>
      
      <div class="update-dialog-footer">
        <button class="btn btn-secondary" @click="updateDialogVisible = false">稍后再说</button>
        <button 
          class="btn btn-primary" 
          @click="installUpdate" 
          :disabled="!updateDownloaded"
          :class="{ 'btn-disabled': !updateDownloaded }"
        >
          立即更新
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import Index from './pages/index.vue'
import {computed, onMounted, ref} from "vue";

const basePath = ref('')
const isPathSelected = ref(false)

let folderPath = ref('')
const isFolderPathEmpty = computed(() => folderPath.value === '')

// 更新相关的状态
const updateDialogVisible = ref(false)
const updateInfo = ref(null)
const downloadProgress = ref(null)
const updateDownloaded = ref(false)

const selectDisk = async () => {
  if (!isPathSelected.value) {
    const result = await window.api.selectFolder()
    if (result.success) {
      basePath.value = result.path
      isPathSelected.value = true
    } else {
      if (result.error !== '用户取消选择') {
        alert(result.error || '选择文件夹失败')
      }
      return;
    }
  }
  folderPath.value = `${basePath.value}${await window.api.pathSeparator()}`
}

// 监听更新事件
onMounted(() => {
  // 监听新版本可用
  window.electronAPI.onUpdateAvailable((info) => {
    updateInfo.value = info
    updateDialogVisible.value = true
  })

  // 监听下载进度
  window.electronAPI.onDownloadProgress((progress) => {
    downloadProgress.value = progress
  })

  // 监听更新下载完成
  window.electronAPI.onUpdateDownloaded((info) => {
    updateDownloaded.value = true
    alert('更新已下载完成，点击"立即更新"按钮安装')
  })
})

// 安装更新
const installUpdate = async () => {
  try {
    await window.electronAPI.installUpdate()
  } catch (error) {
    alert('安装更新失败：' + error.message)
  }
}
</script>

<style scoped>
.root {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* 更新对话框样式 */
.update-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.update-dialog {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.update-dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-dialog-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.update-dialog-content {
  padding: 20px;
  overflow-y: auto;
}

.update-info {
  margin-bottom: 20px;
}

.version {
  font-size: 16px;
  color: #333;
  margin-bottom: 10px;
}

.release-notes {
  color: #666;
}

.release-notes h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

.download-progress {
  margin-top: 20px;
}

.progress-bar {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-bar-fill {
  height: 100%;
  background: #0066cc;
  transition: width 0.3s ease;
}

.update-dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #0066cc;
  color: white;
}

.btn-primary:hover:not(.btn-disabled) {
  background: #0052a3;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e8e8e8;
}

.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
