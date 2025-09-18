import React, { useState, useCallback } from 'react';
import { marked } from 'marked';
import type { EAConfig, SimulatedResults } from '../types';
import { SparklesIcon } from './icons';
import { generateAnalysis } from '../services/aiService';

interface AIAnalysisProps {
  config: EAConfig;
  results: SimulatedResults;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ config, results }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setAnalysis('');
    try {
      const response = await generateAnalysis(config, results);
      setAnalysis(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [config, results]);
  
  const formattedAnalysis = analysis ? marked.parse(analysis) : '';

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-full">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
        <SparklesIcon className="w-6 h-6 text-brand-accent"/>
        AI Analysis
      </h2>
      <div className="flex-grow flex flex-col">
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto"></div>
              <p className="mt-2 text-brand-muted">Analyzing strategy...</p>
            </div>
          </div>
        ) : analysis ? (
          <div 
            className="prose prose-sm prose-invert max-w-none text-brand-muted space-y-2"
            dangerouslySetInnerHTML={{ __html: formattedAnalysis as string }}
          />
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-brand-muted text-center">Click the button to get AI-powered advice on your configuration.</p>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
      <button
        onClick={handleAnalyze}
        disabled={isLoading}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-brand-accent hover:bg-blue-500 disabled:bg-brand-border disabled:text-brand-muted disabled:cursor-wait transition-colors text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary focus:ring-brand-accent"
      >
        {isLoading ? 'Analyzing...' : 'Analyze Configuration'}
      </button>
    </div>
  );
};

export default AIAnalysis;