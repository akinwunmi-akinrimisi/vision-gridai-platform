import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// --- Mock data ---
const mockTopics = [
  {
    id: 'topic-1',
    project_id: 'test-project-id',
    topic_number: 1,
    seo_title: 'Is the Amex Platinum Worth $695? I Did the Math for 7 Lifestyles',
    playlist_angle: 'The Mathematician',
    status: 'published',
    review_status: 'approved',
    script_quality_score: 7.8,
    yt_views: 45000,
    yt_estimated_revenue: 1575,
  },
  {
    id: 'topic-2',
    project_id: 'test-project-id',
    topic_number: 2,
    seo_title: 'The Perfect 3-Card Wallet Strategy',
    playlist_angle: 'The Mathematician',
    status: 'producing',
    review_status: 'approved',
    script_quality_score: 8.1,
    yt_views: 0,
    yt_estimated_revenue: 0,
  },
  {
    id: 'topic-3',
    project_id: 'test-project-id',
    topic_number: 3,
    seo_title: 'CSR vs CSP: 365 Days of Data',
    playlist_angle: 'The Mathematician',
    status: 'script_approved',
    review_status: 'approved',
    script_quality_score: 6.2,
    yt_views: 0,
    yt_estimated_revenue: 0,
  },
  {
    id: 'topic-4',
    project_id: 'test-project-id',
    topic_number: 4,
    seo_title: 'Points Maximizer Guide',
    playlist_angle: 'Your Exact Life',
    status: 'pending',
    review_status: 'pending',
    script_quality_score: null,
    yt_views: 0,
    yt_estimated_revenue: 0,
  },
  {
    id: 'topic-5',
    project_id: 'test-project-id',
    topic_number: 5,
    seo_title: 'Failed Rewards Strategy',
    playlist_angle: 'The Investigator',
    status: 'failed',
    review_status: 'approved',
    script_quality_score: 5.1,
    yt_views: 0,
    yt_estimated_revenue: 0,
  },
];

// Mock hooks
let mockUseTopicsReturn;

vi.mock('../hooks/useTopics', () => ({
  useTopics: () => mockUseTopicsReturn,
}));

import PipelineTable from '../components/dashboard/PipelineTable';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/project/test-project-id']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseTopicsReturn = { data: mockTopics, isLoading: false, error: null };
});

describe('PipelineTable -- Rows', () => {
  it('renders table with topic rows showing topic #, title, playlist angle', () => {
    renderWithProviders(<PipelineTable topics={mockTopics} />);
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByText(/Amex Platinum Worth/)).toBeTruthy();
    expect(screen.getByText('The Mathematician')).toBeTruthy();
  });

  it('shows color-coded status badge per topic', () => {
    renderWithProviders(<PipelineTable topics={mockTopics} />);
    // Published should have green badge
    const publishedBadge = screen.getByTestId('status-badge-topic-1');
    expect(publishedBadge.className).toMatch(/green|emerald/);
    // Pending should have gray badge
    const pendingBadge = screen.getByTestId('status-badge-topic-4');
    expect(pendingBadge.className).toMatch(/gray|slate/);
    // Failed should have red badge
    const failedBadge = screen.getByTestId('status-badge-topic-5');
    expect(failedBadge.className).toMatch(/red/);
  });

  it('shows progress percentage for producing topics', () => {
    renderWithProviders(<PipelineTable topics={mockTopics} />);
    const producingRow = screen.getByTestId('topic-row-topic-2');
    expect(producingRow).toBeTruthy();
    // Progress indicator should exist for producing topics
    expect(screen.getByTestId('progress-topic-2')).toBeTruthy();
  });
});

describe('PipelineTable -- Data Columns', () => {
  it('shows quality score for scripted topics', () => {
    renderWithProviders(<PipelineTable topics={mockTopics} />);
    expect(screen.getByText('7.8')).toBeTruthy();
    expect(screen.getByText('8.1')).toBeTruthy();
  });

  it('shows views and revenue columns (0 when not published)', () => {
    renderWithProviders(<PipelineTable topics={mockTopics} />);
    // Published topic shows views
    expect(screen.getByText(/45,?000/)).toBeTruthy();
    // Published topic shows revenue
    expect(screen.getByText(/\$1,?575/)).toBeTruthy();
  });

  it('subscribes to Realtime for live topic status updates', async () => {
    const supabaseMock = await import('../lib/supabase');
    renderWithProviders(<PipelineTable topics={mockTopics} projectId="test-project-id" />);
    // PipelineTable should set up a Realtime subscription
    expect(supabaseMock.supabase.channel).toHaveBeenCalled();
  });
});
