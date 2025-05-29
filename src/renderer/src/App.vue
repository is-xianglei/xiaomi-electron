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
</template>

<script setup>
import Index from './pages/index.vue'
import {computed, ref} from "vue";

const basePath = ref('')
const isPathSelected = ref(false)

let folderPath = ref('')
const isFolderPathEmpty = computed(() => folderPath.value === '')

const selectDisk = async () => {
  if (!isPathSelected.value) {
    const result = await window.api.selectFolder()
    if (result.success) {
      basePath.value = result.path
      isPathSelected.value = true
    } else {
      //alert(result.error || '选择文件夹失败')
      return;
    }
  }
  folderPath.value = `${basePath.value}${await window.api.pathSeparator()}`
}

</script>

<style scoped>
.root {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
