import type { CandlestickData, TickerData } from './types.ts';
import { generateMockCandlestickData, generateMockTickerData } from './mockData.ts';

/**
 * Fetches the last 200 hours of BTC/USD H1 OHLC data using a mock generator.
 * This avoids external API calls that can fail due to CORS or network issues.
 * @returns A promise that resolves to an array of CandlestickData.
 */
export const fetchBTCUSD_H1_Data = async (): Promise<CandlestickData[]> => {
    try {
        // Simulate a network delay for a more realistic loading experience.
        await new Promise(resolve => setTimeout(resolve, 150));
        const mockData = generateMockCandlestickData();
        return mockData;
    } catch (error) {
        console.error("Error generating mock crypto data:", error);
        throw error;
    }
};

/**
 * Fetches the latest BTC/USD price summary from the mock ticker generator.
 * @returns A promise that resolves to a TickerData object.
 */
export const fetchBTCUSD_TickerData = async (): Promise<TickerData> => {
    try {
        // The mock generator is synchronous, but we keep the async signature
        // to maintain consistency with a real API implementation.
        const mockTicker = generateMockTickerData();
        return Promise.resolve(mockTicker);
    } catch (error) {
        console.error("Error generating mock crypto ticker data:", error);
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
            // Now fetching from our reliable mock data source
            const data = await fetchBTCUSD_TickerData();
            this.lastData = data;
            this.notifySubscribers(data, null);
        } catch (error) {
            console.error("PriceStreamService: Error fetching mock ticker data.", error);
            // Notify subscribers of the error. This is unlikely with mock data but good practice.
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
