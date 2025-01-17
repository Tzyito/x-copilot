import { create, insert, search as searchOrama } from "@orama/orama";
import { createTokenizer } from '@orama/tokenizers/mandarin'
import { stopwords as mandarinStopwords } from "@orama/stopwords/mandarin";
import { ref } from "vue";
import { TweetHistory } from "@/types";
export const useSearch = () => {
    const config = {
        searchProperties: ['title', 'author'],
    }
    const db = ref<any>(null)

    const init = () => {
        db.value = create({
            schema: {
                tweetId: 'string',
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
        });
    }
    const search = async (question: string) => {
        // const results = await searchOrama(db.value, {
        //     term: question,
        //     properties: config.searchProperties,
        // })
        // if (results.hits.length > 0) {
        //     return results.hits.map(hit => hit.document)
        // }
        // return []
        const history = await storage.getItem<TweetHistory[]>('local:tweetHistory') || []
        const result = history.filter((item: TweetHistory) => item.title?.includes(question))
        return result
    }
    const add = async (data: any) => {
        await insert(db.value, data)
    }
    return {
        init,
        search,
        add
    }
}