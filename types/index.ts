export interface TweetHistory {
  tweetId: string
  url: string
  timestamp: number
  author?: string // 新增：作者
  title?: string // 新增：标题
  content?: string
}

export interface Message {
  type: 'TWEET_HISTORY_UPDATED'
  data: TweetHistory
}

export type CleanupPeriod = '1w' | '1m' | '3m' | '1y' | 'never'

export interface CleanupConfig {
  period: CleanupPeriod
  lastCleanup: number
}
export interface LLMConfig {
  apiKey: string
  baseUrl: string
  model: string
}
