import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router';
import { CheckCircle2, Rocket, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTopics, useApproveTopics, useRejectTopics, useRefineTopic, useEditTopic } from '../hooks/useTopics';
import { webhookCall } from '../lib/api';
import TopicCard from '../components/topics/TopicCard';
import TopicSummaryBar from '../components/topics/TopicSummaryBar';
import TopicBulkBar from '../components/topics/TopicBulkBar';
import RefinePanel from '../components/topics/RefinePanel';
import EditPanel from '../components/topics/EditPanel';
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

  // State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [playlistFilter, setPlaylistFilter] = useState('all');
  const [panelType, setPanelType] = useState(null); // 'refine' | 'edit'
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

  const handleEdit = (topic) => {
    setPanelType('edit');
    setPanelTopic(topic);
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

  const handleEditSubmit = async (fields) => {
    try {
      await editMutation.mutateAsync({ topic_id: panelTopic.id, fields });
      toast.success('Topic updated');
      setPanelType(null);
      setPanelTopic(null);
    } catch (err) {
      toast.error(err?.message || 'Edit failed');
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
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Topic Review</h1>
          <p className="page-subtitle">Review, approve, or refine generated topics</p>
        </div>

        <div className="flex items-center gap-2">
          {hasRejected && (
            <button
              onClick={() => setConfirmAction({ type: 'regenerate-rejected' })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/[0.08]
                border border-amber-200/50 dark:border-amber-500/20
                hover:bg-amber-100 dark:hover:bg-amber-500/[0.12] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate Rejected
            </button>
          )}
          {counts.pending > 0 && (
            <button
              onClick={handleApproveAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                text-white bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve All
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <TopicSummaryBar {...counts} />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterDropdown label="Playlist" value={playlistFilter} onChange={setPlaylistFilter} options={PLAYLIST_OPTIONS} />
      </div>

      {/* All resolved banner */}
      {allResolved && (
        <div className="flex items-center justify-between px-5 py-4 mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200/50 dark:border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              All topics reviewed! Start production for {counts.approved} approved topics
            </span>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer"
          >
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

      {/* Grouped topic cards */}
      {!isLoading && groupedTopics.length > 0 && (
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
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Filtered empty */}
          {groupedTopics.length === 0 && topics.length > 0 && (
            <p className="text-center text-sm text-text-muted dark:text-text-muted-dark py-8">
              No topics match the current filters.
            </p>
          )}
        </div>
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

      {/* Edit panel */}
      <EditPanel
        topic={panelType === 'edit' ? panelTopic : null}
        onClose={() => { setPanelType(null); setPanelTopic(null); }}
        onSubmit={handleEditSubmit}
        isLoading={editMutation.isPending}
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
            className="w-full mt-3 px-3 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
