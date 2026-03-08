import { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Pencil, ChevronDown } from 'lucide-react';

const STATUS_BADGE = {
  pending: 'badge badge-amber',
  approved: 'badge badge-green',
  rejected: 'badge badge-red',
  refining: 'badge badge-amber animate-shimmer',
};

const STATUS_TINT = {
  approved: 'bg-green-500/5',
  rejected: 'bg-red-500/5',
  refined: 'bg-amber-500/5',
};

const PLAYLIST_BADGE = {
  1: 'badge badge-blue',
  2: 'badge badge-green',
  3: 'badge badge-purple',
};

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

export default function TopicCard({ topic, isSelected, onToggleSelect, onApprove, onReject, onRefine, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const avatar = topic.avatars?.[0] || {};
  const status = topic.review_status || 'pending';
  const tintClass = STATUS_TINT[status] || '';

  return (
    <div
      className={`glass-card overflow-hidden transition-all duration-200 ${tintClass}`}
      data-testid={`topic-card-${topic.topic_number}`}
    >
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(topic.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/30 cursor-pointer"
        />

        {/* Topic number */}
        <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
          {topic.topic_number}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white truncate">
          {topic.seo_title || topic.original_title}
        </span>

        {/* Playlist badge */}
        <span className={PLAYLIST_BADGE[topic.playlist_group] || 'badge badge-blue'}>
          {topic.playlist_angle || `Playlist ${topic.playlist_group}`}
        </span>

        {/* Status badge */}
        <span className={STATUS_BADGE[status] || 'badge badge-amber'}>
          {status === 'refining' ? 'Refining...' : status}
        </span>

        {/* CPM */}
        <span className="text-xs text-text-muted dark:text-text-muted-dark hidden sm:inline">
          {topic.estimated_cpm}
        </span>

        {/* Viral potential */}
        <span className="text-xs text-text-muted dark:text-text-muted-dark hidden md:inline">
          {topic.viral_potential}
        </span>

        {/* Avatar preview */}
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden lg:inline">
          {avatar.avatar_name_age?.split(',')[0] || ''}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onApprove(topic)}
            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            title="Approve"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReject(topic)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Reject"
          >
            <XCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRefine(topic)}
            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
            title="Refine"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(topic)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/30 dark:border-white/[0.04] animate-in space-y-4">
          {/* Narrative hook */}
          {topic.narrative_hook && (
            <div>
              <p className="text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-1">Narrative Hook</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{topic.narrative_hook}</p>
            </div>
          )}

          {/* Key segments */}
          {topic.key_segments && (
            <div>
              <p className="text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-1">Key Segments</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{topic.key_segments}</p>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex gap-4 text-xs">
            <span><strong className="text-slate-600 dark:text-slate-400">CPM:</strong> {topic.estimated_cpm || '—'}</span>
            <span><strong className="text-slate-600 dark:text-slate-400">Viral:</strong> {topic.viral_potential || '—'}</span>
            <span><strong className="text-slate-600 dark:text-slate-400">Playlist:</strong> {topic.playlist_angle || '—'}</span>
          </div>

          {/* Avatar */}
          {avatar.avatar_name_age && (
            <div>
              <p className="text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2">Customer Avatar</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {AVATAR_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs text-text-muted dark:text-text-muted-dark">{label}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{avatar[key] || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
