import { useQuery } from '@tanstack/react-query';
import { dashboardRead } from '../lib/api';

/**
 * Fetch a single topic (with avatars) for script / topic-detail review, plus
 * scene progress stats attached as `topic._sceneProgress`.
 *
 * Post-migration 030: anon Supabase access is denied. Both reads go through
 * the authenticated dashboard-read webhook. Polls every 15s in place of the
 * old Supabase Realtime subscriptions.
 *
 * @param {string} topicId - Topic UUID
 */
export function useScript(topicId) {
  return useQuery({
    queryKey: ['script', topicId],
    queryFn: async () => {
      const detail = await dashboardRead('topic_detail', { topic_id: topicId });
      const topic = detail?.topic || null;
      if (!topic) throw new Error(`topic ${topicId} not found`);

      // Expose the embedded project for pages that need the header context.
      if (detail.project) topic._project = detail.project;

      // Live scene progress (drives ScorePanel progress bars).
      try {
        const scenes = await dashboardRead('scene_progress', { topic_id: topicId });
        if (Array.isArray(scenes) && scenes.length > 0) {
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
      } catch (_) {
        // Non-fatal — scenes may not exist yet.
      }

      return topic;
    },
    enabled: !!topicId,
    refetchInterval: 15_000,
  });
}
