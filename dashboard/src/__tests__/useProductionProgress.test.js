import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createElement } from 'react';

// Mock supabase
const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
const mockOn = vi.fn();
const mockChannel = vi.fn(() => {
  const channelObj = {
    on: (...args) => { mockOn(...args); return channelObj; },
    subscribe: (...args) => { mockSubscribe(...args); return channelObj; },
  };
  return channelObj;
});

const mockOrder = vi.fn();
const mockEq = vi.fn(() => ({
  order: mockOrder,
}));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
}));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    channel: (...args) => mockChannel(...args),
    removeChannel: (...args) => mockRemoveChannel(...args),
  },
}));

import { useProductionProgress } from '../hooks/useProductionProgress';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrder.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useProductionProgress', () => {
  it('fetches scenes for given topicId from Supabase ordered by scene_number', async () => {
    const mockScenes = [
      { id: 's1', scene_number: 1, audio_status: 'uploaded', image_status: 'pending', video_status: 'pending', clip_status: 'pending' },
      { id: 's2', scene_number: 2, audio_status: 'pending', image_status: 'pending', video_status: 'pending', clip_status: 'pending' },
    ];
    mockOrder.mockResolvedValue({ data: mockScenes, error: null });

    const { result } = renderHook(() => useProductionProgress('topic-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith('scenes');
    expect(mockEq).toHaveBeenCalledWith('topic_id', 'topic-1');
  });

  it('returns empty array when topicId is null', async () => {
    const { result } = renderHook(() => useProductionProgress(null), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.scenes).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('subscribes to Realtime on scenes table filtered by topic_id', async () => {
    renderHook(() => useProductionProgress('topic-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalled();
    });

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'scenes' }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useProductionProgress('topic-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('computes stage completion counts from scene statuses', async () => {
    const mockScenes = [
      { id: 's1', scene_number: 1, audio_status: 'uploaded', image_status: 'uploaded', video_status: 'pending', clip_status: 'pending' },
      { id: 's2', scene_number: 2, audio_status: 'uploaded', image_status: 'pending', video_status: 'pending', clip_status: 'pending' },
      { id: 's3', scene_number: 3, audio_status: 'pending', image_status: 'pending', video_status: 'pending', clip_status: 'pending' },
    ];
    mockOrder.mockResolvedValue({ data: mockScenes, error: null });

    const { result } = renderHook(() => useProductionProgress('topic-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stageProgress.audio).toEqual(expect.objectContaining({ completed: 2 }));
    expect(result.current.stageProgress.images).toEqual(expect.objectContaining({ completed: 1 }));
  });

  it('returns isLoading and error states', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useProductionProgress('topic-1'), { wrapper: createWrapper() });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
