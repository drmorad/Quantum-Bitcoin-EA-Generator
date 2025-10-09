
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { EAConfig, Presets, SimulatedResults, OptimizationResult } from '../types.ts';
import { generateMql5Code } from '../services/mql5Generator.ts';
import ConfigPanel from './components/ConfigPanel.tsx';
import CodeDisplay from '../components/CodeDisplay.tsx';
import InteractiveChart from '../components/InteractiveChart.tsx';
import BacktestResults from '../components/BacktestResults.tsx';
import ManualGridPlanner from '../components/ManualGridPlanner.tsx';
import AIAnalysis from '../components/AIAnalysis.tsx';
import PriceTicker from '../components/PriceTicker.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import OptimizationModal from './components/OptimizationModal.tsx';
import { usePresets } from '../hooks/usePresets.ts';
import { QuantumIcon, BookOpenIcon, XIcon } from '../components/icons.tsx';

interface ManualModalProps {
  onClose: () => void;
}

const ManualModal: React.FC<ManualModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-brand-secondary border border-brand-border rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <header className="flex justify-between items-center p-4 border-b border-brand-border flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Application Manual</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-brand-border transition-colors"
            aria-label="Close manual"
          >
            <XIcon className="w-6 h-6 text-brand-muted" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto text-brand-muted space-y-6">
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">1. Introduction</h3>
            <p>Welcome to the MQL5 Quantum Bitcoin EA Generator. This tool helps you create a custom Expert Advisor (EA) for MetaTrader 5. You can choose between two distinct strategy types: a trend-following **Grid Strategy** or a classic **Signal Strategy** based on technical indicators.</p>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">2. How to Use</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Select Strategy Type:</strong> In the configuration panel, choose between "Grid Strategy" and "Signal Strategy". The available options will change based on your selection.</li>
              <li><strong>Configure Parameters:</strong> Use the sliders to set up your chosen strategy's logic, risk management, and other parameters. Hover over the info icon next to each label for a detailed tooltip.</li>
              <li><strong>Optimize Parameters:</strong> Click the "tune" icon next to key parameters to open the optimizer. Test a range of values to see how they affect performance metrics in real-time and apply the best settings with one click.</li>
              <li><strong>Analyze on Chart:</strong> The "Interactive Chart" visualizes your MA and, for the grid strategy, potential grid entry levels.</li>
              <li><strong>Review Metrics & AI Analysis:</strong> Check the "Simulated Backtest Results" for an illustrative performance overview. Click "Analyze Configuration" to get expert suggestions from Gemini.</li>
              <li><strong>Manage Presets:</strong> Save your favorite configurations. The application comes with pre-loaded strategies for both types.</li>
              <li><strong>Generate Code:</strong> The MQL5 code is generated in real-time. If your configuration has critical errors, code generation will be paused. Warnings will be shown but won't block code generation.</li>
              <li><strong>Deploy in MetaTrader 5:</strong>
                <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Click "Copy" or "Download" to get the generated code.</li>
                    <li>Open MetaEditor in MT5, create a new "Expert Advisor (template)", and paste the code.</li>
                    <li>Click "Compile". The EA will then be ready for backtesting or trading.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">3. Parameter Explanations</h3>
            
            <h4 className="text-lg font-semibold text-white mt-4 mb-2">Grid Strategy Parameters</h4>
            <ul className="space-y-3">
              <li><strong>Grid Distance (Points):</strong> The minimum price distance between subsequent trades in the grid.</li>
              <li><strong>Grid Distance Multiplier:</strong> Dynamically increases grid spacing as more trades open.</li>
              <li><strong>Grid Lot Multiplier:</strong> Each new trade in the grid will have its lot size multiplied by this value.</li>
              <li><strong>Max Grid Trades:</strong> The maximum number of trades that can be open at once in a single grid.</li>
              <li><strong>Trend MA Type & Period:</strong> The Moving Average used to determine the overall market trend.</li>
              <li><strong>Take Profit (USD):</strong> The total profit in your account currency at which the entire grid of trades will be closed.</li>
              <li><strong>Stop Loss (% of Equity):</strong> The total loss as a percentage of your account equity at which the entire grid will be closed.</li>
              <li><strong>Trailing Stop:</strong> A dynamic stop loss that follows profitable trades to lock in gains.</li>
            </ul>

            <h4 className="text-lg font-semibold text-white mt-6 mb-2">Signal Strategy Parameters</h4>
            <ul className="space-y-3">
                <li><strong>Lot Size:</strong> The fixed trading volume for each trade.</li>
                <li><strong>MA Type & Period:</strong> The Moving Average used as a trend filter. Buys are enabled above the MA, sells below.</li>
                <li><strong>ATR Period:</strong> The period for the Average True Range (ATR) indicator, used for volatility-based risk management.</li>
                <li><strong>ATR Multiplier for SL/TP:</strong> These multipliers determine the Stop Loss and Take Profit distance based on the ATR value (e.g., SL = 2 * ATR).</li>
                <li><strong>RSI Period:</strong> The period for the Relative Strength Index (RSI) indicator.</li>
                <li><strong>RSI Oversold/Overbought:</strong> The RSI levels used to trigger entries. A buy signal occurs when RSI is below the 'Oversold' level in an uptrend, and a sell signal occurs when RSI is above the 'Overbought' level in a downtrend.</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">4. Important Disclaimer</h3>
            <p>This tool is for educational purposes. Financial trading involves substantial risk. The AI analysis is generated by a large language model and should not be considered financial advice. Past performance is not indicative of future results. Always conduct thorough backtesting on a demo account before risking real capital. The creators of this application are not liable for any financial losses incurred.</p>
          </section>
        </main>
      </div>
    </div>
  );
};

const validateConfig = (config: EAConfig): Partial<Record<keyof EAConfig | 'general', string>> => {
    const newErrors: Partial<Record<keyof EAConfig | 'general', string>> = {};

    if(config.strategyType === 'grid' && config.useTrailingStop && (config.trailingStopStart ?? 0) <= (config.trailingStopDistance ?? 0)) {
        newErrors.trailingStopStart = "Trailing Start must be greater than Trailing Distance.";
        newErrors.trailingStopDistance = "Trailing Distance must be less than Trailing Start.";
    }

    if(config.strategyType === 'signal' && config.signal_useTrailingStop && (config.signal_trailingStopStart ?? 0) <= (config.signal_trailingStopDistance ?? 0)) {
        newErrors.signal_trailingStopStart = "Trailing Start must be greater than Trailing Distance.";
        newErrors.signal_trailingStopDistance = "Trailing Distance must be less than Trailing Start.";
    }
    
    if (config.strategyType === 'signal' && (config.signal_rsiOverbought ?? 90) <= (config.signal_rsiOversold ?? 10)) {
        newErrors.signal_rsiOverbought = "Overbought level must be greater than Oversold level.";
        newErrors.signal_rsiOversold = "Oversold level must be less than Overbought level.";
    }

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime())) newErrors.startDate = 'Invalid start date format.';
    if (isNaN(end.getTime())) newErrors.endDate = 'Invalid end date format.';

    if (!newErrors.startDate && !newErrors.endDate) {
        if (start >= end) {
            newErrors.startDate = 'Start date must be before end date.';
            newErrors.endDate = 'End date must be after start date.';
        } else if (end > today) {
            newErrors.endDate = 'End date cannot be in the future.';
        }
    }
    
    let generalWarnings = '';
    if (config.strategyType === 'grid') {
        if ((config.gridMultiplier ?? 0) >= 1.8 && (config.maxGridTrades ?? 0) >= 6) {
             generalWarnings += 'Warning: A high Lot Multiplier with many Grid Trades is extremely risky and can lead to rapid losses.\n';
        }
    } else if (config.strategyType === 'signal') {
        if ((config.signal_atrMultiplierTP ?? 0) < (config.signal_atrMultiplierSL ?? 0)) {
            generalWarnings += 'Warning: The ATR Multiplier for TP is less than for SL, resulting in a poor risk/reward ratio (< 1:1).\n';
        }
    }
    
    if(generalWarnings) newErrors.general = generalWarnings.trim();

    return newErrors;
};

const calculateSimulatedResults = (config: EAConfig): SimulatedResults => {
    if (config.strategyType === 'signal') {
        const signal_atrMultiplierSL = config.signal_atrMultiplierSL ?? 2;
        const signal_atrMultiplierTP = config.signal_atrMultiplierTP ?? 3;
        const signal_maPeriod = config.signal_maPeriod ?? 50;
        const signal_rsiPeriod = config.signal_rsiPeriod ?? 14;

        const riskRewardRatio = signal_atrMultiplierSL > 0 ? signal_atrMultiplierTP / signal_atrMultiplierSL : 3;
        const profitFactor = Math.max(1.2, Math.min(3.0, riskRewardRatio * 1.1));
        const drawdown = Math.max(8, Math.min(30, (signal_atrMultiplierSL / 1.5) * 10));
        const winRate = Math.max(35, Math.min(70, 65 - signal_maPeriod / 10 - signal_rsiPeriod / 5));
        const sharpeRatio = Math.max(0.6, Math.min(2.5, profitFactor * (winRate / 100) * 1.2));
        return {
            profitFactor: profitFactor.toFixed(2),
            drawdown: `${drawdown.toFixed(2)}%`,
            winRate: `${winRate.toFixed(1)}%`,
            sharpeRatio: sharpeRatio.toFixed(2),
        };
    }
    
    const takeProfit = config.takeProfit ?? 200;
    const stopLoss = config.stopLoss ?? 2.0;
    const gridMultiplier = config.gridMultiplier ?? 1.5;
    const maPeriod = config.maPeriod ?? 50;
    const maxGridTrades = config.maxGridTrades ?? 3;
    const initialRiskPercent = config.initialRiskPercent ?? 1.0;
    const initialDeposit = config.initialDeposit ?? 10000;

    const stopLossUSD = (stopLoss / 100) * initialDeposit;
    const riskRewardRatio = stopLossUSD > 0 ? takeProfit / stopLossUSD : 5;
    const profitFactor = Math.max(1.1, Math.min(3.5, 1.0 + riskRewardRatio + (gridMultiplier - 1.2) * 2 + initialRiskPercent * 0.1));
    const drawdown = Math.max(5, Math.min(50, (maxGridTrades / 10) * (gridMultiplier / 1.5) * 20 + stopLoss + initialRiskPercent * 2));
    const winRate = Math.max(30, Math.min(85, 80 - maPeriod / 5 - (maxGridTrades - 3) * 2));
    const sharpeRatio = Math.max(0.5, Math.min(3.0, profitFactor * (winRate / 100) * 1.5));

    return {
        profitFactor: profitFactor.toFixed(2),
        drawdown: `${drawdown.toFixed(2)}%`,
        winRate: `${winRate.toFixed(1)}%`,
        sharpeRatio: sharpeRatio.toFixed(2),
    };
};

const today = new Date();
const endDate = today.toISOString().split('T')[0];

const initialConfig: EAConfig = {
    magicNumber: 13579,
    maxSpread: 50,
    startDate: '2023-01-01',
    endDate: endDate,
    initialDeposit: 10000,
    commission: 5.0,
    slippage: 10,
    strategyType: 'grid',
    initialRiskPercent: 1.0,
    gridDistance: 2000,
    gridDistanceMultiplier: 1.0,
    gridMultiplier: 1.5,
    maxGridTrades: 3,
    maType: 'SMA',
    maPeriod: 50,
    takeProfit: 200,
    takeProfitMultiplier: 1.0,
    stopLoss: 2.0,
    useTrailingStop: false,
    trailingStopStart: 500,
    trailingStopDistance: 500,
    signal_lotSize: 0.01,
    signal_maType: 'EMA',
    signal_maPeriod: 50,
    signal_atrPeriod: 14,
    signal_atrMultiplierSL: 2,
    signal_atrMultiplierTP: 3,
    signal_rsiPeriod: 14,
    signal_rsiOversold: 30,
    signal_rsiOverbought: 70,
    signal_useTrailingStop: false,
    signal_trailingStopStart: 500,
    signal_trailingStopDistance: 500,
};

const defaultPresets: Presets = {
  "Balanced Trend Rider (Grid)": { ...initialConfig, strategyType: 'grid', magicNumber: 20202, initialRiskPercent: 0.5, gridDistance: 2500, gridDistanceMultiplier: 1.2, gridMultiplier: 1.5, maxGridTrades: 3, maType: 'SMA', maPeriod: 50, takeProfit: 250, stopLoss: 2.5, useTrailingStop: true, trailingStopStart: 1000, trailingStopDistance: 800 },
  "MA/RSI Pullback (Signal)": { ...initialConfig, strategyType: 'signal', magicNumber: 60606, signal_lotSize: 0.02, signal_maType: 'EMA', signal_maPeriod: 50, signal_atrPeriod: 14, signal_atrMultiplierSL: 1.5, signal_atrMultiplierTP: 2.5, signal_rsiPeriod: 14, signal_rsiOversold: 35, signal_rsiOverbought: 65 },
  "Scalper's Delight (Grid)": { ...initialConfig, strategyType: 'grid', magicNumber: 10101, initialRiskPercent: 1.5, gridDistance: 1000, gridDistanceMultiplier: 1.0, gridMultiplier: 1.8, maxGridTrades: 5, maType: 'EMA', maPeriod: 20, takeProfit: 100, stopLoss: 3.0, useTrailingStop: true, trailingStopStart: 400, trailingStopDistance: 300 },
  "Low & Slow Accumulator (Grid)": { ...initialConfig, strategyType: 'grid', magicNumber: 40404, initialRiskPercent: 0.25, gridDistance: 4000, gridDistanceMultiplier: 1.1, gridMultiplier: 1.2, maxGridTrades: 8, maType: 'SMA', maPeriod: 100, takeProfit: 500, stopLoss: 5.0, useTrailingStop: false },
  "RSI Divergence Hunter (Signal)": { ...initialConfig, strategyType: 'signal', magicNumber: 70707, signal_lotSize: 0.01, signal_maType: 'SMA', signal_maPeriod: 100, signal_atrPeriod: 14, signal_atrMultiplierSL: 2.0, signal_atrMultiplierTP: 4.0, signal_rsiPeriod: 14, signal_rsiOversold: 25, signal_rsiOverbought: 75 },
  "High R:R Breakout (Signal)": { ...initialConfig, strategyType: 'signal', magicNumber: 90909, signal_lotSize: 0.02, signal_maType: 'EMA', signal_maPeriod: 50, signal_atrPeriod: 20, signal_atrMultiplierSL: 2.5, signal_atrMultiplierTP: 5.0, signal_rsiPeriod: 14, signal_rsiOversold: 40, signal_rsiOverbought: 60 },
};

const App: React.FC = () => {
  const [config, setConfig] = useState<EAConfig>(initialConfig);
  const [errors, setErrors] = useState<Partial<Record<keyof EAConfig | 'general', string>>>(() => validateConfig(initialConfig));
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [optimizationState, setOptimizationState] = useState<{ isOpen: boolean; parameter: keyof EAConfig | null; title: string; }>({ isOpen: false, parameter: null, title: '' });
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const hasHardErrors = useMemo(() => Object.values(errors).some(e => {
    if (typeof e === 'string') {
        return e && !e.startsWith('Warning:');
    }
    return false;
  }), [errors]);
  
  const presetManager = usePresets(defaultPresets);
  const simulatedResults = useMemo<SimulatedResults>(() => calculateSimulatedResults(config), [config]);

  const updateCode = useCallback(() => {
    if (hasHardErrors) {
      setGeneratedCode('');
    } else {
      setGeneratedCode(generateMql5Code(config));
    }
  }, [config, hasHardErrors]);

  useEffect(() => {
    updateCode();
  }, [config, updateCode]);
  
  const handleConfigChange = (newConfig: EAConfig) => {
    setErrors(validateConfig(newConfig));
    setConfig(newConfig);
    presetManager.setSelectedPreset('');
  };

  const handleSavePreset = () => presetManager.savePreset(presetManager.newPresetName, config);

  const handleLoadPreset = (presetName: string) => {
    const loadedConfig = presetManager.loadPreset(presetName);
    if (loadedConfig) {
      const cleanedConfig: Partial<EAConfig> = {};
      for (const key in loadedConfig) {
        if (Object.prototype.hasOwnProperty.call(loadedConfig, key)) {
          const value = loadedConfig[key as keyof EAConfig];
          if (value !== null && value !== undefined) {
            // @ts-ignore
            cleanedConfig[key as keyof EAConfig] = value;
          }
        }
      }

      const newConfig = { ...initialConfig, ...cleanedConfig };
      setErrors(validateConfig(newConfig));
      setConfig(newConfig);
    }
  };

  const handleDeletePreset = () => presetManager.deletePreset();

  const handleOpenOptimizer = (parameter: keyof EAConfig, title: string) => {
    setOptimizationResults([]);
    setOptimizationState({ isOpen: true, parameter, title });
  };

  const handleCloseOptimizer = () => setOptimizationState({ isOpen: false, parameter: null, title: '' });

  const handleRunOptimization = (parameter: keyof EAConfig, start: number, end: number, step: number) => {
    setIsOptimizing(true);
    setOptimizationResults([]);

    setTimeout(() => {
        const results: OptimizationResult[] = [];
        const runLoop = (val: number) => {
            if (val > end + (step / 2)) {
                setIsOptimizing(false);
                return;
            }

            const tempConfig = { ...config, [parameter]: val };
            const simResults = calculateSimulatedResults(tempConfig);
            results.push({ value: val, results: simResults });
            setOptimizationResults([...results]);

            setTimeout(() => runLoop(val + step), 25);
        };
        runLoop(start);
    }, 50);
  };
  
  const handleApplyOptimization = (parameter: keyof EAConfig, value: number) => {
    const newConfig = { ...config, [parameter]: value };
    handleConfigChange(newConfig);
    handleCloseOptimizer();
  };

  return (
    <div className="min-h-screen bg-brand-primary flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <ErrorBoundary componentName="Price Ticker"><PriceTicker /></ErrorBoundary>
        <header className="flex items-center justify-center space-x-4 mb-8 relative">
          <QuantumIcon className="w-12 h-12 text-brand-accent"/>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">MQL5 Quantum Bitcoin EA Generator</h1>
            <p className="text-brand-muted text-center sm:text-left">Configure and generate your custom BTC/USD trading expert.</p>
          </div>
          <button onClick={() => setIsManualOpen(true)} className="absolute top-0 right-0 flex items-center gap-2 px-3 py-2 rounded-md bg-brand-secondary border border-brand-border text-brand-muted hover:text-white hover:border-brand-accent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent" aria-label="Open application manual">
            <BookOpenIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Manual</span>
          </button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            <ErrorBoundary componentName="Configuration Panel">
              <ConfigPanel
                config={config}
                onConfigChange={handleConfigChange}
                errors={errors}
                presets={presetManager.presets}
                selectedPreset={presetManager.selectedPreset}
                newPresetName={presetManager.newPresetName}
                onNewPresetNameChange={presetManager.setNewPresetName}
                onSavePreset={handleSavePreset}
                onLoadPreset={handleLoadPreset}
                onDeletePreset={handleDeletePreset}
                onOpenOptimizer={handleOpenOptimizer}
              />
            </ErrorBoundary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ErrorBoundary componentName="Backtest Results"><BacktestResults results={simulatedResults} /></ErrorBoundary>
              <ErrorBoundary componentName="AI Analysis"><AIAnalysis config={config} results={simulatedResults} /></ErrorBoundary>
            </div>
            {config.strategyType === 'grid' && (<ErrorBoundary componentName="Manual Grid Planner"><ManualGridPlanner config={config} /></ErrorBoundary>)}
            <ErrorBoundary componentName="Interactive Chart"><InteractiveChart config={config} /></ErrorBoundary>
          </div>
          <ErrorBoundary componentName="Code Display"><CodeDisplay code={generatedCode} isEnabled={!hasHardErrors} /></ErrorBoundary>
        </main>

        <footer className="mt-12 text-center text-brand-muted text-sm">
          <div className="max-w-3xl mx-auto p-4 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
            <h3 className="font-bold text-yellow-300">Disclaimer</h3>
            <p className="mt-1">This tool generates MQL5 code for educational and illustrative purposes. Trading financial markets involves significant risk. Always backtest any strategy thoroughly on a demo account before using it with real funds. The creators of this tool are not responsible for any financial losses.</p>
          </div>
        </footer>
      </div>
      {isManualOpen && <ManualModal onClose={() => setIsManualOpen(false)} />}
      {optimizationState.isOpen && optimizationState.parameter &&
        <OptimizationModal
          isOpen={optimizationState.isOpen}
          onClose={handleCloseOptimizer}
          parameterKey={optimizationState.parameter}
          parameterTitle={optimizationState.title}
          currentValue={(config[optimizationState.parameter] as number) ?? 0}
          onRun={handleRunOptimization}
          onApply={handleApplyOptimization}
          results={optimizationResults}
          isLoading={isOptimizing}
        />
      }
    </div>
  );
};

export default App;
