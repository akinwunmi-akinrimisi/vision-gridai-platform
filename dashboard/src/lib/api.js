const WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE || '/webhook';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

/**
 * Call an n8n webhook endpoint.
 * @param {string} endpoint - Webhook path segment (e.g., 'project/create')
 * @param {object} data - Request body payload
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function webhookCall(endpoint, data = {}) {
  try {
    const url = `${WEBHOOK_BASE}/${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(data),
    });

    const json = await response.json();
    return json;
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Convenience endpoint helpers.
 */
export const createProject = (data) => webhookCall('project/create', data);
export const generateTopics = (projectId) => webhookCall('topics/generate', { project_id: projectId });
