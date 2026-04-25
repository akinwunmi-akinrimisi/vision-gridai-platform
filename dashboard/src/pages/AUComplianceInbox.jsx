import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';

const Card = ({ className = '', children, ...rest }) => (
  <div className={`bg-card border border-border rounded-xl ${className}`} {...rest}>
    {children}
  </div>
);

/**
 * AU compliance review inbox. Lists every topic with
 * compliance_review_status='pending' (i.e., demonetization audit returned
 * manual_review_required). Each row links to VideoReview where the operator
 * can read the audit panel and approve/reject.
 */
export default function AUComplianceInbox() {
  const { data: pendingTopics = [], isLoading } = useQuery({
    queryKey: ['au-compliance-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, project_id, seo_title, niche_variant, demonetization_audit_result, updated_at, projects(name)')
        .eq('country_target', 'AU')
        .eq('compliance_review_status', 'pending')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="AU Compliance Review Inbox"
        subtitle="Topics whose Gate-3 demonetization audit returned manual_review_required"
      />

      {isLoading && (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      )}

      {!isLoading && pendingTopics.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
          Inbox clear. All AU videos either passed clean audit or have been blocked outright.
        </Card>
      )}

      <div className="space-y-3">
        {pendingTopics.map((t) => {
          const audit = t.demonetization_audit_result || {};
          const violationCount = (audit.violations || []).length;
          const warningCount = (audit.warnings || []).length;
          return (
            <Card key={t.id} className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-semibold text-foreground truncate">
                      {t.seo_title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{t.projects?.name}</span>
                    <span>·</span>
                    <Badge variant="secondary" className="text-2xs">{t.niche_variant}</Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(t.updated_at).toLocaleString('en-AU')}
                    </span>
                  </div>
                  {(violationCount > 0 || warningCount > 0) && (
                    <div className="mt-2 flex gap-2 text-xs">
                      {violationCount > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {violationCount} violation{violationCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {warningCount} warning{warningCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                  {(audit.manual_review_reasons || []).slice(0, 2).map((r, i) => (
                    <p key={i} className="mt-2 text-xs text-muted-foreground">{r}</p>
                  ))}
                </div>
                <Link
                  to={`/project/${t.project_id}/topics/${t.id}/review`}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                >
                  Review →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
