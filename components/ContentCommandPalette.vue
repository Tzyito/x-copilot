<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { ContentHistory, TwitterRecord, DomSelectionRecord, SearchMode, SearchResultGroup } from '../types'
import { SearchService } from '@/utils/searchService'
import { SearchParser } from '@/utils/searchParser'
import { ContentStorage } from '@/utils/storage'
import { useSearch } from '@/llm/useSearch'
import { Toaster, toast } from 'vue-sonner'

const isOpen = ref(false)
const searchQuery = ref('')
const selectedIndex = ref(0)
const selectedSuggestion = ref(false)
const searchInput = ref<HTMLInputElement>()
const isSearching = ref(false)
const deletingId = ref<string | null>(null)

const searchResults = ref<{
  mode: SearchMode
  groups: Array<SearchResultGroup>
  totalCount: number
}>({
  mode: 'grouped',
  groups: [],
  totalCount: 0
})

const { search } = useSearch()

// 搜索建议
const searchSuggestions = computed(() => {
  if (!searchQuery.value || selectedSuggestion.value) return []
  return SearchParser.getSearchSuggestions(searchQuery.value)
})

// 扁平化的记录列表，用于键盘导航
const flattenedRecords = computed(() => {
  const records: ContentHistory[] = []
  searchResults.value.groups.forEach(group => {
    if (searchResults.value.mode === 'grouped') {
      records.push(...group.items.slice(0, 3)) // 分组模式只显示前 3 个
    } else {
      records.push(...group.items)
    }
  })
  return records
})

// 实时搜索
watch(searchQuery, async (newQuery) => {
  if(newQuery.trim() === '') {
    selectedSuggestion.value = false
  }
  const results = await SearchService.search(newQuery)
  searchResults.value = results
  selectedIndex.value = 0
}, { immediate: true })

const loadHistory = async () => {
  const results = await SearchService.search('')
  console.log('results', results)
  searchResults.value = results
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

const openContent = (item: ContentHistory) => {
  openUrl(item.url)
  close()
}

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % flattenedRecords.value.length
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value =
        selectedIndex.value - 1 < 0 ? flattenedRecords.value.length - 1 : selectedIndex.value - 1
      break
    case 'Enter':
      if (flattenedRecords.value[selectedIndex.value]) {
        openContent(flattenedRecords.value[selectedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
  }
}

const handleSearch = async () => {
  if (!searchQuery.value) return
  isSearching.value = true
  try {
    const result = await search(searchQuery.value)
    if (!result) return
    const url = window.location.origin
    if (url !== 'https://x.com') return
    const newUrl = new URL(url + '/search?q=' + result)
    window.location.href = newUrl.toString()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '搜索失败')
  } finally {
    isSearching.value = false
  }
}

const deleteRecord = async (record: ContentHistory, e: Event) => {
  e.stopPropagation()
  if (deletingId.value === record.id) return

  deletingId.value = record.id

  try {
    await ContentStorage.deleteRecord(record.id)
    await loadHistory() // 重新加载搜索结果
    if (selectedIndex.value >= flattenedRecords.value.length) {
      selectedIndex.value = Math.max(0, flattenedRecords.value.length - 1)
    }
  } finally {
    deletingId.value = null
  }
}

const handleSuggestionClick = (suggestion: string) => {
  searchQuery.value = suggestion
  selectedSuggestion.value = true
  nextTick(() => searchInput.value?.focus())
}

const filterBySource = (source: string) => {
  searchQuery.value = `source:${source}`
  nextTick(() => searchInput.value?.focus())
}

const getItemTitle = (item: ContentHistory): string => {
  if (item.source === 'twitter') {
    return (item as TwitterRecord).title || item.content.substring(0, 50) + '...'
  } else {
    return (item as DomSelectionRecord).preview || item.content.substring(0, 50) + '...'
  }
}

const getItemAuthor = (item: ContentHistory): string => {
  if (item.source === 'twitter') {
    return (item as TwitterRecord).author || 'Unknown'
  } else {
    return item.site.name
  }
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString()
}

// 监听历史更新消息
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'CONTENT_UPDATED' || message.type === 'TWEET_HISTORY_UPDATED') {
    loadHistory()
  }
})

const SHORTCUT_TEXT = 'Shift + K'

defineExpose({ open, close })
</script>

<template>
  <Toaster />
  <div v-if="isOpen" class="command-palette-backdrop" @click="close">
    <div class="command-palette" @click.stop>
      
      <!-- 搜索输入框 -->
      <div class="search-input-wrapper">
        <div class="search-box">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
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
            placeholder="搜索内容或使用 source:twitter 筛选..."
            class="search-input"
            @keydown="handleKeydown"
            @keyup.enter="handleSearch"
          />
          <div v-if="isSearching" class="search-loading">
            <div class="loading-spinner"></div>
          </div>
          <kbd class="shortcut-hint">{{ SHORTCUT_TEXT }}</kbd>
        </div>
        
        <!-- 搜索建议 -->
        <div v-if="searchSuggestions.length" class="search-suggestions">
          <button
            v-for="suggestion in searchSuggestions"
            :key="suggestion"
            @click="handleSuggestionClick(suggestion)"
            class="suggestion-item"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>

      <!-- 结果展示区域 -->
      <div class="results-wrapper">
        
        <!-- 分组模式 -->
        <template v-if="searchResults.mode === 'grouped'">
          <div v-for="group in searchResults.groups" :key="group.source" class="result-group">
            <div class="group-header">
              <span class="group-icon">{{ group.icon }}</span>
              <span class="group-title">{{ group.title }}</span>
              <span class="group-count">{{ group.count }}</span>
            </div>
            
            <div class="group-items">
              <div
                v-for="(item, index) in group.items.slice(0, 3)"
                :key="item.id" 
                class="result-item"
                @click="openContent(item)"
              >
                <div class="result-content">
                  <div class="result-title">{{ getItemTitle(item) }}</div>
                  <div class="result-meta">
                    <span class="result-author">{{ getItemAuthor(item) }}</span>
                    <span class="result-time">{{ formatTime(item.timestamp) }}</span>
                  </div>
                </div>
                <button
                  class="result-delete"
                  @click="(e) => deleteRecord(item, e)"
                  :class="{ 'is-deleting': deletingId === item.id }"
                >
                  <div v-if="deletingId === item.id" class="delete-loading"></div>
                  <svg
                    v-else
                    class="delete-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
              
              <div v-if="group.count > 3" class="show-more" @click="filterBySource(group.source)">
                显示全部 {{ group.count }} 条记录...
              </div>
            </div>
          </div>
        </template>
        
        <!-- 筛选模式 -->
        <template v-else-if="searchResults.mode === 'filtered'">
          <div v-for="group in searchResults.groups" :key="group.source">
            <div class="filter-header">
              <span class="group-icon">{{ group.icon }}</span>
              <span class="group-title">{{ group.title }}</span>
              <span class="result-count">{{ group.count }} 条结果</span>
            </div>
            
            <div
              v-for="(item, index) in group.items"
              :key="item.id"
              :class="['result-item', { 'is-selected': index === selectedIndex }]"
              @click="openContent(item)"
            >
              <div class="result-content">
                <div class="result-title">{{ getItemTitle(item) }}</div>
                <div class="result-meta">
                  <span class="result-author">{{ getItemAuthor(item) }}</span>
                  <span class="result-time">{{ formatTime(item.timestamp) }}</span>
                </div>
              </div>
              <button
                class="result-delete"
                @click="(e) => deleteRecord(item, e)"
                :class="{ 'is-deleting': deletingId === item.id }"
              >
                <div v-if="deletingId === item.id" class="delete-loading"></div>
                <svg
                  v-else
                  class="delete-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </template>
        
        <!-- 空状态 -->
        <div v-if="searchResults.totalCount === 0" class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">
            {{ searchQuery ? '没有找到相关内容' : '还没有保存任何内容' }}
          </div>
          <div class="empty-tips">
            <div>• 按 <kbd>Shift + K</kbd> 搜索历史</div>
            <div>• 按 <kbd>Shift + S</kbd> 选择页面内容</div>
            <div>• 使用 <kbd>source:twitter</kbd> 筛选推文</div>
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
.search-input-wrapper ::placeholder {
  color: #c2bdbd;
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
  padding-right: 30px;
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
  padding-bottom: 8px;
}

.result-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
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

.result-item:hover .result-delete {
  opacity: 1;
}

.result-delete {
  opacity: 0;
  transition: all 0.2s;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: #fee2e2;
  color: #dc2626;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.result-delete:hover {
  background: #fecaca;
}

.result-delete.is-deleting {
  opacity: 1;
  background: #f3f4f6;
  pointer-events: none;
}

.delete-loading {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #6b7280;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.delete-icon {
  width: 16px;
  height: 16px;
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

.search-loading {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 新增样式 */
.search-suggestions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.suggestion-item {
  padding: 4px 8px;
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 6px;
  font-size: 12px;
  color: #0369a1;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-item:hover {
  background: #0ea5e9;
  color: white;
}

.result-group {
  margin-bottom: 16px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 14px;
}

.group-icon {
  font-size: 16px;
}

.group-title {
  font-weight: 600;
  color: #495057;
}

.group-count {
  margin-left: auto;
  background: #6c757d;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}

.group-items {
  margin-top: 8px;
  padding: 0 16px;
}

.show-more {
  padding: 8px 0;
  text-align: center;
  color: #0ea5e9;
  cursor: pointer;
  font-size: 14px;
  border-top: 1px solid #e9ecef;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.show-more:hover {
  background: #f8f9fa;
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  font-size: 14px;
}

.result-count {
  margin-left: auto;
  color: #6c757d;
  font-size: 14px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 16px;
  color: #333;
}

.empty-tips {
  color: #6c757d;
  font-size: 12px;
  line-height: 1.8;
}

.empty-tips kbd {
  background: #e9ecef;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
}
</style>
