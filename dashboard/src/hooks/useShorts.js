import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/**
 * Fetch all shorts for a topic, ordered by clip_number.
 * Subscribes to Supabase Realtime for live updates.
 * @param {string|null} topicId - Topic UUID
 */
export function useShorts(topicId) {
  useRealtimeSubscription(
    topicId ? 'shorts' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['shorts', topicId]]
  );

  return useQuery({
    queryKey: ['shorts', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shorts')
        .select('*')
        .eq('topic_id', topicId)
        .order('clip_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });
}

/**
 * Fetch shorts counts grouped by topic for a project.
 * Returns a map of topic_id -> { total, approved, skipped, produced, pending }.
 * @param {string|null} projectId - Project UUID
 */
export function useShortsSummary(projectId) {
  useRealtimeSubscription(
    projectId ? 'shorts' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['shorts-summary', projectId]]
  );

  return useQuery({
    queryKey: ['shorts-summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shorts')
        .select('id, topic_id, review_status, production_status')
        .eq('project_id', projectId);

      if (error) throw error;

      const byTopic = {};
      for (const s of (data || [])) {
        if (!byTopic[s.topic_id]) {
          byTopic[s.topic_id] = { total: 0, approved: 0, skipped: 0, produced: 0, pending: 0 };
        }
        const bucket = byTopic[s.topic_id];
        bucket.total++;
        if (s.review_status === 'approved') bucket.approved++;
        else if (s.review_status === 'skipped') bucket.skipped++;
        else bucket.pending++;
        if (s.production_status === 'complete' || s.production_status === 'uploaded') bucket.produced++;
      }

      return byTopic;
    },
    enabled: !!projectId,
  });
}

/**
 * Trigger viral clip analysis for a topic via n8n webhook.
 */
export function useAnalyzeForClips() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id }) =>
      webhookCall('shorts/analyze', { topic_id }),

    onSettled: (_data, _err, { topic_id }) => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topic_id] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}

/**
 * Approve a single clip — PATCH review_status = 'approved'.
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useApproveClip(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId }) => {
      const { error } = await supabase
        .from('shorts')
        .update({ review_status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', clipId);

      if (error) throw error;
    },

    onMutate: async ({ clipId }) => {
      await queryClient.cancelQueries({ queryKey: ['shorts', topicId] });
      const previous = queryClient.getQueryData(['shorts', topicId]);

      queryClient.setQueryData(['shorts', topicId], (old) =>
        (old || []).map((s) =>
          s.id === clipId ? { ...s, review_status: 'approved' } : s
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['shorts', topicId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}

/**
 * Skip a single clip — PATCH review_status = 'skipped'.
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useSkipClip(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId }) => {
      const { error } = await supabase
        .from('shorts')
        .update({ review_status: 'skipped', updated_at: new Date().toISOString() })
        .eq('id', clipId);

      if (error) throw error;
    },

    onMutate: async ({ clipId }) => {
      await queryClient.cancelQueries({ queryKey: ['shorts', topicId] });
      const previous = queryClient.getQueryData(['shorts', topicId]);

      queryClient.setQueryData(['shorts', topicId], (old) =>
        (old || []).map((s) =>
          s.id === clipId ? { ...s, review_status: 'skipped' } : s
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['shorts', topicId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}

/**
 * Bulk approve multiple clips.
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useBulkApproveClips(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipIds }) => {
      const { error } = await supabase
        .from('shorts')
        .update({ review_status: 'approved', updated_at: new Date().toISOString() })
        .in('id', clipIds);

      if (error) throw error;
    },

    onMutate: async ({ clipIds }) => {
      await queryClient.cancelQueries({ queryKey: ['shorts', topicId] });
      const previous = queryClient.getQueryData(['shorts', topicId]);

      const idSet = new Set(clipIds);
      queryClient.setQueryData(['shorts', topicId], (old) =>
        (old || []).map((s) =>
          idSet.has(s.id) ? { ...s, review_status: 'approved' } : s
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['shorts', topicId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}

/**
 * Trigger production for a single clip via n8n webhook.
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useProduceClip(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clipId }) =>
      webhookCall('shorts/produce', { clip_id: clipId }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}

/**
 * Trigger production for ALL approved clips with production_status='pending'.
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useProduceAllApproved(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      webhookCall('shorts/produce', { topic_id: topicId, action: 'produce_all' }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}

/**
 * Update a clip's editable fields (title, hook_text, hashtags, etc.).
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useUpdateClip(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, updates }) => {
      const { error } = await supabase
        .from('shorts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', clipId);

      if (error) throw error;
    },

    onMutate: async ({ clipId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['shorts', topicId] });
      const previous = queryClient.getQueryData(['shorts', topicId]);

      queryClient.setQueryData(['shorts', topicId], (old) =>
        (old || []).map((s) =>
          s.id === clipId ? { ...s, ...updates } : s
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['shorts', topicId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
    },
  });
}

/**
 * Re-produce a clip — reset production fields and re-trigger via webhook.
 * For clips that are complete, uploaded, cancelled, or failed.
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useReproduceClip(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId }) => {
      const { error } = await supabase
        .from('shorts')
        .update({
          production_status: 'pending',
          production_progress: null,
          portrait_drive_id: null,
          portrait_drive_url: null,
          actual_duration_ms: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clipId);

      if (error) throw error;

      return webhookCall('shorts/produce', { clip_id: clipId });
    },

    onMutate: async ({ clipId }) => {
      await queryClient.cancelQueries({ queryKey: ['shorts', topicId] });
      const previous = queryClient.getQueryData(['shorts', topicId]);

      queryClient.setQueryData(['shorts', topicId], (old) =>
        (old || []).map((s) =>
          s.id === clipId
            ? { ...s, production_status: 'pending', production_progress: null, portrait_drive_id: null, portrait_drive_url: null, actual_duration_ms: null }
            : s
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['shorts', topicId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}

/**
 * Cancel/stop production for a single clip — PATCH production_status = 'cancelled'.
 * The workflow checks for this status and bails out.
 * @param {string} topicId - Topic UUID for cache invalidation
 */
export function useCancelProduction(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId }) => {
      const { error } = await supabase
        .from('shorts')
        .update({ production_status: 'cancelled', production_progress: null, updated_at: new Date().toISOString() })
        .eq('id', clipId);

      if (error) throw error;
    },

    onMutate: async ({ clipId }) => {
      await queryClient.cancelQueries({ queryKey: ['shorts', topicId] });
      const previous = queryClient.getQueryData(['shorts', topicId]);

      queryClient.setQueryData(['shorts', topicId], (old) =>
        (old || []).map((s) =>
          s.id === clipId ? { ...s, production_status: 'cancelled', production_progress: null } : s
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['shorts', topicId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts', topicId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-summary'] });
    },
  });
}
