import { Time } from 'lightweight-charts';

export interface EAConfig {
  magicNumber: number;
  initialLot: number;
  maxSpread: number;
  gridDistance: number;
  gridDistanceMultiplier: number;
  gridMultiplier: number;
  maxGridTrades: number;
  maType: 'SMA' | 'EMA';
  maPeriod: number;
  takeProfit: number;
  takeProfitMultiplier: number;
  stopLoss: number;
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
