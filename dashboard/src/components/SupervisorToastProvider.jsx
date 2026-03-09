import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SupervisorToastContext = createContext({
  toasts: [],
  dismissToast: () => {},
  hasSupervisorAlert: false,
});

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 8000;

/**
 * Global toast provider for supervisor alerts.
 * Subscribes to Supabase Realtime on topics table and shows amber toast
 * when supervisor_alerted flips to true on ANY topic, regardless of page.
 */
export default function SupervisorToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [alertedTopicIds, setAlertedTopicIds] = useState(new Set());
  const timersRef = useRef({});
  const navigate = useNavigate();

  // Auto-dismiss timers
  const scheduleAutoDismiss = useCallback((toastId) => {
    timersRef.current[toastId] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
      delete timersRef.current[toastId];
    }, AUTO_DISMISS_MS);
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
    if (timersRef.current[toastId]) {
      clearTimeout(timersRef.current[toastId]);
      delete timersRef.current[toastId];
    }
  }, []);

  // Fetch initial supervisor_alerted state
  useEffect(() => {
    async function fetchAlerted() {
      const { data } = await supabase
        .from('topics')
        .select('id')
        .eq('supervisor_alerted', true);
      if (data && data.length > 0) {
        setAlertedTopicIds(new Set(data.map((t) => t.id)));
      }
    }
    fetchAlerted();
  }, []);

  // Subscribe to Realtime for supervisor_alerted changes
  useEffect(() => {
    const channelName = `supervisor-toast-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'topics' },
        (payload) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          // Detect supervisor_alerted flipping to true
          if (newRow.supervisor_alerted === true && oldRow.supervisor_alerted !== true) {
            const toastId = `sv-${newRow.id}-${Date.now()}`;
            const toast = {
              id: toastId,
              topicId: newRow.id,
              topicTitle: newRow.seo_title || newRow.original_title || 'Unknown Topic',
              topicNumber: newRow.topic_number,
              projectId: newRow.project_id,
              timestamp: Date.now(),
            };

            setToasts((prev) => {
              const next = [toast, ...prev];
              // Drop oldest if over limit
              if (next.length > MAX_TOASTS) {
                const removed = next.pop();
                if (timersRef.current[removed.id]) {
                  clearTimeout(timersRef.current[removed.id]);
                  delete timersRef.current[removed.id];
                }
              }
              return next;
            });

            setAlertedTopicIds((prev) => new Set([...prev, newRow.id]));
            scheduleAutoDismiss(toastId);
          }

          // Detect supervisor_alerted flipping to false (resolved)
          if (newRow.supervisor_alerted === false && oldRow.supervisor_alerted === true) {
            setAlertedTopicIds((prev) => {
              const next = new Set(prev);
              next.delete(newRow.id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clear all timers
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, [scheduleAutoDismiss]);

  const hasSupervisorAlert = alertedTopicIds.size > 0;

  const handleViewTopic = (toast) => {
    if (toast.projectId) {
      navigate(`/project/${toast.projectId}/production`);
    }
    dismissToast(toast.id);
  };

  return (
    <SupervisorToastContext.Provider value={{ toasts, dismissToast, hasSupervisorAlert }}>
      {children}

      {/* Fixed-position toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              data-testid="supervisor-toast"
              className="
                flex items-start gap-3 p-3 rounded-xl
                bg-amber-500/90 backdrop-blur-sm
                text-white shadow-lg shadow-amber-500/20
                animate-in
              "
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Supervisor Alert</p>
                <p className="text-xs opacity-90 truncate mt-0.5">
                  Topic #{toast.topicNumber} stuck
                  {toast.topicTitle ? ` - ${toast.topicTitle}` : ''}
                </p>
                <button
                  onClick={() => handleViewTopic(toast)}
                  className="
                    inline-flex items-center gap-1 mt-1.5 text-xs font-medium
                    text-white/90 hover:text-white
                    underline underline-offset-2 cursor-pointer
                    transition-colors duration-150
                  "
                >
                  <ExternalLink className="w-3 h-3" />
                  View Production
                </button>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                data-testid="dismiss-toast"
                className="
                  p-0.5 rounded-md
                  hover:bg-white/20
                  transition-colors duration-150 cursor-pointer shrink-0
                "
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SupervisorToastContext.Provider>
  );
}

/**
 * Hook to access supervisor toast state and hasSupervisorAlert flag.
 */
export function useSupervisorToasts() {
  return useContext(SupervisorToastContext);
}
