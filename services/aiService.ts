
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Use explicit file extension for imports
import type { EAConfig, SimulatedResults, LiveAnalysisData, AIPersonality, FundamentalData, TradingSignal } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PERSONA_SYSTEM_INSTRUCTIONS: Record<AIPersonality, string> = {
    'Quantitative Analyst': `You are an expert quantitative analyst specializing in algorithmic trading strategies for cryptocurrencies, particularly BTCUSD on the H1 timeframe. Your analysis must be objective, data-driven, and focused on statistical probabilities. You prioritize strategies that have a demonstrable edge, as indicated by metrics like Sharpe Ratio and Profit Factor. Your tone is professional, precise, and impartial.`,
    'Risk Manager': `You are a seasoned risk manager for a proprietary trading firm. Your absolute priority is capital preservation. You are highly skeptical of strategies with high drawdown potential, regardless of their profitability. Your analysis must rigorously scrutinize risk parameters like Stop Loss, Grid Lot Multiplier, and Max Trades. You provide conservative, actionable advice aimed at increasing a strategy's robustness and survivability during adverse market conditions. Your tone is cautious, direct, and authoritative.`,
    'Aggressive Scalper': `You are an aggressive, high-frequency trader specializing in scalping BTCUSD. You thrive on volatility and look for strategies that can capitalize on short-term price movements. You are less concerned with high drawdown and more focused on high win rates and frequent trading opportunities. Your analysis should identify ways to make the strategy more responsive and faster to enter/exit trades. Your tone is energetic, fast-paced, and focused on immediate opportunities.`,
    'Contrarian Investor': `You are a contrarian investor with a knack for identifying market extremes and potential reversals. You are inherently skeptical of trend-following systems and look for weaknesses or opportunities to fade the prevailing momentum. Your analysis will challenge the strategy's core assumptions and suggest parameters that might perform well during trend exhaustion or market reversals. Your tone is inquisitive, skeptical, and thought-provoking.`
};

export const getPromptTemplate = (config: EAConfig, results: SimulatedResults, liveData: LiveAnalysisData): string => {
  let prompt: string;

  const commonHeader = `
As the selected AI Persona, you must conduct a formal audit of the following MQL5 Expert Advisor configuration.

**Crucial Context:** The audit is for the **BTCUSD asset on the H1 (1-hour) timeframe**. This asset is known for high volatility and strong trends. Your analysis must be tailored to these specific conditions.

**Simulated Performance Metrics:**
- Profit Factor: ${results.profitFactor}
- Max Drawdown: ${results.drawdown}
- Win Rate: ${results.winRate}
- Sharpe Ratio: ${results.sharpeRatio}

**Live Market Snapshot:**
- Latest BTC Price: $${liveData.latestPrice.toFixed(2)}
- Current Trend Direction: **${liveData.trend}**
`;

  if (config.strategyType === 'grid') {
    prompt = `
${commonHeader}
- Trend MA(${config.maPeriod}) Value: $${liveData.maValue.toFixed(2)}

**Grid Strategy Configuration:**
- Initial Risk: ${config.initialRiskPercent}%
- Grid Distance: ${config.gridDistance} points
- Grid Distance Multiplier: ${config.gridDistanceMultiplier}
- Grid Lot Multiplier (Martingale): ${config.gridMultiplier}
- Max Grid Trades: ${config.maxGridTrades}
- Trend MA Period: ${config.maPeriod} (${config.maType})
- Take Profit (Base): $${config.takeProfit}
- Stop Loss: ${config.stopLoss.toFixed(2)}% of Equity

**Your Audit (Provide in Markdown format with headers):**

1.  **### Strategy Audit Score (out of 10)**
    Provide a score for each of the following categories and a brief justification based on your persona's priorities.
    *   **Robustness & Safety:** (Your Score)/10. Justification...
    *   **Profitability Potential:** (Your Score)/10. Justification...
    *   **Risk/Reward Balance:** (Your Score)/10. Justification...

2.  **### Core Thesis Analysis**
    In a paragraph, analyze the core logic of this configuration from your persona's perspective. What is this strategy trying to achieve? What are its primary strengths and weaknesses?

3.  **### Parameter Deep Dive & Red Flags**
    In a bulleted list, identify 2-3 specific parameters that are most critical or concerning. Explain the trade-offs involved (e.g., "The Grid Lot Multiplier of ${config.gridMultiplier} is extremely high, which dramatically increases profit potential but also exponentially raises the risk of a margin call.").

4.  **### Actionable Recommendations**
    Provide 2-3 specific, numbered suggestions for adjustments to improve the strategy according to your persona's goals. Explain the *why* behind each recommendation.

5.  **### Manual Trading Insights**
    Based on the live market snapshot, provide a brief, actionable insight for a manual trader using a similar grid strategy. Should they be cautious, aggressive, or wait on the sidelines?
`;
  } else { // 'signal' strategy
    prompt = `
${commonHeader}
- Trend MA(${config.signal_maPeriod}) Value: $${liveData.maValue.toFixed(2)}
- RSI(${config.signal_rsiPeriod}) Value: ${liveData.rsiValue?.toFixed(2) ?? 'N/A'}
- ATR(${config.signal_atrPeriod}) Value: ${liveData.atrValue?.toFixed(2) ?? 'N/A'} (volatility measure)

**Signal Strategy Configuration:**
- Lot Size: ${config.signal_lotSize}
- Trend Filter: ${config.signal_maPeriod} Period ${config.signal_maType}
- Entry Trigger: ${config.signal_rsiPeriod} Period RSI crossing ${config.signal_rsiOversold} (buy) / ${config.signal_rsiOverbought} (sell)
- Risk Management: ATR(${config.signal_atrPeriod}) with SL Multiplier of ${config.signal_atrMultiplierSL} and TP Multiplier of ${config.signal_atrMultiplierTP}

**Your Audit (Provide in Markdown format with headers):**

1.  **### Strategy Audit Score (out of 10)**
    Provide a score for each of the following categories and a brief justification based on your persona's priorities.
    *   **Signal Quality:** (Your Score)/10. Justification...
    *   **Profitability Potential:** (Your Score)/10. Justification...
    *   **Risk/Reward Balance:** (Your Score)/10. Justification...

2.  **### Core Thesis Analysis**
    In a paragraph, analyze the core logic of this configuration from your persona's perspective. What is this strategy trying to achieve (e.g., trend-following, mean-reversion)? What are its primary strengths and weaknesses?

3.  **### Parameter Deep Dive & Red Flags**
    In a bulleted list, identify 2-3 key parameter interactions that are most critical or concerning (e.g., "The short MA period of ${config.signal_maPeriod} combined with the tight RSI levels might lead to frequent 'whipsaw' trades in non-trending markets.").

4.  **### Actionable Recommendations**
    Provide 2-3 specific, numbered suggestions for adjustments to improve the strategy according to your persona's goals. Explain the *why* behind each recommendation (e.g., "Widen the RSI levels to 25/75 to filter for more significant pullbacks...").

5.  **### Manual Trading Insights**
    Based on the live market snapshot, is there an imminent trade signal according to the EA's logic? Should a manual trader take it, or is there a reason to be cautious?
`;
  }
  return prompt.trim();
};


export const generateAnalysis = async (prompt: string, personality: AIPersonality): Promise<string> => {
  try {
    const systemInstruction = PERSONA_SYSTEM_INSTRUCTIONS[personality];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    // Check for specific Gemini API error messages if available
    if (errorMessage.includes('API key not valid')) {
        return "**API Key Error:** The provided API key is not valid. Please ensure it is configured correctly in your environment.";
    }
    return `**An error occurred while analyzing the configuration:**\n\n*${errorMessage}*\n\nPlease check the console for more details.`;
  }
};

export const getSignalPromptTemplate = (liveData: LiveAnalysisData, fundamentals: FundamentalData): string => {
    
    let technicalData = `
- **Asset:** BTCUSD
- **Timeframe:** H1 (1-hour)
- **Latest Price:** $${liveData.latestPrice.toFixed(2)}
- **50-Period EMA:** $${liveData.maValue.toFixed(2)}
- **Overall Trend (based on price vs EMA):** ${liveData.trend}
- **14-Period RSI:** ${liveData.rsiValue?.toFixed(2) ?? 'N/A'}
- **14-Period ATR (Volatility):** $${liveData.atrValue?.toFixed(2) ?? 'N/A'}`;

    if (liveData.macd) {
        technicalData += `
- **MACD (12,26,9):** Line: ${liveData.macd.macdLine.toFixed(2)}, Signal: ${liveData.macd.signalLine.toFixed(2)}, Hist: ${liveData.macd.histogram.toFixed(2)}`;
    }
    if (liveData.stochastic) {
        technicalData += `
- **Stochastic (14,3,3):** %K: ${liveData.stochastic.k.toFixed(2)}, %D: ${liveData.stochastic.d.toFixed(2)}`;
    }

    return `
You are an expert market analyst and trader for BTCUSD on the H1 timeframe. Your task is to synthesize the provided technical and fundamental data into a single, actionable trading signal. You MUST provide a response in the specified JSON format.

**Current Market Data:**
${technicalData}

**Fundamental Analysis:**
- **Market Sentiment:** ${fundamentals.sentiment}
- **Key Headline:** "${fundamentals.headline}"

**Your Task:**
1.  **Analyze the Confluence:** Examine how the technical indicators (EMA, RSI, ATR, MACD, Stochastic) align or diverge with the fundamental sentiment.
    - Is the trend confirmed by momentum (RSI & MACD histogram)?
    - Are oscillators (RSI, Stochastic) in overbought/oversold territory? Does this suggest a pullback or a reversal?
    - Has there been a recent MACD or Stochastic crossover event?
    - Is the sentiment supporting the current price action?
    - Is volatility (ATR) high or low, and how does that affect risk?
2.  **Formulate a Trade Thesis:** Based on your analysis, decide on the most probable short-term direction. State whether you will BUY, SELL, or HOLD.
3.  **Define Trade Parameters:**
    - **Entry:** If BUY/SELL, determine a precise entry price. This could be the current market price or a nearby strategic level (e.g., waiting for a pullback to the EMA). If HOLD, set to 0.
    - **Take Profit (TP):** Calculate a logical TP level. A common method is using a multiple of the ATR (e.g., 1.5 * ATR) from your entry, or targeting a recent swing high/low. If HOLD, set to 0.
    - **Stop Loss (SL):** Calculate a defensive SL level. This should also be based on volatility (e.g., 1.0 * ATR) or a key technical level. If HOLD, set to 0.
4.  **Justify Your Decision:** Write a detailed rationale explaining your thought process. Cover the technical and fundamental reasons for your signal, entry, TP, and SL placement. Explain *why* you chose this specific course of action.
5.  **Determine Confidence:** Assign a confidence level ('High', 'Medium', 'Low') based on how many factors align in favor of your trade thesis.

Provide your final analysis ONLY in the following JSON format. Do not include any text or markdown formatting before or after the JSON block.
`;
};

export const generateTradingSignal = async (liveData: LiveAnalysisData, fundamentals: FundamentalData): Promise<TradingSignal> => {
  const prompt = getSignalPromptTemplate(liveData, fundamentals);
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    signal: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
                    confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                    entry: { type: Type.NUMBER },
                    takeProfit: { type: Type.NUMBER },
                    stopLoss: { type: Type.NUMBER },
                    rationale: { type: Type.STRING }
                },
                required: ['signal', 'confidence', 'entry', 'takeProfit', 'stopLoss', 'rationale']
            }
        }
    });
    
    // The response text is a JSON string, so we parse it.
    const jsonStr = response.text.trim();
    const signalData: TradingSignal = JSON.parse(jsonStr);
    return signalData;

  } catch (error) {
    console.error("Error calling Gemini API for trading signal:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    // Return a structured error signal
    return {
        signal: 'HOLD',
        confidence: 'Low',
        entry: 0,
        takeProfit: 0,
        stopLoss: 0,
        rationale: `**An error occurred while generating the trading signal:**\n\n*${errorMessage}*\n\nPlease check the console for more details.`
    };
  }
};
