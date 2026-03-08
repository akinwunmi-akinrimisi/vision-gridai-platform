import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

describe('QueryClient', () => {
  it('exports a QueryClient instance', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it('has staleTime set to 30000ms', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.staleTime).toBe(30000);
  });

  it('has retry set to 1', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.retry).toBe(1);
  });

  it('has refetchOnWindowFocus set to true', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.refetchOnWindowFocus).toBe(true);
  });
});
