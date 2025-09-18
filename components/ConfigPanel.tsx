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

const PARAM_RANGES: Record<keyof EAConfig, { min: number; max: number }> = {
    magicNumber: { min: 10000, max: 99999 },
    initialLot: { min: 0.01, max: 1.0 },
    maxSpread: { min: 1, max: 100 },
    gridDistance: { min: 100, max: 5000 },
    gridMultiplier: { min: 1.1, max: 2.5 },
    maxGridTrades: { min: 2, max: 15 },
    maPeriod: { min: 10, max: 200 },
    takeProfit: { min: 10, max: 500 },
    stopLoss: { min: 100, max: 10000 },
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

    // Rule: Take Profit must be <= Stop Loss
    if (configToValidate.takeProfit > configToValidate.stopLoss) {
      newErrors.takeProfit = 'Take Profit cannot exceed Stop Loss.';
      newErrors.stopLoss = 'Stop Loss must be >= Take Profit.';
    }

    // Rule: All values must be within their defined ranges
    for (const key in PARAM_RANGES) {
        const configKey = key as keyof EAConfig;
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

  const handleChange = (key: keyof EAConfig, value: number) => {
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
          tooltip="Unique ID for this EA to manage its trades."
          error={errors.magicNumber}
        />
        <InputSlider
          label="Initial Lot Size"
          value={config.initialLot}
          onChange={(val) => handleChange('initialLot', val)}
          min={PARAM_RANGES.initialLot.min}
          max={PARAM_RANGES.initialLot.max}
          step={0.01}
          tooltip="The lot size for the first trade in a cycle."
          error={errors.initialLot}
        />
        <InputSlider
          label="Max Spread (Points)"
          value={config.maxSpread}
          onChange={(val) => handleChange('maxSpread', val)}
          min={PARAM_RANGES.maxSpread.min}
          max={PARAM_RANGES.maxSpread.max}
          step={1}
          tooltip="Maximum allowed spread in points to open a trade."
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
          tooltip="Distance in points between grid trades."
          error={errors.gridDistance}
        />
        <InputSlider
          label="Grid Lot Multiplier"
          value={config.gridMultiplier}
          onChange={(val) => handleChange('gridMultiplier', val)}
          min={PARAM_RANGES.gridMultiplier.min}
          max={PARAM_RANGES.gridMultiplier.max}
          step={0.05}
          tooltip="Multiplier for the lot size of subsequent grid trades."
          error={errors.gridMultiplier}
        />
        <InputSlider
          label="Max Grid Trades"
          value={config.maxGridTrades}
          onChange={(val) => handleChange('maxGridTrades', val)}
          min={PARAM_RANGES.maxGridTrades.min}
          max={PARAM_RANGES.maxGridTrades.max}
          step={1}
          tooltip="Maximum number of trades allowed in a single grid."
          error={errors.maxGridTrades}
        />

        <h3 className="text-lg font-medium text-brand-accent border-b border-brand-border pb-2 pt-4">Risk & Trend</h3>
         <InputSlider
          label="Trend MA Period"
          value={config.maPeriod}
          onChange={(val) => handleChange('maPeriod', val)}
          min={PARAM_RANGES.maPeriod.min}
          max={PARAM_RANGES.maPeriod.max}
          step={1}
          tooltip="Period for the Moving Average used as a trend filter."
          error={errors.maPeriod}
        />
        <InputSlider
          label="Take Profit (USD)"
          value={config.takeProfit}
          onChange={(val) => handleChange('takeProfit', val)}
          min={PARAM_RANGES.takeProfit.min}
          max={PARAM_RANGES.takeProfit.max}
          step={5}
          tooltip="Target profit in account currency (USD) to close the entire grid."
          error={errors.takeProfit}
        />
        <InputSlider
          label="Stop Loss (USD)"
          value={config.stopLoss}
          onChange={(val) => handleChange('stopLoss', val)}
          min={PARAM_RANGES.stopLoss.min}
          max={PARAM_RANGES.stopLoss.max}
          step={100}
          tooltip="Total loss in account currency (USD) to close the grid as a failsafe."
          error={errors.stopLoss}
        />
      </div>
    </div>
  );
};

export default ConfigPanel;
