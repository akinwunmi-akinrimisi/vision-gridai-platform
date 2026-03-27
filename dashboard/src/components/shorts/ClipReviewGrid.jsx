import { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  SkipForward,
  Zap,
  Play,
  Activity,
  Film,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useShorts,
  useApproveClip,
  useSkipClip,
  useBulkApproveClips,
  useUpdateClip,
  useProduceClip,
  useProduceAllApproved,
  useCancelProduction,
  useReproduceClip,
} from '../../hooks/useShorts';
import { Button } from '@/components/ui/button';
import KPICard from '../shared/KPICard';
import EmptyState from '../shared/EmptyState';
import ClipCard from './ClipCard';
import { ProductionRow } from './ProductionProgress';
import ClipPreviewModal from '../social/ClipPreviewModal';
import SkeletonCard from '../ui/SkeletonCard';

/**
 * ClipReviewGrid: Gate 4 review experience.
 * Shows summary stats, bulk actions, clip cards grid, and production status table.
 *
 * @param {{ topicId: string, topic: object, onBack: () => void }} props
 */
export default function ClipReviewGrid({ topicId, topic, onBack }) {
  const { data: clips = [], isLoading } = useShorts(topicId);
  const approveMutation = useApproveClip(topicId);
  const skipMutation = useSkipClip(topicId);
  const bulkApproveMutation = useBulkApproveClips(topicId);
  const updateMutation = useUpdateClip(topicId);
  const produceClipMutation = useProduceClip(topicId);
  const produceAllMutation = useProduceAllApproved(topicId);
  const cancelMutation = useCancelProduction(topicId);
  const reproduceMutation = useReproduceClip(topicId);
  const [previewClip, setPreviewClip] = useState(null);

  // -- Computed counts --

  const counts = useMemo(() => {
    const total = clips.length;
    const approved = clips.filter((c) => c.review_status === 'approved').length;
    const skipped = clips.filter((c) => c.review_status === 'skipped').length;
    const pending = clips.filter((c) => c.review_status === 'pending').length;
    const produced = clips.filter(
      (c) => c.production_status === 'complete' || c.production_status === 'uploaded'
    ).length;
    const producing = clips.filter((c) => c.production_status === 'producing').length;
    const failed = clips.filter((c) => c.production_status === 'failed').length;
    const cancelled = clips.filter((c) => c.production_status === 'cancelled').length;
    const producible = clips.filter(
      (c) => c.review_status === 'approved' && c.production_status === 'pending'
    ).length;
    return { total, approved, skipped, pending, produced, producing, failed, cancelled, producible };
  }, [clips]);

  const sortedClips = useMemo(() => {
    return [...clips].sort((a, b) => (b.virality_score || 0) - (a.virality_score || 0));
  }, [clips]);

  const pendingClips = useMemo(() => clips.filter((c) => c.review_status === 'pending'), [clips]);
  const approvedClips = useMemo(() => clips.filter((c) => c.review_status === 'approved'), [clips]);

  // -- Handlers --

  const handleApprove = useCallback((clipId) => {
    approveMutation.mutate({ clipId }, {
      onError: (err) => toast.error(err?.message || 'Failed to approve clip'),
    });
  }, [approveMutation]);

  const handleSkip = useCallback((clipId) => {
    skipMutation.mutate({ clipId }, {
      onError: (err) => toast.error(err?.message || 'Failed to skip clip'),
    });
  }, [skipMutation]);

  const handleSave = useCallback((vars) => {
    updateMutation.mutate(vars, {
      onSuccess: () => toast.success('Clip updated'),
      onError: (err) => toast.error(err?.message || 'Failed to update clip'),
    });
  }, [updateMutation]);

  const handleBulkApproveAll = useCallback(() => {
    const ids = pendingClips.map((c) => c.id);
    if (ids.length === 0) return;
    bulkApproveMutation.mutate({ clipIds: ids }, {
      onSuccess: () => toast.success(`Approved all ${ids.length} clips`),
      onError: (err) => toast.error(err?.message || 'Bulk approve failed'),
    });
  }, [pendingClips, bulkApproveMutation]);

  const handleBulkApproveTop10 = useCallback(() => {
    const top10 = sortedClips
      .filter((c) => c.review_status === 'pending')
      .slice(0, 10)
      .map((c) => c.id);
    if (top10.length === 0) return;
    bulkApproveMutation.mutate({ clipIds: top10 }, {
      onSuccess: () => toast.success(`Approved top ${top10.length} clips`),
      onError: (err) => toast.error(err?.message || 'Bulk approve failed'),
    });
  }, [sortedClips, bulkApproveMutation]);

  const handleSkipRemaining = useCallback(() => {
    const remaining = pendingClips.map((c) => c.id);
    remaining.forEach((id) => skipMutation.mutate({ clipId: id }));
    if (remaining.length > 0) {
      toast.success(`Skipping ${remaining.length} remaining clips`);
    }
  }, [pendingClips, skipMutation]);

  const handleProduce = useCallback((clipId) => {
    produceClipMutation.mutate({ clipId }, {
      onSuccess: () => toast.success('Production started for clip'),
      onError: (err) => toast.error(err?.message || 'Failed to trigger production'),
    });
  }, [produceClipMutation]);

  const handleProduceAll = useCallback(() => {
    produceAllMutation.mutate(undefined, {
      onSuccess: () => toast.success(`Production triggered for ${counts.producible} clips`),
      onError: (err) => toast.error(err?.message || 'Failed to trigger bulk production'),
    });
  }, [produceAllMutation, counts.producible]);

  const handleCancel = useCallback((clipId) => {
    cancelMutation.mutate({ clipId }, {
      onSuccess: () => toast.success('Production cancelled'),
      onError: (err) => toast.error(err?.message || 'Failed to cancel'),
    });
  }, [cancelMutation]);

  const handleReproduce = useCallback((clipId) => {
    reproduceMutation.mutate({ clipId }, {
      onSuccess: () => toast.success('Re-producing clip'),
      onError: (err) => toast.error(err?.message || 'Failed to re-produce clip'),
    });
  }, [reproduceMutation]);

  // -- Summary stats config --

  const summaryStats = [
    { label: 'Total', value: counts.total },
    { label: 'Pending', value: counts.pending },
    { label: 'Approved', value: counts.approved },
    { label: 'Skipped', value: counts.skipped },
    { label: 'Producible', value: counts.producible },
    { label: 'Producing', value: counts.producing },
    { label: 'Complete', value: counts.produced },
    { label: 'Failed', value: counts.failed },
    { label: 'Cancelled', value: counts.cancelled },
  ];

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Topics
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {topic?.seo_title || topic?.original_title || 'Clip Review'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gate 4 -- Review viral clip candidates
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <p className="text-2xs text-muted-foreground font-medium uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {(counts.pending > 0 || counts.producible > 0) && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {counts.pending > 0 && (
            <>
              <Button
                size="sm"
                onClick={handleBulkApproveAll}
                disabled={bulkApproveMutation.isPending}
                className="gap-1.5 bg-success hover:bg-success/90 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve All ({counts.pending})
              </Button>
              {counts.pending >= 10 && (
                <Button
                  size="sm"
                  onClick={handleBulkApproveTop10}
                  disabled={bulkApproveMutation.isPending}
                  className="gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Approve Top 10
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipRemaining}
                disabled={skipMutation.isPending}
                className="gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip Remaining
              </Button>
            </>
          )}
          {counts.producible > 0 && (
            <>
              {counts.pending > 0 && (
                <span className="w-px h-5 bg-border mx-1" />
              )}
              <Button
                size="sm"
                onClick={handleProduceAll}
                disabled={produceAllMutation.isPending}
                className="gap-1.5"
              >
                {produceAllMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Produce Approved ({counts.producible})
              </Button>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && clips.length === 0 && (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={Film}
            title="No clips yet"
            description='Run "Analyze for Viral Clips" from the topic list to generate clip candidates.'
          />
        </div>
      )}

      {/* Clip grid */}
      {!isLoading && sortedClips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedClips.map((clip, i) => (
            <div
              key={clip.id}
              className={`animate-slide-up stagger-${Math.min(i + 1, 8)}`}
              style={{ opacity: 0 }}
            >
              <ClipCard
                clip={clip}
                topicId={topicId}
                onApprove={handleApprove}
                onSkip={handleSkip}
                onSave={handleSave}
                isSaving={updateMutation.isPending}
                onProduce={handleProduce}
                isProducing={produceClipMutation.isPending}
                onReproduce={handleReproduce}
                onPreview={setPreviewClip}
              />
            </div>
          ))}
        </div>
      )}

      {/* Production status section */}
      {approvedClips.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Production Status
            {counts.producible > 0 && (
              <span className="text-2xs font-normal text-muted-foreground ml-1">
                ({counts.producible} ready to produce)
              </span>
            )}
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Clip</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Title</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">Duration</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Progress</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Drive</th>
                    <th className="p-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedClips.map((clip) => (
                    <ProductionRow
                      key={clip.id}
                      clip={clip}
                      onProduce={handleProduce}
                      isProducing={produceClipMutation.isPending}
                      onCancel={handleCancel}
                      onReproduce={handleReproduce}
                      onPreview={setPreviewClip}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ClipPreviewModal
        isOpen={!!previewClip}
        onClose={() => setPreviewClip(null)}
        clip={previewClip}
      />
    </div>
  );
}
