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

// --- Mock data ---
const mockSettings = {
  id: 'test-project-id',
  name: 'Credit Card Rewards Channel',
  niche: 'US Credit Cards',
  script_approach: '3_pass',
  images_per_video: 100,
  i2v_clips_per_video: 25,
  t2v_clips_per_video: 72,
  target_word_count: 19000,
  target_scene_count: 172,
  image_model: 'seedream/seedream-4.5-text-to-image',
  i2v_model: 'kling/v2-1-standard-image-to-video',
  t2v_model: 'kling/v2-1-standard-text-to-video',
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
  });

  describe('Configuration Tab (OPS-03)', () => {
    it('renders Production Config with editable fields', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByText('Production Config')).toBeTruthy();
      expect(screen.getByDisplayValue('100')).toBeTruthy(); // images_per_video
      expect(screen.getByDisplayValue('19000')).toBeTruthy(); // target_word_count
    });

    it('shows Save button when field is edited', () => {
      renderWithProviders(<Settings />);
      const wordCountInput = screen.getByDisplayValue('19000');
      fireEvent.change(wordCountInput, { target: { value: '20000' } });
      expect(screen.getByRole('button', { name: /save/i })).toBeTruthy();
    });

    it('renders YouTube/Drive fields with independent save', () => {
      renderWithProviders(<Settings />);
      expect(screen.getByDisplayValue('UC_test123')).toBeTruthy(); // youtube_channel_id
      expect(screen.getByDisplayValue('drive_root_123')).toBeTruthy(); // drive_root_folder_id
    });

    it('renders read-only sections without edit controls', () => {
      renderWithProviders(<Settings />);
      // API & Webhooks and Security/Appearance sections should have no edit buttons
      const apiSection = screen.getByText('API & Webhooks');
      expect(apiSection).toBeTruthy();
      const securitySection = screen.getByText('Security');
      expect(securitySection).toBeTruthy();
      const appearanceSection = screen.getByText('Appearance');
      expect(appearanceSection).toBeTruthy();
      // These sections should NOT have Save buttons within them
      const saveButtons = screen.queryAllByRole('button', { name: /save/i });
      // Without editing, no save buttons should be shown
      expect(saveButtons.length).toBe(0);
    });
  });

  describe('Prompts Tab (OPS-04)', () => {
    it('renders 7 prompt cards in 3 groups', () => {
      renderWithProviders(<Settings />);
      // Switch to Prompts tab
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      // Should show 3 groups: System & Generation, Script Passes, Evaluation & Visual
      expect(screen.getByText(/system & generation/i)).toBeTruthy();
      expect(screen.getByText(/script passes/i)).toBeTruthy();
      expect(screen.getByText(/evaluation & visual/i)).toBeTruthy();
      // Should show 7 prompt cards
      const promptCards = screen.getAllByTestId('prompt-card');
      expect(promptCards.length).toBe(7);
    });

    it('expands prompt card on click showing textarea', () => {
      renderWithProviders(<Settings />);
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      const firstCard = screen.getAllByTestId('prompt-card')[0];
      fireEvent.click(firstCard);
      expect(screen.getByRole('textbox')).toBeTruthy();
    });

    it('shows version dropdown on badge click', () => {
      renderWithProviders(<Settings />);
      fireEvent.click(screen.getByRole('tab', { name: /prompts/i }));
      // Click the version badge on the visual_director prompt (version 3)
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
