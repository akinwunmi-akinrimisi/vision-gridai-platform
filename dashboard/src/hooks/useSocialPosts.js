import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/**
 * Fetch all shorts that are ready to post (portrait_drive_url is not null).
 * Splits into readyClips and postedClips.
 * Subscribes to Supabase Realtime for live updates.
 */
export function useSocialPosts() {
  useRealtimeSubscription('shorts', null, [['social-posts']]);

  return useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shorts')
        .select('*, topics!inner(seo_title, project_id, projects!inner(name))')
        .not('portrait_drive_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const all = data || [];

      // Ready = at least one platform is pending or scheduled
      const readyClips = all.filter((clip) => {
        const tik = clip.tiktok_status;
        const ig = clip.instagram_status;
        const yt = clip.youtube_shorts_status;
        return (
          tik === 'pending' || tik === 'scheduled' ||
          ig === 'pending' || ig === 'scheduled' ||
          yt === 'pending' || yt === 'scheduled'
        );
      });

      // Posted = at least one platform has a published_at timestamp
      const postedClips = all.filter((clip) =>
        clip.tiktok_published_at ||
        clip.instagram_published_at ||
        clip.youtube_shorts_published_at
      );

      return { readyClips, postedClips, all };
    },
  });
}

/**
 * Schedule or post a clip to one or more platforms via n8n webhook.
 */
export function usePostClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ short_id, platforms, schedule_at, captions }) =>
      webhookCall('social/post', { short_id, platforms, schedule_at, captions }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    },
  });
}

/**
 * Auto-schedule all ready clips across platforms via n8n webhook.
 */
export function useAutoScheduleAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clip_ids, stagger }) =>
      webhookCall('social/auto-schedule', { clip_ids, stagger }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    },
  });
}

/**
 * Update per-platform captions for a clip directly in Supabase.
 */
export function useUpdateClipCaptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, tiktok_caption, instagram_caption }) => {
      const updates = {};
      if (tiktok_caption !== undefined) updates.tiktok_caption = tiktok_caption;
      if (instagram_caption !== undefined) updates.instagram_caption = instagram_caption;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('shorts')
        .update(updates)
        .eq('id', clipId);

      if (error) throw error;
    },

    onMutate: async ({ clipId, tiktok_caption, instagram_caption }) => {
      await queryClient.cancelQueries({ queryKey: ['social-posts'] });
      const previous = queryClient.getQueryData(['social-posts']);

      queryClient.setQueryData(['social-posts'], (old) => {
        if (!old) return old;
        const updateClip = (clip) => {
          if (clip.id !== clipId) return clip;
          const updated = { ...clip };
          if (tiktok_caption !== undefined) updated.tiktok_caption = tiktok_caption;
          if (instagram_caption !== undefined) updated.instagram_caption = instagram_caption;
          return updated;
        };
        return {
          ...old,
          readyClips: old.readyClips.map(updateClip),
          postedClips: old.postedClips.map(updateClip),
          all: old.all.map(updateClip),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['social-posts'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    },
  });
}
