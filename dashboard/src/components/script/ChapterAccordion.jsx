import { ChevronDown } from 'lucide-react';

/**
 * Glass-card accordion per chapter in the Script Review page.
 * @param {object} props
 * @param {object} props.chapter - { name, scenes: [], wordCount }
 * @param {boolean} props.isExpanded - Whether chapter content is visible
 * @param {Function} props.onToggle - Toggle expand/collapse
 * @param {React.ReactNode} props.children - Scene rows rendered inside
 */
export default function ChapterAccordion({ chapter, isExpanded, onToggle, children }) {
  const sceneCount = chapter.scenes?.length || 0;

  return (
    <div className="glass-card overflow-hidden" data-testid={`chapter-${chapter.name}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors duration-200 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">
          {chapter.name}
        </span>

        <span className="flex items-center gap-3 flex-shrink-0">
          {chapter.wordCount != null && (
            <span className="text-xs text-text-muted dark:text-text-muted-dark tabular-nums">
              {chapter.wordCount.toLocaleString()} words
            </span>
          )}
          <span className="text-xs text-text-muted dark:text-text-muted-dark tabular-nums">
            {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border/30 dark:border-white/[0.04] animate-in">
          {children}
        </div>
      )}
    </div>
  );
}
