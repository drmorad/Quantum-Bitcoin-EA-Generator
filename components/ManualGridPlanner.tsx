import React from 'react';
import type { EAConfig } from '../types';
import { GridIcon } from './icons';

interface ManualGridPlannerProps {
  config: EAConfig;
}

const ManualGridPlanner: React.FC<ManualGridPlannerProps> = ({ config }) => {
  const { initialLot, gridDistance, gridMultiplier, maxGridTrades, gridDistanceMultiplier } = config;

  const renderGridLevels = (isBuyGrid: boolean) => {
    const levels = [];
    let cumulativeDistance = 0;
    let currentLot = initialLot;

    for (let i = 1; i <= maxGridTrades; i++) {
      let priceDesc;
      if (i === 1) {
        priceDesc = "Current Price";
      } else {
        // Calculate the dynamic distance for this specific level
        const dynamicDistance = gridDistance * (1 + (i - 2) * (gridDistanceMultiplier - 1.0));
        cumulativeDistance += dynamicDistance;
        priceDesc = `Current ${isBuyGrid ? '-' : '+'} ${cumulativeDistance.toFixed(0)} pts`;
      }

      levels.push(
        <tr key={i} className="border-b border-brand-border/50 last:border-b-0">
          <td className="p-2 text-center">{i}</td>
          <td className="p-2">{priceDesc}</td>
          <td className="p-2 text-right font-mono">{currentLot.toFixed(3)}</td>
        </tr>
      );
      
      currentLot *= gridMultiplier;
    }
    return levels;
  };

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
        <GridIcon className="w-6 h-6 text-brand-accent"/>
        Manual Grid Planner
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-lg mb-2 text-center text-green-400">Buy Grid (Price Drops)</h3>
          <table className="w-full text-sm bg-brand-primary/50 rounded-lg overflow-hidden">
            <thead className="bg-brand-border/50">
              <tr>
                <th className="p-2 font-semibold text-left w-1/6 text-center">Level</th>
                <th className="p-2 font-semibold text-left w-3/6">Entry Price</th>
                <th className="p-2 font-semibold text-right w-2/6">Lot Size</th>
              </tr>
            </thead>
            <tbody>
              {renderGridLevels(true)}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2 text-center text-red-400">Sell Grid (Price Rises)</h3>
          <table className="w-full text-sm bg-brand-primary/50 rounded-lg overflow-hidden">
            <thead className="bg-brand-border/50">
              <tr>
                <th className="p-2 font-semibold text-left w-1/6 text-center">Level</th>
                <th className="p-2 font-semibold text-left w-3/6">Entry Price</th>
                <th className="p-2 font-semibold text-right w-2/6">Lot Size</th>
              </tr>
            </thead>
            <tbody>
              {renderGridLevels(false)}
            </tbody>
          </table>
        </div>
      </div>
       <p className="text-xs text-brand-muted text-center italic mt-4">
        This tool shows hypothetical entry points based on an initial trade at the "Current Price".
      </p>
    </div>
  );
};

export default ManualGridPlanner;