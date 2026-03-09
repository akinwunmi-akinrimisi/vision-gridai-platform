import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/**
 * Fetch all topics with avatars for a project, ordered by topic_number.
 * Subscribes to Supabase Realtime for live updates.
 * @param {string} projectId - Project UUID
 */
export function useTopics(projectId) {
  useRealtimeSubscription(
    projectId ? 'topics' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['topics', projectId]]
  );

  return useQuery({
    queryKey: ['topics', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*, avatars(*)')
        .eq('project_id', projectId)
        .order('topic_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Approve one or more topics via n8n webhook.
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useApproveTopics(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_ids }) =>
      webhookCall('topics/approve', { topic_ids }),

    onMutate: async ({ topic_ids }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          topic_ids.includes(t.id)
            ? { ...t, review_status: 'approved' }
            : t
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
}

/**
 * Reject one or more topics via n8n webhook.
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useRejectTopics(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_ids, feedback }) =>
      webhookCall('topics/reject', { topic_ids, feedback }),

    onMutate: async ({ topic_ids }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          topic_ids.includes(t.id)
            ? { ...t, review_status: 'rejected' }
            : t
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
}

/**
 * Refine a single topic with custom instructions via n8n webhook.
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useRefineTopic(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id, instructions }) =>
      webhookCall('topics/refine', { topic_id, instructions }),

    onMutate: async ({ topic_id }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          t.id === topic_id
            ? { ...t, review_status: 'refining' }
            : t
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
}

/**
 * Edit a single topic's fields directly via n8n webhook.
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useEditTopic(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id, project_id, fields }) =>
      webhookCall('topics/action', { action: 'edit', topic_id, project_id, fields }),

    onMutate: async ({ topic_id, fields }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const previousTopics = queryClient.getQueryData(['topics', projectId]);

      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) =>
          t.id === topic_id
            ? { ...t, ...fields }
            : t
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
}

/**
 * Edit a single topic's avatar fields directly via n8n webhook.
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useEditAvatar(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic_id, project_id, fields }) =>
      webhookCall('topics/action', { action: 'edit_avatar', topic_id, project_id, fields }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });
}
