import { UserCircle2, BookOpen, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Vocabulary level → pill palette */
const VOCAB_STYLES = {
  beginner: 'bg-muted text-muted-foreground border-border',
  intermediate: 'bg-accent/15 text-accent border-accent/40',
  advanced: 'bg-success-bg text-success border-success-border',
  mixed: 'bg-warning-bg text-warning border-warning-border',
};

function Chip({ children, tone = 'default' }) {
  const toneClass =
    tone === 'knowledge'
      ? 'bg-info-bg text-info border-info-border'
      : tone === 'geo'
        ? 'bg-accent/10 text-accent border-accent/30'
        : tone === 'interest'
          ? 'bg-success-bg text-success border-success-border'
          : 'bg-muted text-muted-foreground border-border';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border',
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

function TraitGroup({ icon: Icon, label, items, tone }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 8).map((it, i) => (
          <Chip key={`${label}-${i}`} tone={tone}>
            {typeof it === 'string' ? it : JSON.stringify(it)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function PersonaCard({ insight }) {
  const vocab = insight?.vocabulary_level || null;
  const traits = insight?.dominant_persona_traits || {};
  const priorKnowledge = Array.isArray(traits.prior_knowledge_hints)
    ? traits.prior_knowledge_hints
    : [];
  const geographic = Array.isArray(traits.geographic_hints) ? traits.geographic_hints : [];
  const interests = Array.isArray(traits.interests) ? traits.interests : [];
  const assumed = Array.isArray(insight?.assumed_prior_knowledge)
    ? insight.assumed_prior_knowledge
    : [];
  const summary = insight?.audience_persona_summary;

  return (
    <div className="bg-card border border-border rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserCircle2 className="w-4 h-4 text-accent" />
          Audience Persona
        </h3>
        {vocab && (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider',
              VOCAB_STYLES[vocab] || VOCAB_STYLES.mixed,
            )}
            title="Vocabulary level detected across classified comments"
          >
            {vocab}
          </span>
        )}
      </div>

      {summary ? (
        <blockquote className="pl-3 border-l-2 border-accent/60 text-sm italic text-foreground/90 leading-relaxed mb-4">
          {summary}
        </blockquote>
      ) : (
        <p className="text-xs text-muted-foreground italic mb-4">
          No persona summary yet. Run audience intelligence to synthesize.
        </p>
      )}

      <div className="space-y-3 mt-auto">
        <TraitGroup icon={BookOpen} label="Prior Knowledge" items={priorKnowledge} tone="knowledge" />
        <TraitGroup icon={MapPin} label="Geographic" items={geographic} tone="geo" />
        <TraitGroup icon={Sparkles} label="Interests" items={interests} tone="interest" />

        {assumed.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Assumed Prior Knowledge
            </div>
            <div className="flex flex-wrap gap-1">
              {assumed.slice(0, 10).map((k, i) => (
                <Chip key={`ak-${i}`}>{typeof k === 'string' ? k : JSON.stringify(k)}</Chip>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
