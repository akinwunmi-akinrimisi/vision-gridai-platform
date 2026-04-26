import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useCountryTab } from './useCountryTab';

const AU_ROUTE_PATTERNS = [
  /^\/au\//,
  /^\/project\/[^/]+\/au\//,
];

function isAURoute(pathname) {
  return AU_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

/**
 * Watches the current route and auto-switches the country tab to AU when
 * the user lands on an AU-only route (e.g. /au/compliance, /project/:id/au/swot)
 * — even via a direct URL or back/forward navigation.
 *
 * Without this, hitting /au/compliance from the General tab leaves the
 * sidebar in General mode (no AU Compliance Inbox link), which is
 * inconsistent with the URL the user is viewing.
 *
 * Only fires when the path actually matches an AU route. Never auto-switches
 * back to GENERAL — leaving an AU page (e.g. clicking a General-mode link)
 * is an explicit user action.
 */
export function useAutoSwitchCountry() {
  const { pathname } = useLocation();
  const { country, setCountry } = useCountryTab();

  useEffect(() => {
    if (isAURoute(pathname) && country !== 'AU') {
      setCountry('AU');
    }
  }, [pathname, country, setCountry]);
}
