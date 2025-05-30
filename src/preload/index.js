import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getVideoFiles: (folderPath) => ipcRenderer.invoke('get-video-files', folderPath),
  pathSeparator: () => ipcRenderer.invoke('sep'),
  selectExportDirectory: () => ipcRenderer.invoke('select-export-directory'),
  copyFiles: (files, targetDir) => ipcRenderer.invoke('copy-files', { files, targetDir })
})

// 添加更新相关的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // 安装更新
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // 监听更新事件
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
  },
  
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_, progress) => callback(progress))
  },
  
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info))
  }
})