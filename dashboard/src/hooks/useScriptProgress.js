import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Track real-time script generation progress for a single topic.
 *
 * Reads `production_logs` (plural — that's where WF_SCRIPT_PASS writes,
 * distinct from the legacy `production_log` table the older dashboard
 * features use). Polls every 3 seconds while a pass is in flight, otherwise
 * stays idle.
 *
 * The 3-pass script pipeline emits these events per topic:
 *   - script_pass_1 / started   (added 2026-04-29 via WF_SCRIPT_PASS patch)
 *   - script_pass_1 / pass | force_pass | fail   (existing, fires post-eval)
 *   - script_pass_2 / started ... fail
 *   - script_pass_3 / started ... fail
 *
 * Combined with topic.script_review_status, that's enough to drive a
 * 7-step stepper (Pass 1 in/out, Pass 2 in/out, Pass 3 in/out, Reviewable).
 *
 * @param {string|null} topicId
 * @param {{ active?: boolean }} [opts] active=true → 3s polling.
 * @returns {{ events, currentStage, isLoading, error }}
 */
export function useScriptProgress(topicId, { active = false } = {}) {
  const enabled = !!topicId && !String(topicId).startsWith('temp-');

  const query = useQuery({
    queryKey: ['script-progress', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_logs')
        .select('id, stage, action, status, metadata, created_at')
        .eq('topic_id', topicId)
        .like('stage', 'script_pass_%')
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled,
    refetchInterval: active ? 3_000 : false,
    retry: 1,
  });

  const events = query.data || [];
  const currentStage = deriveCurrentStage(events);

  return {
    events,
    currentStage,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Map a flat event list to the most recent stage descriptor:
 *   { pass: 1|2|3, phase: 'running'|'evaluating'|'done'|'failed' }
 *
 * Latest 'started' event without a corresponding terminal event = running.
 * Latest 'pass' / 'force_pass' on the same pass = done for that pass.
 * 'fail' = failed.
 */
function deriveCurrentStage(events) {
  if (!events.length) return null;
  // Walk in reverse to find the latest meaningful event.
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    const passMatch = ev.stage.match(/^script_pass_(\d)$/);
    if (!passMatch) continue;
    const pass = Number(passMatch[1]);
    const action = (ev.action || '').toLowerCase();
    if (action === 'started') return { pass, phase: 'running', at: ev.created_at };
    if (action === 'pass' || action === 'force_pass') {
      return { pass, phase: 'done', at: ev.created_at };
    }
    if (action === 'fail') return { pass, phase: 'failed', at: ev.created_at };
  }
  return null;
}
