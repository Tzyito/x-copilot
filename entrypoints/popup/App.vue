<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storage } from 'wxt/storage'
import type { TweetHistory } from '../../types'

const records = ref<TweetHistory[]>([])
const searchQuery = ref('')

const filteredRecords = computed(() => {
  if (!searchQuery.value) return records.value

  const query = searchQuery.value.toLowerCase()
  return records.value.filter(
    (record) =>
      record.title?.toLowerCase().includes(query) ||
      record.author?.toLowerCase().includes(query)
  )
})

const loadHistory = async () => {
  records.value = (await storage.getItem('local:tweetHistory')) || []
}

onMounted(async () => {
  loadHistory()

  // 监听历史更新消息
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'TWEET_HISTORY_UPDATED') {
      loadHistory()
    }
  })
})

const openTweet = (record: TweetHistory) => {
  window.open(record.url, '_blank')
}

const clearHistory = async () => {
  await storage.setItem('local:tweetHistory', [])
  records.value = []
}

// 添加 formatTime 函数
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="container">
    <div class="header">
      <h1 class="title">浏览历史</h1>
      <button @click="clearHistory" class="clear-btn">清空历史</button>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索作者或内容..."
        class="search-input"
      />
      <div class="shortcut-tip">在网页中使用 Shift + K 快速搜索</div>
    </div>

    <div v-if="records.length === 0" class="empty-state">暂无浏览记录</div>
    <div v-else-if="searchQuery && !filteredRecords.length" class="empty-state">
      无搜索结果
    </div>

    <div v-else class="records-list">
      <div
        v-for="record in filteredRecords"
        :key="record.url"
        class="record-item"
        @click="openTweet(record)"
      >
        <div class="record-header">
          <span class="author">{{ record.author }}</span>
          <span class="time">{{ formatTime(record.timestamp) }}</span>
        </div>
        <div class="title">{{ record.title }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 400px;
  padding: 12px;
  font-family: system-ui, -apple-system, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.search-box {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background-color: #f8f8f8;
}

.search-input:focus {
  border-color: #2563eb;
  background-color: #fff;
}

.shortcut-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
  text-align: center;
}

.clear-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #e0e0e0;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 24px 0;
  font-size: 13px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

/* 自定义滚动条样式 */
.records-list::-webkit-scrollbar {
  width: 6px;
}

.records-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.records-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.records-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Firefox 滚动条样式 */
.records-list {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.record-item {
  padding: 10px;
  border-radius: 8px;
  background-color: #f8f8f8;
  cursor: pointer;
  transition: all 0.2s;
}

.record-item:hover {
  background-color: #f0f0f0;
}

.record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.author {
  font-weight: bold;
  color: #1a1a1a;
  font-size: 13px;
}

.time {
  font-size: 12px;
  color: #666;
}

.title {
  color: #444;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
}
</style>
