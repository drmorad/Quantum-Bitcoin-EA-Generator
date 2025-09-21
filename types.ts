
import type { Time } from 'lightweight-charts';

export type StrategyType = 'grid' | 'signal';
export type MAType = 'SMA' | 'EMA';

export interface EAConfig {
  magicNumber: number;
  maxSpread: number;
  startDate: string;
  endDate: string;
  initialDeposit: number;
  strategyType: StrategyType;
  
  // Grid strategy specific
  initialRiskPercent: number;
  gridDistance: number;
  gridDistanceMultiplier: number;
  gridMultiplier: number;
  maxGridTrades: number;
  maType: MAType;
  maPeriod: number;
  takeProfit: number;
  takeProfitMultiplier: number;
  stopLoss: number;
  useTrailingStop: boolean;
  trailingStopStart: number;
  trailingStopDistance: number;

  // Signal strategy specific
  signal_lotSize: number;
  signal_maType: MAType;
  signal_maPeriod: number;
  signal_atrPeriod: number;
  signal_atrMultiplierSL: number;
  signal_atrMultiplierTP: number;
  signal_rsiPeriod: number;
  signal_rsiOversold: number;
  signal_rsiOverbought: number;
  signal_useTrailingStop: boolean;
  signal_trailingStopStart: number;
  signal_trailingStopDistance: number;
}

export type Presets = Record<string, Partial<EAConfig>>;

export interface SimulatedResults {
  profitFactor: string;
  drawdown: string;
  winRate: string;
  sharpeRatio: string;
}

export interface CandlestickData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface TickerData {
    price: number;
    changeAbsolute: number;
    changePercentage: number;
}

export interface LiveAnalysisData {
    latestPrice: number;
    maValue: number;
    trend: 'Uptrend' | 'Downtrend';
    rsiValue?: number;
    atrValue?: number;
    macd?: { macdLine: number; signalLine: number; histogram: number; };
    stochastic?: { k: number; d: number; };
}

export type AIPersonality = 'Quantitative Analyst' | 'Risk Manager' | 'Aggressive Scalper' | 'Contrarian Investor';

export interface FundamentalData {
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
    headline: string;
}

export interface TradingSignal {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: 'High' | 'Medium' | 'Low';
    entry: number;
    takeProfit: number;
    stopLoss: number;
    rationale: string;
}

export interface OptimizationResult {
    value: number;
    results: SimulatedResults;
}
