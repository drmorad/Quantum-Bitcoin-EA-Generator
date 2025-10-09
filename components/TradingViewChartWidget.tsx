import React, { useEffect, useRef } from 'react';

interface TradingViewChartWidgetProps {
    theme: 'light' | 'dark';
}

const TradingViewChartWidget: React.FC<TradingViewChartWidgetProps> = ({ theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.innerHTML = ''; 

            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
            script.type = 'text/javascript';
            script.async = true;
            script.innerHTML = JSON.stringify({
                "autosize": true,
                "symbol": "COINBASE:BTCUSD",
                "interval": "60",
                "timezone": "Etc/UTC",
                "theme": theme,
                "style": "1",
                "locale": "en",
                "enable_publishing": false,
                "withdateranges": false,
                "hide_side_toolbar": false,
                "allow_symbol_change": true,
                "container_id": "tradingview_chart_container"
            });

            containerRef.current.appendChild(script);
        }
    }, [theme]);

    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-4 h-[550px] flex flex-col">
            <h2 className="text-lg font-semibold text-brand-text mb-2 flex-shrink-0">
                Live Chart - BTC/USD H1
            </h2>
            <div id="tradingview_chart_container" ref={containerRef} className="w-full h-full flex-grow" />
        </div>
    );
};

export default TradingViewChartWidget;
