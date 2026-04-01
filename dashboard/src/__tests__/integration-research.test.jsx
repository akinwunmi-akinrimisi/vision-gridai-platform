import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ── Shared mocks ──────────────────────────────────────

const mockWebhookCall = vi.fn().mockResolvedValue({ message: 'Workflow was started' });

const mockRuns = [
  {
    id: 'run-1', status: 'complete', niche_input: 'credit cards',
    platforms: ['reddit', 'youtube'], time_range: '7d',
    total_results: 20, total_categories: 5, sources_completed: 2,
    created_at: '2026-04-01T10:00:00Z', completed_at: '2026-04-01T10:01:00Z',
  },
  {
    id: 'run-2', status: 'complete', niche_input: 'AI tools',
    platforms: ['youtube', 'trends'], time_range: '30d',
    total_results: 15, total_categories: 3, sources_completed: 2,
    created_at: '2026-03-31T10:00:00Z', completed_at: '2026-03-31T10:02:00Z',
  },
];

const mockCategories = [
  { id: 'cat-1', run_id: 'run-1', label: 'Credit Card Rewards', summary: 'Strategies for maximizing rewards', rank: 1, total_engagement: 5000, result_count: 8, top_video_title: 'Best Credit Card Rewards 2026' },
  { id: 'cat-2', run_id: 'run-1', label: 'Debt Management', summary: 'How to pay off credit card debt', rank: 2, total_engagement: 3000, result_count: 7, top_video_title: 'Get Out of Credit Card Debt Fast' },
];

const mockResults = [
  { id: 'res-1', run_id: 'run-1', source: 'reddit', raw_text: 'Best cash back card for groceries?', engagement_score: 1500, research_categories: { label: 'Credit Card Rewards' } },
  { id: 'res-2', run_id: 'run-1', source: 'youtube', raw_text: 'Amex Platinum Review 2026', engagement_score: 800, research_categories: { label: 'Credit Card Rewards' } },
  { id: 'res-3', run_id: 'run-1', source: 'reddit', raw_text: 'Drowning in credit card debt', engagement_score: 2200, research_categories: { label: 'Debt Management' } },
];

vi.mock('../lib/supabase', () => {
  const createChain = (data) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data?.[0] || null, error: data?.[0] ? null : { code: 'PGRST116' } }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    then: vi.fn().mockImplementation((cb) => cb({ data: data || [], error: null })),
  });

  return {
    supabase: {
      from: vi.fn((table) => {
        if (table === 'research_runs') return createChain(mockRuns);
        if (table === 'research_categories') return createChain(mockCategories);
        if (table === 'research_results') return createChain(mockResults);
        return createChain([]);
      }),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('../lib/api', () => ({
  webhookCall: (...args) => mockWebhookCall(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Lazy import pages after mocks
const { default: Research } = await import('../pages/Research');
const { default: ProjectsHome } = await import('../pages/ProjectsHome');
const { default: CreateProjectModal } = await import('../components/projects/CreateProjectModal');

function renderWithRouter(ui, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Research Page Integration Tests ─────────────────

describe('Research Page — Full Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebhookCall.mockResolvedValue({ message: 'Workflow was started' });
  });

  it('renders niche input field with placeholder', () => {
    renderWithRouter(<Research />, { route: '/research' });
    const input = screen.getByPlaceholderText(/narrow by niche/i);
    expect(input).toBeTruthy();
  });

  it('renders all 5 platform toggle pills', () => {
    renderWithRouter(<Research />, { route: '/research' });
    expect(screen.getByText('Reddit')).toBeTruthy();
    expect(screen.getByText('YouTube')).toBeTruthy();
    expect(screen.getByText('TikTok')).toBeTruthy();
    expect(screen.getByText('Google Trends')).toBeTruthy();
    expect(screen.getByText('Quora')).toBeTruthy();
  });

  it('renders all time range pills', () => {
    renderWithRouter(<Research />, { route: '/research' });
    expect(screen.getByText('1h')).toBeTruthy();
    expect(screen.getByText('6h')).toBeTruthy();
    expect(screen.getByText('1d')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getByText('30d')).toBeTruthy();
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('platform toggle deselects/reselects correctly', () => {
    renderWithRouter(<Research />, { route: '/research' });
    const redditBtn = screen.getByText('Reddit');

    // Initially all selected (primary color)
    expect(redditBtn.className).toContain('bg-primary');

    // Click to deselect
    fireEvent.click(redditBtn);
    expect(redditBtn.className).toContain('bg-transparent');

    // Click to reselect
    fireEvent.click(redditBtn);
    expect(redditBtn.className).toContain('bg-primary');
  });

  it('cannot deselect the last platform', () => {
    renderWithRouter(<Research />, { route: '/research' });

    // Deselect all except Reddit
    fireEvent.click(screen.getByText('YouTube'));
    fireEvent.click(screen.getByText('TikTok'));
    fireEvent.click(screen.getByText('Google Trends'));
    fireEvent.click(screen.getByText('Quora'));

    // Reddit should still be selected
    const reddit = screen.getByText('Reddit');
    expect(reddit.className).toContain('bg-primary');

    // Try to deselect Reddit — should stay selected
    fireEvent.click(reddit);
    expect(reddit.className).toContain('bg-primary');
  });

  it('typing niche and clicking Run Research triggers webhook', async () => {
    renderWithRouter(<Research />, { route: '/research' });

    const input = screen.getByPlaceholderText(/narrow by niche/i);
    fireEvent.change(input, { target: { value: 'personal finance' } });
    fireEvent.click(screen.getByText('Run Research'));

    await waitFor(() => {
      expect(mockWebhookCall).toHaveBeenCalledWith('research/run', expect.objectContaining({
        niche: 'personal finance',
      }));
    });
  });

  it('running research without niche sends undefined niche', async () => {
    renderWithRouter(<Research />, { route: '/research' });

    fireEvent.click(screen.getByText('Run Research'));

    await waitFor(() => {
      expect(mockWebhookCall).toHaveBeenCalledWith('research/run', expect.objectContaining({
        niche: undefined,
      }));
    });
  });

  it('shows "Starting research" card after clicking Run', async () => {
    renderWithRouter(<Research />, { route: '/research' });

    fireEvent.click(screen.getByText('Run Research'));

    await waitFor(() => {
      expect(screen.getByText(/Starting research/i)).toBeTruthy();
    });
  });

  it('shows Custom date inputs when Custom time range selected', () => {
    renderWithRouter(<Research />, { route: '/research' });

    fireEvent.click(screen.getByText('Custom'));

    expect(screen.getByText('From')).toBeTruthy();
    expect(screen.getByText('To')).toBeTruthy();
  });

  it('"All" button toggles all platforms', () => {
    renderWithRouter(<Research />, { route: '/research' });

    // Click All to deselect all (leaves 1)
    fireEvent.click(screen.getByText('All'));
    const reddit = screen.getByText('Reddit');
    expect(reddit.className).toContain('bg-primary'); // Reddit stays as minimum

    // YouTube should be deselected
    const youtube = screen.getByText('YouTube');
    expect(youtube.className).toContain('bg-transparent');

    // Click All again to select all
    fireEvent.click(screen.getByText('All'));
    expect(youtube.className).toContain('bg-primary');
  });

  it('Enter key in niche input triggers research', async () => {
    renderWithRouter(<Research />, { route: '/research' });

    const input = screen.getByPlaceholderText(/narrow by niche/i);
    fireEvent.change(input, { target: { value: 'crypto' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockWebhookCall).toHaveBeenCalledWith('research/run', expect.objectContaining({
        niche: 'crypto',
      }));
    });
  });
});

describe('Research Page — History Section', () => {
  it('renders Research History heading when runs exist', async () => {
    renderWithRouter(<Research />, { route: '/research' });

    await waitFor(() => {
      expect(screen.getByText('Research History')).toBeTruthy();
    });
  });

  it('shows run metadata in history rows', async () => {
    renderWithRouter(<Research />, { route: '/research' });

    await waitFor(() => {
      expect(screen.getByText('credit cards')).toBeTruthy();
      expect(screen.getByText('AI tools')).toBeTruthy();
    });
  });
});

describe('Research Page — Webhook Error Handling', () => {
  it('shows error toast when webhook returns error', async () => {
    const { toast } = await import('sonner');
    mockWebhookCall.mockResolvedValueOnce({ success: false, error: 'Server error' });

    renderWithRouter(<Research />, { route: '/research' });

    fireEvent.click(screen.getByText('Run Research'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Server error'));
    });
  });
});
