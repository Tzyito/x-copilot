<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storage } from 'wxt/storage'
import type {
  TwitterRecord,
  CleanupPeriod,
  CleanupConfig,
  LLMConfig,
  ContentHistory,
  DomSelectionRecord,
  HotkeyConfig,
  HotkeyBinding,
} from '@/types'
import { cleanupHistory } from '../util/cleanup'
import { ContentStorage } from '@/utils/storage'
import { hotkeyStorage } from '@/utils/hotkeyStorage'

const records = ref<ContentHistory[]>([])
const searchQuery = ref('')
const showCleanupSettings = ref(false)
const showLLMSettings = ref(false)
const showHotkeySettings = ref(false)
const isShowApiKey = ref(false)
const editingHotkey = ref<string | null>(null)
const newHotkeyValue = ref('')
const isRecording = ref(false)

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

const hotkeyConfig = ref<HotkeyConfig>({
  bindings: [],
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

// 加载快捷键配置
const loadHotkeyConfig = async () => {
  const config = await hotkeyStorage.getHotkeyConfig()
  hotkeyConfig.value = config
}

// 开始编辑快捷键
const startEditHotkey = (action: string) => {
  editingHotkey.value = action
  const binding = hotkeyConfig.value.bindings.find((b) => b.action === action)
  newHotkeyValue.value = binding?.keys || ''
  isRecording.value = false
}

// 开始录制快捷键
const startRecording = () => {
  isRecording.value = true
  newHotkeyValue.value = ''
}

// 处理键盘按下事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (!isRecording.value) return

  event.preventDefault()
  event.stopPropagation()

  const modifiers = []
  if (event.ctrlKey) modifiers.push('Ctrl')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  if (event.metaKey) modifiers.push('Meta')

  // 特殊键名映射
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  }

  let key = keyMap[event.key] || event.key

  // 如果是修饰键本身，不处理
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return
  }

  // 大写字母
  if (key.length === 1 && key.match(/[a-z]/)) {
    key = key.toUpperCase()
  }

  if (modifiers.length > 0) {
    newHotkeyValue.value = modifiers.join('+') + '+' + key
  } else {
    newHotkeyValue.value = key
  }

  isRecording.value = false
}

// 保存快捷键
const saveHotkey = async () => {
  if (!editingHotkey.value || !newHotkeyValue.value) return

  try {
    // 验证快捷键格式
    if (!hotkeyStorage.validateKeys(newHotkeyValue.value)) {
      alert('快捷键格式无效')
      return
    }

    await hotkeyStorage.updateHotkeyBinding(editingHotkey.value as any, newHotkeyValue.value)
    await loadHotkeyConfig()
    editingHotkey.value = null
    newHotkeyValue.value = ''
  } catch (error) {
    alert((error as Error).message)
  }
}

// 取消编辑
const cancelEdit = () => {
  editingHotkey.value = null
  newHotkeyValue.value = ''
  isRecording.value = false
}

// 重置为默认快捷键
const resetHotkeys = async () => {
  if (confirm('确定要重置为默认快捷键吗？')) {
    await hotkeyStorage.resetToDefaults()
    await loadHotkeyConfig()
  }
}

const filteredRecords = computed(() => {
  if (!searchQuery.value) return records.value

  const query = searchQuery.value.toLowerCase()
  return records.value.filter(
    (record) =>
      (record as TwitterRecord).title?.toLowerCase().includes(query) ||
      (record as TwitterRecord).author?.toLowerCase().includes(query),
  )
})

const loadHistory = async () => {
  records.value = (await ContentStorage.getAllRecords()) || []
}

onMounted(async () => {
  await loadHistory()
  await loadCleanupConfig()
  await loadLLMConfig()
  await loadHotkeyConfig()

  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeyDown)

  // 监听历史更新消息
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'TWEET_HISTORY_UPDATED') {
      loadHistory()
    }
  })
})

const openTweet = (record: ContentHistory) => {
  window.open(record.url, '_blank')
}

const clearHistory = async () => {
  await ContentStorage.clearHistory()
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
          @click="showHotkeySettings = true"
          title="快捷键设置"
        >
          <span class="text-lg">⌨️</span>
        </button>
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
        <div class="px-4 border-b border-[#eee] flex justify-between items-center">
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
      <div class="w-75 bg-white dark:bg-gray-800 rounded-2 shadow-lg overflow-hidden" @click.stop>
        <div class="px-4 pt-3 border-b border-[#eee] flex justify-between items-center">
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

    <!-- 快捷键设置弹窗 -->
    <div
      v-if="showHotkeySettings"
      class="fixed inset-0 bg-[rgba(0,0,0,0.2)] flex items-center justify-center z-100"
      @click="showHotkeySettings = false"
    >
      <div
        class="w-75 max-h-90vh bg-white rounded-2 shadow-lg overflow-hidden flex flex-col"
        @click.stop
      >
        <div class="px-4 border-b border-[#eee] flex justify-between items-center">
          <h3 class="m-0 text-sm font-semibold">快捷键设置</h3>
          <button
            class="border-none bg-transparent text-lg cursor-pointer text-[#666] p-1"
            @click="showHotkeySettings = false"
          >
            ×
          </button>
        </div>
        <div class="p-4 flex flex-col gap-2 max-h-80 overflow-y-auto space-y-2 flex-1">
          <div
            v-for="binding in hotkeyConfig.bindings"
            :key="binding.action"
            class="bg-white border border-[#eee] rounded-1"
          >
            <!-- 第一行：标题和描述 -->
            <div class="flex justify-between items-center mb-2">
              <div>
                <span class="text-sm font-medium text-[#333]">{{ binding.description }}</span>
                <span class="text-xs text-[#666] ml-2">{{
                  binding.action === 'search' ? '搜索功能' : 'DOM 选择功能'
                }}</span>
              </div>
            </div>

            <!-- 第二行：快捷键显示和操作按钮 -->
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="text-xs text-[#666]">快捷键：</span>
                <template v-if="editingHotkey === binding.action">
                  <input
                    v-model="newHotkeyValue"
                    :placeholder="isRecording ? '按下快捷键...' : '输入快捷键'"
                    :class="[
                      'px-2 py-1 border rounded-1 text-xs w-24 text-center font-mono bg-[#f8f9fa] text-[#495057]',
                      isRecording && 'border-green-500 border-1px',
                    ]"
                    readonly
                  />
                </template>
                <template v-else>
                  <span
                    class="px-2 py-1 bg-[#f8f9fa] text-[#495057] border border-[#dee2e6] rounded-1 text-xs font-mono"
                  >
                    {{ binding.keys }}
                  </span>
                </template>
              </div>

              <button
                v-if="editingHotkey !== binding.action"
                class="px-2 py-1 bg-[#2563eb] text-white border-none rounded-1 text-xs cursor-pointer hover:bg-[#1d4ed8]"
                @click="startEditHotkey(binding.action)"
              >
                编辑
              </button>
            </div>
            <!-- 操作按钮区域 -->
            <div class="flex gap-2 mt-2">
              <template v-if="editingHotkey === binding.action">
                <button
                  class="px-2 py-1 bg-blue-500 text-white border-none rounded-1 text-xs cursor-pointer hover:bg-blue-600"
                  @click="startRecording"
                  :disabled="isRecording"
                >
                  {{ isRecording ? '录制中' : '录制' }}
                </button>
                <button
                  class="px-2 py-1 bg-[#2563eb] text-white border-none rounded-1 text-xs cursor-pointer hover:bg-[#1d4ed8]"
                  @click="saveHotkey"
                  :disabled="!newHotkeyValue || isRecording"
                >
                  保存
                </button>
                <button
                  class="px-2 py-1 bg-[#6c757d] text-white border-none rounded-1 text-xs cursor-pointer hover:bg-[#5a6268]"
                  @click="cancelEdit"
                >
                  取消
                </button>
              </template>
            </div>
          </div>

          <div class="pt-2 border-t border-[#eee] flex justify-between">
            <button
              class="px-3 py-2 bg-[#dc3545] text-white border-none rounded-1 text-xs cursor-pointer hover:bg-[#c82333]"
              @click="resetHotkeys"
            >
              重置为默认
            </button>
            <button
              class="px-3 py-2 bg-[#2563eb] text-white border-none rounded-1 text-xs cursor-pointer hover:bg-[#1d4ed8]"
              @click="showHotkeySettings = false"
            >
              完成
            </button>
          </div>

          <div class="text-xs text-[#6c757d] bg-[#f8f9fa] p-2 rounded-1">
            <div class="font-medium mb-1">💡 使用说明：</div>
            <div class="space-y-1">
              <div>• 点击"编辑"按钮修改快捷键</div>
              <div>• 点击"录制"按钮后按下您想要的快捷键组合</div>
              <div>• 支持 Ctrl、Alt、Shift、Meta 等修饰键</div>
              <div>• 修改后会立即在所有标签页生效</div>
            </div>
          </div>
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
      <div class="mt-1.5 text-xs text-[#666] text-center">
        在网页中使用
        <span class="font-mono bg-[#f0f0f0] px-1 rounded">{{
          hotkeyConfig.bindings.find((b) => b.action === 'search')?.keys || 'Shift+K'
        }}</span>
        快速搜索，
        <span class="font-mono bg-[#f0f0f0] px-1 rounded">{{
          hotkeyConfig.bindings.find((b) => b.action === 'domSelect')?.keys || 'Shift+S'
        }}</span>
        选择元素
      </div>
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
          <span class="font-bold text-[#1a1a1a] text-xs">{{
            record.source === 'twitter'
              ? (record as TwitterRecord).author
              : (record as DomSelectionRecord).site.name
          }}</span>
          <span class="text-xs text-[#666]">{{ formatTime(record.timestamp) }}</span>
        </div>
        <div class="text-[#444] text-xs leading-normal text-left">{{ record.content }}</div>
      </div>
    </div>
  </div>
</template>
