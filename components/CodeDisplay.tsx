
import React, 'react';
import { CodeIcon, CopyIcon, CheckIcon, DownloadIcon, LockIcon, XIcon } from './icons.tsx';

interface CodeDisplayProps {
  code: string;
  isEnabled: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

/**
 * A lightweight, custom syntax highlighter for MQL5 code.
 * It uses regular expressions to find and wrap different code elements
 * (keywords, types, comments, strings, etc.) in styled <span> tags.
 * This version uses a placeholder strategy to avoid highlighting keywords
 * inside strings or comments, ensuring greater accuracy.
 * @param code The raw MQL5 code string.
 * @returns An HTML string with syntax highlighting.
 */
const highlightMQL5 = (code: string): string => {
  if (!code) return '';

  // 1. Escape HTML characters to prevent XSS. This is critical when using dangerouslySetInnerHTML.
  let highlightedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 2. Use placeholders for strings and comments to prevent highlighting keywords inside them.
  const placeholders: string[] = [];
  let placeholderIndex = 0;
  
  // Temporarily replace comments
  highlightedCode = highlightedCode.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match) => {
    placeholders[placeholderIndex] = `<span class="mql5-comment">${match}</span>`;
    return `__PLACEHOLDER_${placeholderIndex++}__`;
  });

  // Temporarily replace strings
  highlightedCode = highlightedCode.replace(/(".*?")/g, (match) => {
    placeholders[placeholderIndex] = `<span class="mql5-string">${match}</span>`;
    return `__PLACEHOLDER_${placeholderIndex++}__`;
  });

  // 3. Highlight the rest of the code in a specific order to avoid conflicts.
  
  // Preprocessor directives (#include, #property)
  highlightedCode = highlightedCode.replace(/(^#\w+)/gm, '<span class="mql5-preprocessor">$1</span>');

  // Function calls (e.g., Print()) but not control flow keywords (if, for, while).
  const controlFlowKeywords = ['if', 'for', 'while', 'switch', 'return', 'case'];
  const functionRegex = new RegExp(`\\b(?!(${controlFlowKeywords.join('|')})\\b)([a-zA-Z_][a-zA-Z0-9_]*)\\b(?=\\s*\\()`, 'g');
  highlightedCode = highlightedCode.replace(functionRegex, '<span class="mql5-function">$1</span>');
  
  // Keywords (control flow, etc.)
  const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'default', 'return', 'break', 'continue', 'input', 'new', 'delete', 'static', 'const', 'bool'];
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  highlightedCode = highlightedCode.replace(keywordRegex, '<span class="mql5-keyword">$1</span>');

  // Data Types (void, int, double, etc.)
  const types = ['void', 'int', 'double', 'string', 'color', 'datetime', 'long', 'ulong', 'char', 'short', 'uchar', 'ushort', 'float', 'ENUM_MA_METHOD', 'MqlTick', 'CPositionInfo', 'CTrade', 'ENUM_POSITION_TYPE'];
  const typeRegex = new RegExp(`\\b(${types.join('|')})\\b`, 'g');
  highlightedCode = highlightedCode.replace(typeRegex, '<span class="mql5-type">$1</span>');

  // Constants (true, false, NULL, and MQL5-specific ones)
  const constants = ['true', 'false', 'NULL', 'EMPTY', 'WHOLE_ARRAY', 'MODE_SMA', 'MODE_EMA', 'PERIOD_H1', 'PRICE_CLOSE', 'OP_BUY', 'OP_SELL', 'POSITION_TYPE_BUY', 'POSITION_TYPE_SELL', 'INIT_SUCCEEDED', 'INIT_FAILED', '_Symbol', '_Point', 'PositionsTotal', 'SymbolInfoInteger', 'SymbolInfoDouble', 'SymbolInfoTick', 'AccountInfoDouble', 'CopyBuffer', 'IndicatorRelease', 'iTime', 'iMA', 'iATR', 'iRSI', 'CopyClose', 'Print', 'DoubleToString', 'NormalizeDouble', 'round', 'SYMBOL_SPREAD', 'SYMBOL_VOLUME_MIN', 'SYMBOL_VOLUME_MAX', 'SYMBOL_VOLUME_STEP'];
  const constantRegex = new RegExp(`\\b(${constants.join('|')})\\b`, 'g');
  highlightedCode = highlightedCode.replace(constantRegex, '<span class="mql5-constant">$1</span>');

  // Numbers (integers and floats)
  highlightedCode = highlightedCode.replace(/\b(\d+(\.\d*)?|\.\d+)\b/g, '<span class="mql5-number">$1</span>');

  // 4. Restore the placeholders for strings and comments.
  for (let i = 0; i < placeholderIndex; i++) {
    highlightedCode = highlightedCode.replace(`__PLACEHOLDER_${i}__`, placeholders[i]);
  }

  return highlightedCode;
};

const CodeDisplay: React.FC<CodeDisplayProps> = ({ code, isEnabled, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const highlightedCode = React.useMemo(() => highlightMQL5(code), [code]);

  React.useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    if (!isEnabled) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
  };

  const handleDownload = () => {
    if (!isEnabled) return;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Quantum_Bitcoin_EA.mq5';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg flex flex-col relative h-full">
      <div className="flex justify-between items-center p-4 border-b border-brand-border flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CodeIcon className="w-5 h-5 text-brand-accent"/>
          Generated MQL5 Code
        </h2>
        <div className="flex items-center gap-3">
            <button 
                onClick={handleDownload} 
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-brand-accent hover:bg-opacity-80 text-brand-primary font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isEnabled}
                aria-label="Download .mq5 file"
            >
              <DownloadIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button 
                onClick={handleCopy} 
                className="p-2 rounded-md bg-brand-primary hover:bg-brand-border transition-colors text-brand-muted hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isEnabled}
                aria-label="Copy code"
                title="Copy code"
            >
            {copied ? <CheckIcon className="w-5 h-5 text-brand-buy" /> : <CopyIcon className="w-5 h-5" />}
            </button>
            {onClose && (
              <button 
                  onClick={onClose} 
                  className="p-2 rounded-full hover:bg-brand-border transition-colors ml-2"
                  aria-label="Close code view"
              >
                  <XIcon className="w-5 h-5 text-brand-muted" />
              </button>
            )}
        </div>
      </div>
      <div className="p-4 overflow-auto flex-grow relative bg-brand-primary">
        <pre className={`text-sm font-mono whitespace-pre-wrap transition-filter duration-300 ${!isEnabled ? 'blur-sm' : ''}`}>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
        {!isEnabled && (
            <div className="absolute inset-0 bg-brand-secondary/80 flex flex-col items-center justify-center text-center p-4">
                <LockIcon className="w-12 h-12 text-yellow-400 mb-4"/>
                <h3 className="text-lg font-semibold text-brand-text">Invalid Configuration</h3>
                <p className="text-brand-muted">Please correct the errors in the configuration panel to enable code generation.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CodeDisplay;
