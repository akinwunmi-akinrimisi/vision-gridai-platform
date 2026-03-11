import { Link, useNavigate } from 'react-router';
import { CheckCircle2, ExternalLink, Eye, ChevronRight } from 'lucide-react';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';

const STATUS_CONFIG = {
  pending:         { label: 'Pending',          cls: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400' },
  approved:        { label: 'Approved',         cls: 'badge badge-blue' },
  scripting:       { label: 'Scripting',        cls: 'badge badge-cyan' },
  script_approved: { label: 'Script OK',        cls: 'badge badge-green' },
  queued:          { label: 'Queued',           cls: 'badge badge-amber' },
  producing:       { label: 'Producing',        cls: 'badge badge-amber animate-pulse' },
  audio:           { label: 'Audio',            cls: 'badge badge-purple' },
  images:          { label: 'Images',           cls: 'badge badge-purple' },
  assembling:      { label: 'Assembling',       cls: 'badge badge-purple' },
  assembled:       { label: 'Assembled',        cls: 'badge badge-blue' },
  ready_review:    { label: 'Review',           cls: 'badge badge-amber' },
  video_approved:  { label: 'Approved',         cls: 'badge badge-blue' },
  publishing:      { label: 'Publishing',       cls: 'badge badge-amber animate-pulse' },
  scheduled:       { label: 'Scheduled',        cls: 'badge badge-purple' },
  published:       { label: 'Published',        cls: 'badge badge-green', icon: true },
  upload_failed:   { label: 'Failed',           cls: 'badge badge-red' },
  failed:          { label: 'Failed',           cls: 'badge badge-red' },
  stopped:         { label: 'Stopped',          cls: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400' },
  rejected:        { label: 'Rejected',         cls: 'badge badge-red' },
};

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

function computeProgress(topic) {
  const { status, audio_progress, images_progress, i2v_progress, t2v_progress, assembly_status } = topic;
  if (['published', 'assembled', 'ready_review', 'video_approved', 'scheduled'].includes(status)) return 100;
  if (['publishing'].includes(status)) return 95;
  if (!['producing', 'audio', 'images', 'assembling', 'queued'].includes(status)) return null;

  const audio = parseProgress(audio_progress);
  const images = parseProgress(images_progress);
  const i2v = parseProgress(i2v_progress);
  const t2v = parseProgress(t2v_progress);
  const assembly = assembly_status === 'complete' ? 100 : 0;

  return Math.round(audio * 0.2 + images * 0.2 + i2v * 0.15 + t2v * 0.15 + assembly * 0.3);
}

function formatNumber(num) {
  if (num == null || num === 0) return '--';
  return num.toLocaleString();
}

function formatRevenue(num) {
  if (num == null || num === 0) return '--';
  return `$${num.toLocaleString()}`;
}

function truncate(str, max = 45) {
  if (!str) return '--';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function getProgressColor(progress) {
  if (progress >= 100) return 'from-emerald-400 to-emerald-500';
  if (progress >= 60) return 'from-primary-400 to-accent-500';
  if (progress >= 30) return 'from-amber-400 to-orange-500';
  return 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500';
}

export default function PipelineTable({ topics, projectId }) {
  const navigate = useNavigate();
  useRealtimeSubscription(
    projectId ? 'topics' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['topics', projectId]]
  );

  if (!topics || topics.length === 0) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="section-title">Pipeline Status</h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
            All topics and their production progress
          </p>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            Pipeline table will populate when topics are generated
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <h2 className="section-title">Pipeline Status</h2>
        <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
          {topics.length} topics across all stages
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/[0.04]">
              <th className="table-header table-cell w-12">#</th>
              <th className="table-header table-cell">Title</th>
              <th className="table-header table-cell w-28">Status</th>
              <th className="table-header table-cell w-32">Progress</th>
              <th className="table-header table-cell text-right w-16">Score</th>
              <th className="table-header table-cell text-right w-20">Views</th>
              <th className="table-header table-cell text-right w-20">Revenue</th>
              <th className="table-header table-cell text-right w-16"></th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => {
              const progress = computeProgress(topic);
              const statusCfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG.pending;
              const hasReviewAction = (topic.status === 'assembled' || topic.status === 'ready_review' || topic.video_review_status === 'approved') && topic.status !== 'published' && topic.status !== 'publishing';
              const isPublished = topic.status === 'published' && topic.youtube_url;

              return (
                <tr
                  key={topic.id}
                  data-testid={`topic-row-${topic.id}`}
                  className="table-row-interactive"
                  onClick={() => navigate(`/project/${projectId}/topics/${topic.id}`)}
                >
                  <td className="table-cell">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                      {topic.topic_number}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {truncate(topic.seo_title || topic.original_title)}
                    </span>
                    {topic.playlist_angle && (
                      <span className="block text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {topic.playlist_angle}
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span data-testid={`status-badge-${topic.id}`} className={statusCfg.cls}>
                      {statusCfg.icon && <CheckCircle2 className="w-3 h-3" />}
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="table-cell" data-testid={`progress-${topic.id}`}>
                    {progress != null ? (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 progress-bar max-w-[80px]">
                          <div
                            className={`progress-bar-fill bg-gradient-to-r ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-2xs font-medium text-slate-500 dark:text-slate-400 tabular-nums w-8 text-right">
                          {progress}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xs text-slate-300 dark:text-slate-600">--</span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    {topic.script_quality_score != null ? (
                      <span className={`text-xs font-semibold tabular-nums ${
                        topic.script_quality_score >= 7 ? 'text-emerald-600 dark:text-emerald-400' :
                        topic.script_quality_score >= 5 ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {topic.script_quality_score}
                      </span>
                    ) : (
                      <span className="text-2xs text-slate-300 dark:text-slate-600">--</span>
                    )}
                  </td>
                  <td className="table-cell text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                    {formatNumber(topic.yt_views)}
                  </td>
                  <td className="table-cell text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                    {formatRevenue(topic.yt_estimated_revenue)}
                  </td>
                  <td className="table-cell text-right">
                    {hasReviewAction && (
                      <Link
                        to={`/project/${projectId}/topics/${topic.id}/review`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary dark:text-blue-400 hover:text-primary-600 dark:hover:text-blue-300 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Review
                      </Link>
                    )}
                    {isPublished && (
                      <a
                        href={topic.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-auto" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
