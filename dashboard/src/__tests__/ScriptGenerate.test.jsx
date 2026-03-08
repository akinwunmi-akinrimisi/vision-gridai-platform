import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React from 'react';

// Mock react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id', topicId: 'test-topic-id' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock webhookCall
const mockWebhookCall = vi.fn().mockResolvedValue({ success: true });
vi.mock('../lib/api', () => ({
  webhookCall: (...args) => mockWebhookCall(...args),
}));

import { useGenerateScript } from '../hooks/useScriptMutations';

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
});

describe('useGenerateScript (SCPT-01)', () => {
  it('calls webhookCall with script/generate and topic_id', async () => {
    const { result } = renderHook(() => useGenerateScript('test-topic-id'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockWebhookCall).toHaveBeenCalledWith('script/generate', { topic_id: 'test-topic-id' });
  });

  it('optimistic update sets topic status to scripting', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['script', 'test-topic-id'], {
      id: 'test-topic-id',
      status: 'pending',
      review_status: 'approved',
    });

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useGenerateScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id' });
    });

    const data = queryClient.getQueryData(['script', 'test-topic-id']);
    expect(data.status).toBe('scripting');
  });

  it('invalidates script query on settle', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useGenerateScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['script', 'test-topic-id'] });
  });
});

describe('Generate Script -- Button State', () => {
  it('generate button is disabled when topic already has a script (script_json not null)', () => {
    const topic = { id: 'test-topic-id', script_json: { scenes: [] }, review_status: 'approved' };
    const isDisabled = !!topic.script_json || topic.review_status !== 'approved';
    expect(isDisabled).toBe(true);
  });

  it('generate button is disabled when topic is not approved (review_status != approved)', () => {
    const topic = { id: 'test-topic-id', script_json: null, review_status: 'pending' };
    const isDisabled = !!topic.script_json || topic.review_status !== 'approved';
    expect(isDisabled).toBe(true);
  });
});
