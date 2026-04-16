import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock webhookCall
const mockWebhookCall = vi.fn().mockResolvedValue({ success: true, data: {} });
vi.mock('../lib/api', () => ({
  webhookCall: (...args) => mockWebhookCall(...args),
}));

import {
  publishVideo,
  batchPublish,
  regenerateThumbnail,
  updateMetadata,
  retryUpload,
} from '../lib/publishApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('publishApi -- active exports', () => {
  it('publishVideo calls video/publish endpoint', async () => {
    await publishVideo('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('video/publish', { topic_id: 'topic-1' }, { timeoutMs: 60000 });
  });

  it('batchPublish sends topic_ids array', async () => {
    await batchPublish(['topic-1', 'topic-2', 'topic-3']);
    expect(mockWebhookCall).toHaveBeenCalledWith('video/batch-publish', {
      topic_ids: ['topic-1', 'topic-2', 'topic-3'],
    }, { timeoutMs: 60000 });
  });

  it('updateMetadata sends fields spread into payload', async () => {
    await updateMetadata('topic-1', { title: 'New Title', tags: ['tag1'] });
    expect(mockWebhookCall).toHaveBeenCalledWith('video/update-metadata', {
      topic_id: 'topic-1',
      title: 'New Title',
      tags: ['tag1'],
    });
  });

  it('regenerateThumbnail sends prompt', async () => {
    await regenerateThumbnail('topic-1', 'A dramatic credit card closeup');
    expect(mockWebhookCall).toHaveBeenCalledWith('thumbnail/regenerate', {
      topic_id: 'topic-1',
      prompt: 'A dramatic credit card closeup',
    });
  });

  it('retryUpload calls video/retry-upload endpoint', async () => {
    await retryUpload('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('video/retry-upload', { topic_id: 'topic-1' }, { timeoutMs: 60000 });
  });
});
