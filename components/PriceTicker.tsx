import React, { useState, useEffect, useRef } from 'react';
import type { TickerData } from '../types.ts';
import { priceStreamService } from '../services/cryptoDataService.ts';
import { TrendingUpIcon } from './icons.tsx';

const StaticTickerRow: React.FC<{ symbol: string; bid: string; ask: string; }> = ({ symbol, bid, ask }) => (
    <tr className="border-t border-brand-border">
        <td className="p-1 text-left font-medium text-brand-text">{symbol}</td>
        <td className="p-1 text-right font-mono text-brand-muted">{bid}</td>
        <td className="p-1 text-right font-mono text-brand-muted">{ask}</td>
    </tr>
);


const PriceTicker: React.FC = () => {
    const [data, setData] = useState<TickerData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const prevPriceRef = useRef<number | null>(null);

    useEffect(() => {
        const handleUpdate = (tickerData: TickerData | null, err: Error | null) => {
            if (err) {
                setData(currentData => {
                    if (!currentData) setError("Price feed unavailable");
                    return currentData;
                });
            } else if (tickerData) {
                prevPriceRef.current = tickerData.price;
                setData(tickerData);
                setError(null);
            }
        };
        
        priceStreamService.subscribe(handleUpdate);

        return () => {
            priceStreamService.unsubscribe(handleUpdate);
        };
    }, []);

    const bid = data ? (data.price - 2.5).toFixed(2) : '...';
    const ask = data ? (data.price + 2.5).toFixed(2) : '...';
    
    const bidColor = prevPriceRef.current && data && data.price < prevPriceRef.current ? 'text-brand-sell' : 'text-brand-text';
    const askColor = prevPriceRef.current && data && data.price > prevPriceRef.current ? 'text-brand-buy' : 'text-brand-text';


    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-2">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 p-1">
                <TrendingUpIcon className="w-5 h-5 text-brand-accent"/>
                Market Watch
            </h2>
            <table className="w-full text-sm">
                <thead>
                <tr className="border-b border-brand-border">
                    <th className="p-1 text-left font-semibold text-brand-muted">Symbol</th>
                    <th className="p-1 text-right font-semibold text-brand-muted">Bid</th>
                    <th className="p-1 text-right font-semibold text-brand-muted">Ask</th>
                </tr>
                </thead>
                <tbody>
                    <tr className="border-t border-brand-border">
                        <td className="p-1 text-left font-bold text-brand-accent">BTC/USDm</td>
                        <td className={`p-1 text-right font-mono font-bold transition-colors duration-200 ${bidColor}`}>{error ? 'Error' : bid}</td>
                        <td className={`p-1 text-right font-mono font-bold transition-colors duration-200 ${askColor}`}>{error ? 'Error' : ask}</td>
                    </tr>
                    <StaticTickerRow symbol="ETH/USDm" bid="3788.50" ask="3789.90" />
                    <StaticTickerRow symbol="EUR/USDm" bid="1.0855" ask="1.0856" />
                    <StaticTickerRow symbol="GBP/USDm" bid="1.2710" ask="1.2711" />
                    <StaticTickerRow symbol="XAU/USDm" bid="2325.45" ask="2325.85" />
                </tbody>
            </table>
        </div>
    );
};

export default PriceTicker;