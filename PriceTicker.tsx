import React, { useState, useEffect, useRef } from 'react';
import type { TickerData } from './types.ts';
import { priceStreamService } from './cryptoDataService.ts';
import { ArrowUpIcon, ArrowDownIcon } from './icons.tsx';

const PriceTicker: React.FC = () => {
    const [data, setData] = useState<TickerData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [priceFlash, setPriceFlash] = useState('');
    const prevPriceRef = useRef<number | null>(null);

    useEffect(() => {
        const handleUpdate = (tickerData: TickerData | null, err: Error | null) => {
            if (err) {
                // Only set error if we don't have any data to display yet
                setData(currentData => {
                    if (!currentData) {
                        setError("Price feed unavailable");
                    }
                    return currentData; // Don't clear data on intermittent errors
                });
            } else if (tickerData) {
                if (prevPriceRef.current !== null) {
                    if (tickerData.price > prevPriceRef.current) {
                        setPriceFlash('bg-brand-buy/30');
                    } else if (tickerData.price < prevPriceRef.current) {
                        setPriceFlash('bg-brand-sell/30');
                    }
                }
                prevPriceRef.current = tickerData.price;
                setData(tickerData);
                setError(null); // Clear error on successful update

                setTimeout(() => setPriceFlash(''), 250);
            }
        };
        
        priceStreamService.subscribe(handleUpdate);

        return () => {
            priceStreamService.unsubscribe(handleUpdate);
        };
    }, []);

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
    const changeColor = isUp ? 'text-brand-buy' : 'text-brand-sell';

    return (
        <div className="w-full bg-brand-secondary border border-brand-border rounded-lg p-3 my-4">
            <div className="flex justify-between items-center text-sm sm:text-base">
                <div className="font-bold text-white">
                    <span className="text-brand-muted">BTC/USD</span>
                </div>
                <div className={`font-mono text-xl font-bold text-white px-2 rounded-md transition-colors duration-200 ${priceFlash}`}>
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
