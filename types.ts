export interface EAConfig {
  magicNumber: number;
  initialLot: number;
  maxSpread: number;
  gridDistance: number;
  gridMultiplier: number;
  maxGridTrades: number;
  maPeriod: number;
  takeProfit: number;
  stopLoss: number;
}

export type Presets = Record<string, EAConfig>;
