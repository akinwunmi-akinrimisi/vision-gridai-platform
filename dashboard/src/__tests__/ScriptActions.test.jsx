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
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
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

import {
  useApproveScript,
  useRejectScript,
  useRefineScript,
  useRegenPrompts,
} from '../hooks/useScriptMutations';

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

describe('useApproveScript (SCPT-11)', () => {
  it('calls webhookCall with script/approve and topic_id', async () => {
    const { result } = renderHook(() => useApproveScript('test-topic-id'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockWebhookCall).toHaveBeenCalledWith('script/approve', { topic_id: 'test-topic-id' });
  });

  it('invalidates script query on settle', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useApproveScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['script', 'test-topic-id'] });
  });

  it('optimistic update sets script_review_status to approved', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['script', 'test-topic-id'], {
      id: 'test-topic-id',
      script_review_status: 'pending',
    });

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useApproveScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id' });
    });

    // Check optimistic update was applied
    const data = queryClient.getQueryData(['script', 'test-topic-id']);
    expect(data.script_review_status).toBe('approved');
  });
});

describe('useRejectScript (SCPT-12)', () => {
  it('calls webhookCall with script/reject, topic_id, and feedback', async () => {
    const { result } = renderHook(() => useRejectScript('test-topic-id'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id', feedback: 'Hook is weak' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockWebhookCall).toHaveBeenCalledWith('script/reject', {
      topic_id: 'test-topic-id',
      feedback: 'Hook is weak',
    });
  });

  it('invalidates script query on settle', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRejectScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id', feedback: 'Bad' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['script', 'test-topic-id'] });
  });

  it('optimistic update sets script_review_status to rejected', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['script', 'test-topic-id'], {
      id: 'test-topic-id',
      script_review_status: 'pending',
    });

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRejectScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id', feedback: 'Bad' });
    });

    const data = queryClient.getQueryData(['script', 'test-topic-id']);
    expect(data.script_review_status).toBe('rejected');
  });
});

describe('useRefineScript (SCPT-12)', () => {
  it('calls webhookCall with script/refine, topic_id, and instructions', async () => {
    const { result } = renderHook(() => useRefineScript('test-topic-id'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id', instructions: 'Strengthen the hook' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockWebhookCall).toHaveBeenCalledWith('script/refine', {
      topic_id: 'test-topic-id',
      instructions: 'Strengthen the hook',
    });
  });

  it('invalidates script query on settle', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRefineScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id', instructions: 'Fix it' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['script', 'test-topic-id'] });
  });
});

describe('useRegenPrompts', () => {
  it('calls webhookCall with script/regen-prompts, topic_id, and scene_ids', async () => {
    const { result } = renderHook(() => useRegenPrompts('test-topic-id'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id', scene_ids: ['s1', 's2'] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockWebhookCall).toHaveBeenCalledWith('script/regen-prompts', {
      topic_id: 'test-topic-id',
      scene_ids: ['s1', 's2'],
    });
  });

  it('invalidates scenes query on settle', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRegenPrompts('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id', scene_ids: ['s1'] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['scenes', 'test-topic-id'] });
  });
});

describe('Script Mutations -- Error Handling', () => {
  it('error rollback restores previous data on approve failure', async () => {
    mockWebhookCall.mockRejectedValueOnce(new Error('Network error'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['script', 'test-topic-id'], {
      id: 'test-topic-id',
      script_review_status: 'pending',
    });

    const wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useApproveScript('test-topic-id'), { wrapper });

    await act(async () => {
      result.current.mutate({ topic_id: 'test-topic-id' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData(['script', 'test-topic-id']);
    expect(data.script_review_status).toBe('pending');
  });
});
