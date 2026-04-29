import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Cost constants for the hybrid image/video pipeline.
 * Seedream 4.5 for images, Seedance 2.0 Fast for video clips.
 */
const IMAGE_COST = 0.04;
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
 * Compute cost breakdown for a given ratio option and scene count.
 */
export function computeCostOption(sceneCount, option) {
  const imageCount = sceneCount;
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
  const { data: topic, isLoading } = useQuery({
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

  const sceneCount = topic?.scene_count || 0;

  // Pre-compute all 4 options
  const options = RATIO_OPTIONS.map((opt) => computeCostOption(sceneCount, opt));

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
    options,
    isLoading,
    confirmSelection: confirmMutation.mutate,
    isConfirming: confirmMutation.isPending,
  };
}

export { IMAGE_COST, VIDEO_COST, RATIO_OPTIONS };
