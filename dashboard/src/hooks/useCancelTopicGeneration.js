import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

/**
 * Cancel an in-flight topic generation.
 *
 * Resets project.status back to `ready_for_topics` and wipes any pending
 * topic/avatar rows the workflow already inserted. The in-flight n8n
 * execution may continue briefly; the paired filter on the workflow's final
 * status PATCH (status=eq.generating_topics) prevents it from overwriting
 * the cancelled state.
 */
export function useCancelTopicGeneration(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('projectId required');

      const { error: avErr } = await supabase
        .from('avatars')
        .delete()
        .eq('project_id', projectId);
      if (avErr) throw avErr;

      const { error: tErr } = await supabase
        .from('topics')
        .delete()
        .eq('project_id', projectId);
      if (tErr) throw tErr;

      const { error: pErr } = await supabase
        .from('projects')
        .update({ status: 'ready_for_topics', error_log: null })
        .eq('id', projectId);
      if (pErr) throw pErr;

      return { cancelled: true };
    },
    onSuccess: () => {
      toast.success('Topic generation cancelled');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      toast.error(`Cancel failed: ${err.message}`);
    },
  });
}
