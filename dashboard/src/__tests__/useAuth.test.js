import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

// SHA-256 of "1234"
const TEST_PIN_HASH =
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_PIN_HASH', TEST_PIN_HASH);
});

describe('useAuth', () => {
  it('starts unauthenticated with no session', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('authenticates with correct PIN', async () => {
    const { result } = renderHook(() => useAuth());

    let success;
    await act(async () => {
      success = await result.current.login('1234');
    });

    expect(success).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('rejects wrong PIN', async () => {
    const { result } = renderHook(() => useAuth());

    let success;
    await act(async () => {
      success = await result.current.login('9999');
    });

    expect(success).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('persists session in localStorage', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('1234');
    });

    const stored = JSON.parse(localStorage.getItem('gridai_session'));
    expect(stored).not.toBeNull();
    expect(stored.authenticated).toBe(true);
    expect(stored.expiresAt).toBeGreaterThan(Date.now());
  });

  it('restores session from localStorage on mount', () => {
    const session = {
      authenticated: true,
      expiresAt: Date.now() + 1000 * 60 * 60,
    };
    localStorage.setItem('gridai_session', JSON.stringify(session));

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('rejects expired session', () => {
    const session = {
      authenticated: true,
      expiresAt: Date.now() - 1000,
    };
    localStorage.setItem('gridai_session', JSON.stringify(session));

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears session on logout', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('1234');
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('gridai_session')).toBeNull();
  });
});
