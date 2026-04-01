import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const mockAnalysis = {
  id: 'analysis-1',
  video_id: 'abc123',
  video_title: 'How to Build Wealth in Your 20s',
  channel_name: 'Finance Channel',
  video_url: 'https://youtube.com/watch?v=abc123',
  thumbnail_url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
  niche_category: 'personal_finance',
  views: 1500000,
  likes: 45000,
  comments: 3200,
  duration_seconds: 5400,
  status: 'complete',
  analysis: {
    overall_score: '8',
    one_line_summary: 'Solid personal finance guide with gaps in tax optimization.',
    opportunity_scorecard: {
      market_gap: { score: '8', justification: 'Large untapped audience for tax-focused content' },
      uniqueness_potential: { score: '7', justification: 'Can differentiate with data-driven approach' },
      audience_demand: { score: '9', justification: 'Comments show strong demand for tax content' },
      engagement_ceiling: { score: '8', justification: '2M+ views achievable with right title' },
      script_exploitability: { score: '7', justification: 'Several pacing issues to exploit' },
      competition_density: { score: '6', justification: 'Moderate competition in this angle' },
      monetization_fit: { score: '9', justification: 'High CPM niche with sponsor potential' },
      composite_score: '7.8',
      verdict: 'CONDITIONAL_GO',
      verdict_reason: 'Viable opportunity with strong audience demand but moderate competition.',
    },
    strengths: ['Clear explanations', 'Good use of data', 'Strong hook'],
    weaknesses: ['Poor pacing in middle', 'No tax coverage', 'Weak CTA'],
    ten_x_strategy: {
      recommended_angle: 'Tax-optimized wealth building for 20-somethings',
      key_differentiators: ['Add tax strategies', 'Data visualizations', 'Case studies'],
      suggested_title: 'The Tax-Smart Guide to Building Wealth in Your 20s',
      target_duration: '90 minutes',
      opening_hook_suggestion: 'What if I told you the government has a legal cheat code for building wealth?',
    },
    blue_ocean_analysis: {
      gaps_and_opportunities: ['Tax optimization angle', 'International investing'],
      contrarian_angles: ['Challenge the index fund consensus'],
      untapped_audience_segments: ['Self-employed 20-somethings'],
    },
    script_structure: {
      hook_analysis: '8/10 - Strong opening with relatable scenario',
      narrative_arc: 'Problem-solution with personal anecdotes',
      pacing: 'Good first 30 min, drags in middle section',
      chapter_breakdown: ['Introduction', 'Income', 'Saving', 'Investing', 'CTA'],
    },
    engagement_analysis: {
      retention_hooks: ['Pattern interrupts every 5 min', 'Cliffhangers before breaks'],
      emotional_triggers: ['Fear of missing out', 'Aspiration', 'Urgency'],
    },
    content_quality: {
      depth_score: '7',
      unique_insights: ['Compound interest math breakdown'],
      missing_topics: ['Tax-advantaged accounts', 'Real estate basics'],
    },
    comment_insights: {
      sentiment_summary: 'Mostly positive (75%) with requests for more depth',
      top_questions: ['What about Roth IRA?', 'How does this work for freelancers?'],
      complaints: ['Too basic for experienced investors', 'No international coverage'],
      requests: ['More on tax strategies', 'Follow-up on real estate'],
      topic_opportunities: [
        {
          theme: 'Tax Optimization',
          description: 'Viewers want detailed tax strategies for young earners',
          frequency: '15+ comments',
          sentiment: 'curious',
          suggested_video_title: 'Tax Hacks for Your 20s: Save $10K+ Legally',
          representative_comments: ['Please do a video on Roth vs Traditional', 'How do taxes work for side hustles?'],
        },
      ],
    },
    _meta: { comments_fetched: 100, transcript_length: 25000 },
  },
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockAnalysis, error: null }),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Must import AFTER mocks
const { default: VideoAnalysis } = await import('../pages/VideoAnalysis');

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/youtube-discovery/analysis/analysis-1']}>
        <Routes>
          <Route path="/youtube-discovery/analysis/:analysisId" element={<VideoAnalysis />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('VideoAnalysis Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText('Video Analysis')).toBeTruthy();
    });
  });

  it('renders video title', async () => {
    renderPage();
    await vi.waitFor(() => {
      const titles = screen.getAllByText('How to Build Wealth in Your 20s');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders channel name', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText('Finance Channel')).toBeTruthy();
    });
  });

  it('renders verdict banner with CONDITIONAL GO', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText('CONDITIONAL GO')).toBeTruthy();
    });
  });

  it('renders composite score', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText('7.8')).toBeTruthy();
    });
  });

  it('renders scorecard with composite score and verdict reason', async () => {
    renderPage();
    await vi.waitFor(() => {
      // Composite score
      expect(screen.getByText('7.8')).toBeTruthy();
      // Verdict reason
      expect(screen.getByText(/Viable opportunity with strong audience demand/)).toBeTruthy();
    });
  });

  it('renders 10x Strategy section', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText('10x Strategy')).toBeTruthy();
      expect(screen.getByText(/Tax-optimized wealth building/)).toBeTruthy();
    });
  });

  it('renders suggested title', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText(/Tax-Smart Guide/)).toBeTruthy();
    });
  });

  it('renders Blue Ocean Analysis', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText('Blue Ocean Analysis')).toBeTruthy();
    });
  });

  it('renders strengths and weaknesses', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText('Strengths')).toBeTruthy();
      expect(screen.getByText('Weaknesses')).toBeTruthy();
      expect(screen.getByText('Clear explanations')).toBeTruthy();
      expect(screen.getByText('Poor pacing in middle')).toBeTruthy();
    });
  });

  it('renders Audience Demand section from comments', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText(/Audience Demand \(from Comments\)/)).toBeTruthy();
      expect(screen.getByText('Tax Optimization')).toBeTruthy();
    });
  });

  it('renders topic opportunity with suggested video title', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText(/Tax Hacks for Your 20s/)).toBeTruthy();
    });
  });

  it('renders representative comments', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText(/Please do a video on Roth/)).toBeTruthy();
    });
  });

  it('renders comment count metadata', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText(/100 comments analyzed/)).toBeTruthy();
    });
  });

  it('renders Create Project button', async () => {
    renderPage();
    await vi.waitFor(() => {
      const buttons = screen.getAllByText(/Create Project/);
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders Back to Discovery button', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText(/Back to Discovery/)).toBeTruthy();
    });
  });
});

describe('VideoAnalysis — Verdict display', () => {
  it('shows caution warning for CONDITIONAL_GO', async () => {
    renderPage();
    await vi.waitFor(() => {
      expect(screen.getByText(/Viable opportunity with strong audience demand/)).toBeTruthy();
    });
  });
});
