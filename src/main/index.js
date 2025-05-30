import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import path from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { readdir } from 'fs/promises'
import fs from "fs";
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// 配置日志
log.transports.file.level = 'info'
autoUpdater.logger = log

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 我知道不安全，但是你就说能不能用)🐶
      sandbox: false
    }
  })

  // 检查更新
  checkForUpdates(mainWindow)

  ipcMain.handle('get-video-files', readFilesFromDisk)

  ipcMain.handle('sep', () => path.sep)

  ipcMain.handle('select-folder', openDirectory)

  ipcMain.handle('select-export-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result
  })

  ipcMain.handle('copy-files', async (_, { files, targetDir }) => {
    try {
      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // 复制所有文件
      const copyPromises = files.map(file => {
        const fileName = path.basename(file)
        const targetPath = path.join(targetDir, fileName)
        return fs.promises.copyFile(file, targetPath)
      })

      await Promise.all(copyPromises)
      return { success: true }
    } catch (error) {
      console.error('复制文件失败:', error)
      return { success: false, error: error.message }
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  //   mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  // } else {
  //   mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  // }
}

// 添加检查更新函数
function checkForUpdates(mainWindow) {
  // 检查更新出错
  autoUpdater.on('error', (err) => {
    log.error('更新检查失败:', err)
  })

  // 检查到新版本
  autoUpdater.on('update-available', (info) => {
    log.info('发现新版本:', info)
    mainWindow.webContents.send('update-available', info)
  })

  // 没有新版本
  autoUpdater.on('update-not-available', (info) => {
    log.info('当前已是最新版本:', info)
  })

  // 更新下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    log.info('下载进度:', progressObj)
    mainWindow.webContents.send('download-progress', progressObj)
  })

  // 更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    log.info('更新下载完成:', info)
    mainWindow.webContents.send('update-downloaded', info)
  })

  // 执行自动更新检查
  autoUpdater.checkForUpdates()
}

// 添加更新相关的 IPC 处理程序
ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdates()
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall()
})

// 在 app.whenReady() 中添加协议注册
app.whenReady().then(() => {

  electronApp.setAppUserModelId('com.electron')

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 修改 readFilesFromDisk 函数，可以返回使用自定义协议的 URL，但是就先这样吧，能跑就行
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

async function openDirectory() {
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
}




