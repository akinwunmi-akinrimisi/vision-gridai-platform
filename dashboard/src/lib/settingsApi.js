/**
 * API helpers for Settings page webhook calls.
 * Stub — will be implemented in Phase 06 Plan 01.
 */
import { webhookCall } from './api';

export function updateProjectSettings(projectId, fields) {
  return webhookCall('settings/update', { project_id: projectId, ...fields });
}

export function updatePrompt(promptId, promptText) {
  return webhookCall('settings/prompt/update', { prompt_id: promptId, prompt_text: promptText });
}

export function revertPrompt(promptId, version) {
  return webhookCall('settings/prompt/revert', { prompt_id: promptId, version });
}

export function regenerateAllPrompts(projectId) {
  return webhookCall('settings/prompts/regenerate', { project_id: projectId });
}
