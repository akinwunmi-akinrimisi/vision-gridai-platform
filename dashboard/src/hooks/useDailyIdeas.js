import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/* ============================================================== */
/*  Date-range helpers                                             */
/* ============================================================== */

function dateRangeBounds(range) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  if (range === 'today') {
    return { gte: fmt(today), lte: fmt(today) };
  }
  if (range === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { gte: fmt(y), lte: fmt(y) };
  }
  if (range === 'last_7d') {
    const past = new Date(today);
    past.setDate(past.getDate() - 6);
    return { gte: fmt(past), lte: fmt(today) };
  }
  return null; // 'all'
}

/* ============================================================== */
/*  QUERY — daily_ideas                                            */
/* ============================================================== */

/**
 * Fetch scored ideas for a project, with optional date + status filters.
 * Realtime-subscribed.
 *
 * @param {string} projectId
 * @param {{ dateRange?: 'today'|'yesterday'|'last_7d'|'all', status?: 'all'|'pending'|'saved'|'dismissed'|'used' }} opts
 */
export function useDailyIdeas(projectId, { dateRange = 'today', status = 'all' } = {}) {
  useRealtimeSubscription(
    projectId ? 'daily_ideas' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['daily-ideas', projectId, dateRange, status], ['daily-ideas-all', projectId]],
  );

  return useQuery({
    queryKey: ['daily-ideas', projectId, dateRange, status],
    queryFn: async () => {
      let query = supabase
        .from('daily_ideas')
        .select(
          'id, project_id, run_date, batch_id, position_in_batch, idea_title, idea_angle, target_chapters, viral_potential_score, seo_opportunity_score, rpm_fit_score, combined_score, rationale, source_signals, related_keywords, status, status_changed_at, used_as_topic_id, created_at',
        )
        .eq('project_id', projectId);

      const bounds = dateRangeBounds(dateRange);
      if (bounds) {
        query = query.gte('run_date', bounds.gte).lte('run_date', bounds.lte);
      }
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      query = query
        .order('run_date', { ascending: false })
        .order('position_in_batch', { ascending: true, nullsFirst: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch the all-time summary counts for this project.
 * Used to power the KPI cards so they remain stable across filter changes.
 */
export function useDailyIdeasSummary(projectId) {
  useRealtimeSubscription(
    projectId ? 'daily_ideas' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['daily-ideas-summary', projectId]],
  );

  return useQuery({
    queryKey: ['daily-ideas-summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_ideas')
        .select('id, status, combined_score, run_date, created_at')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  MUTATION — generate new batch                                  */
/* ============================================================== */

/**
 * POST /webhook/ideas/generate with { project_id, force: true }.
 * The workflow also runs on daily cron, but this button forces a fresh run.
 */
export function useGenerateDailyIdeas(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => webhookCall('ideas/generate', { project_id: projectId, force: true }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily-ideas'] });
      qc.invalidateQueries({ queryKey: ['daily-ideas-summary', projectId] });
    },
  });
}

/* ============================================================== */
/*  MUTATION — update idea status                                  */
/* ============================================================== */

/**
 * PATCH a single idea's status (saved / dismissed / pending).
 * 'used' transitions are handled by usePromoteIdeaToTopic instead.
 */
export function useUpdateIdeaStatus(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, status }) => {
      const { data, error } = await supabase
        .from('daily_ideas')
        .update({
          status,
          status_changed_at: new Date().toISOString(),
        })
        .eq('id', ideaId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily-ideas'] });
      qc.invalidateQueries({ queryKey: ['daily-ideas-summary', projectId] });
    },
  });
}

/* ============================================================== */
/*  MUTATION — promote idea to topic                               */
/* ============================================================== */

/**
 * Creates a new topics row (scaffold) from the idea and marks the
 * idea as 'used' with used_as_topic_id pointing at the new topic.
 * Returns the created topic row so the caller can navigate to it.
 */
export function usePromoteIdeaToTopic(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ idea }) => {
      // Compute next topic_number (topics.topic_number is NOT NULL)
      const { data: maxRow } = await supabase
        .from('topics')
        .select('topic_number')
        .eq('project_id', projectId)
        .order('topic_number', { ascending: false })
        .limit(1)
        .single();
      const nextNumber = (maxRow?.topic_number || 0) + 1;

      // 1. Insert minimal topic scaffold
      const topicPayload = {
        project_id: projectId,
        topic_number: nextNumber,
        seo_title: idea.idea_title,
        original_title: idea.idea_title,
        narrative_hook: idea.idea_angle || null,
        review_status: 'pending',
        status: 'pending',
      };

      const { data: topic, error: topicErr } = await supabase
        .from('topics')
        .insert(topicPayload)
        .select()
        .single();

      if (topicErr) throw topicErr;

      // 2. Mark idea as used with FK back
      const { error: ideaErr } = await supabase
        .from('daily_ideas')
        .update({
          status: 'used',
          status_changed_at: new Date().toISOString(),
          used_as_topic_id: topic.id,
        })
        .eq('id', idea.id);

      if (ideaErr) throw ideaErr;

      return topic;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily-ideas'] });
      qc.invalidateQueries({ queryKey: ['daily-ideas-summary', projectId] });
      qc.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });
}
