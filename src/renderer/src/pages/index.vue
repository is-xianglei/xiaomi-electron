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
          <div class="date-header" @click="toggleDateGroup(date)">
            {{ date }}
            <span class="toggle-icon">{{ expandedDates[date] ? '▼' : '▶' }}</span>
          </div>
          <transition name="collapse">
            <div v-show="expandedDates[date]" class="date-content">
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
          </transition>
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

// 添加折叠面板状态
const expandedDates = reactive({})

// 切换日期组的展开/折叠状态
const toggleDateGroup = (date) => {
  expandedDates[date] = !expandedDates[date]
}

// 视频引用
const frontVideo = ref(null)
const backVideo = ref(null)
const leftVideo = ref(null)
const rightVideo = ref(null)

// 当前播放的视频路径
const currentVideos = reactive({
  front: 'file:///Users/xianglei/Movies/MiCam/RecentClips/2024-10-22_08-29-43_Front.mp4',
  back: '',
  left: '',
  right: 'file:///Users/xianglei/Movies/MiCam/RecentClips/2024-10-22_08-32-56_RightBack.mp4'
})

// 计算属性
const sortedDates = computed(() => {
  return Object.keys(videosByDate).sort((a, b) => new Date(b) - new Date(a))
})

// 方法
const switchTab = async (tab) => {
  currentTab.value = tab
  //await loadVideos()
}

// 在 script setup 部分添加
const basePath = ref('')
const isPathSelected = ref(false)

// 修改 loadVideos 方法
const loadVideos = async () => {
  try {
    // 如果还没有选择路径，先让用户选择
    if (!isPathSelected.value) {
      const result = await window.api.selectFolder()
      if (result.success) {
        basePath.value = result.path
        isPathSelected.value = true
      } else {
        console.error('选择文件夹失败:', result.error)
        alert(result.error || '选择文件夹失败')
        return
      }
    }
    const folderPath = currentTab.value === 'recent'
      ? `${basePath.value}${await window.api.pathSeparator()}RecentClips`
      : `${basePath.value}${await window.api.pathSeparator()}SavedClips`

    // 通过 Electron 的 IPC 获取文件列表和完整路径
    const result = await window.api.getVideoFiles(folderPath)

    // 清空现有数据
    Object.keys(videosByDate).forEach(key => delete videosByDate[key])
    
    // 解析文件名并按日期分组
    const videoGroups = {}

    for (let index in result.files){
      let fileInfo = result.files[index];
      const match = fileInfo.name.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})_(\w+)\.mp4$/)
      if (match === false){
        continue;
      }
      const [, date, time, angle] = match
      const key = `${date}`
      // 如果不存在则添加到组
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

    debugger;
    // 按日期组织数据
    Object.values(videoGroups).forEach(group => {
      const key = `${group.date}_${group.time}`
      if (!videosByDate[key]) {
        videosByDate[key] = []
      }
      
      videosByDate[key].push({
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
  }finally {
    if (sortedDates.value.length > 0) {
      // 默认展开第一个日期组
      expandedDates[sortedDates.value[0]] = true;
    }
  }

}

// 添加重新选择路径的方法
const selectNewPath = async () => {
  isPathSelected.value = false
  await loadVideos()
}

const selectVideo = (date, timeGroup) => {
  selectedVideo.value = { date, ...timeGroup }
  debugger;
  // 设置当前视频路径
  currentVideos.front = "file://" + timeGroup.paths.front || ''
  currentVideos.back = "file://" + timeGroup.paths.back || ''
  currentVideos.left = "file://" + timeGroup.paths.leftback || ''
  currentVideos.right = "file://" + timeGroup.paths.rightback || ''
  
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
  //loadVideos()
})
</script>

<style scoped>
.video-manager {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #1a1a1a;
  color: white;
}

.left-panel {
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.controls {
  display: flex;
  padding: 0.625rem;
  gap: 0.625rem;
}

.controls button {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 0.0625rem solid #555;
  background: #2a2a2a;
  color: white;
  border-radius: 0.25rem;
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
  padding: 0.625rem;
}

.date-group {
  margin-bottom: 1.25rem;
}

.date-header {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 0.625rem;
  padding: 0.5rem;
  background: #333;
  border-radius: 0.25rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-icon {
  font-size: 0.75rem;
}

.date-content {
  overflow: hidden;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  max-height: 9.259vh; /* 足够大的高度以容纳内容 */
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

.video-item {
  padding: 0.625rem;
  margin-bottom: 0.3125rem;
  background: #2a2a2a;
  border-radius: 0.25rem;
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
  margin-bottom: 0.3125rem;
}

.video-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #ccc;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}

.video-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0.9375rem;
  flex: 1;
  margin-bottom: 1.25rem;
}

.video-container {
  position: relative;
  background: #000;
  border-radius: 0.5rem;
  overflow: hidden;
  width: 37.5rem;
  height: 23.125rem;
}

.video-label {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
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
  gap: 0.9375rem;
  padding: 0.9375rem;
  background: #2a2a2a;
  border-radius: 0.5rem;
}

.playback-controls button {
  padding: 0.5rem 1rem;
  border: none;
  background: #0066cc;
  color: white;
  border-radius: 0.25rem;
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