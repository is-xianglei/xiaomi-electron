import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import path from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { readdir } from 'fs/promises'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 910,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  ipcMain.handle('get-video-files', readFilesFromDisk)

  ipcMain.handle('sep', () => path.sep)

  // 添加选择文件夹的 IPC 处理器
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择 MiCam 文件夹所在的磁盘或目录'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      
      // 在选择的路径下寻找 MiCam 文件夹
      const miCamPath = path.join(selectedPath, 'MiCam')
      
      try {
        // 检查 MiCam 文件夹是否存在
        const fs = require('fs')
        if (fs.existsSync(miCamPath)) {
          return { success: true, path: miCamPath }
        } else {
          return { success: false, error: '在选择的路径下未找到 MiCam 文件夹' }
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
    
    return { success: false, error: '用户取消选择' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 在 app.whenReady() 中添加协议注册
app.whenReady().then(() => {

  electronApp.setAppUserModelId('com.electron')
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 修改 readFilesFromDisk 函数，返回使用自定义协议的 URL
async function readFilesFromDisk(_, folderPath) {
  try {
    const files = await readdir(folderPath)
    return {
      files: files
        .filter(file => path.extname(file).toLowerCase() === '.mp4')
        .map(file => ({
          name: file,
          fullPath: `${path.join(folderPath, file)}`
        }))
    }
  } catch (error) {
    console.error('读取视频文件失败:', error)
    return { files: [] }
  }
}




