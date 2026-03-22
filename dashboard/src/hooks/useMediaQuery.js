import { useState, useEffect } from 'react';

/**
 * React hook that tracks a CSS media query match.
 * @param {string} query - CSS media query string, e.g. '(max-width: 768px)'
 * @returns {boolean} Whether the media query currently matches
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    // Set initial value in case it changed between render and effect
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
