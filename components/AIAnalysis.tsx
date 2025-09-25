

import React, { useState, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import type { EAConfig, SimulatedResults, LiveAnalysisData, AIPersonality } from '../types.ts';
import { SparklesIcon } from './icons.tsx';
import { generateAnalysis, getPromptTemplate } from '../services/aiService.ts';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService.ts';
import { calculateLiveIndicators } from '../services/technicalAnalysisService.ts';

interface AIAnalysisProps {
  config: EAConfig;
  results: SimulatedResults;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ config, results }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [personality, setPersonality] = useState<AIPersonality>('Quantitative Analyst');
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'prompt'>('analysis');

  useEffect(() => {
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
          periods: getPeriods(config),
          rsiDivergence: 'None',
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
      if (!marketData || marketData.length < 51) { 
          throw new Error("Could not fetch sufficient market data for live analysis.");
      }
      const liveData = calculateLiveIndicators(marketData, config);
      const promptWithLiveData = getPromptTemplate(config, results, liveData);
      
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
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <SparklesIcon className="w-5 h-5 text-brand-accent"/>
        AI Strategy Auditor
      </h2>
      
      <div className="mb-3">
        <label htmlFor="ai-personality" className="block text-sm font-medium text-brand-muted mb-1">Analyst Persona</label>
        <select
          id="ai-personality"
          value={personality}
          onChange={(e) => setPersonality(e.target.value as AIPersonality)}
          className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 text-brand-text focus:ring-2 focus:ring-brand-accent focus:border-brand-accent text-sm"
        >
          {personalities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

       <div className="border-b border-brand-border mb-3">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'analysis' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted hover:text-brand-text hover:border-gray-300'}`}
            >
              Analysis
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'prompt' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-muted hover:text-brand-text hover:border-gray-300'}`}
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
              className="prose prose-sm dark:prose-invert max-w-none text-brand-muted space-y-2 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: formattedAnalysis as string }}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-brand-muted text-center text-sm">Select an analyst persona and click the button to get an AI-powered audit of your configuration.</p>
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