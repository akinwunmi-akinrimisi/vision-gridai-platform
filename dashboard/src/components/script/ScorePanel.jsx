import { useState } from 'react';
import { Check, X, RefreshCw, ChevronDown, User, Youtube, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SCORE_DIMENSIONS = [
  { key: 'persona_integration', label: 'Persona Integration' },
  { key: 'hook_strength', label: 'Hook Strength' },
  { key: 'pacing', label: 'Pacing & Structure' },
  { key: 'specificity', label: 'Specificity & Depth' },
  { key: 'tts_readability', label: 'TTS Readability' },
  { key: 'visual_prompts', label: 'Visual Prompts' },
  { key: 'anti_patterns', label: 'Anti-Patterns' },
];

const AVATAR_FIELDS = [
  { key: 'avatar_name_age', label: 'Name & Age' },
  { key: 'occupation_income', label: 'Occupation & Income' },
  { key: 'life_stage', label: 'Life Stage' },
  { key: 'pain_point', label: 'Pain Point' },
  { key: 'spending_profile', label: 'Spending Profile' },
  { key: 'knowledge_level', label: 'Knowledge Level' },
  { key: 'emotional_driver', label: 'Emotional Driver' },
  { key: 'online_hangouts', label: 'Online Hangouts' },
  { key: 'objection', label: 'Objection' },
  { key: 'dream_outcome', label: 'Dream Outcome' },
];

function scoreBarColor(score) {
  if (score >= 8) return 'bg-success';
  if (score >= 7) return 'bg-accent';
  return 'bg-danger';
}

/**
 * Collapsible section with chevron toggle.
 */
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-3 h-3" />}
          {title}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

/**
 * ScorePanel -- Fixed-width left column for the Script Review split-panel.
 * Displays quality score, 7 dimension bars, metadata, and action buttons.
 */
export default function ScorePanel({ topic, onApprove, onReject, onRefine, isLoading }) {
  if (!topic) return null;

  const passScores = topic.script_pass_scores;
  const combined = passScores?.combined;
  const overallScore = combined?.score ?? topic.script_quality_score ?? null;
  const dimensions = combined?.dimensions || {};
  const avatar = topic.avatars?.[0] || {};
  const videoMeta = topic.script_metadata?.video_metadata || {};
  const isApproved = topic.script_review_status === 'approved';
  const buttonsDisabled = isLoading || isApproved || !overallScore;

  const split = topic.script_json?.metadata?.visual_split;
  const staticCount = split?.static_image || 0;
  const i2vCount = split?.i2v || 0;
  const t2vCount = split?.t2v || 0;

  const aboveThreshold = overallScore != null && overallScore >= 7.0;

  return (
    <div className="bg-card/50 p-5 flex flex-col h-full" data-testid="score-panel">
      {/* Quality Score */}
      <div className="mb-5">
        <p className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent" data-testid="overall-score">
          {overallScore != null ? overallScore : '--'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">/10 quality score</p>
        {overallScore != null && (
          <p className={`text-[10px] mt-1 ${aboveThreshold ? 'text-success' : 'text-danger'}`}>
            {aboveThreshold ? '--- Above threshold (7.0)' : '--- Below threshold (7.0)'}
          </p>
        )}
      </div>

      {/* 7 Dimension Bars */}
      <div className="space-y-2.5" data-testid="dimension-bars">
        {SCORE_DIMENSIONS.map((dim) => {
          const score = dimensions[dim.key];
          const feedback = combined?.feedback?.[dim.key] || combined?.notes?.[dim.key] || null;
          return (
            <div key={dim.key} data-testid={`dimension-${dim.key}`} className="group relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground">{dim.label}</span>
                <span className="text-[10px] font-semibold text-accent tabular-nums">
                  {score != null ? score : '--'}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                {score != null && (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(score)}`}
                    style={{ width: `${(score / 10) * 100}%` }}
                    data-testid={`bar-${dim.key}`}
                  />
                )}
              </div>
              {/* Hover tooltip with evaluator feedback */}
              {feedback && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 hidden group-hover:block">
                  <div className="bg-popover text-popover-foreground text-[10px] rounded-md px-3 py-2 shadow-lg leading-relaxed max-w-[220px] border border-border">
                    {feedback}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Section */}
      <div className="border-t border-border mt-4 pt-4 space-y-2.5" data-testid="metadata-grid">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Words</span>
          <span className="text-xs font-semibold">
            {topic.word_count ? topic.word_count.toLocaleString() : '--'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Scenes</span>
          <span className="text-xs font-semibold">
            {topic.scene_count ?? '--'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Visuals</span>
          <span className="text-xs font-semibold">
            {split ? `${staticCount} img \u00B7 ${i2vCount} i2v \u00B7 ${t2vCount} t2v` : '--'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Attempt</span>
          <span className="text-xs font-semibold">
            {topic.script_attempts ?? 0} of 3
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border" data-testid="action-buttons">
        <Button
          onClick={onApprove}
          disabled={buttonsDisabled}
          className="w-full"
          data-testid="approve-btn"
        >
          <Check className="w-3.5 h-3.5" /> Approve Script
        </Button>
        <Button
          onClick={onReject}
          disabled={buttonsDisabled}
          variant="outline"
          className="w-full bg-danger-bg border-danger-border text-danger hover:bg-danger-bg hover:text-danger"
          data-testid="reject-btn"
        >
          <X className="w-3.5 h-3.5" /> Reject
        </Button>
        <Button
          onClick={onRefine}
          disabled={buttonsDisabled}
          variant="secondary"
          className="w-full border border-border"
          data-testid="refine-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refine
        </Button>
      </div>

      {/* Collapsible: Customer Avatar */}
      <div className="mt-4">
        <CollapsibleSection title="Customer Avatar" icon={User}>
          <div className="space-y-2">
            {AVATAR_FIELDS.map(({ key, label }) => {
              const value = avatar[key];
              if (!value) return null;
              return (
                <div key={key}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-xs text-foreground/80">{value}</p>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Collapsible: YouTube Metadata */}
        <CollapsibleSection title="YouTube Metadata" icon={Youtube}>
          <div className="space-y-2">
            {videoMeta.title && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</p>
                <p className="text-xs text-foreground/80">{videoMeta.title}</p>
              </div>
            )}
            {videoMeta.description && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                <p className="text-xs text-foreground/80 line-clamp-3">{videoMeta.description}</p>
              </div>
            )}
            {videoMeta.tags && videoMeta.tags.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {videoMeta.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {videoMeta.thumbnail_prompt && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Thumbnail Prompt</p>
                <p className="text-xs text-foreground/80">{videoMeta.thumbnail_prompt}</p>
              </div>
            )}
            {!videoMeta.title && !videoMeta.description && (
              <p className="text-xs text-muted-foreground italic">No metadata available yet</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Collapsible: Per-Pass Breakdown */}
        <CollapsibleSection title="Per-Pass Breakdown" icon={BarChart3}>
          {passScores ? (
            <div className="space-y-4">
              {['pass1', 'pass2', 'pass3'].map((passKey, i) => {
                const pass = passScores[passKey];
                if (!pass) return null;
                return (
                  <div key={passKey}>
                    <p className="text-xs font-semibold mb-2">
                      Pass {i + 1}: <span className="text-accent">{pass.score}/10</span>
                    </p>
                    <div className="space-y-1.5">
                      {SCORE_DIMENSIONS.map((dim) => {
                        const s = pass.dimensions?.[dim.key];
                        return (
                          <div key={dim.key} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-20 truncate">{dim.label}</span>
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                              {s != null && (
                                <div
                                  className={`h-full rounded-full ${scoreBarColor(s)}`}
                                  style={{ width: `${(s / 10) * 100}%` }}
                                />
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-5 text-right">
                              {s ?? '--'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No pass scores available yet</p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
