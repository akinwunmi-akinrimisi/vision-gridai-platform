import { NavLink } from 'react-router';
import { Folder, CheckCircle2, Circle, Loader2, RotateCcw } from 'lucide-react';

const STATUS_BADGE = {
  created: 'badge bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  researching: 'badge badge-amber',
  researching_competitors: 'badge badge-amber',
  researching_pain_points: 'badge badge-amber',
  researching_keywords: 'badge badge-amber',
  researching_blue_ocean: 'badge badge-amber',
  researching_prompts: 'badge badge-amber',
  ready_for_topics: 'badge badge-blue',
  topics_pending_review: 'badge badge-purple',
  active: 'badge badge-green',
  in_production: 'badge badge-green',
  paused: 'badge badge-red',
  research_failed: 'badge badge-red',
};

const STATUS_LABEL = {
  created: 'Created',
  researching: 'Researching',
  researching_competitors: 'Researching',
  researching_pain_points: 'Researching',
  researching_keywords: 'Researching',
  researching_blue_ocean: 'Researching',
  researching_prompts: 'Generating Prompts',
  ready_for_topics: 'Ready for Topics',
  topics_pending_review: 'Topics Pending Review',
  active: 'Active',
  in_production: 'In Production',
  paused: 'Paused',
  research_failed: 'Research Failed',
};

const RESEARCH_STEPS = [
  { key: 'created', label: 'Creating project' },
  { key: 'researching_competitors', label: 'Auditing competitors' },
  { key: 'researching_pain_points', label: 'Mining pain points' },
  { key: 'researching_blue_ocean', label: 'Blue-ocean analysis' },
  { key: 'researching_prompts', label: 'Generating prompts' },
];

const STEP_ORDER = RESEARCH_STEPS.map((s) => s.key);

function getStepStatus(currentStatus, stepKey) {
  const currentIdx = STEP_ORDER.indexOf(currentStatus);
  const stepIdx = STEP_ORDER.indexOf(stepKey);

  if (currentStatus === 'ready_for_topics' || currentStatus === 'topics_pending_review' || currentStatus === 'active' || currentStatus === 'in_production') {
    return 'done';
  }

  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function getSmartRoute(status, projectId) {
  if (!status) return `/project/${projectId}`;

  if (status.startsWith('researching')) return `/project/${projectId}/research`;
  if (status === 'ready_for_topics') return `/project/${projectId}/research`;
  if (status === 'topics_pending_review') return `/project/${projectId}/topics`;
  if (status === 'active' || status === 'in_production') return `/project/${projectId}`;
  if (status === 'research_failed') return `/project/${projectId}/research`;

  return `/project/${projectId}`;
}

function isResearching(status) {
  return status && (status.startsWith('researching') || status === 'created');
}

export default function ProjectCard({ project, onRetry }) {
  const { id, name, niche, status, created_at } = project;
  const badgeClass = STATUS_BADGE[status] || 'badge bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300';
  const badgeLabel = STATUS_LABEL[status] || status;
  const route = getSmartRoute(status, id);
  const showResearchProgress = isResearching(status);

  const createdDate = created_at
    ? new Date(created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <NavLink
      to={route}
      className="card-elevated p-6 group block no-underline"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 dark:from-primary/20 dark:to-indigo-500/20 flex items-center justify-center">
          <Folder className="w-5 h-5 text-primary dark:text-blue-400" />
        </div>
        <span className={badgeClass}>{badgeLabel}</span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
        {name || niche}
      </h3>
      <p className="text-sm text-text-muted dark:text-text-muted-dark mb-4">
        {niche}
      </p>

      {showResearchProgress && (
        <div className="space-y-2 mb-4" data-testid="research-progress">
          {RESEARCH_STEPS.map((step) => {
            const stepStatus = getStepStatus(status, step.key);
            return (
              <div key={step.key} className="flex items-center gap-2.5 text-sm">
                {stepStatus === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 transition-all duration-300" />
                )}
                {stepStatus === 'active' && (
                  <Loader2 className="w-4 h-4 text-amber-500 flex-shrink-0 animate-spin" />
                )}
                {stepStatus === 'pending' && (
                  <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                )}
                <span
                  className={`
                    transition-colors duration-200
                    ${stepStatus === 'done' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                    ${stepStatus === 'active' ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}
                    ${stepStatus === 'pending' ? 'text-slate-400 dark:text-slate-500' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!showResearchProgress && (
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50 dark:border-white/[0.06]">
          <div>
            <p className="text-xs text-text-muted dark:text-text-muted-dark mb-0.5">Topics</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {project.topic_count ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted dark:text-text-muted-dark mb-0.5">Published</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {project.published_count ?? 0}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted dark:text-text-muted-dark mt-3">
        Created {createdDate}
      </p>

      {status === 'research_failed' && onRetry && (
        <button
          data-testid={`retry-research-${id}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRetry({ project_id: id });
          }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
            text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/[0.08]
            border border-amber-200/50 dark:border-amber-500/20
            hover:bg-amber-100 dark:hover:bg-amber-500/[0.12] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry Research
        </button>
      )}
    </NavLink>
  );
}
