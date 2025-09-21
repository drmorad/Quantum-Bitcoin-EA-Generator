import { useState, useEffect } from 'react';

/**
 * A custom React hook that tracks the state of a CSS media query.
 * @param query The media query string to watch (e.g., '(min-width: 768px)').
 * @returns A boolean indicating whether the media query currently matches.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Use addEventListener for modern browsers, which is recommended over the deprecated addListener.
    mediaQueryList.addEventListener('change', listener);

    // Cleanup function to remove the listener when the component unmounts or the query changes.
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]); // Re-run the effect if the query string changes.

  return matches;
};
