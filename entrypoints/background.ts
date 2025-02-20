import type { TweetHistory, Message } from '../types'
import { storage } from 'wxt/storage'
import { cleanupHistory } from './util/cleanup'
// import { useSearch } from './popup/search'
// const { add } = useSearch()

// 添加防抖函数
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

export default defineBackground(() => {
  // 使用防抖包装检查函数
  const debouncedCheckAndRecordTweet = debounce(async (url: string) => {
    try {
      const parsedUrl = new URL(url)
      if (
        parsedUrl.hostname === 'x.com' ||
        parsedUrl.hostname === 'twitter.com'
      ) {
        const tweetMatch = parsedUrl.pathname.match(/\/([^\/]+)\/status\/(\d+)/)

        if (tweetMatch) {
          const tweetId = tweetMatch[2]
          const existingHistory = await storage.getItem<TweetHistory[]>(
            'local:tweetHistory'
          )
          const history: TweetHistory[] = existingHistory || []
          // 检查是否已存在相同的记录

          if (!history.some((item) => item.tweetId === tweetId)) {
            const tabs = await browser.tabs.query({ url })
            const pageTitle = tabs[0]?.title || ''
            // 解析作者和内容
            const titleMatch = pageTitle.match(/^(.+?)\s+on\s+X:\s+"(.+?)"/)
            if (!titleMatch) return
            const author = titleMatch[1]
            const content = titleMatch[2]
            console.log(author, content)
            const truncatedContent =
              content.length > 30 ? content.slice(0, 30) + '...' : content

            const historyItem: TweetHistory = {
              tweetId,
              url: url,
              timestamp: Date.now(),
              author,
              title: truncatedContent,
              content: content,
            }
            // 添加新记录到历史中
            history.unshift(historyItem)
            // 保存更新后的历史
            await storage.setItem('local:tweetHistory', history)

            // setTimeout(async () => {
            //   await add(historyItem)
            // }, 1000);

            // 发送消息通知其他部分（如popup）历史已更新
            const message: Message = {
              type: 'TWEET_HISTORY_UPDATED',
              data: historyItem,
            }
            browser.runtime.sendMessage(message)
          }
        }
      }
    } catch (error) {
      console.error('Error checking tweet URL:', error)
    }
  }, 300) // 300ms 的防抖时间

  // 监听来自content script的消息
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message === 'CHECK_URL' && sender.tab?.url) {
      debouncedCheckAndRecordTweet(sender.tab.url)
    }
  })

  // 监听标签页更新（用于非SPA导航）
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      debouncedCheckAndRecordTweet(tab.url)
    }
  })

  // 设置定期检查清理
  // 每小时检查一次
  setInterval(async () => {
    const newHistory = await cleanupHistory()
    if (newHistory) {
      // 通知 popup 更新
      browser.runtime.sendMessage({ type: 'TWEET_HISTORY_UPDATED' })
    }
  }, 60 * 60 * 1000)

  // 扩展启动时检查一次
  cleanupHistory().then((newHistory) => {
    if (newHistory) {
      browser.runtime.sendMessage({ type: 'TWEET_HISTORY_UPDATED' })
    }
  })

  // 监听存储变化，当清理配置更新时也执行清理
  browser.storage.onChanged.addListener((changes) => {
    if (changes.cleanupConfig) {
      cleanupHistory()
    }
  })
})
