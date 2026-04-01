import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

vi.mock('../lib/supabase', () => {
  const mockChain = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
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
  NICHES,
  useLatestDiscoveryRun,
  useDiscoveryResults,
  useAllDiscoveryRuns,
  useRunDiscovery,
  useCancelDiscovery,
  useAnalyzeVideo,
  useVideoAnalysis,
  useAllAnalyses,
} from '../hooks/useYouTubeDiscovery';
import { webhookCall } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('NICHES constant', () => {
  it('has exactly 5 niches', () => {
    expect(NICHES).toHaveLength(5);
  });

  it('each niche has key and label', () => {
    for (const n of NICHES) {
      expect(n.key).toBeTruthy();
      expect(n.label).toBeTruthy();
    }
  });

  it('includes all expected categories', () => {
    const keys = NICHES.map((n) => n.key);
    expect(keys).toContain('narrative_storytelling');
    expect(keys).toContain('real_estate');
    expect(keys).toContain('personal_finance');
    expect(keys).toContain('business_marketing');
    expect(keys).toContain('legal_tax');
  });
});

describe('useLatestDiscoveryRun', () => {
  it('returns null when no runs exist', async () => {
    const { result } = renderHook(() => useLatestDiscoveryRun(), { wrapper });
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe('useDiscoveryResults', () => {
  it('is disabled when runId is falsy', () => {
    const { result } = renderHook(() => useDiscoveryResults(null, 'all'), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is enabled when runId is provided', () => {
    const { result } = renderHook(() => useDiscoveryResults('run-123', 'all'), { wrapper });
    expect(result.current.fetchStatus).not.toBe('idle');
  });
});

describe('useRunDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls webhook with time_range', async () => {
    const { result } = renderHook(() => useRunDiscovery(), { wrapper });

    await act(async () => {
      result.current.mutate({ timeRange: '1y' });
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('youtube/discover', { time_range: '1y' });
    });
  });

  it('shows success toast on success', async () => {
    const { result } = renderHook(() => useRunDiscovery(), { wrapper });

    await act(async () => {
      result.current.mutate({ timeRange: '30d' });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('YouTube Discovery started'));
    });
  });

  it('shows error toast on failure', async () => {
    webhookCall.mockResolvedValueOnce({ success: false, error: 'Quota exceeded' });
    const { result } = renderHook(() => useRunDiscovery(), { wrapper });

    await act(async () => {
      result.current.mutate({ timeRange: '7d' });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Quota exceeded'));
    });
  });
});

describe('useCancelDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it('updates run status to failed', async () => {
    const { result } = renderHook(() => useCancelDiscovery(), { wrapper });

    await act(async () => {
      result.current.mutate('run-abc');
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('yt_discovery_runs');
      expect(toast.success).toHaveBeenCalledWith('Discovery cancelled');
    });
  });
});

describe('useAnalyzeVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'analysis-1' }, error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'analysis-1' }, error: null }),
        }),
      }),
    });
  });

  it('creates analysis row and triggers webhook', async () => {
    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });

    const video = {
      run_id: 'run-1',
      video_id: 'abc123',
      title: 'Test Video',
      channel_name: 'Test Channel',
      video_url: 'https://youtube.com/watch?v=abc123',
      thumbnail_url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
      niche_category: 'personal_finance',
      views: 500000,
      likes: 10000,
      comments: 2000,
      duration_seconds: 3600,
    };

    await act(async () => {
      result.current.mutate(video);
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('yt_video_analyses');
      expect(webhookCall).toHaveBeenCalledWith('youtube/analyze', expect.objectContaining({
        analysis_id: 'analysis-1',
        video_id: 'abc123',
        video_url: 'https://youtube.com/watch?v=abc123',
      }));
    });
  });

  it('shows success toast', async () => {
    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        run_id: 'r', video_id: 'v', title: 't', channel_name: 'c',
        video_url: 'u', thumbnail_url: 'th', niche_category: 'n',
        views: 0, likes: 0, comments: 0, duration_seconds: 0,
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Analysis started'));
    });
  });
});

describe('useVideoAnalysis', () => {
  it('is disabled when analysisId is null', () => {
    const { result } = renderHook(() => useVideoAnalysis(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is enabled when analysisId is provided', () => {
    const { result } = renderHook(() => useVideoAnalysis('analysis-1'), { wrapper });
    expect(result.current.fetchStatus).not.toBe('idle');
  });
});

describe('useAllAnalyses', () => {
  it('fetches from yt_video_analyses table', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { result } = renderHook(() => useAllAnalyses(), { wrapper });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('yt_video_analyses');
    });
  });
});
