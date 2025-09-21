
// FIX: Use explicit file extension for imports
import type { CandlestickData, TickerData } from '../types.ts';
import type { Time } from 'lightweight-charts';

// Switched to CryptoCompare Public API for better CORS compatibility in sandboxed environments.
const API_BASE = 'https://min-api.cryptocompare.com/data';
const SYMBOL = 'BTC';
const CURRENCY = 'USD';
const BARS_TO_FETCH = 200;

/**
 * Fetches the last 200 hours of BTC/USD H1 OHLC data from CryptoCompare.
 */
export const fetchBTCUSD_H1_Data = async (): Promise<CandlestickData[]> => {
    // histohour endpoint returns up to 2000 records, so 200 is safe.
    const apiUrl = `${API_BASE}/v2/histohour?fsym=${SYMBOL}&tsym=${CURRENCY}&limit=${BARS_TO_FETCH}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.Response !== 'Success' || !data.Data || !Array.isArray(data.Data.Data)) {
            throw new Error(data.Message || "Invalid data format received from API");
        }

        // Format the data for lightweight-charts
        // CryptoCompare response format: { Data: { Data: [{ time, open, high, low, close, ... }] } }
        const formattedData: CandlestickData[] = data.Data.Data.map((d: any) => ({
            time: d.time as Time, // Already in seconds
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        return formattedData;

    } catch (error) {
        console.error("Error fetching crypto data:", error);
        throw error; // Re-throw the error to be handled by the calling component
    }
};

/**
 * Fetches the latest BTC/USD price summary for the ticker from CryptoCompare.
 */
export const fetchBTCUSD_TickerData = async (): Promise<TickerData> => {
    const apiUrl = `${API_BASE}/pricemultifull?fsyms=${SYMBOL}&tsyms=${CURRENCY}`;

    try {
        const response = await fetch(apiUrl);
         if (!response.ok) {
            throw new Error(`Failed to fetch ticker data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        const ticker = data?.RAW?.[SYMBOL]?.[CURRENCY];
        if (!ticker || typeof ticker.PRICE === 'undefined') {
            throw new Error("Invalid ticker data format received from CryptoCompare API");
        }
        
        return {
            price: ticker.PRICE,
            changeAbsolute: ticker.CHANGE24HOUR,
            changePercentage: ticker.CHANGEPCT24HOUR / 100, // Convert percentage to a decimal
        };

    } catch (error) {
        console.error("Error fetching crypto ticker data:", error);
        throw error;
    }
}

// --- Real-time Price Streaming Service ---

type Subscriber = (data: TickerData | null, error: Error | null) => void;

class PriceStreamService {
    private static instance: PriceStreamService;
    private subscribers: Set<Subscriber> = new Set();
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private lastData: TickerData | null = null;
    private readonly POLLING_INTERVAL = 2000; // 2 seconds

    private constructor() {}

    public static getInstance(): PriceStreamService {
        if (!PriceStreamService.instance) {
            PriceStreamService.instance = new PriceStreamService();
        }
        return PriceStreamService.instance;
    }

    private startPolling() {
        if (this.intervalId) return; // Already polling

        console.log(`PriceStreamService: Starting polling every ${this.POLLING_INTERVAL}ms.`);
        // Fetch immediately on start to provide data to the first subscriber without delay
        this.fetchData(); 
        
        this.intervalId = setInterval(this.fetchData, this.POLLING_INTERVAL);
    }

    private stopPolling() {
        if (this.intervalId) {
            console.log('PriceStreamService: Stopping polling.');
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private fetchData = async () => {
        try {
            const data = await fetchBTCUSD_TickerData();
            this.lastData = data;
            this.notifySubscribers(data, null);
        } catch (error) {
            console.error("PriceStreamService: Error fetching ticker data.", error);
            // We notify subscribers of the error, they can decide how to handle it (e.g., show a message but keep stale data)
            this.notifySubscribers(null, error as Error);
        }
    }

    private notifySubscribers(data: TickerData | null, error: Error | null) {
        this.subscribers.forEach(callback => callback(data, error));
    }

    public subscribe(callback: Subscriber) {
        this.subscribers.add(callback);
        // Immediately provide last known data if available, so new components don't have to wait for the next poll
        if (this.lastData) {
            callback(this.lastData, null); 
        }
        // If this is the first subscriber, start the polling process
        if (!this.intervalId) {
            this.startPolling();
        }
    }

    public unsubscribe(callback: Subscriber) {
        this.subscribers.delete(callback);
        // If there are no more subscribers, stop polling to save resources
        if (this.subscribers.size === 0) {
            this.stopPolling();
        }
    }
}

export const priceStreamService = PriceStreamService.getInstance();
