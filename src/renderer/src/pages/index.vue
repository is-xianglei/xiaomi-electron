<template>
  <div class="video-manager">
    <!-- 左侧视频列表 -->
    <div class="left-panel">
      <div class="controls">
        <button 
          :class="{ active: currentTab === 'recent' }"
          @click="switchTab('recent')"
        >
          循环记录
        </button>
        <button 
          :class="{ active: currentTab === 'saved' }"
          @click="switchTab('saved')"
        >
          按键保存
        </button>
        <button @click="selectNewPath" class="path-button">
          重选路径
        </button>
      </div>
      
      <div class="video-list">
        <div 
          v-for="date in sortedDates" 
          :key="date"
          class="date-group"
        >
          <div class="date-header">{{ date }}</div>
          <div 
            v-for="timeGroup in videosByDate[date]" 
            :key="timeGroup.time"
            class="video-item"
            :class="{ selected: selectedVideo?.time === timeGroup.time && selectedVideo?.date === date }"
            @click="selectVideo(date, timeGroup)"
          >
            <div class="video-time">{{ timeGroup.time }}</div>
            <div class="video-info">
              <span class="duration">{{ timeGroup.duration }}分钟</span>
              <span class="angles">{{ timeGroup.angles.length }}个视角</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧视频播放区域 -->
    <div class="right-panel">
      <div class="video-grid">
        <div class="video-container">
          <div class="video-label">前视</div>
          <video 
            ref="frontVideo"
            :src="currentVideos.front"
            controls
            @timeupdate="syncVideos"
            @play="playAllVideos"
            @pause="pauseAllVideos"
          ></video>
        </div>
        
        <div class="video-container">
          <div class="video-label">后视</div>
          <video 
            ref="backVideo"
            :src="currentVideos.back"
            controls
          ></video>
        </div>
        
        <div class="video-container">
          <div class="video-label">左视</div>
          <video 
            ref="leftVideo"
            :src="currentVideos.left"
            controls
          ></video>
        </div>
        
        <div class="video-container">
          <div class="video-label">右视</div>
          <video 
            ref="rightVideo"
            :src="currentVideos.right"
            controls
          ></video>
        </div>
      </div>
      
      <!-- 播放控制 -->
      <div class="playback-controls">
        <button @click="playAllVideos">全部播放</button>
        <button @click="pauseAllVideos">全部暂停</button>
        <button @click="seekToTime(0)">回到开始</button>
        <div class="time-display">
          当前时间: {{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'

// 响应式数据
const currentTab = ref('recent')
const videosByDate = reactive({})
const selectedVideo = ref(null)
const currentTime = ref(0)
const totalDuration = ref(0)

// 视频引用
const frontVideo = ref(null)
const backVideo = ref(null)
const leftVideo = ref(null)
const rightVideo = ref(null)

// 当前播放的视频路径
const currentVideos = reactive({
  front: '',
  back: '',
  left: '',
  right: ''
})

// 计算属性
const sortedDates = computed(() => {
  return Object.keys(videosByDate).sort((a, b) => new Date(b) - new Date(a))
})

// 方法
const switchTab = async (tab) => {
  currentTab.value = tab
  await loadVideos()
}

// 在 script setup 部分添加
const basePath = ref('')
const isPathSelected = ref(false)

// 修改 loadVideos 方法
const loadVideos = async () => {
  try {
    console.log(window)
    basePath.value = 'C:\\Users\\Anlan\\Desktop\\MiCam'
    // 如果还没有选择路径，先让用户选择
    // if (!isPathSelected.value) {
    //   const result = await window.api.selectFolder()
    //   if (result.success) {
    //     basePath.value = result.path
    //     isPathSelected.value = true
    //   } else {
    //     console.error('选择文件夹失败:', result.error)
    //     alert(result.error || '选择文件夹失败')
    //     return
    //   }
    // }
    
    const folderPath = currentTab.value === 'recent' 
      ? `${basePath.value}\\RecentClips`
      : `${basePath.value}\\SavedClips`
    
    // 通过 Electron 的 IPC 获取文件列表和完整路径
    const result = await window.api.getVideoFiles(folderPath)
    console.log(result)
    
    // 清空现有数据
    Object.keys(videosByDate).forEach(key => delete videosByDate[key])
    
    // 解析文件名并按日期分组
    const videoGroups = {}
    
    result.files.forEach(fileInfo => {
      const match = fileInfo.name.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})_(\w+)\.mp4$/)
      if (match) {
        const [, date, time, angle] = match
        const key = `${date}`
        console.log('key:',key)
        if (!videoGroups[key]) {
          videoGroups[key] = {
            date,
            time,
            angles: {},
            files: []
          }
        }
        
        videoGroups[key].angles[angle.toLowerCase()] = fileInfo.fullPath
        videoGroups[key].files.push(fileInfo.name)
      }
    })
    
    // 按日期组织数据
    Object.values(videoGroups).forEach(group => {
      if (!videosByDate[group.date]) {
        videosByDate[group.date] = []
      }
      
      videosByDate[group.date].push({
        time: group.time,
        duration: 1, // 假设每个片段1分钟
        angles: Object.keys(group.angles),
        paths: group.angles
      })
    })
    
    // 对每个日期的视频按时间排序
    Object.keys(videosByDate).forEach(date => {
      videosByDate[date].sort((a, b) => a.time.localeCompare(b.time))
    })
    
  } catch (error) {
    console.error('加载视频失败:', error)
  }
}

// 添加重新选择路径的方法
const selectNewPath = async () => {
  isPathSelected.value = false
  await loadVideos()
}

const selectVideo = (date, timeGroup) => {
  selectedVideo.value = { date, ...timeGroup }
  
  // 设置当前视频路径
  currentVideos.front = timeGroup.paths.front || ''
  currentVideos.back = timeGroup.paths.back || ''
  currentVideos.left = timeGroup.paths.leftback || ''
  currentVideos.right = timeGroup.paths.rightback || ''
  
  // 重置播放时间
  nextTick(() => {
    if (frontVideo.value) {
      frontVideo.value.currentTime = 0
      totalDuration.value = frontVideo.value.duration || 0
    }
  })
}

const syncVideos = (event) => {
  const masterTime = event.target.currentTime
  currentTime.value = masterTime
  
  // 同步其他视频的播放时间
  const videos = [backVideo.value, leftVideo.value, rightVideo.value]
  videos.forEach(video => {
    if (video && Math.abs(video.currentTime - masterTime) > 0.5) {
      video.currentTime = masterTime
    }
  })
}

const playAllVideos = () => {
  const videos = [frontVideo.value, backVideo.value, leftVideo.value, rightVideo.value]
  videos.forEach(video => {
    if (video) {
      video.play().catch(console.error)
    }
  })
}

const pauseAllVideos = () => {
  const videos = [frontVideo.value, backVideo.value, leftVideo.value, rightVideo.value]
  videos.forEach(video => {
    if (video) {
      video.pause()
    }
  })
}

const seekToTime = (time) => {
  const videos = [frontVideo.value, backVideo.value, leftVideo.value, rightVideo.value]
  videos.forEach(video => {
    if (video) {
      video.currentTime = time
    }
  })
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 生命周期
onMounted(() => {
  loadVideos()
})
</script>

<style scoped>
.video-manager {
  display: flex;
  height: 100vh;
  background: #1a1a1a;
  color: white;
}

.left-panel {
  width: 300px;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.controls {
  display: flex;
  padding: 10px;
  gap: 10px;
}

.controls button {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #555;
  background: #2a2a2a;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.controls button:hover {
  background: #3a3a3a;
}

.controls button.active {
  background: #0066cc;
  border-color: #0066cc;
}

.video-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.date-group {
  margin-bottom: 20px;
}

.date-header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
  padding: 8px;
  background: #333;
  border-radius: 4px;
}

.video-item {
  padding: 10px;
  margin-bottom: 5px;
  background: #2a2a2a;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.video-item:hover {
  background: #3a3a3a;
}

.video-item.selected {
  background: #0066cc;
}

.video-time {
  font-weight: bold;
  margin-bottom: 5px;
}

.video-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #ccc;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.video-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 15px;
  flex: 1;
  margin-bottom: 20px;
}

.video-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-label {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 1;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #2a2a2a;
  border-radius: 8px;
}

.playback-controls button {
  padding: 8px 16px;
  border: none;
  background: #0066cc;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.playback-controls button:hover {
  background: #0052a3;
}

.time-display {
  margin-left: auto;
  font-family: monospace;
  color: #ccc;
}
</style>