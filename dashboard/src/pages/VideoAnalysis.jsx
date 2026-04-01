import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Loader2,
  Eye,
  ThumbsUp,
  MessageSquare,
  Timer,
  Target,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Star,
  ExternalLink,
  Rocket,
} from 'lucide-react';
import { useVideoAnalysis, NICHES } from '../hooks/useYouTubeDiscovery';
import PageHeader from '../components/shared/PageHeader';
import { Button } from '@/components/ui/button';

function formatDuration(secs) {
  if (!secs) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function Section({ icon: Icon, title, children, color = 'text-primary' }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ items }) {
  if (!items || !Array.isArray(items) || items.length === 0) return <p className="text-xs text-muted-foreground">No data</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-muted-foreground flex gap-2">
          <span className="text-primary mt-0.5">-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreBar({ label, value, max = 10 }) {
  const score = parseInt(value) || 0;
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${score >= 8 ? 'bg-success' : score >= 5 ? 'bg-warning' : 'bg-danger'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right">{score}/{max}</span>
    </div>
  );
}

export default function VideoAnalysis() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { data: analysis, isLoading } = useVideoAnalysis(analysisId);

  const isProcessing = analysis?.status === 'pending' || analysis?.status === 'fetching_transcript' || analysis?.status === 'analyzing';
  const isComplete = analysis?.status === 'complete';
  const isFailed = analysis?.status === 'failed';
  const a = analysis?.analysis || {};
  const niche = NICHES.find((n) => n.key === analysis?.niche_category);

  const handleCreateProject = () => {
    navigate('/', {
      state: {
        openCreateModal: true,
        prefillNiche: niche?.label || analysis?.niche_category || '',
        prefillDescription: [
          analysis?.video_title,
          '',
          'Based on competitive analysis of: ' + analysis?.video_url,
          'Channel: ' + analysis?.channel_name,
          '',
          a.one_line_summary || '',
          '',
          'Blue Ocean Angle: ' + (a.ten_x_strategy?.recommended_angle || ''),
          '',
          'Key Differentiators:',
          ...(a.ten_x_strategy?.key_differentiators || []).map((d) => '- ' + d),
        ].join('\n'),
        analysisIds: [analysisId],
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Video Analysis"
        subtitle={analysis?.video_title || 'Loading...'}
      >
        <Button variant="ghost" size="sm" onClick={() => navigate('/youtube-discovery')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Discovery
        </Button>
      </PageHeader>

      {/* Video info bar */}
      {analysis && (
        <div className="flex items-start gap-4 mb-6 bg-card border border-border rounded-xl p-4">
          {analysis.thumbnail_url && (
            <img src={analysis.thumbnail_url} alt="" className="w-40 h-24 object-cover rounded-lg flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <a href={analysis.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1">
              {analysis.video_title}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
            <p className="text-xs text-muted-foreground mt-1">{analysis.channel_name}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(analysis.views)}</span>
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{formatNumber(analysis.likes)}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatNumber(analysis.comments)}</span>
              <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{formatDuration(analysis.duration_seconds)}</span>
              {niche && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                  {niche.label}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold mb-1">
            {analysis?.status === 'fetching_transcript' ? 'Fetching transcript...' :
             analysis?.status === 'analyzing' ? 'Analyzing with Claude Sonnet 4...' :
             'Starting analysis...'}
          </p>
          <p className="text-xs text-muted-foreground">
            This takes 30-60 seconds for a full transcript analysis.
          </p>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="bg-card border border-danger-border rounded-xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
          <p className="text-sm text-danger font-semibold mb-2">Analysis failed</p>
          <p className="text-xs text-muted-foreground">{analysis?.error || 'Unknown error'}</p>
        </div>
      )}

      {/* Complete — show analysis */}
      {isComplete && a && (
        <>
          {/* Overall score + summary */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Overall Score</p>
                <p className="text-3xl font-bold tabular-nums">{a.overall_score || '--'}<span className="text-sm text-muted-foreground">/10</span></p>
              </div>
              <Button onClick={handleCreateProject} className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary">
                <Rocket className="w-4 h-4" />
                Create Project from Analysis
              </Button>
            </div>
            {a.one_line_summary && (
              <p className="text-sm text-muted-foreground border-t border-border pt-3">{a.one_line_summary}</p>
            )}
          </div>

          {/* 10x Strategy (most important — show first) */}
          {a.ten_x_strategy && (
            <Section icon={Rocket} title="10x Strategy" color="text-success">
              <div className="space-y-3">
                {a.ten_x_strategy.recommended_angle && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Recommended Angle</p>
                    <p className="text-xs font-medium">{a.ten_x_strategy.recommended_angle}</p>
                  </div>
                )}
                {a.ten_x_strategy.suggested_title && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Suggested Title</p>
                    <p className="text-xs font-semibold text-primary">{a.ten_x_strategy.suggested_title}</p>
                  </div>
                )}
                {a.ten_x_strategy.opening_hook_suggestion && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Opening Hook</p>
                    <p className="text-xs italic">{a.ten_x_strategy.opening_hook_suggestion}</p>
                  </div>
                )}
                <BulletList items={a.ten_x_strategy.key_differentiators} />
                {a.ten_x_strategy.target_duration && (
                  <p className="text-[10px] text-muted-foreground">Target duration: {a.ten_x_strategy.target_duration}</p>
                )}
              </div>
            </Section>
          )}

          {/* Blue Ocean Analysis */}
          {a.blue_ocean_analysis && (
            <Section icon={Target} title="Blue Ocean Analysis" color="text-accent">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Gaps & Opportunities</p>
                  <BulletList items={a.blue_ocean_analysis.gaps_and_opportunities} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Contrarian Angles</p>
                  <BulletList items={a.blue_ocean_analysis.contrarian_angles} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Untapped Audience Segments</p>
                  <BulletList items={a.blue_ocean_analysis.untapped_audience_segments} />
                </div>
              </div>
            </Section>
          )}

          {/* Strengths & Weaknesses side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Section icon={Star} title="Strengths" color="text-success">
              <BulletList items={a.strengths} />
            </Section>
            <Section icon={AlertTriangle} title="Weaknesses" color="text-danger">
              <BulletList items={a.weaknesses} />
            </Section>
          </div>

          {/* Script Structure */}
          {a.script_structure && (
            <Section icon={TrendingUp} title="Script Structure">
              <div className="space-y-3">
                <ScoreBar label="Hook Strength" value={a.script_structure.hook_analysis?.match(/\d+/)?.[0]} />
                {a.script_structure.narrative_arc && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Narrative Arc</p>
                    <p className="text-xs">{a.script_structure.narrative_arc}</p>
                  </div>
                )}
                {a.script_structure.pacing && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pacing</p>
                    <p className="text-xs">{a.script_structure.pacing}</p>
                  </div>
                )}
                <BulletList items={a.script_structure.chapter_breakdown} />
              </div>
            </Section>
          )}

          {/* Engagement Analysis */}
          {a.engagement_analysis && (
            <Section icon={Lightbulb} title="Engagement Analysis">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Retention Hooks</p>
                  <BulletList items={a.engagement_analysis.retention_hooks} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Emotional Triggers</p>
                  <BulletList items={a.engagement_analysis.emotional_triggers} />
                </div>
              </div>
            </Section>
          )}

          {/* Content Quality */}
          {a.content_quality && (
            <Section icon={Star} title="Content Quality">
              <ScoreBar label="Depth Score" value={a.content_quality.depth_score} />
              <div className="space-y-3 mt-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Unique Insights</p>
                  <BulletList items={a.content_quality.unique_insights} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Missing Topics</p>
                  <BulletList items={a.content_quality.missing_topics} />
                </div>
              </div>
            </Section>
          )}

          {/* Bottom CTA */}
          <div className="flex justify-center py-6">
            <Button onClick={handleCreateProject} size="lg" className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary">
              <Rocket className="w-5 h-5" />
              Create Project from This Analysis
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
