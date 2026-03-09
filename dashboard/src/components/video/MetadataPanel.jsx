import { useState, useMemo } from 'react';
import {
  Pencil,
  CheckCircle,
  XCircle,
  RefreshCw,
  ImageIcon,
  X,
  Save,
} from 'lucide-react';

/**
 * MetadataPanel - Sticky left panel showing video metadata with inline editing.
 * Displays title, description, tags, chapters, playlist in view mode.
 * Transforms to editable inputs when Edit Metadata is clicked.
 */
export default function MetadataPanel({
  topic,
  scenes = [],
  isPublished,
  onApprove,
  onReject,
  onRegenThumbnail,
  onUpdateMetadata,
  onRetryUpload,
  isRegenPending,
  isUpdatePending,
  isRetryPending,
}) {
  const [isEditing, setIsEditing] = useState(false);

  const metadata = topic?.script_metadata?.video_metadata || {};
  const tags = metadata.tags || [];

  // Editable fields state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [editChapters, setEditChapters] = useState([]);
  const [editPlaylist, setEditPlaylist] = useState(1);
  const [editThumbnailPrompt, setEditThumbnailPrompt] = useState('');
  const [newTag, setNewTag] = useState('');

  // Generate chapters from scenes
  const chapters = useMemo(() => {
    if (!scenes.length) return [];
    const chapterMap = new Map();
    for (const scene of scenes) {
      if (scene.chapter && !chapterMap.has(scene.chapter)) {
        chapterMap.set(scene.chapter, scene.start_time_ms || 0);
      }
    }
    return Array.from(chapterMap.entries()).map(([name, ms]) => ({
      name,
      timestamp: formatTimestamp(ms),
      ms,
    }));
  }, [scenes]);

  // Generate description from template
  const description = useMemo(() => {
    const hookLine = topic?.narrative_hook || '';
    const chapterLines = chapters
      .map((ch) => `${ch.timestamp} ${ch.name}`)
      .join('\n');
    const tagLine = tags.length > 0 ? '\n\n' + tags.map((t) => `#${t}`).join(' ') : '';
    return `${hookLine}\n\n${chapterLines}${tagLine}\n\n---\nThis video contains educational content only.`;
  }, [topic, chapters, tags]);

  const startEditing = () => {
    setEditTitle(topic?.seo_title || '');
    setEditDescription(description);
    setEditTags([...tags]);
    setEditChapters(chapters.map((ch) => ({ ...ch })));
    setEditPlaylist(topic?.playlist_group || 1);
    setEditThumbnailPrompt(metadata.thumbnail_prompt || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setNewTag('');
  };

  const handleSave = () => {
    onUpdateMetadata({
      seo_title: editTitle,
      description: editDescription,
      tags: editTags,
      chapters: editChapters,
      playlist_group: editPlaylist,
      thumbnail_prompt: editThumbnailPrompt,
    });
    setIsEditing(false);
    setNewTag('');
  };

  const removeTag = (index) => {
    setEditTags((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags((prev) => [...prev, trimmed]);
      setNewTag('');
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const isFailed = topic?.publish_progress === 'failed';

  return (
    <div className="glass-card rounded-xl" data-testid="metadata-panel">
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-1 block">
            Title
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              data-testid="edit-title-input"
            />
          ) : (
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {topic?.seo_title || topic?.original_title}
            </h2>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-1 block">
            Description
          </label>
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-y bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          ) : (
            <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto scrollbar-thin">
              {description}
            </pre>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-1 block">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(isEditing ? editTags : tags).map((tag, i) => (
              <span
                key={i}
                className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium inline-flex items-center gap-1"
              >
                {tag}
                {isEditing && (
                  <button
                    onClick={() => removeTag(i)}
                    className="hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {isEditing && (
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag..."
                className="rounded-full bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 px-3 py-1 text-xs w-24 focus:outline-none focus:border-primary transition-all"
                data-testid="add-tag-input"
              />
            )}
          </div>
        </div>

        {/* Chapters */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-1 block">
            Chapters
          </label>
          <div className="space-y-1">
            {(isEditing ? editChapters : chapters).map((ch, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={ch.timestamp}
                      onChange={(e) => {
                        const updated = [...editChapters];
                        updated[i] = { ...updated[i], timestamp: e.target.value };
                        setEditChapters(updated);
                      }}
                      className="w-16 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono text-[11px] focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={ch.name}
                      onChange={(e) => {
                        const updated = [...editChapters];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setEditChapters(updated);
                      }}
                      className="flex-1 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:border-primary"
                    />
                  </>
                ) : (
                  <>
                    <span className="text-slate-400 dark:text-slate-500 font-mono w-16 flex-shrink-0">
                      {ch.timestamp}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{ch.name}</span>
                  </>
                )}
              </div>
            ))}
            {chapters.length === 0 && !isEditing && (
              <span className="text-xs text-slate-400 italic">No chapters detected</span>
            )}
          </div>
        </div>

        {/* Playlist */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-1 block">
            Playlist
          </label>
          {isEditing ? (
            <select
              value={editPlaylist}
              onChange={(e) => setEditPlaylist(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value={1}>Playlist 1</option>
              <option value={2}>Playlist 2</option>
              <option value={3}>Playlist 3</option>
            </select>
          ) : (
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Playlist {topic?.playlist_group || '-'}
            </span>
          )}
        </div>

        {/* Thumbnail prompt (edit mode only) */}
        {isEditing && (
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-1 block">
              Thumbnail Prompt
            </label>
            <textarea
              value={editThumbnailPrompt}
              onChange={(e) => setEditThumbnailPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs resize-y bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        )}

        {/* Save/Cancel buttons (edit mode) */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50 dark:border-white/[0.06]">
            <button
              onClick={handleSave}
              disabled={isUpdatePending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isUpdatePending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </button>
            <button
              onClick={cancelEditing}
              disabled={isUpdatePending}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isPublished && (
        <div className="p-4 border-t border-border/50 dark:border-white/[0.06] space-y-2">
          {!isEditing && (
            <button
              onClick={startEditing}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
              data-testid="edit-metadata-btn"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Metadata
            </button>
          )}

          <button
            onClick={onApprove}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all cursor-pointer"
            data-testid="approve-btn"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>

          <button
            onClick={onReject}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.05] hover:bg-red-100 dark:hover:bg-red-500/[0.1] transition-all cursor-pointer"
            data-testid="reject-btn"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>

          {isFailed && (
            <button
              onClick={onRetryUpload}
              disabled={isRetryPending}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/[0.08] hover:bg-amber-100 dark:hover:bg-amber-500/[0.15] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetryPending ? 'animate-spin' : ''}`} />
              Retry Upload
            </button>
          )}

          <button
            onClick={() => onRegenThumbnail(metadata.thumbnail_prompt || '')}
            disabled={isRegenPending}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-border/50 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.03] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isRegenPending ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            Regenerate Thumbnail
          </button>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(ms) {
  if (!ms && ms !== 0) return '0:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
