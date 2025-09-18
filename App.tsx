import React, { useState, useEffect, useCallback } from 'react';
import type { EAConfig, Presets } from './types';
import { generateMql5Code } from './services/mql5Generator';
import ConfigPanel from './components/ConfigPanel';
import CodeDisplay from './components/CodeDisplay';
import { QuantumIcon, ChartBarIcon, BookOpenIcon, XIcon } from './components/icons';

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
              <li><strong>Manage Presets:</strong> You can save your favorite configurations as presets. Enter a name and click "Save". To load a preset, select it from the dropdown menu. You can also delete presets you no longer need.</li>
              <li><strong>Generate Code:</strong> The MQL5 code is generated in real-time on the right-hand panel. If your configuration is invalid (e.g., Take Profit is higher than Stop Loss), code generation will be paused until the errors are corrected.</li>
              <li><strong>Deploy in MetaTrader 5:</strong>
                <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Click the "Copy" or "Download" button to get the generated code.</li>
                    <li>Open the MetaEditor in your MT5 terminal.</li>
                    <li>Create a new "Expert Advisor (template)" and paste the copied code into the file, replacing the default template.</li>
                    <li>Click "Compile". If there are no errors, the EA will appear in the Navigator window in MT5, ready for backtesting or live trading.</li>
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
              <li><strong>Grid Lot Multiplier:</strong> Each new trade in the grid will have its lot size multiplied by this value (e.g., 0.01 -> 0.015 -> 0.0225 with a 1.5x multiplier).</li>
              <li><strong>Max Grid Trades:</strong> The maximum number of trades that can be open at once in a single grid.</li>
              <li><strong>Trend MA Period:</strong> The period for the Simple Moving Average (SMA) used to determine the overall market trend. The EA opens buys above the MA and sells below it.</li>
              <li><strong>Take Profit (USD):</strong> The total profit in your account currency at which the entire grid of trades will be closed.</li>
              <li><strong>Stop Loss (USD):</strong> The total loss in your account currency at which the entire grid will be closed as a safety measure.</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">4. Important Disclaimer</h3>
            <p>This tool is for educational purposes. Financial trading involves substantial risk. Past performance is not indicative of future results. Always conduct thorough backtesting on a demo account before risking real capital. The creators of this application are not liable for any financial losses incurred.</p>
          </section>
        </main>
      </div>
    </div>
  );
};


const TechnicalSummaryWidget: React.FC = () => (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
        <ChartBarIcon className="w-6 h-6 text-brand-accent"/>
        Market Technical Summary
      </h2>
      <div className="overflow-x-auto flex justify-center">
        <div>
          <iframe
            frameBorder="0"
            scrolling="no"
            height="274"
            width="425"
            allowTransparency={true}
            src="https://ssltools.investing.com/technical_summary.php?pairs=1,2,3,4,5,6&curr-name-color=%230059B0&fields=5m,1h,1d&force_lang=1"
            title="Investing.com Technical Summary"
          ></iframe>
          <div className="w-[425px] mt-1">
            <span className="float-left">
              <span className="text-[11px] text-brand-muted no-underline">
                This Technical Analysis is powered by{' '}
                <a
                  href="https://www.investing.com/"
                  rel="nofollow"
                  target="_blank"
                  className="text-[11px] text-brand-accent font-bold"
                >
                  Investing.com
                </a>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
);

// Central validation logic to be used by App and passed to components if needed.
const validateConfig = (configToValidate: EAConfig): Partial<Record<keyof EAConfig, string>> => {
    const newErrors: Partial<Record<keyof EAConfig, string>> = {};
    if (configToValidate.takeProfit > configToValidate.stopLoss) {
      newErrors.takeProfit = 'Take Profit cannot exceed Stop Loss.';
      newErrors.stopLoss = 'Stop Loss must be greater than or equal to Take Profit.';
    }
    // You could add other cross-field validations here if necessary.
    return newErrors;
};


const App: React.FC = () => {
  const [config, setConfig] = useState<EAConfig>({
    magicNumber: 13579,
    initialLot: 0.01,
    maxSpread: 50,
    gridDistance: 2000,
    gridMultiplier: 1.5,
    maxGridTrades: 3,
    maPeriod: 50,
    takeProfit: 200,
    stopLoss: 500,
  });

  const [isConfigValid, setIsConfigValid] = useState<boolean>(true);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  
  const [presets, setPresets] = useState<Presets>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('mql5-ea-presets');
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }
    } catch (error) {
      console.error("Failed to load presets from localStorage:", error);
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
      const newConfig = presets[presetName];
      const validationErrors = validateConfig(newConfig);
      const isValid = Object.keys(validationErrors).length === 0;
      
      setConfig(newConfig);
      setIsConfigValid(isValid); // Ensure validity state is updated when loading a preset
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
            <TechnicalSummaryWidget />
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