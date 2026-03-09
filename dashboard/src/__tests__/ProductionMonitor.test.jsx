import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id' }),
    useNavigate: () => mockNavigate,
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
const mockActiveTopic = {
  id: 'topic-active',
  project_id: 'test-project-id',
  topic_number: 2,
  seo_title: 'The Perfect 3-Card Wallet Strategy',
  playlist_angle: 'The Mathematician',
  status: 'producing',
  supervisor_alerted: false,
  total_cost: 4.25,
  cost_breakdown: { script: 0.75, tts: 0.30, images: 1.60, i2v: 0.85, t2v: 0.75 },
  last_status_change: '2026-03-08T10:00:00Z',
};

const mockQueuedTopic = {
  id: 'topic-queued',
  project_id: 'test-project-id',
  topic_number: 3,
  seo_title: 'CSR vs CSP: 365 Days of Data',
  playlist_angle: 'The Mathematician',
  status: 'queued',
  supervisor_alerted: false,
  total_cost: null,
  cost_breakdown: null,
  last_status_change: null,
};

const mockCompletedTopic = {
  id: 'topic-done',
  project_id: 'test-project-id',
  topic_number: 1,
  seo_title: 'Is the Amex Platinum Worth $695?',
  playlist_angle: 'The Mathematician',
  status: 'assembled',
  supervisor_alerted: false,
  total_cost: 16.50,
  cost_breakdown: { script: 0.75, tts: 0.30, images: 3.20, i2v: 3.13, t2v: 9.00 },
  last_status_change: '2026-03-08T08:00:00Z',
};

const mockSupervisorTopic = {
  ...mockActiveTopic,
  id: 'topic-stuck',
  supervisor_alerted: true,
};

const mockScriptApprovedTopic = {
  id: 'topic-ready',
  project_id: 'test-project-id',
  topic_number: 4,
  seo_title: 'Points Maximizer Guide',
  playlist_angle: 'The Mathematician',
  status: 'script_approved',
  supervisor_alerted: false,
};

const mockScenes = [
  { id: 's1', scene_id: 'scene_001', scene_number: 1, chapter: 'Chapter 1', audio_status: 'uploaded', image_status: 'uploaded', video_status: 'pending', clip_status: 'pending', narration_text: 'Test narration', audio_duration_ms: 5000, start_time_ms: 0, end_time_ms: 5000, skipped: false, image_prompt: 'test prompt' },
  { id: 's2', scene_id: 'scene_002', scene_number: 2, chapter: 'Chapter 1', audio_status: 'uploaded', image_status: 'pending', video_status: 'pending', clip_status: 'pending', narration_text: 'Test narration 2', audio_duration_ms: 4500, start_time_ms: 5000, end_time_ms: 9500, skipped: false, image_prompt: 'test prompt 2' },
  { id: 's3', scene_id: 'scene_003', scene_number: 3, chapter: 'Chapter 2', audio_status: 'uploaded', image_status: 'failed', video_status: 'pending', clip_status: 'pending', narration_text: 'Test narration 3', audio_duration_ms: 6000, start_time_ms: 9500, end_time_ms: 15500, skipped: false, image_prompt: 'test prompt 3' },
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
    stopProduction: { mutate: vi.fn(), isPending: false },
    resumeProduction: { mutate: vi.fn(), isPending: false },
    retryScene: { mutate: vi.fn(), isPending: false },
    skipScene: { mutate: vi.fn(), isPending: false },
    retryAllFailed: { mutate: vi.fn(), isPending: false },
    skipAllFailed: { mutate: vi.fn(), isPending: false },
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
  mockUseProductionProgressReturn = { scenes: [], stageProgress: {}, isLoading: false, error: null };
  mockUseProductionLogReturn = { logs: [], isLoading: false };
});

describe('ProductionMonitor -- Empty State', () => {
  it('renders "No active production" empty state when no topic has status=producing', () => {
    mockUseTopicsReturn = { data: [mockScriptApprovedTopic], isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByText(/no active production/i)).toBeTruthy();
  });

  it('empty state shows count of script-approved topics ready for production', () => {
    mockUseTopicsReturn = { data: [mockScriptApprovedTopic, { ...mockScriptApprovedTopic, id: 'topic-ready-2', topic_number: 5 }], isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByText(/2/)).toBeTruthy();
  });

  it('empty state shows "Start Production" CTA button', () => {
    mockUseTopicsReturn = { data: [mockScriptApprovedTopic], isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('start-production-cta')).toBeTruthy();
  });
});

describe('ProductionMonitor -- Active Production', () => {
  it('renders HeroCard when active topic exists (status=producing)', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: { audio: 3, images: 1 }, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('hero-card')).toBeTruthy();
  });

  it('renders DotGrid with scenes for active topic', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: { audio: 3, images: 1 }, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('dot-grid')).toBeTruthy();
  });

  it('renders QueueList with topics having status=queued', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic, mockQueuedTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('queue-list')).toBeTruthy();
  });

  it('renders FailedScenes section when any scene has failed status', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('failed-scenes')).toBeTruthy();
  });

  it('does NOT render FailedScenes when no failures exist', () => {
    const noFailScenes = mockScenes.map((s) => ({ ...s, image_status: 'uploaded', video_status: 'uploaded', audio_status: 'uploaded', clip_status: 'complete' }));
    mockUseTopicsReturn = { data: [mockActiveTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: noFailScenes, stageProgress: {}, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.queryByTestId('failed-scenes')).toBeNull();
  });

  it('renders ActivityLog (collapsed by default)', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('activity-log')).toBeTruthy();
  });

  it('renders "Recently Completed" section with last 3 completed topics', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic, mockCompletedTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('recently-completed')).toBeTruthy();
  });

  it('renders supervisor alert banner when any topic has supervisor_alerted=true', () => {
    mockUseTopicsReturn = { data: [mockSupervisorTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('supervisor-alert')).toBeTruthy();
  });

  it('Stop Production button visible on active topic', () => {
    mockUseTopicsReturn = { data: [mockActiveTopic], isLoading: false, error: null };
    mockUseProductionProgressReturn = { scenes: mockScenes, stageProgress: {}, isLoading: false, error: null };
    renderWithProviders(<ProductionMonitor />);
    expect(screen.getByTestId('stop-production-btn')).toBeTruthy();
  });
});
