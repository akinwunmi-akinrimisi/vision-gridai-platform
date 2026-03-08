import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id' }),
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
  },
}));

// Mock webhookCall
vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TopicActions — Approve (TOPC-06)', () => {
  it('approve button sets review_status to approved', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });
});

describe('TopicActions — Reject (TOPC-07)', () => {
  it('reject button opens confirmation with optional feedback', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });
});

describe('TopicActions — Refine (TOPC-08)', () => {
  it('refine button opens side panel with instructions textarea', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });
});

describe('TopicActions — Edit', () => {
  it('edit button opens side panel with editable fields', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });
});
