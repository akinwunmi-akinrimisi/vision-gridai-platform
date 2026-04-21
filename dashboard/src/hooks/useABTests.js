import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardRead, webhookCall } from '../lib/api';

/* ==================================================================
 *  QUERIES — ab_tests (+ nested variants + joined topic title)
 * ================================================================== */

/**
 * Fetch all A/B tests for a project (+ nested variants + thin topic join).
 * Routed through WF_DASHBOARD_READ `ab_tests_for_project` — server-side
 * service_role handles the nested select + fallback. Polls every 20s in
 * place of Supabase Realtime (locked down post migration 030).
 */
export function useABTests(projectId, { filter = 'all' } = {}) {
  return useQuery({
    queryKey: ['ab-tests', projectId, filter],
    queryFn: () => dashboardRead('ab_tests_for_project', { project_id: projectId, filter }),
    enabled: !!projectId,
    refetchInterval: 20_000,
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
 *  MUTATIONS — all via WF_DASHBOARD_READ state-changing queries
 *  (direct supabase.from().update() removed in 2026-04-21 audit fix B4.5)
 * ================================================================== */

function useABTestStatusMutation(projectId, status) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ abTestId }) =>
      dashboardRead('update_ab_test_status', { ab_test_id: abTestId, status }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
    },
  });
}

export const usePauseABTest = (projectId) => useABTestStatusMutation(projectId, 'paused');
export const useResumeABTest = (projectId) => useABTestStatusMutation(projectId, 'running');
export const useStopABTest = (projectId) => useABTestStatusMutation(projectId, 'aborted');

/**
 * Mark the winning variant of a completed test as applied. Server-side
 * handler also promotes the winning title back to topics.selected_title
 * for non-thumbnail tests.
 */
export function useApplyWinner(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ abTest }) => {
      if (!abTest?.id) throw new Error('Missing A/B test id');
      return dashboardRead('apply_ab_test_winner', { ab_test_id: abTest.id });
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests', projectId] });
      if (vars?.abTest?.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['video-review', vars.abTest.topic_id] });
      }
    },
  });
}
