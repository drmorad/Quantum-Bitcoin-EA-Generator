import React from 'react';
import type { EAConfig, Presets } from '../types';
import InputSlider from './InputSlider';
import { SettingsIcon, TrashIcon, GridIcon, SignalIcon, ShieldCheckIcon, AlertTriangleIcon } from './icons';

interface ConfigPanelProps {
  config: EAConfig;
  onConfigChange: (config: EAConfig) => void;
  errors: Partial<Record<keyof EAConfig | 'general', string>>;
  presets: Presets;
  selectedPreset: string;
  newPresetName: string;
  onNewPresetNameChange: (name: string) => void;
  onSavePreset: () => void;
  onLoadPreset: (name: string) => void;
  onDeletePreset: () => void;
}

const PARAM_RANGES: Omit<Record<keyof EAConfig, { min: number; max: number }>, 'maType' | 'useTrailingStop' | 'strategyType' | 'signal_maType'> = {
    magicNumber: { min: 10000, max: 99999 },
    initialLot: { min: 0.01, max: 1.0 },
    maxSpread: { min: 1, max: 100 },
    gridDistance: { min: 100, max: 5000 },
    gridDistanceMultiplier: { min: 1.0, max: 2.5 },
    gridMultiplier: { min: 1.1, max: 2.5 },
    maxGridTrades: { min: 2, max: 15 },
    maPeriod: { min: 10, max: 200 },
    takeProfit: { min: 10, max: 1000 },
    takeProfitMultiplier: { min: 1.0, max: 2.0 },
    stopLoss: { min: 0.5, max: 10.0 },
    trailingStopStart: { min: 50, max: 5000 },
    trailingStopDistance: { min: 50, max: 5000 },
    signal_lotSize: { min: 0.01, max: 1.0 },
    signal_maPeriod: { min: 10, max: 200 },
    signal_atrPeriod: { min: 5, max: 50 },
    signal_atrMultiplierSL: { min: 0.5, max: 5.0 },
    signal_atrMultiplierTP: { min: 0.5, max: 10.0 },
    signal_rsiPeriod: { min: 5, max: 50 },
    signal_rsiOversold: { min: 10, max: 40 },
    signal_rsiOverbought: { min: 60, max: 90 },
};


const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onConfigChange,
  errors,
  presets,
  selectedPreset,
  newPresetName,
  onNewPresetNameChange,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {

  const handleChange = (key: keyof EAConfig, value: number | 'SMA' | 'EMA' | boolean | 'grid' | 'signal') => {
    const newConfig = { ...config, [key]: value };
    onConfigChange(newConfig);
  };

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 h-fit">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-brand-accent"/>
        EA Configuration
      </h2>

      {/* General Errors/Warnings Display */}
      {errors.general && (
        <div className="mb-6 p-4 border border-yellow-500/30 bg-yellow-500/10 rounded-lg text-yellow-300 text-sm space-y-2">
          {errors.general.split('\n').map((line, index) => (
            <div key={index} className="flex items-start gap-2">
              <AlertTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{line.replace('Warning: ', '')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Presets Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-brand-border">
        <div className="flex flex-col">
          <label htmlFor="preset-select" className="block text-sm font-medium text-brand-muted mb-1">Load Preset</label>
          <div className="flex gap-2">
            <select
              id="preset-select"
              value={selectedPreset}
              onChange={(e) => onLoadPreset(e.target.value)}
              className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            >
              <option value="">-- Custom Configuration --</option>
              {Object.keys(presets).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <button 
                onClick={onDeletePreset}
                disabled={!selectedPreset || !presets[selectedPreset]}
                className="p-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Delete selected preset"
            >
                <TrashIcon className="w-5 h-5"/>
            </button>
          </div>
        </div>
        <div className="flex flex-col">
            <label htmlFor="preset-name" className="block text-sm font-medium text-brand-muted mb-1">Save Current as Preset</label>
            <div className="flex items-end gap-2">
                <input
                    id="preset-name"
                    type="text"
                    value={newPresetName}
                    onChange={(e) => onNewPresetNameChange(e.target.value)}
                    placeholder="e.g., My Aggressive Setup"
                    className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
                <button 
                    onClick={onSavePreset}
                    disabled={!newPresetName.trim()}
                    className="px-4 py-2.5 bg-brand-accent hover:bg-blue-500 text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Save
                </button>
            </div>
        </div>
      </div>

      {/* Strategy Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-brand-muted mb-2">Strategy Type</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-brand-primary rounded-lg border border-brand-border">
            <button onClick={() => handleChange('strategyType', 'grid')} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${config.strategyType === 'grid' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:bg-brand-secondary'}`}><GridIcon className="w-5 h-5"/> Grid Strategy</button>
            <button onClick={() => handleChange('strategyType', 'signal')} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${config.strategyType === 'signal' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:bg-brand-secondary'}`}><SignalIcon className="w-5 h-5"/> Signal Strategy</button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* General Settings */}
        <h3 className="text-lg font-semibold text-brand-accent border-b border-brand-border pb-2">General Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputSlider label="Magic Number" value={config.magicNumber} onChange={(v) => handleChange('magicNumber', v)} min={PARAM_RANGES.magicNumber.min} max={PARAM_RANGES.magicNumber.max} step={1} tooltip="A unique ID for the EA to manage its own trades." error={errors.magicNumber} />
            <InputSlider label="Max Spread (Points)" value={config.maxSpread} onChange={(v) => handleChange('maxSpread', v)} min={PARAM_RANGES.maxSpread.min} max={PARAM_RANGES.maxSpread.max} step={1} tooltip="The EA will not trade if the current spread is wider than this value." error={errors.maxSpread} />
        </div>
        
        {/* Grid Strategy Settings */}
        {config.strategyType === 'grid' && (
            <>
                <h3 className="text-lg font-semibold text-brand-accent border-b border-brand-border pb-2 flex items-center gap-2"><GridIcon className="w-5 h-5"/> Grid Behavior</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputSlider label="Initial Lot Size" value={config.initialLot} onChange={(v) => handleChange('initialLot', v)} min={PARAM_RANGES.initialLot.min} max={PARAM_RANGES.initialLot.max} step={0.01} tooltip="The base trading volume for the first trade in a grid." error={errors.initialLot} />
                    <InputSlider label="Trend MA Period" value={config.maPeriod} onChange={(v) => handleChange('maPeriod', v)} min={PARAM_RANGES.maPeriod.min} max={PARAM_RANGES.maPeriod.max} step={1} tooltip="The period for the Moving Average used to determine the trend." error={errors.maPeriod} />
                    <div className="flex flex-col">
                        <label className="font-medium text-sm text-brand-muted mb-2">Trend MA Type</label>
                        <div className="flex gap-2">
                            <button onClick={() => handleChange('maType', 'SMA')} className={`px-4 py-2 rounded-md w-full transition-colors ${config.maType === 'SMA' ? 'bg-brand-accent text-white' : 'bg-brand-primary hover:bg-brand-border'}`}>SMA</button>
                            <button onClick={() => handleChange('maType', 'EMA')} className={`px-4 py-2 rounded-md w-full transition-colors ${config.maType === 'EMA' ? 'bg-brand-accent text-white' : 'bg-brand-primary hover:bg-brand-border'}`}>EMA</button>
                        </div>
                    </div>
                    <InputSlider label="Grid Distance (Points)" value={config.gridDistance} onChange={(v) => handleChange('gridDistance', v)} min={PARAM_RANGES.gridDistance.min} max={PARAM_RANGES.gridDistance.max} step={50} tooltip="The minimum distance between trades in the grid." error={errors.gridDistance} />
                    <InputSlider label="Grid Distance Multiplier" value={config.gridDistanceMultiplier} onChange={(v) => handleChange('gridDistanceMultiplier', v)} min={PARAM_RANGES.gridDistanceMultiplier.min} max={PARAM_RANGES.gridDistanceMultiplier.max} step={0.05} tooltip="Increases grid spacing for subsequent trades. 1.0 means fixed distance." error={errors.gridDistanceMultiplier} />
                    <InputSlider label="Grid Lot Multiplier" value={config.gridMultiplier} onChange={(v) => handleChange('gridMultiplier', v)} min={PARAM_RANGES.gridMultiplier.min} max={PARAM_RANGES.gridMultiplier.max} step={0.05} tooltip="The lot size multiplier for each subsequent grid trade (e.g., Martingale)." error={errors.gridMultiplier} />
                    <InputSlider label="Max Grid Trades" value={config.maxGridTrades} onChange={(v) => handleChange('maxGridTrades', v)} min={PARAM_RANGES.maxGridTrades.min} max={PARAM_RANGES.maxGridTrades.max} step={1} tooltip="The maximum number of trades allowed in a single grid." error={errors.maxGridTrades} />
                </div>
                
                <h3 className="text-lg font-semibold text-brand-accent border-b border-brand-border pb-2 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5"/> Grid Risk Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputSlider label="Take Profit (USD)" value={config.takeProfit} onChange={(v) => handleChange('takeProfit', v)} min={PARAM_RANGES.takeProfit.min} max={PARAM_RANGES.takeProfit.max} step={10} tooltip="The total profit in USD at which the entire grid will be closed." error={errors.takeProfit} />
                    <InputSlider label="Take Profit Multiplier" value={config.takeProfitMultiplier} onChange={(v) => handleChange('takeProfitMultiplier', v)} min={PARAM_RANGES.takeProfitMultiplier.min} max={PARAM_RANGES.takeProfitMultiplier.max} step={0.05} tooltip="Increases the TP target as more trades are opened. 1.0 means fixed TP." error={errors.takeProfitMultiplier} />
                    <InputSlider label="Stop Loss (% of Equity)" value={config.stopLoss} onChange={(v) => handleChange('stopLoss', v)} min={PARAM_RANGES.stopLoss.min} max={PARAM_RANGES.stopLoss.max} step={0.1} tooltip="The total loss as a percentage of account equity at which the grid will be closed." error={errors.stopLoss} />
                </div>
                
                <h3 className="text-lg font-semibold text-brand-accent border-b border-brand-border pb-2 flex justify-between items-center">
                    <span>Trailing Stop</span>
                    <label htmlFor="trailing-stop-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="trailing-stop-toggle" className="sr-only" checked={config.useTrailingStop} onChange={(e) => handleChange('useTrailingStop', e.target.checked)} />
                            <div className="block bg-brand-border w-14 h-8 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${config.useTrailingStop ? 'transform translate-x-6 bg-brand-accent' : ''}`}></div>
                        </div>
                    </label>
                </h3>
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${config.useTrailingStop ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <InputSlider label="Trailing Start (Points)" value={config.trailingStopStart} onChange={(v) => handleChange('trailingStopStart', v)} min={PARAM_RANGES.trailingStopStart.min} max={PARAM_RANGES.trailingStopStart.max} step={50} tooltip="Profit in points needed to activate the trailing stop." error={errors.trailingStopStart} />
                    <InputSlider label="Trailing Distance (Points)" value={config.trailingStopDistance} onChange={(v) => handleChange('trailingStopDistance', v)} min={PARAM_RANGES.trailingStopDistance.min} max={PARAM_RANGES.trailingStopDistance.max} step={50} tooltip="The distance the stop loss will maintain from the current price." error={errors.trailingStopDistance} />
                </div>
            </>
        )}

        {/* Signal Strategy Settings */}
        {config.strategyType === 'signal' && (
            <>
                <h3 className="text-lg font-semibold text-brand-accent border-b border-brand-border pb-2 flex items-center gap-2"><SignalIcon className="w-5 h-5" /> Trade Entry Signal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                        <label className="font-medium text-sm text-brand-muted mb-2">Trend MA Type</label>
                        <div className="flex gap-2">
                            <button onClick={() => handleChange('signal_maType', 'SMA')} className={`px-4 py-2 rounded-md w-full transition-colors ${config.signal_maType === 'SMA' ? 'bg-brand-accent text-white' : 'bg-brand-primary hover:bg-brand-border'}`}>SMA</button>
                            <button onClick={() => handleChange('signal_maType', 'EMA')} className={`px-4 py-2 rounded-md w-full transition-colors ${config.signal_maType === 'EMA' ? 'bg-brand-accent text-white' : 'bg-brand-primary hover:bg-brand-border'}`}>EMA</button>
                        </div>
                    </div>
                    <InputSlider label="Trend MA Period" value={config.signal_maPeriod} onChange={(v) => handleChange('signal_maPeriod', v)} min={PARAM_RANGES.signal_maPeriod.min} max={PARAM_RANGES.signal_maPeriod.max} step={1} tooltip="The MA period for the trend filter." error={errors.signal_maPeriod} />
                    <InputSlider label="RSI Period" value={config.signal_rsiPeriod} onChange={(v) => handleChange('signal_rsiPeriod', v)} min={PARAM_RANGES.signal_rsiPeriod.min} max={PARAM_RANGES.signal_rsiPeriod.max} step={1} tooltip="The period for the RSI indicator." error={errors.signal_rsiPeriod} />
                    <InputSlider label="RSI Oversold Level" value={config.signal_rsiOversold} onChange={(v) => handleChange('signal_rsiOversold', v)} min={PARAM_RANGES.signal_rsiOversold.min} max={PARAM_RANGES.signal_rsiOversold.max} step={1} tooltip="RSI level to trigger buy signals in an uptrend." error={errors.signal_rsiOversold} />
                    <InputSlider label="RSI Overbought Level" value={config.signal_rsiOverbought} onChange={(v) => handleChange('signal_rsiOverbought', v)} min={PARAM_RANGES.signal_rsiOverbought.min} max={PARAM_RANGES.signal_rsiOverbought.max} step={1} tooltip="RSI level to trigger sell signals in a downtrend." error={errors.signal_rsiOverbought} />
                </div>

                <h3 className="text-lg font-semibold text-brand-accent border-b border-brand-border pb-2 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5" /> Risk & Position Sizing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputSlider label="Lot Size" value={config.signal_lotSize} onChange={(v) => handleChange('signal_lotSize', v)} min={PARAM_RANGES.signal_lotSize.min} max={PARAM_RANGES.signal_lotSize.max} step={0.01} tooltip="The fixed lot size for each trade." error={errors.signal_lotSize} />
                    <InputSlider label="ATR Period" value={config.signal_atrPeriod} onChange={(v) => handleChange('signal_atrPeriod', v)} min={PARAM_RANGES.signal_atrPeriod.min} max={PARAM_RANGES.signal_atrPeriod.max} step={1} tooltip="The period for the ATR indicator, used for SL/TP placement." error={errors.signal_atrPeriod} />
                    <InputSlider label="ATR Multiplier for SL" value={config.signal_atrMultiplierSL} onChange={(v) => handleChange('signal_atrMultiplierSL', v)} min={PARAM_RANGES.signal_atrMultiplierSL.min} max={PARAM_RANGES.signal_atrMultiplierSL.max} step={0.1} tooltip="Stop Loss distance in multiples of the ATR value." error={errors.signal_atrMultiplierSL} />
                    <InputSlider label="ATR Multiplier for TP" value={config.signal_atrMultiplierTP} onChange={(v) => handleChange('signal_atrMultiplierTP', v)} min={PARAM_RANGES.signal_atrMultiplierTP.min} max={PARAM_RANGES.signal_atrMultiplierTP.max} step={0.1} tooltip="Take Profit distance in multiples of the ATR value." error={errors.signal_atrMultiplierTP} />
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
