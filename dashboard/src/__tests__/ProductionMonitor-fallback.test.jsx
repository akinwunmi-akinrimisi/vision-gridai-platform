import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router useParams and useNavigate
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id' }),
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
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
const mockAssembledTopic = {
  id: 'topic-assembled',
  project_id: 'test-project-id',
  topic_number: 1,
  seo_title: 'Is the Amex Platinum Worth $695?',
  status: 'assembled',
  supervisor_alerted: false,
  total_cost: 16.50,
  cost_breakdown: { script: 0.75, tts: 0.30, images: 3.20 },
  last_status_change: '2026-03-08T08:00:00Z',
  updated_at: '2026-03-08T09:00:00Z',
};

const mockActiveTopic = {
  id: 'topic-active',
  project_id: 'test-project-id',
  topic_number: 2,
  seo_title: 'The Perfect 3-Card Wallet Strategy',
  status: 'producing',
  supervisor_alerted: false,
  total_cost: 4.25,
  cost_breakdown: { script: 0.75, tts: 0.30 },
  last_status_change: '2026-03-08T10:00:00Z',
  updated_at: '2026-03-08T10:00:00Z',
};

const mockScenes = [
  { id: 's1', scene_id: 'scene_001', scene_number: 1, chapter: 'Chapter 1', audio_status: 'uploaded', image_status: 'uploaded', video_status: 'pending', clip_status: 'complete', narration_text: 'Test', audio_duration_ms: 5000, start_time_ms: 0, end_time_ms: 5000, skipped: false, image_prompt: 'test' },
];

// --- Mock hooks ---
let mockUseTopicsReturn;
let mockUseProductionProgressReturn;
let mockUseProductionLogReturn;

vi.mock('../hooks/useTopics', () => ({
  useTopics: () => mockUseTopicsReturn,
}));

vi.mock('../hooks/useProductionProgress', () => ({
  useProductionProgress: () => mockUseProductionProgressReturn,
}));

vi.mock('../hooks/useProductionLog', () => ({
  useProductionLog: () => mockUseProductionLogReturn,
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

import ProductionMonitor from '../pages/ProductionMonitor';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/project/test-project-id/production']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseTopicsReturn = { data: [], isLoading: false, error: null };
  mockUseProductionProgressReturn = { scenes: [], stageProgress: {}, failedScenes: [], isLoading: false, error: null };
  mockUseProductionLogReturn = { logs: [], isLoading: false };
});

describe('ProductionMonitor -- lastCompletedTopic Fallback', () => {
  it('shows "Last Production" label when only assembled topics exist (no active topic)', () => {
    mockUseTopicsReturn = { data: [mockAssembledTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, failedScenes: [], isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByText('Last Production')).toBeTruthy();
  });

  it('shows assembled topic data instead of empty state', () => {
    mockUseTopicsReturn = { data: [mockAssembledTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, failedScenes: [], isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    // Should show the assembled topic title, NOT the "No Active Production" empty state
    const matches = screen.getAllByText(/Amex Platinum/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/No Active Production/i)).toBeNull();
  });

  it('still shows "Now Producing" when an active topic exists alongside assembled topics', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic, mockAssembledTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, failedScenes: [], isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByText('Now Producing')).toBeTruthy();
    expect(screen.queryByText('Last Production')).toBeNull();
  });

  it('does not show stop button for lastCompletedTopic fallback', () => {
    mockUseTopicsReturn = { data: [mockAssembledTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, failedScenes: [], isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.queryByTestId('stop-production-btn')).toBeNull();
  });
});
