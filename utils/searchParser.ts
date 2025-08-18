import type { SearchQuery, ContentSource } from '@/types'

export class SearchParser {
  static parse(query: string): SearchQuery {
    const parts = query.trim().split(/\s+/)
    const result: SearchQuery = { content: '' }
    const contentParts: string[] = []
    
    for (const part of parts) {
      if (part.startsWith('source:')) {
        const source = part.substring(7) as ContentSource
        if (this.isValidSource(source)) {
          result.source = source
        }
      } else if (part.startsWith('site:')) {
        result.site = part.substring(5)
      } else if (part.startsWith('tag:')) {
        result.tag = part.substring(4)
      } else {
        contentParts.push(part)
      }
    }
    
    result.content = contentParts.join(' ')
    return result
  }
  
  static getSearchSuggestions(query: string): string[] {
    const suggestions: string[] = []
    const lowerQuery = query.toLowerCase()
    
    // 如果没有 source: 前缀，建议添加
    if (!lowerQuery.includes('source:')) {
      suggestions.push('source:twitter', 'source:your-lightning')
    }
    
    // 如果已有 source: 但没有 site:，建议常用网站
    if (lowerQuery.includes('source:') && !lowerQuery.includes('site:')) {
      if (lowerQuery.includes('source:twitter')) {
        suggestions.push('site:x.com', 'site:twitter.com')
      } else {
        suggestions.push('site:youtube.com', 'site:github.com', 'site:reddit.com')
      }
    }
    
    return suggestions
  }
  
  static getSourceIcon(source: ContentSource): string {
    const icons = {
      'twitter': '🐦',
      'your-lightning': '🎯'
    }
    return icons[source] || '📄'
  }
  
  static getSourceTitle(source: ContentSource): string {
    const titles = {
      'twitter': 'Twitter',
      'your-lightning': 'Your Lightning'
    }
    return titles[source] || 'Unknown'
  }
  
  private static isValidSource(source: string): source is ContentSource {
    return ['twitter', 'your-lightning'].includes(source)
  }
  
  static formatSearchHint(query: string): string {
    if (!query.trim()) {
      return '搜索内容或使用 source:twitter 筛选...'
    }
    
    const parsed = this.parse(query)
    const parts: string[] = []
    
    if (parsed.source) {
      parts.push(`来源：${this.getSourceTitle(parsed.source)}`)
    }
    
    if (parsed.site) {
      parts.push(`网站：${parsed.site}`)
    }
    
    if (parsed.content) {
      parts.push(`内容："${parsed.content}"`)
    }
    
    return parts.length > 0 ? parts.join(' • ') : '输入搜索条件...'
  }
  
  // 高亮搜索结果中的匹配文本
  static highlightMatches(text: string, searchTerm: string): string {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }
} 