import React from 'react';
import { ChartBarIcon } from './icons';

const TradingViewWidget: React.FC = () => {
  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-[500px]">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3 flex-shrink-0">
        <ChartBarIcon className="w-6 h-6 text-brand-accent" />
        BTCUSD H1 Live Chart
      </h2>
      <div className="flex-grow w-full h-full">
        <iframe
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_b7f6f&symbol=COINBASE%3ABTCUSD&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=COINBASE%3ABTCUSD"
          className="w-full h-full"
          frameBorder="0"
          allowTransparency={true}
          scrolling="no"
          title="TradingView BTCUSD Chart"
          aria-label="TradingView BTCUSD Chart"
        ></iframe>
      </div>
    </div>
  );
};

export default TradingViewWidget;
