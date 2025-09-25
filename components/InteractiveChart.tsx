

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, IPriceLine } from 'lightweight-charts';
import type { EAConfig, CandlestickData } from '../types.ts';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService.ts';
import { calculateSMA, calculateEMA } from '../services/technicalAnalysisService.ts';

interface InteractiveChartProps {
  config: EAConfig;
}

const chartOptions = {
    layout: {
        background: { color: 'transparent' },
        textColor: 'var(--color-text-muted)',
    },
    grid: {
        vertLines: { color: 'var(--color-border)' },
        horzLines: { color: 'var(--color-border)' },
    },
    crosshair: {
        mode: 1, // Magnet
    },
    rightPriceScale: {
        borderColor: 'var(--color-border)',
    },
    timeScale: {
        borderColor: 'var(--color-border)',
        timeVisible: true,
        secondsVisible: false,
    },
};

const InteractiveChart: React.FC<InteractiveChartProps> = ({ config }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const gridLinesRef = useRef<IPriceLine[]>([]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;
        
        candlestickSeriesRef.current = chart.addCandlestickSeries({
            upColor: '#26A69A',
            downColor: 'var(--color-bg-primary)',
            borderUpColor: '#26A69A',
            borderDownColor: '#EAECEF',
            wickUpColor: '#26A69A',
            wickDownColor: '#EAECEF',
        });
        
        maSeriesRef.current = chart.addLineSeries({ color: '#569CD6', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial resize

        fetchBTCUSD_H1_Data()
            .then(data => {
                if (candlestickSeriesRef.current && data.length > 0) {
                    candlestickSeriesRef.current.setData(data);
                    chartRef.current?.timeScale().fitContent();
                }
            })
            .catch(error => console.error("Failed to fetch chart data:", error));

        return () => {
            window.removeEventListener('resize', handleResize);
            chartRef.current?.remove();
        };
    }, []);

    useEffect(() => {
        const candlestickSeries = candlestickSeriesRef.current;
        const maSeries = maSeriesRef.current;
        if (!candlestickSeries || !maSeries) return;

        gridLinesRef.current.forEach(line => candlestickSeries.removePriceLine(line));
        gridLinesRef.current = [];

        const chartData = (candlestickSeries.data() as CandlestickData[]);
        if (chartData.length === 0) return;

        // --- 1. Update Moving Average ---
        const maPeriod = (config.strategyType === 'grid' ? config.maPeriod : config.signal_maPeriod) ?? 50;
        const maType = config.strategyType === 'grid' ? config.maType : config.signal_maType;
        if (chartData.length >= maPeriod) {
            let maData;
            if (maType === 'EMA') {
               const emaValues = calculateEMA(chartData.map(d => d.close), maPeriod);
               maData = chartData.slice(chartData.length - emaValues.length).map((d, i) => ({ time: d.time, value: emaValues[i] }));
            } else {
               maData = calculateSMA(chartData, maPeriod);
            }
            const filteredMaData = maData.filter(d => d.value != null && !isNaN(d.value));
            maSeries.setData(filteredMaData);
        } else {
            maSeries.setData([]);
        }

        // --- 2. Update Grid Lines (if applicable) ---
        if (config.strategyType === 'grid') {
            const lastCandle = chartData[chartData.length - 1];
            if (!lastCandle) return;
            const startPrice = lastCandle.close;

            const gridDistance = config.gridDistance ?? 2000;
            const gridDistanceMultiplier = config.gridDistanceMultiplier ?? 1.0;
            const maxGridTrades = config.maxGridTrades ?? 3;
            const pointSize = 0.01;

            const createGridLine = (price: number, color: string, title: string) => {
                const line = candlestickSeries.createPriceLine({ 
                    price, 
                    color, 
                    lineWidth: 1, 
                    lineStyle: LineStyle.Dotted, 
                    axisLabelVisible: true, 
                    title 
                });
                gridLinesRef.current.push(line);
            };

            let cumulativeBuyDistance = 0;
            for (let i = 1; i <= maxGridTrades; i++) {
                const stepDistance = gridDistance * (1 + (i - 1) * (gridDistanceMultiplier - 1.0));
                cumulativeBuyDistance += stepDistance;
                createGridLine(startPrice - (cumulativeBuyDistance * pointSize), 'rgba(38, 166, 154, 0.7)', `Buy ${i}`);
            }

            let cumulativeSellDistance = 0;
            for (let i = 1; i <= maxGridTrades; i++) {
                const stepDistance = gridDistance * (1 + (i - 1) * (gridDistanceMultiplier - 1.0));
                cumulativeSellDistance += stepDistance;
                createGridLine(startPrice + (cumulativeSellDistance * pointSize), 'rgba(239, 83, 80, 0.7)', `Sell ${i}`);
            }
        }
    }, [config]);

    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-4 h-[550px] flex flex-col">
            <h2 className="text-lg font-semibold mb-2 text-brand-text flex-shrink-0">Interactive Chart - BTC/USD H1</h2>
            <div ref={chartContainerRef} className="w-full h-full flex-grow" />
        </div>
    );
};

export default InteractiveChart;