import { generateText } from 'ai'
import { providers } from './models'
import { storage } from 'wxt/storage'
import { LLMConfig } from '@/types'

const generatePrompt = (query: string, now: Date) => `
你是一位专业的搜索参数提取助手，擅长将用户的自然语言查询转化为结构化的搜索参数。当用户描述他们想要查找的内容时，你需要提取关键词和条件，并将其转换为标准化的搜索参数格式。

## 你的任务

分析用户的查询需求，提取以下要素：
- 主题关键词
- 时间范围
- 语言偏好
- 热度要求
- 用户名
- 其他特定筛选条件

然后将这些要素转换为以下格式的搜索参数：
\`[关键词] [时间参数] [用户名] [语言参数] [热度参数] [其他参数]\`

## 参数格式说明

- 时间参数：使用\`since:2024-01-01\`表示从2024-01-01之后, 如\`until:2024-01-01\`表示从2024年1月1日开始
- 语言参数：使用\`lang:xx\`表示语言，如\`lang:zh\`表示中文
- 热度参数：使用\`min_faves:数字\`表示最少收藏数，使用\`min_retweets:数字\`表示最少转发数
- 用户名：使用\`from:alex\`表示从用户alex发布的内容中搜索

## 示例
当前时间为：${now}
**用户输入**: "最近两天中文圈关于RAG的top10文章"  
> 根据当前时间${now}推断，最近两天的ISO 8601日期格式
 **输出**: \`RAG since:2024-01-2 lang:zh min_faves:20\`

**用户输入**: "过去一周关于人工智能的英文热门讨论"  
> 根据当前时间${now}推断，最近一周的ISO 8601日期格式
**输出**: \`artificial intelligence since:2024-01-25 lang:en min_faves:50\`

**用户输入**: "本月有关大模型微调的学术论文"  
**输出**: \`LLM fine-tuning since:2024-01-01 type:paper min_faves:10\`

**用户输入**: "昨天发布的关于Claude 3的评测"  
**输出**: \`Claude 3 review since:2024-02-01 min_faves:5\`

**用户输入**: "近期法语区关于可解释AI的讨论"  
**输出**: \`explainable AI since:2024-01-15 lang:fr\`

## 注意事项

1. 只输出搜索参数，不要添加解释
2. 根据查询内容智能推断时间范围
3. 如果用户没有明确指定某参数，可以根据上下文合理添加
4. 优先保留重要关键词，去除无关词语

请直接返回搜索参数，不需要额外解释。

# 用户输入
${query}
`

export const llm = async (prompt: string) => {
  const llm_config = await storage.getItem<LLMConfig>('local:llm_config')
  if (llm_config && llm_config.model) {
    const aiProvider = await providers[llm_config.provider]()
    return generateText({
      model: aiProvider(llm_config.model),
      prompt: generatePrompt(prompt, new Date()),
    })
  }
  return null
}
