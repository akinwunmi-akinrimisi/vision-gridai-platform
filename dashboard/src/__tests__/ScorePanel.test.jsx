import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id', topicId: 'test-topic-id' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
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

import ScorePanel from '../components/script/ScorePanel';

// v3.0 dimension keys matching SCORE_DIMENSIONS in ScorePanel.jsx
const v3DimensionKeys = [
  'word_count_compliance',
  'citation_density',
  'narrative_structure',
  'actionable_specificity',
  'retention_engineering',
  'format_compliance',
  'anti_pattern_compliance',
];

// Build per-pass scores using the v3.0 dimension keys
// The component reads from pass_1, pass_2, pass_3 (with underscores)
const mockPassScores = {
  pass_1: {
    score: 7.2,
    final_score: 7.2,
    attempts: 1,
    scores: {
      word_count_compliance: 7.5,
      citation_density: 8.0,
      narrative_structure: 7.0,
      actionable_specificity: 7.5,
      retention_engineering: 6.8,
      format_compliance: 7.0,
      anti_pattern_compliance: 7.5,
    },
  },
  pass_2: {
    score: 7.9,
    final_score: 7.9,
    attempts: 1,
    scores: {
      word_count_compliance: 8.0,
      citation_density: 8.5,
      narrative_structure: 7.5,
      actionable_specificity: 8.0,
      retention_engineering: 7.5,
      format_compliance: 7.5,
      anti_pattern_compliance: 8.0,
    },
  },
  pass_3: {
    score: 8.1,
    final_score: 8.1,
    attempts: 1,
    scores: {
      word_count_compliance: 8.5,
      citation_density: 8.0,
      narrative_structure: 8.0,
      actionable_specificity: 8.0,
      retention_engineering: 8.0,
      format_compliance: 8.0,
      anti_pattern_compliance: 8.0,
    },
  },
};

const mockTopic = {
  id: 'test-topic-id',
  word_count: 18742,
  scene_count: 172,
  script_attempts: 1,
  script_quality_score: 7.8,
  script_pass_scores: mockPassScores,
  script_review_status: 'pending',
  script_json: {
    metadata: { visual_split: { static_image: 75, i2v: 25, t2v: 72 } },
  },
  script_metadata: {
    video_metadata: {
      title: 'Is the Amex Platinum Worth $695?',
      description: 'A deep dive into credit card rewards.',
      tags: ['credit cards', 'amex platinum'],
      thumbnail_prompt: 'A platinum credit card on a marble surface',
    },
  },
  avatars: [{
    avatar_name_age: 'Marcus, 34',
    occupation_income: 'Software Engineer, $145K/yr',
    pain_point: 'Paying $695/yr, not sure getting value back',
    emotional_driver: 'Validation anxiety',
    dream_outcome: 'Confident that annual fee pays for itself',
  }],
};

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ScorePanel -- Overall Score (SCPT-05)', () => {
  it('renders overall quality score prominently', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    const scoreEl = screen.getByTestId('overall-score');
    expect(scoreEl.textContent).toContain('7.8');
  });
});

describe('ScorePanel -- Dimension Bars (SCPT-05)', () => {
  it('renders 7 dimension score bars', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    const bars = screen.getByTestId('dimension-bars');
    expect(bars.children.length).toBe(7);
  });

  it('uses success color for scores >= 8', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // citation_density avg = (8.0 + 8.5 + 8.0) / 3 = 8.2 -- should use success color
    const bar = screen.getByTestId('bar-citation_density');
    expect(bar.className).toContain('bg-success');
  });

  it('uses accent color for scores >= 7 and < 8', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // narrative_structure avg = (7.0 + 7.5 + 8.0) / 3 = 7.5 -- should use accent color
    const bar = screen.getByTestId('bar-narrative_structure');
    expect(bar.className).toContain('bg-accent');
  });

  it('uses danger color for scores < 7', () => {
    // Create pass scores where retention_engineering averages below 7
    const lowScorePassScores = {
      pass_1: {
        score: 6.0,
        final_score: 6.0,
        attempts: 1,
        scores: {
          word_count_compliance: 7.5,
          citation_density: 8.0,
          narrative_structure: 7.0,
          actionable_specificity: 7.5,
          retention_engineering: 5.5,
          format_compliance: 7.0,
          anti_pattern_compliance: 7.5,
        },
      },
      pass_2: {
        score: 6.5,
        final_score: 6.5,
        attempts: 1,
        scores: {
          word_count_compliance: 8.0,
          citation_density: 8.5,
          narrative_structure: 7.5,
          actionable_specificity: 8.0,
          retention_engineering: 6.0,
          format_compliance: 7.5,
          anti_pattern_compliance: 8.0,
        },
      },
      pass_3: {
        score: 7.0,
        final_score: 7.0,
        attempts: 1,
        scores: {
          word_count_compliance: 8.5,
          citation_density: 8.0,
          narrative_structure: 8.0,
          actionable_specificity: 8.0,
          retention_engineering: 6.5,
          format_compliance: 8.0,
          anti_pattern_compliance: 8.0,
        },
      },
    };

    const topicWithLowScore = {
      ...mockTopic,
      script_pass_scores: lowScorePassScores,
    };

    renderWithProviders(
      <ScorePanel topic={topicWithLowScore} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // retention_engineering avg = (5.5 + 6.0 + 6.5) / 3 = 6.0 -- should use danger color
    const bar = screen.getByTestId('bar-retention_engineering');
    expect(bar.className).toContain('bg-danger');
  });
});

describe('ScorePanel -- Metadata', () => {
  it('renders word count, scene count, and total attempts', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    const grid = screen.getByTestId('metadata-grid');
    expect(grid.textContent).toContain('18,742');
    expect(grid.textContent).toContain('172');
    // Total attempts = sum of per-pass attempts (1+1+1 = 3)
    expect(grid.textContent).toContain('3');
    expect(grid.textContent).toContain('across 3 passes');
  });
});

describe('ScorePanel -- Action Buttons (SCPT-11, SCPT-12)', () => {
  it('renders Approve, Reject, and Refine action buttons', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    expect(screen.getByTestId('approve-btn')).toBeDefined();
    expect(screen.getByTestId('reject-btn')).toBeDefined();
    expect(screen.getByTestId('refine-btn')).toBeDefined();
    expect(screen.getByTestId('approve-btn').textContent).toContain('Approve Script');
    expect(screen.getByTestId('reject-btn').textContent).toContain('Reject');
    expect(screen.getByTestId('refine-btn').textContent).toContain('Refine');
  });
});

describe('ScorePanel -- Per-Pass Breakdown', () => {
  it('per-pass breakdown is collapsible and collapsed by default', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // Per-pass breakdown should be collapsed -- individual pass scores should not be visible initially
    expect(screen.queryByText(/Pass 1:/)).toBeNull();

    // Click the "Per-Pass Breakdown" toggle
    const toggleBtn = screen.getByText('Per-Pass Breakdown');
    fireEvent.click(toggleBtn);

    // Now pass scores should be visible (format: "Pass 1: <score>/10")
    expect(screen.getByText(/Pass 1:/)).toBeDefined();
    expect(screen.getByText(/Pass 2:/)).toBeDefined();
    expect(screen.getByText(/Pass 3:/)).toBeDefined();
  });
});

describe('ScorePanel -- Customer Avatar', () => {
  it('shows collapsible customer avatar section', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // Collapsed by default
    expect(screen.queryByText('Marcus, 34')).toBeNull();

    // Toggle open
    const toggleBtn = screen.getByText('Customer Avatar');
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Marcus, 34')).toBeDefined();
    expect(screen.getByText('Software Engineer, $145K/yr')).toBeDefined();
  });
});

describe('ScorePanel -- YouTube Metadata', () => {
  it('shows collapsible YouTube metadata section', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // Collapsed by default
    expect(screen.queryByText('Is the Amex Platinum Worth $695?')).toBeNull();

    // Toggle open
    const toggleBtn = screen.getByText('YouTube Metadata');
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Is the Amex Platinum Worth $695?')).toBeDefined();
    expect(screen.getByText('A deep dive into credit card rewards.')).toBeDefined();
  });
});
