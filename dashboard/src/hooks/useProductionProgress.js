import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Fetch scenes for a topic and compute stage-by-stage production progress.
 * 2026-05-07: Switched from dashboardRead webhook to direct Supabase query.
 * The webhook was routing through n8n's single-threaded task runner, which
 * gets queue-starved during peak image-gen bursts and made the production
 * monitor look frozen. Supabase REST handles concurrent reads in parallel,
 * so the dashboard stays responsive even when n8n is saturated.
 * Polls every 3s.
 *
 * @param {string|null} topicId - Topic UUID
 * @param {object} [topicData] - Optional topic row (reserved for future use)
 * @returns {{ scenes: Array, stageProgress: object, failedScenes: Array, isLoading: boolean, error: any }}
 */
export function useProductionProgress(topicId, topicData) {
  const scenesQuery = useQuery({
    queryKey: ['scenes', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, narration_text, audio_status, image_status, video_status, clip_status, visual_type, uses_segments')
        .eq('topic_id', topicId)
        .order('scene_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
    refetchInterval: 3_000,
  });

  const scenes = scenesQuery.data || [];
  const usesSegments = scenes.some((s) => s.uses_segments === true);

  // When any scene uses segments, image-gen and Ken Burns write to scene_segments,
  // not scenes. Pull segments so the progress bars reflect the real per-segment state.
  const segmentsQuery = useQuery({
    queryKey: ['scene_segments', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scene_segments')
        .select('id, scene_id, segment_number, image_status, clip_status')
        .eq('topic_id', topicId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId && usesSegments,
    refetchInterval: 3_000,
  });

  const segments = segmentsQuery.data || [];

  // When usesSegments=true, image_status / clip_status writes happen on scene_segments,
  // NOT scenes. Project per-scene status by aggregating that scene's segment statuses,
  // so DotGrid / SceneDetailPanel / FailedScenes (which only know how to read scenes)
  // keep showing accurate progress without code changes.
  const segmentsByScene = {};
  for (const seg of segments) {
    if (!segmentsByScene[seg.scene_id]) segmentsByScene[seg.scene_id] = [];
    segmentsByScene[seg.scene_id].push(seg);
  }
  function aggregate(segs, key) {
    if (!segs || segs.length === 0) return null;
    if (segs.some((s) => s[key] === 'failed')) return 'failed';
    if (segs.every((s) => s[key] === 'uploaded' || s[key] === 'generated')) return 'uploaded';
    if (segs.some((s) => s[key] === 'uploaded' || s[key] === 'generated')) return 'generated';
    return 'pending';
  }
  const projectedScenes = !usesSegments ? scenes : scenes.map((s) => {
    const segs = segmentsByScene[s.id];
    if (!segs) return s; // no segments — leave as-is (legacy/non-segment scene)
    return {
      ...s,
      image_status: aggregate(segs, 'image_status') || s.image_status,
      // Don't override clip_status: scenes.clip_status is the scene-level concat
      // (assembly output) which is distinct from segment kb files. We surface
      // segment-clip progress via stageProgress.assembly only.
    };
  });

  // Compute stage progress
  const stageProgress = computeStageProgress(scenes, segments, usesSegments, topicData);

  // Compute failed scenes (segment-level failures bubble up to their parent scene)
  const failedSegmentSceneIds = new Set(
    segments.filter((s) => s.image_status === 'failed').map((s) => s.scene_id)
  );
  const failedScenes = projectedScenes.filter(
    (s) =>
      s.audio_status === 'failed' ||
      s.image_status === 'failed' ||
      s.video_status === 'failed' ||
      failedSegmentSceneIds.has(s.id)
  );

  return {
    scenes: projectedScenes,
    rawScenes: scenes,
    segments,
    segmentsByScene,
    usesSegments,
    stageProgress,
    failedScenes,
    isLoading: scenesQuery.isLoading || (usesSegments && segmentsQuery.isLoading),
    error: scenesQuery.error || segmentsQuery.error,
  };
}

/**
 * Compute completion counts for each production stage.
 *
 * Audio + script + assembly stay scene-keyed (audio is per-scene, scene-level
 * clip is the final concat). Image and Ken-Burns stages flip to segment counts
 * when usesSegments=true — that's where the writes actually land.
 */
function computeStageProgress(scenes, segments, usesSegments, topicData) {
  const sceneTotal = scenes.length;

  // Script stage: if scenes exist with narration_text, script is complete
  const scriptComplete = scenes.length > 0 && scenes.every((s) => s.narration_text);
  const scriptCompleted = scriptComplete ? sceneTotal : 0;

  const audioCompleted = scenes.filter(
    (s) => s.audio_status === 'uploaded' || s.audio_status === 'generated'
  ).length;

  // Images: count from scene_segments when uses_segments, else from scenes.
  // Under segments architecture, scenes.image_status never flips to 'uploaded' —
  // every Fal.ai response PATCHes scene_segments.image_status instead.
  let imagesCompleted, imagesTotal;
  if (usesSegments) {
    imagesTotal = segments.length || sceneTotal; // fall back to scenes count if segments not loaded yet
    imagesCompleted = segments.filter(
      (s) => s.image_status === 'uploaded' || s.image_status === 'generated'
    ).length;
  } else {
    imagesTotal = sceneTotal;
    imagesCompleted = scenes.filter(
      (s) => s.image_status === 'uploaded' || s.image_status === 'generated'
    ).length;
  }

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

  // Ken Burns / per-clip rendering: also segment-keyed when usesSegments
  // (kb_<topic>_<NNN>_<MM>.mp4 lives on scene_segments.clip_url; the scene-level
  //  concat is built downstream during assembly).
  let clipsCompleted, clipsTotal;
  if (usesSegments) {
    clipsTotal = segments.length || sceneTotal;
    clipsCompleted = segments.filter(
      (s) => s.clip_status === 'complete' || s.clip_status === 'uploaded'
    ).length;
  } else {
    clipsTotal = sceneTotal;
    clipsCompleted = scenes.filter(
      (s) => s.clip_status === 'complete' || s.clip_status === 'uploaded'
    ).length;
  }

  return {
    script: { completed: scriptCompleted, total: sceneTotal },
    audio: { completed: audioCompleted, total: sceneTotal },
    images: { completed: imagesCompleted, total: imagesTotal, granularity: usesSegments ? 'segment' : 'scene' },
    i2v: { completed: i2vCompleted, total: i2vScenes.length },
    t2v: { completed: t2vCompleted, total: t2vScenes.length },
    captions: { completed: captionsCompleted, total: sceneTotal },
    assembly: { completed: clipsCompleted, total: clipsTotal, granularity: usesSegments ? 'segment' : 'scene' },
  };
}
