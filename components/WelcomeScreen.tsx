import React, { useState } from 'react';
import type { StrategyType } from '../types.ts';
import { QuantumIcon, DollarSignIcon, GridIcon, SignalIcon } from './icons.tsx';

interface WelcomeScreenProps {
  onStart: (deposit: number, strategy: StrategyType) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [deposit, setDeposit] = useState('10000');
  const [error, setError] = useState('');

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDeposit(value);
    if (Number(value) <= 0) {
      setError('Deposit must be a positive number.');
    } else {
      setError('');
    }
  };

  const handleStart = (strategy: StrategyType) => {
    const depositNum = Number(deposit);
    if (depositNum > 0) {
      onStart(depositNum, strategy);
    } else {
      setError('Please enter a valid initial deposit.');
    }
  };

  const isButtonDisabled = !deposit || Number(deposit) <= 0;

  return (
    <div className="w-full max-w-lg mx-auto bg-brand-secondary p-8 rounded-xl border border-brand-border shadow-2xl text-center">
      <QuantumIcon className="w-16 h-16 text-brand-accent mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-brand-text">Welcome to MQL5 Quantum</h1>
      <p className="text-brand-muted mt-2 mb-6">Let's build your Bitcoin Expert Advisor for MetaTrader 5.</p>
      
      <div className="mb-8">
        <label htmlFor="initial-deposit" className="block text-lg font-semibold text-brand-text mb-2">1. Set Your Initial Deposit</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <DollarSignIcon className="h-5 w-5 text-brand-muted" />
          </div>
          <input
            type="number"
            id="initial-deposit"
            value={deposit}
            onChange={handleDepositChange}
            placeholder="e.g., 10000"
            className={`w-full bg-brand-primary border ${error ? 'border-red-500/50' : 'border-brand-border'} rounded-md pl-12 pr-4 py-3 text-brand-text text-lg font-mono focus:ring-2 focus:ring-brand-accent focus:border-brand-accent`}
          />
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-brand-text mb-3">2. Choose Your Strategy Foundation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleStart('grid')}
            disabled={isButtonDisabled}
            className="group flex flex-col items-center justify-center p-6 bg-brand-primary border border-brand-border rounded-lg hover:border-brand-accent hover:bg-brand-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GridIcon className="w-10 h-10 text-brand-accent mb-2" />
            <span className="text-xl font-bold text-brand-text">Grid Strategy</span>
            <span className="text-xs text-brand-muted mt-1">Trend-following with multiple entries.</span>
          </button>
          <button
            onClick={() => handleStart('signal')}
            disabled={isButtonDisabled}
            className="group flex flex-col items-center justify-center p-6 bg-brand-primary border border-brand-border rounded-lg hover:border-brand-accent hover:bg-brand-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SignalIcon className="w-10 h-10 text-brand-accent mb-2" />
            <span className="text-xl font-bold text-brand-text">Signal Strategy</span>
            <span className="text-xs text-brand-muted mt-1">Classic entries via MA, RSI, and ATR.</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;