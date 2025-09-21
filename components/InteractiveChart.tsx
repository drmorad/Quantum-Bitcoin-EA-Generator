import React, { useEffect, useRef, useState } from 'react';
import {
    createChart,
    ColorType,
    LineStyle,
    type IChartApi,
    type ISeriesApi,
    type CandlestickSeriesOptions,
    type ChartOptions,
    type DeepPartial,
    type IPriceLine,
    type LineData,
    type MouseEventParams,
    type CandlestickData as LightweightCandlestickData,
} from 'lightweight-charts';
import type { EAConfig, CandlestickData, TickerData } from '../types';
import { ChartBarIcon } from './icons';
import { fetchBTCUSD_H1_Data, priceStreamService } from '../services/cryptoDataService';

interface InteractiveChartProps {
    config: EAConfig;
}

const chartOptions: DeepPartial<ChartOptions> = {
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
    crosshair: {
        mode: 0, // Magnet mode
    },
};

const candleSeriesOptions: DeepPartial<CandlestickSeriesOptions> = {
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
    
    const gridLinesRef = useRef<{ buy: IPriceLine; sell: IPriceLine }[]>([]);
    const maLabelLineRef = useRef<IPriceLine | null>(null);
    const trailingStopLinesRef = useRef<{ buy: IPriceLine | null, sell: IPriceLine | null }>({ buy: null, sell: null });
    
    const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
    const [maData, setMaData] = useState<LineData[]>([]);
    const lastCandleRef = useRef<CandlestickData | null>(null);
    const [latestTick, setLatestTick] = useState<TickerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: React.ReactNode } | null>(null);
    const [showGridLines, setShowGridLines] = useState(true);

    useEffect(() => {
        const getData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchBTCUSD_H1_Data();
                setCandlestickData(data);
                if (data.length > 0) {
                    lastCandleRef.current = { ...data[data.length - 1] };
                }
            } catch (err) {
                setError("Failed to fetch market data.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        getData();
    }, []);

    useEffect(() => {
        const handleUpdate = (data: TickerData | null, error: Error | null) => {
            if (data && !error) setLatestTick(data);
        };
        priceStreamService.subscribe(handleUpdate);
        return () => priceStreamService.unsubscribe(handleUpdate);
    }, []);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;
        
        // FIX: Cast chart to 'any' to resolve typing error where 'addCandlestickSeries' is not found.
        // This is likely due to a type definition mismatch in the project's environment.
        candleSeriesRef.current = (chart as any).addCandlestickSeries(candleSeriesOptions);
        // FIX: Cast chart to 'any' to resolve typing error where 'addLineSeries' is not found.
        maSeriesRef.current = (chart as any).addLineSeries({ color: '#F97316', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
        window.addEventListener('resize', handleResize);

        const crosshairMoveHandler = (param: MouseEventParams) => {
            const container = chartContainerRef.current;
            if (!param.point || !param.time || !container || !candleSeriesRef.current || !maSeriesRef.current) {
                setTooltip(null);
                return;
            }

            const candleData = param.seriesData.get(candleSeriesRef.current) as LightweightCandlestickData | undefined;
            const maDataPoint = param.seriesData.get(maSeriesRef.current) as LineData | undefined;

            if (!candleData) {
                setTooltip(null);
                return;
            }

            const date = new Date((candleData.time as number) * 1000);
            const content = (
                <div className="space-y-1 w-44">
                    <p className="font-bold text-brand-muted">{date.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <div className="border-t border-brand-border my-1"></div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3">
                        <span className="text-brand-muted">O:</span><span className="text-right font-mono">{candleData.open.toFixed(2)}</span>
                        <span className="text-brand-buy">H:</span><span className="text-right font-mono text-brand-buy">{candleData.high.toFixed(2)}</span>
                        <span className="text-brand-sell">L:</span><span className="text-right font-mono text-brand-sell">{candleData.low.toFixed(2)}</span>
                        <span className="text-brand-muted">C:</span><span className="text-right font-mono">{candleData.close.toFixed(2)}</span>
                    </div>
                    {maDataPoint && (
                         <p style={{ color: '#F97316' }} className="border-t border-brand-border/50 pt-1 mt-1">
                            MA: <span className="font-mono float-right">{maDataPoint.value.toFixed(2)}</span>
                        </p>
                    )}
                </div>
            );

            const toolTipWidth = 180;
            const toolTipMargin = 15;
            let left = param.point.x + toolTipMargin;
            if (left + toolTipWidth > container.clientWidth) {
                left = param.point.x - toolTipWidth - toolTipMargin;
            }
            let top = param.point.y + toolTipMargin;
            if (top + 130 > container.clientHeight) {
                top = param.point.y - 130 - toolTipMargin;
            }
            
            setTooltip({ visible: true, x: left, y: top, content });
        };

        chart.subscribeCrosshairMove(crosshairMoveHandler);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.unsubscribeCrosshairMove(crosshairMoveHandler);
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        gridLinesRef.current.forEach(pair => {
            pair.buy.applyOptions({ lineVisible: showGridLines });
            pair.sell.applyOptions({ lineVisible: showGridLines });
        });
    }, [showGridLines]);

    useEffect(() => {
        if (!chartRef.current || !candleSeriesRef.current || !maSeriesRef.current || candlestickData.length === 0) return;
        
        const candleSeries = candleSeriesRef.current;
        const maSeries = maSeriesRef.current;
        
        candleSeries.setData(candlestickData);
        chartRef.current.timeScale().fitContent();

        const maPeriod = config.strategyType === 'grid' ? config.maPeriod : config.signal_maPeriod;
        const maType = config.strategyType === 'grid' ? config.maType : config.signal_maType;
        const newMaData: LineData[] = [];
        
        if (candlestickData.length >= maPeriod) {
            if (maType === 'SMA') {
                for (let i = maPeriod - 1; i < candlestickData.length; i++) {
                    const sum = candlestickData.slice(i - maPeriod + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
                    newMaData.push({ time: candlestickData[i].time, value: sum / maPeriod });
                }
            } else { // EMA
                let ema = candlestickData.slice(0, maPeriod).reduce((acc, val) => acc + val.close, 0) / maPeriod;
                newMaData.push({ time: candlestickData[maPeriod - 1].time, value: ema });
                const multiplier = 2 / (maPeriod + 1);
                for (let i = maPeriod; i < candlestickData.length; i++) {
                    ema = (candlestickData[i].close - ema) * multiplier + ema;
                    newMaData.push({ time: candlestickData[i].time, value: ema });
                }
            }
        }
        setMaData(newMaData);
        maSeries.setData(newMaData);

        gridLinesRef.current.forEach(pair => {
            candleSeries.removePriceLine(pair.buy);
            candleSeries.removePriceLine(pair.sell);
        });
        gridLinesRef.current = [];
        if (maLabelLineRef.current) candleSeries.removePriceLine(maLabelLineRef.current);
        if (trailingStopLinesRef.current.buy) candleSeries.removePriceLine(trailingStopLinesRef.current.buy);
        if (trailingStopLinesRef.current.sell) candleSeries.removePriceLine(trailingStopLinesRef.current.sell);
        trailingStopLinesRef.current = { buy: null, sell: null };

        maLabelLineRef.current = candleSeries.createPriceLine({ price: 0, color: '#F97316', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `MA(${maPeriod})` });

        if (config.strategyType === 'grid') {
            for (let i = 1; i < config.maxGridTrades; i++) {
                const lineOptions = { price: 0, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: `Grid ${i}`, lineVisible: showGridLines } as const;
                const buyLine = candleSeries.createPriceLine({ ...lineOptions, color: '#26A69A' });
                const sellLine = candleSeries.createPriceLine({ ...lineOptions, color: '#EF5350' });
                gridLinesRef.current.push({ buy: buyLine, sell: sellLine });
            }
            if (config.useTrailingStop) {
                const tsLineOptions = { price: 0, lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Trailing SL' } as const;
                trailingStopLinesRef.current.buy = candleSeries.createPriceLine({ ...tsLineOptions, color: '#26A69A' });
                trailingStopLinesRef.current.sell = candleSeries.createPriceLine({ ...tsLineOptions, color: '#EF5350' });
            }
        }
    }, [candlestickData, config]);

    useEffect(() => {
        if (!latestTick || !lastCandleRef.current || !candleSeriesRef.current || !maSeriesRef.current || maData.length === 0) return;

        const candleSeries = candleSeriesRef.current;
        const maSeries = maSeriesRef.current;

        const newCandleData: CandlestickData = {
            ...lastCandleRef.current,
            high: Math.max(lastCandleRef.current.high, latestTick.price),
            low: Math.min(lastCandleRef.current.low, latestTick.price),
            close: latestTick.price,
        };
        candleSeries.update(newCandleData);
        lastCandleRef.current = newCandleData;

        const maPeriod = config.strategyType === 'grid' ? config.maPeriod : config.signal_maPeriod;
        const maType = config.strategyType === 'grid' ? config.maType : config.signal_maType;
        const lastMaPoint = maData[maData.length - 1];
        let newMaValue;

        if (maType === 'SMA' && candlestickData.length >= maPeriod) {
            const oldestClose = candlestickData[candlestickData.length - maPeriod].close;
            const previousSum = lastMaPoint.value * maPeriod;
            newMaValue = (previousSum - oldestClose + newCandleData.close) / maPeriod;
        } else { // EMA
            const multiplier = 2 / (maPeriod + 1);
            newMaValue = (newCandleData.close - lastMaPoint.value) * multiplier + lastMaPoint.value;
        }

        if (newMaValue) {
            maSeries.update({ time: lastMaPoint.time, value: newMaValue });
            maLabelLineRef.current?.applyOptions({ price: newMaValue });
        }

        if (config.strategyType === 'grid') {
            const { gridDistance, gridDistanceMultiplier } = config;
            const pointSize = 0.01;
            let cumulativeDistance = 0;

            gridLinesRef.current.forEach((pair, index) => {
                const stepDistance = gridDistance * (1 + index * (gridDistanceMultiplier - 1.0));
                cumulativeDistance += stepDistance;
                const priceChange = cumulativeDistance * pointSize;
                pair.buy.applyOptions({ price: latestTick.price - priceChange });
                pair.sell.applyOptions({ price: latestTick.price + priceChange });
            });

            if (config.useTrailingStop && trailingStopLinesRef.current.buy && trailingStopLinesRef.current.sell) {
                const { trailingStopDistance } = config;
                const buySLPrice = latestTick.price - (trailingStopDistance * pointSize);
                const sellSLPrice = latestTick.price + (trailingStopDistance * pointSize);
                trailingStopLinesRef.current.buy.applyOptions({ price: buySLPrice });
                trailingStopLinesRef.current.sell.applyOptions({ price: sellSLPrice });
            }
        }
    }, [latestTick, config, candlestickData, maData]);

    return (
      <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 flex flex-col h-[500px]">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-3">
              <ChartBarIcon className="w-6 h-6 text-brand-accent"/>
              Interactive Chart
            </h2>
            {config.strategyType === 'grid' && (
              <label htmlFor="grid-lines-toggle" className="flex items-center cursor-pointer text-sm">
                <span className="mr-3 text-brand-muted">Show Grid Lines</span>
                <div className="relative">
                  <input
                    id="grid-lines-toggle"
                    type="checkbox"
                    className="sr-only"
                    checked={showGridLines}
                    onChange={(e) => setShowGridLines(e.target.checked)}
                  />
                  <div className="block bg-brand-border w-14 h-8 rounded-full"></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${showGridLines ? 'transform translate-x-6 bg-brand-accent' : ''}`}></div>
                </div>
              </label>
            )}
        </div>
        <div className="relative flex-grow">
          {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary/80 z-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div></div>}
          {error && <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-10 text-red-300">{error}</div>}
          <div ref={chartContainerRef} className="w-full h-full" />
          {tooltip?.visible && (
            <div
                className="absolute z-20 p-3 text-sm text-white rounded-md pointer-events-none bg-brand-primary/80 backdrop-blur-sm border border-brand-border shadow-lg"
                style={{ top: tooltip.y, left: tooltip.x }}
            >
                {tooltip.content}
            </div>
          )}
        </div>
      </div>
    );
};

export default InteractiveChart;
