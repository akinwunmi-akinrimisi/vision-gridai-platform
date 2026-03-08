import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock supabase before importing the hook
const mockSubscribe = vi.fn().mockReturnThis();
const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockChannel = vi.fn().mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
const mockRemoveChannel = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: (...args) => mockChannel(...args),
    removeChannel: (...args) => mockRemoveChannel(...args),
  },
}));

import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

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

describe('useRealtimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a channel with correct name pattern', () => {
    renderHook(
      () => useRealtimeSubscription('topics', 'project_id=eq.123', [['topics']]),
      { wrapper: createWrapper() }
    );

    expect(mockChannel).toHaveBeenCalledTimes(1);
    const channelName = mockChannel.mock.calls[0][0];
    expect(channelName).toMatch(/^topics-project_id=eq\.123-/);
  });

  it('subscribes to postgres_changes with correct table and filter', () => {
    renderHook(
      () => useRealtimeSubscription('scenes', 'topic_id=eq.abc', [['scenes']]),
      { wrapper: createWrapper() }
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'scenes',
        filter: 'topic_id=eq.abc',
      }),
      expect.any(Function)
    );
  });

  it('subscribes without filter when filter is null', () => {
    renderHook(
      () => useRealtimeSubscription('projects', null, [['projects']]),
      { wrapper: createWrapper() }
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'projects',
      }),
      expect.any(Function)
    );

    // Filter should NOT be in the config
    const config = mockOn.mock.calls[0][1];
    expect(config.filter).toBeUndefined();
  });

  it('calls subscribe on the channel', () => {
    renderHook(
      () => useRealtimeSubscription('projects', null, [['projects']]),
      { wrapper: createWrapper() }
    );

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('calls removeChannel on unmount', () => {
    const channelInstance = { on: mockOn, subscribe: mockSubscribe };
    mockChannel.mockReturnValue(channelInstance);
    mockOn.mockReturnValue(channelInstance);

    const { unmount } = renderHook(
      () => useRealtimeSubscription('topics', null, [['topics']]),
      { wrapper: createWrapper() }
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelInstance);
  });

  it('does not create channel when table is empty', () => {
    renderHook(
      () => useRealtimeSubscription('', null, []),
      { wrapper: createWrapper() }
    );

    expect(mockChannel).not.toHaveBeenCalled();
  });
});
