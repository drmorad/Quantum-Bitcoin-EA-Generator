import type { CandlestickData, TickerData } from '../types';
import type { Time } from 'lightweight-charts';

// Switched to Binance Public API for better stability. No API key required.
const API_BASE = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const BARS_TO_FETCH = 200;

/**
 * Fetches the last 200 hours of BTCUSDT H1 OHLC data from Binance.
 */
export const fetchBTCUSD_H1_Data = async (): Promise<CandlestickData[]> => {
    const apiUrl = `${API_BASE}/klines?symbol=${SYMBOL}&interval=1h&limit=${BARS_TO_FETCH}`;

    // Binance API has CORS headers, so a proxy is not needed.
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid data format received from API");
        }

        // Format the data for lightweight-charts
        // Binance response format: [OpenTime, Open, High, Low, Close, Volume, ...]
        const formattedData: CandlestickData[] = data.map((d: (string | number)[]) => ({
            time: (d[0] as number) / 1000 as Time, // Convert ms to seconds for lightweight-charts
            open: parseFloat(d[1] as string),
            high: parseFloat(d[2] as string),
            low: parseFloat(d[3] as string),
            close: parseFloat(d[4] as string),
        }));

        return formattedData;

    } catch (error) {
        console.error("Error fetching crypto data:", error);
        throw error; // Re-throw the error to be handled by the calling component
    }
};

/**
 * Fetches the latest BTCUSDT price summary for the ticker from Binance.
 */
export const fetchBTCUSD_TickerData = async (): Promise<TickerData> => {
    const apiUrl = `${API_BASE}/ticker/24hr?symbol=${SYMBOL}`;

    try {
        const response = await fetch(apiUrl);
         if (!response.ok) {
            throw new Error(`Failed to fetch ticker data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (!data || typeof data.lastPrice === 'undefined') {
            throw new Error("Invalid ticker data format received from API");
        }
        
        return {
            price: parseFloat(data.lastPrice),
            changeAbsolute: parseFloat(data.priceChange),
            changePercentage: parseFloat(data.priceChangePercent) / 100, // Convert percentage string to a decimal
        };

    } catch (error) {
        console.error("Error fetching crypto ticker data:", error);
        throw error;
    }
}