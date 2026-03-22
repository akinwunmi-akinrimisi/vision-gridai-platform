import { webhookCall } from './api';
import { supabase } from './supabase';

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

/**
 * Test a prompt with sample input via n8n webhook.
 * @param {string} promptId - Prompt config UUID
 * @param {string} testInput - Sample input text
 * @returns {Promise<object>}
 */
export const testPrompt = (promptId, testInput) =>
  webhookCall('prompt/test', { prompt_id: promptId, test_input: testInput }, { timeoutMs: 60_000 });

/**
 * Reset all topics and dependent data for a project.
 * Deletes in FK order: production_log, scenes, shorts, avatars, topics.
 * @param {string} projectId - Project UUID
 */
export async function resetAllTopics(projectId) {
  // Delete in FK order
  const tables = ['production_log', 'scenes', 'shorts', 'avatars', 'topics'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('project_id', projectId);
    if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
  return { success: true };
}

/**
 * Clear production data while keeping topics intact.
 * Deletes scenes/shorts/logs, resets topic progress fields.
 * @param {string} projectId - Project UUID
 */
export async function clearProductionData(projectId) {
  const deleteTables = ['production_log', 'scenes', 'shorts'];
  for (const table of deleteTables) {
    const { error } = await supabase.from(table).delete().eq('project_id', projectId);
    if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
  // Reset topic progress fields
  const { error: topicErr } = await supabase
    .from('topics')
    .update({
      status: 'pending',
      audio_progress: 'pending',
      images_progress: 'pending',
      i2v_progress: 'pending',
      t2v_progress: 'pending',
      assembly_status: 'pending',
      script_json: null,
      script_metadata: null,
      word_count: null,
      scene_count: null,
      script_attempts: 0,
      script_quality_score: null,
      script_evaluation: null,
      script_pass_scores: null,
      script_review_status: 'pending',
      total_cost: null,
      cost_breakdown: null,
      error_log: null,
    })
    .eq('project_id', projectId);
  if (topicErr) throw new Error(`Failed to reset topics: ${topicErr.message}`);
  return { success: true };
}

/**
 * Delete a project and all associated data.
 * @param {string} projectId - Project UUID
 */
export async function deleteProject(projectId) {
  await resetAllTopics(projectId);
  const cleanupTables = ['prompt_configs', 'niche_profiles', 'social_accounts'];
  for (const table of cleanupTables) {
    const { error } = await supabase.from(table).delete().eq('project_id', projectId);
    if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
  const { error: projErr } = await supabase.from('projects').delete().eq('id', projectId);
  if (projErr) throw new Error(`Failed to delete project: ${projErr.message}`);
  return { success: true };
}
