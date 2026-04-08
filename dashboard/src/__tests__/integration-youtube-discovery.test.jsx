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
    id: 'v-1', run_id: 'disc-run-1', niche_category: 'unsolved_mysteries_cold_cases',
    title: 'Complete Guide to Cold Case Investigation', channel_name: 'CrimeDocs',
    views: 2500000, likes: 80000, comments: 12000, duration_seconds: 5400,
    video_url: 'https://youtube.com/watch?v=fin1', video_id: 'fin1',
    thumbnail_url: 'https://img.youtube.com/vi/fin1/hq.jpg',
    published_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'v-2', run_id: 'disc-run-1', niche_category: 'betrayals_changed_history',
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
    { key: 'betrayals_changed_history', label: 'Betrayals That Changed History', group: 'betrayal_revenge', groupLabel: 'Betrayal & Revenge Stories' },
    { key: 'family_betrayals_inheritance', label: 'Family Betrayals & Inheritance Wars', group: 'betrayal_revenge', groupLabel: 'Betrayal & Revenge Stories' },
    { key: 'revenge_stories_gone_wrong', label: 'Revenge Stories Gone Wrong', group: 'betrayal_revenge', groupLabel: 'Betrayal & Revenge Stories' },
    { key: 'shocking_courtroom_moments', label: 'Shocking Courtroom Moments', group: 'legal_court_drama', groupLabel: 'Legal & Court Drama' },
    { key: 'landmark_cases_changed_law', label: 'Landmark Cases That Changed Law', group: 'legal_court_drama', groupLabel: 'Legal & Court Drama' },
    { key: 'legal_corruption_scandals', label: 'Legal Corruption & Scandals', group: 'legal_court_drama', groupLabel: 'Legal & Court Drama' },
    { key: 'unsolved_mysteries_cold_cases', label: 'Unsolved Mysteries & Cold Cases', group: 'true_crime', groupLabel: 'True Crime' },
    { key: 'serial_killers_criminal_profiling', label: 'Serial Killers & Criminal Profiling', group: 'true_crime', groupLabel: 'True Crime' },
    { key: 'heists_frauds_con_artists', label: 'Heists, Frauds & Con Artists', group: 'true_crime', groupLabel: 'True Crime' },
  ],
  NICHE_GROUPS: [
    { key: 'betrayal_revenge', label: 'Betrayal & Revenge Stories', children: [
      { key: 'betrayals_changed_history', label: 'Betrayals That Changed History' },
      { key: 'family_betrayals_inheritance', label: 'Family Betrayals & Inheritance Wars' },
      { key: 'revenge_stories_gone_wrong', label: 'Revenge Stories Gone Wrong' },
    ]},
    { key: 'legal_court_drama', label: 'Legal & Court Drama', children: [
      { key: 'shocking_courtroom_moments', label: 'Shocking Courtroom Moments' },
      { key: 'landmark_cases_changed_law', label: 'Landmark Cases That Changed Law' },
      { key: 'legal_corruption_scandals', label: 'Legal Corruption & Scandals' },
    ]},
    { key: 'true_crime', label: 'True Crime', children: [
      { key: 'unsolved_mysteries_cold_cases', label: 'Unsolved Mysteries & Cold Cases' },
      { key: 'serial_killers_criminal_profiling', label: 'Serial Killers & Criminal Profiling' },
      { key: 'heists_frauds_con_artists', label: 'Heists, Frauds & Con Artists' },
    ]},
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
    expect(screen.getByText('Niche Research')).toBeTruthy();
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

  it('renders all 3 niche groups with sub-niches', () => {
    renderPage();
    // Parent group labels appear in both search section and filter tabs
    expect(screen.getAllByText(/Betrayal.*Revenge/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Legal.*Court/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/True Crime/).length).toBeGreaterThanOrEqual(1);
    // Sub-niche labels
    expect(screen.getAllByText(/Betrayals That Changed History/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Unsolved Mysteries/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Shocking Courtroom/).length).toBeGreaterThanOrEqual(1);
  });

  it('clicking a sub-niche tab filters videos', () => {
    renderPage();
    const tabs = screen.getAllByText(/Betrayals That Changed History/);
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
    expect(screen.getByText('Complete Guide to Cold Case Investigation')).toBeTruthy();
    expect(screen.getByText('The Greatest Betrayal in History')).toBeTruthy();
  });

  it('shows channel names', () => {
    renderPage();
    expect(screen.getByText('CrimeDocs')).toBeTruthy();
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
