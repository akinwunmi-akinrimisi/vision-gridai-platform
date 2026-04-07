/**
 * SMOKE TESTS — Verify every page renders without crashing.
 *
 * These tests mount each page with minimal mocks and verify:
 * 1. No JS errors / exceptions thrown during render
 * 2. Critical heading/landmark elements are present
 * 3. No broken imports or missing dependencies
 *
 * This is the first line of defense — if any page smoke test fails,
 * something fundamental is broken.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ── Global mocks (all external deps) ──────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
  createProject: vi.fn().mockResolvedValue({ success: true }),
  generateTopics: vi.fn().mockResolvedValue({ success: true }),
  generateScript: vi.fn().mockResolvedValue({ success: true }),
  approveScript: vi.fn().mockResolvedValue({ success: true }),
  rejectScript: vi.fn().mockResolvedValue({ success: true }),
  refineScript: vi.fn().mockResolvedValue({ success: true }),
  regenPrompts: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../lib/settingsApi', () => ({
  resetAllTopics: vi.fn(),
  clearProductionData: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock('../lib/analyticsApi', () => ({
  refreshAnalytics: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

// ── Hook mocks ────────────────────────────────────────

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false, error: null }),
  useCreateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRetryResearch: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useTopics', () => ({
  useTopics: () => ({ data: [], isLoading: false, error: null }),
  useApproveTopics: () => ({ mutateAsync: vi.fn() }),
  useRejectTopics: () => ({ mutateAsync: vi.fn() }),
  useRefineTopic: () => ({ mutateAsync: vi.fn() }),
  useEditTopic: () => ({ mutateAsync: vi.fn() }),
  useEditAvatar: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../hooks/useScript', () => ({
  useScript: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('../hooks/useScenes', () => ({
  useScenes: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    data: [], isLoading: false, error: null,
    totalViews: 0, totalWatchHours: 0, avgCtr: 0, totalRevenue: 0,
    totalLikes: 0, totalComments: 0, totalSubscribers: 0, avgDuration: '0:00',
    topPerformer: null,
  }),
}));

vi.mock('../hooks/useProjectMetrics', () => ({
  useProjectMetrics: () => ({
    metrics: { totalTopics: 0, approved: 0, published: 0, inProgress: 0, failed: 0, totalSpend: 0, totalRevenue: 0, avgCpm: 0 },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useVideoReview', () => ({
  useVideoReview: () => ({ topic: null, scenes: [], isLoading: false, error: null }),
}));

vi.mock('../hooks/useQuotaStatus', () => ({
  useQuotaStatus: () => ({ uploadsToday: 0, remaining: 6, isLoading: false }),
}));

vi.mock('../hooks/useProductionProgress', () => ({
  useProductionProgress: () => ({ scenes: [], stageProgress: {}, failedScenes: [], isLoading: false, error: null }),
}));

vi.mock('../hooks/useProductionLog', () => ({
  useProductionLog: () => ({ logs: [], isLoading: false }),
}));

vi.mock('../hooks/useProductionMutations', () => ({
  useProductionMutations: () => ({
    triggerProduction: { mutate: vi.fn(), isPending: false },
    triggerProductionBatch: { mutate: vi.fn(), isPending: false },
    stopProduction: { mutate: vi.fn(), isPending: false },
    resumeProduction: { mutate: vi.fn(), isPending: false },
    restartProduction: { mutate: vi.fn(), isPending: false },
    retryScene: { mutate: vi.fn(), isPending: false },
    skipScene: { mutate: vi.fn(), isPending: false },
    retryAllFailed: { mutate: vi.fn(), isPending: false },
    skipAllFailed: { mutate: vi.fn(), isPending: false },
    editAndRetryScene: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock('../hooks/usePublishMutations', () => ({
  useApproveVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectVideo: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useBatchPublish: () => ({ mutate: vi.fn(), isPending: false }),
  useRegenerateThumbnail: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMetadata: () => ({ mutate: vi.fn(), isPending: false }),
  useRetryUpload: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useScriptMutations', () => ({
  useGenerateScript: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRefineScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRegenPrompts: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useProjectSettings', () => ({
  useProjectSettings: () => ({ data: {}, isLoading: false, error: null }),
  useUpdateSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/usePromptConfigs', () => ({
  usePromptConfigs: () => ({ data: [], isLoading: false, error: null }),
  usePromptMutations: () => ({ updatePrompt: { mutate: vi.fn() }, createPrompt: { mutate: vi.fn() } }),
}));

vi.mock('../hooks/useResearch', () => ({
  useLatestRun: () => ({ data: null, isLoading: false }),
  useCategories: () => ({ data: [] }),
  useResults: () => ({ data: [], isLoading: false }),
  useRunResearch: () => ({ mutate: vi.fn(), isPending: false }),
  useAllRuns: () => ({ data: [] }),
  useRunById: () => ({ data: null }),
  useCancelResearch: () => ({ mutate: vi.fn(), isPending: false }),
}));

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
  useLatestDiscoveryRun: () => ({ data: null, isLoading: false }),
  useDiscoveryResults: () => ({ data: [], isLoading: false }),
  useAllDiscoveryRuns: () => ({ data: [] }),
  useRunDiscovery: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelDiscovery: () => ({ mutate: vi.fn(), isPending: false }),
  useAnalyzeVideo: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useVideoAnalysis: () => ({ data: null, isLoading: false }),
  useAllAnalyses: () => ({ data: [] }),
}));

vi.mock('../hooks/useNicheProfile', () => ({
  useNicheProfile: () => ({ data: null, isLoading: false }),
  useProject: () => ({ data: null, isLoading: false }),
}));

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({ data: [], isLoading: false }),
  useHighIntent: () => ({ data: [], isLoading: false }),
  useHighIntentComments: () => ({ data: [], isLoading: false }),
  useReplyToComment: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useEngagement', () => ({
  useEngagement: () => ({ data: {}, isLoading: false }),
  useEngagementStats: () => ({ data: { total: 0, positive: 0, negative: 0, neutral: 0, highIntent: 0, replied: 0 }, isLoading: false }),
}));

vi.mock('../hooks/useSchedule', () => ({
  useSchedule: () => ({ data: [], isLoading: false }),
  useScheduledPosts: () => ({ data: [], isLoading: false }),
  useCreateSchedule: () => ({ mutate: vi.fn() }),
  useUpdateSchedule: () => ({ mutate: vi.fn() }),
  useDeleteSchedule: () => ({ mutate: vi.fn() }),
  useCancelSchedule: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/useShorts', () => ({
  useShorts: () => ({ data: [], isLoading: false }),
  useShortsForProject: () => ({ data: [], isLoading: false }),
  useAnalyzeForClips: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveClips: () => ({ mutate: vi.fn(), isPending: false }),
  useProduceClips: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useSocialPosts', () => ({
  useSocialPosts: () => ({ data: [], isLoading: false }),
  usePostNow: () => ({ mutate: vi.fn(), isPending: false }),
  usePostClip: () => ({ mutate: vi.fn(), isPending: false }),
  useSchedulePost: () => ({ mutate: vi.fn(), isPending: false }),
  useAutoScheduleAll: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useSceneClassification', () => ({
  useSceneClassification: () => ({ scenes: [], isLoading: false, stats: {} }),
}));

// ── Render helper ────────────────────────────────────

function renderPage(PageComponent, route = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <PageComponent />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return result;
}

// ── Console error tracking ───────────────────────────

let consoleErrors = [];
const originalError = console.error;

beforeEach(() => {
  consoleErrors = [];
  console.error = (...args) => {
    // Ignore known React/testing noise
    const msg = args[0]?.toString?.() || '';
    if (msg.includes('act(') || msg.includes('Warning:') || msg.includes('validateDOMNesting')) return;
    consoleErrors.push(args);
  };
});

afterEach(() => {
  console.error = originalError;
});

// ── SMOKE TESTS ──────────────────────────────────────

describe('SMOKE: Platform Pages', () => {
  it('ProjectsHome renders without crashing', async () => {
    const { default: Page } = await import('../pages/ProjectsHome');
    renderPage(Page, '/');
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });

  it('Research renders without crashing', async () => {
    const { default: Page } = await import('../pages/Research');
    renderPage(Page, '/research');
    expect(screen.getByText('Topic Research')).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });

  it('YouTubeDiscovery renders without crashing', async () => {
    const { default: Page } = await import('../pages/YouTubeDiscovery');
    renderPage(Page, '/youtube-discovery');
    expect(screen.getByText('YouTube Discovery')).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });

  it('VideoAnalysis renders without crashing (loading state)', async () => {
    const { default: Page } = await import('../pages/VideoAnalysis');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/youtube-discovery/analysis/test-id']}>
          <Page />
        </MemoryRouter>
      </QueryClientProvider>
    );
    // Should render loading or header without crashing
    expect(consoleErrors).toHaveLength(0);
  });

  it('ShortsCreator renders without crashing', async () => {
    const { default: Page } = await import('../pages/ShortsCreator');
    renderPage(Page, '/shorts');
    expect(consoleErrors).toHaveLength(0);
  });

  it('SocialPublisher renders without crashing', async () => {
    const { default: Page } = await import('../pages/SocialPublisher');
    renderPage(Page, '/social');
    expect(consoleErrors).toHaveLength(0);
  });
});

describe('SMOKE: Project-Scoped Pages', () => {
  it('ProjectDashboard renders without crashing', async () => {
    const { default: Page } = await import('../pages/ProjectDashboard');
    renderPage(Page, '/project/test-id');
    expect(consoleErrors).toHaveLength(0);
  });

  it('NicheResearch renders without crashing', async () => {
    const { default: Page } = await import('../pages/NicheResearch');
    renderPage(Page, '/project/test-id/research');
    expect(consoleErrors).toHaveLength(0);
  });

  it('TopicReview renders without crashing', async () => {
    const { default: Page } = await import('../pages/TopicReview');
    renderPage(Page, '/project/test-id/topics');
    expect(consoleErrors).toHaveLength(0);
  });

  it('ScriptReview renders without crashing', async () => {
    const { default: Page } = await import('../pages/ScriptReview');
    renderPage(Page, '/project/test-id/topics/topic-1/script');
    expect(consoleErrors).toHaveLength(0);
  });

  it('VideoReview renders without crashing', async () => {
    const { default: Page } = await import('../pages/VideoReview');
    renderPage(Page, '/project/test-id/topics/topic-1/review');
    expect(consoleErrors).toHaveLength(0);
  });

  it('ProductionMonitor renders without crashing', async () => {
    const { default: Page } = await import('../pages/ProductionMonitor');
    renderPage(Page, '/project/test-id/production');
    expect(consoleErrors).toHaveLength(0);
  });

  it('Analytics renders without crashing', async () => {
    const { default: Page } = await import('../pages/Analytics');
    renderPage(Page, '/project/test-id/analytics');
    expect(consoleErrors).toHaveLength(0);
  });

  it('ContentCalendar renders without crashing', async () => {
    const { default: Page } = await import('../pages/ContentCalendar');
    renderPage(Page, '/project/test-id/calendar');
    expect(consoleErrors).toHaveLength(0);
  });

  it('EngagementHub renders without crashing', async () => {
    const { default: Page } = await import('../pages/EngagementHub');
    renderPage(Page, '/project/test-id/engagement');
    expect(consoleErrors).toHaveLength(0);
  });

  it('Settings renders without crashing', async () => {
    const { default: Page } = await import('../pages/Settings');
    renderPage(Page, '/project/test-id/settings');
    expect(consoleErrors).toHaveLength(0);
  });
});

describe('SMOKE: Critical Components', () => {
  it('CreateProjectModal renders without crashing', async () => {
    const { default: Modal } = await import('../components/projects/CreateProjectModal');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Modal open={true} onOpenChange={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('New Project')).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });

  it('CategoryCards renders without crashing', async () => {
    const { default: Cards } = await import('../components/research/CategoryCards');
    const cats = [
      { id: '1', label: 'Test Cat', summary: 'Test summary', rank: 1, total_engagement: 100, result_count: 5, top_video_title: 'Test Video' },
    ];
    render(<Cards categories={cats} onUseTopic={vi.fn()} />);
    expect(screen.getByText('Test Cat')).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });

  it('ResearchProgress renders without crashing (integer sources_completed)', async () => {
    const { default: Progress } = await import('../components/research/ResearchProgress');
    const run = { status: 'scraping', sources_completed: 2, platforms: ['reddit', 'youtube', 'tiktok'] };
    render(<Progress run={run} />);
    expect(screen.getByText(/Scraping sources/)).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });

  it('ResearchProgress renders without crashing (array sources_completed)', async () => {
    const { default: Progress } = await import('../components/research/ResearchProgress');
    const run = { status: 'scraping', sources_completed: ['reddit', 'youtube'], platforms: ['reddit', 'youtube', 'tiktok'] };
    render(<Progress run={run} />);
    expect(screen.getByText(/Scraping sources/)).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });

  it('ResearchProgress handles categorizing state', async () => {
    const { default: Progress } = await import('../components/research/ResearchProgress');
    const run = { status: 'categorizing', sources_completed: 3, platforms: ['reddit', 'youtube', 'tiktok'] };
    render(<Progress run={run} />);
    expect(screen.getByText(/Categorizing/)).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });
});

describe('SMOKE: No Console Errors on Any Page', () => {
  const pages = [
    { name: 'ProjectsHome', path: '../pages/ProjectsHome', route: '/' },
    { name: 'Research', path: '../pages/Research', route: '/research' },
    { name: 'YouTubeDiscovery', path: '../pages/YouTubeDiscovery', route: '/youtube-discovery' },
    { name: 'ShortsCreator', path: '../pages/ShortsCreator', route: '/shorts' },
    { name: 'SocialPublisher', path: '../pages/SocialPublisher', route: '/social' },
    { name: 'Settings', path: '../pages/Settings', route: '/project/x/settings' },
    { name: 'Analytics', path: '../pages/Analytics', route: '/project/x/analytics' },
    { name: 'ProductionMonitor', path: '../pages/ProductionMonitor', route: '/project/x/production' },
    { name: 'TopicReview', path: '../pages/TopicReview', route: '/project/x/topics' },
  ];

  for (const page of pages) {
    it(`${page.name} produces zero console errors`, async () => {
      const mod = await import(page.path);
      renderPage(mod.default, page.route);
      expect(consoleErrors).toHaveLength(0);
    });
  }
});
