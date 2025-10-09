
import React, { useEffect, useRef } from 'react';
import { UsersIcon } from './icons.tsx';

interface MyfxbookWidgetProps {
    theme: 'light' | 'dark';
}

const MyfxbookWidget: React.FC<MyfxbookWidgetProps> = ({ theme }) => {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // This effect re-runs whenever the theme changes, ensuring the widget's style is updated.
    if (widgetContainerRef.current) {
        const container = widgetContainerRef.current;
        // Clear the container to remove the old widget before adding a new one.
        container.innerHTML = ''; 

        const style = theme === 'dark' ? '2' : '1'; // Myfxbook uses '1' for light, '2' for dark.

        const script = document.createElement('script');
        script.src = `https://widgets.myfxbook.com/scripts/fxOutlook.js?type=1&style=${style}&symbols=,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,27,28,29,31,34,36,37,38,40,41,42,43,45,46,47,48,49,50,51,103,107,131,137,1233,1234,1236,1245,1246,1247,1815,1863,1893,2012,2076,2090,2114,2115,2119,2521,2603,2872,3005,3240,3473,5079,5435,5779`;
        script.type = 'text/javascript';
        script.className = 'powered';
        script.async = true;

        script.onload = () => {
            // This script must be executed after the main widget script has loaded.
            const callerScript = document.createElement('script');
            callerScript.type = 'text/javascript';
            // Use try-catch as the global function might not be immediately available.
            callerScript.innerHTML = 'try { showOutlookWidget(); } catch (e) { console.error("Myfxbook widget function not found:", e); }';
            container.appendChild(callerScript);
        };
        
        container.appendChild(script);
    }
  }, [theme]); // Dependency array ensures the effect runs when the theme changes.

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-lg p-6 h-full">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
        <UsersIcon className="w-6 h-6 text-brand-accent"/>
        Community Sentiment
      </h2>
      <div ref={widgetContainerRef} className="min-h-[300px]">
        {/* The widget content will be injected here by the scripts */}
      </div>
      <div className="text-xs text-brand-muted mt-2">
        <a 
            href="https://www.myfxbook.com" 
            title="Myfxbook" 
            className="myfxbookLink hover:text-brand-accent transition-colors" 
            target="_blank" 
            rel="noopener noreferrer"
        >
            Powered by Myfxbook.com
        </a>
      </div>
    </div>
  );
};

export default MyfxbookWidget;
