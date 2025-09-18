import { GoogleGenAI } from "@google/genai";
import type { EAConfig, SimulatedResults } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateAnalysis = async (config: EAConfig, results: SimulatedResults): Promise<string> => {

  let strategyDetails = '';
  let exampleSuggestion = '';

  if (config.strategyType === 'grid') {
    strategyDetails = `
- Strategy Type: Grid
- Initial Lot Size: ${config.initialLot}
- Grid Distance: ${config.gridDistance} points
- Grid Distance Multiplier: ${config.gridDistanceMultiplier}
- Grid Lot Multiplier: ${config.gridMultiplier}
- Max Grid Trades: ${config.maxGridTrades}
- Trend MA: ${config.maPeriod} Period ${config.maType}
- Take Profit (Base): $${config.takeProfit}
- Take Profit Multiplier: ${config.takeProfitMultiplier}
- Stop Loss: ${config.stopLoss.toFixed(2)}% of Equity
- Trailing Stop Enabled: ${config.useTrailingStop}
    `;
    exampleSuggestion = `
*Example Suggestion (Grid):*
*1. **Consider a higher Grid Distance:** For BTCUSD on H1, a distance of ${config.gridDistance} points can be quite tight. Increasing this to 3000-3500 could reduce the frequency of grid entries, potentially lowering drawdown.*
    `;
  } else { // 'signal'
    strategyDetails = `
- Strategy Type: Signal
- Lot Size: ${config.signal_lotSize}
- Trend MA: ${config.signal_maPeriod} Period ${config.signal_maType}
- RSI Period: ${config.signal_rsiPeriod}
- RSI Levels: Oversold at ${config.signal_rsiOversold}, Overbought at ${config.signal_rsiOverbought}
- ATR Period: ${config.signal_atrPeriod}
- ATR SL Multiplier: ${config.signal_atrMultiplierSL}x
- ATR TP Multiplier: ${config.signal_atrMultiplierTP}x
    `;
    exampleSuggestion = `
*Example Suggestion (Signal):*
*1. **Adjust RSI Levels for BTCUSD:** The default ${config.signal_rsiOversold}/${config.signal_rsiOverbought} levels can be less effective on BTCUSD H1. Consider tightening them to 35/65 to get earlier signals in established trends, potentially improving win rate.*
    `;
  }

  const prompt = `
You are an expert quantitative analyst specializing in algorithmic trading strategies for cryptocurrencies. Your task is to analyze the following MQL5 Expert Advisor configuration and provide actionable advice. **Crucially, all of your analysis and suggestions must be tailored specifically for the BTCUSD asset on the H1 (1-hour) timeframe, considering its typical volatility and price behavior.**

**Current Configuration:**
- Magic Number: ${config.magicNumber}
- Max Spread Allowed: ${config.maxSpread} points
${strategyDetails}

**Simulated Performance Metrics:**
- Profit Factor: ${results.profitFactor}
- Max Drawdown: ${results.drawdown}
- Win Rate: ${results.winRate}
- Sharpe Ratio: ${results.sharpeRatio}

**Your Analysis (Provide in Markdown format with headers):**

1.  **### Overall Assessment**
    Give a brief, one-sentence summary of the strategy's profile (e.g., 'This configuration appears to be a high-risk, high-reward setup due to the aggressive lot multiplier.' or 'This is a classic trend-following pullback strategy aiming for a good risk/reward ratio.').

2.  **### Strengths**
    Identify 2-3 strong points of the current configuration in a bulleted list.

3.  **### Areas for Improvement**
    Identify 2-3 potential weaknesses or areas of high risk in a bulleted list.

4.  **### Actionable Suggestions**
    Provide 2-3 specific, numbered suggestions for parameter adjustments to improve the strategy's balance of profitability and risk. For each suggestion, explain *why* you are recommending the change and what impact it's expected to have.

${exampleSuggestion}

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
    // Provide a more user-friendly error message that will be displayed in the UI.
    return "An error occurred while analyzing the configuration. This might be a temporary issue with the AI service. Please check your network connection and try again in a moment.";
  }
};