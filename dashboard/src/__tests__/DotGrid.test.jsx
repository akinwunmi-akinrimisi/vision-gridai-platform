import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock scenes with different statuses per chapter
const makeScene = (overrides) => ({
  id: `s-${overrides.scene_number}`,
  scene_id: `scene_${String(overrides.scene_number).padStart(3, '0')}`,
  scene_number: overrides.scene_number,
  chapter: overrides.chapter || 'Chapter 1: Introduction',
  audio_status: 'pending',
  image_status: 'pending',
  video_status: 'pending',
  clip_status: 'pending',
  narration_text: 'Test narration',
  audio_duration_ms: 5000,
  start_time_ms: 0,
  end_time_ms: 5000,
  skipped: false,
  image_prompt: 'test prompt',
  ...overrides,
});

const pendingScene = makeScene({ scene_number: 1, chapter: 'Chapter 1: Hook' });
const audioCompleteScene = makeScene({ scene_number: 2, chapter: 'Chapter 1: Hook', audio_status: 'uploaded' });
const imageCompleteScene = makeScene({ scene_number: 3, chapter: 'Chapter 1: Hook', audio_status: 'uploaded', image_status: 'uploaded' });
const videoCompleteScene = makeScene({ scene_number: 4, chapter: 'Chapter 2: Deep Dive', audio_status: 'uploaded', image_status: 'uploaded', video_status: 'uploaded' });
const fullyCompleteScene = makeScene({ scene_number: 5, chapter: 'Chapter 2: Deep Dive', audio_status: 'uploaded', image_status: 'uploaded', video_status: 'uploaded', clip_status: 'complete' });
const failedScene = makeScene({ scene_number: 6, chapter: 'Chapter 2: Deep Dive', audio_status: 'uploaded', image_status: 'failed' });

const allScenes = [pendingScene, audioCompleteScene, imageCompleteScene, videoCompleteScene, fullyCompleteScene, failedScene];

import DotGrid from '../components/production/DotGrid';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DotGrid -- Chapter Grouping', () => {
  it('groups scenes by chapter with chapter name labels', () => {
    render(<DotGrid scenes={allScenes} />);
    expect(screen.getByText('Chapter 1: Hook')).toBeTruthy();
    expect(screen.getByText('Chapter 2: Deep Dive')).toBeTruthy();
  });
});

describe('DotGrid -- Dot Colors', () => {
  it('colors dot with muted bg for pending scenes (all statuses pending)', () => {
    render(<DotGrid scenes={[pendingScene]} />);
    const dot = screen.getByTestId('dot-1');
    expect(dot.className).toMatch(/bg-muted/);
  });

  it('colors dot with warning bg for audio-complete scenes (audio_status=uploaded)', () => {
    render(<DotGrid scenes={[audioCompleteScene]} />);
    const dot = screen.getByTestId('dot-2');
    expect(dot.className).toMatch(/bg-warning/);
  });

  it('colors dot with primary bg for image-complete scenes (image_status=uploaded)', () => {
    render(<DotGrid scenes={[imageCompleteScene]} />);
    const dot = screen.getByTestId('dot-3');
    expect(dot.className).toMatch(/bg-primary/);
  });

  it('colors dot with info bg for video-complete scenes (video_status=uploaded)', () => {
    render(<DotGrid scenes={[videoCompleteScene]} />);
    const dot = screen.getByTestId('dot-4');
    expect(dot.className).toMatch(/bg-info/);
  });

  it('colors dot with success bg for fully complete scenes (clip_status=complete)', () => {
    render(<DotGrid scenes={[fullyCompleteScene]} />);
    const dot = screen.getByTestId('dot-5');
    expect(dot.className).toMatch(/bg-success/);
  });

  it('colors dot with danger bg for failed scenes', () => {
    render(<DotGrid scenes={[failedScene]} />);
    const dot = screen.getByTestId('dot-6');
    expect(dot.className).toMatch(/bg-danger/);
  });
});

describe('DotGrid -- Tooltip', () => {
  it('shows tooltip on hover with scene number, chapter, and per-asset status breakdown', () => {
    render(<DotGrid scenes={[audioCompleteScene]} />);
    const dot = screen.getByTestId('dot-2');
    fireEvent.mouseEnter(dot);
    expect(screen.getByTestId('dot-tooltip')).toBeTruthy();
    expect(screen.getByText(/Scene 2/)).toBeTruthy();
    expect(screen.getByText(/Chapter 1/)).toBeTruthy();
  });
});
