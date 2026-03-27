import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import { CheckCircle2, Rocket, RefreshCw, LayoutGrid, LayoutList, Layers, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTopics, useApproveTopics, useRejectTopics, useRefineTopic, useEditTopic, useEditAvatar } from '../hooks/useTopics';
import { webhookCall } from '../lib/api';
import PageHeader from '../components/shared/PageHeader';
import TopicCard from '../components/topics/TopicCard';
import TopicSummaryBar from '../components/topics/TopicSummaryBar';
import TopicBulkBar from '../components/topics/TopicBulkBar';
import RefinePanel from '../components/topics/RefinePanel';
import FilterDropdown from '../components/ui/FilterDropdown';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/*  Filter options                                                     */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function TopicSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-3 w-1/2 bg-muted rounded" />
        </div>
        <div className="h-5 w-16 bg-muted rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TopicReview Page                                                   */
/* ------------------------------------------------------------------ */

export default function TopicReview() {
  const { id: projectId } = useParams();
  const { data: topics = [], isLoading } = useTopics(projectId);

  const approveMutation = useApproveTopics(projectId);
  const rejectMutation = useRejectTopics(projectId);
  const refineMutation = useRefineTopic(projectId);
  const editMutation = useEditTopic(projectId);
  const editAvatarMutation = useEditAvatar(projectId);

  // View mode persisted in localStorage
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
  const [panelType, setPanelType] = useState(null);
  const [panelTopic, setPanelTopic] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
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
    if (statusFilter !== 'all') filtered = filtered.filter((t) => t.review_status === statusFilter);
    if (playlistFilter !== 'all') filtered = filtered.filter((t) => String(t.playlist_group) === playlistFilter);

    const groups = {};
    for (const topic of filtered) {
      const key = topic.playlist_angle || `Playlist ${topic.playlist_group || '?'}`;
      if (!groups[key]) groups[key] = { name: key, group: topic.playlist_group, topics: [] };
      groups[key].topics.push(topic);
    }
    return Object.values(groups).sort((a, b) => (a.group || 0) - (b.group || 0));
  }, [topics, statusFilter, playlistFilter]);

  // Flat filtered list
  const filteredTopics = useMemo(() => {
    let filtered = topics;
    if (statusFilter !== 'all') filtered = filtered.filter((t) => t.review_status === statusFilter);
    if (playlistFilter !== 'all') filtered = filtered.filter((t) => String(t.playlist_group) === playlistFilter);
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
  const handleApprove = (topic) => setConfirmAction({ type: 'approve', topic });
  const handleReject = (topic) => { setRejectFeedback(''); setConfirmAction({ type: 'reject', topic }); };
  const handleRefine = (topic) => { setPanelType('refine'); setPanelTopic(topic); };
  const handleEdit = () => {};

  const handleBulkApprove = () => setConfirmAction({ type: 'bulk-approve', topics: [...selectedIds] });
  const handleBulkReject = () => { setRejectFeedback(''); setConfirmAction({ type: 'bulk-reject', topics: [...selectedIds] }); };

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

  // Subtitle string
  const subtitle = `${counts.total} topics \u00B7 ${counts.approved} approved \u00B7 ${counts.pending} pending \u00B7 ${counts.rejected} rejected`;

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <PageHeader title="Topics" subtitle={subtitle}>
        {hasRejected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction({ type: 'regenerate-rejected' })}
          >
            <RefreshCw className="w-3.5 h-3.5 text-warning" />
            Regenerate Rejected
          </Button>
        )}
        {counts.pending > 0 && (
          <Button
            size="sm"
            onClick={handleApproveAll}
            className="bg-success text-success-foreground hover:bg-success/90 shadow-glow-success"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve All Pending
          </Button>
        )}
      </PageHeader>

      {/* Summary bar */}
      <TopicSummaryBar {...counts} />

      {/* Filters + view mode toggle */}
      <div className="flex items-center gap-2 sm:gap-3 mb-5 overflow-x-auto">
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterDropdown label="Playlist" value={playlistFilter} onChange={setPlaylistFilter} options={PLAYLIST_OPTIONS} />

        <div className="ml-auto flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
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
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* All resolved banner */}
      {allResolved && (
        <div className="flex items-center justify-between px-5 py-4 mb-5 rounded-xl bg-success-bg border border-success-border animate-fade-in">
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-success" />
            <span className="text-sm font-semibold text-success">
              All topics reviewed! Start production for {counts.approved} approved topics.
            </span>
          </div>
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90">
            Start Production
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <TopicSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && topics.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">No topics yet</p>
          <p className="text-xs text-muted-foreground">
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
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                      group.group === 1 ? 'bg-info-bg text-info' :
                      group.group === 2 ? 'bg-success-bg text-success' :
                      'bg-warning-bg text-warning'
                    }`}>
                      {group.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {group.topics.length} topics
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.topics.map((topic, i) => (
                      <div key={topic.id} className={`stagger-${Math.min(i + 1, 8)} animate-slide-up`}>
                        <TopicCard
                          topic={topic}
                          projectId={projectId}
                          isSelected={selectedIds.has(topic.id)}
                          onToggleSelect={toggleSelect}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onRefine={handleRefine}
                          onEdit={handleEdit}
                          onSave={(vars) => editMutation.mutateAsync(vars)}
                          onSaveAvatar={(vars) => editAvatarMutation.mutateAsync(vars)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CARDS view (flat list) */}
          {viewMode === 'cards' && (
            <div className="space-y-2">
              {filteredTopics.map((topic, i) => (
                <div key={topic.id} className={`stagger-${Math.min(i + 1, 8)} animate-slide-up`}>
                  <TopicCard
                    topic={topic}
                    projectId={projectId}
                    isSelected={selectedIds.has(topic.id)}
                    onToggleSelect={toggleSelect}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onRefine={handleRefine}
                    onEdit={handleEdit}
                    onSave={(vars) => editMutation.mutateAsync(vars)}
                    onSaveAvatar={(vars) => editAvatarMutation.mutateAsync(vars)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* TABLE view (compact) */}
          {viewMode === 'table' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-10">#</th>
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Title</th>
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-28">Playlist</th>
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-24">Status</th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopics.map((topic) => (
                      <tr key={topic.id} className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-muted-foreground tabular-nums font-mono">{topic.topic_number}</td>
                        <td className="px-4 py-3 font-medium truncate max-w-[250px]">
                          {topic.seo_title || topic.original_title}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{topic.playlist_angle || '--'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border ${
                            topic.review_status === 'approved' ? 'bg-success-bg text-success border-success-border' :
                            topic.review_status === 'rejected' ? 'bg-danger-bg text-danger border-danger-border' :
                            'bg-warning-bg text-warning border-warning-border'
                          }`}>
                            {topic.review_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {topic.review_status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(topic)} className="text-xs text-success hover:text-success/80 font-medium cursor-pointer">Approve</button>
                                <span className="text-border">|</span>
                                <button onClick={() => handleReject(topic)} className="text-xs text-danger hover:text-danger/80 font-medium cursor-pointer">Reject</button>
                                <span className="text-border">|</span>
                                <button onClick={() => handleRefine(topic)} className="text-xs text-primary hover:text-primary-hover font-medium cursor-pointer">Refine</button>
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
            <p className="text-center text-sm text-muted-foreground py-8">
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
            className="w-full mt-3 px-3 py-2 rounded-lg text-sm bg-muted border border-border
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40
              transition-all resize-none"
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
