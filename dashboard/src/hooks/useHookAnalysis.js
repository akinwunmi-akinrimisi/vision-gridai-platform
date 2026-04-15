import { useMutation, useQueryClient } from '@tanstack/react-query';
import { webhookCall } from '../lib/api';

/* ==================================================================
 *  MUTATIONS — Hook Analyzer (CF12, Sprint S4)
 * ================================================================== */

/**
 * Trigger WF_HOOK_ANALYZER for a topic. Scores every chapter's opening hook
 * on 5 dimensions (curiosity_gap, emotional_trigger, specificity,
 * pattern_interrupt, open_loop) and writes hook_scores JSONB.
 *
 * POSTs to /webhook/hooks/analyze with { topic_id, force? }.
 */
export function useAnalyzeHooks(topicId, projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ force = true } = {}) =>
      webhookCall(
        'hooks/analyze',
        { topic_id: topicId, force },
        { timeoutMs: 180_000 },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['script', topicId] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      }
    },
  });
}
