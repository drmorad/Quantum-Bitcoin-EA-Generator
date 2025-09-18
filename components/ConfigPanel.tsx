import React, { useState, useEffect } from 'react';
import type { EAConfig, Presets } from '../types';
import InputSlider from './InputSlider';
import { SettingsIcon, TrashIcon } from './icons';

interface ConfigPanelProps {
  config: EAConfig;
  onConfigChange: (config: EAConfig, isValid: boolean) => void;
  presets: Presets;
  selectedPreset: string;
  newPresetName: string;
  onNewPresetNameChange: (name: string) => void;
  onSavePreset: () => void;
  onLoadPreset: (name: string) => void;
  onDeletePreset: () => void;
}

const PARAM_RANGES: Omit<Record<keyof EAConfig, { min: number; max: number }>, 'maType'> = {
    magicNumber: { min: 10000, max: 99999 },
    initialLot: { min: 0.01, max: 1.0 },
    maxSpread: { min: 1, max: 100 },
    gridDistance: { min: 100, max: 5000 },
    gridDistanceMultiplier: { min: 1.0, max: 2.5 },
    gridMultiplier: { min: 1.1, max: 2.5 },
    maxGridTrades: { min: 2, max: 15 },
    maPeriod: { min: 10, max: 200 },
    takeProfit: { min: 10, max: 500 },
    takeProfitMultiplier: { min: 1.0, max: 2.0 },
    stopLoss: { min: 0.5, max: 10.0 },
};


const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onConfigChange,
  presets,
  selectedPreset,
  newPresetName,
  onNewPresetNameChange,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const [errors, setErrors] = useState<Partial<Record<keyof EAConfig, string>>>({});

  const validateConfig = (configToValidate: EAConfig) => {
    const newErrors: Partial<Record<keyof EAConfig, string>> = {};

    // Rule: All values must be within their defined ranges
    for (const key in PARAM_RANGES) {
        const configKey = key as keyof typeof PARAM_RANGES;
        const value = configToValidate[configKey];
        const range = PARAM_RANGES[configKey];
        if (value < range.min || value > range.max) {
            newErrors[configKey] = `Value must be between ${range.min} and ${range.max}.`;
        }
    }

    return newErrors;
  };

  useEffect(() => {
    // Re-validate when the config prop changes (e.g., on preset load)
    const validationErrors = validateConfig(config);
    setErrors(validationErrors);
  }, [config]);

  const handleChange = (key: keyof EAConfig, value: number | 'SMA' | 'EMA') => {
    const newConfig = { ...config, [key]: value };
    const validationErrors = validateConfig(newConfig);
    const isValid = Object.keys(validationErrors).length === 0;
    onConfigChange(newConfig, isValid);
  };

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 h-fit">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-brand-accent"/>
        EA Configuration
      </h2>
      
      <div className="space-y-4 mb-8 p-4 bg-brand-primary/50 border border-brand-border rounded-lg">
        <h3 className="text-lg font-medium text-brand-accent">Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="preset-select" className="text-sm font-medium text-brand-muted mb-1 block">Load Preset</label>
            <div className="flex items-center gap-2">
              <select
                id="preset-select"
                value={selectedPreset}
                onChange={(e) => onLoadPreset(e.target.value)}
                className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                <option value="">Select a preset...</option>
                {Object.keys(presets).sort().map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                onClick={onDeletePreset}
                disabled={!selectedPreset}
                className="p-2 rounded-md bg-red-600/50 hover:bg-red-600/80 disabled:bg-brand-border disabled:text-brand-muted disabled:cursor-not-allowed transition-colors text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Delete selected preset"
                title="Delete selected preset"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="preset-name" className="text-sm font-medium text-brand-muted mb-1 block">Save Current as Preset</label>
            <div className="flex items-center gap-2">
              <input
                id="preset-name"
                type="text"
                value={newPresetName}
                onChange={(e) => onNewPresetNameChange(e.target.value)}
                placeholder="New preset name..."
                className="w-full bg-brand-primary border border-brand-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
              <button
                onClick={onSavePreset}
                disabled={!newPresetName.trim() || Object.keys(validateConfig(config)).length > 0}
                className="px-4 py-2 rounded-md bg-brand-accent hover:bg-blue-500 disabled:bg-brand-border disabled:text-brand-muted disabled:cursor-not-allowed transition-colors text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary focus:ring-brand-accent"
                title={Object.keys(validateConfig(config)).length > 0 ? "Cannot save invalid configuration" : "Save preset"}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-brand-accent border-b border-brand-border pb-2">Core Settings</h3>
        <InputSlider
          label="Magic Number"
          value={config.magicNumber}
          onChange={(val) => handleChange('magicNumber', val)}
          min={PARAM_RANGES.magicNumber.min}
          max={PARAM_RANGES.magicNumber.max}
          step={1}
          tooltip="Unique ID to distinguish trades managed by this EA. Prevents interference with other EAs or manual trades."
          error={errors.magicNumber}
        />
        <InputSlider
          label="Initial Lot Size"
          value={config.initialLot}
          onChange={(val) => handleChange('initialLot', val)}
          min={PARAM_RANGES.initialLot.min}
          max={PARAM_RANGES.initialLot.max}
          step={0.01}
          tooltip="The base trading volume for the first trade in a grid. Subsequent trades will build upon this size."
          error={errors.initialLot}
        />
        <InputSlider
          label="Max Spread (Points)"
          value={config.maxSpread}
          onChange={(val) => handleChange('maxSpread', val)}
          min={PARAM_RANGES.maxSpread.min}
          max={PARAM_RANGES.maxSpread.max}
          step={1}
          tooltip="A safety filter to avoid trading during high volatility. The EA won't trade if the spread exceeds this value."
          error={errors.maxSpread}
        />

        <h3 className="text-lg font-medium text-brand-accent border-b border-brand-border pb-2 pt-4">Grid Strategy</h3>
        <InputSlider
          label="Grid Distance (Points)"
          value={config.gridDistance}
          onChange={(val) => handleChange('gridDistance', val)}
          min={PARAM_RANGES.gridDistance.min}
          max={PARAM_RANGES.gridDistance.max}
          step={50}
          tooltip="The base price movement against the trend needed to open another grid trade. A smaller value creates a tighter grid."
          error={errors.gridDistance}
        />
        <InputSlider
          label="Grid Distance Multiplier"
          value={config.gridDistanceMultiplier}
          onChange={(val) => handleChange('gridDistanceMultiplier', val)}
          min={PARAM_RANGES.gridDistanceMultiplier.min}
          max={PARAM_RANGES.gridDistanceMultiplier.max}
          step={0.05}
          tooltip="Dynamically increases grid spacing. Next Distance = Base Distance * (1 + (Num Trades - 1) * (Multiplier - 1)). A value of 1.0 disables this."
          error={errors.gridDistanceMultiplier}
        />
        <InputSlider
          label="Grid Lot Multiplier"
          value={config.gridMultiplier}
          onChange={(val) => handleChange('gridMultiplier', val)}
          min={PARAM_RANGES.gridMultiplier.min}
          max={PARAM_RANGES.gridMultiplier.max}
          step={0.05}
          tooltip="Determines how much the lot size increases for each new grid trade (e.g., 1.5x). Increases potential profit and risk."
          error={errors.gridMultiplier}
        />
        <InputSlider
          label="Max Grid Trades"
          value={config.maxGridTrades}
          onChange={(val) => handleChange('maxGridTrades', val)}
          min={PARAM_RANGES.maxGridTrades.min}
          max={PARAM_RANGES.maxGridTrades.max}
          step={1}
          tooltip="The absolute limit on open trades in one direction. A key risk parameter to control exposure."
          error={errors.maxGridTrades}
        />

        <h3 className="text-lg font-medium text-brand-accent border-b border-brand-border pb-2 pt-4">Risk & Trend</h3>
        <div>
          <label className="font-medium text-sm text-brand-muted mb-2 block">
            Trend MA Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="maType"
                value="SMA"
                checked={config.maType === 'SMA'}
                onChange={() => handleChange('maType', 'SMA')}
                className="w-4 h-4 text-brand-accent bg-brand-primary border-brand-border focus:ring-brand-accent"
              />
              <span className="text-white">SMA (Simple)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="maType"
                value="EMA"
                checked={config.maType === 'EMA'}
                onChange={() => handleChange('maType', 'EMA')}
                className="w-4 h-4 text-brand-accent bg-brand-primary border-brand-border focus:ring-brand-accent"
              />
              <span className="text-white">EMA (Exponential)</span>
            </label>
          </div>
        </div>
         <InputSlider
          label="Trend MA Period"
          value={config.maPeriod}
          onChange={(val) => handleChange('maPeriod', val)}
          min={PARAM_RANGES.maPeriod.min}
          max={PARAM_RANGES.maPeriod.max}
          step={1}
          tooltip="Number of bars for the trend-following MA. Higher values track longer-term trends; lower values are more responsive."
          error={errors.maPeriod}
        />
        <InputSlider
          label="Take Profit (USD)"
          value={config.takeProfit}
          onChange={(val) => handleChange('takeProfit', val)}
          min={PARAM_RANGES.takeProfit.min}
          max={PARAM_RANGES.takeProfit.max}
          step={5}
          tooltip="The base profit target. When the combined profit of all grid trades reaches this amount (or its dynamic equivalent), the EA will close all positions."
          error={errors.takeProfit}
        />
        <InputSlider
          label="Take Profit Multiplier"
          value={config.takeProfitMultiplier}
          onChange={(val) => handleChange('takeProfitMultiplier', val)}
          min={PARAM_RANGES.takeProfitMultiplier.min}
          max={PARAM_RANGES.takeProfitMultiplier.max}
          step={0.05}
          tooltip="Dynamically increases the Take Profit target as more trades open. Target = Base TP * (1 + (Num Trades - 1) * (Multiplier - 1)). A value of 1.0 disables this."
          error={errors.takeProfitMultiplier}
        />
        <InputSlider
          label="Stop Loss (% of Equity)"
          value={config.stopLoss}
          onChange={(val) => handleChange('stopLoss', val)}
          min={PARAM_RANGES.stopLoss.min}
          max={PARAM_RANGES.stopLoss.max}
          step={0.1}
          tooltip="A critical safety net as a percentage of your total account equity. If combined loss hits this percentage, the EA closes all positions."
          error={errors.stopLoss}
        />
      </div>
    </div>
  );
};

export default ConfigPanel;
