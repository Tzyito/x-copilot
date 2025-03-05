<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storage } from 'wxt/storage'
import type {
  TweetHistory,
  CleanupPeriod,
  CleanupConfig,
  LLMConfig,
} from '@/types'
import { cleanupHistory } from '../util/cleanup'

const records = ref<TweetHistory[]>([])
const searchQuery = ref('')
const showCleanupSettings = ref(false)
const showLLMSettings = ref(false)

// 清理周期选项
const CLEANUP_OPTIONS = [
  { label: '一周', value: '1w' as const },
  { label: '一个月', value: '1m' as const },
  { label: '三个月', value: '3m' as const },
  { label: '一年', value: '1y' as const },
  { label: '永不', value: 'never' as const },
] as const

const cleanupConfig = ref<CleanupConfig>({
  period: 'never',
  lastCleanup: Date.now(),
})

const llmConfig = ref<LLMConfig>({
  baseUrl: '',
  apiKey: '',
  model: '',
})

// 加载清理配置
const loadCleanupConfig = async () => {
  const config = await storage.getItem<CleanupConfig>('local:cleanupConfig')
  if (config) {
    cleanupConfig.value = config
  }
}

// 保存清理配置
const saveCleanupConfig = async (period: CleanupPeriod) => {
  const config: CleanupConfig = {
    period,
    lastCleanup: Date.now(),
  }
  await storage.setItem('local:cleanupConfig', config)
  cleanupConfig.value = config
  showCleanupSettings.value = false

  // 立即执行一次清理
  const newHistory = await cleanupHistory()
  if (newHistory) {
    records.value = newHistory
  }
}

// 加载 LLM 配置
const loadLLMConfig = async () => {
  const config = await storage.getItem<LLMConfig>('local:llm_config')
  if (config) {
    llmConfig.value = config
  }
}

// 保存 LLM 配置
const saveLLMConfig = async () => {
  await storage.setItem('local:llm_config', llmConfig.value)
  showLLMSettings.value = false
}

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
  await loadHistory()
  await loadCleanupConfig()
  await loadLLMConfig()

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
      <div class="header-actions">
        <button class="action-btn" @click="showLLMSettings = true">
          <span class="action-icon">🤖</span>
        </button>
        <button class="action-btn" @click="showCleanupSettings = true">
          <span class="action-icon">⏱️</span>
        </button>
        <button @click="clearHistory" class="clear-btn">清空历史</button>
      </div>
    </div>

    <!-- LLM 设置弹窗 -->
    <div
      v-if="showLLMSettings"
      class="cleanup-modal-backdrop"
      @click="showLLMSettings = false"
    >
      <div class="cleanup-modal" @click.stop>
        <div class="cleanup-modal-header">
          <h3>LLM 配置</h3>
          <button class="close-btn" @click="showLLMSettings = false">×</button>
        </div>
        <div class="llm-settings">
          <div class="form-group">
            <label>Base API</label>
            <input
              v-model="llmConfig.baseUrl"
              type="text"
              placeholder="输入 API 地址"
            />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input
              v-model="llmConfig.apiKey"
              type="password"
              placeholder="输入 API Key"
            />
          </div>
          <div class="form-group">
            <label>模型</label>
            <input
              v-model="llmConfig.model"
              type="text"
              placeholder="输入模型名称"
            />
          </div>
          <button class="save-btn" @click="saveLLMConfig">保存</button>
        </div>
      </div>
    </div>

    <!-- 清理设置弹窗 -->
    <div
      v-if="showCleanupSettings"
      class="cleanup-modal-backdrop"
      @click="showCleanupSettings = false"
    >
      <div class="cleanup-modal" @click.stop>
        <div class="cleanup-modal-header">
          <h3>自动清理设置</h3>
          <button class="close-btn" @click="showCleanupSettings = false">
            ×
          </button>
        </div>
        <div class="cleanup-options">
          <button
            v-for="option in CLEANUP_OPTIONS"
            :key="option.value"
            :class="[
              'cleanup-option',
              { active: cleanupConfig.period === option.value },
            ]"
            @click="saveCleanupConfig(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索作者或内容..."
        class="search-input"
      />
      <div class="shortcut-tip">在网页中使用 Shift + K 快速搜索</div>
      <div v-if="cleanupConfig.period !== 'never'" class="cleanup-tip">
        将自动清理{{
          CLEANUP_OPTIONS.find((opt) => opt.value === cleanupConfig.period)
            ?.label
        }}以前的记录
      </div>
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

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f0f0f0;
}

.action-icon {
  font-size: 16px;
}

.cleanup-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.cleanup-modal {
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.cleanup-modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cleanup-modal-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 4px;
}

.cleanup-options {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cleanup-option {
  padding: 8px 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.cleanup-option:hover {
  background: #f5f5f5;
}

.cleanup-option.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.cleanup-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  text-align: center;
}

.llm-settings {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group {
  background: white;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
}

.form-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.form-group input:focus {
  border-color: #2563eb;
  outline: none;
}

.save-btn {
  width: 100%;
  padding: 8px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  background: #1d4ed8;
}
</style>
