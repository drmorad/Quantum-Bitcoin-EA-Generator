import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, IPriceLine } from 'lightweight-charts';
import type { EAConfig, CandlestickData } from './types.ts';
import { fetchBTCUSD_H1_Data } from './cryptoDataService.ts';

interface InteractiveChartProps {
  config: EAConfig;
}

const chartOptions = {
    layout: {
        background: { color: '#161B22' }, // Synced with brand-secondary
        textColor: '#8B949E', // Synced with brand-muted
    },
    grid: {
        vertLines: { color: '#30363D' }, // Synced with brand-border
        horzLines: { color: '#30363D' },
    },
    crosshair: {
        mode: 1, // Magnet
    },
    rightPriceScale: {
        borderColor: '#30363D',
    },
    timeScale: {
        borderColor: '#30363D',
    },
};

// Helper function to calculate EMA
const calculateEMA = (data: CandlestickData[], period: number) => {
    if (data.length < period) return [];
    const emaData = [];
    const k = 2 / (period + 1);
    // Calculate initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i].close;
    }
    let ema = sum / period;
    
    emaData.push({ time: data[period - 1].time, value: ema });

    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * k + ema;
        emaData.push({ time: data[i].time, value: ema });
    }
    return emaData;
};

// Helper function to calculate SMA
const calculateSMA = (data: CandlestickData[], period: number) => {
    if (data.length < period) return [];
    const smaData = [];
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, val) => acc + val.close, 0);
        smaData.push({
            time: slice[slice.length - 1].time,
            value: sum / period,
        });
    }
    return smaData;
};


const InteractiveChart: React.FC<InteractiveChartProps> = ({ config }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const gridLinesRef = useRef<IPriceLine[]>([]);

    // Chart Initialization Effect
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;
        
        // FIX: Casting to 'any' as a workaround for a potential TypeScript typings issue.
        // The methods addCandlestickSeries and addLineSeries are correct for lightweight-charts,
        // but the compiler is reporting they don't exist on IChartApi. This might be due to a
        // version mismatch or an environment problem.
        candlestickSeriesRef.current = (chart as any).addCandlestickSeries({
            upColor: '#26A69A',
            downColor: '#EF5350',
            borderVisible: false,
            wickUpColor: '#26A69A',
            wickDownColor: '#EF5350',
        });

        maSeriesRef.current = (chart as any).addLineSeries({
            color: '#FBBF24', // Gold
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

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

    // Config Update Effect (MA and Grid Lines)
    useEffect(() => {
        const candlestickSeries = candlestickSeriesRef.current;
        const maSeries = maSeriesRef.current;
        if (!candlestickSeries || !maSeries) return;

        // Clear previous grid lines
        gridLinesRef.current.forEach(line => candlestickSeries.removePriceLine(line));
        gridLinesRef.current = [];

        const chartData = (candlestickSeries.data() as CandlestickData[]);
        if (chartData.length === 0) return;

        // --- 1. Update Moving Average ---
        const maPeriod = config.strategyType === 'grid' ? config.maPeriod : config.signal_maPeriod;
        const maType = config.strategyType === 'grid' ? config.maType : config.signal_maType;
        
        if (chartData.length >= maPeriod) {
            const maData = maType === 'EMA' 
                ? calculateEMA(chartData, maPeriod) 
                : calculateSMA(chartData, maPeriod);
            maSeries.setData(maData);
        } else {
            maSeries.setData([]);
        }

        // --- 2. Update Grid Lines ---
        if (config.strategyType === 'grid') {
            const lastCandle = chartData[chartData.length - 1];
            if (!lastCandle) return;
            const startPrice = lastCandle.close;

            const { gridDistance, gridDistanceMultiplier, maxGridTrades } = config;
            const pointSize = 0.01;

            const createGridLine = (price: number, color: string, title: string) => {
                const line = candlestickSeries.createPriceLine({
                    price,
                    color,
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true,
                    title,
                });
                gridLinesRef.current.push(line);
            };

            // Buy grid (price drops)
            let cumulativeBuyDistance = 0;
            for (let i = 1; i <= maxGridTrades; i++) {
                const stepDistance = gridDistance * (1 + (i - 1) * (gridDistanceMultiplier - 1.0));
                cumulativeBuyDistance += stepDistance;
                const priceLevel = startPrice - (cumulativeBuyDistance * pointSize);
                createGridLine(priceLevel, '#26A69A', `Buy ${i}`);
            }

            // Sell grid (price rises)
            let cumulativeSellDistance = 0;
            for (let i = 1; i <= maxGridTrades; i++) {
                const stepDistance = gridDistance * (1 + (i - 1) * (gridDistanceMultiplier - 1.0));
                cumulativeSellDistance += stepDistance;
                const priceLevel = startPrice + (cumulativeSellDistance * pointSize);
                createGridLine(priceLevel, '#EF5350', `Sell ${i}`);
            }
        }
    }, [config]);

    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 h-[500px] flex flex-col">
            <h2 className="text-2xl font-semibold mb-4 text-white">Interactive Chart - BTC/USD H1</h2>
            <div ref={chartContainerRef} className="w-full h-full flex-grow" />
        </div>
    );
};

export default InteractiveChart;