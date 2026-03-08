import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import App from '../App';

// Mock supabase (needed for pages that use data hooks)
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

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('App routing', () => {
  it('renders PinGate when not authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('- - - -')).toBeInTheDocument();
  });

  it('renders sidebar and home page when authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />);
    // Sidebar renders in both mobile drawer and desktop - multiple matches expected
    expect(screen.getAllByText('Vision GridAI').length).toBeGreaterThanOrEqual(1);
    // Page heading
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('renders ProjectDashboard at /project/:id', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />, {
      initialEntries: ['/project/test-id'],
    });
    expect(screen.getByRole('heading', { name: 'Project Dashboard' })).toBeInTheDocument();
  });

  it('renders TopicReview at /project/:id/topics', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />, {
      initialEntries: ['/project/test-id/topics'],
    });
    expect(screen.getByRole('heading', { name: 'Topic Review' })).toBeInTheDocument();
  });

  it('renders ScriptReview at /project/:id/topics/:topicId/script', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = renderWithProviders(<App />, {
      initialEntries: ['/project/test-id/topics/topic-1/script'],
    });
    // ScriptReview renders -- it shows loading skeleton or content
    // The animate-in class is used by ScriptReview's outer div
    expect(container.querySelector('.animate-in')).toBeInTheDocument();
  });

  it('renders ProductionMonitor at /project/:id/production', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />, {
      initialEntries: ['/project/test-id/production'],
    });
    expect(screen.getByRole('heading', { name: 'Production Monitor' })).toBeInTheDocument();
  });

  it('renders Analytics at /project/:id/analytics', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />, {
      initialEntries: ['/project/test-id/analytics'],
    });
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
  });

  it('renders Settings at /project/:id/settings', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />, {
      initialEntries: ['/project/test-id/settings'],
    });
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });
});
