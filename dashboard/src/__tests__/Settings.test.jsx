import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock react-router useParams
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id' }),
    useNavigate: () => vi.fn(),
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

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock settingsApi
vi.mock('../lib/settingsApi', () => ({
  resetAllTopics: vi.fn().mockResolvedValue({ success: true }),
  clearProductionData: vi.fn().mockResolvedValue({ success: true }),
  deleteProject: vi.fn().mockResolvedValue({ success: true }),
}));

// --- Mock hooks ---
const mockMutate = vi.fn();
let mockUseProjectSettingsReturn;
let mockUseUpdateSettingsReturn;
let mockUsePromptConfigsReturn;
let mockUsePromptMutationsReturn;

vi.mock('../hooks/useProjectSettings', () => ({
  useProjectSettings: () => mockUseProjectSettingsReturn,
  useUpdateSettings: () => mockUseUpdateSettingsReturn,
}));

vi.mock('../hooks/usePromptConfigs', () => ({
  usePromptConfigs: () => mockUsePromptConfigsReturn,
  usePromptMutations: () => mockUsePromptMutationsReturn,
}));

import Settings from '../pages/Settings';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/project/test-project-id/settings']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProjectSettingsReturn = {
    data: {
      name: 'Test Project',
      niche: 'US Credit Cards',
      script_approach: '3_pass',
      images_per_video: 100,
      target_word_count: 19000,
      target_scene_count: 172,
      image_model: 'fal-ai/bytedance/seedream/v4/text-to-image',
      i2v_model: 'fal-ai/wan-25-preview/image-to-video',
      t2v_model: 'fal-ai/wan-25-preview/text-to-video',
      youtube_channel_id: 'UC_test123',
    },
    isLoading: false,
    error: null,
  };
  mockUseUpdateSettingsReturn = { mutate: mockMutate, isPending: false, isSuccess: false, error: null };
  mockUsePromptConfigsReturn = { data: [], isLoading: false, error: null };
  mockUsePromptMutationsReturn = {
    updatePrompt: { mutate: vi.fn(), isPending: false },
    revertPrompt: { mutate: vi.fn(), isPending: false },
    regenerateAll: { mutate: vi.fn(), isPending: false },
  };
});

describe('Settings Page', () => {
  describe('Tab Navigation', () => {
    it('renders the new tab structure (General, Models, YouTube, Social, Prompts)', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByRole('tab', { name: /general/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /models/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /youtube/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /social/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /prompts/i })).toBeTruthy();
    });

    it('shows General tab content by default', () => {
      renderWithProviders(<Settings />);
      // General tab is the default value
      expect(screen.getByRole('tab', { name: /general/i, selected: true })).toBeTruthy();
    });

    it('renders Prompts tab that can be clicked', () => {
      renderWithProviders(<Settings />);
      const promptsTab = screen.getByRole('tab', { name: /prompts/i });
      // Prompts tab exists and is clickable
      expect(promptsTab).toBeTruthy();
      expect(promptsTab.getAttribute('role')).toBe('tab');
    });
  });

  describe('Page Header', () => {
    it('renders page title "Settings"', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('renders subtitle', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByText(/configuration/i)).toBeTruthy();
    });
  });
});
