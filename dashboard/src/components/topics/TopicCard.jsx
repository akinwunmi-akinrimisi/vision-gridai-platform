import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CheckCircle2, XCircle, RefreshCw, Pencil, FileText, ChevronDown, Play, Save, X, Loader2 } from 'lucide-react';

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

const SCRIPT_STATUS_BADGE = {
  generating: { cls: 'badge badge-amber animate-shimmer', label: 'Generating' },
  review: { cls: 'badge badge-amber', label: 'Review' },
  approved: { cls: 'badge badge-green', label: 'Script Approved' },
  rejected: { cls: 'badge badge-red', label: 'Script Rejected' },
};

const PRODUCTION_STATUS_BADGE = {
  queued:     { cls: 'badge badge-amber', label: 'Queued' },
  producing:  { cls: 'badge badge-amber animate-pulse', label: 'Producing' },
  audio:      { cls: 'badge badge-purple', label: 'Audio' },
  images:     { cls: 'badge badge-purple', label: 'Images' },
  assembling: { cls: 'badge badge-purple', label: 'Assembling' },
  assembled:  { cls: 'badge badge-blue', label: 'Assembled' },
  stopped:    { cls: 'badge bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300', label: 'Stopped' },
  failed:     { cls: 'badge badge-red', label: 'Failed' },
};

function getScriptBadge(topic) {
  if (topic.script_review_status === 'approved') return SCRIPT_STATUS_BADGE.approved;
  if (topic.script_review_status === 'rejected') return SCRIPT_STATUS_BADGE.rejected;
  if (topic.status === 'scripting' && topic.script_review_status === 'pending') return SCRIPT_STATUS_BADGE.generating;
  if (topic.script_json && topic.script_review_status === 'pending') return SCRIPT_STATUS_BADGE.review;
  return null;
}

function getProductionBadge(topic) {
  return PRODUCTION_STATUS_BADGE[topic.status] || null;
}

function parseProgress(val) {
  if (!val || val === 'pending') return 0;
  if (val === 'complete') return 100;
  const match = val.match?.(/done:(\d+)\/(\d+)/);
  if (match) {
    const [, done, total] = match;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }
  return 0;
}

function computeProductionProgress(topic) {
  const { status, audio_progress, images_progress, i2v_progress, t2v_progress } = topic;
  const PRODUCING_STATUSES = ['producing', 'audio', 'images', 'assembling'];
  if (!PRODUCING_STATUSES.includes(status)) return null;

  const audio = parseProgress(audio_progress);
  const images = parseProgress(images_progress);
  const i2v = parseProgress(i2v_progress);
  const t2v = parseProgress(t2v_progress);

  return Math.round(audio * 0.25 + images * 0.25 + i2v * 0.25 + t2v * 0.25);
}

function canStartProduction(topic) {
  return topic.script_review_status === 'approved' && topic.status === 'script_approved';
}

const inputClass =
  'w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30';

const textareaClass =
  'w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none';

export default function TopicCard({ topic, projectId, isSelected, onToggleSelect, onApprove, onReject, onRefine, onEdit, onSave, onSaveAvatar }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTopicFields, setEditTopicFields] = useState({});
  const [editAvatarFields, setEditAvatarFields] = useState({});
  const navigate = useNavigate();
  const avatar = topic.avatars?.[0] || {};
  const status = topic.review_status || 'pending';
  const tintClass = STATUS_TINT[status] || '';
  const productionBadge = getProductionBadge(topic);
  const productionProgress = computeProductionProgress(topic);

  const handleEnterEdit = (e) => {
    e.stopPropagation();
    setEditTopicFields({
      seo_title: topic.seo_title || '',
      narrative_hook: topic.narrative_hook || '',
      key_segments: topic.key_segments || '',
    });
    const av = topic.avatars?.[0] || {};
    const af = {};
    for (const { key } of AVATAR_FIELDS) {
      af[key] = av[key] || '';
    }
    setEditAvatarFields(af);
    setIsEditing(true);
    // Ensure card is expanded in edit mode
    setExpanded(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        onSave && onSave({ topic_id: topic.id, project_id: topic.project_id || projectId, fields: editTopicFields }),
        onSaveAvatar && onSaveAvatar({ topic_id: topic.id, project_id: topic.project_id || projectId, fields: editAvatarFields }),
      ]);
      setIsEditing(false);
    } catch {
      // error stays visible — isSaving state returns to false
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
  };

  const handleHeaderClick = () => {
    // Don't collapse while editing
    if (!isEditing) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={`glass-card overflow-hidden transition-all duration-200 ${tintClass}`}
      data-testid={`topic-card-${topic.topic_number}`}
    >
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={handleHeaderClick}
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
          {isEditing ? (editTopicFields.seo_title || topic.seo_title || topic.original_title) : (topic.seo_title || topic.original_title)}
        </span>

        {/* Playlist badge */}
        <span className={PLAYLIST_BADGE[topic.playlist_group] || 'badge badge-blue'}>
          {topic.playlist_angle || `Playlist ${topic.playlist_group}`}
        </span>

        {/* Status badge */}
        <span className={STATUS_BADGE[status] || 'badge badge-amber'}>
          {status === 'refining' ? 'Refining...' : status}
        </span>

        {/* Script status badge */}
        {(() => {
          const scriptBadge = getScriptBadge(topic);
          return scriptBadge ? (
            <span className={scriptBadge.cls}>{scriptBadge.label}</span>
          ) : null;
        })()}

        {/* Production status badge */}
        {productionBadge && (
          <span className={productionBadge.cls} data-testid={`production-badge-${topic.id}`}>
            {productionBadge.label}
          </span>
        )}

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
          {canStartProduction(topic) && (
            <button
              onClick={() => navigate(`/project/${projectId || topic.project_id}/production?trigger=${topic.id}`)}
              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              title="Start Production"
              data-testid={`start-production-${topic.id}`}
            >
              <Play className="w-4 h-4" />
            </button>
          )}
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
          {topic.review_status === 'approved' ? (
            <Link
              to={`/project/${projectId || topic.project_id}/topics/${topic.id}/script`}
              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              title="View Script"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={handleEnterEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Mini production progress bar */}
      {productionProgress != null && (
        <div className="px-4 pb-2" data-testid={`production-progress-${topic.id}`}>
          <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
              style={{ width: `${productionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/30 dark:border-white/[0.04] animate-in space-y-4">
          {isEditing ? (
            /* ---- EDIT MODE ---- */
            <>
              {/* Topic fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-1">
                    SEO Title
                  </label>
                  <input
                    data-testid="edit-seo-title"
                    type="text"
                    value={editTopicFields.seo_title || ''}
                    onChange={(e) => setEditTopicFields((prev) => ({ ...prev, seo_title: e.target.value }))}
                    className={inputClass}
                    placeholder="SEO Title"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-1">
                    Narrative Hook
                  </label>
                  <textarea
                    data-testid="edit-narrative-hook"
                    value={editTopicFields.narrative_hook || ''}
                    onChange={(e) => setEditTopicFields((prev) => ({ ...prev, narrative_hook: e.target.value }))}
                    rows={3}
                    className={textareaClass}
                    placeholder="Narrative hook..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-1">
                    Key Segments
                  </label>
                  <textarea
                    data-testid="edit-key-segments"
                    value={editTopicFields.key_segments || ''}
                    onChange={(e) => setEditTopicFields((prev) => ({ ...prev, key_segments: e.target.value }))}
                    rows={3}
                    className={textareaClass}
                    placeholder="Key segments..."
                  />
                </div>
              </div>

              {/* Avatar fields */}
              <div>
                <p className="text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2">Customer Avatar</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {AVATAR_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-text-muted dark:text-text-muted-dark mb-1">{label}</label>
                      <input
                        data-testid={`edit-avatar-${key}`}
                        type="text"
                        value={editAvatarFields[key] || ''}
                        onChange={(e) => setEditAvatarFields((prev) => ({ ...prev, [key]: e.target.value }))}
                        className={inputClass}
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save / Cancel buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30 dark:border-white/[0.04]">
                <button
                  data-testid="edit-cancel"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                    text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04]
                    hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  data-testid="edit-save"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                    text-white bg-primary hover:bg-primary/90 transition-colors cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            /* ---- READ-ONLY MODE ---- */
            <>
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
                <span><strong className="text-slate-600 dark:text-slate-400">CPM:</strong> {topic.estimated_cpm || '\u2014'}</span>
                <span><strong className="text-slate-600 dark:text-slate-400">Viral:</strong> {topic.viral_potential || '\u2014'}</span>
                <span><strong className="text-slate-600 dark:text-slate-400">Playlist:</strong> {topic.playlist_angle || '\u2014'}</span>
              </div>

              {/* Avatar */}
              {avatar.avatar_name_age && (
                <div>
                  <p className="text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2">Customer Avatar</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {AVATAR_FIELDS.map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-xs text-text-muted dark:text-text-muted-dark">{label}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{avatar[key] || '\u2014'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
