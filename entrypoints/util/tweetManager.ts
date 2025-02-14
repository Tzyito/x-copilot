interface TweetHistory {
    tweetId: string;
    author: string;
    content: string;
    title: string;
    timestamp: number;
    url: string;
    children: TweetHistory[];
}

export default class TweetManager {
    private tweetHistory: TweetHistory[] = [];

    constructor() {
        this.tweetHistory = [];
    }

    // 首页->tweet详情1 addTweet(null，详情1) [{id: 详情1}]
    // tweet详情1->tweet2详情 addTweet(详情1，详情2) [{id: 详情1, childen: [{id: 详情2}]}]
    // @TODO tweet详情2->tweet1详情 addTweet(详情2，详情1) [{id: 详情1, childen: [{id: 详情2}]}]
    // 这种情况，暂不支持。后续可用dfs查询
    addTweet(originalTweet: TweetHistory, targetTweet: TweetHistory) {
        const insertTweetted = this.tweetHistory.find(t => t.tweetId === originalTweet?.tweetId);
        if (!originalTweet || !insertTweetted) {
            this.tweetHistory.push({ ...targetTweet, children: [] })
            return
        }
        insertTweetted.children.push(targetTweet);
    }

    getTweetHistory() {
        return this.tweetHistory;
    }

    clear() {
        this.tweetHistory = []
    }
}