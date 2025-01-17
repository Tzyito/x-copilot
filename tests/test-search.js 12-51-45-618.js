import { create, insert, search } from '@orama/orama'
import { createTokenizer } from '@orama/tokenizers/mandarin'
import { stopwords as mandarinStopwords } from "@orama/stopwords/mandarin";


// 创建测试数据
const mockTweetHistory = [
    {
        url: 'https://twitter.com/user1/status/1',
        title: '今天是个好天气 Nice weather today',
        author: '张三',
        timestamp: 1710000000000
    },
    {
        url: 'https://twitter.com/user2/status/2',
        title: '分享一篇关于 Vue.js development 的好文章',
        author: '李四 Li Si',
        timestamp: 1710000100000
    },
    {
        url: 'https://twitter.com/user3/status/3',
        title: 'How to make perfect 煎蛋',
        author: 'Zhange Zhang San',
        timestamp: 1710000200000
    },
    {
        url: 'https://twitter.com/user4/status/4',
        title: 'Zhange 哈哈哈哈',
        author: 'Zhange hhh',
        timestamp: 1710000300000
    }
]

async function runTests() {
    console.log('开始搜索测试...\n')

    // 创建搜索数据库
    const db = await create({
        schema: {
            url: 'string',
            title: 'string',
            author: 'string',
            timestamp: 'number'
        },
        components: {
            tokenizer: createTokenizer({
                stopWords: mandarinStopwords,
            }),
        },
    })

    // 插入数据
    for (const tweet of mockTweetHistory) {
        await insert(db, tweet)
    }

    // 测试用例1：中文作者搜索
    console.log('测试1: 搜索作者"张三"')
    const authorResults = await search(db, {
        term: '张三',
        // properties: ['author'],
        // tolerance: 1,
        // exact: true
    })
    console.log('结果数量:', authorResults.hits.length)
    console.log('搜索结果:', authorResults.hits)
    console.log('\n-------------------\n')

    // 测试用例2：英文内容搜索
    console.log('测试2: 搜索"Vue"')
    const vueResults = await search(db, {
        term: 'Vue',
        properties: ['title']
    })
    console.log('结果数量:', vueResults.hits.length)
    console.log('搜索结果:', vueResults.hits)
    console.log('\n-------------------\n')

    // 测试用例3：混合语言搜索
    console.log('测试3: 搜索"weather"')
    const weatherResults = await search(db, {
        term: 'weather',
        properties: ['title']
    })
    console.log('结果数量:', weatherResults.hits.length)
    console.log('搜索结果:', weatherResults.hits)
    console.log('\n-------------------\n')

    // 测试用例4：多字段搜索
    console.log('测试4: 在标题和作者中搜索"Zhang"')
    const zhangResults = await search(db, {
        term: 'Zhang',
        properties: ['title', 'author']
    })
    console.log('结果数量:', zhangResults.hits.length)
    console.log('搜索结果:', zhangResults.hits)
}

// 运行测试
runTests().catch(error => {
    console.error('测试出错:', error)
})