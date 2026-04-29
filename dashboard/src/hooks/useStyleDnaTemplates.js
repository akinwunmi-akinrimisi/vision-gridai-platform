import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Fetch the 4 active Style DNA templates from prompt_templates.
 *
 * Templates seeded by migration 040 with these template_keys:
 *   - historical       (Historical / Period Drama)
 *   - modern_finance   (Modern Finance / Premium)
 *   - tech             (Tech / Futuristic)
 *   - inspirational    (Warm Human / Inspirational)
 *
 * Each row has body_text (the actual style DNA prompt) + description.
 * The picked template's body_text is copied into projects.style_dna,
 * which gets appended to every image prompt during scene image generation.
 */
export function useStyleDnaTemplates() {
  return useQuery({
    queryKey: ['style-dna-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('id, template_key, body_text, description, version, is_active')
        .eq('template_type', 'style_dna')
        .eq('is_active', true)
        .order('template_key', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // templates are seeded — rarely change
  });
}

/**
 * Mutation: copy a Style DNA template's body_text into projects.style_dna.
 * Style DNA is locked-per-project per CLAUDE.md, so this should only be set once
 * per project (UI prevents reselection by hiding the picker after first save).
 *
 * @returns mutation: ({ projectId, templateKey, bodyText }) => void
 */
export function useSelectStyleDna() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, templateKey, bodyText }) => {
      if (!projectId) throw new Error('projectId is required');
      if (!templateKey || !bodyText) throw new Error('templateKey and bodyText required');

      const { error } = await supabase
        .from('projects')
        .update({
          style_dna: bodyText,
          style_dna_template_key: templateKey,
        })
        .eq('id', projectId);
      if (error) throw error;
      return { projectId, templateKey };
    },
    onSuccess: ({ projectId }) => {
      toast.success('Image style locked for this project');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['cost-calculator'] });
      queryClient.invalidateQueries({ queryKey: ['topic-detail'] });
    },
    onError: (e) => {
      toast.error(`Couldn't save image style: ${e.message || 'unknown error'}`);
    },
  });
}

/**
 * Recommend a Style DNA template based on project niche signals.
 *
 * Priority order (first match wins):
 *   1. niche_category contains 'history|historical|period|ancient|war|biographical' → historical
 *   2. niche_category contains 'tech|ai|crypto|software|startup|silicon' → tech
 *   3. niche_category contains 'wellness|mindfulness|family|parenting|relationship|inspiration|self_improvement' → inspirational
 *   4. niche_category contains 'finance|super|pension|retire|invest|money|wealth|tax|bank' OR fallback → modern_finance
 *
 * Returns the recommended template_key or null if templates haven't loaded yet.
 *
 * @param {object} project - row with niche_category, niche, niche_input fields
 * @param {Array}  templates - templates from useStyleDnaTemplates
 * @returns {string|null} recommended template_key
 */
export function recommendStyleDnaKey(project, templates) {
  if (!templates || templates.length === 0) return null;
  const blob = [
    project?.niche,
    project?.niche_description,
    project?.channel_style,
    project?.niche_expertise_profile,
    project?.niche_blue_ocean_strategy,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const has = (...words) => words.some((w) => blob.includes(w));

  if (has('history', 'historical', 'period', 'ancient', 'biograph', 'war', 'civil war', 'dynasty', 'empire')) {
    return 'historical';
  }
  if (has('tech', ' ai ', 'a.i.', 'crypto', 'software', 'startup', 'silicon valley', 'saas', 'cyber', 'algorithm')) {
    return 'tech';
  }
  if (has('wellness', 'mindful', 'family', 'parent', 'relationship', 'inspiration', 'self improv', 'self_improv', 'spiritual', 'faith')) {
    return 'inspirational';
  }
  // Default for finance, retirement, super, pension, investing, business, money — and also
  // catch-all for unrecognised niches (the safest documentary-finance baseline).
  return 'modern_finance';
}
