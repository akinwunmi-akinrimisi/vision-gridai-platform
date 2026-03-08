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
      in: vi.fn().mockReturnThis(),
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

describe('TopicBulkActions (TOPC-10)', () => {
  it('shows bulk bar when topics are selected', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });

  it('bulk approve calls mutation with all selected IDs', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });

  it('bulk reject calls mutation with all selected IDs', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });

  it('clear selection hides bulk bar', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });
});
