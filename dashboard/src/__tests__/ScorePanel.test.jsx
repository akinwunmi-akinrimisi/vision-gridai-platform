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

const mockCombinedScores = {
  score: 7.8,
  dimensions: {
    persona_integration: 8.0,
    hook_strength: 8.2,
    pacing: 7.5,
    specificity: 7.8,
    tts_readability: 7.4,
    visual_prompts: 7.5,
    anti_patterns: 7.8,
  },
  feedback: 'Well-structured script with strong persona integration.',
};

const mockPassScores = {
  pass1: {
    score: 7.2,
    dimensions: {
      persona_integration: 7.5,
      hook_strength: 8.0,
      pacing: 7.0,
      specificity: 7.5,
      tts_readability: 6.8,
      visual_prompts: 7.0,
      anti_patterns: 7.5,
    },
  },
  pass2: {
    score: 7.9,
    dimensions: {
      persona_integration: 8.0,
      hook_strength: 8.5,
      pacing: 7.5,
      specificity: 8.0,
      tts_readability: 7.5,
      visual_prompts: 7.5,
      anti_patterns: 8.0,
    },
  },
  pass3: {
    score: 8.1,
    dimensions: {
      persona_integration: 8.5,
      hook_strength: 8.0,
      pacing: 8.0,
      specificity: 8.0,
      tts_readability: 8.0,
      visual_prompts: 8.0,
      anti_patterns: 8.0,
    },
  },
  combined: mockCombinedScores,
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
    expect(scoreEl.textContent).toContain('/10');
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

  it('uses green color for scores >= 8', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // hook_strength is 8.2 -- should be emerald
    const bar = screen.getByTestId('bar-hook_strength');
    expect(bar.className).toContain('bg-emerald-500');
  });

  it('uses amber color for scores >= 7 and < 8', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    // pacing is 7.5 -- should be amber
    const bar = screen.getByTestId('bar-pacing');
    expect(bar.className).toContain('bg-amber-500');
  });

  it('uses red color for scores < 7', () => {
    const topicWithLowScore = {
      ...mockTopic,
      script_pass_scores: {
        ...mockPassScores,
        combined: {
          ...mockCombinedScores,
          dimensions: {
            ...mockCombinedScores.dimensions,
            tts_readability: 6.5,
          },
        },
      },
    };

    renderWithProviders(
      <ScorePanel topic={topicWithLowScore} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    const bar = screen.getByTestId('bar-tts_readability');
    expect(bar.className).toContain('bg-red-500');
  });
});

describe('ScorePanel -- Metadata', () => {
  it('renders word count, scene count, visual split, and attempts', () => {
    renderWithProviders(
      <ScorePanel topic={mockTopic} onApprove={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />
    );

    const grid = screen.getByTestId('metadata-grid');
    expect(grid.textContent).toContain('18,742');
    expect(grid.textContent).toContain('172');
    expect(grid.textContent).toContain('75 / 25 / 72');
    expect(grid.textContent).toContain('1 of 3');
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
    expect(screen.queryByText('Pass 1: 7.2/10')).toBeNull();

    // Click the "Per-Pass Breakdown" toggle
    const toggleBtn = screen.getByText('Per-Pass Breakdown');
    fireEvent.click(toggleBtn);

    // Now pass scores should be visible
    expect(screen.getByText('Pass 1: 7.2/10')).toBeDefined();
    expect(screen.getByText('Pass 2: 7.9/10')).toBeDefined();
    expect(screen.getByText('Pass 3: 8.1/10')).toBeDefined();
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
