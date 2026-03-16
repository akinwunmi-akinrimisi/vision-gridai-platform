import { webhookCall } from './api';

/**
 * Publish & video review webhook helpers.
 * Each delegates to webhookCall with the correct endpoint and payload.
 *
 * Note: Publish/upload webhooks respond quickly (202 accepted) and run
 * the actual YouTube upload asynchronously in n8n. Dashboard monitors
 * progress via Supabase Realtime on the topics table.
 */

// Gate 3: Approve video with action type
export const approveVideo = (topicId, action, scheduleTime) =>
  webhookCall('video/approve', { topic_id: topicId, action, schedule_time: scheduleTime }, { timeoutMs: 60_000 });

// Gate 3: Reject video with feedback and rollback stage
export const rejectVideo = (topicId, feedback, rollbackStage) =>
  webhookCall('video/reject', { topic_id: topicId, feedback, rollback_stage: rollbackStage });

// Direct publish (after approve_only)
export const publishVideo = (topicId) =>
  webhookCall('video/publish', { topic_id: topicId }, { timeoutMs: 60_000 });

// Schedule for later
export const scheduleVideo = (topicId, scheduleTime) =>
  webhookCall('video/schedule', { topic_id: topicId, schedule_time: scheduleTime });

// Batch publish multiple approved videos
export const batchPublish = (topicIds) =>
  webhookCall('video/batch-publish', { topic_ids: topicIds }, { timeoutMs: 60_000 });

// Regenerate thumbnail with new prompt
export const regenerateThumbnail = (topicId, prompt) =>
  webhookCall('thumbnail/regenerate', { topic_id: topicId, prompt });

// Update video metadata (title, description, tags, etc.)
export const updateMetadata = (topicId, fields) =>
  webhookCall('video/update-metadata', { topic_id: topicId, ...fields });

// Retry a failed upload
export const retryUpload = (topicId) =>
  webhookCall('video/retry-upload', { topic_id: topicId }, { timeoutMs: 60_000 });
