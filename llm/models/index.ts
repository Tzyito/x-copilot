import GeminiProvider from './gemini'
import OpenAIProvider from './openai'

export const providers = {
  gemini: GeminiProvider,
  openai: OpenAIProvider,
} as Record<string, () => Promise<any>>
