
import React, { useState } from 'react';
// FIX: Use explicit file extension for imports
import type { EAConfig } from '../types.ts';
import { GridIcon, DollarSignIcon, SendIcon } from './icons.tsx';

interface ManualGridPlannerProps {
  config: EAConfig;
}

const ManualGridPlanner: React.FC<ManualGridPlannerProps> = ({ config }) => {
  const { initialRiskPercent, gridDistance, gridMultiplier, maxGridTrades, gridDistanceMultiplier, initialDeposit } = config;
  const [startPrice, setStartPrice] = useState('70000');

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid number format
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setStartPrice(value);
    }
  };
  
  // Calculate a sample initial lot size for display purposes based on settings
  const calculatedInitialLot = (initialDeposit / 10000.0) * (initialRiskPercent / 100.0);
  // Simple normalization, assuming 0.001 lot step for BTC
  const displayInitialLot = Math.max(0.001, Math.floor(calculatedInitialLot / 0.001) * 0.001);


  const handlePlaceOrder = (orderType: 'Buy' | 'Sell', lotSize: number, entryPrice: number) => {
    console.log(`[SIMULATED ORDER] Place ${orderType} Limit order: ${lotSize.toFixed(3)} lots @ ${entryPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);
    // This function can be expanded to integrate with a trading platform API in the future.
  };
  
  const pointSize = 0.01; // For BTCUSD, 1 point = 0.01 USD

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

    let cumulativeLots = 0;
    let totalCost = 0;
    let currentLot = displayInitialLot;

    for (let i = 1; i <= maxGridTrades; i++) {
      let entryPrice: number;
      
      // The first trade is at the start price
      if (i === 1) {
          entryPrice = priceNum;
      } else {
        // Recalculating from scratch to be more accurate
        let currentCumulativeDistance = 0;
        for (let j = 1; j < i; j++) {
            currentCumulativeDistance += gridDistance * (1 + (j - 1) * (gridDistanceMultiplier - 1.0));
        }
        const priceChange = currentCumulativeDistance * pointSize;
        entryPrice = isBuyGrid ? priceNum - priceChange : priceNum + priceChange;
      }
      
      cumulativeLots += currentLot;
      totalCost += entryPrice * currentLot;
      const avgPrice = totalCost / cumulativeLots;

      levels.push(
        <tr key={i} className="border-b border-brand-border/50 last:border-b-0">
          <td className="p-2 text-center font-mono">{i}</td>
          <td className="p-2 text-right font-mono">{entryPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
          <td className="p-2 text-right font-mono">{currentLot.toFixed(3)}</td>
          <td className="p-2 text-right font-mono">{cumulativeLots.toFixed(3)}</td>
          <td className="p-2 text-right font-mono font-semibold">{avgPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
          <td className="p-2 text-center">
            <button
              onClick={() => handlePlaceOrder(isBuyGrid ? 'Buy' : 'Sell', currentLot, entryPrice)}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 w-full ${isBuyGrid ? 'bg-brand-buy/20 hover:bg-brand-buy/40 text-brand-buy' : 'bg-brand-sell/20 hover:bg-brand-sell/40 text-brand-sell'}`}
              title={`Place ${isBuyGrid ? 'Buy' : 'Sell'} Limit Order`}
            >
              <SendIcon className="w-3 h-3"/>
              <span>Place {isBuyGrid ? 'Buy' : 'Sell'}</span>
            </button>
          </td>
        </tr>
      );
      
      // For the next level, the first lot has already been set, subsequent lots are multiplied
      if (i === 1) {
          currentLot *= gridMultiplier;
      } else {
          currentLot *= gridMultiplier;
      }
    }
    return levels;
  };

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
        <h2 className="text-2xl font-semibold flex items-center gap-3 mb-3 md:mb-0">
          <GridIcon className="w-6 h-6 text-brand-accent"/>
          Manual Grid Planner
        </h2>
        <div className="flex-shrink-0">
          <label htmlFor="start-price" className="block text-sm font-medium text-brand-muted mb-1">Grid Start Price (USD)</label>
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
              className="w-full md:w-48 bg-brand-primary border border-brand-border rounded-md pl-10 pr-3 py-2 text-white font-mono focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            />
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-brand-muted mb-4">
        Based on your settings, the estimated initial lot size for a ${initialDeposit.toLocaleString()} deposit is <strong>~{displayInitialLot.toFixed(3)}</strong>.
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-lg mb-2 text-center text-brand-buy">Buy Grid (Price Drops)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-sm bg-brand-primary/50 rounded-lg">
              <thead className="bg-brand-border/50">
                <tr>
                  <th className="p-2 font-semibold text-center">#</th>
                  <th className="p-2 font-semibold text-right">Entry Price</th>
                  <th className="p-2 font-semibold text-right">Lot Size</th>
                  <th className="p-2 font-semibold text-right">Cum. Lots</th>
                  <th className="p-2 font-semibold text-right">Avg. Price</th>
                  <th className="p-2 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {renderGridLevels(true)}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2 text-center text-brand-sell">Sell Grid (Price Rises)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-sm bg-brand-primary/50 rounded-lg">
              <thead className="bg-brand-border/50">
                <tr>
                  <th className="p-2 font-semibold text-center">#</th>
                  <th className="p-2 font-semibold text-right">Entry Price</th>
                  <th className="p-2 font-semibold text-right">Lot Size</th>
                  <th className="p-2 font-semibold text-right">Cum. Lots</th>
                  <th className="p-2 font-semibold text-right">Avg. Price</th>
                  <th className="p-2 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {renderGridLevels(false)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
       <p className="text-xs text-brand-muted text-center italic mt-4">
        Enter a price to plan your grid. This tool shows hypothetical entry points and the resulting average price.
      </p>
    </div>
  );
};

export default ManualGridPlanner;
