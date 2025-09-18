import React, { useState, useEffect } from 'react';
import { CodeIcon, CopyIcon, CheckIcon, DownloadIcon, LockIcon } from './icons';

interface CodeDisplayProps {
  code: string;
  isEnabled: boolean;
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({ code, isEnabled }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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
    <div className="bg-brand-secondary border border-brand-border rounded-lg flex flex-col relative">
      <div className="flex justify-between items-center p-4 border-b border-brand-border">
        <h2 className="text-xl font-semibold flex items-center gap-3">
          <CodeIcon className="w-6 h-6 text-brand-accent"/>
          Generated MQL5 Code
        </h2>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleCopy} 
                className="p-2 rounded-md bg-brand-primary hover:bg-brand-border transition-colors text-brand-muted hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isEnabled}
                aria-label="Copy code"
            >
            {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
            </button>
            <button 
                onClick={handleDownload} 
                className="p-2 rounded-md bg-brand-primary hover:bg-brand-border transition-colors text-brand-muted hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isEnabled}
                aria-label="Download code"
            >
            <DownloadIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
      <div className="p-4 overflow-auto flex-grow h-96 lg:h-auto relative">
        <pre className={`text-sm font-mono whitespace-pre-wrap ${!isEnabled ? 'blur-sm' : ''}`}>
          <code>{code}</code>
        </pre>
        {!isEnabled && (
            <div className="absolute inset-0 bg-brand-secondary/80 flex flex-col items-center justify-center text-center p-4">
                <LockIcon className="w-12 h-12 text-yellow-400 mb-4"/>
                <h3 className="text-lg font-semibold text-white">Invalid Configuration</h3>
                <p className="text-brand-muted">Please correct the errors in the configuration panel to enable code generation.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CodeDisplay;