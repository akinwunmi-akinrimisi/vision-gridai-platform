import { useState } from 'react';
import { BarChart3, Check, X, RefreshCw, ChevronDown, User, Youtube } from 'lucide-react';

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

function scoreColor(score) {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 7) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatVisualSplit(scriptJson) {
  const split = scriptJson?.metadata?.visual_split;
  if (!split) return '--';
  return `${split.static_image || 0} / ${split.i2v || 0} / ${split.t2v || 0}`;
}

/**
 * Collapsible section with chevron toggle.
 */
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border/50 dark:border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-2 -mx-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

/**
 * ScorePanel -- Sticky left column for the Script Review page.
 * Displays quality score, 7 dimension bars, metadata, action buttons,
 * and collapsible sections for avatar, YouTube metadata, and per-pass breakdown.
 *
 * @param {object} props
 * @param {object} props.topic - Topic data from useScript hook
 * @param {Function} props.onApprove - Approve callback
 * @param {Function} props.onReject - Reject callback
 * @param {Function} props.onRefine - Refine callback
 * @param {boolean} props.isLoading - Loading state for action buttons
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

  return (
    <div className="glass-card p-6 gradient-border-visible" data-testid="score-panel">
      {/* Quality Score Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-text-muted dark:text-text-muted-dark font-medium uppercase tracking-wider">Quality Score</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="overall-score">
            {overallScore != null ? overallScore : '--'}
            <span className="text-sm font-normal text-text-muted dark:text-text-muted-dark">/10</span>
          </p>
        </div>
      </div>

      {/* 7 Dimension Bars */}
      <div className="space-y-3" data-testid="dimension-bars">
        {SCORE_DIMENSIONS.map((dim) => {
          const score = dimensions[dim.key];
          return (
            <div key={dim.key} data-testid={`dimension-${dim.key}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{dim.label}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                  {score != null ? score : '--'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                {score != null && (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${scoreColor(score)}`}
                    style={{ width: `${(score / 10) * 100}%` }}
                    data-testid={`bar-${dim.key}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-border/50 dark:border-white/[0.06]" data-testid="metadata-grid">
        <div>
          <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Words</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {topic.word_count ? topic.word_count.toLocaleString() : '--'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Scenes</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {topic.scene_count ?? '--'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Visual Split</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatVisualSplit(topic.script_json)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Attempts</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {topic.script_attempts ?? 0} of 3
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-5 pt-5 border-t border-border/50 dark:border-white/[0.06]" data-testid="action-buttons">
        <button
          onClick={onApprove}
          disabled={buttonsDisabled}
          className="btn-success w-full"
          data-testid="approve-btn"
        >
          <Check className="w-3.5 h-3.5" /> Approve Script
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onReject}
            disabled={buttonsDisabled}
            className="btn-danger btn-sm"
            data-testid="reject-btn"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            onClick={onRefine}
            disabled={buttonsDisabled}
            className="btn-secondary btn-sm"
            data-testid="refine-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refine
          </button>
        </div>
      </div>

      {/* Collapsible: Customer Avatar */}
      <CollapsibleSection title="Customer Avatar" icon={User}>
        <div className="space-y-2">
          {AVATAR_FIELDS.map(({ key, label }) => {
            const value = avatar[key];
            if (!value) return null;
            return (
              <div key={key}>
                <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">{label}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">{value}</p>
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
              <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Title</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{videoMeta.title}</p>
            </div>
          )}
          {videoMeta.description && (
            <div>
              <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Description</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3">{videoMeta.description}</p>
            </div>
          )}
          {videoMeta.tags && videoMeta.tags.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Tags</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {videoMeta.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {videoMeta.thumbnail_prompt && (
            <div>
              <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Thumbnail Prompt</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{videoMeta.thumbnail_prompt}</p>
            </div>
          )}
          {!videoMeta.title && !videoMeta.description && (
            <p className="text-xs text-text-muted dark:text-text-muted-dark italic">No metadata available yet</p>
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
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Pass {i + 1}: {pass.score}/10
                  </p>
                  <div className="space-y-1.5">
                    {SCORE_DIMENSIONS.map((dim) => {
                      const s = pass.dimensions?.[dim.key];
                      return (
                        <div key={dim.key} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 dark:text-slate-500 w-24 truncate">{dim.label}</span>
                          <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                            {s != null && (
                              <div
                                className={`h-full rounded-full ${scoreColor(s)}`}
                                style={{ width: `${(s / 10) * 100}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 tabular-nums w-6 text-right">
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
          <p className="text-xs text-text-muted dark:text-text-muted-dark italic">No pass scores available yet</p>
        )}
      </CollapsibleSection>
    </div>
  );
}
