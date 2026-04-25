import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollText, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/shared/PageHeader';

const Card = ({ className = '', children, ...rest }) => (
  <div className={`bg-card border border-border rounded-xl ${className}`} {...rest}>
    {children}
  </div>
);

/**
 * Monthly coach reports list + drill-down for an AU project. Reads from
 * coach_reports table populated by WF_COACH_REPORT cron 1st of month.
 */
export default function AUCoachReports() {
  const { id: projectId } = useParams();
  const [openId, setOpenId] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['au-coach-reports', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('coach_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('country_target', 'AU')
        .order('report_period_start', { ascending: false })
        .limit(24);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="AU Coach Reports"
        subtitle="Monthly strategic directives from coach_monthly_au prompt"
      />

      {isLoading && (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      )}

      {!isLoading && reports.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <ScrollText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          No coach reports yet. First report generates on the 1st of next month after this project ships ≥1 video.
        </Card>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const isOpen = openId === r.id;
          const monthLabel = new Date(r.report_period_start).toLocaleDateString(
            'en-AU',
            { month: 'long', year: 'numeric' }
          );
          const report = parseReport(r.report_jsonb);
          return (
            <Card key={r.id} className="overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : r.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{monthLabel}</h3>
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(r.generated_at).toLocaleDateString('en-AU')}
                      {r.cost_usd && ` · $${parseFloat(r.cost_usd).toFixed(2)} compute`}
                    </p>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 text-sm">
                  {report.executive_summary && (
                    <Section title="Executive Summary">
                      <ul className="space-y-1 text-muted-foreground">
                        {report.executive_summary.map((b, i) => <li key={i}>• {b}</li>)}
                      </ul>
                    </Section>
                  )}

                  {report.directives && report.directives.length > 0 && (
                    <Section title={`Directives (${report.directives.length})`}>
                      <ol className="space-y-2">
                        {report.directives.map((d, i) => (
                          <li key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="font-medium text-foreground">{i + 1}. {d.directive || d.action || JSON.stringify(d)}</div>
                            {d.deadline && <div className="text-xs text-muted-foreground mt-1">Due {d.deadline}</div>}
                            {d.success_metric && <div className="text-xs text-muted-foreground mt-0.5">Metric: {d.success_metric}</div>}
                          </li>
                        ))}
                      </ol>
                    </Section>
                  )}

                  {report.next_month_calendar_priorities && report.next_month_calendar_priorities.length > 0 && (
                    <Section title="Next month's anchors">
                      <ul className="space-y-1 text-muted-foreground">
                        {report.next_month_calendar_priorities.map((p, i) => (
                          <li key={i}>• {p.event || JSON.stringify(p)}</li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {!report.executive_summary && (
                    <pre className="text-2xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded">
                      {typeof r.report_jsonb === 'string' ? r.report_jsonb : JSON.stringify(r.report_jsonb, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</h4>
      {children}
    </div>
  );
}

function parseReport(payload) {
  if (!payload) return {};
  if (typeof payload === 'object' && !Array.isArray(payload)) return payload;
  if (typeof payload === 'string') {
    try {
      const cleaned = payload.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }
  return {};
}
