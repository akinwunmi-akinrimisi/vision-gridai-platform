import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';

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
 * Modal showing all failed production_log entries for a given topic.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string|null} topicId
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
    <Modal isOpen={isOpen} onClose={onClose} title="Error Log" maxWidth="max-w-2xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-text-muted dark:text-text-muted-dark">Loading errors...</span>
        </div>
      ) : errors.length === 0 ? (
        <div className="py-12 text-center">
          <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No errors found
          </p>
          <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
            All production steps completed successfully for this topic.
          </p>
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <tr className="border-b border-slate-200/60 dark:border-white/[0.06]">
                <th className="text-left text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-2 px-3 w-[140px]">
                  Timestamp
                </th>
                <th className="text-left text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-2 px-3 w-[80px]">
                  Stage
                </th>
                <th className="text-left text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-2 px-3">
                  Error Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {errors.map((err) => {
                const details = err.details || {};
                const errorMessage = details.error_message || details.error || details.message || JSON.stringify(details);
                const sceneId = details.scene_id || details.scene_number;

                return (
                  <tr key={err.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="py-2 px-3 text-2xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap align-top">
                      {formatTimestamp(err.created_at)}
                    </td>
                    <td className="py-2 px-3 align-top">
                      <span className="badge badge-red text-[9px] px-1.5 py-0.5">
                        {err.stage}
                      </span>
                      {sceneId && (
                        <span className="text-2xs text-slate-400 dark:text-slate-500 ml-1">
                          #{sceneId}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 align-top">
                      <pre className="text-2xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-all leading-relaxed max-w-[350px]">
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
    </Modal>
  );
}
