import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

vi.mock('../lib/supabase', () => {
  const mockChain = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'run-1', status: 'complete' }, error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
  return {
    supabase: {
      from: vi.fn(() => mockChain()),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ message: 'Workflow was started' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  useLatestRun,
  useCategories,
  useResults,
  useRunResearch,
  useAllRuns,
  useRunById,
  useCancelResearch,
} from '../hooks/useResearch';
import { webhookCall } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ─── useRunResearch ──────────────────────────────────

describe('useRunResearch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends niche, platforms, and time_range in webhook payload', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    await act(async () => {
      result.current.mutate({
        niche: 'credit cards',
        platforms: ['reddit', 'youtube'],
        timeRange: '30d',
      });
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('research/run', {
        niche: 'credit cards',
        project_id: null,
        platforms: ['reddit', 'youtube'],
        time_range: '30d',
      });
    });
  });

  it('sends all platforms when all selected', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    await act(async () => {
      result.current.mutate({
        niche: 'AI tools',
        platforms: ['reddit', 'youtube', 'tiktok', 'trends', 'quora'],
        timeRange: '7d',
      });
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('research/run', expect.objectContaining({
        platforms: ['reddit', 'youtube', 'tiktok', 'trends', 'quora'],
      }));
    });
  });

  it('sends undefined niche when not provided', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    await act(async () => {
      result.current.mutate({ niche: undefined, platforms: ['youtube'], timeRange: '1d' });
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('research/run', expect.objectContaining({
        niche: undefined,
        project_id: null,
      }));
    });
  });

  it('shows success toast on success', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    await act(async () => {
      result.current.mutate({ niche: 'test', platforms: ['reddit'], timeRange: '7d' });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Research started'));
    });
  });

  it('shows error toast when webhook fails', async () => {
    webhookCall.mockResolvedValueOnce({ success: false, error: 'Server error' });
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    await act(async () => {
      result.current.mutate({ niche: 'test', platforms: ['reddit'], timeRange: '7d' });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Server error'));
    });
  });
});

// ─── useRunById ──────────────────────────────────────

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

// ─── useLatestRun ────────────────────────────────────

describe('useLatestRun', () => {
  it('fetches latest run globally', async () => {
    const { result } = renderHook(() => useLatestRun(), { wrapper });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('research_runs');
      expect(result.current.data).toBeTruthy();
    });
  });
});

// ─── useCategories ───────────────────────────────────

describe('useCategories', () => {
  it('is disabled when runId is null', () => {
    const { result } = renderHook(() => useCategories(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is enabled when runId is provided', () => {
    const { result } = renderHook(() => useCategories('run-1'), { wrapper });
    expect(result.current.fetchStatus).not.toBe('idle');
  });
});

// ─── useResults ──────────────────────────────────────

describe('useResults', () => {
  it('is disabled when runId is null', () => {
    const { result } = renderHook(() => useResults(null, 'all'), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is enabled when runId is provided', () => {
    const { result } = renderHook(() => useResults('run-1', 'all'), { wrapper });
    expect(result.current.fetchStatus).not.toBe('idle');
  });
});

// ─── useAllRuns ──────────────────────────────────────

describe('useAllRuns', () => {
  it('fetches from research_runs table', async () => {
    const { result } = renderHook(() => useAllRuns(), { wrapper });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('research_runs');
    });
  });
});

// ─── useCancelResearch ───────────────────────────────

describe('useCancelResearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it('updates run status to failed', async () => {
    const { result } = renderHook(() => useCancelResearch(), { wrapper });

    await act(async () => {
      result.current.mutate('run-1');
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('research_runs');
      expect(toast.success).toHaveBeenCalledWith('Research run cancelled');
    });
  });
});
