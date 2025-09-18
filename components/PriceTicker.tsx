import React, { useState, useEffect, useCallback } from 'react';
import type { TickerData } from '../types';
import { fetchBTCUSD_TickerData } from '../services/cryptoDataService';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

const PriceTicker: React.FC = () => {
    const [data, setData] = useState<TickerData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const tickerData = await fetchBTCUSD_TickerData();
            setData(tickerData);
            if (error) setError(null); // Clear previous error on success
        } catch (e) {
            setError("Price feed unavailable");
            console.error("Failed to fetch ticker data:", e);
        }
    }, [error]);

    useEffect(() => {
        fetchData(); // Fetch immediately on mount
        const intervalId = setInterval(fetchData, 5000); // Poll every 5 seconds
        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [fetchData]);

    const TickerSkeleton = () => (
        <div className="w-full bg-brand-secondary border border-brand-border rounded-lg p-3 my-4 animate-pulse">
             <div className="flex justify-between items-center text-sm">
                <div className="h-4 bg-brand-border rounded w-24"></div>
                <div className="h-6 bg-brand-border rounded w-32"></div>
                <div className="h-4 bg-brand-border rounded w-40"></div>
            </div>
        </div>
    );
    
    if (error && !data) {
        return (
            <div className="w-full bg-red-900/50 border border-red-700 rounded-lg p-3 my-4 text-center text-red-300 text-sm">
                {error}
            </div>
        );
    }
    
    if (!data) {
        return <TickerSkeleton />;
    }

    const { price, changeAbsolute, changePercentage } = data;
    const isUp = changeAbsolute >= 0;
    const changeColor = isUp ? 'text-green-400' : 'text-red-400';

    return (
        <div className="w-full bg-brand-secondary border border-brand-border rounded-lg p-3 my-4">
            <div className="flex justify-between items-center text-sm sm:text-base">
                <div className="font-bold text-white">
                    <span className="text-brand-muted">BTC/USD</span>
                </div>
                <div className="font-mono text-xl font-bold text-white">
                    {price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
                <div className={`font-mono font-semibold flex items-center gap-2 ${changeColor}`}>
                    {isUp ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                    <span>{changeAbsolute.toFixed(2)}</span>
                    <span>({isUp ? '+' : ''}{(changePercentage * 100).toFixed(2)}%)</span>
                </div>
            </div>
        </div>
    );
};

export default PriceTicker;
