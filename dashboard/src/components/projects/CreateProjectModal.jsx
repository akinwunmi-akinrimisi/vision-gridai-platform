import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Microscope } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useCreateProject } from '../../hooks/useProjects';
import { useCountryTab } from '../../hooks/useCountryTab';

const EXAMPLE_HINTS = [
  'e.g., US Credit Cards',
  'e.g., Stoic Philosophy',
  'e.g., True Crime',
  'e.g., Personal Finance',
  'e.g., Space Exploration',
];

export default function CreateProjectModal({ open, onOpenChange, prefillNiche, prefillDescription, analysisIds }) {
  const [niche, setNiche] = useState('');
  const [description, setDescription] = useState('');
  const [targetVideoCount, setTargetVideoCount] = useState(25);
  const [hintIndex, setHintIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);

  const [nicheBlurred, setNicheBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Research picker state
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedResultId, setSelectedResultId] = useState('');

  const createProject = useCreateProject();
  const { isAU } = useCountryTab();

  // AU-specific fields. Default values match Strategy §11.1 hub config.
  const [auChannelType, setAuChannelType] = useState('hub');
  const [auParentProjectId, setAuParentProjectId] = useState('');
  const [auCostCeiling, setAuCostCeiling] = useState(8);
  const [auNicheVariants, setAuNicheVariants] = useState([
    'credit_cards_au',
    'super_au',
    'property_mortgage_au',
    'tax_au',
    'etf_investing_au',
  ]);

  // Fetch AU hub projects for spoke selection (only relevant when channel_type=spoke)
  const { data: auHubs } = useQuery({
    queryKey: ['au-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('country_target', 'AU')
        .eq('channel_type', 'hub');
      if (error) throw error;
      return data || [];
    },
    enabled: open && isAU && auChannelType === 'spoke',
  });

  // Fetch the latest complete research run (across all projects)
  const { data: latestRun } = useQuery({
    queryKey: ['latest-complete-run'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_runs')
        .select('id')
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch categories for the latest run
  const { data: categories } = useQuery({
    queryKey: ['research-categories', latestRun?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_categories')
        .select('id, label, result_count')
        .eq('run_id', latestRun.id)
        .order('rank', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!latestRun?.id,
  });

  // Fetch results (topics) within the selected category
  const { data: categoryResults } = useQuery({
    queryKey: ['research-results-for-category', latestRun?.id, selectedCategoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_results')
        .select('id, ai_video_title, raw_text, source')
        .eq('run_id', latestRun.id)
        .eq('category_id', selectedCategoryId)
        .order('engagement_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!latestRun?.id && !!selectedCategoryId,
  });

  // Prefill from Research page "Use This Topic"
  useEffect(() => {
    if (open && prefillNiche) setNiche(prefillNiche);
    if (open && prefillDescription) setDescription(prefillDescription);
  }, [open, prefillNiche, prefillDescription]);

  // Cycle placeholder hints every 3 seconds
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % EXAMPLE_HINTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [open]);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setNiche('');
      setDescription('');
      setTargetVideoCount(25);
      setShowSuccess(false);
      setNicheBlurred(false);
      setSubmitAttempted(false);
      setSelectedCategoryId('');
      setSelectedResultId('');
    }
  }, [open]);

  // When a research result is selected, auto-fill niche + description
  const handleResultSelect = (resultId) => {
    setSelectedResultId(resultId);
    if (!resultId || !categoryResults) return;
    const result = categoryResults.find((r) => r.id === resultId);
    if (result) {
      if (result.ai_video_title) setNiche(result.ai_video_title);
      if (result.raw_text) setDescription(result.raw_text.slice(0, 500));
    }
  };

  // When category changes, reset the result selection
  const handleCategorySelect = (catId) => {
    setSelectedCategoryId(catId);
    setSelectedResultId('');
  };

  const nicheError = (nicheBlurred || submitAttempted) && niche.trim().length < 3
    ? 'Niche name must be at least 3 characters'
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!niche.trim() || niche.trim().length < 3) return;

    try {
      const payload = {
        niche: niche.trim(),
        description: description.trim() || undefined,
        target_video_count: targetVideoCount,
        reference_analyses: analysisIds || undefined,
      };

      // Inject AU overlay fields when the AU tab is active
      if (isAU) {
        payload.country_target = 'AU';
        payload.language = 'en-AU';
        payload.channel_type = auChannelType;
        if (auChannelType === 'spoke' && auParentProjectId) {
          payload.parent_project_id = auParentProjectId;
        }
        payload.cost_ceiling_usd = auCostCeiling;
        payload.au_niche_variants = auNicheVariants;  // Backend reads this to seed sub-niche weights
      }

      await createProject.mutateAsync(payload);

      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      toast.error(err?.message || 'Failed to create project. Please try again.');
    }
  };

  const isSubmitting = createProject.isPending;
  const isValid = niche.trim().length >= 3;

  return (
    <Dialog
      open={open}
      onOpenChange={isSubmitting || showSuccess ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-md border-border">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Enter a niche to start researching. The system will analyze competitors, audience, and opportunities.
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8" data-testid="success-state">
            <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mb-4 animate-fade-in">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-base font-semibold">Project created!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Research is starting automatically...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Research picker (optional) */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Microscope className="w-4 h-4" />
                From Research
                <span className="text-xs">(optional)</span>
              </div>

              {latestRun ? (
                <>
                  <div className="space-y-2">
                    <Select
                      value={selectedCategoryId}
                      onValueChange={handleCategorySelect}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories || []).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label} ({cat.result_count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedResultId}
                      onValueChange={handleResultSelect}
                      disabled={isSubmitting || !selectedCategoryId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select topic..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(categoryResults || []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.ai_video_title || r.raw_text?.slice(0, 60)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">
                    -- or enter manually below --
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No research data yet.{' '}
                  <Link
                    to="/research"
                    onClick={() => onOpenChange(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Run Research &rarr;
                  </Link>
                </p>
              )}
            </div>

            {/* Niche name */}
            <div className="space-y-1.5">
              <label
                htmlFor="niche-name"
                className="block text-sm font-medium"
              >
                Niche Name <span className="text-danger">*</span>
              </label>
              <Input
                ref={inputRef}
                id="niche-name"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onBlur={() => setNicheBlurred(true)}
                disabled={isSubmitting}
                placeholder={EXAMPLE_HINTS[hintIndex]}
                className={nicheError ? 'border-danger focus-visible:ring-danger' : ''}
              />
              {nicheError && (
                <p className="text-danger text-xs mt-1">{nicheError}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="niche-description"
                className="block text-sm font-medium"
              >
                Description{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="niche-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder="Brief description of the niche and target audience..."
              />
            </div>

            {/* Target video count */}
            <div className="space-y-1.5">
              <label
                htmlFor="target-video-count"
                className="block text-sm font-medium"
              >
                Target Videos
              </label>
              <Input
                id="target-video-count"
                type="number"
                min={1}
                max={100}
                value={targetVideoCount}
                onChange={(e) => setTargetVideoCount(parseInt(e.target.value, 10) || 25)}
                disabled={isSubmitting}
              />
            </div>

            {/* ── AU overlay fields (only visible when AU tab active) ── */}
            {isAU && (
              <div className="space-y-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  🇦🇺 Australia configuration
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="au-channel-type" className="block text-xs font-medium">
                    Channel type
                  </label>
                  <Select
                    value={auChannelType}
                    onValueChange={setAuChannelType}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="au-channel-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hub">Hub (covers all 5 sub-niches)</SelectItem>
                      <SelectItem value="spoke">Spoke (single sub-niche, links to a hub)</SelectItem>
                      <SelectItem value="standalone">Standalone (no hub-spoke link)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {auChannelType === 'spoke' && (
                  <div className="space-y-1.5">
                    <label htmlFor="au-parent" className="block text-xs font-medium">
                      Parent hub project
                    </label>
                    <Select
                      value={auParentProjectId}
                      onValueChange={setAuParentProjectId}
                      disabled={isSubmitting || !auHubs?.length}
                    >
                      <SelectTrigger id="au-parent" className="w-full">
                        <SelectValue placeholder={auHubs?.length ? 'Select hub...' : 'No hubs found — create a hub first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(auHubs || []).map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="au-cost-ceiling" className="block text-xs font-medium">
                    Per-video cost ceiling (USD)
                  </label>
                  <Input
                    id="au-cost-ceiling"
                    type="number"
                    min={3}
                    max={50}
                    step={0.5}
                    value={auCostCeiling}
                    onChange={(e) => setAuCostCeiling(parseFloat(e.target.value) || 8)}
                    disabled={isSubmitting}
                  />
                  <p className="text-2xs text-muted-foreground">
                    Strategy §11.1 default $8. Cost Calculator gate raises a soft warning (not block) when projected cost exceeds.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium">
                    Sub-niches covered
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      ['credit_cards_au',     'Credit Cards & Points'],
                      ['super_au',            'Superannuation'],
                      ['property_mortgage_au','Property & Mortgages'],
                      ['tax_au',              'Tax Strategy'],
                      ['etf_investing_au',    'ETF & Share Investing'],
                    ].map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={auNicheVariants.includes(value)}
                          onChange={(e) => {
                            setAuNicheVariants((prev) =>
                              e.target.checked
                                ? [...prev, value]
                                : prev.filter((v) => v !== value)
                            );
                          }}
                          disabled={isSubmitting}
                          className="rounded"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <p className="text-2xs text-muted-foreground italic">
                  Hub + 1 spoke (super_au) is the recommended v1 configuration. AU disclaimers (AD-01..04), AU calendar events, and AU compliance rules apply automatically — no setup needed beyond this form.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Start Research'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
