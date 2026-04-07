import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ── Global mocks ──────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
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
  toast: { error: vi.fn(), success: vi.fn() },
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
  useCreateProject: () => ({ mutateAsync: vi.fn() }),
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
  usePromptMutations: () => ({
    updatePrompt: { mutate: vi.fn(), isPending: false },
    revertPrompt: { mutate: vi.fn(), isPending: false },
    regenerateAll: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({ data: { items: [] }, isLoading: false }),
}));

// ── Page imports ──────────────────────────────────────

import ProjectsHome from '../pages/ProjectsHome';
import ProjectDashboard from '../pages/ProjectDashboard';
import NicheResearch from '../pages/NicheResearch';
import TopicReview from '../pages/TopicReview';
import ScriptReview from '../pages/ScriptReview';
import VideoReview from '../pages/VideoReview';
import ProductionMonitor from '../pages/ProductionMonitor';
import Analytics from '../pages/Analytics';
import Settings from '../pages/Settings';
import ShortsCreator from '../pages/ShortsCreator';
import SocialPublisher from '../pages/SocialPublisher';

// ── Helpers ───────────────────────────────────────────

function renderPage(Page, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Page />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────

describe('Page Render Tests -- all 11 pages render without crashing', () => {
  it('ProjectsHome renders', () => {
    const { container } = renderPage(ProjectsHome);
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('ProjectDashboard renders', () => {
    const { container } = renderPage(ProjectDashboard, ['/project/test-id']);
    expect(container.firstChild).toBeTruthy();
  });

  it('NicheResearch renders', () => {
    const { container } = renderPage(NicheResearch, ['/project/test-id/research']);
    expect(container.firstChild).toBeTruthy();
  });

  it('TopicReview renders', () => {
    const { container } = renderPage(TopicReview, ['/project/test-id/topics']);
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText('Topics')).toBeTruthy();
  });

  it('ScriptReview renders', () => {
    const { container } = renderPage(ScriptReview, ['/project/test-id/topics/topic-1/script']);
    expect(container.firstChild).toBeTruthy();
  });

  it('VideoReview renders', () => {
    const { container } = renderPage(VideoReview, ['/project/test-id/topics/topic-1/review']);
    expect(container.firstChild).toBeTruthy();
  });

  it('ProductionMonitor renders', () => {
    const { container } = renderPage(ProductionMonitor, ['/project/test-id/production']);
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText('Production Monitor')).toBeTruthy();
  });

  it('Analytics renders', () => {
    const { container } = renderPage(Analytics, ['/project/test-id/analytics']);
    expect(container.firstChild).toBeTruthy();
  });

  it('Settings renders', () => {
    const { container } = renderPage(Settings, ['/project/test-id/settings']);
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('ShortsCreator renders', () => {
    const { container } = renderPage(ShortsCreator, ['/shorts']);
    expect(container.firstChild).toBeTruthy();
  });

  it('SocialPublisher renders', () => {
    const { container } = renderPage(SocialPublisher, ['/social']);
    expect(container.firstChild).toBeTruthy();
  });
});
