import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
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
vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

// Import hook under test -- does not exist yet (RED phase)
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
  it('calls webhookCall with script/generate and topic_id', () => {
    // RED: hook does not exist yet
    expect(true).toBe(false);
  });

  it('optimistic update sets topic status to scripting', () => {
    // RED: optimistic update changes status before server responds
    expect(true).toBe(false);
  });

  it('invalidates script query on settle', () => {
    // RED: cache invalidation after generation starts
    expect(true).toBe(false);
  });
});

describe('Generate Script — Button State', () => {
  it('generate button is disabled when topic already has a script (script_json not null)', () => {
    // RED: button disabled check based on script existence
    expect(true).toBe(false);
  });

  it('generate button is disabled when topic is not approved (review_status != approved)', () => {
    // RED: button disabled check based on topic review status
    expect(true).toBe(false);
  });
});
