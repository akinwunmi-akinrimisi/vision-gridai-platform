import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Palette, Sparkles, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '../../lib/supabase';
import { useStyleDnaTemplates, useSelectStyleDna, recommendStyleDnaKey } from '../../hooks/useStyleDnaTemplates';

function useProjectStyleRow(projectId) {
  return useQuery({
    queryKey: ['project-style', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, niche, niche_category, niche_input, niche_description, channel_style, style_dna, style_dna_template_key')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    refetchInterval: 5_000,
  });
}

/**
 * StyleDnaSelector
 *
 * Pipeline gate component shown alongside CostCalculator. Until both
 * gates clear, production won't fire.
 *
 * Renders 4 cards (one per Style DNA template seeded by migration 040):
 *   - Historical / Period Drama
 *   - Modern Finance / Premium
 *   - Tech / Futuristic
 *   - Warm Human / Inspirational
 *
 * One template is highlighted as "Recommended" based on the project's
 * niche signals (recommendStyleDnaKey). The user can override.
 *
 * Per CLAUDE.md, Style DNA is locked-per-project — once selected it
 * gets appended to every image prompt for visual consistency. The
 * picker hides itself once `projects.style_dna` is non-null.
 */

const PALETTE_BY_KEY = {
  historical:     'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40',
  modern_finance: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40',
  tech:           'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/40',
  inspirational:  'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40',
};

const LABEL_BY_KEY = {
  historical:     'Historical / Period Drama',
  modern_finance: 'Modern Finance / Premium',
  tech:           'Tech / Futuristic',
  inspirational:  'Warm Human / Inspirational',
};

const TAGLINE_BY_KEY = {
  historical:     'Cinematic film grain · chiaroscuro lighting · desaturated palette',
  modern_finance: 'Clean minimalist · premium luxury · soft studio lighting',
  tech:           'Cool blue-purple · glass and steel · neon accents',
  inspirational:  'Golden hour · earth tones · intimate documentary feel',
};

/**
 * @param {object} props
 * @param {string} props.projectId - The project UUID. Component fetches its own
 *                                   project row via sb_query (projects table is in
 *                                   the dashboard read allowlist).
 */
export default function StyleDnaSelector({ projectId }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const { data: project, isLoading: projectLoading } = useProjectStyleRow(projectId);
  const { data: templates = [], isLoading: templatesLoading } = useStyleDnaTemplates();
  const selectMutation = useSelectStyleDna();
  const isLoading = projectLoading || templatesLoading;

  // Already locked? Render a small confirmation strip instead of the picker.
  const alreadyLocked = !!project?.style_dna && !!project?.style_dna_template_key;

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (alreadyLocked) {
    const key = project.style_dna_template_key;
    return (
      <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-4 sm:p-5 flex items-center gap-3">
        <Lock className="w-4 h-4 text-success flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">
            Image style locked: {LABEL_BY_KEY[key] || key}
          </p>
          <p className="text-2xs text-muted-foreground truncate">
            {TAGLINE_BY_KEY[key] || 'Custom style DNA'}
          </p>
        </div>
        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
      </div>
    );
  }

  const recommendedKey = recommendStyleDnaKey(project, templates);

  const handleConfirm = () => {
    if (!selectedKey) return;
    const tpl = templates.find((t) => t.template_key === selectedKey);
    if (!tpl) return;
    selectMutation.mutate({
      projectId: project.id,
      templateKey: tpl.template_key,
      bodyText: tpl.body_text,
    });
  };

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Select Image Style DNA</h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              This style locks for the entire project — applied to every scene image for visual consistency.
            </p>
          </div>
        </div>
        {recommendedKey && (
          <div className="flex items-center gap-1 text-2xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-md px-2 py-1">
            <Sparkles className="w-3 h-3" />
            <span className="font-medium">Recommended: {LABEL_BY_KEY[recommendedKey].split(' /')[0]}</span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {templates.map((tpl) => {
          const isSelected = selectedKey === tpl.template_key;
          const isRecommended = recommendedKey === tpl.template_key;
          const palette = PALETTE_BY_KEY[tpl.template_key] || 'bg-muted/30 border-border';
          const label = LABEL_BY_KEY[tpl.template_key] || tpl.template_key;
          const tagline = TAGLINE_BY_KEY[tpl.template_key] || '';

          return (
            <button
              key={tpl.template_key}
              type="button"
              onClick={() => setSelectedKey(tpl.template_key)}
              className={cn(
                'relative text-left rounded-lg border-2 p-4 transition-all hover:shadow-md',
                palette,
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 shadow-md'
                  : 'border-transparent hover:border-foreground/20'
              )}
              data-testid={`style-card-${tpl.template_key}`}
            >
              {isRecommended && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <Sparkles className="w-2.5 h-2.5" />
                  RECOMMENDED
                </div>
              )}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
              <h4 className="text-xs font-bold mb-1 pr-6">{label}</h4>
              <p className="text-2xs text-muted-foreground/90 mb-2 leading-snug">{tagline}</p>
              {tpl.description && (
                <p className="text-2xs text-muted-foreground/70 leading-snug line-clamp-3">
                  {tpl.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
        <p className="text-2xs text-muted-foreground">
          {selectedKey
            ? `"${LABEL_BY_KEY[selectedKey]}" will be applied to all images for this project.`
            : 'Pick a style to continue.'}
        </p>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={!selectedKey || selectMutation.isPending}
          data-testid="style-confirm-button"
        >
          {selectMutation.isPending ? 'Saving...' : 'Lock Style'}
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
