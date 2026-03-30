import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { webhookCall } from '../lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch scenes with classification data for a topic, compute stats,
 * and provide mutations for classify / override / accept actions.
 * Subscribes to Supabase Realtime for live classification progress.
 * @param {string} topicId - Topic UUID
 */
export function useSceneClassification(topicId) {
  const queryClient = useQueryClient();

  // Realtime: scenes table for this topic
  useRealtimeSubscription(
    topicId ? 'scenes' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['scene-classification', topicId]]
  );

  // Realtime: topics table for this topic (classification_status changes)
  useRealtimeSubscription(
    topicId ? 'topics' : null,
    topicId ? `id=eq.${topicId}` : null,
    [['topic-classification-status', topicId]]
  );

  // Fetch scenes with classification data
  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ['scene-classification', topicId],
    queryFn: async () => {
      if (!topicId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, narration_text, image_prompt, render_method, remotion_template, data_payload, classification_reasoning, classification_status')
        .eq('topic_id', topicId)
        .order('scene_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });

  // Fetch topic classification status
  const { data: topicData } = useQuery({
    queryKey: ['topic-classification-status', topicId],
    queryFn: async () => {
      if (!topicId) return null;
      const { data, error } = await supabase
        .from('topics')
        .select('classification_status, project_id')
        .eq('id', topicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });

  // Compute stats
  const stats = {
    total: scenes.length,
    falAiCount: scenes.filter((s) => s.render_method === 'fal_ai').length,
    remotionCount: scenes.filter((s) => s.render_method === 'remotion').length,
    classifiedCount: scenes.filter(
      (s) =>
        s.classification_status === 'classified' ||
        s.classification_status === 'reviewed' ||
        s.classification_status === 'overridden'
    ).length,
    estimatedCost: scenes.filter((s) => s.render_method === 'fal_ai').length * 0.03,
    savings: scenes.filter((s) => s.render_method === 'remotion').length * 0.03,
  };

  // Trigger classification workflow
  const classifyMutation = useMutation({
    mutationFn: async (tid) =>
      webhookCall('classify-scenes', { topic_id: tid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-classification', topicId] });
      queryClient.invalidateQueries({ queryKey: ['topic-classification-status', topicId] });
    },
  });

  // Override a scene's render method
  const overrideMutation = useMutation({
    mutationFn: async ({ sceneId, renderMethod, remotionTemplate, dataPayload }) => {
      const updates = {
        render_method: renderMethod,
        remotion_template: renderMethod === 'remotion' ? remotionTemplate : null,
        data_payload: renderMethod === 'remotion' ? dataPayload : null,
        classification_status: 'overridden',
      };
      const { error } = await supabase
        .from('scenes')
        .update(updates)
        .eq('id', sceneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-classification', topicId] });
    },
  });

  // Accept classification and proceed to image generation
  const acceptMutation = useMutation({
    mutationFn: async (tid) => {
      const { error } = await supabase
        .from('topics')
        .update({ classification_status: 'reviewed' })
        .eq('id', tid);
      if (error) throw error;
      await webhookCall('production/trigger', {
        topic_id: tid,
        action: 'generate_images',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-classification-status', topicId] });
    },
  });

  return {
    scenes,
    stats,
    topicStatus: topicData?.classification_status || 'pending',
    isLoading,
    classifyScenes: (tid) => classifyMutation.mutate(tid || topicId),
    isClassifying: classifyMutation.isPending,
    overrideScene: (params) => overrideMutation.mutate(params),
    acceptClassification: (tid) => acceptMutation.mutate(tid || topicId),
    isAccepting: acceptMutation.isPending,
  };
}
