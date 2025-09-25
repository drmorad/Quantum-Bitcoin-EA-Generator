
import type { EAConfig, CandlestickData, LiveAnalysisData, MAType } from '../types.ts';
import type { Time } from 'lightweight-charts';

/**
 * Calculates the Exponential Moving Average (EMA) for a series of data.
 * @param data - The input data points (numbers).
 * @param period - The EMA period.
 * @returns An array of EMA values.
 */
export const calculateEMA = (data: number[], period: number): number[] => {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const emaArray: number[] = [];
    let sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emaArray.push(sma);
    for (let i = period; i < data.length; i++) {
        const ema = (data[i] * k) + (emaArray[emaArray.length - 1] * (1 - k));
        emaArray.push(ema);
    }
    return emaArray;
};

/**
 * Calculates the Simple Moving Average (SMA) for candlestick data.
 * @param data - An array of candlestick data.
 * @param period - The SMA period.
 * @returns An array of SMA data points with timestamps.
 */
export const calculateSMA = (data: CandlestickData[], period: number): { time: Time, value: number }[] => {
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

/**
 * Calculates the Relative Strength Index (RSI) for a series of closing prices.
 * This implementation follows the standard method: initial SMA for gains/losses, then Wilder's smoothing.
 * @param closePrices - An array of closing prices.
 * @param period - The RSI period.
 * @returns An array of RSI values, padded with nulls for the initial period.
 */
export const calculateRSI = (closePrices: number[], period: number): (number | null)[] => {
    const results: (number | null)[] = new Array(closePrices.length).fill(null);
    if (closePrices.length <= period) return results;

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain and loss from the first `period` of changes.
    for (let i = 1; i <= period; i++) {
        const change = closePrices[i] - closePrices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate the first RSI value.
    let rs = avgLoss > 0 ? avgGain / avgLoss : Infinity;
    results[period] = 100 - (100 / (1 + rs));

    // Calculate subsequent RSI values using Wilder's smoothing method.
    for (let i = period + 1; i < closePrices.length; i++) {
        const change = closePrices[i] - closePrices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        
        rs = avgLoss > 0 ? avgGain / avgLoss : Infinity;
        const rsi = 100 - (100 / (1 + rs));
        
        // Ensure we don't push NaN values, which can crash the chart.
        if (!isNaN(rsi)) {
            results[i] = rsi;
        }
    }

    return results;
};


/**
 * Calculates a comprehensive set of live technical indicators from candlestick data.
 * @param data - An array of candlestick data.
 * @param config - The optional EA configuration to determine indicator periods. Defaults will be used if not provided.
 * @returns A LiveAnalysisData object containing all calculated metrics.
 */
export const calculateLiveIndicators = (data: CandlestickData[], config?: Partial<EAConfig>): LiveAnalysisData => {
    const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const closePrices = data.map(d => d.close);
    
    const maPeriod = (config?.strategyType === 'grid' ? config.maPeriod : config?.signal_maPeriod) ?? 50;
    const maType = (config?.strategyType === 'grid' ? config.maType : config?.signal_maType) ?? 'EMA';
    const rsiPeriod = (config?.strategyType === 'signal' ? config.signal_rsiPeriod : 14) ?? 14;
    const atrPeriod = (config?.strategyType === 'signal' ? config.signal_atrPeriod : 14) ?? 14;
    
    let maValue = 0;
    if (data.length >= maPeriod) {
        if (maType === 'SMA') {
            maValue = closePrices.slice(-maPeriod).reduce((a, b) => a + b, 0) / maPeriod;
        } else {
            const emaValues = calculateEMA(closePrices, maPeriod);
            maValue = emaValues.length > 0 ? emaValues[emaValues.length - 1] : 0;
        }
    }
    
    let rsiValue: number | undefined = undefined;
    const rsiSeries = calculateRSI(closePrices, rsiPeriod);
    const lastRsi = rsiSeries[rsiSeries.length - 1];
    if(typeof lastRsi === 'number') rsiValue = lastRsi;

    let rsiDivergence: LiveAnalysisData['rsiDivergence'] = 'None';
    const divergenceLookback = 40;
    if (data.length > divergenceLookback) {
        const priceSlice = data.slice(-divergenceLookback);
        const rsiSlice = rsiSeries.slice(-divergenceLookback);

        const findExtremaIndices = (values: (number|null)[], isPeak: boolean) => {
            const indices: number[] = [];
            for (let i = 1; i < values.length - 1; i++) {
                const val = values[i];
                if (val === null) continue;
                if ((isPeak && val > (values[i-1] ?? -Infinity) && val > (values[i+1] ?? -Infinity)) ||
                    (!isPeak && val < (values[i-1] ?? Infinity) && val < (values[i+1] ?? Infinity))) {
                    indices.push(i);
                }
            }
            return indices;
        };

        const priceHighIndices = findExtremaIndices(priceSlice.map(p => p.high), true);
        const priceLowIndices = findExtremaIndices(priceSlice.map(p => p.low), false);
        
        if (priceHighIndices.length >= 2) {
            const lastHighIdx = priceHighIndices[priceHighIndices.length - 1];
            const prevHighIdx = priceHighIndices[priceHighIndices.length - 2];
            const rsiAtLast = rsiSlice[lastHighIdx];
            const rsiAtPrev = rsiSlice[prevHighIdx];
            if (rsiAtLast !== null && rsiAtPrev !== null && priceSlice[lastHighIdx].high > priceSlice[prevHighIdx].high && rsiAtLast < rsiAtPrev) {
                rsiDivergence = 'Bearish';
            }
        }
        if (priceLowIndices.length >= 2) {
            const lastLowIdx = priceLowIndices[priceLowIndices.length - 1];
            const prevLowIdx = priceLowIndices[priceLowIndices.length - 2];
            const rsiAtLast = rsiSlice[lastLowIdx];
            const rsiAtPrev = rsiSlice[prevLowIdx];
            if (rsiAtLast !== null && rsiAtPrev !== null && priceSlice[lastLowIdx].low < priceSlice[prevLowIdx].low && rsiAtLast > rsiAtPrev) {
                const lastHighIdx = priceHighIndices.length > 0 ? priceHighIndices[priceHighIndices.length - 1] : -1;
                if (lastLowIdx > lastHighIdx) { // Prioritize the most recent signal
                    rsiDivergence = 'Bullish';
                }
            }
        }
    }

    let atrValue: number | undefined = undefined;
    if (data.length > atrPeriod) {
        const trueRanges = [];
        for (let i = data.length - atrPeriod; i < data.length; i++) {
            const tr = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i-1].close), Math.abs(data[i].low - data[i-1].close));
            trueRanges.push(tr);
        }
        atrValue = trueRanges.reduce((a, b) => a + b, 0) / atrPeriod;
    }

    let macd: LiveAnalysisData['macd'] | undefined = undefined;
    const macdFastPeriod = 12, macdSlowPeriod = 26, macdSignalPeriod = 9;
    if (closePrices.length >= macdSlowPeriod + macdSignalPeriod) {
        const emaFast = calculateEMA(closePrices, macdFastPeriod);
        const emaSlow = calculateEMA(closePrices, macdSlowPeriod);
        const alignedEmaFast = emaFast.slice(emaFast.length - emaSlow.length);
        const macdLineData = emaSlow.map((slow, i) => alignedEmaFast[i] - slow);
        const signalLineData = calculateEMA(macdLineData, macdSignalPeriod);
        
        const macdLine = macdLineData[macdLineData.length - 1];
        const signalLine = signalLineData[signalLineData.length - 1];
        const histogram = macdLine - signalLine;
        macd = { macdLine, signalLine, histogram };
    }

    let stochastic: LiveAnalysisData['stochastic'] | undefined = undefined;
    const stochPeriod = 14, stochDPeriod = 3;
    if (data.length >= stochPeriod + stochDPeriod - 1) {
        const kValues: number[] = [];
        for (let i = stochPeriod - 1; i < data.length; i++) {
            const periodSlice = data.slice(i - stochPeriod + 1, i + 1);
            const lowestLow = Math.min(...periodSlice.map(d => d.low));
            const highestHigh = Math.max(...periodSlice.map(d => d.high));
            const currentClose = periodSlice[periodSlice.length - 1].close;
            const k = 100 * ((currentClose - lowestLow) / (highestHigh - lowestLow || 1));
            kValues.push(isNaN(k) ? 0 : k);
        }

        if (kValues.length >= stochDPeriod) {
            const dValuesSlice = kValues.slice(-stochDPeriod);
            const dValue = dValuesSlice.reduce((a, b) => a + b, 0) / stochDPeriod;
            const kValue = kValues[kValues.length - 1];
            stochastic = { k: kValue, d: dValue };
        }
    }
    
    const trend = latestPrice > maValue ? 'Uptrend' : 'Downtrend';
    const periods = { ma: maPeriod, maType: maType, rsi: rsiPeriod, atr: atrPeriod };
    
    return { latestPrice, maValue, trend, rsiValue, atrValue, macd, stochastic, periods, rsiDivergence };
}
