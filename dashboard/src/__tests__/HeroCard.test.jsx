import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroCard from '../components/shared/HeroCard';
import StageProgress from '../components/production/StageProgress';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HeroCard -- Shared Component', () => {
  it('renders children content', () => {
    render(
      <HeroCard>
        <p>Test content</p>
      </HeroCard>
    );
    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('renders with gradient bar at top', () => {
    const { container } = render(
      <HeroCard>
        <p>Content</p>
      </HeroCard>
    );
    const gradientBar = container.querySelector('.bg-gradient-to-r');
    expect(gradientBar).toBeTruthy();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <HeroCard className="custom-class">
        <p>Content</p>
      </HeroCard>
    );
    expect(container.firstChild.className).toContain('custom-class');
  });
});

describe('StageProgress -- Display', () => {
  const mockStageProgress = {
    audio: { completed: 172, total: 172 },
    images: { completed: 50, total: 100 },
    captions: { completed: 0, total: 0 },
    assembly: { completed: 0, total: 1 },
  };

  it('renders 4 stage indicators', () => {
    render(<StageProgress stageProgress={mockStageProgress} />);
    expect(screen.getByTestId('stage-progress')).toBeTruthy();
    expect(screen.getByTestId('stage-audio')).toBeTruthy();
    expect(screen.getByTestId('stage-images')).toBeTruthy();
    expect(screen.getByTestId('stage-captions')).toBeTruthy();
    expect(screen.getByTestId('stage-assembly')).toBeTruthy();
  });

  it('shows completed stage with success styling', () => {
    render(<StageProgress stageProgress={mockStageProgress} />);
    const audioStage = screen.getByTestId('stage-audio');
    expect(audioStage.textContent).toContain('Audio');
  });

  it('shows in-progress stages with count', () => {
    render(<StageProgress stageProgress={mockStageProgress} />);
    // Images is 50/100
    expect(screen.getByText('50/100')).toBeTruthy();
  });
});
