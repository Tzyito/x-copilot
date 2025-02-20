<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { TweetHistory } from '../types'
import { storage } from 'wxt/storage'

const isOpen = ref(false)
const searchQuery = ref('')
const selectedIndex = ref(0)
const records = ref<TweetHistory[]>([])
const searchInput = ref<HTMLInputElement>()

const filteredRecords = computed(() => {
  if (!searchQuery.value) return records.value

  const query = searchQuery.value.toLowerCase()
  return records.value.filter(
    (record) =>
      record.title?.toLowerCase().includes(query) ||
      record.author?.toLowerCase().includes(query) ||
      record.content?.toLowerCase().includes(query)
  )
})

const loadHistory = async () => {
  records.value = (await storage.getItem('local:tweetHistory')) || []
}

const open = async () => {
  await loadHistory()
  isOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
}

const openUrl = (url: string) => {
  window.open(url, '_blank')
}

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value =
        (selectedIndex.value + 1) % filteredRecords.value.length
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value =
        selectedIndex.value - 1 < 0
          ? filteredRecords.value.length - 1
          : selectedIndex.value - 1
      break
    case 'Enter':
      if (filteredRecords.value[selectedIndex.value]) {
        openUrl(filteredRecords.value[selectedIndex.value].url)
        close()
      }
      break
    case 'Escape':
      close()
      break
  }
}

// 监听历史更新消息
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'TWEET_HISTORY_UPDATED') {
    loadHistory()
  }
})

const SHORTCUT_TEXT = 'Shift + K'

defineExpose({ open, close })
</script>

<template>
  <div v-if="isOpen" class="command-palette-backdrop" @click="close">
    <div class="command-palette" @click.stop>
      <div class="search-input-wrapper">
        <div class="search-box">
          <svg
            class="search-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="搜索历史记录..."
            class="search-input"
            @keydown="handleKeydown"
          />
          <kbd class="shortcut-hint">{{ SHORTCUT_TEXT }}</kbd>
        </div>
      </div>

      <div class="results-wrapper">
        <template v-if="filteredRecords.length">
          <div
            v-for="(record, index) in filteredRecords"
            :key="record.url"
            :class="['result-item', { 'is-selected': index === selectedIndex }]"
            @click="
              () => {
                openUrl(record.url)
                close()
              }
            "
          >
            <div class="result-content">
              <div class="result-title">{{ record.title }}</div>
              <div class="result-meta">
                <span class="result-author">{{ record.author }}</span>
                <span class="result-time">
                  {{ new Date(record.timestamp).toLocaleDateString() }}
                </span>
              </div>
            </div>
          </div>
        </template>
        <div v-else-if="searchQuery" class="no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-text">无搜索结果</div>
        </div>
        <div v-else-if="!records.length" class="empty-hint">
          <div class="empty-hint-icon">✨</div>
          <div class="empty-hint-text">输入关键词搜索历史记录</div>
          <div class="empty-hint-shortcut">
            随时按下
            <kbd>{{ SHORTCUT_TEXT }}</kbd>
            快速搜索
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.command-palette-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 99999;
}

.command-palette {
  width: 640px;
  max-width: 90vw;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.search-input-wrapper {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px 12px;
}

.search-icon {
  color: #666;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
  padding: 4px 0;
}

.shortcut-hint {
  background: #eee;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.results-wrapper {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}

.result-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover,
.result-item.is-selected {
  background: #f5f5f5;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-title {
  font-size: 14px;
  color: #1a1a1a;
  line-height: 1.4;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.result-author {
  color: #2563eb;
  font-weight: 500;
}

.result-time {
  color: #666;
}

.no-results,
.empty-hint {
  padding: 32px;
  text-align: center;
  color: #666;
}

.no-results-icon,
.empty-hint-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.empty-hint-text {
  font-size: 14px;
  margin-bottom: 8px;
}

.empty-hint-shortcut {
  font-size: 12px;
  color: #888;
}

kbd {
  background: #eee;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* 滚动条样式 */
.results-wrapper::-webkit-scrollbar {
  width: 8px;
}

.results-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.results-wrapper::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}

.results-wrapper::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
</style>
