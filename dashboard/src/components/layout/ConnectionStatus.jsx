import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_CONFIG = {
  SUBSCRIBED: { color: 'bg-emerald-500', label: 'Connected', ring: 'bg-emerald-500' },
  CONNECTING: { color: 'bg-amber-500', label: 'Reconnecting', ring: 'bg-amber-500' },
  CHANNEL_ERROR: { color: 'bg-red-500', label: 'Disconnected', ring: 'bg-red-500' },
  CLOSED: { color: 'bg-slate-400', label: 'Disconnected', ring: 'bg-slate-400' },
  TIMED_OUT: { color: 'bg-red-500', label: 'Disconnected', ring: 'bg-red-500' },
};

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
  const isConnected = status === 'SUBSCRIBED';

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? config.label : undefined}
    >
      <span className="relative inline-flex h-2 w-2 flex-shrink-0">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${config.ring} ${!isConnected ? 'animate-ping' : ''}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.color}`} />
      </span>
      {!collapsed && (
        <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark">
          {config.label}
        </span>
      )}
    </div>
  );
}
