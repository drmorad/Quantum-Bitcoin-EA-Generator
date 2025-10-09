
import React, { useState, useEffect, useRef } from 'react';
import { CodeIcon, CopyIcon, CheckIcon, DownloadIcon, EyeIcon, XIcon } from './icons.tsx';

interface FloatingCodeButtonProps {
  code: string;
  isEnabled: boolean;
  onViewCode: () => void;
}

const FloatingCodeButton: React.FC<FloatingCodeButtonProps> = ({ code, isEnabled, onViewCode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Copy logic
  const handleCopy = () => {
    if (!isEnabled) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setIsMenuOpen(false), 500); // Close menu after copying
  };
  
  // Download logic
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
    setIsMenuOpen(false);
  };

  const handleView = () => {
    onViewCode();
    setIsMenuOpen(false);
  }

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
      {/* Menu that pops up */}
      {isMenuOpen && (
        <div className="absolute bottom-full right-0 mb-3 w-48 bg-brand-secondary border border-brand-border rounded-lg shadow-lg flex flex-col items-stretch animate-fade-in-up">
          <button onClick={handleView} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-brand-text hover:bg-brand-border/50 transition-colors rounded-t-lg">
            <EyeIcon className="w-5 h-5 text-brand-muted" />
            <span>View Code</span>
          </button>
          <button onClick={handleCopy} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-brand-text hover:bg-brand-border/50 transition-colors">
            {copied ? <CheckIcon className="w-5 h-5 text-brand-buy" /> : <CopyIcon className="w-5 h-5 text-brand-muted" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button onClick={handleDownload} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-brand-text hover:bg-brand-border/50 transition-colors rounded-b-lg">
            <DownloadIcon className="w-5 h-5 text-brand-muted" />
            <span>Download File</span>
          </button>
        </div>
      )}

      {/* The main floating button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={!isEnabled}
        className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center shadow-lg hover:bg-amber-400 transition-all duration-200 transform hover:scale-105 disabled:bg-brand-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        aria-label={isMenuOpen ? "Close code options" : "Open code options"}
        title="Get MQL5 Code"
      >
        {isMenuOpen ? <XIcon className="w-8 h-8 text-white" /> : <CodeIcon className="w-8 h-8 text-white" />}
      </button>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default FloatingCodeButton;
