import { useMutation, useQueryClient } from '@tanstack/react-query';
import { webhookCall } from '../lib/api';

/* ==================================================================
 *  MUTATIONS — Predicted Performance Score (CF13, Sprint S4)
 * ================================================================== */

/**
 * Trigger WF_PREDICT_PERFORMANCE for a topic. Computes the 6-factor weighted PPS.
 * POSTs to /webhook/pps/calculate with { topic_id, force? }.
 */
export function useCalculatePPS(topicId, projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ force = true } = {}) =>
      webhookCall(
        'pps/calculate',
        { topic_id: topicId, force },
        { timeoutMs: 120_000 },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      }
    },
  });
}
