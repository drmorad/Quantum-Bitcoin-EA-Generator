import React from 'react';
import { XIcon, RocketIcon } from './icons.tsx';

interface ChangelogModalProps {
  onClose: () => void;
  currentVersion: string;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose, currentVersion }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-brand-secondary border border-brand-border rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-brand-border flex-shrink-0">
          <h2 className="text-2xl font-bold text-brand-text flex items-center gap-3">
            <RocketIcon className="w-6 h-6 text-brand-accent" />
            What's New in Version {currentVersion}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-brand-border transition-colors"
            aria-label="Close changelog"
          >
            <XIcon className="w-6 h-6 text-brand-muted" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto text-brand-muted space-y-6">
          
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-3">Version 1.2.0 <span className="text-sm font-medium text-brand-muted">(Latest)</span></h3>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong className="text-brand-text">AI Auditor Upgrade - RSI Divergence Detection:</strong>
                <p className="pl-6 text-sm">The AI Strategy Auditor now automatically detects bullish and bearish RSI divergence on the H1 chart. This powerful signal is incorporated into the audit, providing deeper insights into potential trend reversals or confirmations.</p>
              </li>
              <li>
                <strong className="text-brand-text">Live Trading Signal Generator:</strong>
                <p className="pl-6 text-sm">A new component that synthesizes real-time technical indicators (MA, RSI, MACD, Stochastic) and fundamental data to generate a concrete, actionable BUY, SELL, or HOLD signal with entry, take profit, and stop loss levels.</p>
              </li>
              <li>
                <strong className="text-brand-text">Dynamic Lot Sizing for Grid Strategy:</strong>
                <p className="pl-6 text-sm">The "Initial Lot" for the grid strategy has been replaced with "Initial Risk (%)". The EA now dynamically calculates the initial lot size based on account equity, providing more consistent risk management across different account sizes.</p>
              </li>
               <li>
                <strong className="text-brand-text">Enhanced UI & UX:</strong>
                <p className="pl-6 text-sm">Improved syntax highlighting for MQL5 code, more responsive layout adjustments, and general performance enhancements.</p>
              </li>
            </ul>
          </section>

          <div className="border-t border-brand-border my-4"></div>
          
          <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-3">Version 1.1.0</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong className="text-brand-text">Parameter Optimizer:</strong>
                <p className="pl-6 text-sm">Introduced the ability to "tune" key parameters. The optimizer modal allows users to test a range of values and view simulated performance metrics to find the best settings.</p>
              </li>
              <li>
                <strong className="text-brand-text">Signal Strategy Type:</strong>
                <p className="pl-6 text-sm">Added a completely new "Signal Strategy" based on classic technical indicators like MA, RSI, and ATR for a non-grid based trading approach.</p>
              </li>
            </ul>
          </section>

        </main>
      </div>
    </div>
  );
};

export default ChangelogModal;