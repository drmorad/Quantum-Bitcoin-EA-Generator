import React from 'react';
import { InfoIcon } from './icons';

interface InputSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  tooltip: string;
  error?: string;
}

const InputSlider: React.FC<InputSliderProps> = ({ label, value, onChange, min, max, step, tooltip, error }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className={`font-medium text-sm flex items-center gap-1.5 group ${error ? 'text-red-400' : 'text-brand-muted'}`}>
          {label}
          <div className="relative">
            <InfoIcon className="w-4 h-4 cursor-help" />
            <div className="absolute bottom-full mb-2 w-64 bg-brand-primary border border-brand-border p-2 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {tooltip}
            </div>
          </div>
        </label>
        <span className={`text-sm font-semibold bg-brand-primary px-2 py-0.5 rounded border ${error ? 'border-red-500/50 text-red-400' : 'border-brand-border'}`}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer ${error ? 'accent-red-500 ring-1 ring-red-500/70' : 'accent-brand-accent'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default InputSlider;
