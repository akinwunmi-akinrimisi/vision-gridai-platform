import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React from 'react';

// Mock supabase client
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSingle = vi.fn().mockResolvedValue({ data: { classification_status: 'pending', project_id: 'proj-1' }, error: null });
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockEq = vi.fn().mockImplementation(() => ({ order: mockOrder, single: mockSingle }));
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockImplementation(() => ({ select: mockSelect, update: mockUpdate }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}));

// Mock webhookCall
const mockWebhookCall = vi.fn().mockResolvedValue({ success: true });
vi.mock('../lib/api', () => ({
  webhookCall: (...args) => mockWebhookCall(...args),
}));

// Mock useRealtimeSubscription (no-op)
vi.mock('../hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: vi.fn(),
}));

import { useSceneClassification } from '../hooks/useSceneClassification';

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

const mockScenes = [
  { id: 's1', scene_number: 1, render_method: 'fal_ai', classification_status: 'classified' },
  { id: 's2', scene_number: 2, render_method: 'fal_ai', classification_status: 'classified' },
  { id: 's3', scene_number: 3, render_method: 'remotion', classification_status: 'classified' },
  { id: 's4', scene_number: 4, render_method: 'fal_ai', classification_status: 'overridden' },
  { id: 's5', scene_number: 5, render_method: 'remotion', classification_status: 'reviewed' },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Reset default responses
  mockOrder.mockResolvedValue({ data: mockScenes, error: null });
  mockSingle.mockResolvedValue({ data: { classification_status: 'classified', project_id: 'proj-1' }, error: null });
  mockEq.mockImplementation(() => ({ order: mockOrder, single: mockSingle }));
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockImplementation(() => ({ select: mockSelect, update: mockUpdate }));
});

describe('useSceneClassification -- Data Fetching', () => {
  it('returns empty scenes array when no topicId is provided', async () => {
    // Override so scenes query returns empty
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useSceneClassification(null), {
      wrapper: createWrapper(),
    });

    // When topicId is null, enabled is false so query never runs
    expect(result.current.scenes).toEqual([]);
    expect(result.current.stats.total).toBe(0);
  });

  it('computes stats correctly (total, falAiCount, remotionCount, estimatedCost)', async () => {
    const { result } = renderHook(() => useSceneClassification('topic-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.scenes.length).toBe(5));

    expect(result.current.stats.total).toBe(5);
    expect(result.current.stats.falAiCount).toBe(3);
    expect(result.current.stats.remotionCount).toBe(2);
    expect(result.current.stats.estimatedCost).toBeCloseTo(0.09); // 3 * $0.03
    expect(result.current.stats.savings).toBeCloseTo(0.06); // 2 * $0.03
  });

  it('computes classifiedCount from scenes with classified/reviewed/overridden status', async () => {
    const { result } = renderHook(() => useSceneClassification('topic-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.scenes.length).toBe(5));

    // All 5 mock scenes have classified/reviewed/overridden status
    expect(result.current.stats.classifiedCount).toBe(5);
  });
});

describe('useSceneClassification -- Mutations', () => {
  it('classifyScenes calls the classify-scenes webhook', async () => {
    const { result } = renderHook(() => useSceneClassification('topic-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.scenes.length).toBe(5));

    await act(async () => {
      result.current.classifyScenes('topic-1');
    });

    expect(mockWebhookCall).toHaveBeenCalledWith('classify-scenes', { topic_id: 'topic-1' });
  });

  it('overrideScene calls supabase update on scenes table', async () => {
    const mockEqForUpdate = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEqForUpdate });

    const { result } = renderHook(() => useSceneClassification('topic-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.scenes.length).toBe(5));

    await act(async () => {
      result.current.overrideScene({
        sceneId: 's1',
        renderMethod: 'remotion',
        remotionTemplate: 'data_visualization',
        dataPayload: null,
      });
    });

    // Should call supabase.from('scenes').update(...).eq('id', 's1')
    expect(mockFrom).toHaveBeenCalledWith('scenes');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        render_method: 'remotion',
        classification_status: 'overridden',
      })
    );
  });

  it('acceptClassification updates topic and triggers image generation webhook', async () => {
    const mockEqForUpdate = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEqForUpdate });

    const { result } = renderHook(() => useSceneClassification('topic-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.scenes.length).toBe(5));

    await act(async () => {
      result.current.acceptClassification('topic-1');
    });

    // Should call supabase.from('topics').update(...)
    expect(mockFrom).toHaveBeenCalledWith('topics');
    expect(mockUpdate).toHaveBeenCalledWith({ classification_status: 'reviewed' });
    // Should call webhook
    expect(mockWebhookCall).toHaveBeenCalledWith('production/trigger', {
      topic_id: 'topic-1',
      action: 'generate_images',
    });
  });
});
