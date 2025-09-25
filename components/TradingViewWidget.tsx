
import React, { useState, useEffect } from 'react';
import type { FundamentalData } from '../types.ts';
import { fetchMarketNews } from '../services/fundamentalDataService.ts';
import { NewspaperIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon, AlertTriangleIcon } from './icons.tsx';

const sentimentStyles: Record<FundamentalData['sentiment'], { icon: React.FC<{className?: string}>; badgeClass: string; textClass: string }> = {
    Bullish: {
        icon: TrendingUpIcon,
        badgeClass: 'bg-brand-buy/20',
        textClass: 'text-brand-buy',
    },
    Bearish: {
        icon: TrendingDownIcon,
        badgeClass: 'bg-brand-sell/20',
        textClass: 'text-brand-sell',
    },
    Neutral: {
        icon: MinusIcon,
        badgeClass: 'bg-brand-muted/20',
        textClass: 'text-brand-muted',
    },
};

const MarketNewsFeed: React.FC = () => {
    const [news, setNews] = useState<FundamentalData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadNews = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const newsData = await fetchMarketNews();
                setNews(newsData);
            } catch (err) {
                setError('Failed to fetch market news.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadNews();
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-3 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-brand-border"></div>
                            <div className="h-4 flex-grow bg-brand-border rounded"></div>
                        </div>
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center text-red-400">
                    <AlertTriangleIcon className="w-8 h-8 mb-2" />
                    <p>{error}</p>
                </div>
            );
        }

        if (news.length === 0) {
            return (
                 <div className="flex items-center justify-center h-full text-brand-muted">
                    <p>No recent news available.</p>
                </div>
            );
        }

        return (
            <ul className="space-y-3">
                {news.map((item, index) => {
                    const styles = sentimentStyles[item.sentiment];
                    return (
                        <li key={index} className="flex items-start gap-3">
                            <div className={`flex-shrink-0 p-1.5 rounded-full ${styles.badgeClass}`}>
                                <styles.icon className={`w-4 h-4 ${styles.textClass}`} />
                            </div>
                            <p className="text-sm text-brand-muted">{item.headline}</p>
                        </li>
                    );
                })}
            </ul>
        );
    };


    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-full min-h-[400px]">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                <NewspaperIcon className="w-6 h-6 text-brand-accent"/>
                Market News Feed
            </h2>
            <div className="flex-grow overflow-y-auto pr-2">
                {renderContent()}
            </div>
        </div>
    );
};

export default MarketNewsFeed;
