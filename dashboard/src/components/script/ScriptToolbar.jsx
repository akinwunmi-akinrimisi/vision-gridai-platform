import { useState } from 'react';
import { ChevronsUp, ChevronsDown, RefreshCw, Search, X } from 'lucide-react';

/**
 * Toolbar above the chapter accordion list.
 * @param {object} props
 * @param {Function} props.onExpandAll - Expand all chapters
 * @param {Function} props.onCollapseAll - Collapse all chapters
 * @param {number} props.editedSceneCount - Count of scenes marked for batch regen
 * @param {Function} props.onRegenPrompts - Trigger batch prompt regeneration
 * @param {Function} props.onSearch - Search handler receives query string
 * @param {object} props.passInfo - { approach, attempt } for informational badge
 */
export default function ScriptToolbar({
  onExpandAll,
  onCollapseAll,
  editedSceneCount = 0,
  onRegenPrompts,
  onSearch,
  passInfo,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    onSearch(q);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
    setSearchOpen(false);
  };

  return (
    <div
      className="flex items-center gap-2 px-1 py-2 flex-wrap"
      data-testid="script-toolbar"
    >
      {/* Expand / Collapse */}
      <div className="flex items-center gap-1">
        <button
          onClick={onExpandAll}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
            text-slate-600 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-white/[0.06]
            transition-colors duration-200 cursor-pointer"
          title="Expand all chapters"
        >
          <ChevronsDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Expand All</span>
        </button>
        <button
          onClick={onCollapseAll}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
            text-slate-600 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-white/[0.06]
            transition-colors duration-200 cursor-pointer"
          title="Collapse all chapters"
        >
          <ChevronsUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Collapse All</span>
        </button>
      </div>

      {/* Regen Edited Prompts (batch) */}
      {editedSceneCount > 0 && (
        <button
          onClick={onRegenPrompts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/[0.1]
            hover:bg-amber-100 dark:hover:bg-amber-500/[0.18]
            transition-colors duration-200 cursor-pointer"
          data-testid="regen-prompts-btn"
        >
          <RefreshCw className="w-3 h-3" />
          Regen Prompts ({editedSceneCount})
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pass info badge */}
      {passInfo && (
        <span
          className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark px-2 py-1 rounded-md bg-slate-50 dark:bg-white/[0.03]"
          data-testid="pass-info"
        >
          3-pass | Attempt {passInfo.attempt || 1}
        </span>
      )}

      {/* Search toggle + input */}
      {searchOpen ? (
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg px-2.5 py-1 transition-all duration-200">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search script..."
            autoFocus
            className="w-36 sm:w-48 text-xs bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            data-testid="script-search-input"
          />
          <button
            onClick={clearSearch}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
            text-slate-600 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-white/[0.06]
            transition-colors duration-200 cursor-pointer"
          title="Search within script"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
        </button>
      )}
    </div>
  );
}
