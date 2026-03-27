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

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

// Mock settingsApi
vi.mock('../lib/settingsApi', () => ({
  resetAllTopics: vi.fn(),
  clearProductionData: vi.fn(),
  deleteProject: vi.fn(),
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
    // PinGate renders "Vision GridAI" title and PIN input
    expect(screen.getByText('Vision GridAI')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('- - - -')).toBeInTheDocument();
  });

  it('does not render PinGate when authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />);
    // When authenticated, should NOT see the PinGate
    expect(screen.queryByText('Enter your PIN to continue')).not.toBeInTheDocument();
    expect(screen.queryByText('Unlock Dashboard')).not.toBeInTheDocument();
  });

  it('does not render PinGate PIN input when authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />);
    expect(screen.queryByPlaceholderText('- - - -')).not.toBeInTheDocument();
  });

  it('renders PinGate with unlock button when not authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<App />);
    expect(screen.getByText('Unlock Dashboard')).toBeInTheDocument();
  });
});
