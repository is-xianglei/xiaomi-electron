import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import rem from './../../utils/rem'

// 初始化 rem 配置
rem.install(window, document)

createApp(App).mount('#app')
