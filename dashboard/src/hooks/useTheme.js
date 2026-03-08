import { useState, useCallback, useEffect } from 'react';

const THEME_KEY = 'gridai_theme';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  return { isDark, toggle };
}
