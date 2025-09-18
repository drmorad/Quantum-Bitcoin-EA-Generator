import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { EAConfig, Presets, SimulatedResults } from './types';
import { generateMql5Code } from './services/mql5Generator';
import ConfigPanel from './components/ConfigPanel';
import CodeDisplay from './components/CodeDisplay';
import InteractiveChart from './components/InteractiveChart';
import BacktestResults from './components/BacktestResults';
import ManualGridPlanner from './components/ManualGridPlanner';
import AIAnalysis from './components/AIAnalysis';
import PriceTicker from './components/PriceTicker';
import { QuantumIcon, BookOpenIcon, XIcon } from './components/icons';

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
            <p>Welcome to the MQL5 Quantum Bitcoin EA Generator. This tool is designed to help you create a custom Expert Advisor (EA) for MetaTrader 5, specifically tailored for a trend-following grid strategy on the BTCUSD H1 timeframe. By adjusting the parameters in the configuration panel, you can generate ready-to-use MQL5 source code.</p>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">2. How to Use</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Configure Parameters:</strong> Use the sliders in the "EA Configuration" panel to set up your strategy's core logic, grid behavior, and risk management. Hover over the info icon next to each label for a detailed tooltip.</li>
              <li><strong>Analyze on Chart:</strong> The "Interactive Chart" visualizes your MA and potential grid entry levels in real-time as you adjust parameters.</li>
              <li><strong>Review Metrics & AI Analysis:</strong> Check the "Simulated Backtest Results" for an illustrative performance overview. Click "Analyze Configuration" in the "AI Analysis" panel to get expert suggestions from Gemini on how to refine your strategy.</li>
              <li><strong>Manage Presets:</strong> You can save your favorite configurations as presets. The application comes with pre-loaded strategies. You can use them as a starting point, modify them, or create your own by entering a name and clicking "Save". To load a preset, select it from the dropdown menu.</li>
              <li><strong>Generate Code:</strong> The MQL5 code is generated in real-time. If your configuration is invalid, code generation will be paused.</li>
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
            <ul className="space-y-3">
              <li><strong>Magic Number:</strong> A unique ID that allows the EA to distinguish its trades from others.</li>
              <li><strong>Initial Lot Size:</strong> The trading volume for the very first trade in a grid sequence.</li>
              <li><strong>Max Spread (Points):</strong> The EA will not open trades if the current broker spread is wider than this value.</li>
              <li><strong>Grid Distance (Points):</strong> The minimum price distance between subsequent trades in the grid.</li>
              <li><strong>Grid Distance Multiplier:</strong> Dynamically increases grid spacing as more trades open. A value of 1.0 disables this feature.</li>
              <li><strong>Grid Lot Multiplier:</strong> Each new trade in the grid will have its lot size multiplied by this value.</li>
              <li><strong>Max Grid Trades:</strong> The maximum number of trades that can be open at once in a single grid.</li>
              <li><strong>Trend MA Type & Period:</strong> The Moving Average used to determine the overall market trend. The EA opens buys above the MA and sells below it.</li>
              <li><strong>Take Profit (USD):</strong> The total profit in your account currency at which the entire grid of trades will be closed.</li>
              <li><strong>Take Profit Multiplier:</strong> Dynamically increases the Take Profit target as more trades open. A value of 1.0 disables this feature.</li>
              <li><strong>Stop Loss (% of Equity):</strong> The total loss as a percentage of your account equity at which the entire grid will be closed as a safety measure. This allows risk to scale with your account size.</li>
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

// Central validation logic to be used by App and passed to components if needed.
const validateConfig = (configToValidate: EAConfig): Partial<Record<keyof EAConfig, string>> => {
    const newErrors: Partial<Record<keyof EAConfig, string>> = {};
    // Validation for TP vs SL (USD vs %) has been removed as they are not directly comparable.
    return newErrors;
};

const initialConfig: EAConfig = {
    magicNumber: 13579,
    initialLot: 0.01,
    maxSpread: 50,
    gridDistance: 2000,
    gridDistanceMultiplier: 1.0,
    gridMultiplier: 1.5,
    maxGridTrades: 3,
    maType: 'SMA',
    maPeriod: 50,
    takeProfit: 200,
    takeProfitMultiplier: 1.0,
    stopLoss: 2.0, // Now a percentage
};

const defaultPresets: Presets = {
  "Balanced Trend Rider": {
    magicNumber: 20202,
    initialLot: 0.01,
    maxSpread: 50,
    gridDistance: 2500,
    gridDistanceMultiplier: 1.2,
    gridMultiplier: 1.5,
    maxGridTrades: 3,
    maType: 'SMA',
    maPeriod: 50,
    takeProfit: 250,
    takeProfitMultiplier: 1.0,
    stopLoss: 2.5,
  },
  "Scalper's Delight": {
    magicNumber: 10101,
    initialLot: 0.02,
    maxSpread: 40,
    gridDistance: 1000,
    gridDistanceMultiplier: 1.0,
    gridMultiplier: 1.8,
    maxGridTrades: 5,
    maType: 'EMA',
    maPeriod: 20,
    takeProfit: 100,
    takeProfitMultiplier: 1.2,
    stopLoss: 3.0,
  },
  "Volatility Harvester": {
    magicNumber: 30303,
    initialLot: 0.01,
    maxSpread: 60,
    gridDistance: 1500,
    gridDistanceMultiplier: 1.8,
    gridMultiplier: 1.6,
    maxGridTrades: 4,
    maType: 'EMA',
    maPeriod: 34,
    takeProfit: 300,
    takeProfitMultiplier: 1.5,
    stopLoss: 4.0,
  },
  "Low & Slow Accumulator": {
    magicNumber: 40404,
    initialLot: 0.01,
    maxSpread: 70,
    gridDistance: 4000,
    gridDistanceMultiplier: 1.1,
    gridMultiplier: 1.2,
    maxGridTrades: 8,
    maType: 'SMA',
    maPeriod: 100,
    takeProfit: 500,
    takeProfitMultiplier: 1.0,
    stopLoss: 5.0,
  },
};

const App: React.FC = () => {
  const [config, setConfig] = useState<EAConfig>(initialConfig);

  const [isConfigValid, setIsConfigValid] = useState<boolean>(true);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  
  const [presets, setPresets] = useState<Presets>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);

  const simulatedResults = useMemo<SimulatedResults>(() => {
    const { takeProfit, stopLoss, gridMultiplier, maPeriod, maxGridTrades } = config;
    // Assume a hypothetical $10,000 account for simulation purposes
    const stopLossUSD = (stopLoss / 100) * 10000;
    const riskRewardRatio = stopLossUSD > 0 ? takeProfit / stopLossUSD : 5;
    const profitFactor = Math.max(1.1, Math.min(3.5, 1.0 + riskRewardRatio + (gridMultiplier - 1.2) * 2));
    const drawdown = Math.max(5, Math.min(50, (maxGridTrades / 10) * (gridMultiplier / 1.5) * 20 + (stopLossUSD / 1000)));
    const winRate = Math.max(30, Math.min(85, 80 - maPeriod / 5 - (maxGridTrades - 3) * 2));
    const sharpeRatio = Math.max(0.5, Math.min(3.0, profitFactor * (winRate / 100) * 1.5));

    return {
        profitFactor: profitFactor.toFixed(2),
        drawdown: `${drawdown.toFixed(2)}%`,
        winRate: `${winRate.toFixed(1)}%`,
        sharpeRatio: sharpeRatio.toFixed(2),
    };
  }, [config]);

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('mql5-ea-presets');
      // Check if presets exist and are not an empty object
      if (savedPresets && savedPresets !== '{}') {
        setPresets(JSON.parse(savedPresets));
      } else {
        // If no presets are saved, load and save the defaults
        setPresets(defaultPresets);
        localStorage.setItem('mql5-ea-presets', JSON.stringify(defaultPresets));
      }
    } catch (error) {
      console.error("Failed to load or parse presets from localStorage:", error);
      // Fallback to default presets if localStorage is corrupted or inaccessible
      setPresets(defaultPresets);
    }
  }, []);

  const updateCode = useCallback(() => {
    const code = generateMql5Code(config);
    setGeneratedCode(code);
  }, [config]);

  useEffect(() => {
    if (isConfigValid) {
        updateCode();
    }
  }, [config, isConfigValid, updateCode]);
  
  const handleConfigChange = (newConfig: EAConfig, isValid: boolean) => {
    setConfig(newConfig);
    setIsConfigValid(isValid);
    setSelectedPreset('');
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      alert("Please enter a name for the preset.");
      return;
    }
    const updatedPresets = { ...presets, [newPresetName]: config };
    setPresets(updatedPresets);
    setSelectedPreset(newPresetName);
    setNewPresetName('');
    try {
      localStorage.setItem('mql5-ea-presets', JSON.stringify(updatedPresets));
    } catch (error) {
      console.error("Failed to save presets to localStorage:", error);
    }
  };

  const handleLoadPreset = (presetName: string) => {
    if (presets[presetName]) {
      const loadedConfig = presets[presetName];
      const newConfig = { ...initialConfig, ...loadedConfig };
      const validationErrors = validateConfig(newConfig);
      const isValid = Object.keys(validationErrors).length === 0;
      
      setConfig(newConfig);
      setIsConfigValid(isValid);
      setSelectedPreset(presetName);
    } else {
      setSelectedPreset('');
    }
  };

  const handleDeletePreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) return;
    const { [selectedPreset]: _, ...remainingPresets } = presets;
    setPresets(remainingPresets);
    setSelectedPreset('');
    try {
      localStorage.setItem('mql5-ea-presets', JSON.stringify(remainingPresets));
    } catch (error) {
      console.error("Failed to delete preset from localStorage:", error);
    }
  };

  return (
    <div className="min-h-screen bg-brand-primary flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <PriceTicker />
        <header className="flex items-center justify-center space-x-4 mb-8 relative">
          <QuantumIcon className="w-12 h-12 text-brand-accent"/>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">MQL5 Quantum Bitcoin EA Generator</h1>
            <p className="text-brand-muted text-center sm:text-left">Configure and generate your custom BTCUSD trading expert.</p>
          </div>
          <button 
            onClick={() => setIsManualOpen(true)}
            className="absolute top-0 right-0 flex items-center gap-2 px-3 py-2 rounded-md bg-brand-secondary border border-brand-border text-brand-muted hover:text-white hover:border-brand-accent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent"
            aria-label="Open application manual"
          >
            <BookOpenIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Manual</span>
          </button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            <ConfigPanel
              config={config}
              onConfigChange={handleConfigChange}
              presets={presets}
              selectedPreset={selectedPreset}
              newPresetName={newPresetName}
              onNewPresetNameChange={setNewPresetName}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <BacktestResults results={simulatedResults} />
                <AIAnalysis config={config} results={simulatedResults} />
            </div>
            <ManualGridPlanner config={config} />
            <InteractiveChart config={config} />
          </div>
          <CodeDisplay code={generatedCode} isEnabled={isConfigValid} />
        </main>

        <footer className="mt-12 text-center text-brand-muted text-sm">
          <div className="max-w-3xl mx-auto p-4 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
            <h3 className="font-bold text-yellow-300">Disclaimer</h3>
            <p className="mt-1">
              This tool generates MQL5 code for educational and illustrative purposes. Trading financial markets involves significant risk. Always backtest any strategy thoroughly on a demo account before using it with real funds. The creators of this tool are not responsible for any financial losses.
            </p>
          </div>
        </footer>
      </div>
      {isManualOpen && <ManualModal onClose={() => setIsManualOpen(false)} />}
    </div>
  );
};

export default App;
