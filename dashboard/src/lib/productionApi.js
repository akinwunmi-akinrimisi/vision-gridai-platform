import { webhookCall } from './api';

/**
 * Production webhook helpers.
 * Each delegates to webhookCall with the correct endpoint and payload.
 */

// Trigger & control
export const triggerProduction = (topicId) => webhookCall('production/trigger', { topic_id: topicId });
export const triggerProductionBatch = (topicIds) => webhookCall('production/trigger-batch', { topic_ids: topicIds });
export const stopProduction = (topicId) => webhookCall('production/stop', { topic_id: topicId });
export const resumeProduction = (topicId) => webhookCall('production/resume', { topic_id: topicId });
export const restartProduction = (topicId) => webhookCall('production/restart', { topic_id: topicId });

// Scene actions
export const retryScene = (sceneId) => webhookCall('production/retry-scene', { scene_id: sceneId });
export const retryAllFailed = (topicId) => webhookCall('production/retry-all-failed', { topic_id: topicId });
export const skipScene = (sceneId, reason) => webhookCall('production/skip-scene', { scene_id: sceneId, reason });
export const skipAllFailed = (topicId) => webhookCall('production/skip-all-failed', { topic_id: topicId });
export const editAndRetryScene = (sceneId, imagePrompt) => webhookCall('production/edit-retry-scene', { scene_id: sceneId, image_prompt: imagePrompt });

// Assembly
export const assembleVideo = (topicId) => webhookCall('production/assemble', { topic_id: topicId });
