import React, { useState, useEffect } from 'react';
import type { EAConfig, CandlestickData } from '../types';
import { GridIcon, DollarSignIcon, SendIcon, TrendingUpIcon } from './icons';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService';
import InputSlider from './InputSlider';

interface ManualGridPlannerProps {
  config: EAConfig;
}

const calculateATR = (data: CandlestickData[], period: number): number | null => {
    if (data.length < period + 1) return null;

    const trueRanges: number[] = [];
    // Start from 1 since we need a previous close
    for (let i = 1; i < data.length; i++) {
        const prevClose = data[i - 1].close;
        const high = data[i].high;
        const low = data[i].low;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trueRanges.push(tr);
    }

    if (trueRanges.length < period) return null;

    // Wilder's smoothing method for ATR
    let atr = 0;
    // Initial ATR is a simple average of the first 'period' TRs
    for (let i = 0; i < period; i++) {
        atr += trueRanges[i];
    }
    atr /= period;

    // Smooth the rest
    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
};

const ManualGridPlanner: React.FC<ManualGridPlannerProps> = ({ config }) => {
  const { initialLot, maxGridTrades } = config;
  const [startPrice, setStartPrice] = useState('70000');
  const [stopLossPoints, setStopLossPoints] = useState(1000);
  const [takeProfitPoints, setTakeProfitPoints] = useState(2000);

  // State for volatility adaptation
  const [useVolatility, setUseVolatility] = useState(false);
  const [atrPeriod, setAtrPeriod] = useState(14);
  const [distanceMultiplier, setDistanceMultiplier] = useState(0.5);
  const [lotSensitivity, setLotSensitivity] = useState(0.2);
  
  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([]);
  const [currentAtr, setCurrentAtr] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (useVolatility) {
        const getData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchBTCUSD_H1_Data();
            setHistoricalData(data);
        } catch (err) {
            console.error("Failed to fetch data for ATR calculation", err);
        } finally {
            setIsLoading(false);
        }
        };
        getData();
    }
  }, [useVolatility]);

  useEffect(() => {
    if (useVolatility && historicalData.length > atrPeriod) {
      const atr = calculateATR(historicalData, atrPeriod);
      setCurrentAtr(atr);
    } else {
      setCurrentAtr(null);
    }
  }, [useVolatility, historicalData, atrPeriod]);


  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setStartPrice(value);
    }
  };
  
  const pointSize = 0.01; // For BTCUSD, 1 point = 0.01 USD

  const handlePlaceOrder = (orderType: 'Buy' | 'Sell', lotSize: number, entryPrice: number) => {
    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    const slDistance = stopLossPoints * pointSize;
    const tpDistance = takeProfitPoints * pointSize;

    let stopLossPrice: number;
    let takeProfitPrice: number;

    if (orderType === 'Buy') {
        stopLossPrice = entryPrice - slDistance;
        takeProfitPrice = entryPrice + tpDistance;
    } else { // Sell
        stopLossPrice = entryPrice + slDistance;
        takeProfitPrice = entryPrice - tpDistance;
    }

    console.log(
        `[SIMULATED ORDER]\n` +
        `  - Type: ${orderType} Limit\n` +
        `  - Lots: ${lotSize.toFixed(2)}\n` +
        `  - Entry: ${formatCurrency(entryPrice)}\n` +
        `  - Stop Loss: ${formatCurrency(stopLossPrice)} (${stopLossPoints} pts)\n` +
        `  - Take Profit: ${formatCurrency(takeProfitPrice)} (${takeProfitPoints} pts)`
    );
  };
  
  const renderGridLevels = (isBuyGrid: boolean) => {
    const levels = [];
    const priceNum = parseFloat(startPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
        return (
            <tr>
                <td colSpan={6} className="p-4 text-center text-brand-muted">
                    Please enter a valid start price.
                </td>
            </tr>
        );
    }
    
    const isAdaptive = useVolatility && currentAtr != null;
    const baseDistanceInPoints = isAdaptive
        ? (currentAtr * distanceMultiplier) / pointSize
        : config.gridDistance;
    
    const baseLotMultiplier = config.gridMultiplier;
    const dynamicLotMultiplier = isAdaptive && priceNum > 0
        ? baseLotMultiplier + (lotSensitivity * (currentAtr / priceNum))
        : baseLotMultiplier;

    let cumulativeLots = 0;
    let totalCost = 0;
    let nextLotToPlace = initialLot;

    for (let i = 1; i <= maxGridTrades; i++) {
      const currentLot = Math.max(0.01, Math.round(nextLotToPlace * 100) / 100);

      let cumulativeDistanceInPoints = 0;
      for (let j = 1; j < i; j++) {
        // Calculate the specific distance for this step in the grid
        const stepDistance = baseDistanceInPoints * (1 + (j - 1) * (config.gridDistanceMultiplier - 1.0));
        cumulativeDistanceInPoints += stepDistance;
      }
      
      const priceChange = cumulativeDistanceInPoints * pointSize;
      const entryPrice = isBuyGrid ? priceNum - priceChange : priceNum + priceChange;
      
      cumulativeLots += currentLot;
      totalCost += entryPrice * currentLot;
      const avgPrice = totalCost / cumulativeLots;

      levels.push(
        <tr key={i} className="border-b border-brand-border/50 last:border-b-0">
          <td className="p-2 text-center font-mono">{i}</td>
          <td className="p-2 text-right font-mono">{entryPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
          <td className="p-2 text-right font-mono">{currentLot.toFixed(2)}</td>
          <td className="p-2 text-right font-mono">{cumulativeLots.toFixed(2)}</td>
          <td className="p-2 text-right font-mono font-semibold">{avgPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
          <td className="p-2 text-center">
            <button
              onClick={() => handlePlaceOrder(isBuyGrid ? 'Buy' : 'Sell', currentLot, entryPrice)}
              className="px-2 py-1 bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-accent text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 w-full"
              title={`Place ${isBuyGrid ? 'Buy' : 'Sell'} Limit Order`}
            >
              <SendIcon className="w-3 h-3"/>
              <span>Place Order</span>
            </button>
          </td>
        </tr>
      );
      
      nextLotToPlace = currentLot * dynamicLotMultiplier;
    }
    return levels;
  };

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6">
      <h2 className="text-2xl font-semibold flex items-center gap-3 mb-6">
          <GridIcon className="w-6 h-6 text-brand-accent"/>
          Manual Grid Planner
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
            <label htmlFor="start-price" className="block text-sm font-medium text-brand-muted mb-1">Grid Start Price</label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <DollarSignIcon className="h-5 w-5 text-brand-muted" />
                </div>
                <input
                    type="text"
                    id="start-price"
                    value={startPrice}
                    onChange={handlePriceChange}
                    placeholder="e.g., 70000"
                    className="w-full bg-brand-primary border border-brand-border rounded-md pl-10 pr-3 py-2 text-white font-mono focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
            </div>
        </div>
        <InputSlider label="Stop Loss (Points)" value={stopLossPoints} onChange={setStopLossPoints} min={100} max={10000} step={50} tooltip="Stop Loss distance in points from the entry price." />
        <InputSlider label="Take Profit (Points)" value={takeProfitPoints} onChange={setTakeProfitPoints} min={100} max={10000} step={50} tooltip="Take Profit distance in points from the entry price." />
      </div>

      <div className="border-t border-b border-brand-border my-6 py-4">
        <h3 className="text-lg font-semibold text-brand-accent flex justify-between items-center mb-4">
          <span className="flex items-center gap-2"><TrendingUpIcon className="w-5 h-5"/> Volatility Adaptation</span>
           <label htmlFor="volatility-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                    <input type="checkbox" id="volatility-toggle" className="sr-only" checked={useVolatility} onChange={(e) => setUseVolatility(e.target.checked)} />
                    <div className="block bg-brand-border w-14 h-8 rounded-full"></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${useVolatility ? 'transform translate-x-6 bg-brand-accent' : ''}`}></div>
                </div>
            </label>
        </h3>
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity duration-300 ${useVolatility ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <InputSlider label="ATR Period" value={atrPeriod} onChange={setAtrPeriod} min={5} max={50} step={1} tooltip="The period for the Average True Range (ATR) calculation." />
          <InputSlider label="Distance Multiplier" value={distanceMultiplier} onChange={setDistanceMultiplier} min={0.1} max={3.0} step={0.1} tooltip="Grid distance will be (ATR * Multiplier)." />
          <InputSlider label="Lot Sensitivity" value={lotSensitivity} onChange={setLotSensitivity} min={0.0} max={1.0} step={0.05} tooltip="Increases lot multiplier based on volatility. Higher means more sensitive." />
        </div>
         {useVolatility && <p className="text-xs text-brand-muted mt-3 text-center">Current H1 ATR ({atrPeriod}): {isLoading ? 'Loading...' : currentAtr ? (currentAtr).toFixed(2) : 'N/A'}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold text-lg text-green-400 mb-2 text-center">Buy Grid (Below Start Price)</h4>
          <div className="overflow-x-auto border border-brand-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-brand-primary/50">
                <tr className="text-left text-brand-muted">
                  <th className="p-2 text-center font-semibold">Level</th>
                  <th className="p-2 text-right font-semibold">Entry Price</th>
                  <th className="p-2 text-right font-semibold">Lots</th>
                  <th className="p-2 text-right font-semibold">Cum. Lots</th>
                  <th className="p-2 text-right font-semibold">Avg. Price</th>
                  <th className="p-2 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="bg-brand-secondary/50">
                {renderGridLevels(true)}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-lg text-red-400 mb-2 text-center">Sell Grid (Above Start Price)</h4>
           <div className="overflow-x-auto border border-brand-border rounded-lg">
             <table className="w-full text-sm">
              <thead className="bg-brand-primary/50">
                 <tr className="text-left text-brand-muted">
                  <th className="p-2 text-center font-semibold">Level</th>
                  <th className="p-2 text-right font-semibold">Entry Price</th>
                  <th className="p-2 text-right font-semibold">Lots</th>
                  <th className="p-2 text-right font-semibold">Cum. Lots</th>
                  <th className="p-2 text-right font-semibold">Avg. Price</th>
                  <th className="p-2 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="bg-brand-secondary/50">
                {renderGridLevels(false)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualGridPlanner;