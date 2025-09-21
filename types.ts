import { Time } from 'lightweight-charts';

export type AIPersonality = 'Quantitative Analyst' | 'Risk Manager' | 'Aggressive Scalper' | 'Contrarian Investor';

export interface EAConfig {
  // Common
  magicNumber: number;
  initialRiskPercent: number; // New field for grid strategy
  maxSpread: number;
  
  // Backtest Settings
  startDate: string;
  endDate: string;
  initialDeposit: number;

  // Strategy Type
  strategyType: 'grid' | 'signal';

  // Grid Strategy Params
  gridDistance: number;
  gridDistanceMultiplier: number;
  gridMultiplier: number;
  maxGridTrades: number;
  maType: 'SMA' | 'EMA';
  maPeriod: number;
  takeProfit: number;
  takeProfitMultiplier: number;
  stopLoss: number;
  useTrailingStop: boolean;
  trailingStopStart: number;
  trailingStopDistance: number;

  // Signal Strategy Params
  signal_lotSize: number;
  signal_maType: 'SMA' | 'EMA';
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

export type Presets = Record<string, EAConfig>;

export interface SimulatedResults {
    profitFactor: string;
    drawdown: string;
    winRate: string;
    sharpeRatio: string;
}

export interface OptimizationResult {
  value: number;
  results: SimulatedResults;
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
}

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