import { Time } from 'lightweight-charts';

export interface EAConfig {
  // Common
  magicNumber: number;
  initialLot: number;
  maxSpread: number;
  
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
}

export type Presets = Record<string, EAConfig>;

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