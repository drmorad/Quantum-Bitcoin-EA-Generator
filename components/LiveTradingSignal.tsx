
import React, { useState, useCallback } from 'react';
import { marked } from 'marked';
// FIX: Use explicit file extension for imports
import type { TradingSignal, CandlestickData, LiveAnalysisData } from '../types.ts';
import { SignalIcon } from './icons.tsx';
import { generateTradingSignal } from '../services/aiService.ts';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService.ts';
import { fetchFundamentalData } from '../services/fundamentalDataService.ts';

const calculateEMA = (data: number[], period: number): number[] => {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const emaArray: number[] = [];
    let sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emaArray.push(sma);
    for (let i = period; i < data.length; i++) {
        const ema = (data[i] * k) + (emaArray[emaArray.length - 1] * (1 - k));
        emaArray.push(ema);
    }
    return emaArray;
};


const calculateLiveIndicators = (data: CandlestickData[]): LiveAnalysisData => {
    const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const closePrices = data.map(d => d.close);
    
    let maValue = 0;
    let rsiValue: number | undefined = undefined;
    let atrValue: number | undefined = undefined;
    let macd: LiveAnalysisData['macd'] | undefined = undefined;
    let stochastic: LiveAnalysisData['stochastic'] | undefined = undefined;

    const maPeriod = 50; // Use a standard 50 EMA for general analysis
    const rsiPeriod = 14;
    const atrPeriod = 14;

    if (data.length >= maPeriod) {
        const emaValues = calculateEMA(closePrices, maPeriod);
        maValue = emaValues[emaValues.length -1];
    }

    if (data.length > rsiPeriod) {
        const changes = data.slice(-rsiPeriod -1).map((c, i, arr) => i > 0 ? c.close - arr[i-1].close : 0).slice(1);
        const gains = changes.map(c => c > 0 ? c : 0);
        const losses = changes.map(c => c < 0 ? -c : 0);
        
        const avgGain = gains.reduce((a, b) => a + b, 0) / rsiPeriod;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / rsiPeriod;
        
        if (avgLoss > 0) {
            const rs = avgGain / avgLoss;
            rsiValue = 100 - (100 / (1 + rs));
        } else {
            rsiValue = 100;
        }
    }

    if (data.length > atrPeriod) {
        const trueRanges = [];
        for (let i = data.length - atrPeriod; i < data.length; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i-1].close;
            const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
            trueRanges.push(tr);
        }
        atrValue = trueRanges.reduce((a, b) => a + b, 0) / atrPeriod;
    }

    // MACD Calculation (12, 26, 9)
    const macdFastPeriod = 12;
    const macdSlowPeriod = 26;
    const macdSignalPeriod = 9;

    if (closePrices.length >= macdSlowPeriod + macdSignalPeriod) {
        const emaFast = calculateEMA(closePrices, macdFastPeriod);
        const emaSlow = calculateEMA(closePrices, macdSlowPeriod);
        const alignedEmaFast = emaFast.slice(emaFast.length - emaSlow.length);
        const macdLineData = emaSlow.map((slow, i) => alignedEmaFast[i] - slow);
        const signalLineData = calculateEMA(macdLineData, macdSignalPeriod);
        
        const macdLine = macdLineData[macdLineData.length - 1];
        const signalLine = signalLineData[signalLineData.length - 1];
        const histogram = macdLine - signalLine;

        macd = { macdLine, signalLine, histogram };
    }

    // Stochastic Oscillator Calculation (14, 3, 3)
    const stochPeriod = 14;
    const stochDPeriod = 3;

    if (data.length >= stochPeriod + stochDPeriod - 1) {
        const kValues: number[] = [];
        for (let i = stochPeriod - 1; i < data.length; i++) {
            const periodSlice = data.slice(i - stochPeriod + 1, i + 1);
            const lowestLow = Math.min(...periodSlice.map(d => d.low));
            const highestHigh = Math.max(...periodSlice.map(d => d.high));
            const currentClose = periodSlice[periodSlice.length - 1].close;
            
            const k = 100 * ((currentClose - lowestLow) / (highestHigh - lowestLow || 1));
            kValues.push(isNaN(k) ? 0 : k);
        }

        if (kValues.length >= stochDPeriod) {
            const dValuesSlice = kValues.slice(-stochDPeriod);
            const dValue = dValuesSlice.reduce((a, b) => a + b, 0) / stochDPeriod; // Simple Moving Average for %D
            const kValue = kValues[kValues.length - 1];
            stochastic = { k: kValue, d: dValue };
        }
    }
    
    const trend = latestPrice > maValue ? 'Uptrend' : 'Downtrend';
    
    return { latestPrice, maValue, trend, rsiValue, atrValue, macd, stochastic };
}

const SignalDisplay: React.FC<{ signal: TradingSignal }> = ({ signal }) => {
    const { signal: direction, confidence, entry, takeProfit, stopLoss, rationale } = signal;

    const signalColorClasses = {
        BUY: 'bg-brand-buy/20 text-brand-buy',
        SELL: 'bg-brand-sell/20 text-brand-sell',
        HOLD: 'bg-brand-muted/20 text-brand-muted',
    };

    const confidenceColorClasses = {
        High: 'text-brand-buy',
        Medium: 'text-brand-gold',
        Low: 'text-brand-muted',
    };
    
    const formattedRationale = marked.parse(rationale);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-brand-primary p-3 rounded-lg">
                    <p className="text-sm text-brand-muted">Signal</p>
                    <p className={`text-2xl font-bold px-3 py-1 rounded-md mt-1 inline-block ${signalColorClasses[direction]}`}>
                        {direction}
                    </p>
                </div>
                 <div className="bg-brand-primary p-3 rounded-lg">
                    <p className="text-sm text-brand-muted">Confidence</p>
                    <p className={`text-2xl font-bold mt-1 ${confidenceColorClasses[confidence]}`}>
                        {confidence}
                    </p>
                </div>
            </div>

            {direction !== 'HOLD' && (
                 <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-brand-primary p-2 rounded-lg">
                        <p className="text-xs text-brand-muted">Entry</p>
                        <p className="font-mono font-semibold text-white">{entry.toFixed(2)}</p>
                    </div>
                    <div className="bg-brand-primary p-2 rounded-lg">
                        <p className="text-xs text-brand-muted">Take Profit</p>
                        <p className="font-mono font-semibold text-brand-buy">{takeProfit.toFixed(2)}</p>
                    </div>
                    <div className="bg-brand-primary p-2 rounded-lg">
                        <p className="text-xs text-brand-muted">Stop Loss</p>
                        <p className="font-mono font-semibold text-brand-sell">{stopLoss.toFixed(2)}</p>
                    </div>
                </div>
            )}
           
            <div>
                 <h4 className="font-semibold text-brand-accent mb-2">Rationale</h4>
                 <div
                    className="prose prose-sm prose-invert max-w-none text-brand-muted space-y-2"
                    dangerouslySetInnerHTML={{ __html: formattedRationale as string }}
                 />
            </div>
        </div>
    );
};


const LiveTradingSignal: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [error, setError] = useState('');

  const handleGenerateSignal = useCallback(async () => {
    setIsLoading(true);
    setSignal(null);
    setError('');
    try {
      const marketData = await fetchBTCUSD_H1_Data();
      if (!marketData || marketData.length < 51) { // Need 50 for MA + 1 for prev close
          throw new Error("Could not fetch sufficient market data for analysis.");
      }
      const liveData = calculateLiveIndicators(marketData);
      const fundamentalData = fetchFundamentalData();

      const response = await generateTradingSignal(liveData, fundamentalData);
      setSignal(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-full min-h-[350px]">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
        <SignalIcon className="w-6 h-6 text-brand-accent"/>
        Live Trading Signal
      </h2>
      
      <div className="flex-grow flex flex-col min-h-0 overflow-y-auto pr-2">
        {isLoading ? (
             <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto"></div>
                <p className="mt-2 text-brand-muted text-sm">Analyzing live market data...</p>
              </div>
            </div>
        ) : signal ? (
            <SignalDisplay signal={signal} />
        ) : (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-brand-muted text-center text-sm">
                {error ? (
                    <span className="text-red-400">{error}</span>
                ) : (
                    "Click the button to generate a real-time trade signal based on technical and fundamental analysis."
                )}
                </p>
            </div>
        )}
      </div>

      <button
        onClick={handleGenerateSignal}
        disabled={isLoading}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-brand-accent hover:bg-blue-500 disabled:bg-brand-border disabled:text-brand-muted disabled:cursor-wait transition-colors text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary focus:ring-brand-accent"
      >
        {isLoading ? 'Generating...' : 'Generate Signal'}
      </button>
    </div>
  );
};

export default LiveTradingSignal;
