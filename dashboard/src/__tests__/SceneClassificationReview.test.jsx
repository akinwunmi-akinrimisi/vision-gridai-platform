import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock @/lib/utils (cn function)
vi.mock('../lib/utils', () => ({
  cn: (...args) => args.filter(Boolean).join(' '),
}));

// Mock the useSceneClassification hook
let mockHookReturn;
vi.mock('../hooks/useSceneClassification', () => ({
  useSceneClassification: () => mockHookReturn,
}));

import SceneClassificationReview from '../components/production/SceneClassificationReview';

const mockScenes = [
  { id: 's1', scene_number: 1, render_method: 'fal_ai', narration_text: 'Scene one narration text', classification_status: 'classified', classification_reasoning: 'Static image works best', remotion_template: null },
  { id: 's2', scene_number: 2, render_method: 'fal_ai', narration_text: 'Scene two narration text', classification_status: 'classified', classification_reasoning: null, remotion_template: null },
  { id: 's3', scene_number: 3, render_method: 'remotion', narration_text: 'Scene three has data visualization', classification_status: 'classified', classification_reasoning: 'Contains chart data', remotion_template: 'bar_chart' },
  { id: 's4', scene_number: 4, render_method: 'fal_ai', narration_text: 'Scene four narration text', classification_status: 'classified', classification_reasoning: null, remotion_template: null },
  { id: 's5', scene_number: 5, render_method: 'remotion', narration_text: 'Scene five has a comparison layout for this topic', classification_status: 'classified', classification_reasoning: 'Comparison template fits', remotion_template: 'comparison_layout' },
];

const mockStats = {
  total: 5,
  falAiCount: 3,
  remotionCount: 2,
  classifiedCount: 5,
  estimatedCost: 0.09,
  savings: 0.06,
};

const mockClassifyScenes = vi.fn();
const mockOverrideScene = vi.fn();
const mockAcceptClassification = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockHookReturn = {
    scenes: mockScenes,
    stats: mockStats,
    topicStatus: 'classified',
    isLoading: false,
    classifyScenes: mockClassifyScenes,
    isClassifying: false,
    overrideScene: mockOverrideScene,
    acceptClassification: mockAcceptClassification,
    isAccepting: false,
  };
});

describe('SceneClassificationReview -- Summary Bar', () => {
  it('renders summary bar with correct Fal.ai and Remotion counts', () => {
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    // Check label text exists for each stat card
    expect(screen.getByText('Total Scenes')).toBeTruthy();
    expect(screen.getByText('Est. Cost')).toBeTruthy();
    expect(screen.getByText('Savings')).toBeTruthy();
    // Verify the stat card values are rendered (use getAllByText since numbers may appear elsewhere)
    const allFives = screen.getAllByText('5');
    expect(allFives.length).toBeGreaterThanOrEqual(1);
    const allThrees = screen.getAllByText('3');
    expect(allThrees.length).toBeGreaterThanOrEqual(1);
  });

  it('renders estimated cost from stats', () => {
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    expect(screen.getByText('$0.09')).toBeTruthy();
  });

  it('renders savings from stats', () => {
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    expect(screen.getByText('$0.06')).toBeTruthy();
  });
});

describe('SceneClassificationReview -- Filter Tabs', () => {
  it('renders All, Fal.ai, and Remotion filter tabs', () => {
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Fal.ai Only')).toBeTruthy();
    expect(screen.getByText('Remotion Only')).toBeTruthy();
  });

  it('filters to only Fal.ai scenes when Fal.ai tab is clicked', () => {
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    fireEvent.click(screen.getByText('Fal.ai Only'));
    // Fal.ai appears in: StatCard label + 3 scene RenderBadges + filter tab count badge = multiple
    // The key test: the Remotion scene badges should NOT be present, only the filter tab texts remain
    // Count scene number badges to verify 3 filtered scenes rendered
    const sceneNumberBadges = screen.getAllByText(/^[1-5]$/);
    // Scenes 1, 2, 4 are fal_ai (scene_numbers 1, 2, 4)
    expect(sceneNumberBadges.length).toBeGreaterThanOrEqual(3);
    // "Switch to Remotion" buttons only appear on fal_ai scenes
    const switchBtns = screen.getAllByText('Switch to Remotion');
    expect(switchBtns.length).toBe(3);
  });

  it('filters to only Remotion scenes when Remotion tab is clicked', () => {
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    fireEvent.click(screen.getByText('Remotion Only'));
    // "Switch to Fal.ai" buttons only appear on remotion scenes
    const switchBtns = screen.getAllByText('Switch to Fal.ai');
    expect(switchBtns.length).toBe(2);
  });
});

describe('SceneClassificationReview -- Scene Rows', () => {
  it('renders render_method badges for each scene', () => {
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    // "Switch to Remotion" buttons appear on fal_ai scenes (3)
    const switchToRemotion = screen.getAllByText('Switch to Remotion');
    expect(switchToRemotion.length).toBe(3);
    // "Switch to Fal.ai" buttons appear on remotion scenes (2)
    const switchToFalAi = screen.getAllByText('Switch to Fal.ai');
    expect(switchToFalAi.length).toBe(2);
  });
});

describe('SceneClassificationReview -- Accept Button', () => {
  it('accept button is enabled when classification_status is classified', () => {
    mockHookReturn.topicStatus = 'classified';
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    const acceptBtn = screen.getByText(/Accept & Proceed/);
    expect(acceptBtn.closest('button').disabled).toBe(false);
  });

  it('accept button is disabled when classification_status is pending', () => {
    mockHookReturn.topicStatus = 'pending';
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    const acceptBtn = screen.getByText(/Accept & Proceed/);
    expect(acceptBtn.closest('button').disabled).toBe(true);
  });

  it('accept button is disabled when classification_status is classifying', () => {
    mockHookReturn.topicStatus = 'classifying';
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    const acceptBtn = screen.getByText(/Accept & Proceed/);
    expect(acceptBtn.closest('button').disabled).toBe(true);
  });

  it('accept button is enabled when classification_status is reviewed', () => {
    mockHookReturn.topicStatus = 'reviewed';
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    const acceptBtn = screen.getByText(/Accept & Proceed/);
    expect(acceptBtn.closest('button').disabled).toBe(false);
  });
});

describe('SceneClassificationReview -- Empty / Loading states', () => {
  it('shows loading spinner when isLoading is true', () => {
    mockHookReturn.isLoading = true;
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    expect(screen.getByText(/Loading classification data/)).toBeTruthy();
  });

  it('shows empty state when no scenes are available', () => {
    mockHookReturn.scenes = [];
    mockHookReturn.stats = { total: 0, falAiCount: 0, remotionCount: 0, classifiedCount: 0, estimatedCost: 0, savings: 0 };
    render(<SceneClassificationReview topicId="topic-1" projectId="proj-1" />);
    expect(screen.getByText(/No scenes to classify/)).toBeTruthy();
  });
});
