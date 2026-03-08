import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch niche profile for a given project.
 * @param {string} projectId - Project UUID
 */
export function useNicheProfile(projectId) {
  return useQuery({
    queryKey: ['niche-profile', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niche_profiles')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error) {
        // PGRST116 = no rows found -- not an error for our use case
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single project by ID with Realtime subscription.
 * @param {string} projectId - Project UUID
 */
export function useProject(projectId) {
  useRealtimeSubscription(
    projectId ? 'projects' : null,
    projectId ? `id=eq.${projectId}` : null,
    [['project', projectId]]
  );

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
