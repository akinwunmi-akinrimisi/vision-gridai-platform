import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock webhookCall
const mockWebhookCall = vi.fn().mockResolvedValue({ success: true, data: {} });
vi.mock('../lib/api', () => ({
  webhookCall: (...args) => mockWebhookCall(...args),
}));

import {
  triggerProduction,
  triggerProductionBatch,
  stopProduction,
  resumeProduction,
  restartProduction,
  retryScene,
  retryAllFailed,
  skipScene,
  skipAllFailed,
  editAndRetryScene,
  assembleVideo,
} from '../lib/productionApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('productionApi -- trigger & control', () => {
  it('triggerProduction calls webhookCall with production/trigger', async () => {
    await triggerProduction('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/trigger', { topic_id: 'topic-1' }, { timeoutMs: 60_000 });
  });

  it('triggerProductionBatch calls webhookCall with production/trigger-batch', async () => {
    await triggerProductionBatch(['topic-1', 'topic-2']);
    expect(mockWebhookCall).toHaveBeenCalledWith('production/trigger-batch', { topic_ids: ['topic-1', 'topic-2'] }, { timeoutMs: 60_000 });
  });

  it('stopProduction calls webhookCall with production/stop', async () => {
    await stopProduction('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/stop', { topic_id: 'topic-1' });
  });

  it('resumeProduction calls webhookCall with production/resume', async () => {
    await resumeProduction('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/resume', { topic_id: 'topic-1' }, { timeoutMs: 60_000 });
  });

  it('restartProduction calls webhookCall with production/restart', async () => {
    await restartProduction('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/restart', { topic_id: 'topic-1' }, { timeoutMs: 60_000 });
  });
});

describe('productionApi -- scene actions', () => {
  it('retryScene calls webhookCall with production/retry-scene', async () => {
    await retryScene('scene-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/retry-scene', { scene_id: 'scene-1' });
  });

  it('retryAllFailed calls webhookCall with production/retry-all-failed', async () => {
    await retryAllFailed('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/retry-all-failed', { topic_id: 'topic-1' }, { timeoutMs: 60_000 });
  });

  it('skipScene calls webhookCall with production/skip-scene', async () => {
    await skipScene('scene-1', 'API unavailable');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/skip-scene', { scene_id: 'scene-1', reason: 'API unavailable' });
  });

  it('skipAllFailed calls webhookCall with production/skip-all-failed', async () => {
    await skipAllFailed('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/skip-all-failed', { topic_id: 'topic-1' });
  });

  it('editAndRetryScene calls webhookCall with production/edit-retry-scene', async () => {
    await editAndRetryScene('scene-1', 'new prompt text');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/edit-retry-scene', { scene_id: 'scene-1', image_prompt: 'new prompt text' });
  });
});

describe('productionApi -- assembly', () => {
  it('assembleVideo calls webhookCall with production/assemble', async () => {
    await assembleVideo('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('production/assemble', { topic_id: 'topic-1' }, { timeoutMs: 60_000 });
  });

  it('all functions return webhook response format', async () => {
    mockWebhookCall.mockResolvedValueOnce({ success: true, data: { id: 'test' }, error: null });
    const result = await triggerProduction('topic-1');
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
  });
});
