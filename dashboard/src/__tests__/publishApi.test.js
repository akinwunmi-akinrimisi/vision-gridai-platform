import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock webhookCall
const mockWebhookCall = vi.fn().mockResolvedValue({ success: true, data: {} });
vi.mock('../lib/api', () => ({
  webhookCall: (...args) => mockWebhookCall(...args),
}));

import {
  approveVideo,
  rejectVideo,
  publishVideo,
  scheduleVideo,
  batchPublish,
  regenerateThumbnail,
  updateMetadata,
  retryUpload,
} from '../lib/publishApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('publishApi -- video approve/reject', () => {
  it.skip('approveVideo calls correct endpoint with action and schedule_time', async () => {
    await approveVideo('topic-1', 'publish_now', null);
    expect(mockWebhookCall).toHaveBeenCalledWith('video/approve', {
      topic_id: 'topic-1',
      action: 'publish_now',
      schedule_time: null,
    });
  });

  it.skip('rejectVideo includes rollback_stage in payload', async () => {
    await rejectVideo('topic-1', 'audio quality poor', 'assembly');
    expect(mockWebhookCall).toHaveBeenCalledWith('video/reject', {
      topic_id: 'topic-1',
      feedback: 'audio quality poor',
      rollback_stage: 'assembly',
    });
  });

  it.skip('publishVideo calls video/publish endpoint', async () => {
    await publishVideo('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('video/publish', { topic_id: 'topic-1' });
  });

  it.skip('scheduleVideo sends schedule_time', async () => {
    await scheduleVideo('topic-1', '2026-03-15T18:00:00Z');
    expect(mockWebhookCall).toHaveBeenCalledWith('video/schedule', {
      topic_id: 'topic-1',
      schedule_time: '2026-03-15T18:00:00Z',
    });
  });
});

describe('publishApi -- batch and metadata', () => {
  it.skip('batchPublish sends topic_ids array', async () => {
    await batchPublish(['topic-1', 'topic-2', 'topic-3']);
    expect(mockWebhookCall).toHaveBeenCalledWith('video/batch-publish', {
      topic_ids: ['topic-1', 'topic-2', 'topic-3'],
    });
  });

  it.skip('updateMetadata sends fields spread into payload', async () => {
    await updateMetadata('topic-1', { title: 'New Title', tags: ['tag1'] });
    expect(mockWebhookCall).toHaveBeenCalledWith('video/update-metadata', {
      topic_id: 'topic-1',
      title: 'New Title',
      tags: ['tag1'],
    });
  });

  it.skip('regenerateThumbnail sends prompt', async () => {
    await regenerateThumbnail('topic-1', 'A dramatic credit card closeup');
    expect(mockWebhookCall).toHaveBeenCalledWith('thumbnail/regenerate', {
      topic_id: 'topic-1',
      prompt: 'A dramatic credit card closeup',
    });
  });

  it.skip('retryUpload calls video/retry-upload endpoint', async () => {
    await retryUpload('topic-1');
    expect(mockWebhookCall).toHaveBeenCalledWith('video/retry-upload', { topic_id: 'topic-1' });
  });
});
