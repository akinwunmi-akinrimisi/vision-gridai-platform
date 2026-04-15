import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { webhookCall } from '../lib/api';

/* ==================================================================
 *  MUTATIONS — Title CTR Optimizer (CF05)
 * ================================================================== */

/**
 * Trigger WF_CTR_OPTIMIZE for a topic. Produces topic.title_options (5 variants).
 * POSTs to /webhook/ctr/optimize with { topic_id, force? }.
 */
export function useGenerateTitleVariants(topicId, projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ force = false } = {}) =>
      webhookCall('ctr/optimize', { topic_id: topicId, force }, { timeoutMs: 90_000 }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      }
    },
  });
}

/**
 * Persist the user's chosen title variant on topics.
 * Writes selected_title, title_ctr_score, title_selected_at.
 */
export function useSelectTitle(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, ctr_score }) => {
      const { data, error } = await supabase
        .from('topics')
        .update({
          selected_title: title,
          title_ctr_score: ctr_score ?? null,
          title_selected_at: new Date().toISOString(),
        })
        .eq('id', topicId)
        .select('id, selected_title, title_ctr_score, title_selected_at')
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
    },
  });
}

/* ==================================================================
 *  MUTATIONS — Thumbnail CTR Scorer (CF06)
 * ================================================================== */

/**
 * Trigger WF_THUMBNAIL_SCORE for a topic. Scores the current thumbnail,
 * and (when force=true or decision=regenerate) fires WF_THUMBNAIL_GENERATE
 * with improvement suggestions as context.
 *
 * POSTs to /webhook/thumbnail/score with { topic_id, thumbnail_url?, force? }.
 */
export function useScoreThumbnail(topicId, projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ thumbnail_url, force = false } = {}) =>
      webhookCall(
        'thumbnail/score',
        {
          topic_id: topicId,
          thumbnail_url: thumbnail_url || undefined,
          force,
        },
        { timeoutMs: 180_000 },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      }
    },
  });
}

/* ==================================================================
 *  MUTATIONS — A/B Test lifecycle (CF17)
 * ================================================================== */

/**
 * Start an A/B test for a topic.
 * POSTs to /webhook/ab-test/start with the payload documented in S3.
 *
 *   {
 *     topic_id, test_type: 'title' | 'thumbnail' | 'combined',
 *     variants: [{ title?, thumbnail_url?, thumbnail_drive_id? }],
 *     min_impressions_per_variant?, min_days_per_variant?,
 *     rotation_interval_hours?, confidence_threshold?,
 *   }
 */
export function useStartABTest(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      webhookCall('ab-test/start', payload, { timeoutMs: 60_000 }),
    onSettled: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
      }
    },
  });
}
