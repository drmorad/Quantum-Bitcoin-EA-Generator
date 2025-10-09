
import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, IPriceLine, SeriesMarker, Time } from 'lightweight-charts';
import type { EAConfig, CandlestickData } from '../types.ts';
import { fetchBTCUSD_H1_Data } from '../services/cryptoDataService.ts';
import { calculateSMA, calculateEMA, calculateIchimoku, IchimokuData } from '../services/technicalAnalysisService.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { IchimokuIcon } from './icons.tsx';

// Define colors directly in the component to avoid race conditions with CSS variables.
const chartColors = {
  light: {
    background: 'transparent',
    text: '#6B7280',
    border: '#E5E7EB',
    buy: '#26A69A',
    sell: '#EF5350',
    ma: '#0000FF',
    tenkan: '#0000FF',
    kijun: '#A31515',
    chikou: '#008000',
    kumoUp: 'rgba(38, 166, 154, 0.2)',
    kumoDown: 'rgba(239, 83, 80, 0.2)',
  },
  dark: {
    background: 'transparent',
    text: '#8B949E',
    border: '#2A2D3A',
    buy: '#26A69A',
    sell: '#EF5350',
    ma: '#569CD6',
    tenkan: '#569CD6', // Blue
    kijun: '#CE9178', // Orange
    chikou: '#6A9955', // Green
    kumoUp: 'rgba(38, 166, 154, 0.2)',
    kumoDown: 'rgba(239, 83, 80, 0.2)',
  }
};

interface InteractiveChartProps {
    config: EAConfig;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({ config }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const gridLinesRef = useRef<IPriceLine[]>([]);
    const [theme] = useTheme();

    const [showIchimoku, setShowIchimoku] = useState(false);
    const [ichimokuData, setIchimokuData] = useState<IchimokuData | null>(null);
    const tenkanSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const kijunSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const chikouSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const kumoCloudSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    // Chart Initialization Effect
    useEffect(() => {
        if (!chartContainerRef.current) return;
        
        const currentColors = chartColors[theme];
        const getChartOptions = () => ({
            layout: { background: { color: currentColors.background }, textColor: currentColors.text, },
            grid: { vertLines: { color: currentColors.border }, horzLines: { color: currentColors.border }, },
            crosshair: { mode: 1 },
            rightPriceScale: { borderColor: currentColors.border },
            timeScale: { borderColor: currentColors.border, timeVisible: true, secondsVisible: false, },
        });

        const chart = createChart(chartContainerRef.current, getChartOptions());
        chartRef.current = chart;
        
        // FIX: Cast to 'any' to bypass incorrect TypeScript errors for chart series creation methods.
        candlestickSeriesRef.current = (chart as any).addCandlestickSeries({
            upColor: currentColors.buy, downColor: currentColors.sell,
            borderUpColor: currentColors.buy, borderDownColor: currentColors.sell,
            wickUpColor: currentColors.buy, wickDownColor: currentColors.sell,
        });
        
        // FIX: Cast to 'any' to bypass incorrect TypeScript errors for chart series creation methods.
        maSeriesRef.current = (chart as any).addLineSeries({
            color: currentColors.ma,
            lineWidth: 2,
            lastValueVisible: true, // Show value in price scale
            priceLineVisible: true, // Show horizontal line
            lineStyle: LineStyle.Dashed,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });
        
        // --- Initialize Ichimoku Series ---
        // FIX: Cast to 'any' to bypass incorrect TypeScript errors for chart series creation methods.
        kumoCloudSeriesRef.current = (chart as any).addCandlestickSeries({ upColor: currentColors.kumoUp, downColor: currentColors.kumoDown, wickVisible: false, borderVisible: false, lastValueVisible: false });
        // FIX: Cast to 'any' to bypass incorrect TypeScript errors for chart series creation methods.
        tenkanSeriesRef.current = (chart as any).addLineSeries({ color: currentColors.tenkan, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, title: 'Tenkan' });
        // FIX: Cast to 'any' to bypass incorrect TypeScript errors for chart series creation methods.
        kijunSeriesRef.current = (chart as any).addLineSeries({ color: currentColors.kijun, lineWidth: 2, lastValueVisible: false, priceLineVisible: false, title: 'Kijun' });
        // FIX: Cast to 'any' to bypass incorrect TypeScript errors for chart series creation methods.
        chikouSeriesRef.current = (chart as any).addLineSeries({ color: currentColors.chikou, lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, title: 'Chikou' });

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
        window.addEventListener('resize', handleResize);
        handleResize();

        fetchBTCUSD_H1_Data().then(data => {
            if (candlestickSeriesRef.current && data.length > 0) {
                candlestickSeriesRef.current.setData(data);
                setIchimokuData(calculateIchimoku(data)); // Calculate Ichimoku data on load
                chartRef.current?.timeScale().fitContent();
            }
        }).catch(error => console.error("Failed to fetch chart data:", error));

        return () => {
            window.removeEventListener('resize', handleResize);
            chartRef.current?.remove();
        };
    }, []);

    // Theme & Ichimoku Display Effect
    useEffect(() => {
        const chart = chartRef.current;
        const candlestickSeries = candlestickSeriesRef.current;
        const maSeries = maSeriesRef.current;
        const tenkanSeries = tenkanSeriesRef.current;
        const kijunSeries = kijunSeriesRef.current;
        const chikouSeries = chikouSeriesRef.current;
        const kumoCloudSeries = kumoCloudSeriesRef.current;

        if (!chart || !candlestickSeries || !maSeries || !tenkanSeries || !kijunSeries || !chikouSeries || !kumoCloudSeries) return;
        
        const currentColors = chartColors[theme];

        // Apply theme colors to all chart elements
        chart.applyOptions({
            layout: { background: { color: currentColors.background }, textColor: currentColors.text },
            grid: { vertLines: { color: currentColors.border }, horzLines: { color: currentColors.border } },
            rightPriceScale: { borderColor: currentColors.border },
            timeScale: { borderColor: currentColors.border },
        });
        candlestickSeries.applyOptions({
            upColor: currentColors.buy, downColor: currentColors.sell,
            borderUpColor: currentColors.buy, borderDownColor: currentColors.sell,
            wickUpColor: currentColors.buy, wickDownColor: currentColors.sell,
        });
        maSeries.applyOptions({ color: currentColors.ma });
        tenkanSeries.applyOptions({ color: currentColors.tenkan });
        kijunSeries.applyOptions({ color: currentColors.kijun });
        chikouSeries.applyOptions({ color: currentColors.chikou });
        kumoCloudSeries.applyOptions({ upColor: currentColors.kumoUp, downColor: currentColors.kumoDown });

        if (!ichimokuData) return;

        // --- Handle Showing/Hiding Ichimoku Lines and Signals ---
        if (!showIchimoku) {
            tenkanSeries.setData([]);
            kijunSeries.setData([]);
            chikouSeries.setData([]);
            kumoCloudSeries.setData([]);
            // FIX: Cast to 'any' to bypass incorrect TypeScript error for setMarkers.
            (candlestickSeries as any).setMarkers([]);
            return;
        }

        tenkanSeries.setData(ichimokuData.tenkan);
        kijunSeries.setData(ichimokuData.kijun);
        chikouSeries.setData(ichimokuData.chikou);

        // --- Render the Kumo Cloud ---
        const kumoCloudData: { time: Time; open: number; high: number; low: number; close: number }[] = [];
        const senkouAByTime = new Map(ichimokuData.senkouA.map(d => [d.time, d.value]));
        const senkouBByTime = new Map(ichimokuData.senkouB.map(d => [d.time, d.value]));
        const allKumoTimes = new Set([...senkouAByTime.keys(), ...senkouBByTime.keys()]);

        for (const time of Array.from(allKumoTimes).sort((a,b) => (Number(a) - Number(b)))) {
            const a = senkouAByTime.get(time);
            const b = senkouBByTime.get(time);
            if (typeof a === 'number' && typeof b === 'number') {
                kumoCloudData.push({ time, open: a, high: Math.max(a, b), low: Math.min(a, b), close: b });
            }
        }
        kumoCloudSeries.setData(kumoCloudData);

        // --- Detect and Render Trading Signal Markers ---
        const markers: SeriesMarker<Time>[] = [];
        const tenkanMap = new Map(ichimokuData.tenkan.map(i => [i.time, i.value]));
        const kijunMap = new Map(ichimokuData.kijun.map(i => [i.time, i.value]));
        const priceData = candlestickSeries.data() as CandlestickData[];

        for (let i = 1; i < priceData.length; i++) {
            const prev = priceData[i - 1];
            const curr = priceData[i];

            const tk_prev = tenkanMap.get(prev.time);
            const tk_curr = tenkanMap.get(curr.time);
            const kj_prev = kijunMap.get(prev.time);
            const kj_curr = kijunMap.get(curr.time);
            
            // 1. Tenkan/Kijun Crossover Signal
            if (typeof tk_prev === 'number' && typeof tk_curr === 'number' && typeof kj_prev === 'number' && typeof kj_curr === 'number') {
                if (tk_prev <= kj_prev && tk_curr > kj_curr) {
                    markers.push({ time: curr.time, position: 'belowBar', color: currentColors.buy, shape: 'arrowUp', text: 'TK Cross', size: 1.2 });
                } else if (tk_prev >= kj_prev && tk_curr < kj_curr) {
                    markers.push({ time: curr.time, position: 'aboveBar', color: currentColors.sell, shape: 'arrowDown', text: 'TK Cross', size: 1.2 });
                }
            }
            
            // 2. Kijun-sen Price Cross Signal (Exit/Confirmation)
            if (typeof kj_prev === 'number' && typeof kj_curr === 'number') {
                if (prev.close <= kj_prev && curr.close > kj_curr) {
                    markers.push({ time: curr.time, position: 'belowBar', color: currentColors.tenkan, shape: 'arrowUp', text: 'KJ Cross', size: 0.8 });
                } else if (prev.close >= kj_prev && curr.close < kj_curr) {
                    markers.push({ time: curr.time, position: 'aboveBar', color: currentColors.kijun, shape: 'arrowDown', text: 'KJ Cross', size: 0.8 });
                }
            }

            // 3. Kumo Breakout Signal
            const kumoA = senkouAByTime.get(curr.time);
            const kumoB = senkouBByTime.get(curr.time);
            if (typeof kumoA === 'number' && typeof kumoB === 'number') {
                const kumoTop = Math.max(kumoA, kumoB);
                const kumoBottom = Math.min(kumoA, kumoB);
                if (prev.close <= kumoTop && curr.close > kumoTop) {
                    markers.push({ time: curr.time, position: 'belowBar', color: currentColors.buy, shape: 'circle', text: 'Kumo Break', size: 1 });
                } else if (prev.close >= kumoBottom && curr.close < kumoBottom) {
                    markers.push({ time: curr.time, position: 'aboveBar', color: currentColors.sell, shape: 'circle', text: 'Kumo Break', size: 1 });
                }
            }
        }
        // FIX: Cast to 'any' to bypass incorrect TypeScript error for setMarkers.
        (candlestickSeries as any).setMarkers(markers);
    }, [showIchimoku, ichimokuData, theme]);

    // Config Update Effect (MA and Grid lines)
    useEffect(() => {
        const candlestickSeries = candlestickSeriesRef.current;
        const maSeries = maSeriesRef.current;
        if (!candlestickSeries || !maSeries) return;

        gridLinesRef.current.forEach(line => candlestickSeries.removePriceLine(line));
        gridLinesRef.current = [];
        const chartData = (candlestickSeries.data() as CandlestickData[]);
        if (chartData.length === 0) return;

        const maPeriod = (config.strategyType === 'grid' ? config.maPeriod : config.signal_maPeriod) ?? 50;
        const maType = config.strategyType === 'grid' ? config.maType : config.signal_maType;
        
        maSeries.applyOptions({
            title: `${maType} (${maPeriod})`,
        });
        
        if (chartData.length >= maPeriod) {
            let maData = maType === 'EMA' ? calculateEMA(chartData.map(d => d.close), maPeriod).map((val, idx) => ({ time: chartData[chartData.length - (chartData.map(d => d.close).length - maPeriod + 1) + idx + 1]?.time, value: val })) : calculateSMA(chartData, maPeriod);
            maSeries.setData(maData.filter(d => d.time && typeof d.value === 'number'));
        } else {
            maSeries.setData([]);
        }

        if (config.strategyType === 'grid') {
            const lastCandle = chartData[chartData.length - 1];
            if (!lastCandle) return;
            const startPrice = lastCandle.close;
            const { gridDistance = 2000, gridDistanceMultiplier = 1.0, maxGridTrades = 3 } = config;
            const pointSize = 0.01;
            const createGridLine = (price: number, color: string, title: string) => {
                gridLinesRef.current.push(candlestickSeries.createPriceLine({ price, color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title }));
            };
            let cumBuyDist = 0;
            for (let i = 1; i <= maxGridTrades; i++) {
                cumBuyDist += gridDistance * (1 + (i - 1) * (gridDistanceMultiplier - 1.0));
                createGridLine(startPrice - (cumBuyDist * pointSize), 'rgba(38, 166, 154, 0.7)', `Buy ${i}`);
            }
            let cumSellDist = 0;
            for (let i = 1; i <= maxGridTrades; i++) {
                cumSellDist += gridDistance * (1 + (i - 1) * (gridDistanceMultiplier - 1.0));
                createGridLine(startPrice + (cumSellDist * pointSize), 'rgba(239, 83, 80, 0.7)', `Sell ${i}`);
            }
        }
    }, [config]);

    return (
        <div className="bg-brand-secondary border border-brand-border rounded-lg p-4 h-[550px] flex flex-col">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h2 className="text-lg font-semibold text-brand-text">Interactive Chart - BTC/USD H1</h2>
                 <label htmlFor="ichimoku-toggle" className="flex items-center gap-2 cursor-pointer text-sm text-brand-muted hover:text-brand-text transition-colors">
                    <IchimokuIcon className="w-5 h-5"/>
                    <span>Ichimoku Cloud</span>
                    <div className="relative">
                        <input type="checkbox" id="ichimoku-toggle" className="sr-only" checked={showIchimoku} onChange={(e) => setShowIchimoku(e.target.checked)} />
                        <div className="block bg-brand-border w-10 h-6 rounded-full"></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${showIchimoku ? 'transform translate-x-4 bg-brand-accent' : ''}`}></div>
                    </div>
                </label>
            </div>
            <div ref={chartContainerRef} className="w-full h-full flex-grow" />
        </div>
    );
};

export default InteractiveChart;