import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router useParams
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
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

// Import component under test -- exists but currently uses mock data
import TopicReview from '../pages/TopicReview';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/project/test-project-id/topics']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TopicReview (TOPC-05)', () => {
  it('renders topic cards grouped by playlist_angle', () => {
    // RED: implement in plan 02-02 -- needs real data from useTopics hook
    expect(true).toBe(false);
  });

  it('filters topics by status dropdown', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });

  it('filters topics by playlist dropdown', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });

  it('shows skeleton cards during generation', () => {
    // RED: implement in plan 02-02
    expect(true).toBe(false);
  });

  it('shows summary bar with correct counts', () => {
    // RED: implement in plan 02-02 -- approved/rejected/pending counts
    expect(true).toBe(false);
  });
});
