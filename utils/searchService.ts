import { ContentStorage } from './storage'
import { SearchParser } from './searchParser'
import type { ContentHistory, SearchResultGroup, SearchMode } from '@/types'

export class SearchService {
  /**
   * 搜索内容历史记录
   * @param query 搜索查询字符串
   * @returns 搜索结果
   */
  static async search(query: string) {
    // 获取所有历史记录
    const allRecords = await ContentStorage.getAllRecords()
    
    // 解析搜索查询
    const parsedQuery = SearchParser.parse(query)
    
    // 应用筛选条件
    let filteredRecords = allRecords.filter(record => {
      // 按内容源筛选
      if (parsedQuery.source && record.source !== parsedQuery.source) {
        return false
      }
      
      // 按网站筛选
      if (parsedQuery.site && 
          !record.site.name.toLowerCase().includes(parsedQuery.site.toLowerCase())) {
        return false
      }
      
      // 按内容关键词筛选
      if (parsedQuery.content && !record.content.toLowerCase().includes(parsedQuery.content.toLowerCase())) {
        return false
      }
      
      return true
    })
    
    // 按时间戳降序排序（最新的在前）
    filteredRecords.sort((a, b) => b.timestamp - a.timestamp)
    
    // 根据筛选条件的存在与否，决定返回分组模式还是筛选模式
    const hasFilters = parsedQuery.source || parsedQuery.site || parsedQuery.content
    const mode: SearchMode = hasFilters ? 'filtered' : 'grouped'
    
    // 如果是分组模式，按内容源分组
    const groups: SearchResultGroup[] = []
    
    if (mode === 'grouped') {
      // 获取所有内容源类型
      const sources = [...new Set(filteredRecords.map(record => record.source))]
      
      // 按内容源分组
      for (const source of sources) {
        const items = filteredRecords.filter(record => record.source === source)
        groups.push({
          source,
          title: SearchParser.getSourceTitle(source),
          icon: SearchParser.getSourceIcon(source),
          count: items.length,
          items
        })
      }
      
      // 按数量排序（多的在前面）
      groups.sort((a, b) => b.count - a.count)
    } else {
      // 如果是筛选模式，按内容源分组但保持单组展示
      const sources = [...new Set(filteredRecords.map(record => record.source))]
      
      for (const source of sources) {
        const items = filteredRecords.filter(record => record.source === source)
        groups.push({
          source,
          title: SearchParser.getSourceTitle(source),
          icon: SearchParser.getSourceIcon(source),
          count: items.length,
          items
        })
      }
    }
    
    // 返回结果
    return {
      mode,
      groups,
      totalCount: filteredRecords.length
    }
  }
}
