import { useState, useCallback, useEffect } from 'react';

const SESSION_KEY = 'gridai_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => getStoredSession() !== null
  );

  useEffect(() => {
    const session = getStoredSession();
    setIsAuthenticated(session !== null);
  }, []);

  const login = useCallback(async (pin) => {
    const pinHash = await hashPin(pin);
    const expectedHash = import.meta.env.VITE_PIN_HASH || '';

    if (pinHash === expectedHash) {
      const session = {
        authenticated: true,
        expiresAt: Date.now() + SESSION_DURATION_MS,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
