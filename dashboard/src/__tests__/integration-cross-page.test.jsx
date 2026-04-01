import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ── Mock data ──────────────────────────────────────

const mockRun = {
  id: 'run-1', status: 'complete', niche_input: 'credit cards',
  platforms: ['reddit'], time_range: '7d', total_results: 10, total_categories: 1,
  created_at: '2026-04-01T10:00:00Z', completed_at: '2026-04-01T10:01:00Z',
  cost: 0.13,
};

const mockCategories = [
  { id: 'cat-1', label: 'Credit Card Hacks', summary: 'Maximizing credit card rewards', rank: 1, total_engagement: 5000, result_count: 8, top_video_title: 'Top 10 Credit Card Hacks 2026' },
];

const mockResults = [
  { id: 'res-1', source: 'reddit', raw_text: 'Best cash back card?', engagement_score: 1500, research_categories: { label: 'Credit Card Hacks' } },
];

// Mock hooks at module level
vi.mock('../hooks/useResearch', () => ({
  useLatestRun: () => ({ data: mockRun, isLoading: false }),
  useCategories: () => ({ data: mockCategories }),
  useResults: () => ({ data: mockResults, isLoading: false }),
  useRunResearch: () => ({ mutate: vi.fn(), isPending: false }),
  useAllRuns: () => ({ data: [mockRun] }),
  useRunById: () => ({ data: null }),
  useCancelResearch: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false, error: null }),
  useCreateProject: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useRetryResearch: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ message: 'started' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { default: Research } = await import('../pages/Research');
const { default: ProjectsHome } = await import('../pages/ProjectsHome');

function renderApp(initialRoute = '/research') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/research" element={<Research />} />
          <Route path="/" element={<ProjectsHome />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Research Page — Completed Run Display ───────────

describe('Research — Completed Run Display', () => {
  it('shows KPI cards for completed run', () => {
    renderApp('/research');
    expect(screen.getByText('Total Results')).toBeTruthy();
    expect(screen.getByText('Categories')).toBeTruthy();
  });

  it('shows category cards with label and summary', () => {
    renderApp('/research');
    const cards = screen.getAllByText('Credit Card Hacks');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Maximizing credit card rewards/)).toBeTruthy();
  });

  it('shows "Use This Topic" button on category cards', () => {
    renderApp('/research');
    expect(screen.getByText('Use This Topic')).toBeTruthy();
  });

  it('shows suggested video title on category card', () => {
    renderApp('/research');
    expect(screen.getByText(/Top 10 Credit Card Hacks/)).toBeTruthy();
  });

  it('shows source tabs', () => {
    renderApp('/research');
    expect(screen.getByText('Raw Results by Source')).toBeTruthy();
  });

  it('does not show progress or starting states for complete run', () => {
    renderApp('/research');
    expect(screen.queryByText('Starting research')).toBeNull();
    expect(screen.queryByText('Scraping sources')).toBeNull();
    expect(screen.queryByText('Cancel Run')).toBeNull();
  });
});

// ─── Research → Use Topic → Project Creation ─────────

describe('Research → Use Topic → Project Creation', () => {
  it('clicking "Use This Topic" navigates away from research page', async () => {
    renderApp('/research');

    // Verify we're on research page
    expect(screen.getByText('Topic Research')).toBeTruthy();

    fireEvent.click(screen.getByText('Use This Topic'));

    // Should navigate to / (Projects page) — research page content gone
    await waitFor(() => {
      // Research page header should be replaced by Projects page
      expect(screen.queryByText('Raw Results by Source')).toBeNull();
    });
  });

  it('Projects page renders after navigation', async () => {
    renderApp('/research');

    fireEvent.click(screen.getByText('Use This Topic'));

    await waitFor(() => {
      // ProjectsHome renders its header
      const heading = screen.getByText('Projects');
      expect(heading).toBeTruthy();
    });
  });
});

// ─── Research History ────────────────────────────────

describe('Research — History', () => {
  it('renders Research History section', () => {
    renderApp('/research');
    expect(screen.getByText('Research History')).toBeTruthy();
  });

  it('shows niche name in history', () => {
    renderApp('/research');
    expect(screen.getByText('credit cards')).toBeTruthy();
  });
});
