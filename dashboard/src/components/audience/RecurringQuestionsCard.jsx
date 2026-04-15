import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

function QuestionRow({ item, index }) {
  const [expanded, setExpanded] = useState(false);

  const question = item?.question || item?.text || 'Question';
  const occurrence = Number(item?.occurrence_count) || 0;
  const examples = Array.isArray(item?.example_comments) ? item.example_comments.slice(0, 2) : [];

  return (
    <div
      className={cn(
        'border-b border-border last:border-b-0 px-4 py-3 hover:bg-card-hover transition-colors',
        `stagger-${Math.min(index + 1, 8)} animate-fade-in`,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center tabular-nums">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-foreground leading-snug">{question}</p>
            <span
              className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border bg-info-bg text-info border-info-border tabular-nums"
              title={`${occurrence} audience member${occurrence === 1 ? '' : 's'} asked`}
            >
              {occurrence}x
            </span>
          </div>

          {examples.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover cursor-pointer"
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {expanded ? 'Hide' : 'Show'} {examples.length} example{examples.length === 1 ? '' : 's'}
            </button>
          )}

          {expanded && examples.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {examples.map((ex, i) => {
                const text = typeof ex === 'string' ? ex : ex?.comment_text || ex?.text || JSON.stringify(ex);
                return (
                  <li
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted border border-border text-[11px] text-muted-foreground leading-relaxed"
                  >
                    <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5 text-accent" />
                    <span className="line-clamp-3">"{text}"</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecurringQuestionsCard({ questions }) {
  const list = Array.isArray(questions) ? questions.slice(0, 5) : [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <HelpCircle className="w-4 h-4 text-info" />
        <h3 className="text-sm font-semibold">Recurring Questions</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          Top {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-muted-foreground text-center">
            No recurring questions detected in this week&rsquo;s comments.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {list.map((q, i) => (
            <QuestionRow key={i} item={q} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
