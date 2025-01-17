export default defineContentScript({
  matches: ['https://x.com/*'],

  main(ctx) {
    console.log('content.ts start')
    // 监听页面变化（用于SPA导航）
    const observer = new MutationObserver(() => {
      // 发送当前URL给background script检查
      browser.runtime.sendMessage('CHECK_URL');
    });

    // 观察 document.body 的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初始检查
    browser.runtime.sendMessage('CHECK_URL');

    // 清理函数
    return () => {
      observer.disconnect();
    };
  },
});