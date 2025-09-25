
import type { CandlestickData, TickerData } from '../types.ts';
import type { Time } from 'lightweight-charts';

// --- Ticker Simulation State ---
// Updated to reflect a more current price level for BTC/USD.
const mockTickerState = {
    currentPrice: 114004.01, 
    openPrice24h: 113582.55, 
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
 * Generates a realistic-looking historical dataset of 200 candlestick bars,
 * ending at the current hour. This ensures the chart data is always up-to-date.
 * This function generates the data backwards from the present time to ensure
 * the latest candle aligns with the live ticker price.
 * @returns An array of 200 CandlestickData objects in chronological order.
 */
export const generateMockCandlestickData = (): CandlestickData[] => {
    const data: CandlestickData[] = [];
    const BARS_TO_GENERATE = 200;

    const now = new Date();
    // Round down to the beginning of the current hour for the latest bar's timestamp.
    now.setMinutes(0, 0, 0);
    let currentTimestamp = Math.floor(now.getTime() / 1000);

    // Start generating backwards from the ticker's current price for consistency.
    let price = mockTickerState.currentPrice;

    for (let i = 0; i < BARS_TO_GENERATE; i++) {
        const close = price; // The close of the current bar is based on the previous (more recent) bar's open.
        
        // Generate a plausible open price for this bar.
        const movement = (Math.random() - 0.49) * (close * 0.007);
        const open = close - movement;
        
        // Determine high/low around the open/close.
        let high = Math.max(open, close) + Math.random() * (close * 0.002);
        let low = Math.min(open, close) - Math.random() * (close * 0.002);
        
        // Enforce basic candle integrity.
        high = Math.max(high, open, close);
        low = Math.min(low, open, close);

        // Final sanity checks before adding the candle to the dataset.
        if (isFinite(open) && isFinite(high) && isFinite(low) && isFinite(close) && low > 0) {
             data.push({
                time: currentTimestamp as Time,
                open,
                high,
                low,
                close,
            });
        }

        // For the next iteration (the bar before this one), its close price will be our current open price,
        // ensuring a continuous price series.
        price = open;

        // Move back one hour for the next bar.
        currentTimestamp -= 3600;
    }

    // The data was generated from newest to oldest, so reverse it to be chronological.
    return data.reverse();
};
