import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/* ================================================================== */
/*  QUERIES — audience_insights (latest weekly synthesis per project)  */
/* ================================================================== */

/**
 * Fetch the most recent weekly audience_insights row for a project.
 * Subscribes to Realtime so a fresh synthesis surfaces automatically.
 */
export function useLatestAudienceInsights(projectId) {
  useRealtimeSubscription(
    projectId ? 'audience_insights' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['audience-insights-latest', projectId]],
  );

  return useQuery({
    queryKey: ['audience-insights-latest', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audience_insights')
        .select(
          'id, project_id, week_of, comments_analyzed, questions_count, complaints_count, praise_count, suggestions_count, noise_count, recurring_questions, content_complaints, topic_suggestions, audience_persona_summary, dominant_persona_traits, vocabulary_level, assumed_prior_knowledge, frequent_objections, audience_context_block, generated_by, synthesis_cost_usd, created_at',
        )
        .eq('project_id', projectId)
        .order('week_of', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!projectId,
  });
}

/**
 * Optional: history of the last N weekly insights for sparkline usage.
 */
export function useAudienceInsightsHistory(projectId, { weeks = 8 } = {}) {
  return useQuery({
    queryKey: ['audience-insights-history', projectId, weeks],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audience_insights')
        .select(
          'id, week_of, comments_analyzed, questions_count, complaints_count, praise_count, suggestions_count',
        )
        .eq('project_id', projectId)
        .order('week_of', { ascending: false })
        .limit(weeks);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ================================================================== */
/*  MUTATION — run WF_AUDIENCE_INTELLIGENCE                             */
/* ================================================================== */

export function useRunAudienceIntelligence(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      webhookCall('audience/intelligence', { project_id: projectId, force: true }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['audience-insights-latest', projectId] });
      qc.invalidateQueries({ queryKey: ['audience-insights-history', projectId] });
    },
  });
}

/* ================================================================== */
/*  MUTATION — promote a suggested topic to daily_ideas                 */
/* ================================================================== */

/**
 * Inserts an out-of-batch daily_ideas row derived from an audience suggestion.
 * `suggestion` is an item from audience_insights.topic_suggestions JSONB.
 */
export function usePromoteAudienceSuggestion(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestion, week_of }) => {
      if (!suggestion?.suggested_title) {
        throw new Error('Suggestion missing suggested_title');
      }

      const occurrence = Number(suggestion.occurrence_count) || 1;
      const demand = Number(suggestion.demand_signal);
      const combined = Number.isFinite(demand) ? Math.max(0, Math.min(100, Math.round(demand))) : null;

      const payload = {
        project_id: projectId,
        run_date: new Date().toISOString().slice(0, 10),
        batch_id: crypto.randomUUID(),
        position_in_batch: null,
        idea_title: suggestion.suggested_title,
        idea_angle: suggestion.seed_question
          ? `Audience request \u2014 ${suggestion.seed_question}`
          : 'Surfaced from audience memory',
        viral_potential_score: null,
        seo_opportunity_score: null,
        rpm_fit_score: null,
        combined_score: combined,
        rationale: `Surfaced from audience_insights${week_of ? ` (week of ${week_of})` : ''}; ${occurrence} audience member${occurrence === 1 ? '' : 's'} asked about this.`,
        source_signals: {
          audience_question: suggestion.seed_question || null,
          occurrence_count: occurrence,
        },
        status: 'saved',
        status_changed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('daily_ideas')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily-ideas'] });
      qc.invalidateQueries({ queryKey: ['daily-ideas-summary', projectId] });
    },
  });
}

/* ================================================================== */
/*  MUTATION — create a minimal topics row from a suggestion            */
/* ================================================================== */

export function useCreateTopicFromSuggestion(projectId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestion }) => {
      if (!suggestion?.suggested_title) {
        throw new Error('Suggestion missing suggested_title');
      }

      // Compute next topic_number (topics.topic_number is NOT NULL)
      const { data: maxRow } = await supabase
        .from('topics')
        .select('topic_number')
        .eq('project_id', projectId)
        .order('topic_number', { ascending: false })
        .limit(1)
        .single();
      const nextNumber = (maxRow?.topic_number || 0) + 1;

      const topicPayload = {
        project_id: projectId,
        topic_number: nextNumber,
        seo_title: suggestion.suggested_title,
        original_title: suggestion.suggested_title,
        narrative_hook: suggestion.seed_question || null,
        review_status: 'pending',
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('topics')
        .insert(topicPayload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['topics', projectId] });
      qc.invalidateQueries({ queryKey: ['topic-intelligence', projectId] });
    },
  });
}
