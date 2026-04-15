import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch scenes for a topic and compute stage-by-stage production progress.
 * Subscribes to Supabase Realtime for live updates.
 *
 * @param {string|null} topicId - Topic UUID
 * @param {object} [topicData] - Optional topic row (reserved for future use)
 * @returns {{ scenes: Array, stageProgress: object, failedScenes: Array, isLoading: boolean, error: any }}
 */
export function useProductionProgress(topicId, topicData) {
  useRealtimeSubscription(
    topicId ? 'scenes' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['scenes', topicId], ['production-progress', topicId]]
  );

  const query = useQuery({
    queryKey: ['scenes', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('topic_id', topicId)
        .order('scene_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });

  const scenes = query.data || [];

  // Compute stage progress
  const stageProgress = computeStageProgress(scenes, topicData);

  // Compute failed scenes
  const failedScenes = scenes.filter(
    (s) =>
      s.audio_status === 'failed' ||
      s.image_status === 'failed' ||
      s.video_status === 'failed'
  );

  return {
    scenes,
    stageProgress,
    failedScenes,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Compute completion counts for each production stage.
 */
function computeStageProgress(scenes, topicData) {
  const total = scenes.length;

  // Script stage: if scenes exist with narration_text, script is complete
  const scriptComplete = scenes.length > 0 && scenes.every((s) => s.narration_text);
  const scriptCompleted = scriptComplete ? total : 0;

  const audioCompleted = scenes.filter(
    (s) => s.audio_status === 'uploaded' || s.audio_status === 'generated'
  ).length;

  // All scenes can have images (static_image scenes get images, i2v scenes need images as source)
  const imagesCompleted = scenes.filter(
    (s) => s.image_status === 'uploaded' || s.image_status === 'generated'
  ).length;

  const i2vScenes = scenes.filter((s) => s.visual_type === 'i2v');
  const i2vCompleted = i2vScenes.filter(
    (s) => s.video_status === 'uploaded' || s.video_status === 'generated'
  ).length;

  const t2vScenes = scenes.filter((s) => s.visual_type === 't2v');
  const t2vCompleted = t2vScenes.filter(
    (s) => s.video_status === 'uploaded' || s.video_status === 'generated'
  ).length;

  // Captions: count scenes that have clip_status indicating captions are done
  // Captions are complete when clip_status transitions beyond pending
  const captionsScenes = scenes.filter(
    (s) => s.clip_status === 'complete' || s.clip_status === 'uploaded' || s.clip_status === 'captioned'
  );
  const captionsCompleted = captionsScenes.length;

  const clipsCompleted = scenes.filter(
    (s) => s.clip_status === 'complete' || s.clip_status === 'uploaded'
  ).length;

  return {
    script: { completed: scriptCompleted, total },
    audio: { completed: audioCompleted, total },
    images: { completed: imagesCompleted, total },
    i2v: { completed: i2vCompleted, total: i2vScenes.length },
    t2v: { completed: t2vCompleted, total: t2vScenes.length },
    captions: { completed: captionsCompleted, total },
    assembly: { completed: clipsCompleted, total },
  };
}
