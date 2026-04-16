import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { updateProjectSettings } from '../lib/settingsApi';

const SETTINGS_COLUMNS = [
  'name',
  'niche',
  'niche_description',
  'script_approach',
  'images_per_video',
  'target_word_count',
  'target_scene_count',
  'image_model',
  'image_cost',
  'i2v_model',
  'i2v_cost_per_second',
  'i2v_clip_duration_seconds',
  'youtube_channel_id',
  'youtube_playlist1_id',
  'youtube_playlist2_id',
  'youtube_playlist3_id',
  'drive_root_folder_id',
  'drive_assets_folder_id',
  'auto_pilot_enabled',
  'auto_pilot_topic_threshold',
  'auto_pilot_script_threshold',
  'auto_pilot_default_visibility',
  'monthly_budget_usd',
  'music_enabled',
  'music_volume',
  'music_mood_override',
  'music_source',
  'music_prefs_updated_at',
].join(', ');

/**
 * Fetch per-project settings from the projects table.
 * Subscribes to Realtime for live updates after saves.
 *
 * @param {string} projectId - Project UUID
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useProjectSettings(projectId) {
  useRealtimeSubscription(
    'projects',
    projectId ? `id=eq.${projectId}` : null,
    [['project-settings', projectId]]
  );

  return useQuery({
    queryKey: ['project-settings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(SETTINGS_COLUMNS)
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

/**
 * Mutation hook for saving project settings via n8n webhook.
 * Invalidates the project-settings query on completion.
 *
 * @param {string} projectId - Project UUID
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useUpdateSettings(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fields) => updateProjectSettings(projectId, fields),

    onSuccess: () => {
      toast.success('Settings saved');
    },

    onError: (err) => {
      toast.error(err?.message || 'Failed to save settings');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
    },
  });
}
