import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ClipboardCheck,
  FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useVideoReview } from '../hooks/useVideoReview';
import { useTopics } from '../hooks/useTopics';
import { useProjectSettings } from '../hooks/useProjectSettings';
import {
  useApproveVideo,
  useRejectVideo,
  useRegenerateThumbnail,
  useUpdateMetadata,
  useRetryUpload,
} from '../hooks/usePublishMutations';
import {
  useGenerateTitleVariants,
  useSelectTitle,
  useScoreThumbnail,
  useStartABTest,
} from '../hooks/useCTROptimization';
import { useCalculatePPS } from '../hooks/usePPS';
import { supabase } from '../lib/supabase';
import VideoPlayer from '../components/video/VideoPlayer';
import ThumbnailPreview from '../components/video/ThumbnailPreview';
import CaptionPreview from '../components/video/CaptionPreview';
import ProductionSummary from '../components/video/ProductionSummary';
import UploadProgress from '../components/video/UploadProgress';
import MetadataPanel from '../components/video/MetadataPanel';
import PublishDialog from '../components/video/PublishDialog';
import RejectDialog from '../components/video/RejectDialog';
import TitlePicker from '../components/video/TitlePicker';
import ThumbnailScorePanel from '../components/video/ThumbnailScorePanel';
import StartABTestModal from '../components/video/StartABTestModal';
import PPSCard from '../components/video/PPSCard';
import StatusBadge from '../components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

/* ------------------------------------------------------------------ */
/*  QA Checklist section                                               */
/* ------------------------------------------------------------------ */
function QAChecklist({ topicId }) {
  const [qaData, setQaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    async function fetchQA() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('production_log')
          .select('details')
          .eq('topic_id', topicId)
          .eq('stage', 'qa_check')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!cancelled) {
          if (error || !data || data.length === 0) {
            setQaData(null);
          } else {
            const details = typeof data[0].details === 'string'
              ? JSON.parse(data[0].details)
              : data[0].details;
            setQaData(details);
          }
        }
      } catch {
        if (!cancelled) setQaData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchQA();
    return () => { cancelled = true; };
  }, [topicId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mt-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  const checks = qaData?.checks || qaData?.items || [];
  const passCount = checks.filter((c) => c.passed || c.status === 'pass').length;
  const totalCount = checks.length;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quality Assurance
          </span>
          {totalCount > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                passCount === totalCount
                  ? 'bg-success-bg text-success'
                  : 'bg-warning-bg text-warning'
              }`}
            >
              {passCount}/{totalCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 animate-fade-in">
          {totalCount === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              QA not yet run. Quality checks will appear after the QA workflow completes.
            </p>
          ) : (
            checks.map((check, i) => {
              const passed = check.passed || check.status === 'pass';
              return (
                <div
                  key={check.name || check.label || i}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className={`flex-shrink-0 mt-0.5 ${passed ? 'text-success' : 'text-danger'}`}>
                    {passed ? '\u2705' : '\u274C'}
                  </span>
                  <span className="text-foreground/80">
                    {check.name || check.label || `Check ${i + 1}`}
                    {check.message && (
                      <span className="text-muted-foreground ml-1">
                        -- {check.message}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoReview() {
  const { id: projectId, topicId } = useParams();
  const navigate = useNavigate();

  const { topic, scenes, isLoading, error } = useVideoReview(topicId);
  const { data: allTopics } = useTopics(projectId);
  const { data: settings } = useProjectSettings(projectId);

  const approveVideo = useApproveVideo(projectId);
  const rejectVideo = useRejectVideo(projectId);
  const regenThumbnail = useRegenerateThumbnail(projectId);
  const updateMetadata = useUpdateMetadata(projectId);
  const retryUpload = useRetryUpload(projectId);

  /* -- Sprint S3: CTR intelligence + A/B testing -- */
  const generateTitles = useGenerateTitleVariants(topicId, projectId);
  const selectTitle = useSelectTitle(topicId);
  const scoreThumbnail = useScoreThumbnail(topicId, projectId);
  const startABTest = useStartABTest(projectId);

  /* -- Sprint S4: PPS (CF13) -- */
  const calculatePPS = useCalculatePPS(topicId, projectId);

  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showABTestModal, setShowABTestModal] = useState(false);
  const [visibility, setVisibility] = useState(null);

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

  // Initialize visibility from project settings when loaded
  useEffect(() => {
    if (settings?.auto_pilot_default_visibility && visibility === null) {
      setVisibility(settings.auto_pilot_default_visibility);
    }
  }, [settings, visibility]);

  const effectiveVisibility = visibility || settings?.auto_pilot_default_visibility || 'unlisted';

  const isPublished = topic?.status === 'published';
  const videoReviewStatus = topic?.video_review_status || topic?.status;

  const handleApprove = useCallback(({ action, scheduleTime }) => {
    approveVideo.mutate({ topicId, action, scheduleTime, visibility: effectiveVisibility });
    setShowPublishDialog(false);
  }, [approveVideo, topicId, effectiveVisibility]);

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

  /* -- Sprint S3 handlers -- */
  const handleGenerateTitles = useCallback(
    async ({ force = false } = {}) => {
      try {
        const res = await generateTitles.mutateAsync({ force });
        if (res?.success === false) {
          toast.error(res.error || 'Failed to generate title variants');
        } else {
          toast.success('Title variants generated');
        }
      } catch (err) {
        toast.error(err?.message || 'Failed to generate title variants');
      }
    },
    [generateTitles],
  );

  const handleSelectTitle = useCallback(
    ({ title, ctr_score }) => {
      if (!title) return;
      selectTitle.mutate(
        { title, ctr_score },
        {
          onError: (err) =>
            toast.error(err?.message || 'Failed to select title'),
        },
      );
    },
    [selectTitle],
  );

  const handleScoreThumbnail = useCallback(
    async ({ thumbnail_url, force = false } = {}) => {
      try {
        const res = await scoreThumbnail.mutateAsync({ thumbnail_url, force });
        if (res?.success === false) {
          toast.error(res.error || 'Thumbnail scoring failed');
        } else {
          toast.success(
            force ? 'Thumbnail regeneration queued' : 'Thumbnail scored',
          );
        }
      } catch (err) {
        toast.error(err?.message || 'Thumbnail scoring failed');
      }
    },
    [scoreThumbnail],
  );

  const handleRegenerateThumbnailCTR = useCallback(
    ({ thumbnail_url } = {}) => handleScoreThumbnail({ thumbnail_url, force: true }),
    [handleScoreThumbnail],
  );

  const handleStartABTest = useCallback(
    async (payload) => {
      const res = await startABTest.mutateAsync(payload);
      return res;
    },
    [startABTest],
  );

  /* -- Sprint S4: PPS recalculate -- */
  const handleCalculatePPS = useCallback(async () => {
    try {
      const res = await calculatePPS.mutateAsync({ force: true });
      if (res?.success === false) {
        toast.error(res.error || 'Failed to calculate PPS');
      } else {
        toast.success('Performance score calculated');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to calculate PPS');
    }
  }, [calculatePPS]);

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
          {/* Sprint S4: Predicted Performance Score (Gate 3 top surface) */}
          <PPSCard
            topic={topic}
            onCalculate={handleCalculatePPS}
            isCalculating={calculatePPS.isPending}
          />

          <VideoPlayer topic={topic} />

          {/* Sprint S3: Title picker (CTR optimizer) */}
          <TitlePicker
            topic={topic}
            onSelect={handleSelectTitle}
            onGenerate={handleGenerateTitles}
            isSelecting={selectTitle.isPending}
            isGenerating={generateTitles.isPending}
          />

          <ThumbnailPreview
            thumbnailUrl={topic.thumbnail_url}
            onGenerate={() => handleRegenThumbnail()}
            isGenerating={regenThumbnail.isPending}
          />

          {/* Sprint S3: Thumbnail CTR scoring */}
          <ThumbnailScorePanel
            topic={topic}
            onScore={handleScoreThumbnail}
            onRegenerate={handleRegenerateThumbnailCTR}
            isScoring={scoreThumbnail.isPending}
          />

          {/* Sprint S3: A/B Test launcher — published only */}
          {topic.youtube_video_id && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-accent" />
                    A/B Testing
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Rotate title or thumbnail variants on the live video to find
                    the winner.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowABTestModal(true)}
                  data-testid="start-ab-test-btn"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  Start A/B Test
                </Button>
              </div>
            </div>
          )}

          <UploadProgress
            publishProgress={topic.publish_progress}
            onRetry={handleRetryUpload}
          />
          <CaptionPreview scenes={scenes} />
          <ProductionSummary topic={topic} scenes={scenes} />

          {/* Visibility selector -- shown before publish */}
          {!isPublished && (
            <div className="bg-card border border-border rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Upload Visibility
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Choose the initial visibility when publishing to YouTube
                  </p>
                </div>
                <Select value={effectiveVisibility} onValueChange={setVisibility}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* QA Checklist */}
          <QAChecklist topicId={topicId} />
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

      {/* Sprint S3: Start A/B Test Modal */}
      <StartABTestModal
        isOpen={showABTestModal}
        onClose={() => setShowABTestModal(false)}
        topic={topic}
        onStart={handleStartABTest}
        isPending={startABTest.isPending}
      />
    </div>
  );
}
