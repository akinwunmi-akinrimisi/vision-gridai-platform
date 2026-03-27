import { useState } from 'react';
import { ListMusic, RefreshCw, Check, X, Pencil } from 'lucide-react';

/**
 * 3-column playlist angle cards with inline editing.
 * Each card: bg-card border border-border rounded-xl p-4.
 * Playlist name as text-accent font-semibold, theme below.
 * @param {Array} playlists - [{ number, name, theme }]
 * @param {Function} onRegenerate - Called to regenerate playlists via webhook
 * @param {Function} onSave - Called with updated playlist data (optional)
 */
export default function PlaylistCards({ playlists = [], onRegenerate, onSave }) {
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [regenerating, setRegenerating] = useState(false);

  if (playlists.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ListMusic className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Playlist Angles</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">No playlist data yet</p>
      </div>
    );
  }

  const startEdit = (index) => {
    setEditing(index);
    setEditValues({
      name: playlists[index].name,
      theme: playlists[index].theme,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValues({});
  };

  const saveEdit = () => {
    if (onSave && editing !== null) {
      onSave(editing, editValues);
    }
    setEditing(null);
    setEditValues({});
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  const PLAYLIST_ACCENTS = [
    'border-l-primary',
    'border-l-info',
    'border-l-success',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold">Playlist Angles</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {playlists.map((playlist, i) => (
          <div
            key={i}
            className={`bg-card border border-border rounded-xl p-4 group relative border-l-2 ${PLAYLIST_ACCENTS[i] || PLAYLIST_ACCENTS[0]} hover:border-border-hover transition-colors`}
          >
            {editing === i ? (
              /* Edit mode */
              <div className="space-y-2">
                <input
                  type="text"
                  value={editValues.name || ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                  className="w-full text-sm font-semibold bg-muted border border-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  placeholder="Playlist name"
                />
                <textarea
                  value={editValues.theme || ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, theme: e.target.value }))}
                  rows={2}
                  className="w-full text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
                  placeholder="Theme description"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={saveEdit}
                    className="p-1 rounded-md bg-success-bg text-success hover:bg-success/20 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 rounded-md bg-danger-bg text-danger hover:bg-danger/20 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-accent">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {playlist.theme}
                    </p>
                  </div>

                  {/* Edit button (shown on hover) */}
                  <button
                    onClick={() => startEdit(i)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                    aria-label={`Edit playlist ${i + 1}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Regenerate button */}
      {onRegenerate && (
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating...' : 'Regenerate Playlists'}
        </button>
      )}
    </div>
  );
}
