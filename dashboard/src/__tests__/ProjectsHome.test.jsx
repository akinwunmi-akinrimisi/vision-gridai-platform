import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import ProjectsHome from '../pages/ProjectsHome';

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

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
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

describe('ProjectsHome (NICH-07)', () => {
  it('renders project cards from useProjects data', () => {
    // RED: implement in plan 02-01 -- currently uses mock data, needs real Supabase query
    expect(true).toBe(false);
  });

  it('shows empty state when no projects exist', () => {
    // RED: implement in plan 02-01
    expect(true).toBe(false);
  });

  it('opens CreateProjectModal on New Project click', () => {
    // RED: implement in plan 02-01
    expect(true).toBe(false);
  });

  it('shows skeleton cards while loading', () => {
    // RED: implement in plan 02-01
    expect(true).toBe(false);
  });
});
