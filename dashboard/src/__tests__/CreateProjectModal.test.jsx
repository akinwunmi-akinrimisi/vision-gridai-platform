import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import CreateProjectModal from '../components/projects/CreateProjectModal';

let mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
let mockIsPending = false;

// Mock hooks at correct relative path from component
vi.mock('../hooks/useProjects', () => ({
  useCreateProject: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
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

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

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
  mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
  mockIsPending = false;
});

describe('CreateProjectModal (NICH-01)', () => {
  it('renders modal when open is true', () => {
    renderWithProviders(<CreateProjectModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByLabelText(/Niche Name/)).toBeInTheDocument();
    expect(screen.getByText('Start Research')).toBeInTheDocument();
  });

  it('requires niche name to be at least 3 characters', () => {
    renderWithProviders(<CreateProjectModal open={true} onOpenChange={vi.fn()} />);

    const submitBtn = screen.getByText('Start Research');
    // Button should be disabled when niche is empty (< 3 chars)
    expect(submitBtn).toBeDisabled();
  });

  it('calls useCreateProject mutation on submit', async () => {
    renderWithProviders(<CreateProjectModal open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByLabelText(/Niche Name/);
    fireEvent.change(input, { target: { value: 'US Credit Cards' } });

    const submitBtn = screen.getByText('Start Research');
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        niche: 'US Credit Cards',
        description: undefined,
        target_video_count: 25,
        reference_analyses: undefined,
      });
    });
  });

  it('shows success animation after submit', async () => {
    renderWithProviders(<CreateProjectModal open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByLabelText(/Niche Name/);
    fireEvent.change(input, { target: { value: 'US Credit Cards' } });
    fireEvent.click(screen.getByText('Start Research'));

    await waitFor(() => {
      expect(screen.getByTestId('success-state')).toBeInTheDocument();
      expect(screen.getByText('Project created!')).toBeInTheDocument();
    });
  });
});
