import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import ProjectsHome from '../pages/ProjectsHome';

// Track the mock data so tests can configure it
let mockProjectsData = [];
let mockProjectsLoading = false;
let mockProjectsError = null;
let mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
let mockRetryMutate = vi.fn();
let mockDeleteMutate = vi.fn();

// Mock the hooks
vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({
    data: mockProjectsData,
    isLoading: mockProjectsLoading,
    error: mockProjectsError,
  }),
  useCreateProject: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useRetryResearch: () => ({
    mutate: mockRetryMutate,
    isPending: false,
  }),
  useDeleteProject: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

// Mock supabase (needed by useRealtimeSubscription transitive import)
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
    removeChannel: vi.fn(),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
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
  mockProjectsData = [];
  mockProjectsLoading = false;
  mockProjectsError = null;
  mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
  mockRetryMutate = vi.fn();
  mockDeleteMutate = vi.fn();
});

describe('ProjectsHome (NICH-07)', () => {
  it('renders project cards from useProjects data', () => {
    mockProjectsData = [
      { id: 'p1', name: 'Credit Cards', niche: 'US Credit Cards', status: 'active', created_at: '2026-01-01T00:00:00Z', topics_summary: [] },
      { id: 'p2', name: 'Stoic Philosophy', niche: 'Stoicism', status: 'researching_competitors', created_at: '2026-02-01T00:00:00Z', topics_summary: [] },
    ];
    renderWithProviders(<ProjectsHome />);

    expect(screen.getByText('Credit Cards')).toBeInTheDocument();
    expect(screen.getByText('Stoic Philosophy')).toBeInTheDocument();
  });

  it('shows empty state when no projects exist', () => {
    mockProjectsData = [];
    renderWithProviders(<ProjectsHome />);

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Project')).toBeInTheDocument();
  });

  it('opens CreateProjectModal on New Project click', () => {
    mockProjectsData = [];
    renderWithProviders(<ProjectsHome />);

    // Click the New Project button in the header
    fireEvent.click(screen.getByText('New Project'));

    // Modal should appear with the niche name field
    expect(screen.getByLabelText(/Niche Name/)).toBeInTheDocument();
  });

  it('shows loading skeleton while loading', () => {
    mockProjectsLoading = true;
    mockProjectsData = undefined;
    const { container } = renderWithProviders(<ProjectsHome />);

    // Loading state renders animate-pulse skeleton cards
    const pulseCards = container.querySelectorAll('.animate-pulse');
    expect(pulseCards.length).toBeGreaterThan(0);
  });

  it('shows Retry Research button when project status is research_failed', () => {
    mockProjectsData = [
      {
        id: 'p-failed',
        name: 'Failed Project',
        niche: 'Some Niche',
        status: 'research_failed',
        created_at: '2026-01-01T00:00:00Z',
        topics_summary: [],
      },
    ];
    renderWithProviders(<ProjectsHome />);

    // The retry button should be visible for research_failed project
    const retryBtn = screen.getByTestId('retry-research-p-failed');
    expect(retryBtn).toBeInTheDocument();
  });

  it('Retry Research button calls useRetryResearch with project_id', () => {
    mockProjectsData = [
      {
        id: 'p-failed',
        name: 'Failed Project',
        niche: 'Some Niche',
        status: 'research_failed',
        created_at: '2026-01-01T00:00:00Z',
        topics_summary: [],
      },
    ];
    renderWithProviders(<ProjectsHome />);

    const retryBtn = screen.getByTestId('retry-research-p-failed');
    fireEvent.click(retryBtn);

    expect(mockRetryMutate).toHaveBeenCalledWith({ project_id: 'p-failed' });
  });
});
