import { createApp, ref, watch } from 'vue'
import ContentCommandPalette from '@/components/ContentCommandPalette.vue'
import { useMagicKeys } from '@vueuse/core'
import { DomSelector } from '@/utils/domSelector'
import type { DomSelectionRecord, HotkeyConfig } from '@/types'
import { hotkeyStorage } from '@/utils/hotkeyStorage'
// eslint-disable-next-line import/no-unresolved
import '@unocss/reset/normalize.css'
import 'virtual:uno.css'


// 创建命令面板
function createCommandPalette() {
  // 创建容器
  const container = document.createElement('div')
  container.className = 'fixed'
  document.body.appendChild(container)

  // 创建状态
  const isOpen = ref(false)

  // 创建应用实例
  const app = createApp(ContentCommandPalette, {
    // 可以传递 props
    onClose: () => {
      isOpen.value = false
    },
  })
  // 挂载应用
  const instance = app.mount(container)

  // 返回实例和清理函数
  return {
    instance,
    cleanup: () => {
      app.unmount()
      container.remove()
    }
  }
}

// 创建 DOM 选择器
function createDomSelector() {
  const domSelector = new DomSelector()
  
  // 监听选择完成事件
  domSelector.onSelection((record: DomSelectionRecord) => {
    // 发送消息到 background
    browser.runtime.sendMessage({
      type: 'DOM_SELECTION_COMPLETED',
      data: record
    })
  })
  
  // 返回实例和清理函数
  return {
    instance: domSelector,
    cleanup: () => {
      domSelector.destroy()
    }
  }
}

// 快捷键管理器
function createHotkeyManager(commandPalette: any, domSelector: any) {
  const keys = useMagicKeys()
  const watchers = ref<Record<string, () => void>>({})

  // 绑定快捷键
  const bindHotkeys = async (config: HotkeyConfig) => {
    // 清除现有的监听器
    Object.values(watchers.value).forEach(unwatch => unwatch())
    watchers.value = {}

    config.bindings.forEach(binding => {
      const magicKey = hotkeyStorage.formatKeysForMagicKeys(binding.keys)
      const keyRef = keys[magicKey]

      const unwatch = watch(keyRef, (pressed) => {
        if (pressed) {
          switch (binding.action) {
            case 'search':
              commandPalette.open()
              break
            case 'domSelect':
              domSelector.activate()
              break
          }
        }
      })

      watchers.value[binding.action] = unwatch
    })
  }

  // 初始化快捷键
  const initHotkeys = async () => {
    const config = await hotkeyStorage.getHotkeyConfig()
    await bindHotkeys(config)
  }

  // 监听配置更新消息
  const handleMessage = (message: any) => {
    if (message.type === 'HOTKEY_CONFIG_UPDATED') {
      bindHotkeys(message.data)
    }
  }

  browser.runtime.onMessage.addListener(handleMessage)

  return {
    initHotkeys,
    cleanup: () => {
      Object.values(watchers.value).forEach(unwatch => unwatch())
      browser.runtime.onMessage.removeListener(handleMessage)
    }
  }
}

// 添加节流函数
function throttle<T extends (...args: any[]) => any>(func: T, limit: number) {
  let inThrottle = false

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],  // 支持所有网站，而不仅仅是 twitter

  main(ctx) {
    let lastUrl = window.location.href

    // 节流后的消息发送函数
    const throttledSendMessage = throttle(() => {
      const currentUrl = window.location.href
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl
        browser.runtime.sendMessage('CHECK_URL')
      }
    }, 1000)

    // 优化 MutationObserver 配置
    const observer = new MutationObserver(() => {
      throttledSendMessage()
    })

    // 监听时间轴元素的变化
    function observeTimeline() {
      const timelineElement = document.querySelector('[aria-label="Home timeline"]')
      if (timelineElement) {
        observer.observe(timelineElement, {
          childList: true,
          subtree: true,
        })
        return true
      }
      return false
    }

    // 如果还没有找到时间轴元素，等待它出现
    if (!observeTimeline()) {
      const bodyObserver = new MutationObserver(() => {
        if (observeTimeline()) {
          bodyObserver.disconnect()
        }
      })

      bodyObserver.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    // 初始检查
    browser.runtime.sendMessage('CHECK_URL')

    // 创建命令面板
    const commandPalette = createCommandPalette()
    
    // 创建 DOM 选择器
    const domSelectorManager = createDomSelector()

    // 创建快捷键管理器
    const hotkeyManager = createHotkeyManager(
      commandPalette.instance,
      domSelectorManager.instance
    )

    // 初始化快捷键
    hotkeyManager.initHotkeys()

    // 清理函数
    return () => {
      observer.disconnect()
      commandPalette.cleanup()
      domSelectorManager.cleanup()
      hotkeyManager.cleanup()
    }
  },
})
