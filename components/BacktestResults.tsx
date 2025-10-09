
import React from 'react';
import type { SimulatedResults } from '../types.ts';
import { CalculatorIcon, TrendingUpIcon, TrendingDownIcon, PercentIcon, TargetIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from './icons.tsx';

interface BacktestResultsProps {
  results: SimulatedResults;
}

type Rating = 'good' | 'neutral' | 'bad';

interface MetricCardProps {
    Icon: React.FC<{className?: string}>;
    label: string;
    value: string;
    iconBgClass: string;
    textColorClass: string;
    rating: Rating;
}

const RatingIndicator: React.FC<{ rating: Rating }> = ({ rating }) => {
    if (rating === 'good') {
        return <ArrowUpIcon className="w-4 h-4 text-brand-buy" />;
    }
    if (rating === 'bad') {
        return <ArrowDownIcon className="w-4 h-4 text-brand-sell" />;
    }
    return <MinusIcon className="w-4 h-4 text-brand-muted" />;
};


const MetricCard: React.FC<MetricCardProps> = ({ Icon, label, value, iconBgClass, textColorClass, rating }) => (
    <div className="bg-brand-primary/50 border border-brand-border rounded-lg p-3 flex items-center gap-3 h-full">
        <div className={`p-2 rounded-full ${iconBgClass}`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
            <p className="text-xs text-brand-muted">{label}</p>
            <div className="flex items-center gap-1.5" title={rating === 'good' ? 'Good' : rating === 'bad' ? 'Poor' : 'Average'}>
              <p className={`text-lg font-bold ${textColorClass}`}>{value}</p>
              <RatingIndicator rating={rating} />
            </div>
        </div>
    </div>
);

const getMetricRating = (label: string, value: string): Rating => {
    const numValue = parseFloat(value.replace('%', ''));
    if (isNaN(numValue)) return 'neutral';

    switch (label) {
        case 'Profit Factor':
            if (numValue > 1.5) return 'good';
            if (numValue < 1.0) return 'bad';
            return 'neutral';
        case 'Max Drawdown': // Lower is better
            if (numValue < 15) return 'good';
            if (numValue > 30) return 'bad';
            return 'neutral';
        case 'Win Rate':
            if (numValue > 55) return 'good';
            if (numValue < 40) return 'bad';
            return 'neutral';
        case 'Sharpe Ratio':
            if (numValue > 1.0) return 'good';
            if (numValue < 0.5) return 'bad';
            return 'neutral';
        default:
            return 'neutral';
    }
};


const BacktestResults: React.FC<BacktestResultsProps> = ({ results }) => {
  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <CalculatorIcon className="w-5 h-5 text-brand-accent"/>
        Simulated Results
      </h2>

      <div className="grid grid-cols-1 gap-3 flex-grow">
        <MetricCard 
            Icon={TrendingUpIcon}
            label="Profit Factor"
            value={results.profitFactor}
            iconBgClass="bg-brand-buy/30"
            textColorClass="text-brand-buy"
            rating={getMetricRating("Profit Factor", results.profitFactor)}
        />
        <MetricCard 
            Icon={TrendingDownIcon}
            label="Max Drawdown"
            value={results.drawdown}
            iconBgClass="bg-brand-sell/30"
            textColorClass="text-brand-sell"
            rating={getMetricRating("Max Drawdown", results.drawdown)}
        />
        <MetricCard 
            Icon={PercentIcon}
            label="Win Rate"
            value={results.winRate}
            iconBgClass="bg-brand-accent/30"
            textColorClass="text-brand-accent"
            rating={getMetricRating("Win Rate", results.winRate)}
        />
        <MetricCard 
            Icon={TargetIcon}
            label="Sharpe Ratio"
            value={results.sharpeRatio}
            iconBgClass="bg-brand-gold/30"
            textColorClass="text-brand-gold"
            rating={getMetricRating("Sharpe Ratio", results.sharpeRatio)}
        />
      </div>
      <p className="text-xs text-brand-muted text-center italic pt-3">
        Note: Illustrative metrics based on settings.
      </p>
    </div>
  );
};

export default BacktestResults;
