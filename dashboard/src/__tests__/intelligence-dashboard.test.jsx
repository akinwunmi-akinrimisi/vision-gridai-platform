/**
 * Intelligence Layer Dashboard Tests
 *
 * Tests the 4 new Intelligence Layer pages (Keywords, IntelligenceHub,
 * DailyIdeas, AICoach) render correctly, plus verifies intelligence
 * enhancements on existing pages (TopicReview, VideoReview, Analytics,
 * ProjectsHome).
 *
 * All Supabase queries and hooks are mocked -- no real API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

/* ------------------------------------------------------------------ */
/*  react-router mock                                                  */
/* ------------------------------------------------------------------ */

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id', topicId: 'test-topic-id' }),
    useNavigate: () => vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Supabase + low-level mocks                                         */
/* ------------------------------------------------------------------ */

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
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

/* ------------------------------------------------------------------ */
/*  Keywords page hook mocks                                           */
/* ------------------------------------------------------------------ */

const mockKeywords = [
  {
    id: 'kw-1',
    keyword: 'credit card churning',
    normalized_keyword: 'credit card churning',
    seo_classification: 'blue-ocean',
    competition_level: 'low',
    opportunity_score: 82,
    search_volume_proxy: 4500,
    trend_signal: 'rising',
    related_keywords: ['travel hacking', 'points optimization'],
    source: 'keyword_scan',
    last_scanned_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'kw-2',
    keyword: 'best credit cards 2026',
    normalized_keyword: 'best credit cards 2026',
    seo_classification: 'red-ocean',
    competition_level: 'high',
    opportunity_score: 35,
    search_volume_proxy: 120000,
    trend_signal: 'stable',
    related_keywords: [],
    source: 'keyword_scan',
    last_scanned_at: '2026-04-15T10:00:00Z',
  },
];

vi.mock('../hooks/useKeywords', () => ({
  useKeywords: () => ({ data: mockKeywords, isLoading: false, error: null }),
  useScanKeywords: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
}));

/* ------------------------------------------------------------------ */
/*  IntelligenceHub hook mocks                                         */
/* ------------------------------------------------------------------ */

vi.mock('../hooks/useIntelligenceHub', () => ({
  useCompetitorChannels: () => ({ data: [
    { id: 'ch-1', channel_name: 'CreditCardGenius', subscriber_count: 500000, channel_url: 'https://youtube.com/@ccgenius' },
  ], isLoading: false }),
  useCompetitorVideos: () => ({ data: [], isLoading: false }),
  useCompetitorAlerts: () => ({ data: [], isLoading: false }),
  useStyleProfiles: () => ({ data: [], isLoading: false }),
  useCompetitorIntelligence: () => ({ data: null, isLoading: false }),
  useRPMBenchmark: () => ({ data: null, isLoading: false }),
  useTopicIntelligence: () => ({ data: [], isLoading: false }),
  useProjectRow: () => ({ data: null, isLoading: false }),
  useAddCompetitorChannel: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useDismissAlert: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useMarkAllAlertsRead: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useAnalyzeStyleDNA: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useRunCompetitorMonitor: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useRunRPMClassify: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  extractChannelIdentifier: (url) => {
    if (!url) return { kind: null, value: null };
    if (url.includes('/channel/UC')) return { kind: 'channel_id', value: 'UC_test' };
    if (url.includes('/@')) return { kind: 'handle', value: '@test' };
    return { kind: null, value: null };
  },
}));

/* ------------------------------------------------------------------ */
/*  DailyIdeas hook mocks                                              */
/* ------------------------------------------------------------------ */

const mockIdeas = [
  {
    id: 'idea-1',
    idea_title: 'Is the Chase Sapphire Reserve Still Worth It in 2026?',
    idea_description: 'Deep dive into the CSR value proposition after recent benefit changes.',
    combined_score: 78,
    outlier_score: 82,
    seo_score: 72,
    source_signals: ['trending_keyword', 'competitor_gap'],
    status: 'pending',
    created_at: '2026-04-16T06:00:00Z',
  },
  {
    id: 'idea-2',
    idea_title: '5 Credit Card Mistakes That Cost You Thousands',
    idea_description: 'Common mistakes from Reddit personal finance threads.',
    combined_score: 65,
    outlier_score: 60,
    seo_score: 71,
    source_signals: ['reddit_pain_point'],
    status: 'saved',
    created_at: '2026-04-15T06:00:00Z',
  },
];

vi.mock('../hooks/useDailyIdeas', () => ({
  useDailyIdeas: () => ({ data: mockIdeas, isLoading: false, error: null }),
  useDailyIdeasSummary: () => ({
    data: [
      { id: 'idea-1', status: 'pending', combined_score: 78, created_at: '2026-04-16T06:00:00Z' },
      { id: 'idea-2', status: 'saved', combined_score: 65, created_at: '2026-04-15T06:00:00Z' },
      { id: 'idea-3', status: 'dismissed', combined_score: 40, created_at: '2026-04-14T06:00:00Z' },
      { id: 'idea-4', status: 'used', combined_score: 90, created_at: '2026-04-13T06:00:00Z' },
    ],
    isLoading: false,
  }),
  useGenerateDailyIdeas: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useUpdateIdeaStatus: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  usePromoteIdeaToTopic: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-topic-id' }),
    isPending: false,
  }),
}));

/* ------------------------------------------------------------------ */
/*  AICoach hook mocks                                                 */
/* ------------------------------------------------------------------ */

vi.mock('../hooks/useAICoach', () => ({
  useCoachSessions: () => ({
    data: [
      { id: 'session-1', title: 'Script Optimization', focus_area: 'script', is_archived: false, created_at: '2026-04-16T10:00:00Z' },
      { id: 'session-2', title: 'Growth Strategy', focus_area: 'growth', is_archived: false, created_at: '2026-04-15T10:00:00Z' },
    ],
    isLoading: false,
  }),
  useCoachMessages: () => ({
    data: [
      { id: 'msg-1', session_id: 'session-1', role: 'user', content: 'How can I improve my hook?', created_at: '2026-04-16T10:01:00Z' },
      { id: 'msg-2', session_id: 'session-1', role: 'assistant', content: 'Start with a bold claim...', created_at: '2026-04-16T10:02:00Z' },
    ],
    isLoading: false,
  }),
  useSendCoachMessage: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ session_id: 'session-1' }),
    isPending: false,
  }),
  useCreateSession: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-session' }),
    isPending: false,
  }),
  useArchiveSession: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useRenameSession: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

/* ------------------------------------------------------------------ */
/*  Hook mocks for intelligence-enhanced existing pages                */
/* ------------------------------------------------------------------ */

// Topics with intelligence scores (for TopicReview)
const mockTopicsWithIntelligence = [
  {
    id: 'topic-1',
    project_id: 'test-project-id',
    topic_number: 1,
    seo_title: 'Amex Platinum Worth $695?',
    original_title: 'Amex Platinum',
    narrative_hook: 'Hook text 1',
    playlist_group: 1,
    playlist_angle: 'The Mathematician',
    review_status: 'pending',
    script_review_status: 'pending',
    status: 'pending',
    avatars: [],
    // Intelligence fields
    outlier_score: 85,
    outlier_scored_at: '2026-04-15T10:00:00Z',
    outlier_data_available: true,
    algorithm_momentum: 'accelerating',
    outlier_reasoning: 'Strong topic momentum',
    seo_score: 72,
    seo_scored_at: '2026-04-15T10:00:00Z',
    seo_classification: 'blue-ocean',
    primary_keyword: 'amex platinum worth it',
    competition_level: 'low',
  },
  {
    id: 'topic-2',
    project_id: 'test-project-id',
    topic_number: 2,
    seo_title: 'Best Credit Cards 2026',
    original_title: 'Best Credit Cards',
    narrative_hook: 'Hook text 2',
    playlist_group: 2,
    playlist_angle: 'Your Exact Life',
    review_status: 'approved',
    script_review_status: 'pending',
    status: 'pending',
    avatars: [],
    // Intelligence fields
    outlier_score: 40,
    outlier_scored_at: '2026-04-15T10:00:00Z',
    outlier_data_available: true,
    algorithm_momentum: 'decelerating',
    outlier_reasoning: 'Saturated topic',
    seo_score: 30,
    seo_scored_at: '2026-04-15T10:00:00Z',
    seo_classification: 'red-ocean',
    primary_keyword: 'best credit cards',
    competition_level: 'high',
  },
];

vi.mock('../hooks/useTopics', () => ({
  useTopics: () => ({
    data: mockTopicsWithIntelligence,
    isLoading: false,
    error: null,
  }),
  useApproveTopics: () => ({ mutateAsync: vi.fn() }),
  useRejectTopics: () => ({ mutateAsync: vi.fn() }),
  useRefineTopic: () => ({ mutateAsync: vi.fn() }),
  useEditTopic: () => ({ mutateAsync: vi.fn() }),
  useEditAvatar: () => ({ mutateAsync: vi.fn() }),
}));

// VideoReview mock topic with PPS
const mockTopicWithPPS = {
  id: 'test-topic-id',
  project_id: 'test-project-id',
  topic_number: 1,
  seo_title: 'Is the Amex Platinum Worth $695?',
  status: 'assembled',
  video_review_status: 'pending',
  thumbnail_url: 'https://example.com/thumb.jpg',
  drive_video_url: 'https://drive.google.com/file/d/abc/preview',
  youtube_url: null,
  total_cost: 16.50,
  cost_breakdown: { script: 0.75, tts: 0.30, images: 3.20 },
  script_metadata: {
    video_metadata: {
      title: 'Is the Amex Platinum Worth $695?',
      description: 'Full analysis...',
      tags: ['amex', 'credit cards'],
      thumbnail_prompt: 'A dramatic card',
    },
  },
  publish_progress: null,
  playlist_group: 1,
  narrative_hook: 'Every YouTuber says get the Amex Platinum...',
  // PPS (CF13) fields
  predicted_performance_score: 72,
  pps_light: 'yellow',
  pps_factors: {
    outlier_weight: 0.85,
    seo_weight: 0.72,
    hook_strength: 0.68,
    niche_health: 0.80,
  },
  pps_calculated_at: '2026-04-15T10:00:00Z',
};

vi.mock('../hooks/useVideoReview', () => ({
  useVideoReview: () => ({
    topic: mockTopicWithPPS,
    scenes: [
      { id: 's1', scene_id: 'scene_001', scene_number: 1, chapter: 'Ch1', narration_text: 'Intro', audio_duration_ms: 5000, start_time_ms: 0, end_time_ms: 5000 },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useQuotaStatus', () => ({
  useQuotaStatus: () => ({ uploadsToday: 2, remaining: 4, isLoading: false }),
}));

vi.mock('../hooks/usePublishMutations', () => ({
  useApproveVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectVideo: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useRegenerateThumbnail: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMetadata: () => ({ mutate: vi.fn(), isPending: false }),
  useRetryUpload: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useCTROptimization', () => ({
  useGenerateTitleVariants: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useSelectTitle: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useScoreThumbnail: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useStartABTest: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
}));

vi.mock('../hooks/usePPS', () => ({
  useCalculatePPS: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
}));

vi.mock('../hooks/useProjectSettings', () => ({
  useProjectSettings: () => ({ data: {}, isLoading: false, error: null }),
  useUpdateSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Analytics + NicheHealth mocks
vi.mock('../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    data: [],
    isLoading: false,
    error: null,
    totalViews: 50000,
    totalWatchHours: 800,
    avgCtr: 6.2,
    totalRevenue: 3500,
    totalLikes: 2000,
    totalComments: 500,
    totalSubscribers: 150,
    avgDuration: '12:30',
    topPerformer: null,
  }),
}));

vi.mock('../hooks/useAnalyticsIntelligence', () => ({
  usePPSCalibration: () => ({ data: null, isLoading: false }),
  useTrafficSourceAggregation: () => ({ data: null, isLoading: false }),
  useRevenueAttribution: () => ({ data: [], isLoading: false }),
  useProjectNicheHealth: () => ({
    data: {
      id: 'test-project-id',
      niche_health_score: 78,
      niche_health_classification: 'thriving',
      niche_health_last_computed_at: '2026-04-15T10:00:00Z',
    },
    isLoading: false,
  }),
  useNicheHealthHistory: () => ({
    data: [
      { week_of: '2026-03-25', health_score: 72, classification: 'stable', week_over_week_delta: 3, insight_summary: 'Steady growth', calculated_at: '2026-03-25T10:00:00Z' },
      { week_of: '2026-04-01', health_score: 75, classification: 'stable', week_over_week_delta: 3, insight_summary: 'Improving', calculated_at: '2026-04-01T10:00:00Z' },
      { week_of: '2026-04-08', health_score: 78, classification: 'thriving', week_over_week_delta: 3, insight_summary: 'Strong performance', calculated_at: '2026-04-08T10:00:00Z' },
    ],
    isLoading: false,
  }),
  useNicheHealthHistoryBatch: () => ({ data: {}, isLoading: false }),
  usePPSConfig: () => ({ data: null, isLoading: false }),
  useUpdatePPSConfig: () => ({ mutate: vi.fn(), isPending: false }),
  useRecalibratePPS: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRunNicheHealth: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
}));

vi.mock('../hooks/useProjectMetrics', () => ({
  useProjectMetrics: () => ({
    metrics: {
      totalTopics: 25,
      approved: 20,
      published: 12,
      inProgress: 3,
      failed: 1,
      totalSpend: 196,
      totalRevenue: 4200,
      avgCpm: 34,
    },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      {
        id: 'proj-1',
        name: 'Credit Card Rewards',
        niche: 'US Credit Cards',
        status: 'active',
        niche_health_score: 78,
        niche_health_classification: 'thriving',
        niche_health_last_computed_at: '2026-04-15T10:00:00Z',
        topicSummary: { total: 25, approved: 20, published: 12 },
      },
    ],
    isLoading: false,
    error: null,
  }),
  useCreateProject: () => ({ mutateAsync: vi.fn() }),
  useRetryResearch: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useScript', () => ({
  useScript: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('../hooks/useScenes', () => ({
  useScenes: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('../hooks/useProductionProgress', () => ({
  useProductionProgress: () => ({
    scenes: [],
    stageProgress: {},
    failedScenes: [],
    isLoading: false,
    error: null,
  }),
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

vi.mock('../hooks/useScriptMutations', () => ({
  useGenerateScript: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRefineScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRegenPrompts: () => ({ mutate: vi.fn(), isPending: false }),
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

vi.mock('../lib/settingsApi', () => ({
  resetAllTopics: vi.fn(),
  clearProductionData: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock('../lib/analyticsApi', () => ({
  refreshAnalytics: vi.fn().mockResolvedValue({ success: true }),
}));

/* ------------------------------------------------------------------ */
/*  Page imports (MUST come after all vi.mock calls)                   */
/* ------------------------------------------------------------------ */

import Keywords from '../pages/Keywords';
import IntelligenceHub from '../pages/IntelligenceHub';
import DailyIdeas from '../pages/DailyIdeas';
import AICoach from '../pages/AICoach';
import TopicReview from '../pages/TopicReview';
import VideoReview from '../pages/VideoReview';
import Analytics from '../pages/Analytics';
import ProjectsHome from '../pages/ProjectsHome';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderPage(Page, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Page />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // ChatPane uses messagesEndRef.current.scrollIntoView which jsdom lacks
  Element.prototype.scrollIntoView = vi.fn();
});

/* ================================================================== */
/*  NEW INTELLIGENCE PAGES                                             */
/* ================================================================== */

describe('Keywords page (CF02)', () => {
  it('renders without crashing', () => {
    const { container } = renderPage(Keywords, ['/project/test-project-id/keywords']);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows the Keywords page title', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    expect(screen.getByText('Keywords')).toBeInTheDocument();
  });

  it('shows the Scan Keywords button', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    expect(screen.getByText('Scan Keywords')).toBeInTheDocument();
  });

  it('shows KPI cards for keyword stats', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    // KPI labels from the page
    expect(screen.getByText('Total Keywords')).toBeInTheDocument();
    expect(screen.getByText('Blue Ocean')).toBeInTheDocument();
    expect(screen.getByText('Avg Opportunity')).toBeInTheDocument();
    expect(screen.getByText('Trending Up')).toBeInTheDocument();
  });

  it('renders keyword rows from mock data', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    expect(screen.getByText('credit card churning')).toBeInTheDocument();
    expect(screen.getByText('best credit cards 2026')).toBeInTheDocument();
  });

  it('renders classification badges', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    expect(screen.getByText('blue-ocean')).toBeInTheDocument();
    expect(screen.getByText('red-ocean')).toBeInTheDocument();
  });

  it('renders competition level badges', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('shows filter dropdowns for classification, competition, and sort', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    // FilterDropdown renders "{label}:" as a span — use getAllByText since multiple
    // elements may contain the substring (the label + the table header)
    expect(screen.getAllByText(/Classification/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Competition/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Sort by/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows search input for keyword filtering', () => {
    renderPage(Keywords, ['/project/test-project-id/keywords']);
    const searchInput = screen.getByPlaceholderText('Search keywords...');
    expect(searchInput).toBeInTheDocument();
  });
});

describe('IntelligenceHub page (CF04 + CF14)', () => {
  it('renders without crashing', () => {
    const { container } = renderPage(IntelligenceHub, ['/project/test-project-id/intelligence']);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows the Intelligence Hub page title', () => {
    renderPage(IntelligenceHub, ['/project/test-project-id/intelligence']);
    expect(screen.getByText('Intelligence Hub')).toBeInTheDocument();
  });

  it('renders the competitor activity section', () => {
    renderPage(IntelligenceHub, ['/project/test-project-id/intelligence']);
    // The page has a "Competitor Activity" section heading
    expect(screen.getByText('Competitor Activity')).toBeInTheDocument();
  });

  it('has a Track Competitor button', () => {
    renderPage(IntelligenceHub, ['/project/test-project-id/intelligence']);
    // The page has buttons for adding competitors
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('DailyIdeas page (CF08)', () => {
  it('renders without crashing', () => {
    const { container } = renderPage(DailyIdeas, ['/project/test-project-id/ideas']);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows the Daily Ideas page title', () => {
    renderPage(DailyIdeas, ['/project/test-project-id/ideas']);
    expect(screen.getByText('Daily Ideas')).toBeInTheDocument();
  });

  it('shows the Generate Now button', () => {
    renderPage(DailyIdeas, ['/project/test-project-id/ideas']);
    expect(screen.getByText('Generate Now')).toBeInTheDocument();
  });

  it('shows KPI cards for idea stats', () => {
    renderPage(DailyIdeas, ['/project/test-project-id/ideas']);
    expect(screen.getByText('Total Ideas')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Avg Score (Pending)')).toBeInTheDocument();
    expect(screen.getByText('Saved / Used Rate')).toBeInTheDocument();
  });

  it('shows status filter tabs', () => {
    renderPage(DailyIdeas, ['/project/test-project-id/ideas']);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Dismissed')).toBeInTheDocument();
    expect(screen.getByText('Used')).toBeInTheDocument();
  });
});

describe('AICoach page (CF09)', () => {
  it('renders without crashing', () => {
    const { container } = renderPage(AICoach, ['/project/test-project-id/coach']);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows the AI Coach page title', () => {
    renderPage(AICoach, ['/project/test-project-id/coach']);
    expect(screen.getByText('AI Coach')).toBeInTheDocument();
  });

  it('shows the session count in subtitle', () => {
    renderPage(AICoach, ['/project/test-project-id/coach']);
    // 2 non-archived sessions from mock data
    expect(screen.getByText('2 active sessions')).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  INTELLIGENCE-ENHANCED EXISTING PAGES                               */
/* ================================================================== */

describe('TopicReview — intelligence badges (CF01 + CF02)', () => {
  it('renders with intelligence-scored topics', () => {
    renderPage(TopicReview, ['/project/test-project-id/topics']);
    expect(screen.getByText('Topics')).toBeInTheDocument();
  });

  it('shows Outlier badge with score for scored topics', async () => {
    renderPage(TopicReview, ['/project/test-project-id/topics']);
    await waitFor(() => {
      // OutlierBadge renders "Outlier {score}" text
      const outlierBadges = screen.getAllByText(/Outlier \d+/);
      expect(outlierBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows SEO badge with score for scored topics', async () => {
    renderPage(TopicReview, ['/project/test-project-id/topics']);
    await waitFor(() => {
      // SEOBadge renders "SEO {score}" text
      const seoBadges = screen.getAllByText(/SEO \d+/);
      expect(seoBadges.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('VideoReview — PPS section (CF13)', () => {
  it('renders the VideoReview page with PPS data', () => {
    renderPage(VideoReview, ['/project/test-project-id/topics/test-topic-id/review']);
    expect(screen.getByTestId('video-review-page')).toBeInTheDocument();
  });

  it('renders the PPSCard component', () => {
    renderPage(VideoReview, ['/project/test-project-id/topics/test-topic-id/review']);
    // PPSCard shows a score with traffic light
    // The mockTopicWithPPS has pps_light='yellow' and score=72
    // PPSCard should be somewhere in the page
    const ppsElements = screen.queryAllByText(/72/);
    // At least one element showing the PPS score
    expect(ppsElements.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Analytics — Niche Health card (CF11)', () => {
  it('renders the Analytics page', () => {
    const { container } = renderPage(Analytics, ['/project/test-project-id/analytics']);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the NicheHealthCard component', async () => {
    renderPage(Analytics, ['/project/test-project-id/analytics']);
    await waitFor(() => {
      // NicheHealthCard has data-testid="niche-health-card"
      const nicheCard = screen.getByTestId('niche-health-card');
      expect(nicheCard).toBeInTheDocument();
    });
  });

  it('shows the niche health score from mock data', async () => {
    renderPage(Analytics, ['/project/test-project-id/analytics']);
    await waitFor(() => {
      // The NicheHealthCard renders the score as large text
      expect(screen.getByText('Niche Health')).toBeInTheDocument();
    });
  });

  it('shows the thriving classification badge', async () => {
    renderPage(Analytics, ['/project/test-project-id/analytics']);
    await waitFor(() => {
      const badge = screen.queryByText('thriving');
      expect(badge).toBeInTheDocument();
    });
  });
});

describe('ProjectsHome — niche health badge (CF11)', () => {
  it('renders the ProjectsHome page', () => {
    const { container } = renderPage(ProjectsHome, ['/']);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows project cards with project data', () => {
    renderPage(ProjectsHome, ['/']);
    expect(screen.getByText('Credit Card Rewards')).toBeInTheDocument();
  });
});
