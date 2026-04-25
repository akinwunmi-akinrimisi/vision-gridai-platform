import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'vg.country_tab';
const DEFAULT_COUNTRY = 'GENERAL';
const VALID = new Set(['GENERAL', 'AU']);

/**
 * Persists the active country tab in localStorage so it survives reloads.
 *
 * Returns:
 *   country        — the active value ('GENERAL' or 'AU')
 *   setCountry     — setter; rejects unknown values
 *   isAU / isGeneral — convenience booleans
 *
 * The country tab is a filter, not a routing prefix. Routes stay flat;
 * pages and the Sidebar read this hook and filter their data accordingly.
 *
 * AU-tab opens AU-only nav items (AU Calendar, AU SWOT, Coach Reports) and
 * scopes ProjectsHome to projects.country_target='AU'. CreateProjectModal
 * pre-fills country_target='AU' / language='en-AU' when the AU tab is
 * active.
 */
export function useCountryTab() {
  const [country, setCountryState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_COUNTRY;
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      return v && VALID.has(v) ? v : DEFAULT_COUNTRY;
    } catch {
      return DEFAULT_COUNTRY;
    }
  });

  // Cross-tab sync (if user changes country in another browser tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && VALID.has(e.newValue)) {
        setCountryState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCountry = useCallback((v) => {
    if (!VALID.has(v)) {
      console.warn('useCountryTab: ignoring invalid country', v);
      return;
    }
    setCountryState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* localStorage unavailable; in-memory only */
    }
  }, []);

  return {
    country,
    setCountry,
    isAU: country === 'AU',
    isGeneral: country === 'GENERAL',
  };
}
