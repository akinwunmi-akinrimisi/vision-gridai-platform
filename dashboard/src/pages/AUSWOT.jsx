import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Network, Shield, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';

const Card = ({ className = '', children, ...rest }) => (
  <div className={`bg-card border border-border rounded-xl ${className}`} {...rest}>
    {children}
  </div>
);

/**
 * AU per-sub-niche SWOT viewer. Reads analysis_groups rows where
 * project_id matches and name LIKE 'AU SWOT — %'. Populated by
 * WF_COMPETITOR_ANALYZER cron Sunday 02:00 UTC.
 */
export default function AUSWOT() {
  const { id: projectId } = useParams();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['au-swot', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('analysis_groups')
        .select('*')
        .eq('project_id', projectId)
        .like('name', 'AU SWOT — %')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="AU SWOT"
        subtitle="Per-sub-niche competitive synthesis. Refreshes weekly via WF_COMPETITOR_ANALYZER."
      />

      {isLoading && (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      )}

      {!isLoading && groups.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <Network className="w-8 h-8 mx-auto mb-3 opacity-40" />
          No SWOT synthesis yet. <code>WF_COMPETITOR_ANALYZER</code> runs weekly Sunday 02:00 UTC; first run requires ≥3 channel analyses per sub-niche.
        </Card>
      )}

      {groups.map((g) => {
        const swot = parseSWOT(g.swot_payload);
        const subNiche = g.name.replace('AU SWOT — ', '');
        return (
          <Card key={g.id} className="p-5 mb-4">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {subNiche.replace(/_au$/, '').replace(/_/g, ' ')}
              </h2>
              <span className="text-xs text-muted-foreground">
                Updated {new Date(g.updated_at).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SWOTPanel
                title="Strengths"
                icon={Shield}
                color="emerald"
                items={swot.strengths}
              />
              <SWOTPanel
                title="Weaknesses"
                icon={AlertTriangle}
                color="amber"
                items={swot.weaknesses}
              />
              <SWOTPanel
                title="Opportunities"
                icon={Target}
                color="blue"
                items={swot.opportunities}
              />
              <SWOTPanel
                title="Threats"
                icon={TrendingUp}
                color="red"
                items={swot.threats}
              />
            </div>

            {swot.moat_actions?.length > 0 && (
              <div className="mt-5 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="font-semibold text-foreground text-sm mb-3">
                  Moat actions for the next 30 days
                </h3>
                <ol className="space-y-2 text-sm">
                  {swot.moat_actions.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-mono">{i + 1}.</span>
                      <span className="text-muted-foreground">
                        {typeof m === 'string' ? m : (m.action || JSON.stringify(m))}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function SWOTPanel({ title, icon: Icon, color, items = [] }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
    red: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300',
  };
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" />
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary" className="ml-auto text-2xs">{items.length}</Badge>
      </div>
      <ul className="space-y-1.5 text-xs">
        {items.length === 0 ? (
          <li className="text-muted-foreground/70 italic">none surfaced</li>
        ) : (
          items.map((it, i) => (
            <li key={i} className="leading-relaxed">
              • {typeof it === 'string' ? it : JSON.stringify(it)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function parseSWOT(payload) {
  if (!payload) return {};
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return {
      strengths: toArray(payload.strengths),
      weaknesses: toArray(payload.weaknesses),
      opportunities: toArray(payload.opportunities),
      threats: toArray(payload.threats),
      moat_actions: toArray(payload.moat_actions),
    };
  }
  if (typeof payload === 'string') {
    try {
      const cleaned = payload.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      return parseSWOT(JSON.parse(cleaned));
    } catch {
      return {};
    }
  }
  return {};
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v);
  return [];
}
