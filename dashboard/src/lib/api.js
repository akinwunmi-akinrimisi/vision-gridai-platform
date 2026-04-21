const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Call an n8n webhook endpoint.
 * Auth is injected server-side by nginx — no token in the client bundle.
 * @param {string} endpoint - Webhook path segment (e.g., 'project/create')
 * @param {object} data - Request body payload
 * @param {object} [options]
 * @param {number} [options.timeoutMs] - Timeout in milliseconds (default 30s)
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function webhookCall(endpoint, data = {}, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `/webhook/${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}: ${text || response.statusText}`,
      };
    }

    const json = await response.json();
    return json;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { success: false, data: null, error: `Request timed out after ${timeoutMs / 1000}s` };
    }
    return { success: false, data: null, error: err.message };
  }
}

export const generateTopics = (projectId) => webhookCall('topics/generate', { project_id: projectId });

/**
 * Authenticated read from the `WF_DASHBOARD_READ` workflow.
 * Backs every dashboard query after RLS lockdown (migration 030): the anon
 * Supabase key is now denied, so reads go through this one webhook. n8n
 * uses service_role server-side; the client never holds a DB key.
 *
 * @param {('projects_list'|'topics_for_project'|'topic_detail'|'analytics_summary'|'scene_progress')} query
 * @param {object} [params]
 * @returns {Promise<any>} The webhook's `data` payload, or throws on failure.
 */
export async function dashboardRead(query, params = {}) {
  const resp = await webhookCall('dashboard/read', { query, params });
  if (!resp || resp.success === false) {
    throw new Error(resp?.error || 'dashboard read failed');
  }
  return resp.data;
}
