import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import StatusBadge from '../shared/StatusBadge';

/**
 * Format ISO date string to a compact local timestamp.
 */
function formatTimestamp(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Dialog showing all failed production_log entries for a given topic.
 */
export default function ErrorLogModal({ isOpen, onClose, topicId }) {
  const { data: errors = [], isLoading } = useQuery({
    queryKey: ['error-log', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_log')
        .select('id, stage, action, details, created_at')
        .eq('topic_id', topicId)
        .eq('action', 'failed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId && isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Error Log</DialogTitle>
          <DialogDescription>
            Failed production steps for this topic.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading errors...</span>
          </div>
        ) : errors.length === 0 ? (
          <div className="py-12 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">
              No errors found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All production steps completed successfully for this topic.
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            <table className="w-full">
              <thead className="sticky top-0 bg-background/90 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-3 w-[140px]">
                    Timestamp
                  </th>
                  <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-3 w-[80px]">
                    Stage
                  </th>
                  <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-3">
                    Error Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {errors.map((err) => {
                  const details = err.details || {};
                  const errorMessage = details.error_message || details.error || details.message || JSON.stringify(details);
                  const sceneId = details.scene_id || details.scene_number;

                  return (
                    <tr key={err.id} className="hover:bg-card-hover">
                      <td className="py-2 px-3 text-2xs text-muted-foreground tabular-nums whitespace-nowrap align-top">
                        {formatTimestamp(err.created_at)}
                      </td>
                      <td className="py-2 px-3 align-top">
                        <StatusBadge status="failed" label={err.stage} />
                        {sceneId && (
                          <span className="text-2xs text-muted-foreground ml-1">
                            #{sceneId}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        <pre className="text-2xs font-mono text-danger whitespace-pre-wrap break-all leading-relaxed max-w-[350px]">
                          {typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
