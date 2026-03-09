import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  triggerProduction,
  triggerProductionBatch,
  stopProduction,
  resumeProduction,
  restartProduction,
  retryScene,
  retryAllFailed,
  skipScene,
  skipAllFailed,
  editAndRetryScene,
  assembleVideo,
} from '../lib/productionApi';

/**
 * Production mutation hooks with optimistic updates.
 * Follows the same pattern as useApproveTopics in useTopics.js.
 *
 * @param {string} projectId - Project UUID for cache invalidation
 * @returns {object} Object with mutation hooks for all production actions
 */
export function useProductionMutations(projectId) {
  const queryClient = useQueryClient();

  const trigger = useMutation({
    mutationFn: ({ topic_id }) => triggerProduction(topic_id),
    onMutate: async ({ topic_id }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          t.id === topic_id ? { ...t, status: 'queued' } : t
        )
      );

      return { previousTopics };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTopics) {
        queryClient.setQueryData(['topics', projectId], context.previousTopics);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const triggerBatch = useMutation({
    mutationFn: ({ topic_ids }) => triggerProductionBatch(topic_ids),
    onMutate: async ({ topic_ids }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          topic_ids.includes(t.id) ? { ...t, status: 'queued' } : t
        )
      );

      return { previousTopics };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTopics) {
        queryClient.setQueryData(['topics', projectId], context.previousTopics);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const stop = useMutation({
    mutationFn: ({ topic_id }) => stopProduction(topic_id),
    onMutate: async ({ topic_id }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          t.id === topic_id ? { ...t, status: 'stopped' } : t
        )
      );

      return { previousTopics };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTopics) {
        queryClient.setQueryData(['topics', projectId], context.previousTopics);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const resume = useMutation({
    mutationFn: ({ topic_id }) => resumeProduction(topic_id),
    onMutate: async ({ topic_id }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          t.id === topic_id ? { ...t, status: 'producing' } : t
        )
      );

      return { previousTopics };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTopics) {
        queryClient.setQueryData(['topics', projectId], context.previousTopics);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const restartMutation = useMutation({
    mutationFn: ({ topic_id }) => restartProduction(topic_id),
    onMutate: async ({ topic_id }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          t.id === topic_id ? { ...t, status: 'queued' } : t
        )
      );

      return { previousTopics };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTopics) {
        queryClient.setQueryData(['topics', projectId], context.previousTopics);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const retrySceneMutation = useMutation({
    mutationFn: ({ scene_id }) => retryScene(scene_id),
    onSettled: (_data, _err, { topic_id }) => {
      if (topic_id) {
        queryClient.invalidateQueries({ queryKey: ['scenes', topic_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const skipSceneMutation = useMutation({
    mutationFn: ({ scene_id, reason }) => skipScene(scene_id, reason),
    onSettled: (_data, _err, { topic_id }) => {
      if (topic_id) {
        queryClient.invalidateQueries({ queryKey: ['scenes', topic_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const editAndRetryMutation = useMutation({
    mutationFn: ({ scene_id, image_prompt }) => editAndRetryScene(scene_id, image_prompt),
    onSettled: (_data, _err, { topic_id }) => {
      if (topic_id) {
        queryClient.invalidateQueries({ queryKey: ['scenes', topic_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const retryAllFailedMutation = useMutation({
    mutationFn: ({ topic_id }) => retryAllFailed(topic_id),
    onSettled: (_data, _err, { topic_id }) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', topic_id] });
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const skipAllFailedMutation = useMutation({
    mutationFn: ({ topic_id }) => skipAllFailed(topic_id),
    onSettled: (_data, _err, { topic_id }) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', topic_id] });
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  const assemble = useMutation({
    mutationFn: ({ topic_id }) => assembleVideo(topic_id),
    onMutate: async ({ topic_id }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          t.id === topic_id ? { ...t, assembly_status: 'assembling' } : t
        )
      );

      return { previousTopics };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTopics) {
        queryClient.setQueryData(['topics', projectId], context.previousTopics);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  return {
    triggerProduction: trigger,
    triggerProductionBatch: triggerBatch,
    stopProduction: stop,
    resumeProduction: resume,
    restartProduction: restartMutation,
    retryScene: retrySceneMutation,
    skipScene: skipSceneMutation,
    editAndRetryScene: editAndRetryMutation,
    retryAllFailed: retryAllFailedMutation,
    skipAllFailed: skipAllFailedMutation,
    assembleVideo: assemble,
  };
}
