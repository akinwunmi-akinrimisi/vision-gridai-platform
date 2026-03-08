import { useMutation, useQueryClient } from '@tanstack/react-query';
import { webhookCall } from '../lib/api';

/**
 * Trigger 3-pass script generation for a topic via n8n webhook.
 * @param {string} topicId - Topic UUID
 */
export function useGenerateScript(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id }) =>
      webhookCall('script/generate', { topic_id }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['script', topicId] });
      const previousScript = queryClient.getQueryData(['script', topicId]);

      queryClient.setQueryData(['script', topicId], (old) =>
        old ? { ...old, status: 'scripting' } : old
      );

      return { previousScript };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousScript) {
        queryClient.setQueryData(['script', topicId], context.previousScript);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['script', topicId] });
    },
  });
}

/**
 * Approve a script via n8n webhook (Gate 2).
 * @param {string} topicId - Topic UUID
 */
export function useApproveScript(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id }) =>
      webhookCall('script/approve', { topic_id }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['script', topicId] });
      const previousScript = queryClient.getQueryData(['script', topicId]);

      queryClient.setQueryData(['script', topicId], (old) =>
        old ? { ...old, script_review_status: 'approved' } : old
      );

      return { previousScript };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousScript) {
        queryClient.setQueryData(['script', topicId], context.previousScript);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['script', topicId] });
    },
  });
}

/**
 * Reject a script with feedback via n8n webhook.
 * @param {string} topicId - Topic UUID
 */
export function useRejectScript(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id, feedback }) =>
      webhookCall('script/reject', { topic_id, feedback }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['script', topicId] });
      const previousScript = queryClient.getQueryData(['script', topicId]);

      queryClient.setQueryData(['script', topicId], (old) =>
        old ? { ...old, script_review_status: 'rejected' } : old
      );

      return { previousScript };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousScript) {
        queryClient.setQueryData(['script', topicId], context.previousScript);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['script', topicId] });
    },
  });
}

/**
 * Refine a script with custom instructions via n8n webhook.
 * @param {string} topicId - Topic UUID
 */
export function useRefineScript(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id, instructions }) =>
      webhookCall('script/refine', { topic_id, instructions }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['script', topicId] });
      const previousScript = queryClient.getQueryData(['script', topicId]);

      queryClient.setQueryData(['script', topicId], (old) =>
        old ? { ...old, script_review_status: 'refining' } : old
      );

      return { previousScript };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousScript) {
        queryClient.setQueryData(['script', topicId], context.previousScript);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['script', topicId] });
    },
  });
}

/**
 * Regenerate image prompts for edited scenes via n8n webhook.
 * @param {string} topicId - Topic UUID
 */
export function useRegenPrompts(topicId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id, scene_ids }) =>
      webhookCall('script/regen-prompts', { topic_id, scene_ids }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes', topicId] });
    },
  });
}
