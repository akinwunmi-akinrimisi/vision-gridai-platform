import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/* ============================================================== */
/*  QUERIES — coach_sessions                                       */
/* ============================================================== */

/**
 * Fetch all coach sessions for a project (active + archived).
 * Ordered by last_message_at desc; archived sink to the bottom.
 */
export function useCoachSessions(projectId) {
  useRealtimeSubscription(
    projectId ? 'coach_sessions' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['coach-sessions', projectId]],
  );

  return useQuery({
    queryKey: ['coach-sessions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_sessions')
        .select(
          'id, project_id, title, focus_area, message_count, total_input_tokens, total_output_tokens, estimated_cost_usd, last_message_at, is_archived, created_at, updated_at',
        )
        .eq('project_id', projectId)
        .order('is_archived', { ascending: true })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  QUERIES — coach_messages                                       */
/* ============================================================== */

/**
 * Fetch all messages for a session, ordered by turn_index ASC.
 * Realtime-subscribed so assistant responses stream in.
 */
export function useCoachMessages(sessionId) {
  useRealtimeSubscription(
    sessionId ? 'coach_messages' : null,
    sessionId ? `session_id=eq.${sessionId}` : null,
    [['coach-messages', sessionId]],
  );

  return useQuery({
    queryKey: ['coach-messages', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_messages')
        .select(
          'id, session_id, project_id, turn_index, role, content, context_snapshot, input_tokens, output_tokens, cost_usd, claude_model, stop_reason, created_at',
        )
        .eq('session_id', sessionId)
        .order('turn_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
  });
}

/* ============================================================== */
/*  MUTATION — send a message (creates session on first turn)     */
/* ============================================================== */

/**
 * POST /webhook/coach/message with { session_id?, project_id, user_message, focus_area? }.
 * If session_id is omitted, the workflow creates a new session and returns the id.
 * Returns { success, session_id, assistant_message, session }.
 */
export function useSendCoachMessage(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, userMessage, focusArea }) => {
      const payload = {
        project_id: projectId,
        user_message: userMessage,
      };
      if (sessionId) payload.session_id = sessionId;
      if (focusArea) payload.focus_area = focusArea;

      const res = await webhookCall('coach/message', payload, { timeoutMs: 120_000 });
      if (res?.success === false) throw new Error(res.error || 'Coach request failed');
      return res;
    },
    onSettled: (data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['coach-sessions', projectId] });
      const sid = data?.session_id || data?.data?.session_id || vars.sessionId;
      if (sid) qc.invalidateQueries({ queryKey: ['coach-messages', sid] });
    },
  });
}

/* ============================================================== */
/*  MUTATION — create bare session (no message yet)               */
/* ============================================================== */

/**
 * Rarely needed directly — useSendCoachMessage handles session
 * creation in the workflow. Exposed for the "New Session" button
 * if the user wants to pick a focus area before typing.
 */
export function useCreateSession(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, focusArea }) => {
      const payload = {
        project_id: projectId,
        title: title || null,
        focus_area: focusArea || 'general',
        message_count: 0,
      };

      const { data, error } = await supabase
        .from('coach_sessions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['coach-sessions', projectId] });
    },
  });
}

/* ============================================================== */
/*  MUTATION — archive a session                                  */
/* ============================================================== */

export function useArchiveSession(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, archive = true }) => {
      const { data, error } = await supabase
        .from('coach_sessions')
        .update({ is_archived: archive, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['coach-sessions', projectId] });
    },
  });
}

/* ============================================================== */
/*  MUTATION — rename a session                                   */
/* ============================================================== */

export function useRenameSession(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, title }) => {
      const { data, error } = await supabase
        .from('coach_sessions')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['coach-sessions', projectId] });
    },
  });
}
