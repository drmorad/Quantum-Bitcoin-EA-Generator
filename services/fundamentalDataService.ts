import type { FundamentalData } from '../types';

const sentiments: FundamentalData['sentiment'][] = ['Bullish', 'Bearish', 'Neutral'];

const headlines: { sentiment: FundamentalData['sentiment']; text: string }[] = [
    { sentiment: 'Bullish', text: "Major financial institution announces plans to add Bitcoin to its balance sheet." },
    { sentiment: 'Bullish', text: "Positive inflation data suggests Fed may pause rate hikes, boosting risk assets." },
    { sentiment: 'Bullish', text: "Bitcoin network sees record high hash rate, indicating strong network security." },
    { sentiment: 'Bullish', text: "ETF inflows for Bitcoin products surge over the past week." },
    { sentiment: 'Bearish', text: "Regulatory uncertainty increases as SEC delays decision on spot Bitcoin ETFs." },
    { sentiment: 'Bearish', text: "Large sell-off in tech stocks leads to broader market risk-off sentiment." },
    { sentiment: 'Bearish', text: "Concerns rise over potential exploits on a major DeFi protocol." },
    { sentiment: 'Bearish', text: "Higher-than-expected CPI numbers fuel fears of more aggressive Fed action." },
    { sentiment: 'Neutral', text: "Bitcoin trading volume remains flat as market awaits key economic data." },
    { sentiment: 'Neutral', text: "Analysts divided on short-term price direction as Bitcoin consolidates in a tight range." },
    { sentiment: 'Neutral', text: "Market observes low volatility; on-chain data shows minimal movement from long-term holders." },
];


/**
 * Mocks fetching fundamental market data.
 * In a real application, this would involve API calls to news services,
 * sentiment analysis tools, or economic calendars.
 * @returns A randomized FundamentalData object.
 */
export const fetchFundamentalData = (): FundamentalData => {
    // 60% chance to pull a headline that matches a specific sentiment, 40% chance for a purely random one.
    // This makes the data feel a bit more cohesive.
    const sentimentBias = Math.random();
    let chosenSentiment: FundamentalData['sentiment'];
    
    if (sentimentBias < 0.4) chosenSentiment = 'Bullish';
    else if (sentimentBias < 0.8) chosenSentiment = 'Bearish';
    else chosenSentiment = 'Neutral';

    const possibleHeadlines = headlines.filter(h => h.sentiment === chosenSentiment);
    const chosenHeadline = possibleHeadlines[Math.floor(Math.random() * possibleHeadlines.length)];

    return {
        sentiment: chosenSentiment,
        headline: chosenHeadline.text,
    };
};
