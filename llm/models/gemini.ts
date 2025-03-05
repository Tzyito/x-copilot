import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { storage } from 'wxt/storage'
import { LLMConfig } from '@/types'

const googleProvider = async () => {
  const llm_config = await storage.getItem<LLMConfig>('local:llm_config')
  const gemini = createGoogleGenerativeAI({
    apiKey: llm_config?.apiKey,
  })
  return gemini
}
export default googleProvider
