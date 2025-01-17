import type { TweetHistory, Message } from '../types'
import { storage } from 'wxt/storage'
// import { useSearch } from './popup/search'
// const { add } = useSearch()

export default defineBackground(() => {
  // 检查URL是否是推文页面并记录
  const checkAndRecordTweet = async (url: string) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === 'x.com' || parsedUrl.hostname === 'twitter.com') {
        const tweetMatch = parsedUrl.pathname.match(/\/([^\/]+)\/status\/(\d+)/);

        if (tweetMatch) {
          const tweetId = tweetMatch[2];

          // 获取页面标题
          const tabs = await browser.tabs.query({ url });
          const pageTitle = tabs[0]?.title || '';
          // 解析作者和内容
          const titleMatch = pageTitle.match(/^(.+?)\s+on\s+X:\s+"(.+?)"/);
          if (!titleMatch) return
          const author = titleMatch[1];
          const content = titleMatch[2];
          const truncatedContent = content.length > 30 ? content.slice(0, 30) + '...' : content;

          const historyItem: TweetHistory = {
            tweetId,
            url: url,
            timestamp: Date.now(),
            author,
            title: truncatedContent
          };

          // 存储访问历史
          const existingHistory = await storage.getItem<TweetHistory[]>('local:tweetHistory');
          const history: TweetHistory[] = existingHistory || [];

          // 检查是否已存在相同的记录
          if (!history.some(item => item.tweetId === tweetId)) {
            // 添加新记录到历史中
            history.unshift(historyItem);
            // 保存更新后的历史
            await storage.setItem('local:tweetHistory', history);

            // setTimeout(async () => {
            //   await add(historyItem)
            // }, 1000);

            // 发送消息通知其他部分（如popup）历史已更新
            const message: Message = {
              type: 'TWEET_HISTORY_UPDATED',
              data: historyItem
            };
            browser.runtime.sendMessage(message);
          }
        }
      }
    } catch (error) {
      console.error('Error checking tweet URL:', error);
    }
  };

  // 监听来自content script的消息
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message === 'CHECK_URL' && sender.tab?.url) {
      checkAndRecordTweet(sender.tab.url);
    }
  });

  // 监听标签页更新（用于非SPA导航）
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      checkAndRecordTweet(tab.url);
    }
  });
});
