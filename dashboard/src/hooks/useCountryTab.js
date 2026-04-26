import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'vg.country_tab';
const DEFAULT_COUNTRY = 'GENERAL';
const VALID = new Set(['GENERAL', 'AU']);

// Module-level singleton state.
// Without this, every component that calls useCountryTab() got its OWN
// useState — toggling the tab in Sidebar updated Sidebar's instance only,
// while ProjectsHome / Sidebar nav filters / CreateProjectModal kept reading
// the stale value. localStorage 'storage' events only fire across browser
// tabs (not within the same tab), so cross-component sync never happened.
// Module-level state + a listener set fixes that without introducing a
// Context Provider.
function _readPersisted() {
  if (typeof window === 'undefined') return DEFAULT_COUNTRY;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && VALID.has(v) ? v : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}
let _country = _readPersisted();
const _listeners = new Set();
function _notifyAll() {
  for (const fn of _listeners) {
    try { fn(_country); } catch { /* ignore listener errors */ }
  }
}

/**
 * Persists the active country tab in localStorage and shares state across
 * every component that calls this hook in the same browser tab.
 *
 * Returns:
 *   country         — the active value ('GENERAL' or 'AU')
 *   setCountry      — setter; rejects unknown values; broadcasts to all
 *                     mounted hook instances synchronously
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
  const [country, setLocal] = useState(_country);

  // Subscribe this instance to module-level updates (intra-tab sync)
  useEffect(() => {
    const onChange = (v) => setLocal(v);
    _listeners.add(onChange);
    // Sync immediately in case the module-level value advanced before this
    // effect ran (e.g. another hook instance set it during render).
    if (country !== _country) setLocal(_country);
    return () => { _listeners.delete(onChange); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-tab sync (separate browser tab/window changes the value)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && VALID.has(e.newValue) && e.newValue !== _country) {
        _country = e.newValue;
        _notifyAll();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCountry = useCallback((v) => {
    if (!VALID.has(v)) {
      // eslint-disable-next-line no-console
      console.warn('useCountryTab: ignoring invalid country', v);
      return;
    }
    if (_country === v) return;
    _country = v;
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* localStorage unavailable; in-memory only */
    }
    _notifyAll();
  }, []);

  return {
    country,
    setCountry,
    isAU: country === 'AU',
    isGeneral: country === 'GENERAL',
  };
}
