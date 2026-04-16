import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/* ==================================================================
 *  QUERIES — ab_tests (+ nested variants + joined topic title)
 * ================================================================== */

/**
 * Fetch all A/B tests for a project with nested variants and a light
 * topic join for display. Subscribes to Realtime for both tables.
 *
 * @param {string} projectId
 * @param {{ filter?: 'all' | 'running' | 'completed' | 'paused' }} opts
 */
export function useABTests(projectId, { filter = 'all' } = {}) {
  useRealtimeSubscription(
    projectId ? 'ab_tests' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['ab-tests', projectId]],
  );
  useRealtimeSubscription(
    projectId ? 'ab_test_variants' : null,
    null,
    [['ab-tests', projectId]],
  );

  return useQuery({
    queryKey: ['ab-tests', projectId],
    queryFn: async () => {
      const selectCols =
        'id, topic_id, project_id, youtube_video_id, test_type, status, ' +
        'min_impressions_per_variant, min_days_per_variant, rotation_interval_hours, ' +
        'confidence_threshold, current_variant_id, last_rotated_at, started_at, ' +
        'completed_at, winning_variant_id, winner_applied, test_notes, created_at';

      let query = supabase
        .from('ab_tests')
        .select(
          selectCols +
            ', variants:ab_test_variants(*), ' +
            'topics(id, topic_number, seo_title, original_title, selected_title, thumbnail_url)',
        )
        .eq('project_id', projectId)
        .order('started_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (filter === 'running') query = query.eq('status', 'running');
      else if (filter === 'completed') query = query.eq('status', 'completed');
      else if (filter === 'paused') query = query.eq('status', 'paused');

      let { data, error } = await query;

      // Fallback: if the nested select fails (FK not auto-detected), fetch separately
      if (error && error.message?.includes('could not find')) {
        let fallbackQuery = supabase
          .from('ab_tests')
          .select(selectCols)
          .eq('project_id', projectId)
          .order('started_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });

        if (filter === 'running') fallbackQuery = fallbackQuery.eq('status', 'running');
        else if (filter === 'completed') fallbackQuery = fallbackQuery.eq('status', 'completed');
        else if (filter === 'paused') fallbackQuery = fallbackQuery.eq('status', 'paused');

        const { data: tests } = await fallbackQuery;
        const testIds = (tests || []).map((t) => t.id);
        const { data: variants } = testIds.length
          ? await supabase.from('ab_test_variants').select('*').in('ab_test_id', testIds)
          : { data: [] };
        data = (tests || []).map((t) => ({
          ...t,
          variants: (variants || []).filter((v) => v.ab_test_id === t.id),
          topics: null,
        }));
        error = null;
      }

      if (error) throw error;

      // Sort variants by variant_order within each test for stable display
      return (data || []).map((t) => ({
        ...t,
        variants: Array.isArray(t.variants)
          ? [...t.variants].sort(
              (a, b) => (a.variant_order ?? 0) - (b.variant_order ?? 0),
            )
          : [],
      }));
    },
    enabled: !!projectId,
  });
}

/* ==================================================================
 *  MUTATIONS — webhook triggers
 * ================================================================== */

/**
 * Manually rotate an A/B test to its next variant.
 * POSTs to /webhook/ab-test/rotate with { ab_test_id }.
 */
export function useRotateABTest(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ abTestId }) =>
      webhookCall('ab-test/rotate', { ab_test_id: abTestId }, { timeoutMs: 60_000 }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
    },
  });
}

/* ==================================================================
 *  MUTATIONS — direct Supabase status writes
 * ================================================================== */

function updateABTestStatus({ abTestId, patch }) {
  return supabase.from('ab_tests').update(patch).eq('id', abTestId).select().single();
}

export function usePauseABTest(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ abTestId }) => {
      const { data, error } = await updateABTestStatus({
        abTestId,
        patch: { status: 'paused', updated_at: new Date().toISOString() },
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
    },
  });
}

export function useResumeABTest(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ abTestId }) => {
      const { data, error } = await updateABTestStatus({
        abTestId,
        patch: { status: 'running', updated_at: new Date().toISOString() },
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
    },
  });
}

export function useStopABTest(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ abTestId }) => {
      const now = new Date().toISOString();
      const { data, error } = await updateABTestStatus({
        abTestId,
        patch: { status: 'aborted', completed_at: now, updated_at: now },
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
    },
  });
}

/**
 * Mark the winning variant of a completed test as applied.
 * For S3 scope this flips ab_tests.winner_applied = true and (if the test
 * has a winner) writes the winning title back to topics.selected_title.
 * Thumbnail swap is left to a future workflow.
 */
export function useApplyWinner(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ abTest }) => {
      if (!abTest?.id) throw new Error('Missing A/B test id');
      const winner = (abTest.variants || []).find(
        (v) => v.id === abTest.winning_variant_id,
      );

      const now = new Date().toISOString();

      const { error: abErr } = await supabase
        .from('ab_tests')
        .update({ winner_applied: true, updated_at: now })
        .eq('id', abTest.id);
      if (abErr) throw abErr;

      // Optional: promote the winning title back to the topic.
      if (abTest.test_type !== 'thumbnail' && winner?.title && abTest.topic_id) {
        const { error: topErr } = await supabase
          .from('topics')
          .update({
            selected_title: winner.title,
            title_ctr_score: winner.predicted_ctr_score ?? null,
            title_selected_at: now,
          })
          .eq('id', abTest.topic_id);
        if (topErr) throw topErr;
      }

      return { abTestId: abTest.id, winnerId: winner?.id || null };
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
      if (vars?.abTest?.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['video-review', vars.abTest.topic_id] });
      }
    },
  });
}
