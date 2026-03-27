import { useState } from 'react';
import { ChevronsUp, ChevronsDown, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Toolbar above the chapter accordion list.
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
      className="flex items-center gap-2 flex-wrap"
      data-testid="script-toolbar"
    >
      {/* Expand / Collapse */}
      <div className="flex items-center gap-1">
        <button
          onClick={onExpandAll}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Expand all chapters"
        >
          <ChevronsDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Expand All</span>
        </button>
        <button
          onClick={onCollapseAll}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Collapse all chapters"
        >
          <ChevronsUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Collapse All</span>
        </button>
      </div>

      {/* Regen Edited Prompts (batch) */}
      {editedSceneCount > 0 && (
        <Button
          onClick={onRegenPrompts}
          variant="outline"
          size="sm"
          className="bg-warning-bg border-warning-border text-warning hover:bg-warning-bg"
          data-testid="regen-prompts-btn"
        >
          <RefreshCw className="w-3 h-3" />
          Regen Prompts ({editedSceneCount})
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pass info badge */}
      {passInfo && (
        <span
          className="text-[10px] font-medium text-muted-foreground px-2 py-1 rounded-sm bg-muted"
          data-testid="pass-info"
        >
          3-pass | Attempt {passInfo.attempt || 1}
        </span>
      )}

      {/* Search toggle + input */}
      {searchOpen ? (
        <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2.5 py-1 transition-all duration-200">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search script..."
            autoFocus
            className="w-36 sm:w-48 text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            data-testid="script-search-input"
          />
          <button
            onClick={clearSearch}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Search within script"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
        </button>
      )}
    </div>
  );
}
