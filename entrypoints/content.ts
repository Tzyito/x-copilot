import { createApp, ref, computed, watch } from 'vue'
import ContentCommandPalette from '@/components/ContentCommandPalette.vue'
import { useMagicKeys } from '@vueuse/core'

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

  // 设置快捷键
  const keys = useMagicKeys()
  const k = keys['Shift_K']

  // 监听快捷键
  watch(k, (v) => {
    if (v) {
      ;(instance as any).open()
    }
  })

  // 返回清理函数
  return () => {
    app.unmount()
    container.remove()
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
  matches: ['https://x.com/*'],

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
      const timelineElement = document.querySelector(
        '[aria-label="Home timeline"]'
      )
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
    const cleanupCommandPalette = createCommandPalette()

    // 清理函数
    return () => {
      observer.disconnect()
      cleanupCommandPalette()
    }
  },
})
