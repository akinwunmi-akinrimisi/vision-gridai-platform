import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  approveVideo,
  rejectVideo,
  publishVideo,
  batchPublish,
  regenerateThumbnail,
  updateMetadata,
  retryUpload,
} from '../lib/publishApi';

/**
 * Approve video mutation (Gate 3).
 * Optimistically sets video_review_status based on action type.
 */
export function useApproveVideo(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId, action, scheduleTime }) =>
      approveVideo(topicId, action, scheduleTime),

    onMutate: async ({ topicId, action }) => {
      await queryClient.cancelQueries({ queryKey: ['video-review', topicId] });
      const previous = queryClient.getQueryData(['video-review', topicId]);

      const statusMap = {
        publish_now: 'publishing',
        schedule: 'scheduled',
        approve_only: 'video_approved',
      };

      queryClient.setQueryData(['video-review', topicId], (old) =>
        old ? { ...old, video_review_status: statusMap[action] || 'video_approved' } : old
      );

      return { previous, topicId };
    },

    onSuccess: (result, { action }) => {
      if (result?.success === false) {
        toast.error(result.error || 'Failed to process video action');
        return;
      }
      const msg = action === 'publish_now' ? 'Publishing started — monitor progress via Realtime'
        : action === 'schedule' ? 'Video scheduled for publishing'
        : 'Video approved';
      toast.success(msg);
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['video-review', context.topicId], context.previous);
      }
      toast.error(err?.message || 'Failed to approve video');
    },

    onSettled: (_data, _err, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
    },
  });
}

/**
 * Reject video mutation (Gate 3).
 * Optimistically sets video_review_status to 'rejected'.
 */
export function useRejectVideo(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId, feedback, rollbackStage }) =>
      rejectVideo(topicId, feedback, rollbackStage),

    onMutate: async ({ topicId }) => {
      await queryClient.cancelQueries({ queryKey: ['video-review', topicId] });
      const previous = queryClient.getQueryData(['video-review', topicId]);

      queryClient.setQueryData(['video-review', topicId], (old) =>
        old ? { ...old, video_review_status: 'rejected' } : old
      );

      return { previous, topicId };
    },

    onSuccess: (result) => {
      if (result?.success === false) {
        toast.error(result.error || 'Failed to reject video');
        return;
      }
      toast.success('Video rejected');
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['video-review', context.topicId], context.previous);
      }
      toast.error(err?.message || 'Failed to reject video');
    },

    onSettled: (_data, _err, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
    },
  });
}

/**
 * Publish video mutation (for previously approve_only topics).
 */
export function usePublishVideo(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId }) => publishVideo(topicId),

    onSettled: (_data, _err, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
    },
  });
}

/**
 * Batch publish mutation for multiple approved videos.
 */
export function useBatchPublish(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicIds }) => batchPublish(topicIds),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });
}

/**
 * Regenerate thumbnail mutation.
 */
export function useRegenerateThumbnail(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId, prompt }) => regenerateThumbnail(topicId, prompt),

    onSettled: (_data, _err, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
    },
  });
}

/**
 * Update metadata mutation.
 */
export function useUpdateMetadata(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId, fields }) => updateMetadata(topicId, fields),

    onSettled: (_data, _err, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
    },
  });
}

/**
 * Retry failed upload mutation.
 */
export function useRetryUpload(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId }) => retryUpload(topicId),

    onSettled: (_data, _err, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['video-review', topicId] });
    },
  });
}
