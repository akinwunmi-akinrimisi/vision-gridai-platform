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

// --- Mock data ---
const mockSettings = {
  script_approach: '3_pass',
  images_per_video: 100,
  i2v_clips_per_video: 25,
  t2v_clips_per_video: 72,
  target_word_count: 19000,
  target_scene_count: 172,
  image_model: 'fal-ai/bytedance/seedream/v4/text-to-image',
  i2v_model: 'fal-ai/wan-25-preview/image-to-video',
  t2v_model: 'fal-ai/wan-25-preview/text-to-video',
  youtube_channel_id: 'UC_test123',
  youtube_playlist1_id: 'PL_test1',
  youtube_playlist2_id: 'PL_test2',
  youtube_playlist3_id: 'PL_test3',
  drive_root_folder_id: 'drive_root_123',
  drive_assets_folder_id: 'drive_assets_456',
};

const mockPrompts = [
  { id: 'p1', prompt_type: 'system_prompt', prompt_text: 'You are a credit card expert...', version: 2, is_active: true },
  { id: 'p2', prompt_type: 'topic_generator', prompt_text: 'Generate 25 topics...', version: 1, is_active: true },
  { id: 'p3', prompt_type: 'script_pass1', prompt_text: 'Write Foundation pass...', version: 1, is_active: true },
  { id: 'p4', prompt_type: 'script_pass2', prompt_text: 'Write Depth pass...', version: 1, is_active: true },
  { id: 'p5', prompt_type: 'script_pass3', prompt_text: 'Write Resolution pass...', version: 1, is_active: true },
  { id: 'p6', prompt_type: 'evaluator', prompt_text: 'Score the script on 7 dimensions...', version: 1, is_active: true },
  { id: 'p7', prompt_type: 'visual_director', prompt_text: 'Assign visual types to each scene...', version: 3, is_active: true },
];

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
  mockUseProjectSettingsReturn = { data: mockSettings, isLoading: false, error: null };
  mockUseUpdateSettingsReturn = { mutate: mockMutate, isPending: false, isSuccess: false, error: null };
  mockUsePromptConfigsReturn = { data: mockPrompts, isLoading: false, error: null };
  mockUsePromptMutationsReturn = {
    updatePrompt: { mutate: vi.fn(), isPending: false },
    revertPrompt: { mutate: vi.fn(), isPending: false },
    regenerateAll: { mutate: vi.fn(), isPending: false },
  };
});

describe('Settings Page', () => {
  describe('Tab Navigation', () => {
    it('renders Configuration and Prompts tabs', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByRole('tab', { name: /configuration/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /prompts/i })).toBeTruthy();
    });

    it('shows Configuration tab content by default', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByTestId('config-tab')).toBeTruthy();
    });

    it('switches to Prompts tab on click', () => {
      renderWithProviders(<Settings />);
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      expect(screen.getByTestId('prompts-tab')).toBeTruthy();
    });
  });

  describe('Configuration Tab (OPS-03)', () => {
    it('renders all 5 sections', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByText('Production Config')).toBeTruthy();
      expect(screen.getByText(/YouTube/)).toBeTruthy();
      expect(screen.getByText('API & Webhooks')).toBeTruthy();
      expect(screen.getByText('Security')).toBeTruthy();
      expect(screen.getByText('Appearance')).toBeTruthy();
    });

    it('shows production config values in display mode', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByText('3-Pass')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('19000')).toBeTruthy();
    });

    it('shows Edit buttons only for editable sections (Production Config + YouTube)', () => {
      renderWithProviders(<Settings />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(2);
    });

    it('enters edit mode for Production Config on Edit click and shows Save/Cancel', () => {
      renderWithProviders(<Settings />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]); // Production Config
      expect(screen.getByRole('button', { name: /save/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
    });

    it('shows input fields in edit mode with current values', () => {
      renderWithProviders(<Settings />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      expect(screen.getByDisplayValue('19000')).toBeTruthy();
      expect(screen.getByDisplayValue('100')).toBeTruthy();
    });

    it('calls mutate on Save with edited fields', () => {
      renderWithProviders(<Settings />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      const wordCountInput = screen.getByDisplayValue('19000');
      fireEvent.change(wordCountInput, { target: { value: '20000' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      const callArg = mockMutate.mock.calls[0][0];
      expect(callArg.target_word_count).toBe(20000);
    });

    it('reverts to display mode on Cancel', () => {
      renderWithProviders(<Settings />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      // Edit button should reappear
      expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThanOrEqual(2);
    });

    it('read-only sections do not have opacity-60', () => {
      renderWithProviders(<Settings />);
      const apiSection = screen.getByText('API & Webhooks').closest('.glass-card');
      if (apiSection) {
        expect(apiSection.className).not.toContain('opacity-60');
      }
    });

    it('YouTube section saves independently from Production Config', () => {
      renderWithProviders(<Settings />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[1]); // YouTube edit
      const channelInput = screen.getByDisplayValue('UC_test123');
      fireEvent.change(channelInput, { target: { value: 'UC_new_channel' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      const callArg = mockMutate.mock.calls[0][0];
      expect(callArg.youtube_channel_id).toBe('UC_new_channel');
      expect(callArg.script_approach).toBeUndefined();
    });
  });

  describe('Prompts Tab (OPS-04)', () => {
    it('renders 7 prompt cards in 3 groups', () => {
      renderWithProviders(<Settings />);
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      expect(screen.getByText(/core/i)).toBeTruthy();
      expect(screen.getByText(/script pipeline/i)).toBeTruthy();
      expect(screen.getByText(/evaluation/i)).toBeTruthy();
      const promptCards = screen.getAllByTestId('prompt-card');
      expect(promptCards.length).toBe(7);
    });

    it('expands prompt card on click showing textarea', () => {
      renderWithProviders(<Settings />);
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      const firstCard = screen.getAllByTestId('prompt-card')[0];
      fireEvent.click(firstCard.querySelector('[data-testid="prompt-card-header"]'));
      expect(screen.getByRole('textbox')).toBeTruthy();
    });

    it('shows version dropdown on badge click', () => {
      renderWithProviders(<Settings />);
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      const versionBadges = screen.getAllByTestId('version-badge');
      fireEvent.click(versionBadges[versionBadges.length - 1]);
      expect(screen.getByTestId('version-dropdown')).toBeTruthy();
    });

    it('shows ConfirmDialog on Regenerate All click', () => {
      renderWithProviders(<Settings />);
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      const regenButton = screen.getByRole('button', { name: /regenerate all/i });
      fireEvent.click(regenButton);
      expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
    });
  });
});
