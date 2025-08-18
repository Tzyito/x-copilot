import { storage } from 'wxt/storage'
import type { ContentHistory, ContentSource } from '@/types'

export const STORAGE_KEYS = {
  CONTENT_HISTORY: 'local:contentHistory',
  CLEANUP_CONFIG: 'local:cleanupConfig',
  LLM_CONFIG: 'local:llm_config'
} as const

export class ContentStorage {
  static async addRecord(record: ContentHistory): Promise<void> {
    const history = await this.getAllRecords()
    history.unshift(record) // 最新的在前面
    await storage.setItem(STORAGE_KEYS.CONTENT_HISTORY, history)
  }
  
  static async getAllRecords(): Promise<ContentHistory[]> {
    return await storage.getItem(STORAGE_KEYS.CONTENT_HISTORY) || []
  }
  
  static async getRecordsBySource(source: ContentSource): Promise<ContentHistory[]> {
    const history = await this.getAllRecords()
    return history.filter(record => record.source === source)
  }
  
  static async getRecordsBySite(siteName: string): Promise<ContentHistory[]> {
    const history = await this.getAllRecords()
    return history.filter(record => 
      record.site.name.toLowerCase().includes(siteName.toLowerCase())
    )
  }
  
  static async deleteRecord(id: string): Promise<void> {
    const history = await this.getAllRecords()
    const filtered = history.filter(record => record.id !== id)
    await storage.setItem(STORAGE_KEYS.CONTENT_HISTORY, filtered)
  }
  
  static async clearHistory(): Promise<void> {
    await storage.setItem(STORAGE_KEYS.CONTENT_HISTORY, [])
  }
  
  static async updateRecord(id: string, record: ContentHistory): Promise<void> {
    const history = await this.getAllRecords()
    const index = history.findIndex(record => record.id === id)
    if (index !== -1) {
      history[index] = record
      await storage.setItem(STORAGE_KEYS.CONTENT_HISTORY, history)
    }
  }

  static async setAllRecords(records: ContentHistory[]): Promise<void> {
    await storage.setItem(STORAGE_KEYS.CONTENT_HISTORY, records)
  }

  // 生成唯一 ID
  static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}