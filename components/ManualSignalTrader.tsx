import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { EAConfig, CandlestickData, TickerData } from '../types';
import { fetchBTCUSD_H1_Data, fetchBTCUSD_TickerData } from '../services/cryptoDataService';
import { SignalIcon, TrendingUpIcon, TrendingDownIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon, ShieldCheckIcon, TargetIcon, Volume2Icon } from './icons';
import InputSlider from './InputSlider';

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
    const [orderPlaced, setOrderPlaced] = useState<'buy' | 'sell' | null>(null);
    const prevSignalStatusRef = useRef<string | null>(null);

    // Local state for manual SL/TP adjustments
    const [manualAtrMultiplierSL, setManualAtrMultiplierSL] = useState(config.signal_atrMultiplierSL);
    const [manualAtrMultiplierTP, setManualAtrMultiplierTP] = useState(config.signal_atrMultiplierTP);

    // State for sound customization
    const [showSoundSettings, setShowSoundSettings] = useState(false);
    const [soundSettings, setSoundSettings] = useState({
        type: 'sine' as 'sine' | 'square' | 'sawtooth' | 'triangle',
        buyFrequency: 880,
        sellFrequency: 523,
        duration: 150,
    });

    const handleSoundSettingChange = <K extends keyof typeof soundSettings>(key: K, value: (typeof soundSettings)[K]) => {
        setSoundSettings(prev => ({ ...prev, [key]: value }));
    };
    
    // Reset local multipliers when the global config changes (e.g., new preset loaded)
    useEffect(() => {
        setManualAtrMultiplierSL(config.signal_atrMultiplierSL);
        setManualAtrMultiplierTP(config.signal_atrMultiplierTP);
    }, [config.signal_atrMultiplierSL, config.signal_atrMultiplierTP]);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [tickerData, ohlcData] = await Promise.all([
                fetchBTCUSD_TickerData(),
                fetchBTCUSD_H1_Data(),
            ]);
            setTicker(tickerData);
            
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

        if (currentStatus !== prevStatus && (currentStatus === 'buy' || currentStatus === 'sell')) {
            if (currentStatus === 'buy') {
                playSound(soundSettings.buyFrequency, soundSettings.duration, soundSettings.type);
            } else {
                playSound(soundSettings.sellFrequency, soundSettings.duration, soundSettings.type);
            }
        }
        prevSignalStatusRef.current = currentStatus;
    }, [signalStatus, soundSettings]);

    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const handlePlaceOrder = (type: 'Buy' | 'Sell') => {
        if (!ticker || !indicatorData.atr || orderPlaced) return;

        const { signal_lotSize } = config;
        const entryPrice = ticker.price;
        const slDistance = indicatorData.atr * manualAtrMultiplierSL;
        const tpDistance = indicatorData.atr * manualAtrMultiplierTP;

        const stopLoss = type === 'Buy' ? entryPrice - slDistance : entryPrice + slDistance;
        const takeProfit = type === 'Buy' ? entryPrice + tpDistance : entryPrice - tpDistance;

        console.log(
            `[MANUAL SIMULATED ORDER]\n` +
            `  - Type: ${type} Market\n` +
            `  - Lots: ${signal_lotSize.toFixed(2)}\n` +
            `  - Entry: ${formatCurrency(entryPrice)}\n` +
            `  - Stop Loss: ${formatCurrency(stopLoss)} (ATR Multiplier: ${manualAtrMultiplierSL.toFixed(1)}x)\n` +
            `  - Take Profit: ${formatCurrency(takeProfit)} (ATR Multiplier: ${manualAtrMultiplierTP.toFixed(1)}x)`
        );

        const orderTypeLower = type.toLowerCase() as 'buy' | 'sell';
        setOrderPlaced(orderTypeLower);

        setTimeout(() => {
            setOrderPlaced(null);
        }, 2000);
    };
    
    const trend = indicatorData.lastClose && indicatorData.ma ? (indicatorData.lastClose > indicatorData.ma ? 'up' : 'down') : 'neutral';

    const targetSL = useMemo(() => {
        if (!ticker || !indicatorData.atr) return { buy: null, sell: null };
        const slDistance = indicatorData.atr * manualAtrMultiplierSL;
        return {
            buy: ticker.price - slDistance,
            sell: ticker.price + slDistance,
        };
    }, [ticker, indicatorData.atr, manualAtrMultiplierSL]);

    const targetTP = useMemo(() => {
        if (!ticker || !indicatorData.atr) return { buy: null, sell: null };
        const tpDistance = indicatorData.atr * manualAtrMultiplierTP;
        return {
            buy: ticker.price + tpDistance,
            sell: ticker.price - tpDistance,
        };
    }, [ticker, indicatorData.atr, manualAtrMultiplierTP]);

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
    
    const signalColorClasses = {
        buy: 'bg-green-500/10 border-green-500/50 text-green-400',
        sell: 'bg-red-500/10 border-red-500/50 text-red-400',
        neutral: 'bg-brand-primary/50 border-brand-border text-brand-muted',
        loading: 'bg-brand-primary/50 border-brand-border text-brand-muted animate-pulse',
    };

    const AdjusterButton: React.FC<{ onClick: () => void, children: React.ReactNode, 'aria-label': string, size?: 'sm' | 'md' }> = ({ onClick, children, 'aria-label': ariaLabel, size = 'md' }) => {
        const sizeClasses = size === 'sm' ? 'w-6 h-6 text-base' : 'w-8 h-8 text-lg';
        return (
            <button
                onClick={onClick}
                aria-label={ariaLabel}
                className={`${sizeClasses} flex items-center justify-center bg-brand-primary border border-brand-border rounded-full text-brand-muted hover:bg-brand-accent hover:text-white transition-colors`}
            >
                {children}
            </button>
        );
    };

    const SoundTypeButton: React.FC<{ type: 'sine' | 'square' | 'sawtooth' | 'triangle' }> = ({ type }) => (
        <button
            onClick={() => handleSoundSettingChange('type', type)}
            className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${soundSettings.type === type ? 'bg-brand-accent text-white' : 'bg-brand-primary hover:bg-brand-border'}`}
        >
            {type}
        </button>
    );

    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 h-full flex flex-col">
            <h2 className="text-2xl font-semibold flex items-center gap-3 mb-4"><SignalIcon className="w-6 h-6 text-brand-accent"/>Manual Signal Trader</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-center">
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
                    <p className="text-sm text-brand-muted">ATR ({config.signal_atrPeriod})</p>
                    <p className="text-lg font-bold font-mono text-white">{indicatorData.atr?.toFixed(2) ?? '...'}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-brand-primary/50 p-3 rounded-lg flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-brand-muted flex items-center gap-1.5">
                            <ShieldCheckIcon className="w-4 h-4"/> Target SL
                        </p>
                        <div className="flex items-center gap-2">
                            <AdjusterButton size="sm" onClick={() => setManualAtrMultiplierSL(prev => Math.max(0.1, parseFloat((prev - 0.1).toFixed(1))))} aria-label="Decrease SL Multiplier">-</AdjusterButton>
                            <span className="font-mono text-sm font-bold text-white">{manualAtrMultiplierSL.toFixed(1)}x</span>
                            <AdjusterButton size="sm" onClick={() => setManualAtrMultiplierSL(prev => parseFloat((prev + 0.1).toFixed(1)))} aria-label="Increase SL Multiplier">+</AdjusterButton>
                        </div>
                    </div>
                    <p className="text-xl font-bold font-mono text-center text-white">
                        {trend === 'up' && targetSL.buy ? formatCurrency(targetSL.buy) :
                         trend === 'down' && targetSL.sell ? formatCurrency(targetSL.sell) :
                         '...'}
                    </p>
                </div>
                 <div className="bg-brand-primary/50 p-3 rounded-lg flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-brand-muted flex items-center gap-1.5">
                            <TargetIcon className="w-4 h-4"/> Target TP
                        </p>
                        <div className="flex items-center gap-2">
                             <AdjusterButton size="sm" onClick={() => setManualAtrMultiplierTP(prev => Math.max(0.1, parseFloat((prev - 0.1).toFixed(1))))} aria-label="Decrease TP Multiplier">-</AdjusterButton>
                             <span className="font-mono text-sm font-bold text-white">{manualAtrMultiplierTP.toFixed(1)}x</span>
                             <AdjusterButton size="sm" onClick={() => setManualAtrMultiplierTP(prev => parseFloat((prev + 0.1).toFixed(1)))} aria-label="Increase TP Multiplier">+</AdjusterButton>
                        </div>
                    </div>
                    <p className="text-xl font-bold font-mono text-center text-white">
                        {trend === 'up' && targetTP.buy ? formatCurrency(targetTP.buy) :
                         trend === 'down' && targetTP.sell ? formatCurrency(targetTP.sell) :
                         '...'}
                    </p>
                </div>
            </div>
            
            <div className="border-t border-brand-border/50 pt-4 mb-4">
                <button onClick={() => setShowSoundSettings(!showSoundSettings)} className="w-full flex justify-between items-center text-left text-brand-muted hover:text-white transition-colors">
                    <span className="flex items-center gap-2 font-semibold">
                        <Volume2Icon className="w-5 h-5"/> Sound Settings
                    </span>
                    <span className="text-sm">{showSoundSettings ? 'Hide' : 'Show'}</span>
                </button>
                {showSoundSettings && (
                    <div className="mt-4 p-4 bg-brand-primary/50 border border-brand-border rounded-lg space-y-4">
                        <div>
                            <label className="font-medium text-sm text-brand-muted mb-2 block">Sound Type</label>
                            <div className="grid grid-cols-4 gap-2">
                                <SoundTypeButton type="sine" />
                                <SoundTypeButton type="square" />
                                <SoundTypeButton type="sawtooth" />
                                <SoundTypeButton type="triangle" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputSlider label="Buy Frequency (Hz)" value={soundSettings.buyFrequency} onChange={v => handleSoundSettingChange('buyFrequency', v)} min={200} max={1200} step={10} tooltip="Pitch of the buy signal alert."/>
                            <InputSlider label="Sell Frequency (Hz)" value={soundSettings.sellFrequency} onChange={v => handleSoundSettingChange('sellFrequency', v)} min={200} max={1200} step={10} tooltip="Pitch of the sell signal alert."/>
                        </div>
                        <InputSlider label="Duration (ms)" value={soundSettings.duration} onChange={v => handleSoundSettingChange('duration', v)} min={50} max={500} step={10} tooltip="Length of the sound alert."/>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                             <button onClick={() => playSound(soundSettings.buyFrequency, soundSettings.duration, soundSettings.type)} className="w-full py-2 bg-green-500/20 text-green-400 font-semibold rounded-md hover:bg-green-500/40 hover:text-white transition-colors">Test Buy Alert</button>
                             <button onClick={() => playSound(soundSettings.sellFrequency, soundSettings.duration, soundSettings.type)} className="w-full py-2 bg-red-500/20 text-red-400 font-semibold rounded-md hover:bg-red-500/40 hover:text-white transition-colors">Test Sell Alert</button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`p-4 rounded-lg border text-center text-lg font-bold mb-4 transition-colors ${signalColorClasses[signalStatus.type]}`}>
                {signalStatus.text}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
                <button 
                    onClick={() => handlePlaceOrder('Buy')}
                    disabled={signalStatus.type !== 'buy' || orderPlaced !== null}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-green-500/20 text-green-400 font-semibold transition-colors hover:bg-green-500/40 hover:text-white disabled:bg-brand-border/20 disabled:text-brand-muted disabled:cursor-not-allowed"
                >
                    {orderPlaced === 'buy' ? (
                        <>
                            <CheckIcon className="w-5 h-5"/> Order Placed!
                        </>
                    ) : (
                        <>
                            <TrendingUpIcon className="w-5 h-5"/> Place Manual Buy
                        </>
                    )}
                </button>
                 <button 
                    onClick={() => handlePlaceOrder('Sell')}
                    disabled={signalStatus.type !== 'sell' || orderPlaced !== null}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-red-500/20 text-red-400 font-semibold transition-colors hover:bg-red-500/40 hover:text-white disabled:bg-brand-border/20 disabled:text-brand-muted disabled:cursor-not-allowed"
                >
                    {orderPlaced === 'sell' ? (
                         <>
                            <CheckIcon className="w-5 h-5"/> Order Placed!
                        </>
                    ) : (
                        <>
                           <TrendingDownIcon className="w-5 h-5"/> Place Manual Sell
                        </>
                    )}
                </button>
            </div>
             <p className="text-xs text-brand-muted text-center italic mt-4">
                Buttons are enabled when signal conditions are met. Check console for simulated order details.
            </p>
        </div>
    );
};

export default ManualSignalTrader;