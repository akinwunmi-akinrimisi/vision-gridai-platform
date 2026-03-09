import { Link } from 'react-router';
import { CheckCircle2, ExternalLink, Eye } from 'lucide-react';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';

const STATUS_CONFIG = {
  pending:         { label: 'Pending',          cls: 'badge bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300' },
  approved:        { label: 'Approved',         cls: 'badge badge-blue' },
  scripting:       { label: 'Scripting',        cls: 'badge bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  script_approved: { label: 'Script Approved',  cls: 'badge badge-green' },
  queued:          { label: 'Queued',           cls: 'badge badge-amber' },
  producing:       { label: 'Producing',        cls: 'badge badge-amber animate-pulse' },
  audio:           { label: 'Audio',            cls: 'badge badge-purple' },
  images:          { label: 'Images',           cls: 'badge badge-purple' },
  assembling:      { label: 'Assembling',       cls: 'badge badge-purple' },
  assembled:       { label: 'Assembled',        cls: 'badge badge-blue' },
  ready_review:    { label: 'Ready for Review', cls: 'badge badge-amber' },
  video_approved:  { label: 'Approved',         cls: 'badge badge-blue' },
  publishing:      { label: 'Publishing...',    cls: 'badge badge-amber animate-pulse' },
  scheduled:       { label: 'Scheduled',        cls: 'badge badge-purple' },
  published:       { label: 'Published',        cls: 'badge badge-green', icon: true },
  upload_failed:   { label: 'Upload Failed',    cls: 'badge badge-red' },
  failed:          { label: 'Failed',           cls: 'badge badge-red' },
  stopped:         { label: 'Stopped',          cls: 'badge bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300' },
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

  // Weight: audio 20%, images 20%, i2v 15%, t2v 15%, assembly 30%
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

function truncate(str, max = 40) {
  if (!str) return '--';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

export default function PipelineTable({ topics, projectId }) {
  useRealtimeSubscription(
    projectId ? 'topics' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['topics', projectId]]
  );

  if (!topics || topics.length === 0) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 dark:border-white/[0.06]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Pipeline Status
          </h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
            All topics and their production progress
          </p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-sm text-text-muted dark:text-text-muted-dark">
              Pipeline table will populate when topics are generated
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 dark:border-white/[0.06]">
        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          Pipeline Status
        </h2>
        <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
          All topics and their production progress
        </p>
      </div>

      {/* Responsive table with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider border-b border-border/30 dark:border-white/[0.04]">
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Angle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Views</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 dark:divide-white/[0.04]">
            {topics.map((topic) => {
              const progress = computeProgress(topic);
              const statusCfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG.pending;

              return (
                <tr
                  key={topic.id}
                  data-testid={`topic-row-${topic.id}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    #{topic.topic_number}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {truncate(topic.seo_title || topic.original_title)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {topic.playlist_angle || '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`status-badge-${topic.id}`}
                      className={statusCfg.cls}
                    >
                      {statusCfg.icon && <CheckCircle2 className="w-3 h-3" />}
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3" data-testid={`progress-${topic.id}`}>
                    {progress != null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden max-w-[80px]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted dark:text-text-muted-dark tabular-nums">
                          {progress}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted dark:text-text-muted-dark">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {topic.script_quality_score != null ? topic.script_quality_score : '--'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatNumber(topic.yt_views)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRevenue(topic.yt_estimated_revenue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(topic.status === 'assembled' || topic.status === 'ready_review' || topic.video_review_status === 'approved') && topic.status !== 'published' && topic.status !== 'publishing' && (
                      <Link
                        to={`/project/${projectId}/topics/${topic.id}/review`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary dark:text-blue-400 hover:underline"
                      >
                        <Eye className="w-3 h-3" />
                        Review
                      </Link>
                    )}
                    {topic.status === 'published' && topic.youtube_url && (
                      <a
                        href={topic.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        YouTube
                      </a>
                    )}
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
