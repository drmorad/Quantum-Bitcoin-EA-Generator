
import type { CandlestickData, TickerData } from '../types.ts';
import type { Time } from 'lightweight-charts';

const CACHED_DATA_KEY = 'mql5-chart-data-cache';
const CACHE_EXPIRY = 3600 * 1000; // 1 hour cache

// --- Ticker Simulation State ---
const mockTickerState = {
    currentPrice: 68543.21, 
    openPrice24h: 68010.55, 
};

/**
 * Generates a single, simulated ticker data object.
 */
export const generateMockTickerData = (): TickerData => {
    const change = (Math.random() - 0.5) * (mockTickerState.currentPrice * 0.00005);
    mockTickerState.currentPrice += change;
    
    if (mockTickerState.currentPrice < 0) {
        mockTickerState.currentPrice = 0;
    }

    const changeAbsolute = mockTickerState.currentPrice - mockTickerState.openPrice24h;
    const changePercentage = mockTickerState.openPrice24h > 0 ? (changeAbsolute / mockTickerState.openPrice24h) : 0;

    return {
        price: mockTickerState.currentPrice,
        changeAbsolute: changeAbsolute,
        changePercentage: changePercentage,
    };
};


/**
 * Generates a realistic-looking historical dataset of 200 candlestick bars.
 * This function caches the data in localStorage to provide a consistent experience.
 */
export const generateMockCandlestickData = (): CandlestickData[] => {
    const cachedItem = localStorage.getItem(CACHED_DATA_KEY);
    if (cachedItem) {
        try {
            const { timestamp, data } = JSON.parse(cachedItem);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                return data.map((d: any) => ({...d, time: d.time as Time}));
            }
        } catch (e) {
            console.error("Failed to parse cached chart data, regenerating.", e);
            localStorage.removeItem(CACHED_DATA_KEY);
        }
    }

    const data: CandlestickData[] = [];
    const BARS_TO_FETCH = 200;
    
    let currentTime = Math.floor(Date.now() / 1000) - BARS_TO_FETCH * 3600; 
    let currentPrice = 67000.00;

    for (let i = 0; i < BARS_TO_FETCH; i++) {
        const open = currentPrice;
        
        const movement = (Math.random() - 0.48) * (currentPrice * 0.005);
        const close = open + movement;
        
        const high = Math.max(open, close) + Math.random() * (currentPrice * 0.001);
        const low = Math.min(open, close) - Math.random() * (currentPrice * 0.001);

        data.push({
            time: currentTime as Time,
            open,
            high,
            low,
            close,
        });

        currentPrice = close;
        currentTime += 3600;
    }
    
    const dataToCache = {
        timestamp: Date.now(),
        data: data,
    };
    try {
        localStorage.setItem(CACHED_DATA_KEY, JSON.stringify(dataToCache));
    } catch (e) {
        console.error("Failed to cache chart data.", e);
    }

    return data;
};
