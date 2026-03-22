import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import { CheckCircle2, Rocket, RefreshCw, LayoutGrid, LayoutList, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useTopics, useApproveTopics, useRejectTopics, useRefineTopic, useEditTopic, useEditAvatar } from '../hooks/useTopics';
import { webhookCall } from '../lib/api';
import TopicCard from '../components/topics/TopicCard';
import TopicSummaryBar from '../components/topics/TopicSummaryBar';
import TopicBulkBar from '../components/topics/TopicBulkBar';
import RefinePanel from '../components/topics/RefinePanel';
import SkeletonCard from '../components/ui/SkeletonCard';
import FilterDropdown from '../components/ui/FilterDropdown';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const PLAYLIST_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '1', label: 'Playlist 1' },
  { value: '2', label: 'Playlist 2' },
  { value: '3', label: 'Playlist 3' },
];

export default function TopicReview() {
  const { id: projectId } = useParams();
  const { data: topics = [], isLoading } = useTopics(projectId);

  const approveMutation = useApproveTopics(projectId);
  const rejectMutation = useRejectTopics(projectId);
  const refineMutation = useRefineTopic(projectId);
  const editMutation = useEditTopic(projectId);
  const editAvatarMutation = useEditAvatar(projectId);

  // View mode: 'grouped' (default), 'cards', 'table'
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('gridai-topic-view-mode') || 'grouped'; } catch { return 'grouped'; }
  });

  useEffect(() => {
    try { localStorage.setItem('gridai-topic-view-mode', viewMode); } catch {}
  }, [viewMode]);

  // State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [playlistFilter, setPlaylistFilter] = useState('all');
  const [panelType, setPanelType] = useState(null); // 'refine' only (edit is inline in TopicCard)
  const [panelTopic, setPanelTopic] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, topic?, topics? }
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Counts
  const counts = useMemo(() => {
    const approved = topics.filter((t) => t.review_status === 'approved').length;
    const rejected = topics.filter((t) => t.review_status === 'rejected').length;
    const pending = topics.filter((t) => t.review_status === 'pending' || t.review_status === 'refining').length;
    return { total: topics.length, approved, rejected, pending };
  }, [topics]);

  // Filtered + grouped
  const groupedTopics = useMemo(() => {
    let filtered = topics;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.review_status === statusFilter);
    }
    if (playlistFilter !== 'all') {
      filtered = filtered.filter((t) => String(t.playlist_group) === playlistFilter);
    }

    const groups = {};
    for (const topic of filtered) {
      const key = topic.playlist_angle || `Playlist ${topic.playlist_group || '?'}`;
      if (!groups[key]) groups[key] = { name: key, group: topic.playlist_group, topics: [] };
      groups[key].topics.push(topic);
    }
    return Object.values(groups).sort((a, b) => (a.group || 0) - (b.group || 0));
  }, [topics, statusFilter, playlistFilter]);

  // Flat filtered list for Cards/Table modes
  const filteredTopics = useMemo(() => {
    let filtered = topics;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.review_status === statusFilter);
    }
    if (playlistFilter !== 'all') {
      filtered = filtered.filter((t) => String(t.playlist_group) === playlistFilter);
    }
    return filtered;
  }, [topics, statusFilter, playlistFilter]);

  const allResolved = counts.total > 0 && counts.pending === 0;
  const hasRejected = counts.rejected > 0;

  // Selection
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Actions
  const handleApprove = (topic) => {
    setConfirmAction({ type: 'approve', topic });
  };

  const handleReject = (topic) => {
    setRejectFeedback('');
    setConfirmAction({ type: 'reject', topic });
  };

  const handleRefine = (topic) => {
    setPanelType('refine');
    setPanelTopic(topic);
  };

  // Edit is now handled inline in TopicCard — no SidePanel needed
  const handleEdit = () => {
    // no-op: TopicCard handles edit mode internally via isEditing state
  };

  const handleBulkApprove = () => {
    setConfirmAction({ type: 'bulk-approve', topics: [...selectedIds] });
  };

  const handleBulkReject = () => {
    setRejectFeedback('');
    setConfirmAction({ type: 'bulk-reject', topics: [...selectedIds] });
  };

  const handleApproveAll = () => {
    const pendingIds = topics.filter((t) => t.review_status === 'pending').map((t) => t.id);
    setConfirmAction({ type: 'approve-all', topics: pendingIds });
  };

  const confirmExecute = async () => {
    const action = confirmAction;
    if (!action) return;

    try {
      if (action.type === 'approve') {
        await approveMutation.mutateAsync({ topic_ids: [action.topic.id] });
        toast.success(`Approved: ${action.topic.seo_title}`);
      } else if (action.type === 'reject') {
        await rejectMutation.mutateAsync({ topic_ids: [action.topic.id], feedback: rejectFeedback || undefined });
        toast.success(`Rejected: ${action.topic.seo_title}`);
      } else if (action.type === 'bulk-approve') {
        await approveMutation.mutateAsync({ topic_ids: action.topics });
        toast.success(`Approved ${action.topics.length} topics`);
        setSelectedIds(new Set());
      } else if (action.type === 'bulk-reject') {
        await rejectMutation.mutateAsync({ topic_ids: action.topics, feedback: rejectFeedback || undefined });
        toast.success(`Rejected ${action.topics.length} topics`);
        setSelectedIds(new Set());
      } else if (action.type === 'approve-all') {
        await approveMutation.mutateAsync({ topic_ids: action.topics });
        toast.success(`Approved all ${action.topics.length} pending topics`);
      } else if (action.type === 'regenerate-rejected') {
        await webhookCall('topics/regenerate-rejected', { project_id: projectId });
        toast.success('Regenerating rejected topics...');
      }
    } catch (err) {
      toast.error(err?.message || 'Action failed');
    }
    setConfirmAction(null);
    setRejectFeedback('');
  };

  const handleRefineSubmit = async (instructions) => {
    try {
      await refineMutation.mutateAsync({ topic_id: panelTopic.id, instructions });
      toast.success('Refining topic...');
      setPanelType(null);
      setPanelTopic(null);
    } catch (err) {
      toast.error(err?.message || 'Refine failed');
    }
  };

  // Confirm dialog content
  const confirmDialogProps = useMemo(() => {
    if (!confirmAction) return {};
    const a = confirmAction;
    if (a.type === 'approve') return { title: 'Approve Topic', message: `Approve "${a.topic.seo_title}"?`, confirmText: 'Approve', confirmVariant: 'success' };
    if (a.type === 'reject') return { title: 'Reject Topic', message: `Reject "${a.topic.seo_title}"?`, confirmText: 'Reject', confirmVariant: 'danger' };
    if (a.type === 'bulk-approve') return { title: 'Approve Selected', message: `Approve ${a.topics.length} selected topics?`, confirmText: 'Approve All', confirmVariant: 'success' };
    if (a.type === 'bulk-reject') return { title: 'Reject Selected', message: `Reject ${a.topics.length} selected topics?`, confirmText: 'Reject All', confirmVariant: 'danger' };
    if (a.type === 'approve-all') return { title: 'Approve All Pending', message: `Approve all ${a.topics.length} pending topics?`, confirmText: 'Approve All', confirmVariant: 'success' };
    if (a.type === 'regenerate-rejected') return { title: 'Regenerate Rejected', message: `Regenerate all ${counts.rejected} rejected topics with AI?`, confirmText: 'Regenerate', confirmVariant: 'primary' };
    return {};
  }, [confirmAction, counts.rejected]);

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Topic Review</h1>
          <p className="page-subtitle">Review, approve, or refine generated topics</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasRejected && (
            <button
              onClick={() => setConfirmAction({ type: 'regenerate-rejected' })}
              className="btn-secondary btn-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Regenerate Rejected</span>
              <span className="sm:hidden">Regen</span>
            </button>
          )}
          {counts.pending > 0 && (
            <button
              onClick={handleApproveAll}
              className="btn-success btn-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve All
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <TopicSummaryBar {...counts} />

      {/* Filters + View mode toggle */}
      <div className="flex items-center gap-2 sm:gap-3 mb-5 overflow-x-auto">
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterDropdown label="Playlist" value={playlistFilter} onChange={setPlaylistFilter} options={PLAYLIST_OPTIONS} />

        <div className="ml-auto flex items-center gap-0.5 bg-slate-100 dark:bg-white/[0.04] rounded-lg p-0.5">
          {[
            { mode: 'grouped', icon: Layers, title: 'Grouped' },
            { mode: 'cards', icon: LayoutGrid, title: 'Cards' },
            { mode: 'table', icon: LayoutList, title: 'Table' },
          ].map(({ mode, icon: Icon, title }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={title}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === mode
                  ? 'bg-white dark:bg-white/[0.08] text-primary shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* All resolved banner */}
      {allResolved && (
        <div className="flex items-center justify-between px-5 py-4 mb-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200/50 dark:border-emerald-500/20 gradient-border-visible">
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              All topics reviewed! Start production for {counts.approved} approved topics
            </span>
          </div>
          <button className="btn-success btn-sm">
            Start Production
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && topics.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-slate-500 dark:text-slate-400 mb-2">No topics yet</p>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            Generate topics from the Research page to get started.
          </p>
        </div>
      )}

      {/* Topic cards -- 3 view modes */}
      {!isLoading && topics.length > 0 && (
        <>
          {/* GROUPED view (default) */}
          {viewMode === 'grouped' && groupedTopics.length > 0 && (
            <div className="space-y-6">
              {groupedTopics.map((group) => (
                <div key={group.name}>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <span className={`badge ${group.group === 1 ? 'badge-blue' : group.group === 2 ? 'badge-green' : 'badge-purple'}`}>
                      {group.name}
                    </span>
                    <span className="text-xs text-text-muted dark:text-text-muted-dark font-normal">
                      {group.topics.length} topics
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {group.topics.map((topic) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        isSelected={selectedIds.has(topic.id)}
                        onToggleSelect={toggleSelect}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRefine={handleRefine}
                        onEdit={handleEdit}
                        onSave={(vars) => editMutation.mutateAsync(vars)}
                        onSaveAvatar={(vars) => editAvatarMutation.mutateAsync(vars)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CARDS view (flat list) */}
          {viewMode === 'cards' && (
            <div className="space-y-2">
              {filteredTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  isSelected={selectedIds.has(topic.id)}
                  onToggleSelect={toggleSelect}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRefine={handleRefine}
                  onEdit={handleEdit}
                  onSave={(vars) => editMutation.mutateAsync(vars)}
                  onSaveAvatar={(vars) => editAvatarMutation.mutateAsync(vars)}
                />
              ))}
            </div>
          )}

          {/* TABLE view (compact sortable) */}
          {viewMode === 'table' && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.04]">
                      <th className="table-header table-cell w-10">#</th>
                      <th className="table-header table-cell text-left">Title</th>
                      <th className="table-header table-cell w-24">Playlist</th>
                      <th className="table-header table-cell w-24">Status</th>
                      <th className="table-header table-cell w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopics.map((topic) => (
                      <tr key={topic.id} className="table-row">
                        <td className="table-cell text-xs font-bold text-slate-400 tabular-nums font-mono">{topic.topic_number}</td>
                        <td className="table-cell font-medium text-slate-800 dark:text-slate-200 truncate max-w-[250px]">
                          {topic.seo_title || topic.original_title}
                        </td>
                        <td className="table-cell text-xs text-text-muted dark:text-text-muted-dark">{topic.playlist_angle || '--'}</td>
                        <td className="table-cell">
                          <span className={`badge ${topic.review_status === 'approved' ? 'badge-green' : topic.review_status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                            {topic.review_status}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {topic.review_status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(topic)} className="text-xs text-emerald-500 hover:text-emerald-600 font-medium cursor-pointer">Approve</button>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <button onClick={() => handleReject(topic)} className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer">Reject</button>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <button onClick={() => handleRefine(topic)} className="text-xs text-primary hover:text-primary-600 font-medium cursor-pointer">Refine</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filtered empty */}
          {filteredTopics.length === 0 && topics.length > 0 && (
            <p className="text-center text-sm text-text-muted dark:text-text-muted-dark py-8">
              No topics match the current filters.
            </p>
          )}
        </>
      )}

      {/* Bulk action bar */}
      <TopicBulkBar
        selectedCount={selectedIds.size}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Refine panel */}
      <RefinePanel
        topic={panelType === 'refine' ? panelTopic : null}
        onClose={() => { setPanelType(null); setPanelTopic(null); }}
        onSubmit={handleRefineSubmit}
        isLoading={refineMutation.isPending}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => { setConfirmAction(null); setRejectFeedback(''); }}
        onConfirm={confirmExecute}
        loading={approveMutation.isPending || rejectMutation.isPending}
        {...confirmDialogProps}
      >
        {(confirmAction?.type === 'reject' || confirmAction?.type === 'bulk-reject') && (
          <textarea
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Rejection feedback (optional)"
            rows={3}
            className="input mt-3 resize-none"
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
