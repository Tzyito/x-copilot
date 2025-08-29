
export type ContentSource = 'twitter' | 'your-lightning'

export interface ContentRecord {
  id: string
  source: ContentSource
  content: string
  timestamp: number
  url: string
  site: {
    name: string
    favicon?: string
  }
}

export interface TwitterRecord extends ContentRecord {
  source: 'twitter'
  tweetId: string
  author?: string
  title?: string
}

export interface DomSelectionRecord extends ContentRecord {
  source: 'your-lightning'
  selector?: string
  elementTag?: string
  preview?: string
}

export type ContentHistory = TwitterRecord | DomSelectionRecord

export interface SearchQuery {
  source?: ContentSource
  content: string
  site?: string
  tag?: string
}

export interface SearchResultGroup {
  source: ContentSource
  title: string
  icon: string
  count: number
  items: ContentHistory[]
}
export type SearchMode = 'all' | 'filtered' | 'grouped'

export interface ContentMessage {
  type: 'CONTENT_UPDATED' | 'DOM_SELECTION_COMPLETED'
  data: ContentHistory
}
export interface Message {
  type: 'TWEET_HISTORY_UPDATED' | 'CONTENT_UPDATED'
  data: ContentHistory
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
  provider: string
}

export type HotkeyAction = 'search' | 'domSelect'

export interface HotkeyBinding {
  action: HotkeyAction
  keys: string
  description: string
}

export interface HotkeyConfig {
  bindings: HotkeyBinding[]
}
