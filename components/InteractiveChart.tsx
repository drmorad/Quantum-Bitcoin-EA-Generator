import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, CandlestickData as LightweightCandlestickData, IPriceLine } from 'lightweight-charts';
import type { EAConfig, CandlestickData } from '../types';
import { ChartBarIcon } from './icons';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService';

interface InteractiveChartProps {
  config: EAConfig;
}

const chartOptions = {
    layout: {
        background: { type: ColorType.Solid, color: '#161B22' },
        textColor: '#8B949E',
    },
    grid: {
        vertLines: { color: '#30363D' },
        horzLines: { color: '#30363D' },
    },
    timeScale: {
        borderColor: '#30363D',
        timeVisible: true,
        secondsVisible: false,
    },
    rightPriceScale: {
        borderColor: '#30363D',
    },
};

const candleSeriesOptions = {
    upColor: '#26A69A',
    downColor: '#EF5350',
    borderDownColor: '#EF5350',
    borderUpColor: '#26A69A',
    wickDownColor: '#EF5350',
    wickUpColor: '#26A69A',
};


const InteractiveChart: React.FC<InteractiveChartProps> = ({ config }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const maSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const gridLinesRef = useRef<IPriceLine[]>([]);
    const maLabelLineRef = useRef<IPriceLine | null>(null);
    
    const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchBTCUSD_H1_Data();
                setCandlestickData(data);
            } catch (err) {
                setError("Failed to fetch market data. Please try again later.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        getData();
    }, []);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;
        
        // Cast to 'any' to bypass a likely type definition mismatch in the environment.
        // The 'addCandlestickSeries' and 'addLineSeries' methods exist on the chart object at runtime.
        candleSeriesRef.current = (chart as any).addCandlestickSeries(candleSeriesOptions);
        maSeriesRef.current = (chart as any).addLineSeries({ color: '#58A6FF', lineWidth: 2, crosshairMarkerVisible: false });
        
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (candlestickData.length > 0 && candleSeriesRef.current) {
            candleSeriesRef.current.setData(candlestickData as LightweightCandlestickData[]);
            chartRef.current?.timeScale().fitContent();
        }
    }, [candlestickData]);

    useEffect(() => {
        if (!candleSeriesRef.current || !maSeriesRef.current || candlestickData.length === 0) return;

        // Clear previous grid lines and MA label before drawing new ones
        gridLinesRef.current.forEach(line => candleSeriesRef.current!.removePriceLine(line));
        gridLinesRef.current = [];
        if (maLabelLineRef.current) {
            maSeriesRef.current.removePriceLine(maLabelLineRef.current);
            maLabelLineRef.current = null;
        }

        // --- Calculate and draw Moving Average ---
        const maData = config.maType === 'EMA' 
            ? calculateEMA(candlestickData, config.maPeriod) 
            : calculateSMA(candlestickData, config.maPeriod);
            
        maSeriesRef.current.setData(maData);
        
        // Add MA Label to the price axis
        if (maData.length > 0) {
            const lastMaValue = maData[maData.length - 1].value;
            const maLabelLine = maSeriesRef.current.createPriceLine({
                price: lastMaValue,
                color: 'rgba(88, 166, 255, 0.8)',
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                axisLabelVisible: true,
                title: ` ${config.maType} (${config.maPeriod}) `,
            });
            maLabelLineRef.current = maLabelLine;
        }

        // --- Calculate and draw Grid Lines ---
        const lastPrice = candlestickData[candlestickData.length - 1].close;
        const pointSize = 0.01; // For BTCUSD, 1 point = 0.01 USD

        // Buy Grid (below current price)
        let cumulativeBuyDistance = 0;
        for (let i = 1; i < config.maxGridTrades; i++) {
            const dynamicDistance = config.gridDistance * (1 + (i - 1) * (config.gridDistanceMultiplier - 1.0));
            cumulativeBuyDistance += dynamicDistance;
            const price = lastPrice - (cumulativeBuyDistance * pointSize);
            const line = candleSeriesRef.current.createPriceLine({
                price,
                color: 'rgba(38, 166, 154, 0.7)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: `Buy ${i}`,
            });
            gridLinesRef.current.push(line);
        }

        // Sell Grid (above current price)
        let cumulativeSellDistance = 0;
        for (let i = 1; i < config.maxGridTrades; i++) {
            const dynamicDistance = config.gridDistance * (1 + (i - 1) * (config.gridDistanceMultiplier - 1.0));
            cumulativeSellDistance += dynamicDistance;
            const price = lastPrice + (cumulativeSellDistance * pointSize);
             const line = candleSeriesRef.current.createPriceLine({
                price,
                color: 'rgba(239, 83, 80, 0.7)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: `Sell ${i}`,
            });
            gridLinesRef.current.push(line);
        }

    }, [config, candlestickData]);

    const calculateSMA = (data: CandlestickData[], period: number) => {
        if (data.length < period) return [];
        const smaData = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            smaData.push({ time: data[i].time, value: sum / period });
        }
        return smaData;
    }

    const calculateEMA = (data: CandlestickData[], period: number) => {
        if (data.length < period) return [];
        const emaData = [];
        const k = 2 / (period + 1);
        let ema = 0;
        // Calculate initial SMA
        for (let i = 0; i < period; i++) {
            ema += data[i].close;
        }
        ema /= period;
        emaData.push({ time: data[period - 1].time, value: ema });
        // Calculate rest of EMA
        for (let i = period; i < data.length; i++) {
            ema = (data[i].close - ema) * k + ema;
            emaData.push({ time: data[i].time, value: ema });
        }
        return emaData;
    }


    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-[500px]">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3 flex-shrink-0">
                <ChartBarIcon className="w-6 h-6 text-brand-accent" />
                Interactive Chart (BTCUSD H1)
            </h2>
            <div className="flex-grow w-full h-full relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary/80 z-10">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto"></div>
                            <p className="mt-2 text-brand-muted">Loading Live Market Data...</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary/80 z-10">
                        <p className="text-red-400 text-center">{error}</p>
                    </div>
                )}
                <div ref={chartContainerRef} className="w-full h-full" />
            </div>
        </div>
    );
};

export default InteractiveChart;