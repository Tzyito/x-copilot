import { createOpenAI } from '@ai-sdk/openai'
import { storage } from 'wxt/storage'
import { LLMConfig } from '@/types'

const openaiProvider = async () => {
  const llm_config = await storage.getItem<LLMConfig>('local:llm_config')
  if (llm_config && llm_config.model) {
    const openai = createOpenAI({
      apiKey: llm_config?.apiKey,
      baseURL: llm_config?.baseUrl || 'https://api.openai.com/v1',
    })
    return openai
  }
}
export default openaiProvider
