import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { webhookCall } from '../lib/api';
import { toast } from 'sonner';

/**
 * Register × Mode compatibility matrix.
 * Values: 'ideal' | 'default' | 'acceptable' | 'not_recommended'
 * Source: video_production/README.md — "Mode × Register recommendations"
 */
export const REGISTER_MODE_COMPAT = {
  REGISTER_01_ECONOMIST: { PURE_STATIC: 'ideal',           LIGHT_MOTION: 'default',  BALANCED: 'acceptable',     KINETIC: 'not_recommended' },
  REGISTER_02_PREMIUM:   { PURE_STATIC: 'not_recommended', LIGHT_MOTION: 'acceptable', BALANCED: 'default',        KINETIC: 'ideal' },
  REGISTER_03_NOIR:      { PURE_STATIC: 'ideal',           LIGHT_MOTION: 'default',  BALANCED: 'acceptable',     KINETIC: 'not_recommended' },
  REGISTER_04_SIGNAL:    { PURE_STATIC: 'acceptable',      LIGHT_MOTION: 'acceptable', BALANCED: 'default',        KINETIC: 'ideal' },
  REGISTER_05_ARCHIVE:   { PURE_STATIC: 'acceptable',      LIGHT_MOTION: 'default',  BALANCED: 'ideal',          KINETIC: 'not_recommended' },
};

export const REGISTER_META = {
  REGISTER_01_ECONOMIST: { name: 'The Economist',       accent: '#F5A623', short: 'Documentary explainer. Authoritative, data-rich.',          refs: ['Johnny Harris', 'Wendover', 'Polymatter'] },
  REGISTER_02_PREMIUM:   { name: 'Premium Authority',   accent: '#D4AF37', short: 'Luxury editorial. Golden, measured, aspirational.',          refs: ['Bloomberg Originals', 'Ben Felix', 'Rolex films'] },
  REGISTER_03_NOIR:      { name: 'Investigative Noir',  accent: '#B32020', short: 'True-crime investigation. Shadows, tension, evidence.',      refs: ['LEMMiNO', 'Netflix Dirty Money', 'Chernobyl'] },
  REGISTER_04_SIGNAL:    { name: 'Signal (Tech Futurist)', accent: '#00D4FF', short: 'Tech/fintech precision. Clinical, HUD-accented, future.',  refs: ['ColdFusion', 'Cleo Abram', 'Apple keynotes'] },
  REGISTER_05_ARCHIVE:   { name: 'Archive',             accent: '#8B6F47', short: 'Historical/biographical/intimate. Warm, patient, sepia.',    refs: ['Magnates Media', 'Ken Burns', 'Business Casual'] },
};

/**
 * Hook for the Register Selector gate.
 *
 * Queries topic for register_recommendations + current production_mode,
 * exposes top-2 recommendations with compatibility status vs the picked Mode,
 * and a mutation to confirm the selection (fires /webhook/register/approve).
 */
export function useRegisterSelector(topicId, projectId) {
  const queryClient = useQueryClient();

  const { data: topic, isLoading } = useQuery({
    queryKey: ['register-selector', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, project_id, seo_title, topic_number, production_mode, production_register, register_recommendations, register_analyzed_at, register_era_detected, register_selected_at, pipeline_stage')
        .eq('id', topicId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(topicId),
    refetchInterval: (query) => {
      // Poll every 5s until recommendations arrive
      const current = query.state.data;
      if (current?.register_recommendations && current.register_analyzed_at) return false;
      return 5000;
    },
  });

  const mode = topic?.production_mode || null;
  const recs = topic?.register_recommendations || null;
  const top2 = recs?.top_2 || [];
  const allRanked = recs?.all_5_ranked || [];
  const era = topic?.register_era_detected || null;

  // Enrich top 2 with compat status vs picked Mode
  const top2Enriched = top2.map((r) => ({
    ...r,
    meta: REGISTER_META[r.register_id] || null,
    compat: mode ? (REGISTER_MODE_COMPAT[r.register_id]?.[mode] || 'acceptable') : null,
  }));

  const confirmMutation = useMutation({
    mutationFn: async ({ registerId }) => {
      const compat = mode ? (REGISTER_MODE_COMPAT[registerId]?.[mode] || 'acceptable') : null;
      const result = await webhookCall('register/approve', {
        topic_id: topicId,
        production_register: registerId,
        compat_status: compat,
      }, { timeoutMs: 30_000 });
      return result;
    },
    onSuccess: (result) => {
      if (result?.success === false) {
        toast.error(result.error || 'Failed to confirm register selection');
        return;
      }
      toast.success('Register confirmed — scene classification starting');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to confirm register selection');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['register-selector', topicId] });
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['scenes', topicId] });
    },
  });

  return {
    topic,
    mode,
    recommendations: recs,
    top2: top2Enriched,
    allRanked,
    era,
    isAnalyzing: !recs,
    isLoading,
    confirmSelection: confirmMutation.mutate,
    isConfirming: confirmMutation.isPending,
  };
}
