
import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, UTCTimestamp } from 'lightweight-charts';
import type { EAConfig, CandlestickData } from '../types.ts';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService.ts';

interface InteractiveChartProps {
  config: EAConfig;
}

const chartOptions = {
    layout: {
        background: { color: '#131722' },
        textColor: '#D9D9D9',
    },
    grid: {
        vertLines: { color: '#2A2E39' },
        horzLines: { color: '#2A2E39' },
    },
    crosshair: {
        mode: 1, // Magnet
    },
    rightPriceScale: {
        borderColor: '#485158',
    },
    timeScale: {
        borderColor: '#485158',
    },
};

const InteractiveChart: React.FC<InteractiveChartProps> = ({ config }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        chartRef.current = createChart(chartContainerRef.current, chartOptions);
        candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        maSeriesRef.current = chartRef.current.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
        });

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        fetchBTCUSD_H1_Data()
            .then(data => {
                candlestickSeriesRef.current?.setData(data);
                chartRef.current?.timeScale().fitContent();
            })
            .catch(error => console.error("Failed to fetch chart data:", error));

        return () => {
            window.removeEventListener('resize', handleResize);
            chartRef.current?.remove();
        };
    }, []);

    useEffect(() => {
        if (!candlestickSeriesRef.current || !maSeriesRef.current) return;

        const maPeriod = config.strategyType === 'grid' ? config.maPeriod : config.signal_maPeriod;
        
        candlestickSeriesRef.current.applyOptions({}); // Force redraw to get data
        const chartData = (candlestickSeriesRef.current.data() as CandlestickData[]);
        
        if (chartData.length < maPeriod) {
            maSeriesRef.current.setData([]);
            return;
        }

        const maData = chartData.slice(maPeriod - 1).map((_, index) => {
            const startIndex = index;
            const endIndex = startIndex + maPeriod;
            const dataSlice = chartData.slice(startIndex, endIndex);
            const sum = dataSlice.reduce((acc, val) => acc + val.close, 0);
            return {
                time: dataSlice[dataSlice.length - 1].time,
                value: sum / maPeriod,
            };
        });

        maSeriesRef.current.setData(maData);

    }, [config.maPeriod, config.signal_maPeriod, config.strategyType]);


    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-4 flex flex-col h-[500px]">
            <h3 className="text-xl font-semibold mb-2 text-white">Interactive Chart (BTC/USD H1)</h3>
            <div ref={chartContainerRef} className="w-full h-full flex-grow" />
        </div>
    );
};

export default InteractiveChart;
