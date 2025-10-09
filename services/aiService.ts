
import { GoogleGenAI, Type } from "@google/genai";
import type { EAConfig, SimulatedResults, LiveAnalysisData, AIPersonality, FundamentalData, TradingSignal } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PERSONA_SYSTEM_INSTRUCTIONS: Record<AIPersonality, string> = {
    'Quantitative Analyst': `You are an expert quantitative analyst specializing in algorithmic trading strategies for cryptocurrencies, particularly BTC/USD on the H1 timeframe. Your analysis must be objective, data-driven, and focused on statistical probabilities. Prioritize strategies with a demonstrable edge, indicated by metrics like Sharpe Ratio and Profit Factor. Your tone is professional, precise, and impartial. Discuss concepts like statistical significance and potential curve-fitting.`,
    'Risk Manager': `You are a seasoned risk manager for a proprietary trading firm. Your entire analysis MUST be viewed through the lens of risk. Your absolute priority is capital preservation. Heavily penalize high drawdown, high lot multipliers, and insufficient stop losses. In your scoring, you must weight 'Robustness & Safety' three times more heavily than 'Profitability Potential'. Your tone is cautious, direct, and authoritative.`,
    'Aggressive Scalper': `You are an aggressive, high-frequency trader specializing in scalping BTC/USD. You thrive on volatility and look for strategies that can capitalize on short-term price movements. You are less concerned with high drawdown and more focused on high win rates and frequent trading opportunities. Favor tighter parameters (grid distances, MA periods, RSI levels) that increase trade frequency. Your tone is energetic, fast-paced, and focused on immediate opportunities.`,
    'Contrarian Investor': `You are a contrarian investor with a knack for identifying market extremes and potential reversals. You are inherently skeptical of trend-following systems. Actively look for flaws in the strategy's core assumptions. Discuss scenarios where this strategy would fail, such as ranging markets or sharp reversals. Suggest parameters that might perform well during trend exhaustion. Your tone is inquisitive, skeptical, and thought-provoking.`
};

const buildLiveDataMarkdown = (liveData: LiveAnalysisData): string => {
    const periods = liveData.periods ?? { ma: 50, maType: 'EMA', rsi: 14, atr: 14 };

    let table = `| Metric                | Value                               |\n`;
    table +=    `|-----------------------|-------------------------------------|\n`;
    table +=    `| Latest BTC Price      | $${liveData.latestPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}                 |\n`;
    table +=    `| Current Trend         | **${liveData.trend}**                       |\n`;
    table +=    `| RSI Divergence        | **${liveData.rsiDivergence}**                |\n`;
    table +=    `| Trend MA(${periods.maType} ${periods.ma}) Value   | $${liveData.maValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}                 |\n`;
    
    if (liveData.rsiValue !== undefined) {
        table += `| RSI(${periods.rsi}) Value     | ${liveData.rsiValue.toFixed(2)}                |\n`;
    }
    if (liveData.atrValue !== undefined) {
        table += `| ATR(${periods.atr}) Value     | $${liveData.atrValue.toFixed(2)} (volatility) |\n`;
    }
    if (liveData.macd) {
        table += `| MACD Hist. (12,26,9)  | ${liveData.macd.histogram.toFixed(2)}                |\n`;
    }
    if (liveData.stochastic) {
        table += `| Stochastic %K, %D (14,3,3) | ${liveData.stochastic.k.toFixed(2)}, ${liveData.stochastic.d.toFixed(2)}        |\n`;
    }
    return table;
};

export const getPromptTemplate = (config: EAConfig, results: SimulatedResults, liveData: LiveAnalysisData, personality: AIPersonality): string => {
  const liveDataMarkdown = buildLiveDataMarkdown(liveData);

  const commonHeader = `
As the selected AI Persona, you must conduct a formal audit of the following MQL5 Expert Advisor configuration.

**Crucial Context:** The audit is for the **BTC/USD asset on the H1 (1-hour) timeframe**. This asset is known for high volatility and strong trends. Your analysis must be tailored to these specific conditions.

**Simulated Performance Metrics:**
| Metric         | Value              |
|----------------|--------------------|
| Profit Factor  | ${results.profitFactor}      |
| Max Drawdown   | ${results.drawdown}       |
| Win Rate       | ${results.winRate}        |
| Sharpe Ratio   | ${results.sharpeRatio}     |

**Live Market Snapshot:**
${liveDataMarkdown}
`;

  let strategyConfigSection: string;
  let auditSection: string;

  if (config.strategyType === 'grid') {
    strategyConfigSection = `
**Grid Strategy Configuration:**
| Parameter                 | Value                               |
|---------------------------|-------------------------------------|
| Initial Risk              | ${(config.initialRiskPercent ?? 1.0).toFixed(2)}%        |
| Grid Distance             | ${config.gridDistance ?? 2000} points       |
| Grid Distance Multiplier  | ${(config.gridDistanceMultiplier ?? 1.0).toFixed(2)}   |
| Grid Lot Multiplier       | ${(config.gridMultiplier ?? 1.5).toFixed(2)}           |
| Max Grid Trades           | ${config.maxGridTrades ?? 3}            |
| Trend MA Period           | ${config.maPeriod ?? 50}                  |
| Trend MA Type             | ${config.maType ?? 'SMA'}                    |
| Take Profit (Base)        | $${(config.takeProfit ?? 200).toFixed(2)}                 |
| Take Profit Multiplier    | ${(config.takeProfitMultiplier ?? 1.0).toFixed(2)}      |
| Stop Loss (% Equity)      | ${(config.stopLoss ?? 2.0).toFixed(2)}%     |
| Trailing Stop             | ${config.useTrailingStop ? `Active (${config.trailingStopStart}/${config.trailingStopDistance} pts)` : 'Inactive'} |
`;
    switch (personality) {
        case 'Quantitative Analyst':
            auditSection = `
**Your Audit (Provide in Markdown format with headers):**

1.  **### Quantitative Scoring (out of 10)**
    Provide a data-driven score for each category.
    *   **Statistical Edge:** (Your Score)/10. Justification based on Sharpe Ratio and Profit Factor.
    *   **Profitability Potential:** (Your Score)/10. Justification based on win rate and potential return.
    *   **Parameter Sensitivity:** (Your Score)/10. Justification on how sensitive this setup might be to market changes.

2.  **### Statistical Validity of Simulation**
    Critically assess the provided "Simulated Performance Metrics". Given that these are illustrative and not from a rigorous backtest, comment on their potential for being statistically insignificant or a result of curve-fitting. What additional data or tests would you need to validate this strategy?

3.  **### Core Logic Analysis**
    Analyze the mathematical logic. What is the expected value of a trade series given the **Grid Lot Multiplier (${config.gridMultiplier})** and the **Win Rate (${results.winRate})**? Discuss the trade-offs between the Martingale-style progression and the account's risk of ruin.

4.  **### Data-Driven Recommendations**
    Provide 2-3 specific, numbered suggestions for parameter adjustments that could improve the strategy's statistical profile (e.g., improve the Sharpe Ratio). For example, would a larger **Trend MA Period (${config.maPeriod})** improve trend-filtering and reduce false signals? Explain your reasoning with quantitative concepts.

5.  **### Market State Insight**
    Based on the live market data (ATR, RSI), is the current market state (volatile, trending, ranging) statistically favorable or unfavorable for this grid configuration?`;
            break;
        case 'Risk Manager':
            auditSection = `
**Your Audit (Provide in Markdown format with headers):**

1.  **### Risk Assessment Score (out of 10)**
    Provide a score for each category from a risk-first perspective.
    *   **Capital Preservation:** (Your Score)/10. Justification based on drawdown and Stop Loss.
    *   **Survivability:** (Your Score)/10. Justification based on the grid's structure and potential for margin calls.
    *   **Risk/Reward Balance:** (Your Score)/10. Justification.

2.  **### Primary Risk Exposure: Grid Progression**
    This is the most critical part of your analysis. Explicitly evaluate the extreme risk posed by the combination of **Grid Lot Multiplier (${config.gridMultiplier})** and **Max Grid Trades (${config.maxGridTrades})**. Calculate and state the total position size on the final grid level relative to the initial trade. What is the "worst-case scenario" drawdown if all grid trades are opened and the market moves against the position?

3.  **### Analysis of Safety Mechanisms**
    In a bulleted list, analyze the effectiveness of the current safety measures.
    *   **Stop Loss (${config.stopLoss}% Equity):** Is this stop loss adequate to prevent a catastrophic loss given the Martingale-style lot progression?
    *   **Trend Filter (MA ${config.maPeriod}):** How effective is this MA at preventing the EA from entering a grid against a strong, sustained trend?
    *   **Take Profit ($${config.takeProfit}):** Does the take profit level justify the risk being taken on?

4.  **### Mandatory Risk Mitigation Recommendations**
    Provide 2-3 specific, numbered recommendations that are NON-NEGOTIABLE from a risk management perspective to make this strategy safer. For example: "Immediately reduce the Grid Lot Multiplier to 1.3 or less..." or "Implement a hard stop loss on each individual trade in addition to the equity-based stop."

5.  **### Market Risk Insight**
    Based on the live market snapshot, especially the **RSI Divergence (${liveData.rsiDivergence})**, what is the immediate risk to a trader running this EA right now? Does the divergence signal a potential trend reversal that could trap this trend-following grid?`;
            break;
        case 'Aggressive Scalper':
             auditSection = `
**Your Audit (Provide in Markdown format with headers):**

1.  **### Scalping Potential Score (out of 10)**
    *   **Trade Frequency:** (Your Score)/10. How often will this setup likely trade?
    *   **Profit Capture:** (Your Score)/10. How effective is it at capturing small, quick profits?
    *   **Risk Tolerance:** (Your Score)/10. Is the risk level appropriate for an aggressive style?

2.  **### Speed & Agility Analysis**
    Analyze the configuration's speed. Is the **Trend MA Period (${config.maPeriod})** short enough to catch new trends quickly? Is the **Grid Distance (${config.gridDistance})** tight enough to enter trades frequently during pullbacks?

3.  **### Parameter Synergies for Aggression**
    Discuss how **Grid Lot Multiplier (${config.gridMultiplier})** and a low **Take Profit ($${config.takeProfit})** can work together to close out grids quickly for small gains. What are the pros and cons of this approach in a volatile market?

4.  **### Recommendations for More Action**
    Provide 2-3 numbered suggestions to make this strategy even more aggressive and increase its trading frequency. For example: "Consider reducing the MA Period to catch micro-trends..." or "Tighten the Grid Distance to capitalize on smaller pullbacks, but be aware this increases risk."

5.  **### Immediate Trading Opportunity**
    Based on the live market data, is there an immediate opportunity to scalp a quick move? What entry would you be looking for right now?`;
            break;
        case 'Contrarian Investor':
            auditSection = `
**Your Audit (Provide in Markdown format with headers):**

1.  **### Contrarian Viability Score (out of 10)**
    *   **Trend-Dependence:** (Your Score)/10. How badly will this fail in a ranging or reversing market? (Lower score is worse).
    *   **Assumptions Under Stress:** (Your Score)/10. How robust are the strategy's core assumptions?
    *   **Reversal Risk:** (Your Score)/10. How exposed is this strategy to a sharp trend reversal?

2.  **### Deconstructing the Trend-Following Fallacy**
    Challenge the core assumption that the trend identified by the **MA Period (${config.maPeriod})** will continue. What market conditions would cause this assumption to fail spectacularly? Discuss the risk of "catching a falling knife" with a buy grid in a market that has just started a major downturn.

3.  **### Identifying Failure Points**
    In a bulleted list, pinpoint the exact parameters that will cause the most damage during a market reversal.
    *   **Grid Lot Multiplier (${config.gridMultiplier}):** Explain how this parameter turns a small losing streak into a catastrophic loss during a trend change.
    *   **Stop Loss (${config.stopLoss}% Equity):** Why might this equity-based stop loss trigger too late to prevent significant damage?

4.  **### Contrarian Recommendations**
    Provide 2-3 numbered suggestions to make the strategy more robust against trend failure, or even to adapt it for contrarian entries. For example: "Instead of following the trend, consider using the MA as a mean-reversion line. Enter grids *towards* the MA when price is overextended."

5.  **### Contrarian Market Insight**
    The live data shows a **${liveData.rsiDivergence} RSI Divergence**. From a contrarian perspective, this is a powerful signal. Explain why this divergence might indicate the current trend is exhausted and that running this trend-following EA right now is particularly dangerous.`;
            break;
    }
  } else { // 'signal' strategy
    strategyConfigSection = `
**Signal Strategy Configuration:**
| Parameter                 | Value                               |
|---------------------------|-------------------------------------|
| Lot Size                  | ${(config.signal_lotSize ?? 0.01).toFixed(2)} |
| Trend Filter MA Period    | ${config.signal_maPeriod ?? 50}           |
| Trend Filter MA Type      | ${config.signal_maType ?? 'EMA'}             |
| RSI Period                | ${config.signal_rsiPeriod ?? 14}          |
| RSI Oversold Level        | ${config.signal_rsiOversold ?? 30}        |
| RSI Overbought Level      | ${config.signal_rsiOverbought ?? 70}      |
| ATR Period (for Risk)     | ${config.signal_atrPeriod ?? 14}          |
| ATR SL Multiplier         | ${(config.signal_atrMultiplierSL ?? 2.0).toFixed(2)}   |
| ATR TP Multiplier         | ${(config.signal_atrMultiplierTP ?? 3.0).toFixed(2)}   |
| Trailing Stop             | ${config.signal_useTrailingStop ? `Active (${config.signal_trailingStopStart}/${config.signal_trailingStopDistance} pts)` : 'Inactive'} |
`;
    switch (personality) {
        case 'Quantitative Analyst':
            auditSection = `
**Your Audit (Provide in Markdown format with headers):**

1.  **### Quantitative Scoring (out of 10)**
    *   **Statistical Edge:** (Your Score)/10. Justification based on Sharpe Ratio and the defined Risk/Reward ratio from ATR multipliers.
    *   **Signal Efficacy:** (Your Score)/10. How statistically effective are these MA/RSI parameters likely to be for filtering trades?
    *   **Curve-Fit Risk:** (Your Score)/10. How likely is it that these parameters are over-optimized for past data?

2.  **### Statistical Validity of Simulation**
    Critically assess the provided "Simulated Performance Metrics". Given that these are illustrative, comment on their potential for being statistically insignificant. What is the implied Risk/Reward Ratio from the **ATR Multipliers (SL: ${config.signal_atrMultiplierSL}, TP: ${config.signal_atrMultiplierTP})** and how does that relate to the simulated **Win Rate (${results.winRate})** to produce the **Profit Factor (${results.profitFactor})**?

3.  **### Core Logic Analysis**
    Analyze the strategy's logic. It's a trend-following pullback system. Quantitatively, what is the trade-off between a longer **MA Period (${config.signal_maPeriod})** (fewer, higher-quality signals) and a shorter period (more signals, more noise)?

4.  **### Data-Driven Recommendations**
    Provide 2-3 numbered suggestions for parameter adjustments that could improve the strategy's statistical profile. For example: "Test a higher ATR TP Multiplier to see if it increases the Profit Factor, even if it slightly lowers the Win Rate. The goal is to maximize expected value."

5.  **### Market State Insight**
    Based on the live market data (ATR, RSI), is the current market state statistically favorable for a pullback strategy? Is volatility (ATR) high enough to provide reasonable SL/TP distances?`;
            break;
        case 'Risk Manager':
            auditSection = `
**Your Audit (Provide in Markdown format with headers):**

1.  **### Risk Assessment Score (out of 10)**
    *   **Capital Preservation:** (Your Score)/10. How well does the ATR-based stop loss protect capital?
    *   **Risk/Reward Profile:** (Your Score)/10. Is the reward (ATR TP) sufficiently greater than the risk (ATR SL)? A ratio below 1.5 is a major red flag.
    *   **Whipsaw Exposure:** (Your Score)/10. How likely is this strategy to get chopped up in a ranging market?

2.  **### Primary Risk Exposure: Risk/Reward Ratio**
    This is your primary focus. The **ATR Multiplier for SL is ${config.signal_atrMultiplierSL}** and for **TP is ${config.signal_atrMultiplierTP}**. This creates a Risk/Reward Ratio of 1:${(config.signal_atrMultiplierTP / config.signal_atrMultiplierSL).toFixed(2)}. Is this ratio acceptable? What is the minimum R:R you would tolerate for a system with a ~${results.winRate} win rate?

3.  **### Analysis of Safety Mechanisms**
    In a bulleted list, analyze the safety measures.
    *   **ATR Stop Loss:** Is a volatility-based stop superior to a fixed-point or percentage stop for BTC/USD? What are its weaknesses?
    *   **Trend Filter (MA ${config.signal_maPeriod}):** How effectively does this filter prevent trades in directionless, "choppy" markets where this strategy would perform poorly?

4.  **### Mandatory Risk Mitigation Recommendations**
    Provide 2-3 non-negotiable recommendations to improve risk management. For example: "Increase the ATR Multiplier for SL to ${config.signal_atrMultiplierSL * 1.5} to give trades more breathing room and avoid being stopped out by noise," or "Increase the MA Period to filter for only the strongest trends, reducing exposure to range-bound price action."

5.  **### Market Risk Insight**
    Based on the live market snapshot, especially the **RSI Divergence (${liveData.rsiDivergence})**, is there an elevated risk of a trend reversal? If the EA's logic generates a signal now, should it be ignored due to the divergence warning?`;
            break;
        default: // Generic for other personas
            auditSection = `
**Your Audit (Provide in Markdown format with headers):**

1.  **### Strategy Audit Score (out of 10)**
    Provide a score for each of the following categories and a brief justification based on your persona's priorities.
    *   **Signal Quality:** (Your Score)/10. Justification...
    *   **Profitability Potential:** (Your Score)/10. Justification...
    *   **Risk/Reward Balance:** (Your Score)/10. Justification...

2.  **### Core Thesis Analysis**
    In a paragraph, analyze the core logic of this configuration from your persona's perspective. What is this strategy trying to achieve (e.g., trend-following, mean-reversion)? What are its primary strengths and weaknesses, especially concerning the interaction between the **MA Period** and **RSI Levels**?

3.  **### Parameter Interaction Deep Dive**
    In a bulleted list, identify 2-3 key parameter interactions that are most critical or concerning (e.g., "The short MA period of ${config.signal_maPeriod} combined with tight RSI levels might lead to frequent 'whipsaw' trades in non-trending markets.").

4.  **### Actionable Recommendations**
    Provide 2-3 specific, numbered suggestions for adjustments to improve the strategy according to your persona's goals. Explain the *why* behind each recommendation (e.g., "Widen the RSI levels to 25/75 to filter for more significant pullbacks...").

5.  **### Manual Trading Insights**
    Based on the live market snapshot and the detected RSI divergence of **${liveData.rsiDivergence}**, is there an imminent trade signal according to the EA's logic? Should a manual trader take it, or is there a reason to be cautious?
`;
    }
  }
  
  const prompt = `
${commonHeader}
${strategyConfigSection}
${auditSection}
  `;
  
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
            temperature: 0.5,
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes('API key not valid')) {
        return "**API Key Error:** The provided API key is not valid. Please ensure it is configured correctly in your environment.";
    }
    return `**An error occurred while analyzing the configuration:**\n\n*${errorMessage}*\n\nPlease check the console for more details.`;
  }
};

export const getSignalPromptTemplate = (liveData: LiveAnalysisData, fundamentals: FundamentalData): string => {
    
    let technicalData = `
- **Asset:** BTC/USD
- **Timeframe:** H1 (1-hour)
- **Latest Price:** $${liveData.latestPrice.toFixed(2)}
- **50-Period EMA:** $${liveData.maValue.toFixed(2)}
- **Overall Trend (based on price vs EMA):** ${liveData.trend}
- **RSI Divergence Detected:** ${liveData.rsiDivergence}
- **14-Period RSI:** ${liveData.rsiValue?.toFixed(2) ?? 'N/A'}
- **14-Period ATR (Volatility):** $${liveData.atrValue?.toFixed(2) ?? 'N/A'}`;

    if (liveData.macd) {
        technicalData += `
- **MACD (12,26,9):** Hist: ${liveData.macd.histogram.toFixed(2)}`;
    }
    if (liveData.stochastic) {
        technicalData += `
- **Stochastic (14,3,3):** %K: ${liveData.stochastic.k.toFixed(2)}, %D: ${liveData.stochastic.d.toFixed(2)}`;
    }

    return `
You are an expert market analyst and trader for BTC/USD on the H1 timeframe. Your task is to synthesize the provided technical and fundamental data into a single, actionable trading signal. You MUST provide a response in the specified JSON format.

**Current Market Data:**
${technicalData}

**Fundamental Analysis:**
- **Market Sentiment:** ${fundamentals.sentiment}
- **Key Headline:** "${fundamentals.headline}"

**Your Task:**
1.  **Analyze the Confluence:** Examine how the technical indicators (EMA, RSI, ATR, MACD, Stochastic) and especially the RSI Divergence align or diverge with the fundamental sentiment.
2.  **Formulate a Trade Thesis:** Based on your analysis, decide on the most probable short-term direction. State whether you will BUY, SELL, or HOLD. A detected RSI divergence is a very strong factor and should heavily influence your decision.
3.  **Define Trade Parameters:**
    - **Entry:** If BUY/SELL, determine a precise entry price. If HOLD, set to 0.
    - **Take Profit (TP):** Calculate a logical TP level using a multiple of the ATR (e.g., 1.5 * ATR). If HOLD, set to 0.
    - **Stop Loss (SL):** Calculate a defensive SL level using a multiple of the ATR (e.g., 1.0 * ATR). If HOLD, set to 0.
4.  **Justify Your Decision:** Write a detailed rationale explaining your thought process. Cover the technical (especially the divergence) and fundamental reasons for your signal.
5.  **Determine Confidence:** Assign a confidence level ('High', 'Medium', 'Low') based on how many factors align. High confidence requires strong confluence between technicals, fundamentals, and any detected divergence.

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
    
    const jsonStr = response.text.trim();
    const parsedData = JSON.parse(jsonStr);

    if (parsedData === null ||
        typeof parsedData.signal !== 'string' ||
        typeof parsedData.confidence !== 'string' ||
        typeof parsedData.entry !== 'number' ||
        typeof parsedData.takeProfit !== 'number' ||
        typeof parsedData.stopLoss !== 'number' ||
        typeof parsedData.rationale !== 'string') 
    {
      console.warn("Received malformed signal data from API, defaulting to HOLD:", parsedData);
      return {
        signal: 'HOLD',
        confidence: 'Low',
        entry: 0,
        takeProfit: 0,
        stopLoss: 0,
        rationale: '**Analysis Inconclusive:** The AI returned an incomplete or invalid signal. This can happen in highly volatile or uncertain market conditions. It is safest to wait for a clearer setup.'
      };
    }
    
    const signalData: TradingSignal = parsedData;
    return signalData;

  } catch (error) {
    console.error("Error calling Gemini API for trading signal:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to generate trading signal: ${errorMessage}`);
  }
};

export const generateOptimizationSuggestion = async (parameterTitle: string, config: EAConfig): Promise<{start: number, end: number, step: number}> => {
    const isInt = Number.isInteger(config[parameterTitle as keyof EAConfig] as number) || parameterTitle.toLowerCase().includes('period') || parameterTitle.toLowerCase().includes('trades') || parameterTitle.toLowerCase().includes('distance') || parameterTitle.toLowerCase().includes('start');

    const prompt = `
You are an expert trading algorithm optimizer for MQL5. Your task is to suggest an intelligent test range for a single parameter.

Analyze the provided EA configuration and the parameter to be optimized. Your goal is to suggest a tight, effective range that is likely to yield better results.

**Current EA Configuration:**
\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

**Parameter to Optimize:** "${parameterTitle}"
**Current Value:** ${config[parameterTitle as keyof EAConfig]}

**Your Task:**
Based on the full configuration, provide a smart test range.
- The range should be logical. For a risky parameter like "Grid Lot Multiplier", suggest a range that explores both safer and slightly more aggressive options. For a period like "Trend MA Period", suggest a range around the current value that explores faster and slower settings.
- The number of steps ( (end - start) / step ) should be reasonable, ideally between 10 and 20.
- The step value should be appropriate for the parameter (e.g., 1 or 5 for periods, 0.05 or 0.1 for multipliers).

Provide your response ONLY in the specified JSON format.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        start: { type: Type.NUMBER },
                        end: { type: Type.NUMBER },
                        step: { type: Type.NUMBER },
                    },
                    required: ['start', 'end', 'step']
                }
            }
        });

        const jsonStr = response.text.trim();
        const suggestion = JSON.parse(jsonStr);

        if (typeof suggestion.start !== 'number' || typeof suggestion.end !== 'number' || typeof suggestion.step !== 'number' || suggestion.step <= 0 || suggestion.start >= suggestion.end) {
            throw new Error("Received invalid range from AI.");
        }

        return {
            start: suggestion.start,
            end: suggestion.end,
            step: suggestion.step
        };

    } catch (error) {
        console.error("Error calling Gemini API for optimization suggestion:", error);
        throw new Error("Failed to generate AI optimization suggestion.");
    }
};
