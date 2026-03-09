import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { updatePrompt as apiUpdatePrompt, revertPrompt as apiRevertPrompt, regenerateAllPrompts } from '../lib/settingsApi';
import { toast } from 'sonner';

/**
 * Fetch active prompt_configs for a project from Supabase.
 * Subscribes to Realtime for live updates.
 */
export function usePromptConfigs(projectId) {
  useRealtimeSubscription(
    'prompt_configs',
    projectId ? `project_id=eq.${projectId}` : null,
    [['prompt-configs', projectId]]
  );

  return useQuery({
    queryKey: ['prompt-configs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_configs')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('prompt_type');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Mutations for prompt config operations: update, revert, regenerate all.
 */
export function usePromptMutations(projectId) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['prompt-configs', projectId] });
  };

  const updatePrompt = useMutation({
    mutationFn: ({ promptId, promptText }) => apiUpdatePrompt(promptId, promptText),
    onSuccess: () => {
      toast.success('Prompt updated');
      invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to update prompt: ${err.message}`);
    },
    onSettled: invalidate,
  });

  const revertPrompt = useMutation({
    mutationFn: ({ promptId, version }) => apiRevertPrompt(promptId, version),
    onSuccess: () => {
      toast.success('Prompt reverted');
      invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to revert prompt: ${err.message}`);
    },
    onSettled: invalidate,
  });

  const regenerateAll = useMutation({
    mutationFn: () => regenerateAllPrompts(projectId),
    onSuccess: () => {
      toast.success('All prompts regenerated');
      invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to regenerate prompts: ${err.message}`);
    },
    onSettled: invalidate,
  });

  return { updatePrompt, revertPrompt, regenerateAll };
}
