import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
// const api = {
//   ipcRenderer: {
//     send: (...args) => ipcRenderer.send(...args),
//     invoke: (...args) => ipcRenderer.invoke(...args),
//     on: (channel, func) => {
//       ipcRenderer.on(channel, (event, ...args) => func(...args))
//     },
//     once: (channel, func) => {
//       ipcRenderer.once(channel, (event, ...args) => func(...args))
//     }
//   }
// }

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getVideoFiles: (folderPath) => ipcRenderer.invoke('get-video-files', folderPath),
  pathSeparator: () => ipcRenderer.invoke('sep'),
})