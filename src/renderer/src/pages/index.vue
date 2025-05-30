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
        <button @click="selectNewPath" class="emergency-button">
          紧急片段
        </button>
      </div>
      
      <div class="video-list">
        <div v-for="date in sortedDates" :key="date" class="date-group">
          <span class="date-duration">({{ formatTotalDuration(getDateTotalDuration(date)) }})</span>
          <div class="date-header" @click="toggleDateGroup(date)">
            {{ formatDate(date) }}
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
                <div class="video-time">{{ formatTimeStr(timeGroup.time) }}</div>
                <div class="video-info">
<!--                  <span class="duration">{{ timeGroup.duration }}分钟</span>-->
                  <span class="duration">1 分钟</span>
                  <span class="angles">{{ Object.keys(timeGroup.angles).length }}个视角</span>
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
          <video autoplay
            ref="frontVideo"
            :src="currentVideos.front"
            controls
            @timeupdate="syncVideos"
            @play="playAllVideos"
            @pause="pauseAllVideos"
            @ended="handleVideoEnded"
          ></video>
          <video
            ref="preloadFrontVideo"
            :src="preloadVideos.front"
            style="display: none"
          ></video>
        </div>
        
        <div class="video-container">
          <div class="video-label">后视</div>
          <video autoplay
            ref="backVideo"
            :src="currentVideos.back"
            controls
          ></video>
          <video
            ref="preloadBackVideo"
            :src="preloadVideos.back"
            style="display: none"
          ></video>
        </div>
        
        <div class="video-container">
          <div class="video-label">左视</div>
          <video autoplay
            ref="leftVideo"
            :src="currentVideos.left"
            controls
          ></video>
          <video
            ref="preloadLeftVideo"
            :src="preloadVideos.left"
            style="display: none"
          ></video>
        </div>
        
        <div class="video-container">
          <div class="video-label">右视</div>
          <video autoplay
            ref="rightVideo"
            :src="currentVideos.right"
            controls
          ></video>
          <video
            ref="preloadRightVideo"
            :src="preloadVideos.right"
            style="display: none"
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

const props = defineProps({
  folderPath: {
    type: String,
    required: true,
    default: ''
  }
})

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
  front: '',
  back: '',
  left: '',
  right: ''
})

// 添加预加载视频
const preloadVideos = reactive({
  front: '',
  back: '',
  left: '',
  right: ''
})

// 添加预加载视频元素
const preloadFrontVideo = ref(null)
const preloadBackVideo = ref(null)
const preloadLeftVideo = ref(null)
const preloadRightVideo = ref(null)

// 添加是否正在切换视频的标志
const isSwitching = ref(false)

const sortedDates = computed(() => {
  return Object.keys(videosByDate).sort((a, b) => new Date(b) - new Date(a))
})

const formatDate = (str) => {
  const [datePart] = str.split('_');
  const [year, month, day] = datePart.split('-');
  return `${year} 年 ${month} 月 ${day} 日`;
};

const formatTimeStr = (str) => {
  const [hour, minute, second] = str.split('-');
  return `${hour}:${minute}:${second}`;
};

const switchTab = async (tab) => {
  currentTab.value = tab
  await loadVideos()
}

const isPathSelected = ref(false)

const loadVideos = async () => {
  try {

    let folderPath = ''

    if (currentTab.value === 'saved') {
      folderPath = `${props.folderPath}SavedClips`
    }

    if (currentTab.value === 'recent') {
      folderPath = `${props.folderPath}RecentClips`
    }

    if (folderPath === '') {
      alert('不正确的文件路径:' + folderPath)
      return;
    }

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

      // 如果日期组不存在，则创建
      if (!videoGroups[date]) {
        videoGroups[date] = []
      }

      // 查找当前时间组是否存在
      let timeGroup = videoGroups[date].find(group => group.time === time)

      // 如果时间组不存在，则创建新的时间组
      if (!timeGroup) {
        timeGroup = {
          date: date,
          time: time,
          angles: {},
          duration: 0  // 添加时长字段
        }
        videoGroups[date].push(timeGroup)
      }

      // 添加角度信息
      timeGroup.angles[angle.toLowerCase()] = fileInfo.fullPath
      
      // 更新时长（这里假设每个视频片段是1分钟）
      timeGroup.duration = 1
    }

    // 对每个日期的视频按时间排序
    Object.keys(videoGroups).forEach(date => {
      videoGroups[date].sort((a, b) => a.time.localeCompare(b.time))
    })

    // 将处理后的数据赋值给 videosByDate
    Object.assign(videosByDate, videoGroups)
  } catch (error) {
    console.error('加载视频失败:', error)
  } finally {
    if (sortedDates.value.length > 0) {
      // 默认展开第一个日期组
      const firstDate = sortedDates.value[0]
      expandedDates[firstDate] = true
      
      // 自动选中第一个视频
      const firstDateVideos = videosByDate[firstDate]
      if (firstDateVideos && firstDateVideos.length > 0) {
        selectVideo(firstDate, firstDateVideos[0])
      }
    }
  }
}

// 添加重新选择路径的方法
const selectNewPath =  () => {
  // isPathSelected.value = false
  // await loadVideos()
  alert('还在开发...')
}

const selectVideo = (date, timeGroup) => {
  selectedVideo.value = { date, ...timeGroup }
  
  // 如果正在切换视频，则不执行新的切换
  if (isSwitching.value) return
  
  // 设置预加载视频路径
  preloadVideos.front = "file://" + timeGroup.angles.front || ''
  preloadVideos.back = "file://" + timeGroup.angles.back || ''
  preloadVideos.left = "file://" + timeGroup.angles.leftback || ''
  preloadVideos.right = "file://" + timeGroup.angles.rightback || ''
  
  // 预加载视频
  nextTick(() => {
    if (preloadFrontVideo.value) {
      preloadFrontVideo.value.load()
      preloadBackVideo.value.load()
      preloadLeftVideo.value.load()
      preloadRightVideo.value.load()
      
      // 监听预加载视频的加载完成事件
      const videos = [preloadFrontVideo.value, preloadBackVideo.value, preloadLeftVideo.value, preloadRightVideo.value]
      let loadedCount = 0
      
      const onLoaded = () => {
        loadedCount++
        if (loadedCount === videos.length) {
          // 所有视频都加载完成后，进行切换
          switchVideos()
        }
      }
      
      videos.forEach(video => {
        if (video) {
          video.addEventListener('loadeddata', onLoaded, { once: true })
        }
      })
    }
  })
}

// 添加视频切换函数
const switchVideos = () => {
  isSwitching.value = true
  
  // 交换当前视频和预加载视频
  const temp = { ...currentVideos }
  Object.assign(currentVideos, preloadVideos)
  Object.assign(preloadVideos, temp)
  
  // 重置播放时间
  nextTick(() => {
    if (frontVideo.value) {
      frontVideo.value.currentTime = 0
      totalDuration.value = frontVideo.value.duration || 0
      isSwitching.value = false
    }
  })
}

// 获取下一个视频
const getNextVideo = () => {
  if (!selectedVideo.value) return null
  
  const currentDate = selectedVideo.value.date
  const currentTime = selectedVideo.value.time
  const currentDateVideos = videosByDate[currentDate]
  
  if (!currentDateVideos) return null
  
  const currentIndex = currentDateVideos.findIndex(v => v.time === currentTime)
  if (currentIndex === -1) return null
  
  // 尝试获取同一天的下一个视频
  if (currentIndex < currentDateVideos.length - 1) {
    return {
      date: currentDate,
      timeGroup: currentDateVideos[currentIndex + 1]
    }
  }
  
  // 如果当前是最后一个视频，尝试获取下一天的第一个视频
  const currentDateIndex = sortedDates.value.indexOf(currentDate)
  if (currentDateIndex < sortedDates.value.length - 1) {
    const nextDate = sortedDates.value[currentDateIndex + 1]
    const nextDateVideos = videosByDate[nextDate]
    if (nextDateVideos && nextDateVideos.length > 0) {
      return {
        date: nextDate,
        timeGroup: nextDateVideos[0]
      }
    }
  }
  
  return null
}

// 添加视频结束事件处理
const handleVideoEnded = () => {
  const nextVideo = getNextVideo()
  if (nextVideo) {
    selectVideo(nextVideo.date, nextVideo.timeGroup)
  }
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

// 添加计算日期总时长的函数
const getDateTotalDuration = (date) => {
  const videos = videosByDate[date] || []
  return videos.reduce((total, video) => total + (video.duration || 0), 0)
}

// 添加格式化总时长的函数
const formatTotalDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}小时${mins}分钟`
  }
  return `${mins}分钟`
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

.date-duration {
  font-size: 1rem;
  color: #ccc;
  margin: 0 0.5rem;
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
  gap: 0.3125rem;
  flex: 1;
  margin-bottom: 0.3125rem;
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

.emergency-button {
  background-color: #cccccc;
  border-color: #cccccc;
  color: red;
  pointer-events: none;
  cursor: not-allowed;
  opacity: 0.6;

  &:hover {
    background-color: #cccccc;
    border-color: #cccccc;
    box-shadow: none;
  }
}
</style>