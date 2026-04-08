import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      insert: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ message: 'started' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import YouTubeDiscovery from '../pages/YouTubeDiscovery';

function renderPage(initialEntries = ['/youtube-discovery']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <YouTubeDiscovery />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('YouTubeDiscovery Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header', () => {
    renderPage();
    expect(screen.getByText('Niche Research')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    renderPage();
    expect(screen.getByText(/top-performing long-form videos/i)).toBeTruthy();
  });

  it('renders time range selector', () => {
    renderPage();
    const select = screen.getByDisplayValue('1 year');
    expect(select).toBeTruthy();
  });

  it('renders Discover Videos button', () => {
    renderPage();
    expect(screen.getByText('Discover Videos')).toBeTruthy();
  });

  it('renders empty state when no runs', async () => {
    renderPage();
    // Wait for loading to finish
    await vi.waitFor(() => {
      expect(screen.getByText(/No discovery runs yet/i)).toBeTruthy();
    });
  });

  it('has all time range options', () => {
    renderPage();
    const select = screen.getByDisplayValue('1 year');
    const options = select.querySelectorAll('option');
    const values = [...options].map((o) => o.value);
    expect(values).toContain('7d');
    expect(values).toContain('30d');
    expect(values).toContain('90d');
    expect(values).toContain('1y');
    expect(values).toContain('2y');
    expect(values).toContain('5y');
  });

  it('Discover Videos button is not disabled by default', () => {
    renderPage();
    const btn = screen.getByText('Discover Videos').closest('button');
    expect(btn.disabled).toBe(false);
  });
});
