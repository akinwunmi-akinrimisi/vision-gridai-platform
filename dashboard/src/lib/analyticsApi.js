import { webhookCall } from './api';

/**
 * Analytics webhook helpers.
 */

// Trigger manual analytics refresh (same as daily cron)
export const refreshAnalytics = (projectId) =>
  webhookCall('analytics/refresh', { project_id: projectId });
