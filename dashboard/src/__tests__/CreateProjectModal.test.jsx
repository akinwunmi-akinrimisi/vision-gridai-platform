import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      insert: vi.fn().mockReturnThis(),
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
      {ui}
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateProjectModal (NICH-01)', () => {
  it('renders modal when isOpen is true', () => {
    // RED: implement in plan 02-01
    // CreateProjectModal component does not exist yet
    expect(true).toBe(false);
  });

  it('requires niche name to be non-empty', () => {
    // RED: implement in plan 02-01
    expect(true).toBe(false);
  });

  it('calls useCreateProject mutation on submit', () => {
    // RED: implement in plan 02-01
    expect(true).toBe(false);
  });

  it('shows success animation after submit', () => {
    // RED: implement in plan 02-01
    expect(true).toBe(false);
  });
});
