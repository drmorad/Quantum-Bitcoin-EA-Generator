
import React, { useState, useEffect, useRef } from 'react';
import type { TickerData } from '../types.ts';
import { priceStreamService } from '../services/cryptoDataService.ts';
import { ArrowUpIcon, ArrowDownIcon } from './icons.tsx';

const PriceTicker: React.FC = () => {
    const [data, setData] = useState<TickerData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [priceFlash, setPriceFlash] = useState('');
    const prevPriceRef = useRef<number | null>(null);

    useEffect(() => {
        const handleUpdate = (tickerData: TickerData | null, err: Error | null) => {
            if (err) {
                setData(currentData => {
                    if (!currentData) setError("Price feed unavailable");
                    return currentData;
                });
            } else if (tickerData) {
                if (prevPriceRef.current !== null) {
                    if (tickerData.price > prevPriceRef.current) {
                        setPriceFlash('bg-brand-buy/20');
                    } else if (tickerData.price < prevPriceRef.current) {
                        setPriceFlash('bg-brand-sell/20');
                    }
                }
                prevPriceRef.current = tickerData.price;
                setData(tickerData);
                setError(null);

                // Reset the flash effect
                setTimeout(() => setPriceFlash(''), 300);
            }
        };
        
        priceStreamService.subscribe(handleUpdate);

        return () => {
            priceStreamService.unsubscribe(handleUpdate);
        };
    }, []);

    const TickerSkeleton = () => (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-3 animate-pulse">
             <div className="flex justify-between items-center">
                <div className="h-6 bg-brand-border rounded w-28"></div>
                <div className="h-7 bg-brand-border rounded w-40"></div>
                <div className="h-6 bg-brand-border rounded w-48"></div>
            </div>
        </div>
    );
    
    if (error && !data) {
        return (
            <div className="w-full bg-brand-secondary border border-brand-border rounded-lg p-3 text-center text-red-400">
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
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-3">
             <div className="flex flex-wrap justify-between items-center gap-x-6 gap-y-2">
                <div className="font-bold text-brand-text flex items-center gap-2 text-lg">
                    <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/1.png" alt="BTC" className="w-6 h-6" />
                    <span>BTC/USD</span>
                </div>
                <div className={`font-mono text-xl font-bold text-brand-text px-2 rounded-md transition-colors duration-200 ${priceFlash}`}>
                    {price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
                <div className={`font-mono font-semibold flex items-center gap-2 ${changeColor}`}>
                    {isUp ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowDownIcon className="w-5 h-5" />}
                    <span>{changeAbsolute.toFixed(2)}</span>
                    <span className="text-sm">({isUp ? '+' : ''}{(changePercentage * 100).toFixed(2)}%) 24h</span>
                </div>
            </div>
        </div>
    );
};

export default PriceTicker;
