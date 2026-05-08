import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Cost constants for the hybrid image/video pipeline.
 *
 * Image generation routes per-scene in WF_SCENE_IMAGE_PROCESSOR (2026-05-07 v4):
 *   requires_text_rendering=true (set at script-gen) -> fal-ai/recraft-v3   ($0.04/img)
 *                                                        fallback ideogram-v2 ($0.08/img)
 *   requires_text_rendering=false                    -> fal-ai/flux/schnell ($0.003/img)
 *
 * Both providers are Fal.ai (one auth, one rate-limit lane). Earlier hybrid
 * (FLUX + GPT-5 via OpenRouter) was retired after the 2026-05-07 routing-bug
 * incident; keyword-only fallback was niche-tuned and missed 35+ text scenes
 * on topic 4. Source-of-truth is now the per-scene flag set by Claude during
 * Visual Assignment.
 *
 * IMAGE_COST is a BLENDED estimate using TEXT_SCENE_RATIO (default 30% —
 * higher than the old 15% because Recraft is reliable enough that we no
 * longer over-conserve). Actual spend per scene is recorded on
 * scenes.image_cost_usd at gen-time.
 *
 * Video clips: Seedance 2.0 Fast (10s clip @ 720p, $2.419/clip).
 */
const IMAGE_COST_PHOTO = 0.003;   // fal-ai/flux/schnell (no-text scenes)
const IMAGE_COST_TEXT = 0.04;     // fal-ai/recraft-v3 (text-in-image scenes)
const TEXT_SCENE_RATIO = 0.30;    // estimated % of scenes needing text rendering
const IMAGE_COST = (1 - TEXT_SCENE_RATIO) * IMAGE_COST_PHOTO + TEXT_SCENE_RATIO * IMAGE_COST_TEXT;
const VIDEO_COST = 2.419;

/**
 * Predefined ratio options for the cost calculator.
 * All scenes get images. Video cost is additional for video scenes.
 */
const RATIO_OPTIONS = [
  { label: '100% / 0%', imageRatio: 1.0, videoRatio: 0.0, ratioKey: '100_0', mode: 'PURE_STATIC' },
  { label: '95% / 5%', imageRatio: 0.95, videoRatio: 0.05, ratioKey: '95_5', mode: 'LIGHT_MOTION' },
  { label: '90% / 10%', imageRatio: 0.90, videoRatio: 0.10, ratioKey: '90_10', mode: 'BALANCED' },
  { label: '85% / 15%', imageRatio: 0.85, videoRatio: 0.15, ratioKey: '85_15', mode: 'KINETIC' },
];

/**
 * Variable-pace segment targets per emotional_beat — must stay in sync with
 * WF_BUILD_SEGMENTS.targetSecondsForBeat() (id BYdbUw8xSA6YQEpA, Code L25-30).
 * Each scene rotates a new image every N seconds where N depends on the beat.
 */
const TARGET_SEC_BY_BEAT = {
  data: 5,
  revelation: 5,
  hook: 8,
  tension: 8,
  story: 8,
  resolution: 12,
  transition: 12,
};
const DEFAULT_TARGET_SEC = 8;
const WPM = 150;

/**
 * Project total image count = sum of segments across all scenes.
 *
 * Each scene's audio_duration_sec is either (a) the actual scene.audio_duration_ms
 * once TTS has run, or (b) estimated from the scene's narration word count at
 * 150 wpm if TTS is still pending. Per-scene segment count is then
 *   N = ceil(audio_sec / TARGET_SEC_BY_BEAT[scene.emotional_beat])
 * and total imageCount = Σ N. This matches WF_BUILD_SEGMENTS exactly.
 *
 * Fallback if scenes data isn't available: degrade gracefully to scene_count
 * (legacy 1-image-per-scene assumption — rare; only happens if the hook fires
 * before the scenes table is queryable).
 */
export function projectSegmentCount(scenes, fallbackSceneCount) {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return fallbackSceneCount || 0;
  }
  let total = 0;
  for (const s of scenes) {
    const target = TARGET_SEC_BY_BEAT[s.emotional_beat] || DEFAULT_TARGET_SEC;
    let audioSec;
    if (s.audio_duration_ms && s.audio_duration_ms > 0) {
      audioSec = s.audio_duration_ms / 1000;
    } else {
      const wordCount = s.narration_text ? s.narration_text.trim().split(/\s+/).filter(Boolean).length : 0;
      audioSec = wordCount > 0 ? (wordCount / WPM) * 60 : 0;
    }
    if (audioSec <= 0) {
      total += 1;
      continue;
    }
    total += Math.max(1, Math.ceil(audioSec / target));
  }
  return total;
}

/**
 * Compute cost breakdown for a given ratio option, scene count, and projected
 * segment count. Image count = segments (one image per scene_segment row in
 * the live pipeline). Video count = ratio applied to scenes (videos remain
 * scene-grain — they overlay the entire scene's audio, not per-segment).
 */
export function computeCostOption(sceneCount, option, segmentCount) {
  const imageCount = segmentCount > 0 ? segmentCount : sceneCount;
  const videoCount = Math.round(sceneCount * option.videoRatio);
  const imageCost = imageCount * IMAGE_COST;
  const videoCost = videoCount * VIDEO_COST;
  const totalCost = imageCost + videoCost;

  return {
    ...option,
    imageCount,
    videoCount,
    imageCost,
    videoCost,
    totalCost,
  };
}

/**
 * Hook for the cost calculator gate.
 * Queries topic data, computes all 4 cost options, and provides a mutation
 * to confirm the selection and resume the pipeline.
 *
 * @param {string} topicId - Topic UUID
 * @param {string} projectId - Project UUID for cache invalidation
 * @returns {{ topic, sceneCount, options, selectedRatio, setSelectedRatio, confirmSelection, isConfirming }}
 */
export function useCostCalculator(topicId, projectId) {
  const queryClient = useQueryClient();

  // Fetch topic to get scene_count and current cost selection state
  const { data: topic, isLoading: isLoadingTopic } = useQuery({
    queryKey: ['cost-calculator', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, project_id, scene_count, video_ratio, estimated_image_cost, estimated_video_cost, estimated_total_media_cost, cost_option_selected_at, pipeline_stage, seo_title, topic_number')
        .eq('id', topicId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });

  // Fetch scenes' beat + narration so we can project segments. The cost
  // calculator runs BEFORE TTS, so audio_duration_ms is usually NULL —
  // projectSegmentCount() falls back to estimating audio from word count.
  // Once TTS has run (resume scenarios), audio_duration_ms is the source of truth.
  const { data: scenes, isLoading: isLoadingScenes } = useQuery({
    queryKey: ['cost-calculator-scenes', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, emotional_beat, audio_duration_ms, narration_text')
        .eq('topic_id', topicId)
        .order('scene_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });

  const sceneCount = topic?.scene_count || 0;
  const segmentCount = projectSegmentCount(scenes, sceneCount);
  const isLoading = isLoadingTopic || isLoadingScenes;

  // Pre-compute all 4 options using projected segment count for image cost
  const options = RATIO_OPTIONS.map((opt) => computeCostOption(sceneCount, opt, segmentCount));

  // Confirm selection mutation
  const confirmMutation = useMutation({
    mutationFn: async ({ selectedIndex }) => {
      const option = options[selectedIndex];
      if (!option) throw new Error('Invalid option selected');

      // GATE: Style DNA must be locked before production can begin. Reading the
      // single project row is cheap (one indexed lookup); refusing here is much
      // safer than letting the pipeline start with an empty style and producing
      // 155 inconsistent images.
      const { data: projRow, error: projErr } = await supabase
        .from('projects')
        .select('style_dna')
        .eq('id', projectId)
        .single();
      if (projErr) throw projErr;
      if (!projRow?.style_dna) {
        throw new Error('Pick an image style first — production needs it locked before scenes generate.');
      }

      // 1. PATCH topics with cost selection fields
      // NOTE: pipeline_stage='register_selection' hands off to RegisterSelector next.
      // Scene classification no longer fires here — it runs after register pick.
      const { error: patchError } = await supabase
        .from('topics')
        .update({
          video_ratio: option.ratioKey,
          production_mode: option.mode,
          estimated_image_cost: option.imageCost,
          estimated_video_cost: option.videoCost,
          estimated_total_media_cost: option.totalCost,
          cost_option_selected_at: new Date().toISOString(),
          pipeline_stage: 'register_selection',
        })
        .eq('id', topicId);

      if (patchError) throw patchError;

      // 2. INSERT snapshot of all 4 options into cost_calculator_snapshots
      const { error: insertError } = await supabase
        .from('cost_calculator_snapshots')
        .insert({
          topic_id: topicId,
          project_id: projectId,
          scene_count: sceneCount,
          selected_ratio: option.ratioKey,
          options_snapshot: options.map((o) => ({
            label: o.label,
            imageRatio: o.imageRatio,
            videoRatio: o.videoRatio,
            ratioKey: o.ratioKey,
            mode: o.mode,
            imageCount: o.imageCount,
            videoCount: o.videoCount,
            imageCost: o.imageCost,
            videoCost: o.videoCost,
            totalCost: o.totalCost,
          })),
        });

      // Snapshot insert is non-critical; log but don't block
      if (insertError) {
        console.warn('Cost snapshot insert failed:', insertError.message);
      }

      return { success: true, mode: option.mode };
    },

    onSuccess: (result) => {
      toast.success(`Mode ${result.mode} selected — pick a production register next`);
    },

    onError: (err) => {
      toast.error(err?.message || 'Failed to confirm cost selection');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-calculator', topicId] });
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['scenes', topicId] });
    },
  });

  return {
    topic,
    sceneCount,
    segmentCount,
    options,
    isLoading,
    confirmSelection: confirmMutation.mutate,
    isConfirming: confirmMutation.isPending,
  };
}

export { IMAGE_COST, IMAGE_COST_PHOTO, IMAGE_COST_TEXT, TEXT_SCENE_RATIO, VIDEO_COST, RATIO_OPTIONS, TARGET_SEC_BY_BEAT };
