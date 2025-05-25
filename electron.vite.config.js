import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    main: {
      // vite config options
      plugins: [externalizeDepsPlugin()]
    },
    preload: {
      // vite config options
      plugins: [externalizeDepsPlugin()]
    },
    renderer: {
      // vite config options
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src')
        }
      },
      plugins: [vue()]
    }
  })