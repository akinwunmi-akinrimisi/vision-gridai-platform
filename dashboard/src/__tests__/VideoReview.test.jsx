import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router useParams
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'proj-1', topicId: 'topic-1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock webhookCall
vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

// --- Mock data ---
const mockTopic = {
  id: 'topic-1',
  project_id: 'proj-1',
  topic_number: 1,
  seo_title: 'Is the Amex Platinum Worth $695? I Did the Math',
  status: 'assembled',
  video_review_status: 'pending',
  thumbnail_url: 'https://example.com/thumb.jpg',
  drive_video_url: 'https://drive.google.com/file/d/abc/preview',
  youtube_url: null,
  total_cost: 16.50,
  cost_breakdown: { script: 0.75, tts: 0.30, images: 3.20, i2v: 3.13, t2v: 9.00 },
  script_metadata: {
    video_metadata: {
      title: 'Is the Amex Platinum Worth $695?',
      description: 'Full analysis...',
      tags: ['amex', 'credit cards', 'platinum'],
      thumbnail_prompt: 'A dramatic Amex Platinum card',
    },
  },
  publish_progress: null,
  playlist_group: 1,
  narrative_hook: 'Every YouTuber says get the Amex Platinum...',
};

const mockScenes = [
  { id: 's1', scene_id: 'scene_001', scene_number: 1, chapter: 'Chapter 1', narration_text: 'Intro text', audio_duration_ms: 5000, start_time_ms: 0, end_time_ms: 5000 },
  { id: 's2', scene_id: 'scene_002', scene_number: 2, chapter: 'Chapter 1', narration_text: 'Scene two text', audio_duration_ms: 4500, start_time_ms: 5000, end_time_ms: 9500 },
];

// --- Mock hooks ---
let mockUseVideoReviewReturn;
let mockUseQuotaStatusReturn;

vi.mock('../hooks/useVideoReview', () => ({
  useVideoReview: () => mockUseVideoReviewReturn,
}));

vi.mock('../hooks/useQuotaStatus', () => ({
  useQuotaStatus: () => mockUseQuotaStatusReturn,
}));

vi.mock('../hooks/usePublishMutations', () => ({
  useApproveVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectVideo: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useRegenerateThumbnail: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMetadata: () => ({ mutate: vi.fn(), isPending: false }),
  useRetryUpload: () => ({ mutate: vi.fn(), isPending: false }),
}));

import VideoReview from '../pages/VideoReview';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/project/proj-1/topics/topic-1/review']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseVideoReviewReturn = { topic: mockTopic, scenes: mockScenes, isLoading: false, error: null };
  mockUseQuotaStatusReturn = { uploadsToday: 2, remaining: 4, isLoading: false };
});

describe('VideoReview -- Page rendering', () => {
  it('renders video review page with player', () => {
    renderWithProviders(<VideoReview />);
    expect(screen.getByTestId('video-review-page')).toBeTruthy();
    expect(screen.getByTestId('video-player')).toBeTruthy();
  });

  it('displays metadata panel with title and tags', () => {
    renderWithProviders(<VideoReview />);
    // Title appears in header and metadata panel
    expect(screen.getAllByText(/Amex Platinum/).length).toBeGreaterThan(0);
    // Tags rendered as chips
    expect(screen.getByText('amex')).toBeTruthy();
    expect(screen.getByText('credit cards')).toBeTruthy();
    expect(screen.getByText('platinum')).toBeTruthy();
  });

  it('shows thumbnail preview', () => {
    renderWithProviders(<VideoReview />);
    expect(screen.getByTestId('thumbnail-preview')).toBeTruthy();
  });

  it('shows upload progress steps when publishing', () => {
    mockUseVideoReviewReturn = {
      ...mockUseVideoReviewReturn,
      topic: { ...mockTopic, publish_progress: 'uploading_video' },
    };
    renderWithProviders(<VideoReview />);
    expect(screen.getByTestId('upload-progress')).toBeTruthy();
    expect(screen.getByText('Uploading video')).toBeTruthy();
  });

  it('shows published banner for published topics', () => {
    mockUseVideoReviewReturn = {
      ...mockUseVideoReviewReturn,
      topic: {
        ...mockTopic,
        status: 'published',
        youtube_video_id: 'yt-123',
        youtube_url: 'https://youtube.com/watch?v=yt-123',
        published_at: '2026-03-09T12:00:00Z',
      },
    };
    renderWithProviders(<VideoReview />);
    expect(screen.getByTestId('published-banner')).toBeTruthy();
    expect(screen.getByText(/View on YouTube/)).toBeTruthy();
  });

  it('shows edit metadata button', () => {
    renderWithProviders(<VideoReview />);
    expect(screen.getByTestId('edit-metadata-btn')).toBeTruthy();
  });

  it('shows approve and reject buttons', () => {
    renderWithProviders(<VideoReview />);
    expect(screen.getByTestId('approve-btn')).toBeTruthy();
    expect(screen.getByTestId('reject-btn')).toBeTruthy();
  });
});
