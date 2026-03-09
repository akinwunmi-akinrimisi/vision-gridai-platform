import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockTopic = {
  id: 'topic-active',
  topic_number: 2,
  seo_title: 'The Perfect 3-Card Wallet Strategy',
  status: 'producing',
  total_cost: 4.25,
  cost_breakdown: { script: 0.75, tts: 0.30, images: 1.60, i2v: 0.85, t2v: 0.75 },
  last_status_change: '2026-03-08T10:00:00Z',
};

const mockStageProgress = {
  audio: { completed: 172, total: 172 },
  images: { completed: 50, total: 100 },
  i2v: { completed: 10, total: 25 },
  t2v: { completed: 0, total: 72 },
  assembly: { completed: 0, total: 1 },
};

import HeroCard from '../components/production/HeroCard';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HeroCard -- Display', () => {
  it('displays active topic title and topic number', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    expect(screen.getByText(/The Perfect 3-Card Wallet/)).toBeTruthy();
    expect(screen.getByText(/#2/)).toBeTruthy();
  });

  it('shows 5 stage chips: Audio, Images, I2V, T2V, Assembly', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    expect(screen.getByTestId('stage-chip-audio')).toBeTruthy();
    expect(screen.getByTestId('stage-chip-images')).toBeTruthy();
    expect(screen.getByTestId('stage-chip-i2v')).toBeTruthy();
    expect(screen.getByTestId('stage-chip-t2v')).toBeTruthy();
    expect(screen.getByTestId('stage-chip-assembly')).toBeTruthy();
  });

  it('completed stage chip shows checkmark', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    const audioChip = screen.getByTestId('stage-chip-audio');
    expect(audioChip.querySelector('[data-testid="stage-check"]')).toBeTruthy();
  });

  it('active stage chip has pulse/glow animation class', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    const imagesChip = screen.getByTestId('stage-chip-images');
    expect(imagesChip.className).toMatch(/pulse|glow|animate/);
  });

  it('pending stage chips are dimmed', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    const assemblyChip = screen.getByTestId('stage-chip-assembly');
    expect(assemblyChip.className).toMatch(/opacity|dim|muted/);
  });
});

describe('HeroCard -- Timing & Cost', () => {
  it('shows elapsed time counter', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    expect(screen.getByTestId('elapsed-time')).toBeTruthy();
  });

  it('shows rolling-average ETA', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    expect(screen.getByTestId('eta')).toBeTruthy();
  });

  it('shows live cost counter with per-stage breakdown', () => {
    render(<HeroCard topic={mockTopic} stageProgress={mockStageProgress} />);
    expect(screen.getByTestId('cost-counter')).toBeTruthy();
    expect(screen.getByText(/\$4\.25/)).toBeTruthy();
  });
});
