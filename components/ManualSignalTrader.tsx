import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { EAConfig, CandlestickData, TickerData } from '../types';
import { fetchBTCUSD_H1_Data, fetchBTCUSD_TickerData } from '../services/cryptoDataService';
import { SignalIcon, TrendingUpIcon, TrendingDownIcon, ArrowUpIcon, ArrowDownIcon, XIcon, CheckIcon } from './icons';

interface ManualSignalTraderProps {
  config: EAConfig;
}

// Indicator Calculation Utilities (adapted for this component)
const calculateSMA = (data: CandlestickData[], period: number): number | null => {
    if (data.length < period) return null;
    let sum = 0;
    for (let i = data.length - period; i < data.length; i++) {
        sum += data[i].close;
    }
    return sum / period;
};

const calculateEMA = (data: CandlestickData[], period: number): number | null => {
    if (data.length < period) return null;
    const k = 2 / (period + 1);
    let ema = 0;
    // Initial SMA
    for (let i = 0; i < period; i++) {
        ema += data[i].close;
    }
    ema /= period;
    // Calculate rest of EMA
    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * k + ema;
    }
    return ema;
};

const calculateATR = (data: CandlestickData[], period: number): number | null => {
    if (data.length < period + 1) return null;
    const trueRanges: number[] = [];
    for (let i = 1; i < data.length; i++) {
        const tr = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i-1].close), Math.abs(data[i].low - data[i-1].close));
        trueRanges.push(tr);
    }
    if (trueRanges.length < period) return null;
    let atr = 0;
    // Wilder's smoothing for ATR
    for (let i = 0; i < period; i++) {
        atr += trueRanges[i];
    }
    atr /= period;

    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
    }
    return atr;
};

const calculateRSI = (data: CandlestickData[], period: number): number | null => {
    if (data.length < period + 1) return null;

    const changes = data.slice(1).map((candle, i) => candle.close - data[i].close);
    let avgGain = 0;
    let avgLoss = 0;
    
    // Calculate initial average gain and loss
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            avgGain += changes[i];
        } else {
            avgLoss -= changes[i];
        }
    }
    avgGain /= period;
    avgLoss /= period;
    
    // Smooth the rest
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgLoss = (avgLoss * (period - 1) - change) / period;
            avgGain = (avgGain * (period - 1)) / period;
        }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

const playSound = (frequency = 440, duration = 150, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);

    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration / 1000);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    console.error("Could not play sound alert. User interaction might be required to enable audio.", e);
  }
};


const ManualSignalTrader: React.FC<ManualSignalTraderProps> = ({ config }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ticker, setTicker] = useState<TickerData | null>(null);
    const [indicatorData, setIndicatorData] = useState<{ ma: number | null; rsi: number | null; atr: number | null; lastClose: number | null }>({ ma: null, rsi: null, atr: null, lastClose: null });
    const prevSignalStatusRef = useRef<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [tickerData, ohlcData] = await Promise.all([
                fetchBTCUSD_TickerData(),
                fetchBTCUSD_H1_Data(),
            ]);
            setTicker(tickerData);
            
            // For signal consistency, calculations are based on completed bars.
            // The last item in ohlcData is the current, incomplete bar.
            const completedBars = ohlcData.slice(0, -1);

            if(completedBars.length < 2) throw new Error("Not enough historical data.");

            const { signal_maPeriod, signal_maType, signal_rsiPeriod, signal_atrPeriod } = config;

            const ma = signal_maType === 'EMA'
                ? calculateEMA(completedBars, signal_maPeriod)
                : calculateSMA(completedBars, signal_maPeriod);

            const rsi = calculateRSI(completedBars, signal_rsiPeriod);
            const atr = calculateATR(completedBars, signal_atrPeriod);
            const lastClose = completedBars[completedBars.length - 1].close;

            setIndicatorData({ ma, rsi, atr, lastClose });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch market data.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [config]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Refresh every 15 seconds
        return () => clearInterval(interval);
    }, [fetchData]);
    
    const signalStatus = useMemo(() => {
        const { ma, rsi, lastClose } = indicatorData;
        const { signal_rsiOversold, signal_rsiOverbought } = config;
        
        if (isLoading || ma === null || rsi === null || lastClose === null) {
            return { type: 'loading', text: 'Analyzing signal...' };
        }

        const isUptrend = lastClose > ma;
        const isDowntrend = lastClose < ma;
        const isRsiOversold = rsi < signal_rsiOversold;
        const isRsiOverbought = rsi > signal_rsiOverbought;

        if (isUptrend && isRsiOversold) {
            return { type: 'buy', text: 'BUY SIGNAL ACTIVE' };
        }
        if (isDowntrend && isRsiOverbought) {
            return { type: 'sell', text: 'SELL SIGNAL ACTIVE' };
        }

        return { type: 'neutral', text: 'NO SIGNAL' };
    }, [indicatorData, config, isLoading]);

    useEffect(() => {
        const prevStatus = prevSignalStatusRef.current;
        const currentStatus = signalStatus.type;

        // Play sound only on transition to a new 'buy' or 'sell' signal
        if (currentStatus !== prevStatus && (currentStatus === 'buy' || currentStatus === 'sell')) {
            if (currentStatus === 'buy') {
                playSound(880, 150, 'sine'); // Higher pitch for buy
            } else { // sell
                playSound(523, 200, 'sawtooth'); // Lower, more 'alerting' sound for sell
            }
        }

        // Update the ref for the next render
        prevSignalStatusRef.current = currentStatus;
    }, [signalStatus]);

    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const handlePlaceOrder = (type: 'Buy' | 'Sell') => {
        if (!ticker || !indicatorData.atr) return;

        const { signal_lotSize, signal_atrMultiplierSL, signal_atrMultiplierTP } = config;
        const entryPrice = type === 'Buy' ? ticker.price : ticker.price; // Could use ask/bid if available
        const slDistance = indicatorData.atr * signal_atrMultiplierSL;
        const tpDistance = indicatorData.atr * signal_atrMultiplierTP;

        const stopLoss = type === 'Buy' ? entryPrice - slDistance : entryPrice + slDistance;
        const takeProfit = type === 'Buy' ? entryPrice + tpDistance : entryPrice - tpDistance;

        console.log(
            `[MANUAL SIMULATED ORDER]\n` +
            `  - Type: ${type} Market\n` +
            `  - Lots: ${signal_lotSize.toFixed(2)}\n` +
            `  - Entry: ${formatCurrency(entryPrice)}\n` +
            `  - Stop Loss: ${formatCurrency(stopLoss)} (${slDistance.toFixed(2)} pts)\n` +
            `  - Take Profit: ${formatCurrency(takeProfit)} (${tpDistance.toFixed(2)} pts)`
        );
    };

    if (error) {
         return (
             <div className="bg-brand-secondary border border-red-700 rounded-lg p-6 h-full flex flex-col justify-center items-center text-center">
                 <h2 className="text-xl font-semibold flex items-center gap-3 mb-4"><SignalIcon className="w-6 h-6 text-brand-accent"/>Manual Signal Trader</h2>
                 <p className="text-red-400">{error}</p>
                 <button onClick={fetchData} className="mt-4 px-4 py-2 bg-brand-accent rounded-md text-white font-semibold">Retry</button>
             </div>
         );
    }
    
    if (isLoading && !ticker) {
         return (
             <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 h-full flex flex-col justify-center items-center text-center animate-pulse">
                <div className="w-8 h-8 rounded-full bg-brand-border mb-4"></div>
                <div className="h-6 w-48 bg-brand-border rounded-md mb-2"></div>
                <div className="h-4 w-32 bg-brand-border rounded-md"></div>
             </div>
        );
    }
    
    const trend = indicatorData.lastClose && indicatorData.ma ? (indicatorData.lastClose > indicatorData.ma ? 'up' : 'down') : 'neutral';
    
    const signalColorClasses = {
        buy: 'bg-green-500/10 border-green-500/50 text-green-400',
        sell: 'bg-red-500/10 border-red-500/50 text-red-400',
        neutral: 'bg-brand-primary/50 border-brand-border text-brand-muted',
        loading: 'bg-brand-primary/50 border-brand-border text-brand-muted animate-pulse',
    };

    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 h-full flex flex-col">
            <h2 className="text-2xl font-semibold flex items-center gap-3 mb-4"><SignalIcon className="w-6 h-6 text-brand-accent"/>Manual Signal Trader</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div className="bg-brand-primary/50 p-3 rounded-lg">
                    <p className="text-sm text-brand-muted">MA ({config.signal_maType} {config.signal_maPeriod})</p>
                    <div className={`text-lg font-bold font-mono flex items-center justify-center gap-2 ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-brand-muted'}`}>
                        {trend === 'up' ? <ArrowUpIcon className="w-4 h-4"/> : trend === 'down' ? <ArrowDownIcon className="w-4 h-4"/> : null}
                        <span>{indicatorData.ma?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '...'}</span>
                    </div>
                </div>
                <div className="bg-brand-primary/50 p-3 rounded-lg">
                    <p className="text-sm text-brand-muted">RSI ({config.signal_rsiPeriod})</p>
                    <p className="text-lg font-bold font-mono text-white">{indicatorData.rsi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-brand-primary/50 p-3 rounded-lg">
                    <p className="text-sm text-brand-muted">Current ATR ({config.signal_atrPeriod})</p>
                    <p className="text-lg font-bold font-mono text-white">{indicatorData.atr?.toFixed(2) ?? '...'}</p>
                </div>
            </div>

            <div className={`p-4 rounded-lg border text-center text-lg font-bold mb-4 transition-colors ${signalColorClasses[signalStatus.type]}`}>
                {signalStatus.text}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
                <button 
                    onClick={() => handlePlaceOrder('Buy')}
                    disabled={signalStatus.type !== 'buy'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-green-500/20 text-green-400 font-semibold transition-colors hover:bg-green-500/40 hover:text-white disabled:bg-brand-border/20 disabled:text-brand-muted disabled:cursor-not-allowed"
                >
                    <CheckIcon className="w-5 h-5"/> Place Manual Buy
                </button>
                 <button 
                    onClick={() => handlePlaceOrder('Sell')}
                    disabled={signalStatus.type !== 'sell'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-red-500/20 text-red-400 font-semibold transition-colors hover:bg-red-500/40 hover:text-white disabled:bg-brand-border/20 disabled:text-brand-muted disabled:cursor-not-allowed"
                >
                    <XIcon className="w-5 h-5"/> Place Manual Sell
                </button>
            </div>
             <p className="text-xs text-brand-muted text-center italic mt-4">
                Buttons are enabled when signal conditions are met. Check console for simulated order details.
            </p>
        </div>
    );
};

export default ManualSignalTrader;