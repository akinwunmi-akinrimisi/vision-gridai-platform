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

const STATUS_BADGE = {
  assembled: 'badge badge-blue',
  video_approved: 'badge badge-blue',
  publishing: 'badge badge-amber animate-shimmer',
  scheduled: 'badge badge-purple',
  published: 'badge badge-green',
  upload_failed: 'badge badge-red',
  rejected: 'badge badge-red',
};

const STATUS_LABEL = {
  assembled: 'Ready for Review',
  video_approved: 'Approved',
  publishing: 'Publishing',
  scheduled: 'Scheduled',
  published: 'Published',
  upload_failed: 'Upload Failed',
  rejected: 'Rejected',
};

const PLAYLIST_BADGE = {
  1: 'badge badge-blue',
  2: 'badge badge-purple',
  3: 'badge badge-amber',
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
      <div className="animate-in" data-testid="video-review-page">
        <div className="page-header">
          <div className="h-6 w-64 bg-slate-200 dark:bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 dark:bg-white/[0.03] rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 glass-card p-6 h-96 animate-pulse" />
          <div className="lg:col-span-8 glass-card p-6 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="animate-in" data-testid="video-review-page">
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {error ? 'Error loading topic.' : 'Topic not found.'}
          </p>
          <Link
            to={`/project/${projectId}`}
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in" data-testid="video-review-page">
      {/* Published banner */}
      {isPublished && (
        <div
          className="mb-4 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-500/20 animate-in"
          data-testid="published-banner"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
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
                className="btn-ghost btn-sm ml-auto"
              >
                View on YouTube
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Full-width header bar */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <Link
          to={`/project/${projectId}`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.08] dark:to-white/[0.04] flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
          {topic.topic_number}
        </span>

        <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex-1 min-w-0 truncate">
          {topic.seo_title || topic.original_title}
        </h1>

        {topic.playlist_group && (
          <span className={`${PLAYLIST_BADGE[topic.playlist_group] || 'badge badge-blue'} hidden sm:inline-flex`}>
            Playlist {topic.playlist_group}
          </span>
        )}

        {videoReviewStatus && (
          <span className={STATUS_BADGE[videoReviewStatus] || 'badge badge-amber'}>
            {STATUS_LABEL[videoReviewStatus] || videoReviewStatus}
          </span>
        )}

        {/* Prev/Next arrows */}
        <div className="flex items-center gap-1 ml-auto sm:ml-2">
          <button
            onClick={() =>
              prevTopic &&
              navigate(`/project/${projectId}/topics/${prevTopic.id}/review`)
            }
            disabled={!prevTopic}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Previous topic"
            data-testid="prev-topic-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-text-muted dark:text-text-muted-dark tabular-nums">
            {currentIndex >= 0 ? currentIndex + 1 : '-'}/{reviewableTopics.length}
          </span>
          <button
            onClick={() =>
              nextTopic &&
              navigate(`/project/${projectId}/topics/${nextTopic.id}/review`)
            }
            disabled={!nextTopic}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Next topic"
            data-testid="next-topic-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="lg:hidden mb-4">
        <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
            {topic.seo_title || topic.original_title}
          </span>
          {!isPublished && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPublishDialog(true)}
                disabled={approveVideo.isPending}
                className="btn-success btn-sm"
              >
                Approve
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={rejectVideo.isPending}
                className="btn-danger btn-sm"
              >
                Reject
              </button>
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
