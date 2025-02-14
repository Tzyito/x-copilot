import { describe, it, expect, beforeEach } from 'vitest'
import * as JsSearch from 'js-search'
import type { TweetHistory } from '../types'

// 模拟的推文历史数据
const mockTweetHistory: TweetHistory[] = [
    {
        tweetId: '1',
        url: 'https://twitter.com/user1/status/1',
        title: '今天是个好天气 #天气 #心情',
        author: '张三',
        timestamp: 1710000000000
    },
    {
        tweetId: '2',
        url: 'https://twitter.com/user2/status/2',
        title: '分享一篇关于 Vue.js 的好文章',
        author: '李四',
        timestamp: 1710000100000
    },
    {
        tweetId: '3',
        url: 'https://twitter.com/user3/status/3',
        title: '美食分享：如何制作完美的煎蛋',
        author: '张三',
        timestamp: 1710000200000
    }
]

describe('Tweet Search functionality', () => {
    let searchEngine: JsSearch.Search

    // 在每个测试前初始化搜索引擎
    beforeEach(() => {
        searchEngine = new JsSearch.Search('url')
        searchEngine.tokenizer = new JsSearch.StopWordsTokenizer(
            new JsSearch.SimpleTokenizer()
        )
        searchEngine.addIndex('title')
        searchEngine.addIndex('author')
        searchEngine.addDocuments(mockTweetHistory)
    })

    it('should find tweets by author name', () => {
        const results = searchEngine.search('张三')
        expect(results.length).toBe(2)
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ author: '张三' })
            ])
        )
    })

    // it('should find tweets by content', () => {
    //     const results = searchEngine.search('Vue.js') as TweetHistory[]
    //     expect(results.length).toBe(1)
    //     expect(results[0].author).toBe('李四')
    // })

    // it('should return empty array for no matches', () => {
    //     const results = searchEngine.search('不存在的内容')
    //     expect(results.length).toBe(0)
    // })

    // it('should find tweets by partial match', () => {
    //     const results = searchEngine.search('天气') as TweetHistory[]
    //     expect(results.length).toBe(1)
    //     expect(results[0].title).toContain('天气')
    // })

    // it('should handle empty search query', () => {
    //     const results = searchEngine.search('')
    //     expect(results.length).toBe(0)
    // })
}) 