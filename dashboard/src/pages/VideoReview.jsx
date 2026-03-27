import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useVideoReview } from '../hooks/useVideoReview';
import { useTopics } from '../hooks/useTopics';
import {
  useApproveVideo,
  useRejectVideo,
  useRegenerateThumbnail,
  useUpdateMetadata,
  useRetryUpload,
} from '../hooks/usePublishMutations';
import VideoPlayer from '../components/video/VideoPlayer';
import ThumbnailPreview from '../components/video/ThumbnailPreview';
import CaptionPreview from '../components/video/CaptionPreview';
import ProductionSummary from '../components/video/ProductionSummary';
import UploadProgress from '../components/video/UploadProgress';
import MetadataPanel from '../components/video/MetadataPanel';
import PublishDialog from '../components/video/PublishDialog';
import RejectDialog from '../components/video/RejectDialog';
import StatusBadge from '../components/shared/StatusBadge';
import { Button } from '@/components/ui/button';

const STATUS_MAP = {
  assembled: { status: 'assembled', label: 'Ready for Review' },
  video_approved: { status: 'approved', label: 'Approved' },
  publishing: { status: 'active', label: 'Publishing' },
  scheduled: { status: 'review', label: 'Scheduled' },
  published: { status: 'published', label: 'Published' },
  upload_failed: { status: 'failed', label: 'Upload Failed' },
  rejected: { status: 'rejected', label: 'Rejected' },
};

const REVIEWABLE_STATUSES = [
  'assembled', 'video_approved', 'publishing', 'scheduled', 'published', 'upload_failed',
];

export default function VideoReview() {
  const { id: projectId, topicId } = useParams();
  const navigate = useNavigate();

  const { topic, scenes, isLoading, error } = useVideoReview(topicId);
  const { data: allTopics } = useTopics(projectId);

  const approveVideo = useApproveVideo(projectId);
  const rejectVideo = useRejectVideo(projectId);
  const regenThumbnail = useRegenerateThumbnail(projectId);
  const updateMetadata = useUpdateMetadata(projectId);
  const retryUpload = useRetryUpload(projectId);

  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const reviewableTopics = useMemo(
    () => (allTopics || []).filter((t) =>
      REVIEWABLE_STATUSES.includes(t.status) || REVIEWABLE_STATUSES.includes(t.video_review_status)
    ),
    [allTopics]
  );

  const currentIndex = useMemo(
    () => reviewableTopics.findIndex((t) => t.id === topicId),
    [reviewableTopics, topicId]
  );

  const prevTopic = currentIndex > 0 ? reviewableTopics[currentIndex - 1] : null;
  const nextTopic = currentIndex < reviewableTopics.length - 1 ? reviewableTopics[currentIndex + 1] : null;

  const isPublished = topic?.status === 'published';
  const videoReviewStatus = topic?.video_review_status || topic?.status;

  const handleApprove = useCallback(({ action, scheduleTime }) => {
    approveVideo.mutate({ topicId, action, scheduleTime });
    setShowPublishDialog(false);
  }, [approveVideo, topicId]);

  const handleReject = useCallback(({ feedback, rollbackStage }) => {
    rejectVideo.mutate({ topicId, feedback, rollbackStage });
    setShowRejectDialog(false);
  }, [rejectVideo, topicId]);

  const handleRegenThumbnail = useCallback((prompt) => {
    regenThumbnail.mutate({ topicId, prompt });
  }, [regenThumbnail, topicId]);

  const handleUpdateMetadata = useCallback((fields) => {
    updateMetadata.mutate({ topicId, fields });
  }, [updateMetadata, topicId]);

  const handleRetryUpload = useCallback(() => {
    retryUpload.mutate({ topicId });
  }, [retryUpload, topicId]);

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4" data-testid="video-review-page">
        <div className="h-6 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-48 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-card border border-border rounded-xl h-96 animate-pulse" />
          <div className="lg:col-span-8 bg-card border border-border rounded-xl h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="animate-fade-in" data-testid="video-review-page">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {error ? 'Error loading topic.' : 'Topic not found.'}
          </p>
          <Link
            to={`/project/${projectId}`}
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:text-primary-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const mappedStatus = STATUS_MAP[videoReviewStatus] || { status: 'pending', label: videoReviewStatus };

  return (
    <div className="animate-slide-up space-y-4" data-testid="video-review-page">
      {/* Published banner */}
      {isPublished && (
        <div
          className="px-4 py-3 rounded-xl bg-success-bg border border-success-border"
          data-testid="published-banner"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <span className="text-sm font-semibold text-success">
              Published on{' '}
              {topic.published_at
                ? new Date(topic.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'unknown date'}
            </span>
            {topic.youtube_url && (
              <a
                href={topic.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  View on YouTube
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <Link
          to={`/project/${projectId}`}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
          {topic.topic_number}
        </span>

        <h1 className="text-sm sm:text-base font-bold tracking-tight flex-1 min-w-0 truncate">
          {topic.seo_title || topic.original_title}
        </h1>

        {topic.playlist_group && (
          <StatusBadge
            status="review"
            label={`Playlist ${topic.playlist_group}`}
            className="hidden sm:inline-flex"
          />
        )}

        <StatusBadge status={mappedStatus.status} label={mappedStatus.label} />

        {/* Prev/Next arrows */}
        <div className="flex items-center gap-1 ml-auto sm:ml-2">
          <button
            onClick={() =>
              prevTopic &&
              navigate(`/project/${projectId}/topics/${prevTopic.id}/review`)
            }
            disabled={!prevTopic}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous topic"
            data-testid="prev-topic-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {currentIndex >= 0 ? currentIndex + 1 : '-'}/{reviewableTopics.length}
          </span>
          <button
            onClick={() =>
              nextTopic &&
              navigate(`/project/${projectId}/topics/${nextTopic.id}/review`)
            }
            disabled={!nextTopic}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next topic"
            data-testid="next-topic-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="lg:hidden">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm font-bold truncate max-w-[200px]">
            {topic.seo_title || topic.original_title}
          </span>
          {!isPublished && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowPublishDialog(true)}
                disabled={approveVideo.isPending}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRejectDialog(true)}
                disabled={rejectVideo.isPending}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Metadata Panel (sticky, desktop only) */}
        <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
          <MetadataPanel
            topic={topic}
            scenes={scenes}
            isPublished={isPublished}
            onApprove={() => setShowPublishDialog(true)}
            onReject={() => setShowRejectDialog(true)}
            onRegenThumbnail={handleRegenThumbnail}
            onUpdateMetadata={handleUpdateMetadata}
            onRetryUpload={handleRetryUpload}
            isRegenPending={regenThumbnail.isPending}
            isUpdatePending={updateMetadata.isPending}
            isRetryPending={retryUpload.isPending}
          />
        </div>

        {/* Right: Video content */}
        <div className="lg:col-span-8 space-y-4">
          <VideoPlayer topic={topic} />
          <ThumbnailPreview thumbnailUrl={topic.thumbnail_url} />
          <UploadProgress
            publishProgress={topic.publish_progress}
            onRetry={handleRetryUpload}
          />
          <CaptionPreview scenes={scenes} />
          <ProductionSummary topic={topic} scenes={scenes} />
        </div>
      </div>

      {/* Gate 3 Publish Dialog */}
      <PublishDialog
        isOpen={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        onConfirm={handleApprove}
        topic={topic}
        projectId={projectId}
        loading={approveVideo.isPending}
      />

      {/* Reject Dialog */}
      <RejectDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
        loading={rejectVideo.isPending}
      />
    </div>
  );
}
