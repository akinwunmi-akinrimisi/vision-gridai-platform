import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';

// Local Card alias — codebase uses raw div+tailwind for cards (no shadcn Card)
const Card = ({ className = '', children, ...rest }) => (
  <div className={`bg-card border border-border rounded-xl ${className}`} {...rest}>
    {children}
  </div>
);

/**
 * AU FY-aware calendar surface. Reads country_calendar_events for AU.
 * The calendar is a planning view — events are populated by migration 032
 * seeds and the cron-driven RBA seeder.
 */
export default function AUCalendar() {
  const { id: projectId } = useParams();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['au-calendar-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_calendar_events')
        .select('*')
        .eq('country_target', 'AU')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  // Group by FY-quarter so the operator sees the rhythm
  const groups = events.reduce((acc, e) => {
    const d = new Date(e.scheduled_at);
    const m = d.getMonth();
    let q;
    if (m >= 6 && m <= 8) q = 'Q1 (Jul–Sep)';
    else if (m >= 9 && m <= 11) q = 'Q2 (Oct–Dec)';
    else if (m >= 0 && m <= 2) q = 'Q3 (Jan–Mar)';
    else q = 'Q4 (Apr–Jun)';
    (acc[q] = acc[q] || []).push(e);
    return acc;
  }, {});

  const eventColor = (type) => {
    if (type === 'eofy' || type === 'fy_start') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
    if (type === 'federal_budget') return 'bg-red-500/15 text-red-700 dark:text-red-300';
    if (type === 'rba_cash_rate') return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
    if (type === 'q4_window_open' || type === 'black_friday') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="AU Financial Calendar"
        subtitle="Australian FY (Jul → Jun): EOFY, RBA, Budget, HECS, Q4 anchors"
      />

      {isLoading && (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading calendar…</div>
      )}

      {!isLoading && events.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <CalendarIcon className="w-8 h-8 mx-auto mb-3 opacity-40" />
          No upcoming AU events. RBA dates are seeded by cron after migration.
        </Card>
      )}

      {!isLoading && events.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groups).map(([quarter, quarterEvents]) => (
            <section key={quarter}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {quarter}
              </h2>
              <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                {quarterEvents.map((e) => {
                  const d = new Date(e.scheduled_at);
                  return (
                    <Card key={e.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${eventColor(e.event_type)}`}>
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {e.event_name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}
                            {d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(e.affected_sub_niches || []).map((sn) => (
                              <Badge key={sn} variant="secondary" className="text-2xs">
                                {sn.replace(/_au$/, '').replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                          {e.publish_within_hours != null && (
                            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Publish window: {e.publish_within_hours}h
                            </p>
                          )}
                          {e.event_type === 'federal_budget' && (
                            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              4-hour competitive moat — production target: same-night publish
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Card className="mt-6 p-4 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              How this drives production
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              <code>WF_TOPIC_INTELLIGENCE</code> reads upcoming events when generating daily AU topic candidates — seasonal anchors get +15% gap-score modifier. <code>WF_COACH_REPORT</code> flags Q4 (October) and EOFY (May) as high-priority production windows.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
