import { llm } from '.'

export const useSearch = () => {
  const search = async (query: string) => {
    const response = await llm(query)
    if (response) {
      return response.text
    }
    return null
  }

  return {
    search,
  }
}
