<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storage } from 'wxt/storage'
import type { TweetHistory, CleanupPeriod, CleanupConfig, LLMConfig } from '@/types'
import { cleanupHistory } from '../util/cleanup'

const records = ref<TweetHistory[]>([])
const searchQuery = ref('')
const showCleanupSettings = ref(false)
const showLLMSettings = ref(false)
const isShowApiKey = ref(false)

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
  provider: 'gemini',
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
    llmConfig.value = { ...llmConfig.value, ...config }
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
      record.title?.toLowerCase().includes(query) || record.author?.toLowerCase().includes(query),
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
  <div class="w-100 p-3 font-sans">
    <div class="flex justify-between items-center mb-3">
      <h1 class="m-0 text-base font-semibold text-[#1a1a1a]">浏览历史</h1>
      <div class="flex gap-2 items-center">
        <button
          class="p-x-2 p-y-1 border-none rounded-1 bg-transparent cursor-pointer transition-all duration-200"
          @click="showLLMSettings = true"
        >
          <span class="text-lg">🤖</span>
        </button>
        <button
          class="px-2 py-1 border-none rounded-1 bg-transparent cursor-pointer transition-all duration-200"
          @click="showCleanupSettings = true"
        >
          <span class="text-lg">⏱️</span>
        </button>
        <button
          @click="clearHistory"
          class="px-2 py-1 border-none rounded-1 bg-[#f0f0f0] text-[#666] text-xs cursor-pointer transition-all duration-200 hover:bg-[#e0e0e0]"
        >
          清空历史
        </button>
      </div>
    </div>

    <div
      v-if="showLLMSettings"
      class="fixed inset-0 bg-[rgba(0,0,0,0.2)] flex items-center justify-center z-100"
      @click="showLLMSettings = false"
    >
      <div class="w-75 bg-white rounded-2 shadow-lg overflow-hidden" @click.stop>
        <div class="px-4 py-3 border-b border-[#eee] flex justify-between items-center">
          <h3 class="m-0 text-sm font-semibold">LLM 配置</h3>
          <button
            class="border-none bg-transparent text-lg cursor-pointer text-[#666] p-1"
            @click="showLLMSettings = false"
          >
            ×
          </button>
        </div>
        <div class="p-4 flex flex-col gap-2">
          <div class="bg-white cursor-pointer text-xs flex justify-between items-center gap-0.5">
            <label class="block text-xs text-[#666]">服务商</label>
            <select
              v-model="llmConfig.provider"
              class="p-2 border border-[#ddd] rounded-1 text-xs focus:border-[#2563eb] focus:outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div class="bg-white cursor-pointer text-xs flex justify-between items-center gap-0.5">
            <label class="block text-xs text-[#666]">Base API</label>
            <input
              v-model="llmConfig.baseUrl"
              type="text"
              placeholder="输入 API 地址(默认为模型服务商地址，支持三方api)"
              class="p-2 border border-[#ddd] rounded-1 text-xs focus:border-[#2563eb] focus:outline-none"
            />
          </div>
          <div class="bg-white cursor-pointer text-xs flex justify-between items-center gap-0.5">
            <label class="block text-xs text-[#666]">API Key</label>
            <div class="relative">
              <input
                v-model="llmConfig.apiKey"
                :type="isShowApiKey ? 'text' : 'password'"
                placeholder="输入 API Key"
                class="p-2 border border-[#ddd] rounded-1 text-xs focus:border-[#2563eb] focus:outline-none"
              />
              <i
                :class="isShowApiKey ? 'i-ri:eye-fill' : 'i-ri:eye-close-line'"
                class="absolute right-2 top-1/2 -translate-y-1/2"
                @click="isShowApiKey = !isShowApiKey"
              ></i>
            </div>
          </div>
          <div class="bg-white cursor-pointer text-xs flex justify-between items-center gap-0.5">
            <label class="block text-xs text-[#666]">模型</label>
            <input
              v-model="llmConfig.model"
              type="text"
              placeholder="输入模型名称"
              class="p-2 border border-[#ddd] rounded-1 text-xs focus:border-[#2563eb] focus:outline-none"
            />
          </div>
          <button
            class="w-full p-2 bg-[#2563eb] text-white border-none rounded-1 text-xs cursor-pointer transition-all duration-200 hover:bg-[#1d4ed8]"
            @click="saveLLMConfig"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showCleanupSettings"
      class="fixed inset-0 bg-[rgba(0,0,0,0.2)] flex items-center justify-center z-100"
      @click="showCleanupSettings = false"
    >
      <div class="w-75 bg-white rounded-2 shadow-lg overflow-hidden" @click.stop>
        <div class="px-4 py-3 border-b border-[#eee] flex justify-between items-center">
          <h3 class="m-0 text-sm font-semibold">自动清理设置</h3>
          <button
            class="border-none bg-transparent text-lg cursor-pointer text-[#666] p-1"
            @click="showCleanupSettings = false"
          >
            ×
          </button>
        </div>
        <div class="p-4 flex flex-col gap-2">
          <button
            v-for="option in CLEANUP_OPTIONS"
            :key="option.value"
            :class="[
              'px-3 py-2 border rounded-1 cursor-pointer text-xs transition-all duration-200 hover:bg-[#f5f5f5]',
              cleanupConfig.period === option.value
                ? 'bg-[#2563eb] text-white border-[#2563eb]'
                : 'bg-white border-[#eee]',
            ]"
            @click="saveCleanupConfig(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索作者或内容..."
        class="w-full py-1.5 px-2 border border-[#ddd] rounded-1 text-xs outline-none bg-[#f8f8f8] focus:border-[#2563eb] focus:bg-white"
      />
      <div class="mt-1.5 text-xs text-[#666] text-center">在网页中使用 Shift + K 快速搜索</div>
      <div v-if="cleanupConfig.period !== 'never'" class="mt-1 text-xs text-[#666] text-center">
        将自动清理{{
          CLEANUP_OPTIONS.find((opt) => opt.value === cleanupConfig.period)?.label
        }}以前的记录
      </div>
    </div>

    <div v-if="records.length === 0" class="text-center text-[#666] py-6 text-xs">暂无浏览记录</div>
    <div
      v-else-if="searchQuery && !filteredRecords.length"
      class="text-center text-[#666] py-6 text-xs"
    >
      无搜索结果
    </div>

    <div
      v-else
      class="flex flex-col gap-2 max-h-100 overflow-y-auto pr-1"
      style="scrollbar-width: thin; scrollbar-color: #c1c1c1 #f1f1f1"
    >
      <div
        v-for="record in filteredRecords"
        :key="record.url"
        class="p-2.5 rounded-2 bg-[#f8f8f8] cursor-pointer transition-all duration-200 hover:bg-[#f0f0f0]"
        @click="openTweet(record)"
      >
        <div class="flex justify-between mb-1">
          <span class="font-bold text-[#1a1a1a] text-xs">{{ record.author }}</span>
          <span class="text-xs text-[#666]">{{ formatTime(record.timestamp) }}</span>
        </div>
        <div class="text-[#444] text-xs leading-normal text-left">{{ record.title }}</div>
      </div>
    </div>
  </div>
</template>
