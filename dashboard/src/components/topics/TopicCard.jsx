import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  CheckCircle2, XCircle, RefreshCw, Pencil, FileText,
  ChevronDown, Play, Save, X, Loader2, User, Briefcase, Frown, MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from '../shared/StatusBadge';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AVATAR_FIELDS = [
  { key: 'avatar_name_age', label: 'Name & Age', icon: User },
  { key: 'occupation_income', label: 'Occupation & Income', icon: Briefcase },
  { key: 'life_stage', label: 'Life Stage' },
  { key: 'pain_point', label: 'Pain Point', icon: Frown },
  { key: 'spending_profile', label: 'Spending Profile' },
  { key: 'knowledge_level', label: 'Knowledge Level' },
  { key: 'emotional_driver', label: 'Emotional Driver', icon: MessageCircle },
  { key: 'online_hangouts', label: 'Online Hangouts' },
  { key: 'objection', label: 'Objection' },
  { key: 'dream_outcome', label: 'Dream Outcome' },
];

const GRAND_MASTER_FIELDS = [
  { key: 'core_domain_framework', label: 'Domain Framework', rows: 2 },
  { key: 'content_angle_blue_ocean', label: 'Blue Ocean Angle', rows: 2 },
  { key: 'practical_takeaways', label: 'Practical Takeaways', rows: 3 },
  { key: 'psychographics', label: 'Psychographics', rows: 2 },
  { key: 'key_emotional_drivers', label: 'Emotional Drivers', rows: 2 },
  { key: 'viewer_search_intent', label: 'Search Intent', rows: 2 },
];

const SCRIPT_STATUS_BADGE = {
  generating: { status: 'scripting', label: 'Generating' },
  review:     { status: 'review', label: 'Review' },
  approved:   { status: 'approved', label: 'Script Approved' },
  rejected:   { status: 'rejected', label: 'Script Rejected' },
};

const PRODUCTION_STATUS_MAP = {
  queued:     { status: 'pending', label: 'Queued' },
  producing:  { status: 'active', label: 'Producing' },
  audio:      { status: 'scripting', label: 'Audio' },
  images:     { status: 'scripting', label: 'Images' },
  assembling: { status: 'assembly', label: 'Assembling' },
  assembled:  { status: 'assembled', label: 'Assembled' },
  stopped:    { status: 'pending', label: 'Stopped' },
  failed:     { status: 'failed', label: 'Failed' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScriptBadge(topic) {
  if (topic.script_review_status === 'approved') return SCRIPT_STATUS_BADGE.approved;
  if (topic.script_review_status === 'rejected') return SCRIPT_STATUS_BADGE.rejected;
  if (topic.status === 'scripting' && topic.script_review_status === 'pending') return SCRIPT_STATUS_BADGE.generating;
  if (topic.script_json && topic.script_review_status === 'pending') return SCRIPT_STATUS_BADGE.review;
  return null;
}

function getProductionBadge(topic) {
  return PRODUCTION_STATUS_MAP[topic.status] || null;
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

/* ------------------------------------------------------------------ */
/*  TopicCard                                                          */
/* ------------------------------------------------------------------ */

export default function TopicCard({
  topic, projectId, isSelected, onToggleSelect,
  onApprove, onReject, onRefine, onEdit, onSave, onSaveAvatar,
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTopicFields, setEditTopicFields] = useState({});
  const [editAvatarFields, setEditAvatarFields] = useState({});
  const navigate = useNavigate();

  const avatar = topic.avatars?.[0] || {};
  const status = topic.review_status || 'pending';
  const isPending = status === 'pending' || status === 'refining';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const productionBadge = getProductionBadge(topic);
  const productionProgress = computeProductionProgress(topic);

  /* -- Edit handlers -- */
  const handleEnterEdit = (e) => {
    e.stopPropagation();
    const tf = {
      seo_title: topic.seo_title || '',
      narrative_hook: topic.narrative_hook || '',
      key_segments: topic.key_segments || '',
    };
    for (const { key } of GRAND_MASTER_FIELDS) tf[key] = topic[key] || '';
    setEditTopicFields(tf);
    const av = topic.avatars?.[0] || {};
    const af = {};
    for (const { key } of AVATAR_FIELDS) af[key] = av[key] || '';
    setEditAvatarFields(af);
    setIsEditing(true);
    setExpanded(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        onSave?.({ topic_id: topic.id, project_id: topic.project_id || projectId, fields: editTopicFields }),
        onSaveAvatar?.({ topic_id: topic.id, project_id: topic.project_id || projectId, fields: editAvatarFields }),
      ]);
      setIsEditing(false);
    } catch {
      // error visible to user via toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
  };

  const handleHeaderClick = () => {
    if (!isEditing) setExpanded((prev) => !prev);
  };

  /* ---- COLLAPSED (approved) card ---- */
  if (isApproved && !expanded && !isEditing) {
    return (
      <div
        className="bg-card border border-border rounded-xl px-5 py-3.5 flex items-center gap-3 transition-all hover:border-border-hover cursor-pointer group"
        onClick={() => setExpanded(true)}
        data-testid={`topic-card-${topic.topic_number}`}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(topic.id); }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer flex-shrink-0"
        />

        {/* Number badge -- success */}
        <span className="bg-success-bg text-success font-bold rounded-lg w-8 h-8 flex items-center justify-center text-xs flex-shrink-0">
          {topic.topic_number}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium truncate">
          {topic.seo_title || topic.original_title}
        </span>

        {/* Angle */}
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {topic.playlist_angle || '--'}
        </span>

        {/* Script badge */}
        {(() => {
          const sb = getScriptBadge(topic);
          return sb ? <StatusBadge status={sb.status} label={sb.label} /> : null;
        })()}

        {/* Production badge */}
        {productionBadge && (
          <StatusBadge status={productionBadge.status} label={productionBadge.label} />
        )}

        {/* Status badge */}
        <StatusBadge status="approved" />

        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 group-hover:text-foreground" />
      </div>
    );
  }

  /* ---- EXPANDED card (pending, rejected, or approved-expanded) ---- */
  return (
    <div
      className={cn(
        'bg-card border rounded-xl overflow-hidden transition-all',
        isRejected ? 'border-danger/20' : 'border-border hover:border-border-hover'
      )}
      data-testid={`topic-card-${topic.topic_number}`}
    >
      {/* Header row */}
      <div className="p-5 pb-0">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onToggleSelect(topic.id); }}
            className="w-4 h-4 rounded border-border accent-primary cursor-pointer flex-shrink-0 mt-1"
          />

          {/* Number badge */}
          <span className={cn(
            'font-bold rounded-lg w-8 h-8 flex items-center justify-center text-xs flex-shrink-0',
            isApproved ? 'bg-success-bg text-success' :
            isRejected ? 'bg-danger-bg text-danger' :
            'bg-warning-bg text-accent'
          )}>
            {topic.topic_number}
          </span>

          {/* Badges cluster */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {/* Angle badge */}
            <span className="bg-info-bg text-info text-[9px] px-1.5 py-0.5 rounded font-medium">
              {topic.playlist_angle || `Playlist ${topic.playlist_group}`}
            </span>

            {/* CPM badge */}
            {topic.estimated_cpm && (
              <span className="bg-success-bg text-success text-[9px] px-1.5 py-0.5 rounded font-medium">
                {topic.estimated_cpm}
              </span>
            )}

            {/* Viral badge */}
            {topic.viral_potential && (
              <span className="bg-warning-bg text-warning text-[9px] px-1.5 py-0.5 rounded font-medium">
                {topic.viral_potential?.toLowerCase().includes('high') ? '\uD83D\uDD25 ' : ''}
                {topic.viral_potential}
              </span>
            )}

            {/* Script badge */}
            {(() => {
              const sb = getScriptBadge(topic);
              return sb ? <StatusBadge status={sb.status} label={sb.label} /> : null;
            })()}

            {/* Production badge */}
            {productionBadge && (
              <StatusBadge status={productionBadge.status} label={productionBadge.label} />
            )}

            {/* Review status badge */}
            <StatusBadge
              status={status === 'refining' ? 'active' : status}
              label={status === 'refining' ? 'Refining...' : status}
            />
          </div>

          {/* Action buttons (right-aligned) */}
          <div className="flex items-center gap-1 flex-shrink-0 min-w-[90px] justify-end" onClick={(e) => e.stopPropagation()}>
            {isPending && (
              <>
                <button
                  onClick={() => onApprove(topic)}
                  className="bg-success-bg border border-success-border text-success rounded-lg py-1.5 px-2.5 text-[11px] font-semibold
                    hover:bg-success/20 transition-colors cursor-pointer"
                  title="Approve"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(topic)}
                  className="bg-danger-bg border border-danger-border text-danger rounded-lg py-1.5 px-2.5 text-[11px] font-semibold
                    hover:bg-danger/20 transition-colors cursor-pointer"
                  title="Reject"
                >
                  Reject
                </button>
                <button
                  onClick={() => onRefine(topic)}
                  className="bg-secondary border border-border text-secondary-foreground rounded-lg py-1.5 px-2.5 text-[11px] font-semibold
                    hover:bg-muted transition-colors cursor-pointer"
                  title="Refine"
                >
                  Refine
                </button>
              </>
            )}

            {isApproved && (
              <>
                {canStartProduction(topic) && (
                  <button
                    onClick={() => navigate(`/project/${projectId || topic.project_id}/production?trigger=${topic.id}`)}
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    title="Start Production"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <Link
                  to={`/project/${projectId || topic.project_id}/topics/${topic.id}/script`}
                  className="p-1.5 rounded-lg text-info hover:bg-info-bg transition-colors cursor-pointer"
                  title="View Script"
                >
                  <FileText className="w-4 h-4" />
                </Link>
              </>
            )}

            {!isApproved && (
              <button
                onClick={handleEnterEdit}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            {/* Collapse toggle */}
            <button
              onClick={handleHeaderClick}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform duration-200',
                expanded && 'rotate-180'
              )} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-2 ml-[52px]">
          <h3 className="text-sm font-semibold tracking-tight mb-1">
            {isEditing
              ? (editTopicFields.seo_title || topic.seo_title || topic.original_title)
              : (topic.seo_title || topic.original_title)
            }
          </h3>

          {/* Hook text */}
          {topic.narrative_hook && !isEditing && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {topic.narrative_hook}
            </p>
          )}
        </div>

        {/* Mini avatar row (visible when NOT expanded, NOT editing) */}
        {!expanded && !isEditing && avatar.avatar_name_age && (
          <div className="ml-[52px] mt-2 mb-4">
            <div className="bg-muted/50 border border-border rounded-lg p-2.5 flex gap-4 text-[10px] text-muted-foreground overflow-x-auto">
              {avatar.avatar_name_age && (
                <span className="whitespace-nowrap"><span className="opacity-60 mr-0.5">&#x1F464;</span> {avatar.avatar_name_age}</span>
              )}
              {avatar.occupation_income && (
                <span className="whitespace-nowrap"><span className="opacity-60 mr-0.5">&#x1F4BC;</span> {avatar.occupation_income}</span>
              )}
              {avatar.pain_point && (
                <span className="whitespace-nowrap"><span className="opacity-60 mr-0.5">&#x1F624;</span> {avatar.pain_point}</span>
              )}
              {avatar.emotional_driver && (
                <span className="whitespace-nowrap"><span className="opacity-60 mr-0.5">&#x1F4AD;</span> {avatar.emotional_driver}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Production progress bar */}
      {productionProgress != null && (
        <div className="px-5 pb-2">
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${productionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded content */}
      {(expanded || isEditing) && (
        <div className="px-5 pb-5 pt-2 border-t border-border ml-0 animate-fade-in space-y-4">
          {isEditing ? (
            /* ---- EDIT MODE ---- */
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">SEO Title</label>
                  <input
                    data-testid="edit-seo-title"
                    type="text"
                    value={editTopicFields.seo_title || ''}
                    onChange={(e) => setEditTopicFields((p) => ({ ...p, seo_title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground
                      focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">Narrative Hook</label>
                  <textarea
                    data-testid="edit-narrative-hook"
                    value={editTopicFields.narrative_hook || ''}
                    onChange={(e) => setEditTopicFields((p) => ({ ...p, narrative_hook: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground
                      focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">Key Segments</label>
                  <textarea
                    data-testid="edit-key-segments"
                    value={editTopicFields.key_segments || ''}
                    onChange={(e) => setEditTopicFields((p) => ({ ...p, key_segments: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground
                      focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none"
                  />
                </div>

                {/* Grand Master topic fields */}
                {GRAND_MASTER_FIELDS.map(({ key, label, rows }) => (
                  <div key={key}>
                    <label className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">{label}</label>
                    <textarea
                      data-testid={`edit-${key}`}
                      value={editTopicFields[key] || ''}
                      onChange={(e) => setEditTopicFields((p) => ({ ...p, [key]: e.target.value }))}
                      rows={rows}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground
                        focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none"
                      placeholder={label}
                    />
                  </div>
                ))}
              </div>

              {/* Avatar fields */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Customer Avatar</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {AVATAR_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                      <input
                        data-testid={`edit-avatar-${key}`}
                        type="text"
                        value={editAvatarFields[key] || ''}
                        onChange={(e) => setEditAvatarFields((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground
                          focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  data-testid="edit-cancel"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    text-muted-foreground hover:text-foreground hover:bg-muted border border-border
                    transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  data-testid="edit-save"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold
                    bg-primary text-primary-foreground hover:bg-primary-hover
                    transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            /* ---- READ-ONLY EXPANDED ---- */
            <>
              {/* Narrative hook */}
              {topic.narrative_hook && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">Narrative Hook</p>
                  <p className="text-sm leading-relaxed">{topic.narrative_hook}</p>
                </div>
              )}

              {/* Key segments */}
              {topic.key_segments && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">Key Segments</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{topic.key_segments}</p>
                </div>
              )}

              {/* Grand Master topic fields */}
              {GRAND_MASTER_FIELDS.some(({ key }) => topic[key]) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {GRAND_MASTER_FIELDS.map(({ key, label }) => (
                    topic[key] ? (
                      <div key={key}>
                        <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{topic[key]}</p>
                      </div>
                    ) : null
                  ))}
                </div>
              )}

              {/* Metadata row */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground/70">CPM:</strong> {topic.estimated_cpm || '\u2014'}</span>
                <span><strong className="text-foreground/70">Viral:</strong> {topic.viral_potential || '\u2014'}</span>
                <span><strong className="text-foreground/70">Playlist:</strong> {topic.playlist_angle || '\u2014'}</span>
              </div>

              {/* Full avatar */}
              {avatar.avatar_name_age && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Customer Avatar</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {AVATAR_FIELDS.map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                        <p className="text-sm">{avatar[key] || '\u2014'}</p>
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
