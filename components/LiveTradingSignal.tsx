
import React, { useState, useCallback } from 'react';
import { marked } from 'marked';
import type { TradingSignal } from '../types.ts';
import { SignalIcon } from './icons.tsx';
import { generateTradingSignal } from '../services/aiService.ts';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService.ts';
import { fetchFundamentalData } from '../services/fundamentalDataService.ts';
import { calculateLiveIndicators } from '../services/technicalAnalysisService.ts';

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
    
    const formattedRationale = marked.parse(rationale || 'No rationale provided.');

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
                        <p className="font-mono font-semibold text-brand-text">{(entry || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-brand-primary p-2 rounded-lg">
                        <p className="text-xs text-brand-muted">Take Profit</p>
                        <p className="font-mono font-semibold text-brand-buy">{(takeProfit || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-brand-primary p-2 rounded-lg">
                        <p className="text-xs text-brand-muted">Stop Loss</p>
                        <p className="font-mono font-semibold text-brand-sell">{(stopLoss || 0).toFixed(2)}</p>
                    </div>
                </div>
            )}
           
            <div>
                 <h4 className="font-semibold text-brand-accent mb-2">Rationale</h4>
                 <div
                    className="prose prose-sm dark:prose-invert max-w-none text-brand-muted space-y-2"
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
      if (!marketData || marketData.length < 51) {
          throw new Error("Could not fetch sufficient market data for analysis.");
      }
      // Use the new centralized service; no config is passed, so it uses default indicator settings.
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
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-full min-h-[400px]">
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
