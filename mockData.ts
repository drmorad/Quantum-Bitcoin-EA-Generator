import type { CandlestickData, TickerData } from './types.ts';
import type { Time } from 'lightweight-charts';

// --- Ticker Simulation State ---
// This object holds the state for our mock price ticker, allowing it
// to generate realistic, continuous price movements.
const mockTickerState = {
    // Start with a realistic, recent price for BTC/USD.
    currentPrice: 68543.21, 
    // The price at the start of the simulated 24-hour period.
    openPrice24h: 68010.55, 
};

/**
 * Generates a single, simulated ticker data object.
 * Each call will produce a new price that is a small, random fluctuation
 * from the previous price, mimicking live market activity.
 * @returns A TickerData object with updated price and change metrics.
 */
export const generateMockTickerData = (): TickerData => {
    // Simulate a small price change. The fluctuation is kept within a
    // realistic range for a 2-second interval.
    const change = (Math.random() - 0.5) * (mockTickerState.currentPrice * 0.00005);
    mockTickerState.currentPrice += change;
    
    // Ensure the price doesn't drift into negative territory.
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
 * This function creates a smooth, random walk for the price, ensuring the
 * chart data looks plausible for backtesting and visualization.
 * @returns An array of 200 CandlestickData objects.
 */
export const generateMockCandlestickData = (): CandlestickData[] => {
    const data: CandlestickData[] = [];
    const BARS_TO_FETCH = 200;
    
    // Set the starting timestamp to 200 hours ago from now.
    let currentTime = Math.floor(Date.now() / 1000) - BARS_TO_FETCH * 3600; 
    let currentPrice = 67000.00;

    for (let i = 0; i < BARS_TO_FETCH; i++) {
        const open = currentPrice;
        
        // Generate a random movement for the bar. Volatility is scaled by the current price.
        const movement = (Math.random() - 0.48) * (currentPrice * 0.005);
        const close = open + movement;
        
        // Determine high and low based on a random spread around the open and close.
        const high = Math.max(open, close) + Math.random() * (currentPrice * 0.001);
        const low = Math.min(open, close) - Math.random() * (currentPrice * 0.001);

        data.push({
            time: currentTime as Time,
            open,
            high,
            low,
            close,
        });

        // The next bar's open is the current bar's close, creating a continuous price series.
        currentPrice = close;
        // Increment the time by one hour (3600 seconds) for the next bar.
        currentTime += 3600;
    }

    return data;
};
