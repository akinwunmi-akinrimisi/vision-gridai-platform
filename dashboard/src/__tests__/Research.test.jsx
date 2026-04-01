import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'run-1', status: 'complete' }, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

import { useRunResearch, useRunById } from '../hooks/useResearch';
import { webhookCall } from '../lib/api';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useRunResearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends platforms and time_range in webhook payload', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    result.current.mutate({
      projectId: 'proj-1',
      platforms: ['reddit', 'youtube'],
      timeRange: '30d',
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('research/run', {
        project_id: 'proj-1',
        platforms: ['reddit', 'youtube'],
        time_range: '30d',
      });
    });
  });

  it('sends all platforms when all selected', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    result.current.mutate({
      projectId: 'proj-1',
      platforms: ['reddit', 'youtube', 'tiktok', 'trends', 'quora'],
      timeRange: '7d',
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('research/run', {
        project_id: 'proj-1',
        platforms: ['reddit', 'youtube', 'tiktok', 'trends', 'quora'],
        time_range: '7d',
      });
    });
  });
});

describe('useRunById', () => {
  it('fetches a specific run by ID', async () => {
    const { result } = renderHook(() => useRunById('run-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 'run-1', status: 'complete' });
    });
  });

  it('is disabled when runId is null', () => {
    const { result } = renderHook(() => useRunById(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
