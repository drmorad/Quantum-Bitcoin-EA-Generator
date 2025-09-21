import React, { useState, useEffect, useMemo } from 'react';
import type { EAConfig, OptimizationResult } from '../types';
import { XIcon, TuneIcon, SparklesIcon } from './icons';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parameterKey: keyof EAConfig;
  parameterTitle: string;
  currentValue: number;
  onRun: (parameter: keyof EAConfig, start: number, end: number, step: number) => void;
  onApply: (parameter: keyof EAConfig, value: number) => void;
  results: OptimizationResult[];
  isLoading: boolean;
}

const NumberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, error?: string }> = ({ label, id, error, ...props }) => (
    <div>
        <label htmlFor={id} className={`block text-sm font-medium mb-1 ${error ? 'text-red-400' : 'text-brand-muted'}`}>{label}</label>
        <input
            id={id}
            type="number"
            {...props}
            className={`w-full bg-brand-primary border rounded-md px-3 py-2 text-white focus:ring-2 focus:border-brand-accent disabled:opacity-70 ${error ? 'border-red-500/50 focus:ring-red-500' : 'border-brand-border focus:ring-brand-accent'}`}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
);


const OptimizationModal: React.FC<OptimizationModalProps> = ({ isOpen, onClose, parameterKey, parameterTitle, currentValue, onRun, onApply, results, isLoading }) => {
  const isInt = Number.isInteger(currentValue);
  const defaultStep = isInt ? 1 : 0.1;
  const defaultRange = isInt ? 10 : 1;

  const [form, setForm] = useState({
    start: (currentValue - defaultRange / 2).toFixed(isInt ? 0 : 2),
    end: (currentValue + defaultRange / 2).toFixed(isInt ? 0 : 2),
    step: defaultStep.toString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({
        start: (currentValue - defaultRange / 2).toFixed(isInt ? 0 : 2),
        end: (currentValue + defaultRange / 2).toFixed(isInt ? 0 : 2),
        step: defaultStep.toString(),
    });
  }, [parameterKey, currentValue, isInt, defaultRange, defaultStep]);

  useEffect(() => {
    const validateAndRun = () => {
        const startNum = parseFloat(form.start);
        const endNum = parseFloat(form.end);
        const stepNum = parseFloat(form.step);
        const newErrors: Record<string, string> = {};

        if (isNaN(startNum)) newErrors.start = "Invalid start value";
        if (isNaN(endNum)) newErrors.end = "Invalid end value";
        if (isNaN(stepNum)) newErrors.step = "Invalid step value";
        
        if (Object.keys(newErrors).length === 0) {
            if (startNum >= endNum) newErrors.start = "Start must be less than end";
            if (stepNum <= 0) newErrors.step = "Step must be positive";
            const steps = (endNum - startNum) / stepNum;
            if (steps > 50) newErrors.end = "Range too large (max 50 steps)";
            if (Math.round(steps) < 1) newErrors.step = "Step is too large for the range";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0) {
            onRun(parameterKey, startNum, endNum, stepNum);
        }
    };
    
    const handler = setTimeout(validateAndRun, 500); // 500ms debounce
    
    return () => clearTimeout(handler);

  }, [form.start, form.end, form.step, parameterKey, onRun]);


  const bestResult = useMemo(() => {
    if (results.length === 0) return null;
    return results.reduce((best, current) => parseFloat(current.results.sharpeRatio) > parseFloat(best.results.sharpeRatio) ? current : best);
  }, [results]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-brand-secondary border border-brand-border rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-brand-border">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <TuneIcon className="w-6 h-6 text-brand-accent"/>
            Optimize: <span className="text-brand-accent">{parameterTitle}</span>
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-brand-border transition-colors" aria-label="Close optimizer">
            <XIcon className="w-6 h-6 text-brand-muted" />
          </button>
        </header>
        
        <main className="flex flex-col md:flex-row flex-grow min-h-0">
          <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-brand-border space-y-4">
            <h3 className="text-lg font-semibold">Test Range</h3>
            <p className="text-xs text-brand-muted -mt-2">Results update automatically as you type.</p>
            <fieldset disabled={isLoading} className="space-y-4">
                <NumberInput label="Start Value" id="start" value={form.start} onChange={e => setForm({...form, start: e.target.value})} error={errors.start} />
                <NumberInput label="End Value" id="end" value={form.end} onChange={e => setForm({...form, end: e.target.value})} error={errors.end} />
                <NumberInput label="Step" id="step" value={form.step} onChange={e => setForm({...form, step: e.target.value})} error={errors.step} />
            </fieldset>
          </div>
          
          <div className="w-full md:w-2/3 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Results</h3>
                {bestResult && !isLoading && (
                    <button 
                        onClick={() => onApply(parameterKey, bestResult.value)}
                        className="px-3 py-1.5 bg-brand-gold/20 hover:bg-brand-gold/40 text-brand-gold text-xs font-semibold rounded-md transition-colors flex items-center gap-2"
                        title={`Apply best value (${bestResult.value.toFixed(isInt ? 0 : 2)}) based on Sharpe Ratio`}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Apply Best
                    </button>
                )}
            </div>
            {isLoading && results.length === 0 ? (
                <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div></div>
            ) : results.length === 0 && !isLoading ? (
                <div className="flex items-center justify-center h-full text-brand-muted">Results will be displayed here.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-full text-sm text-left">
                        <thead className="bg-brand-border/50">
                            <tr>
                                <th className="p-2 font-semibold">Value</th>
                                <th className="p-2 font-semibold text-right">Profit Factor</th>
                                <th className="p-2 font-semibold text-right">Drawdown</th>
                                <th className="p-2 font-semibold text-right">Win Rate</th>
                                <th className="p-2 font-semibold text-right">Sharpe Ratio</th>
                                <th className="p-2 font-semibold text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map(res => {
                                const isBest = res.value === bestResult?.value;
                                return (
                                    <tr key={res.value} className={`border-b border-brand-border/50 last:border-b-0 ${isBest ? 'bg-brand-gold/10' : ''}`}>
                                        <td className={`p-2 font-mono font-semibold ${isBest ? 'text-brand-gold' : ''}`}>{res.value.toFixed(isInt ? 0 : 2)}</td>
                                        <td className="p-2 text-right font-mono">{res.results.profitFactor}</td>
                                        <td className="p-2 text-right font-mono">{res.results.drawdown}</td>
                                        <td className="p-2 text-right font-mono">{res.results.winRate}</td>
                                        <td className={`p-2 text-right font-mono font-bold ${isBest ? 'text-brand-gold' : ''}`}>{res.results.sharpeRatio}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => onApply(parameterKey, res.value)} className="px-3 py-1 bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-accent text-xs font-semibold rounded-md transition-colors">Apply</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {isLoading && (
                                <tr>
                                    <td colSpan={6} className="p-2 text-center text-brand-muted">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-accent"></div>
                                            <span>Calculating...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default OptimizationModal;