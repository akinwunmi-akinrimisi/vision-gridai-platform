import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch a single topic with avatars for script review.
 * Subscribes to Supabase Realtime for live updates on this topic.
 * @param {string} topicId - Topic UUID
 */
export function useScript(topicId) {
  // Subscribe to topic changes
  useRealtimeSubscription(
    topicId ? 'topics' : null,
    topicId ? `id=eq.${topicId}` : null,
    [['script', topicId]]
  );

  // Subscribe to scene changes (for live production progress)
  useRealtimeSubscription(
    topicId ? 'scenes' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['script', topicId]]
  );

  return useQuery({
    queryKey: ['script', topicId],
    queryFn: async () => {
      const { data: topic, error } = await supabase
        .from('topics')
        .select('*, avatars(*)')
        .eq('id', topicId)
        .single();

      if (error) throw error;

      // Compute live scene progress from actual scene rows.
      // (ISSUE-004 2026-04-18: previously tried an RPC that doesn't exist — dead code removed.)
      const { data: scenes } = await supabase
        .from('scenes')
        .select('audio_status, image_status, clip_status')
        .eq('topic_id', topicId);

      if (scenes && scenes.length > 0) {
        const total = scenes.length;
        const audioUploaded = scenes.filter(s => s.audio_status === 'uploaded' || s.audio_status === 'generated').length;
        const imagesUploaded = scenes.filter(s => s.image_status === 'uploaded').length;
        const imagesFailed = scenes.filter(s => s.image_status === 'failed').length;
        const clipsUploaded = scenes.filter(s => s.clip_status === 'uploaded' || s.clip_status === 'complete').length;

        topic._sceneProgress = {
          total,
          audio: { done: audioUploaded, total, pct: Math.round((audioUploaded / total) * 100) },
          images: { done: imagesUploaded, failed: imagesFailed, total, pct: Math.round((imagesUploaded / total) * 100) },
          clips: { done: clipsUploaded, total, pct: Math.round((clipsUploaded / total) * 100) },
        };
      }

      return topic;
    },
    enabled: !!topicId,
  });
}
