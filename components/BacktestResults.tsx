import React from 'react';
import type { SimulatedResults } from '../types';
import { CalculatorIcon, TrendingUpIcon, TrendingDownIcon, PercentIcon, TargetIcon } from './icons';

interface BacktestResultsProps {
  results: SimulatedResults;
}

interface MetricCardProps {
    Icon: React.FC<{className?: string}>;
    label: string;
    value: string;
    iconBgClass: string;
    textColorClass: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ Icon, label, value, iconBgClass, textColorClass }) => (
    <div className="bg-brand-primary/50 border border-brand-border rounded-lg p-4 flex items-center gap-4 h-full">
        <div className={`p-3 rounded-full ${iconBgClass}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm text-brand-muted">{label}</p>
            <p className={`text-xl font-bold ${textColorClass}`}>{value}</p>
        </div>
    </div>
);


const BacktestResults: React.FC<BacktestResultsProps> = ({ results }) => {
  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-full">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
        <CalculatorIcon className="w-6 h-6 text-brand-accent"/>
        Simulated Results
      </h2>

      <div className="grid grid-cols-1 gap-4 flex-grow">
        <MetricCard 
            Icon={TrendingUpIcon}
            label="Profit Factor"
            value={results.profitFactor}
            iconBgClass="bg-brand-buy/30"
            textColorClass="text-brand-buy"
        />
        <MetricCard 
            Icon={TrendingDownIcon}
            label="Max Drawdown"
            value={results.drawdown}
            iconBgClass="bg-brand-sell/30"
            textColorClass="text-brand-sell"
        />
        <MetricCard 
            Icon={PercentIcon}
            label="Win Rate"
            value={results.winRate}
            iconBgClass="bg-brand-accent/30"
            textColorClass="text-brand-accent"
        />
        <MetricCard 
            Icon={TargetIcon}
            label="Sharpe Ratio"
            value={results.sharpeRatio}
            iconBgClass="bg-brand-gold/30"
            textColorClass="text-brand-gold"
        />
      </div>
      <p className="text-xs text-brand-muted text-center italic pt-4">
        Note: Illustrative metrics based on settings.
      </p>
    </div>
  );
};

export default BacktestResults;