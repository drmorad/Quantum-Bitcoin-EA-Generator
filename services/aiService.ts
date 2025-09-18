import { GoogleGenAI } from "@google/genai";
import type { EAConfig, SimulatedResults } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateAnalysis = async (config: EAConfig, results: SimulatedResults): Promise<string> => {
  const prompt = `
You are an expert quantitative analyst specializing in algorithmic trading strategies for cryptocurrencies. Your task is to analyze the following MQL5 Expert Advisor configuration and provide actionable advice. **Crucially, all of your analysis and suggestions must be tailored specifically for the BTCUSD asset on the H1 (1-hour) timeframe, considering its typical volatility and price behavior.**

**Current Configuration:**
- Magic Number: ${config.magicNumber}
- Initial Lot Size: ${config.initialLot}
- Grid Distance: ${config.gridDistance} points
- Grid Distance Multiplier: ${config.gridDistanceMultiplier}
- Grid Lot Multiplier: ${config.gridMultiplier}
- Max Grid Trades: ${config.maxGridTrades}
- Trend MA Period: ${config.maPeriod} (${config.maType})
- Take Profit (Base): $${config.takeProfit}
- Take Profit Multiplier: ${config.takeProfitMultiplier}
- Stop Loss: ${config.stopLoss.toFixed(2)}% of Equity

**Simulated Performance Metrics:**
- Profit Factor: ${results.profitFactor}
- Max Drawdown: ${results.drawdown}
- Win Rate: ${results.winRate}
- Sharpe Ratio: ${results.sharpeRatio}

**Your Analysis (Provide in Markdown format with headers):**

1.  **### Overall Assessment**
    Give a brief, one-sentence summary of the strategy's profile (e.g., 'This configuration appears to be a high-risk, high-reward setup due to the aggressive lot multiplier.').

2.  **### Strengths**
    Identify 2-3 strong points of the current configuration in a bulleted list.

3.  **### Areas for Improvement**
    Identify 2-3 potential weaknesses or areas of high risk in a bulleted list.

4.  **### Actionable Suggestions**
    Provide 2-3 specific, numbered suggestions for parameter adjustments to improve the strategy's balance of profitability and risk. For each suggestion, explain *why* you are recommending the change and what impact it's expected to have.

*Example Suggestion:*
*1. **Consider a higher Grid Distance:** For BTCUSD on H1, a distance of ${config.gridDistance} points can be quite tight during volatile moves. Increasing this to around 3000-3500 could reduce the frequency of grid entries, potentially lowering drawdown by giving positions more room to breathe before adding to the grid.*

Maintain a professional, data-driven, and helpful tone.
  `;
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "An error occurred while analyzing the configuration. Please check the console for details.";
  }
};
