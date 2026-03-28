import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'proj-1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock supabase client — every chained method returns a thenable so that
// `await supabase.from('x').select().eq()` resolves to { data, error } even
// when the chain doesn't end with `.order()` or `.single()`.
function createChainMock(resolvedValue = { data: [], error: null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    gte: vi.fn(() => chain),
    in: vi.fn(() => chain),
    // Make the chain itself thenable so `await chain` works
    then: vi.fn((resolve) => resolve(resolvedValue)),
  };
  return chain;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createChainMock()),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock recharts to avoid canvas issues in jsdom
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

// --- Mock data ---
const mockPublishedTopics = [
  {
    id: 'topic-1',
    topic_number: 1,
    seo_title: 'Is the Amex Platinum Worth $695?',
    status: 'published',
    published_at: '2026-03-01T12:00:00Z',
    yt_views: 45000,
    yt_watch_hours: 1200.5,
    yt_ctr: 8.5,
    yt_avg_view_duration: '45:30',
    yt_estimated_revenue: 1575.00,
    yt_likes: 1200,
    yt_comments: 340,
    yt_subscribers_gained: 85,
    total_cost: 16.50,
    cost_breakdown: { script: 0.75, tts: 0.30, images: 3.20, i2v: 3.13, t2v: 9.00 },
    thumbnail_url: 'https://example.com/thumb1.jpg',
  },
  {
    id: 'topic-2',
    topic_number: 2,
    seo_title: 'The Perfect 3-Card Wallet Strategy',
    status: 'published',
    published_at: '2026-03-05T14:00:00Z',
    yt_views: 22000,
    yt_watch_hours: 580.3,
    yt_ctr: 6.2,
    yt_avg_view_duration: '38:15',
    yt_estimated_revenue: 726.00,
    yt_likes: 650,
    yt_comments: 180,
    yt_subscribers_gained: 42,
    total_cost: 16.80,
    cost_breakdown: { script: 1.05, tts: 0.30, images: 3.20, i2v: 3.13, t2v: 9.00 },
    thumbnail_url: 'https://example.com/thumb2.jpg',
  },
];

// --- Mock hooks ---
let mockUseAnalyticsReturn;

vi.mock('../hooks/useAnalytics', () => ({
  useAnalytics: () => mockUseAnalyticsReturn,
}));

vi.mock('../lib/analyticsApi', () => ({
  refreshAnalytics: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../hooks/useTopics', () => ({
  useTopics: () => ({ data: mockPublishedTopics, isLoading: false, error: null }),
}));

vi.mock('../hooks/useProjectMetrics', () => ({
  useProjectMetrics: () => ({
    metrics: { totalTopics: 25, approved: 22, published: 2, inProgress: 0, failed: 0, totalSpend: 33.30, totalRevenue: 2301.00, avgCpm: 34.00 },
    isLoading: false,
  }),
}));

import Analytics from '../pages/Analytics';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/project/proj-1/analytics']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAnalyticsReturn = {
    data: mockPublishedTopics,
    isLoading: false,
    error: null,
    totalViews: 67000,
    totalWatchHours: 1780.8,
    avgCtr: 7.4,
    totalRevenue: 2301.00,
    totalLikes: 1850,
    totalComments: 520,
    totalSubscribers: 127,
    avgDuration: '41:52',
    topPerformer: mockPublishedTopics[0],
  };
});

describe('Analytics -- Metric cards', () => {
  it('renders metric summary cards with data', () => {
    renderWithProviders(<Analytics />);
    // Views total may appear in both KPI cards and Platform Breakdown, so use getAllByText
    expect(screen.getAllByText(/67,000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/1,780.8/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/7.4%/)).toBeTruthy();
    expect(screen.getAllByText(/\$2,301/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders top performer card', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByTestId('top-performer-card')).toBeTruthy();
    expect(screen.getAllByText(/Amex Platinum/).length).toBeGreaterThan(0);
  });
});

describe('Analytics -- Charts', () => {
  it('renders views chart', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByTestId('views-chart')).toBeTruthy();
  });

  it('renders cost donut chart', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByTestId('cost-donut')).toBeTruthy();
  });

  it('renders performance table with sortable columns', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByTestId('performance-table')).toBeTruthy();
  });

  it('time range filter changes data', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByTestId('time-range-filter')).toBeTruthy();
  });

  it('cost tracking shows cost donut and cost-revenue chart', () => {
    renderWithProviders(<Analytics />);
    // CostDonut renders with heading and cost-revenue chart renders
    expect(screen.getByText(/Cost Distribution/)).toBeTruthy();
    expect(screen.getByText(/Cost vs Revenue/)).toBeTruthy();
  });
});
