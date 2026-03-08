import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_CONFIG = {
  SUBSCRIBED: { color: 'bg-emerald-500', label: 'Connected' },
  CONNECTING: { color: 'bg-amber-500 animate-pulse', label: 'Reconnecting' },
  CHANNEL_ERROR: { color: 'bg-red-500', label: 'Disconnected' },
  CLOSED: { color: 'bg-slate-400', label: 'Disconnected' },
  TIMED_OUT: { color: 'bg-red-500', label: 'Disconnected' },
};

/**
 * Displays Supabase Realtime connection health as a colored dot + label.
 * Subscribes to a lightweight heartbeat channel to track connection state.
 */
export default function ConnectionStatus({ collapsed = false }) {
  const [status, setStatus] = useState('CONNECTING');
  const channelRef = useRef(null);

  useEffect(() => {
    const channel = supabase
      .channel('heartbeat')
      .subscribe((newStatus) => {
        setStatus(newStatus);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.CLOSED;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? config.label : undefined}
    >
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.color}`} />
      {!collapsed && (
        <span className="text-xs text-text-muted dark:text-text-muted-dark">
          {config.label}
        </span>
      )}
    </div>
  );
}
