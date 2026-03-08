import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React from 'react';

// Mock supabase client
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
const mockSubscribe = vi.fn();
const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockChannel = vi.fn().mockReturnValue({ on: mockOn });

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    channel: (...args) => mockChannel(...args),
    removeChannel: vi.fn(),
  },
}));

import { useScenes } from '../hooks/useScenes';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset default mock chain
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockEq.mockReturnValue({ order: mockOrder });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
});

describe('useScenes (SCPT-09)', () => {
  it('fetches scenes from Supabase filtered by topic_id, ordered by scene_number', async () => {
    const mockScenes = [
      { id: 's1', scene_number: 1, topic_id: 'topic-1' },
      { id: 's2', scene_number: 2, topic_id: 'topic-1' },
    ];
    mockOrder.mockResolvedValue({ data: mockScenes, error: null });

    const { result } = renderHook(() => useScenes('topic-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('scenes');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('topic_id', 'topic-1');
    expect(mockOrder).toHaveBeenCalledWith('scene_number', { ascending: true });
    expect(result.current.data).toEqual(mockScenes);
  });

  it('returns empty array when no scenes exist', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useScenes('topic-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('subscribes to Realtime on scenes table with topic_id filter', () => {
    renderHook(() => useScenes('topic-1'), {
      wrapper: createWrapper(),
    });

    expect(mockChannel).toHaveBeenCalled();
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'scenes',
        filter: 'topic_id=eq.topic-1',
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('is disabled when topicId is null or undefined', () => {
    const { result } = renderHook(() => useScenes(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
