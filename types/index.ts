export interface TweetHistory {
    tweetId: string;
    url: string;
    timestamp: number;
    author?: string;    // 新增：作者
    title?: string;     // 新增：标题/内容摘要  
}

export interface Message {
    type: 'TWEET_HISTORY_UPDATED';
    data: TweetHistory;
}