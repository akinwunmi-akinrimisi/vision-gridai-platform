import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock API
vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

const mockFailedScenes = [
  {
    id: 'scene-fail-1',
    scene_id: 'scene_047',
    scene_number: 47,
    chapter: 'Chapter 3: The Deep Dive',
    audio_status: 'uploaded',
    image_status: 'failed',
    video_status: 'pending',
    clip_status: 'pending',
    image_prompt: 'A detailed chart showing credit card rewards',
    narration_text: 'The numbers paint a clear picture.',
    error_log: 'Kie.ai API error: 429 Rate limit exceeded. Attempt 3/3.',
  },
  {
    id: 'scene-fail-2',
    scene_id: 'scene_102',
    scene_number: 102,
    chapter: 'Chapter 5: Resolution',
    audio_status: 'uploaded',
    image_status: 'uploaded',
    video_status: 'failed',
    clip_status: 'pending',
    image_prompt: 'Sunset over a city skyline',
    narration_text: 'And that is the key insight.',
    error_log: 'Fal.ai API error: 500 Internal server error. Attempt 3/3.',
  },
];

const mockOnRetry = vi.fn();
const mockOnSkip = vi.fn();
const mockOnEditRetry = vi.fn();
const mockOnRetryAll = vi.fn();
const mockOnSkipAll = vi.fn();

import FailedScenes from '../components/production/FailedScenes';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FailedScenes -- Scene List', () => {
  it('lists failed scenes with scene number and user-friendly error summary', () => {
    render(
      <FailedScenes
        scenes={mockFailedScenes}
        onRetry={mockOnRetry}
        onSkip={mockOnSkip}
        onEditRetry={mockOnEditRetry}
        onRetryAll={mockOnRetryAll}
        onSkipAll={mockOnSkipAll}
      />
    );
    expect(screen.getByText(/Scene 47/)).toBeTruthy();
    expect(screen.getByText(/Scene 102/)).toBeTruthy();
  });

  it('shows expandable raw error details (API name, error code, prompt text, attempt count)', () => {
    render(
      <FailedScenes
        scenes={mockFailedScenes}
        onRetry={mockOnRetry}
        onSkip={mockOnSkip}
        onEditRetry={mockOnEditRetry}
        onRetryAll={mockOnRetryAll}
        onSkipAll={mockOnSkipAll}
      />
    );
    // Error details should be expandable
    const expandBtn = screen.getAllByTestId(/expand-error/)[0];
    fireEvent.click(expandBtn);
    expect(screen.getByText(/429/)).toBeTruthy();
  });
});

describe('FailedScenes -- Per-Scene Actions', () => {
  it('per-scene Retry button calls onRetry', () => {
    render(
      <FailedScenes
        scenes={mockFailedScenes}
        onRetry={mockOnRetry}
        onSkip={mockOnSkip}
        onEditRetry={mockOnEditRetry}
        onRetryAll={mockOnRetryAll}
        onSkipAll={mockOnSkipAll}
      />
    );
    const retryBtns = screen.getAllByTestId(/retry-scene-/);
    fireEvent.click(retryBtns[0]);
    expect(mockOnRetry).toHaveBeenCalledWith('scene-fail-1');
  });

  it('per-scene Skip button calls onSkip', () => {
    render(
      <FailedScenes
        scenes={mockFailedScenes}
        onRetry={mockOnRetry}
        onSkip={mockOnSkip}
        onEditRetry={mockOnEditRetry}
        onRetryAll={mockOnRetryAll}
        onSkipAll={mockOnSkipAll}
      />
    );
    const skipBtns = screen.getAllByTestId(/skip-scene-/);
    fireEvent.click(skipBtns[0]);
    expect(mockOnSkip).toHaveBeenCalledWith('scene-fail-1');
  });

  it('"Edit & Retry" button opens image prompt textarea', () => {
    render(
      <FailedScenes
        scenes={mockFailedScenes}
        onRetry={mockOnRetry}
        onSkip={mockOnSkip}
        onEditRetry={mockOnEditRetry}
        onRetryAll={mockOnRetryAll}
        onSkipAll={mockOnSkipAll}
      />
    );
    const editBtns = screen.getAllByTestId(/edit-retry-/);
    fireEvent.click(editBtns[0]);
    expect(screen.getByTestId('edit-prompt-textarea')).toBeTruthy();
  });
});

describe('FailedScenes -- Batch Actions', () => {
  it('"Retry All Failed" batch button calls onRetryAll', () => {
    render(
      <FailedScenes
        scenes={mockFailedScenes}
        onRetry={mockOnRetry}
        onSkip={mockOnSkip}
        onEditRetry={mockOnEditRetry}
        onRetryAll={mockOnRetryAll}
        onSkipAll={mockOnSkipAll}
      />
    );
    fireEvent.click(screen.getByTestId('retry-all-failed'));
    expect(mockOnRetryAll).toHaveBeenCalled();
  });

  it('"Skip All Failed" batch button calls onSkipAll', () => {
    render(
      <FailedScenes
        scenes={mockFailedScenes}
        onRetry={mockOnRetry}
        onSkip={mockOnSkip}
        onEditRetry={mockOnEditRetry}
        onRetryAll={mockOnRetryAll}
        onSkipAll={mockOnSkipAll}
      />
    );
    fireEvent.click(screen.getByTestId('skip-all-failed'));
    expect(mockOnSkipAll).toHaveBeenCalled();
  });
});
