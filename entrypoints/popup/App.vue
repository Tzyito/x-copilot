<script setup lang="ts">
import { ref, onMounted } from "vue";
import { storage } from "wxt/storage";
import type { TweetHistory } from "../../types";
// import { useSearch } from './search'

const records = ref<TweetHistory[]>([]);
const searchQuery = ref("");
const searchList = ref<TweetHistory[]>([]);

// const { search } = useSearch()

// 初始化搜索引擎
const searchHistory = async (question: string) => {
  const search = async (question: string) => {
    const history =
      (await storage.getItem<TweetHistory[]>("local:tweetHistory")) || [];
    const result = history.filter((item: TweetHistory) =>
      item.title?.includes(question)
    );
    return result;
  };
  searchList.value = await search(question);
  console.log("searchList.value", searchList.value);
};

watch(searchQuery, async (newVal) => {
  console.log("newVal", newVal);
  searchHistory(newVal);
});

const loadHistory = async () => {
  records.value = (await storage.getItem("local:tweetHistory")) || [];
};

const filterRecords = computed(() => {
  if (!searchQuery.value || !searchList.value.length) {
    return records.value;
  }
  console.log("filterRecords", searchList.value);
  return searchList.value;
});

onMounted(async () => {
  loadHistory();
  console.log("records.value");
  // 监听历史更新消息
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "TWEET_HISTORY_UPDATED") {
      console.log("TWEET_HISTORY_UPDATED ");
      loadHistory();
    }
  });
});

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const openTweet = (url: string) => {
  window.open(url, "_blank");
};

const clearHistory = async () => {
  await storage.setItem("local:tweetHistory", []);
  records.value = [];
  searchList.value = [];
};
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>浏览历史</h1>
      <button @click="clearHistory" class="clear-btn">清空历史</button>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索作者或内容..."
        class="search-input"
      />
    </div>

    <div v-if="filterRecords.length === 0" class="empty-state">
      {{ searchQuery ? "没有找到匹配的记录" : "暂无浏览记录" }}
    </div>

    <div v-else class="records-list">
      <div
        v-for="record in filterRecords"
        :key="record.url"
        class="record-item"
        @click="openTweet(record.url)"
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
  padding: 16px;
  font-family: system-ui, -apple-system, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.1);
}

h1 {
  margin: 0;
  font-size: 20px;
  color: #1a1a1a;
}

.clear-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #e0e0e0;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 32px 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  padding: 12px;
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
  font-size: 15px;
}

.time {
  font-size: 12px;
  color: #666;
}

.title {
  color: #444;
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
}
</style>
