import React, { useState, useEffect } from 'react';
import { InfoIcon, TuneIcon } from './icons.tsx';

interface InputSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  tooltip: string;
  error?: string;
  isOptimizable?: boolean;
  onOptimize?: () => void;
}

const InputSlider: React.FC<InputSliderProps> = ({ label, value, onChange, min, max, step, tooltip, error, isOptimizable, onOptimize }) => {
  // Defensive check: Ensure value is a number before calling toString()
  const [inputValue, setInputValue] = useState((value ?? 0).toString());

  useEffect(() => {
    // Sync with parent state, also defensively
    setInputValue((value ?? 0).toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    let numValue = parseFloat(inputValue);
    if (isNaN(numValue) || inputValue.trim() === '') {
        numValue = min;
    }
    const clampedValue = Math.max(min, Math.min(max, numValue));
    
    if(clampedValue !== value) {
        onChange(clampedValue);
    }
    
    setInputValue(clampedValue.toString());
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5 group">
            <label className={`font-medium text-sm ${error ? 'text-red-400' : 'text-brand-muted'}`}>{label}</label>
            {isOptimizable && (
                <button onClick={onOptimize} className="text-brand-muted hover:text-brand-accent transition-colors" title={`Optimize ${label}`}>
                    <TuneIcon className="w-4 h-4" />
                </button>
            )}
            <div className="relative">
                <InfoIcon className="w-4 h-4 cursor-help" />
                <div className="absolute bottom-full mb-2 w-64 bg-brand-primary border border-brand-border p-2 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {tooltip}
                </div>
            </div>
        </div>
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          className={`text-sm font-semibold bg-brand-primary px-2 py-0.5 rounded border ${error ? 'border-red-500/50 text-red-400' : 'border-brand-border'} w-24 text-right focus:ring-1 focus:ring-brand-accent focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? 0} // Defensively handle null value for the range slider
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer ${error ? 'accent-red-500 ring-1 ring-red-500/70' : 'accent-brand-accent'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default InputSlider;