import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { EAConfig, Presets, SimulatedResults, OptimizationResult, StrategyType, DriveData } from './types.ts';
import { generateMql5Code } from './services/mql5Generator.ts';
import { saveDataToDrive, loadDataFromDrive } from './services/googleDriveService.ts';
import ConfigPanel from './components/ConfigPanel.tsx';
import CodeDisplay from './components/CodeDisplay.tsx';
import TradingViewChartWidget from './components/TradingViewChartWidget.tsx';
import BacktestResults from './components/BacktestResults.tsx';
import ManualGridPlanner from './components/ManualGridPlanner.tsx';
import AIAnalysis from './components/AIAnalysis.tsx';
import PriceTicker from './components/PriceTicker.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import OptimizationModal from './components/OptimizationModal.tsx';
import ThemeToggle from './components/ThemeToggle.tsx';
import { usePresets } from './hooks/usePresets.ts';
import { useTheme } from './hooks/useTheme.ts';
import { useGoogleAuth } from './hooks/useGoogleAuth.ts';
import { QuantumIcon, BookOpenIcon, XIcon, GitHubIcon, TrendingUpIcon, LayoutDashboardIcon, SparklesIcon, InfoIcon, GoogleIcon } from './components/icons.tsx';
import ChangelogModal from './components/ChangelogModal.tsx';
import LiveTradingSignal from './components/LiveTradingSignal.tsx';
import MarketNewsFeed from './components/MarketNewsFeed.tsx';
import MyfxbookWidget from './components/MyfxbookWidget.tsx';
import FloatingCodeButton from './components/FloatingCodeButton.tsx';
import WelcomeScreen from './components/WelcomeScreen.tsx';

const APP_VERSION = "1.3.0";

type ActiveTab = 'chart' | 'dashboard' | 'analysis';

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
          <h2 className="text-2xl font-bold text-brand-text">Application Manual</h2>
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
            <h3 className="text-xl font-semibold text-brand-accent mb-2">2. New: Google Drive Sync</h3>
            <p>You can now save and load your configurations and custom presets directly to your Google Drive. Sign in with your Google account using the button in the header to enable this feature. Your data is stored in a private application folder that only this app can access.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">3. How to Use</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Select Strategy Type:</strong> On the welcome screen, enter your initial deposit and choose between "Grid Strategy" and "Signal Strategy".</li>
              <li><strong>Configure Parameters:</strong> Use the sliders to set up your chosen strategy's logic, risk management, and other parameters. Hover over the info icon next to each label for a detailed tooltip.</li>
              <li><strong>Optimize Parameters (AI-Powered):</strong> Click the "tune" icon next to key parameters to open the optimizer. Click "Suggest with AI" to get an intelligent test range, then run the optimization to find the best settings.</li>
              <li><strong>Analyze on Chart:</strong> The "Chart & Planner" tab visualizes BTC/USD price action. For grid strategies, it also includes the Manual Grid Planner.</li>
              <li><strong>Review Live Dashboard:</strong> Switch to the "Live Dashboard" tab to generate an AI-powered trading signal, view market news, and see community sentiment.</li>
              <li><strong>Audit with AI:</strong> In the "AI Audit & Backtest" tab, use the AI Strategy Auditor to get expert suggestions on your configuration from different AI personas.</li>
              <li><strong>Generate Code:</strong> Use the floating code button in the bottom-right corner. You can copy the code, download the .mq5 file, or view it in a full-screen modal. The button will be disabled if your configuration has errors.</li>
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
            <h3 className="text-xl font-semibold text-brand-accent mb-2">4. Parameter Explanations</h3>
            
            <h4 className="text-lg font-semibold text-brand-text mt-4 mb-2">Grid Strategy Parameters</h4>
            <ul className="space-y-3">
              <li><strong>Initial Risk (%):</strong> Dynamically calculates the first trade's lot size based on account equity, ensuring consistent risk exposure.</li>
              <li><strong>Grid Distance (Points):</strong> The minimum price distance between subsequent trades in the grid.</li>
              <li><strong>Grid Lot Multiplier:</strong> Each new trade in the grid will have its lot size multiplied by this value (Martingale style).</li>
              <li><strong>Take Profit (USD):</strong> The total profit in your account currency at which the entire grid of trades will be closed.</li>
            </ul>

            <h4 className="text-lg font-semibold text-brand-text mt-6 mb-2">Signal Strategy Parameters</h4>
            <ul className="space-y-3">
                <li><strong>Lot Size:</strong> The fixed trading volume for each trade.</li>
                <li><strong>MA Type & Period:</strong> The Moving Average used as a trend filter. Buys are enabled above the MA, sells below.</li>
                <li><strong>ATR Period & Multipliers:</strong> The Average True Range (ATR) indicator is used for volatility-based Stop Loss and Take Profit placement.</li>
                <li><strong>RSI Period & Levels:</strong> The Relative Strength Index (RSI) indicator is used to trigger entries on pullbacks within a trend.</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">5. Important Disclaimer</h3>
            <p>This tool is for educational purposes. Financial trading involves substantial risk. The AI analysis is generated by a large language model and should not be considered financial advice. Past performance is not indicative of future results. Always conduct thorough backtesting on a demo account before risking real capital. The creators of this application are not liable for any financial losses incurred.</p>
          </section>
        </main>
      </div>
    </div>
  );
};

const AboutModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-brand-secondary border border-brand-border rounded-lg max-w-2xl w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-brand-border">
          <h2 className="text-2xl font-bold text-brand-text flex items-center gap-3">
            <QuantumIcon className="w-6 h-6 text-brand-accent" />
            About MQL5 Quantum
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-brand-border transition-colors" aria-label="Close">
            <XIcon className="w-6 h-6 text-brand-muted" />
          </button>
        </header>
        <main className="p-6 text-brand-muted space-y-6 overflow-y-auto">
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">Application Purpose</h3>
            <p>This application is designed to help traders and developers generate MQL5 Expert Advisor (EA) code for two popular trading strategies tailored for BTC/USD on the H1 timeframe. Configure your parameters, analyze the potential outcomes, and get ready-to-use code for MetaTrader 5.</p>
          </section>
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">Core Strategies</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-brand-text">Grid Strategy</h4>
                <p className="text-sm">A trend-following system that opens an initial trade based on a Moving Average. If the market moves against the trade, it opens additional trades at set distances with a potentially larger lot size (Martingale style), aiming to close the entire grid in profit.</p>
              </div>
              <div>
                <h4 className="font-semibold text-brand-text">Signal Strategy</h4>
                <p className="text-sm">A classic technical strategy that uses a Moving Average to determine the trend. It waits for a pullback (indicated by the RSI) within that trend to trigger an entry. Stop Loss and Take Profit levels are dynamically calculated based on market volatility using the ATR indicator.</p>
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-2">Open Source</h3>
            <p className="mb-3">This project is open-source and available on GitHub. Contributions, feedback, and bug reports are welcome!</p>
            <a href="https://github.com/gemini-prototyping/mql5-ea-generator" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-primary border border-brand-border text-brand-text hover:bg-brand-border transition-colors font-semibold">
              <GitHubIcon className="w-5 h-5" />
              <span>View on GitHub</span>
            </a>
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
        } else if (end > today) { // Only check for future date if the range is valid
            newErrors.endDate = 'End date cannot be in the future.';
        }
    }
    
    let generalWarnings = '';
    if (config.strategyType === 'grid') {
        if ((config.gridMultiplier ?? 0) >= 1.8 && (config.maxGridTrades ?? 0) >= 6) {
             generalWarnings += 'Warning: A high Lot Multiplier with many Grid Trades is extremely risky and can lead to rapid losses.\\n';
        }
    } else if (config.strategyType === 'signal') {
        if ((config.signal_atrMultiplierTP ?? 0) < (config.signal_atrMultiplierSL ?? 0)) {
            generalWarnings += 'Warning: The ATR Multiplier for TP is less than for SL, resulting in a poor risk/reward ratio (< 1:1).\\n';
        }
    }
    
    if(generalWarnings) newErrors.general = generalWarnings.trim();

    return newErrors;
};

const calculateSimulatedResults = (config: EAConfig): SimulatedResults => {
    if (config.strategyType === 'signal') {
        const sl = config.signal_atrMultiplierSL ?? 2;
        const tp = config.signal_atrMultiplierTP ?? 3;
        const ma = config.signal_maPeriod ?? 50;
        const rsi = config.signal_rsiPeriod ?? 14;

        const riskRewardRatio = sl > 0 ? tp / sl : 3;
        const drawdown = Math.min(95, 8 + (sl / riskRewardRatio) * 15 + (ma / 50));
        const optimalRsi = 14;
        const winRate = Math.max(30, Math.min(75, 60 - Math.abs(ma - 70) / 5 - Math.abs(rsi - optimalRsi) / 2 + riskRewardRatio * 2));
        const profitFactor = Math.max(0.7, Math.min(4.0, 1.0 + (riskRewardRatio * (winRate / 100)) - ((1 - winRate / 100) * 0.9)));
        const sharpeRatio = drawdown > 0 ? (profitFactor * winRate / 500) / (drawdown / 100) : 3.0;
        
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
    const drawdown = Math.min(95, 5 + Math.pow(gridMultiplier, Math.max(1, maxGridTrades - 2)) + stopLoss + initialRiskPercent * 2);
    const optimalMa = 60;
    const winRate = Math.max(30, Math.min(85, 80 - Math.abs(maPeriod - optimalMa) / 3 - (maxGridTrades - 3) * 2));
    const profitFactor = Math.max(0.5, 1.0 + (riskRewardRatio / 5) + (Math.pow(gridMultiplier, 1.5) - 1.5) - (drawdown / 50));
    const sharpeRatio = drawdown > 0 ? (profitFactor * winRate / 100 * 50) / drawdown : 3.0;

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
  "Safe Harbor Grid (BTC)": {
    ...initialConfig,
    strategyType: 'grid',
    magicNumber: 11111,
    initialRiskPercent: 0.25,
    gridDistance: 4000,
    gridDistanceMultiplier: 1.1,
    gridMultiplier: 1.2,
    maxGridTrades: 8,
    maType: 'SMA',
    maPeriod: 100,
    takeProfit: 500,
    stopLoss: 5.0,
    useTrailingStop: false,
    commission: 3.0,
    slippage: 10
  },
  "Momentum Scalper Grid (BTC)": {
    ...initialConfig,
    strategyType: 'grid',
    magicNumber: 22222,
    initialRiskPercent: 1.2,
    gridDistance: 1500,
    gridDistanceMultiplier: 1.0,
    gridMultiplier: 1.6,
    maxGridTrades: 4,
    maType: 'EMA',
    maPeriod: 21,
    takeProfit: 150,
    stopLoss: 3.0,
    useTrailingStop: true,
    trailingStopStart: 400,
    trailingStopDistance: 300,
    commission: 7.0,
    slippage: 20
  },
  "Classic Trend Pullback (BTC)": {
    ...initialConfig,
    strategyType: 'signal',
    magicNumber: 33333,
    signal_lotSize: 0.02,
    signal_maType: 'EMA',
    signal_maPeriod: 50,
    signal_atrPeriod: 14,
    signal_atrMultiplierSL: 2.0,
    signal_atrMultiplierTP: 3.5,
    signal_rsiPeriod: 14,
    signal_rsiOversold: 35,
    signal_rsiOverbought: 65,
    commission: 5.0,
    slippage: 10
  },
  "Deep Value Hunter (Signal - BTC)": {
    ...initialConfig,
    strategyType: 'signal',
    magicNumber: 44444,
    signal_lotSize: 0.01,
    signal_maType: 'SMA',
    signal_maPeriod: 100,
    signal_atrPeriod: 14,
    signal_atrMultiplierSL: 2.5,
    signal_atrMultiplierTP: 5.0,
    signal_rsiPeriod: 14,
    signal_rsiOversold: 25,
    signal_rsiOverbought: 75,
    signal_useTrailingStop: true,
    signal_trailingStopStart: 2000,
    signal_trailingStopDistance: 1500,
    commission: 5.0,
    slippage: 10
  },
};

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const [config, setConfig] = useState<EAConfig>(initialConfig);
  const [errors, setErrors] = useState<Partial<Record<keyof EAConfig | 'general', string>>>(() => validateConfig(initialConfig));
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  const [optimizationState, setOptimizationState] = useState<{ isOpen: boolean; parameter: keyof EAConfig | null; title: string; }>({ isOpen: false, parameter: null, title: '' });
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  
  const { user, signIn, signOut, isGapiLoaded, gapiError } = useGoogleAuth();
  const [syncStatus, setSyncStatus] = useState('');
  const didAutoLoad = useRef(false);

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
  
  const handleStartConfiguration = (deposit: number, strategy: StrategyType) => {
    const newConfig = { ...initialConfig, initialDeposit: deposit, strategyType: strategy };
    handleConfigChange(newConfig);
    setIsInitialSetup(false);
  };
  
  const handleSaveToDrive = useCallback(async () => {
    setSyncStatus('Saving...');
    try {
      const dataToSave: DriveData = {
        config: config,
        presets: presetManager.presets,
      };
      await saveDataToDrive(dataToSave);
      setSyncStatus('Saved successfully!');
    } catch (error) {
      console.error(error);
      setSyncStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setTimeout(() => setSyncStatus(''), 3000);
  }, [config, presetManager.presets]);

  const handleLoadFromDrive = useCallback(async () => {
    setSyncStatus('Loading...');
    try {
      const loadedData = await loadDataFromDrive();
      if (loadedData) {
        handleConfigChange(loadedData.config || initialConfig);
        presetManager.setPresets(loadedData.presets || defaultPresets);
        setSyncStatus('Loaded successfully!');
      } else {
        setSyncStatus('No data found in Drive.');
      }
    } catch (error) {
      console.error(error);
      setSyncStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setTimeout(() => setSyncStatus(''), 3000);
  }, [presetManager]);

  // Effect for auto-loading data once after user signs in
  useEffect(() => {
    if (user && !didAutoLoad.current) {
        didAutoLoad.current = true;
        handleLoadFromDrive();
    }
  }, [user, handleLoadFromDrive]);


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
  
  useEffect(() => {
    const lastVersion = localStorage.getItem('appVersion');
    if (lastVersion !== APP_VERSION) {
      setIsChangelogOpen(true);
      localStorage.setItem('appVersion', APP_VERSION);
    }
  }, []);

  if (isInitialSetup) {
      return (
        <div className="min-h-screen bg-brand-primary flex flex-col items-center justify-center p-4">
            <WelcomeScreen onStart={handleStartConfiguration} />
        </div>
      )
  }
  
  const TabButton: React.FC<{tabName: ActiveTab; label: string; Icon: React.FC<{className?: string}>}> = ({ tabName, label, Icon }) => {
    const isActive = activeTab === tabName;
    return (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-2 border-b-2 font-semibold text-sm transition-colors ${
                isActive 
                ? 'border-brand-accent text-brand-accent' 
                : 'border-transparent text-brand-muted hover:text-brand-text hover:border-gray-500'
            }`}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    )
  }

  return (
    <div className="min-h-screen bg-brand-primary flex flex-col items-center p-2 sm:p-4">
      <div className="w-full max-w-screen-2xl mx-auto">
        <header className="flex w-full items-center justify-between p-2 mb-2">
            <div className="flex items-center gap-3">
                <QuantumIcon className="w-8 h-8 text-brand-accent flex-shrink-0"/>
                <div>
                    <h1 className="text-lg font-bold text-brand-text leading-tight">MQL5 Quantum</h1>
                    <p className="text-xs text-brand-muted leading-tight">Bitcoin EA Generator</p>
                </div>
                 <button onClick={() => setIsChangelogOpen(true)} className="ml-2 px-2 py-1 bg-brand-accent/20 text-brand-accent text-xs font-bold rounded-md hover:bg-brand-accent/40 transition-colors">
                    v{APP_VERSION}
                </button>
            </div>
            <div className="flex items-center gap-2">
                {isGapiLoaded && !gapiError && (
                    user ? (
                        <div className="flex items-center gap-2">
                            <img src={user.getBasicProfile().getImageUrl()} alt="User" className="w-7 h-7 rounded-full" />
                            <span className="hidden sm:inline text-sm text-brand-muted">
                                Welcome, <span className="font-semibold text-brand-text">{user.getBasicProfile().getGivenName()}</span>
                            </span>
                            <button onClick={signOut} className="text-xs font-semibold text-brand-muted hover:text-brand-text">(Sign Out)</button>
                        </div>
                    ) : (
                        <button onClick={signIn} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-brand-secondary border border-brand-border text-brand-text hover:bg-brand-border transition-colors text-sm font-semibold">
                            <GoogleIcon className="w-4 h-4" />
                            Sign in with Google
                        </button>
                    )
                )}
                {gapiError && <span className="text-xs text-red-400">{gapiError}</span>}

                <div className="hidden sm:flex items-center gap-2 border-l border-brand-border ml-2 pl-4">
                  <button onClick={() => setIsAboutModalOpen(true)} className="flex items-center gap-2 text-brand-muted hover:text-brand-text transition-colors text-sm font-medium">
                      <InfoIcon className="w-4 h-4" />
                      <span>About</span>
                  </button>
                  <button onClick={() => setIsManualOpen(true)} className="flex items-center gap-2 text-brand-muted hover:text-brand-text transition-colors text-sm font-medium">
                      <BookOpenIcon className="w-4 h-4" />
                      <span>Manual</span>
                  </button>
                </div>
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
                 <div className="sm:hidden">
                    <button onClick={() => setIsAboutModalOpen(true)} className="p-2 rounded-md bg-brand-secondary border border-brand-border text-brand-muted hover:text-brand-text transition-colors" aria-label="Open about modal">
                      <InfoIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsManualOpen(true)} className="p-2 rounded-md bg-brand-secondary border border-brand-border text-brand-muted hover:text-brand-text transition-colors" aria-label="Open application manual">
                      <BookOpenIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-2">
            {/* --- Left Column (Config) --- */}
            <div className="lg:col-span-2 flex flex-col">
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
                        isDriveAuthenticated={!!user}
                        onSaveToDrive={handleSaveToDrive}
                        onLoadFromDrive={handleLoadFromDrive}
                        syncStatus={syncStatus}
                    />
                </ErrorBoundary>
            </div>

            {/* --- Right Column (Tabs) --- */}
            <div className="lg:col-span-3 flex flex-col">
                {/* Tab Navigation */}
                <div className="border-b border-brand-border">
                    <nav className="-mb-px flex space-x-4 sm:space-x-6" aria-label="Tabs">
                       <TabButton tabName="chart" label="Chart & Planner" Icon={TrendingUpIcon} />
                       <TabButton tabName="dashboard" label="Live Dashboard" Icon={LayoutDashboardIcon} />
                       <TabButton tabName="analysis" label="AI Audit & Backtest" Icon={SparklesIcon} />
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-grow mt-4">
                    {activeTab === 'chart' && (
                        <div className="flex flex-col gap-4">
                            <ErrorBoundary componentName="Price Ticker"><PriceTicker /></ErrorBoundary>
                            <ErrorBoundary 
                                componentName="Live Chart"
                                fallbackMessage={
                                    <p className="text-brand-muted mt-2">
                                        The live chart failed to load. This can happen due to network issues or a temporary problem with the charting service. Please try refreshing the page.
                                    </p>
                                }
                            >
                                <TradingViewChartWidget theme={theme} />
                            </ErrorBoundary>
                            {config.strategyType === 'grid' && (<ErrorBoundary componentName="Manual Grid Planner"><ManualGridPlanner config={config} /></ErrorBoundary>)}
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="flex flex-col gap-4">
                             <ErrorBoundary componentName="Live Trading Signal"><LiveTradingSignal /></ErrorBoundary>
                             <ErrorBoundary componentName="Market News"><MarketNewsFeed /></ErrorBoundary>
                             <ErrorBoundary componentName="Community Sentiment"><MyfxbookWidget theme={theme} /></ErrorBoundary>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                             <div className="lg:col-span-1"><ErrorBoundary componentName="Backtest Results"><BacktestResults results={simulatedResults} /></ErrorBoundary></div>
                             <div className="lg:col-span-2"><ErrorBoundary componentName="AI Analysis"><AIAnalysis config={config} results={simulatedResults} /></ErrorBoundary></div>
                        </div>
                    )}
                </div>
            </div>
        </main>

        <footer className="mt-8 text-center text-brand-muted text-xs">
          <div className="max-w-3xl mx-auto p-3 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
            <h3 className="font-bold text-yellow-300">Disclaimer</h3>
            <p className="mt-1">This tool is for educational purposes. Trading involves significant risk. Always backtest thoroughly on a demo account before risking real funds. The creators of this tool are not liable for any financial losses.</p>
          </div>
        </footer>
      </div>
      
      <FloatingCodeButton 
        code={generatedCode}
        isEnabled={!hasHardErrors}
        onViewCode={() => setIsCodeModalOpen(true)}
      />

      {/* --- Modals --- */}
      {isManualOpen && <ManualModal onClose={() => setIsManualOpen(false)} />}
      {isAboutModalOpen && <AboutModal onClose={() => setIsAboutModalOpen(false)} />}
      {isChangelogOpen && <ChangelogModal onClose={() => setIsChangelogOpen(false)} currentVersion={APP_VERSION} />}
      {isCodeModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="w-full h-full">
                 <CodeDisplay code={generatedCode} isEnabled={!hasHardErrors} onClose={() => setIsCodeModalOpen(false)} />
            </div>
        </div>
      )}
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
          config={config}
          calculateSimulatedResults={calculateSimulatedResults}
        />
      }
    </div>
  );
};

export default App;