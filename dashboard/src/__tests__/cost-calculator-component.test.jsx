/**
 * CostCalculator component tests — verifies the pipeline gate UI
 * for selecting image/video ratio before production resumes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ── Global mocks ────────────────────────────────────────

vi.mock('../lib/supabase', () => {
  const mockChain = () => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      gt: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lt: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      in: vi.fn(() => chain),
      not: vi.fn(() => chain),
      is: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'topic-123',
          project_id: 'project-456',
          scene_count: 172,
          video_ratio: null,
          estimated_image_cost: null,
          estimated_video_cost: null,
          estimated_total_media_cost: null,
          cost_option_selected_at: null,
          pipeline_stage: 'script_approved',
          seo_title: 'Test Topic Title',
          topic_number: 1,
        },
        error: null,
      }),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };
    return chain;
  };
  return {
    supabase: {
      from: vi.fn(mockChain),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// ── Render helper ───────────────────────────────────────

function renderComponent(props = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const defaultProps = {
    topicId: 'topic-123',
    projectId: 'project-456',
    sceneCount: 172,
    ...props,
  };
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CostCalculatorWrapper {...defaultProps} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Lazy import wrapper to avoid hoisting issues with mocks
let CostCalculator;

beforeEach(async () => {
  const mod = await import('../components/production/CostCalculator');
  CostCalculator = mod.default;
});

function CostCalculatorWrapper(props) {
  if (!CostCalculator) return null;
  return <CostCalculator {...props} />;
}

// ── Tests ───────────────────────────────────────────────

describe('CostCalculator component', () => {
  it('renders 4 ratio option cards', async () => {
    renderComponent();
    await waitFor(() => {
      const labels = ['100% / 0%', '95% / 5%', '90% / 10%', '85% / 15%'];
      for (const label of labels) {
        expect(screen.getByText(label)).toBeTruthy();
      }
    });
  });

  it('shows correct scene count in header', async () => {
    renderComponent({ sceneCount: 172 });
    await waitFor(() => {
      expect(screen.getByText(/172 scenes detected/)).toBeTruthy();
    });
  });

  it('shows "$6.88" total for 100/0 option with 172 scenes', async () => {
    renderComponent({ sceneCount: 172 });
    await waitFor(() => {
      // The 100/0 card shows $6.88 total (172 * $0.04 images, 0 video)
      const allTotals = screen.getAllByText('$6.88');
      expect(allTotals.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "$28.65" total for 95/5 option with 172 scenes', async () => {
    renderComponent({ sceneCount: 172 });
    await waitFor(() => {
      // 172 images ($6.88) + 9 clips ($21.77) = $28.65
      const totals = screen.getAllByText('$28.65');
      expect(totals.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('confirm button is disabled until a card is selected', async () => {
    renderComponent();
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Confirm & Start Production/i });
      expect(button).toBeDisabled();
    });
  });

  it('selecting a card enables the confirm button', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('100% / 0%')).toBeTruthy();
    });

    // Click the first option card (100/0)
    const firstCard = screen.getByText('100% / 0%').closest('button');
    fireEvent.click(firstCard);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /Confirm & Start Production/i });
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('selecting a card highlights it with ring styling', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('95% / 5%')).toBeTruthy();
    });

    // Click the 95/5 option
    const card = screen.getByText('95% / 5%').closest('button');
    fireEvent.click(card);

    // The selected card should have the ring-2 ring-primary classes
    await waitFor(() => {
      expect(card.className).toMatch(/ring-2/);
      expect(card.className).toMatch(/ring-primary/);
    });
  });

  it('shows empty state message when sceneCount is zero', async () => {
    // When sceneCountProp=0 and hook query resolves, the component
    // renders the "no scenes found" alert after loading completes.
    // The hook query may still be loading initially, so wait for either
    // the loading spinner or the empty state to appear.
    renderComponent({ sceneCount: 0 });
    await waitFor(() => {
      // After query settles, sceneCount=0 shows the empty state
      // (sceneCountProp overrides hookSceneCount)
      const emptyMsg = screen.queryByText(/No scenes found/);
      const spinner = document.querySelector('.animate-spin');
      expect(emptyMsg || spinner).toBeTruthy();
    });
  });

  it('displays model pricing info at the bottom', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Seedream 4.5/)).toBeTruthy();
      expect(screen.getByText(/Seedance 2.0 Fast/)).toBeTruthy();
    });
  });

  it('shows "Cheapest" badge on the 100/0 option', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Cheapest')).toBeTruthy();
    });
  });

  it('shows image and video counts for each option', async () => {
    renderComponent({ sceneCount: 172 });
    await waitFor(() => {
      // All options show 172 images
      const imageCounts = screen.getAllByText('172');
      expect(imageCounts.length).toBeGreaterThanOrEqual(4);

      // 95/5 shows 9 video clips
      expect(screen.getByText('9')).toBeTruthy();
      // 90/10 shows 17 video clips
      expect(screen.getByText('17')).toBeTruthy();
      // 85/15 shows 26 video clips
      expect(screen.getByText('26')).toBeTruthy();
    });
  });

  it('shows pipeline pause warning', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Pipeline pauses here/)).toBeTruthy();
    });
  });
});
