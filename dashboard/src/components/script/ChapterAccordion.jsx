import { ChevronDown } from 'lucide-react';

/**
 * Accordion per chapter in the Script Review page.
 * @param {object} props
 * @param {object} props.chapter - { name, scenes: [], wordCount }
 * @param {boolean} props.isExpanded - Whether chapter content is visible
 * @param {Function} props.onToggle - Toggle expand/collapse
 * @param {React.ReactNode} props.children - Scene rows rendered inside
 */
export default function ChapterAccordion({ chapter, isExpanded, onToggle, children }) {
  const sceneCount = chapter.scenes?.length || 0;

  return (
    <div data-testid={`chapter-${chapter.name}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 cursor-pointer py-2 text-left group"
        aria-expanded={isExpanded}
      >
        <ChevronDown
          className={`w-4 h-4 text-accent transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
        <span className="text-sm font-semibold truncate pr-2 group-hover:text-accent transition-colors">
          {chapter.name}
        </span>
        <span className="ml-auto flex items-center gap-3 flex-shrink-0 text-[10px] text-muted-foreground">
          {chapter.wordCount != null && (
            <span className="tabular-nums">{chapter.wordCount.toLocaleString()} words</span>
          )}
          <span className="tabular-nums">
            {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
          </span>
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-2 pl-6 pb-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
