import { useState } from 'react';
import { ListMusic, RefreshCw, Check, X, Pencil } from 'lucide-react';

/**
 * 3 playlist angle cards with inline editing support.
 * @param {Array} playlists - [{ number, name, theme }]
 * @param {Function} onRegenerate - Called to regenerate playlists via webhook
 * @param {Function} onSave - Called with updated playlist data (optional)
 */
export default function PlaylistCards({ playlists = [], onRegenerate, onSave }) {
  const [editing, setEditing] = useState(null); // index being edited
  const [editValues, setEditValues] = useState({});
  const [regenerating, setRegenerating] = useState(false);

  if (playlists.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <ListMusic className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Playlist Angles</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">No playlist data yet</p>
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

  const PLAYLIST_COLORS = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-amber-500 to-orange-500',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Playlist Angles
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {playlists.map((playlist, i) => (
          <div
            key={i}
            className="glass-card p-4 group relative"
          >
            <div className="flex items-start gap-3">
              {/* Number badge */}
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${PLAYLIST_COLORS[i] || PLAYLIST_COLORS[0]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
              >
                {playlist.number || i + 1}
              </div>

              <div className="flex-1 min-w-0">
                {editing === i ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editValues.name || ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                      className="w-full text-sm font-semibold bg-white/50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.1] rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Playlist name"
                    />
                    <textarea
                      value={editValues.theme || ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, theme: e.target.value }))}
                      rows={2}
                      className="w-full text-xs bg-white/50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.1] rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Theme description"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={saveEdit}
                        className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {playlist.theme}
                    </p>
                  </>
                )}
              </div>

              {/* Edit button (shown on hover) */}
              {editing !== i && (
                <button
                  onClick={() => startEdit(i)}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                  aria-label={`Edit playlist ${i + 1}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Regenerate button */}
      {onRegenerate && (
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating...' : 'Regenerate Playlists'}
        </button>
      )}
    </div>
  );
}
