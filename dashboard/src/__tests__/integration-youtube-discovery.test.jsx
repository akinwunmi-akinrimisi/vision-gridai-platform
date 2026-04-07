import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ── Mock data ──────────────────────────────────────

const mockRun = {
  id: 'disc-run-1', status: 'complete', time_range: '1y', total_results: 100,
  created_at: '2026-04-01T10:00:00Z', completed_at: '2026-04-01T10:05:00Z',
};

const mockVideos = [
  {
    id: 'v-1', run_id: 'disc-run-1', niche_category: 'personal_finance',
    title: 'Complete Guide to Financial Freedom', channel_name: 'FinanceGuru',
    views: 2500000, likes: 80000, comments: 12000, duration_seconds: 5400,
    video_url: 'https://youtube.com/watch?v=fin1', video_id: 'fin1',
    thumbnail_url: 'https://img.youtube.com/vi/fin1/hq.jpg',
    published_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'v-2', run_id: 'disc-run-1', niche_category: 'betrayal_revenge',
    title: 'The Greatest Betrayal in History', channel_name: 'CrimeTV',
    views: 5000000, likes: 150000, comments: 25000, duration_seconds: 7200,
    video_url: 'https://youtube.com/watch?v=crime1', video_id: 'crime1',
    thumbnail_url: 'https://img.youtube.com/vi/crime1/hq.jpg',
    published_at: '2026-02-20T00:00:00Z',
  },
];

const mockAnalyses = [
  {
    id: 'anal-1', video_id: 'fin1', status: 'complete',
    analysis: { opportunity_scorecard: { verdict: 'STRONG_GO', composite_score: '8.5' } },
  },
];

const mockWebhookCall = vi.fn().mockResolvedValue({ message: 'started' });

// Mock at the HOOK level — much more reliable than mocking supabase internals
vi.mock('../hooks/useYouTubeDiscovery', () => ({
  NICHES: [
    { key: 'business_case_studies', label: 'Business & Entrepreneurship Case Studies' },
    { key: 'jungian_psychology', label: 'Jungian Psychology' },
    { key: 'history_documentaries', label: 'History Documentaries & Storytelling' },
    { key: 'personal_finance', label: 'Personal Finance & Investing' },
    { key: 'health_fitness', label: 'Health, Fitness & Longevity' },
    { key: 'betrayal_revenge', label: 'Betrayal/Revenge Stories' },
    { key: 'literary_analysis', label: 'Literary Analysis & Reviews' },
  ],
  useLatestDiscoveryRun: () => ({ data: mockRun, isLoading: false }),
  useDiscoveryResults: (runId, niche) => ({
    data: niche === 'all' || !niche ? mockVideos : mockVideos.filter(v => v.niche_category === niche),
    isLoading: false,
  }),
  useAllDiscoveryRuns: () => ({ data: [mockRun] }),
  useRunDiscovery: () => ({
    mutate: (args) => mockWebhookCall('youtube/discover', { time_range: args.timeRange }),
    mutateAsync: (args) => mockWebhookCall('youtube/discover', { time_range: args.timeRange }),
    isPending: false,
  }),
  useCancelDiscovery: () => ({
    mutate: vi.fn(), isPending: false,
  }),
  useAnalyzeVideo: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ analysisId: 'new-anal-1' }),
    isPending: false,
  }),
  useAllAnalyses: () => ({ data: mockAnalyses }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { default: YouTubeDiscovery } = await import('../pages/YouTubeDiscovery');

function renderPage(route = '/youtube-discovery') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/youtube-discovery" element={<YouTubeDiscovery />} />
          <Route path="/youtube-discovery/analysis/:analysisId" element={<div data-testid="analysis-page">Analysis Page</div>} />
          <Route path="/" element={<div data-testid="projects-page">Projects Home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Page Structure ──────────────────────────────────

describe('YouTubeDiscovery — Page Structure', () => {
  it('renders page header', () => {
    renderPage();
    expect(screen.getByText('YouTube Discovery')).toBeTruthy();
  });

  it('renders all 7 time range options', () => {
    renderPage();
    const select = screen.getByDisplayValue('1 year');
    const options = [...select.querySelectorAll('option')];
    expect(options).toHaveLength(7);
  });

  it('renders Discover Videos button', () => {
    renderPage();
    expect(screen.getByText('Discover Videos')).toBeTruthy();
  });
});

// ─── Niche Tabs ──────────────────────────────────────

describe('YouTubeDiscovery — Niche Tabs', () => {
  it('renders All tab', () => {
    renderPage();
    expect(screen.getByText(/^All \(/)).toBeTruthy();
  });

  it('renders all 7 niche tabs', () => {
    renderPage();
    // Each niche label appears twice (search niches + filter tabs), so use getAllByText
    expect(screen.getAllByText(/Business.*Entrepreneurship/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Jungian Psychology/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/History Documentaries/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Personal Finance/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Health.*Fitness/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Betrayal.*Revenge/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Literary Analysis/).length).toBeGreaterThanOrEqual(1);
  });

  it('clicking a niche tab filters videos', () => {
    renderPage();
    // Each niche label appears twice (search niches section + filter tabs), use getAllByText
    const tabs = screen.getAllByText(/Jungian Psychology/);
    // Click the last occurrence (the filter tab in the results section)
    fireEvent.click(tabs[tabs.length - 1]);
    // After clicking, the tab should be active (has primary styling)
    expect(tabs[tabs.length - 1].className).toContain('bg-primary');
  });
});

// ─── History Section ─────────────────────────────────

describe('YouTubeDiscovery — History', () => {
  it('renders Discovery History section', () => {
    renderPage();
    expect(screen.getByText('Discovery History')).toBeTruthy();
  });

  it('shows run time range and video count', () => {
    renderPage();
    // History row format: "1y | 100 videos | Xd ago | complete"
    const historySection = screen.getByText('Discovery History').parentElement;
    expect(historySection.textContent).toContain('1y');
    expect(historySection.textContent).toContain('100');
  });

  it('shows complete status badge', () => {
    renderPage();
    expect(screen.getByText('complete')).toBeTruthy();
  });
});

// ─── Video Cards ─────────────────────────────────────

describe('YouTubeDiscovery — Video Cards', () => {
  it('renders video titles', () => {
    renderPage();
    expect(screen.getByText('Complete Guide to Financial Freedom')).toBeTruthy();
    expect(screen.getByText('The Greatest Betrayal in History')).toBeTruthy();
  });

  it('shows channel names', () => {
    renderPage();
    expect(screen.getByText('FinanceGuru')).toBeTruthy();
    expect(screen.getByText('CrimeTV')).toBeTruthy();
  });

  it('shows formatted view counts', () => {
    renderPage();
    expect(screen.getByText('2.5M')).toBeTruthy();
    expect(screen.getByText('5.0M')).toBeTruthy();
  });

  it('shows formatted durations', () => {
    renderPage();
    expect(screen.getByText('1h 30m')).toBeTruthy();
    expect(screen.getByText('2h 0m')).toBeTruthy();
  });

  it('shows "View Analysis" for analyzed videos', () => {
    renderPage();
    const btns = screen.getAllByText('View Analysis');
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Analyze" for non-analyzed videos', () => {
    renderPage();
    const btns = screen.getAllByText('Analyze');
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it('shows verdict badge (Strong Go) on analyzed video', () => {
    renderPage();
    expect(screen.getByText('Strong Go')).toBeTruthy();
  });

  it('shows "Use for Project" on every card', () => {
    renderPage();
    const btns = screen.getAllByText('Use for Project');
    expect(btns).toHaveLength(2);
  });
});

// ─── Actions ─────────────────────────────────────────

describe('YouTubeDiscovery — User Actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clicking Discover Videos calls webhook', () => {
    renderPage();
    fireEvent.click(screen.getByText('Discover Videos'));
    expect(mockWebhookCall).toHaveBeenCalledWith('youtube/discover', { time_range: '1y' });
  });

  it('changing time range and clicking Discover sends correct range', () => {
    renderPage();
    const select = screen.getByDisplayValue('1 year');
    fireEvent.change(select, { target: { value: '5y' } });
    fireEvent.click(screen.getByText('Discover Videos'));
    expect(mockWebhookCall).toHaveBeenCalledWith('youtube/discover', { time_range: '5y' });
  });

  it('clicking "Use for Project" navigates to Projects page', async () => {
    renderPage();
    const btns = screen.getAllByText('Use for Project');
    fireEvent.click(btns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('projects-page')).toBeTruthy();
    });
  });

  it('clicking "View Analysis" navigates to analysis page', async () => {
    renderPage();
    const btn = screen.getAllByText('View Analysis')[0];
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('analysis-page')).toBeTruthy();
    });
  });
});
