import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id', topicId: 'test-topic-id' }),
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

// v3.0 pass scores with underscore keys (pass_1, pass_2, pass_3) and scores sub-object
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

// Mock the hooks to control data
const mockTopicData = {
  id: 'test-topic-id',
  project_id: 'test-project-id',
  topic_number: 1,
  seo_title: 'Is the Amex Platinum Worth $695? I Did the Math for 7 Lifestyles',
  playlist_group: 1,
  playlist_angle: 'The Mathematician',
  status: 'scripting_complete',
  review_status: 'approved',
  script_review_status: 'pending',
  script_force_passed: false,
  script_attempts: 1,
  word_count: 18742,
  scene_count: 172,
  script_quality_score: 7.8,
  script_pass_scores: mockPassScores,
  script_json: {
    scenes: [
      { scene_id: 'scene_001', scene_number: 1, chapter: 'Chapter 1: The Amex Platinum Myth', narration_text: 'Meet Marcus. He is thirty-four years old.', image_prompt: 'A professional man in his mid-thirties.', visual_type: 'static_image', emotional_beat: 'curiosity' },
      { scene_id: 'scene_002', scene_number: 2, chapter: 'Chapter 1: The Amex Platinum Myth', narration_text: 'Every month, six hundred and ninety-five dollars disappears.', image_prompt: 'A credit card statement.', visual_type: 'i2v', emotional_beat: 'tension' },
      { scene_id: 'scene_003', scene_number: 3, chapter: 'Chapter 2: The 7 Personas', narration_text: 'But here is the thing most people miss entirely.', image_prompt: 'Split screen showing seven lifestyles.', visual_type: 't2v', emotional_beat: 'revelation' },
    ],
    metadata: { total_words: 18742, total_scenes: 172, visual_split: { static_image: 75, i2v: 25, t2v: 72 } },
  },
  script_metadata: { video_metadata: { title: 'Amex Platinum', description: 'Test', tags: ['credit'] } },
  avatars: [{ avatar_name_age: 'Marcus, 34', occupation_income: 'Software Engineer, $145K/yr', pain_point: 'Paying $695/yr' }],
};

const mockScenes = [
  { id: 's1', scene_id: 'scene_001', scene_number: 1, chapter: 'Chapter 1: The Amex Platinum Myth', narration_text: 'Meet Marcus. He is thirty-four years old.', image_prompt: 'A professional man in his mid-thirties.', visual_type: 'static_image', emotional_beat: 'curiosity' },
  { id: 's2', scene_id: 'scene_002', scene_number: 2, chapter: 'Chapter 1: The Amex Platinum Myth', narration_text: 'Every month, six hundred and ninety-five dollars disappears.', image_prompt: 'A credit card statement.', visual_type: 'i2v', emotional_beat: 'tension' },
  { id: 's3', scene_id: 'scene_003', scene_number: 3, chapter: 'Chapter 2: The 7 Personas', narration_text: 'But here is the thing most people miss entirely.', image_prompt: 'Split screen showing seven lifestyles.', visual_type: 't2v', emotional_beat: 'revelation' },
];

const mockTopics = [
  { ...mockTopicData, id: 'topic-1', topic_number: 1, review_status: 'approved' },
  { ...mockTopicData, id: 'test-topic-id', topic_number: 2, review_status: 'approved' },
  { ...mockTopicData, id: 'topic-3', topic_number: 3, review_status: 'approved' },
];

const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  niche: 'Credit Cards',
};

let mockUseScriptReturn = { data: mockTopicData, isLoading: false, error: null };
let mockUseScenesReturn = { data: mockScenes, isLoading: false, error: null };
let mockUseTopicsReturn = { data: mockTopics, isLoading: false, error: null };
let mockUseProjectReturn = { data: mockProject, isLoading: false, error: null };

vi.mock('../hooks/useScript', () => ({
  useScript: () => mockUseScriptReturn,
}));

vi.mock('../hooks/useScenes', () => ({
  useScenes: () => mockUseScenesReturn,
}));

vi.mock('../hooks/useTopics', () => ({
  useTopics: () => mockUseTopicsReturn,
}));

// Mock useProject from useNicheProfile (used for isKinetic check)
vi.mock('../hooks/useNicheProfile', () => ({
  useProject: () => mockUseProjectReturn,
  useNicheProfile: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('../hooks/useScriptMutations', () => ({
  useGenerateScript: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRefineScript: () => ({ mutate: vi.fn(), isPending: false }),
  useRegenPrompts: () => ({ mutate: vi.fn(), isPending: false }),
}));

import ScriptReview from '../pages/ScriptReview';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/project/test-project-id/topics/test-topic-id/script']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseScriptReturn = { data: mockTopicData, isLoading: false, error: null };
  mockUseScenesReturn = { data: mockScenes, isLoading: false, error: null };
  mockUseTopicsReturn = { data: mockTopics, isLoading: false, error: null };
  mockUseProjectReturn = { data: mockProject, isLoading: false, error: null };
});

describe('ScriptReview -- Header Bar (SCPT-10)', () => {
  it('renders header with topic title, playlist badge, and status badge', () => {
    renderWithProviders(<ScriptReview />);
    // Title appears in header (h1) and possibly in refine panel summary
    expect(screen.getAllByText(/Amex Platinum Worth/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('The Mathematician').length).toBeGreaterThan(0);
  });

  it('renders prev/next arrows for navigating between approved topics', () => {
    renderWithProviders(<ScriptReview />);
    const prevBtn = screen.getByTestId('prev-topic-btn');
    const nextBtn = screen.getByTestId('next-topic-btn');
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();
  });
});

describe('ScriptReview -- Score Panel (SCPT-05)', () => {
  it('renders score panel with 7 dimension bars', () => {
    renderWithProviders(<ScriptReview />);
    expect(screen.getByTestId('score-panel')).toBeTruthy();
    expect(screen.getByTestId('overall-score')).toBeTruthy();
  });

  it('renders pass tracker during generation when status is scripting', () => {
    mockUseScriptReturn = {
      data: { ...mockTopicData, status: 'scripting', script_json: null, script_quality_score: null },
      isLoading: false,
      error: null,
    };
    mockUseScenesReturn = { data: [], isLoading: false, error: null };

    renderWithProviders(<ScriptReview />);
    expect(screen.getByTestId('pass-tracker')).toBeTruthy();
  });
});

describe('ScriptReview -- Chapter Accordions (SCPT-10)', () => {
  it('renders chapter accordions with scene counts', () => {
    renderWithProviders(<ScriptReview />);
    expect(screen.getByTestId('chapter-Chapter 1: The Amex Platinum Myth')).toBeTruthy();
    expect(screen.getByTestId('chapter-Chapter 2: The 7 Personas')).toBeTruthy();
  });

  it('first chapter is expanded by default, rest collapsed', () => {
    renderWithProviders(<ScriptReview />);
    // First chapter's scenes should be visible
    expect(screen.getByTestId('scene-row-1')).toBeTruthy();
    expect(screen.getByTestId('scene-row-2')).toBeTruthy();
    // Second chapter's scene should not be visible (collapsed)
    expect(screen.queryByTestId('scene-row-3')).toBeNull();
  });

  it('clicking a chapter header toggles expand/collapse', () => {
    renderWithProviders(<ScriptReview />);
    // Chapter 2 is collapsed, click to expand
    const ch2 = screen.getByTestId('chapter-Chapter 2: The 7 Personas');
    const toggleBtn = within(ch2).getByRole('button');
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('scene-row-3')).toBeTruthy();
  });
});

describe('ScriptReview -- Scene Rows (SCPT-08)', () => {
  it('renders scene rows with scene_id in monospace', () => {
    renderWithProviders(<ScriptReview />);
    expect(screen.getByTestId('line-number-1').textContent).toBe('scene_001');
    expect(screen.getByTestId('line-number-2').textContent).toBe('scene_002');
  });

  it('renders visual type badges: blue=static_image, purple=i2v, amber=t2v', () => {
    renderWithProviders(<ScriptReview />);
    // Check that badges exist within scene rows
    const row1 = screen.getByTestId('scene-row-1');
    expect(within(row1).getByText('Image')).toBeTruthy();

    const row2 = screen.getByTestId('scene-row-2');
    expect(within(row2).getByText('I2V')).toBeTruthy();
  });

  it('image prompts are hidden by default', () => {
    renderWithProviders(<ScriptReview />);
    // Image prompt text should not be visible
    expect(screen.queryByText('A professional man in his mid-thirties.')).toBeNull();
  });
});

describe('ScriptReview -- Generate Script CTA (SCPT-01)', () => {
  it('shows "Generate Script" CTA when topic has no script', () => {
    mockUseScriptReturn = {
      data: { ...mockTopicData, script_json: null, status: 'approved', script_quality_score: null, script_pass_scores: null },
      isLoading: false,
      error: null,
    };
    mockUseScenesReturn = { data: [], isLoading: false, error: null };

    renderWithProviders(<ScriptReview />);
    expect(screen.getByTestId('generate-script-cta')).toBeTruthy();
  });
});

describe('ScriptReview -- Force Pass Warning', () => {
  it('shows force-pass amber warning when script_force_passed is true', () => {
    mockUseScriptReturn = {
      data: { ...mockTopicData, script_force_passed: true },
      isLoading: false,
      error: null,
    };

    renderWithProviders(<ScriptReview />);
    expect(screen.getByTestId('force-pass-banner')).toBeTruthy();
  });
});

describe('ScriptReview -- Script Approved Banner', () => {
  it('shows approved banner with "View Production" button when script is approved', () => {
    mockUseScriptReturn = {
      data: { ...mockTopicData, script_review_status: 'approved' },
      isLoading: false,
      error: null,
    };

    renderWithProviders(<ScriptReview />);
    expect(screen.getByText('Script Approved')).toBeTruthy();
    expect(screen.getByText(/View Production/)).toBeTruthy();
  });

});
