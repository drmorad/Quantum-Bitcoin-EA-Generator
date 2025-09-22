import React, { useState, useCallback, useEffect } from 'react';
import { marked } from 'marked';
// FIX: Use explicit file extension for imports
import type { EAConfig, SimulatedResults, CandlestickData, LiveAnalysisData, AIPersonality, MAType } from '../types.ts';
import { SparklesIcon } from './icons.tsx';
import { generateAnalysis, getPromptTemplate } from '../services/aiService.ts';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService.ts';

interface AIAnalysisProps {
  config: EAConfig;
  results: SimulatedResults;
}

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

const calculateLiveIndicators = (data: CandlestickData[], config: EAConfig): LiveAnalysisData => {
    const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const closePrices = data.map(d => d.close);
    
    let maValue = 0;
    let rsiValue: number | undefined = undefined;
    let atrValue: number | undefined = undefined;
    let macd: LiveAnalysisData['macd'] | undefined = undefined;
    let stochastic: LiveAnalysisData['stochastic'] | undefined = undefined;

    // MA calculation based on config
    const maPeriod = config.strategyType === 'grid' ? config.maPeriod : config.signal_maPeriod;
    const maType = config.strategyType === 'grid' ? config.maType : config.signal_maType;
    if (data.length >= maPeriod) {
        if (maType === 'SMA') {
            maValue = closePrices.slice(-maPeriod).reduce((a, b) => a + b, 0) / maPeriod;
        } else { // EMA
            const emaValues = calculateEMA(closePrices, maPeriod);
            maValue = emaValues.length > 0 ? emaValues[emaValues.length - 1] : 0;
        }
    }
    
    // For AI context, calculate a standard set of indicators regardless of strategy.
    // Use the config's periods if available ('signal' strategy), otherwise use defaults.
    const rsiPeriod = config.strategyType === 'signal' ? config.signal_rsiPeriod : 14;
    const atrPeriod = config.strategyType === 'signal' ? config.signal_atrPeriod : 14;
    const macdFastPeriod = 12;
    const macdSlowPeriod = 26;
    const macdSignalPeriod = 9;
    const stochPeriod = 14;
    const stochDPeriod = 3;

    // RSI Calculation
    if (data.length > rsiPeriod) {
        const changes = data.slice(-rsiPeriod - 1).map((c, i, arr) => i > 0 ? c.close - arr[i-1].close : 0).slice(1);
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

    // ATR Calculation
    if (data.length > atrPeriod) {
        const trueRanges = [];
        for (let i = data.length - atrPeriod; i < data.length; i++) {
            const tr = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i-1].close), Math.abs(data[i].low - data[i-1].close));
            trueRanges.push(tr);
        }
        atrValue = trueRanges.reduce((a, b) => a + b, 0) / atrPeriod;
    }

    // MACD Calculation
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

    // Stochastic Oscillator Calculation
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
            const dValue = dValuesSlice.reduce((a, b) => a + b, 0) / stochDPeriod;
            const kValue = kValues[kValues.length - 1];
            stochastic = { k: kValue, d: dValue };
        }
    }
    
    const trend = latestPrice > maValue ? 'Uptrend' : 'Downtrend';
    
    const periods = {
        ma: maPeriod,
        maType: maType,
        rsi: rsiPeriod,
        atr: atrPeriod,
    };
    
    return { latestPrice, maValue, trend, rsiValue, atrValue, macd, stochastic, periods };
}


const AIAnalysis: React.FC<AIAnalysisProps> = ({ config, results }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [personality, setPersonality] = useState<AIPersonality>('Quantitative Analyst');
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'prompt'>('analysis');

  useEffect(() => {
      // When config or personality changes, update the prompt template
      const getPeriods = (c: EAConfig) => ({
          ma: c.strategyType === 'grid' ? c.maPeriod : c.signal_maPeriod,
          maType: c.strategyType === 'grid' ? c.maType : c.signal_maType,
          rsi: c.strategyType === 'signal' ? c.signal_rsiPeriod : 14,
          atr: c.strategyType === 'signal' ? c.signal_atrPeriod : 14,
      });

      const dummyLiveData: LiveAnalysisData = { 
          latestPrice: 0, 
          maValue: 0, 
          trend: 'Uptrend', 
          periods: getPeriods(config)
      };
      
      const newPrompt = getPromptTemplate(config, results, dummyLiveData);
      setCustomPrompt(newPrompt);
      setAnalysis(''); // Clear old analysis
  }, [config, personality, results]);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setAnalysis('');
    setError('');
    setActiveTab('analysis');
    try {
      const marketData = await fetchBTCUSD_H1_Data();
      if (!marketData || marketData.length < 50) { // Ensure enough data for indicators
          throw new Error("Could not fetch sufficient market data for live analysis.");
      }
      const liveData = calculateLiveIndicators(marketData, config);
      const promptWithLiveData = getPromptTemplate(config, results, liveData);
      // If the user hasn't edited the prompt, use the latest live data. Otherwise, use their custom prompt.
      const finalPrompt = customPrompt.includes("Latest BTC Price: $0.00") ? promptWithLiveData : customPrompt;
      setCustomPrompt(finalPrompt);

      const response = await generateAnalysis(finalPrompt, personality);
      setAnalysis(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setAnalysis(`**Error:** ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, results, personality, customPrompt]);
  
  const formattedAnalysis = analysis ? marked.parse(analysis) : '';

  const personalities: AIPersonality[] = ['Quantitative Analyst', 'Risk Manager', 'Aggressive Scalper', 'Contrarian Investor'];

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-full">
      <h2 className="text-2xl font-semibold mb-2 flex items-center gap-3">
        <SparklesIcon className="w-6 h-6 text-brand-accent"/>
        AI Strategy Auditor
      </h2>
      
      <div className="mb-4">
        <label htmlFor="ai-personality" className="block text-sm font-medium text-brand-muted mb-1">Analyst Persona</label>
        <select
          id="ai-personality"
          value={personality}
          onChange={(e) => setPersonality(e.target.value as AIPersonality)}
          className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
        >
          {personalities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

       <div className="border-b border-brand-border mb-4">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'analysis' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted hover:text-white hover:border-gray-300'}`}
            >
              Analysis
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'prompt' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted hover:text-white hover:border-gray-300'}`}
            >
              Edit Prompt
            </button>
          </nav>
        </div>


      <div className="flex-grow flex flex-col min-h-0">
         {activeTab === 'analysis' && (
          isLoading ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto"></div>
                <p className="mt-2 text-brand-muted">Auditing strategy & live market...</p>
              </div>
            </div>
          ) : analysis ? (
            <div 
              className="prose prose-sm prose-invert max-w-none text-brand-muted space-y-2 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: formattedAnalysis as string }}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-brand-muted text-center">Select an analyst persona and click the button to get an AI-powered audit of your configuration.</p>
            </div>
          )
        )}
        {activeTab === 'prompt' && (
            <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full h-full flex-grow bg-brand-primary border border-brand-border rounded-md p-3 text-xs font-mono text-brand-muted focus:ring-2 focus:ring-brand-accent focus:border-brand-accent resize-none"
                placeholder="The prompt sent to the AI will appear here. You can edit it before running the analysis."
            />
        )}
      </div>
      <button
        onClick={handleAnalyze}
        disabled={isLoading}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-brand-accent hover:bg-blue-500 disabled:bg-brand-border disabled:text-brand-muted disabled:cursor-wait transition-colors text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary focus:ring-brand-accent"
      >
        {isLoading ? 'Auditing...' : 'Audit Configuration'}
      </button>
    </div>
  );
};

export default AIAnalysis;