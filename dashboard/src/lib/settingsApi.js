import { webhookCall } from './api';

/**
 * Update project settings (production config, YouTube/Drive fields).
 * @param {string} projectId - Project UUID
 * @param {object} fields - Key-value pairs to update on the projects table
 */
export const updateProjectSettings = (projectId, fields) =>
  webhookCall('project/update-settings', { project_id: projectId, ...fields });

/**
 * Update a single prompt's text (normal edit — overwrites active row).
 * @param {string} promptId - Prompt config UUID
 * @param {string} promptText - New prompt text
 */
export const updatePrompt = (promptId, promptText) =>
  webhookCall('prompts/update', { prompt_id: promptId, prompt_text: promptText });

/**
 * Revert a prompt to a previous version (creates new version preserving history).
 * @param {string} promptId - Prompt config UUID
 * @param {number} version - Version number to revert to
 */
export const revertPrompt = (promptId, version) =>
  webhookCall('prompts/revert', { prompt_id: promptId, version });

/**
 * Regenerate all prompts for a project using niche profile data.
 * Creates new versions preserving history.
 * @param {string} projectId - Project UUID
 */
export const regenerateAllPrompts = (projectId) =>
  webhookCall('prompts/regenerate', { project_id: projectId });
