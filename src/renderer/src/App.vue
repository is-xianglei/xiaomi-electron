<script setup>
import Versions from './components/Versions.vue'
import Index from './pages/index.vue'

const ipcHandle = () => window.electron.ipcRenderer.send('ping')
</script>

<template>
  <Index />
</template>
