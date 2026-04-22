import { useEffect, useState } from 'react';
import { dashboardRead } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Health indicator — probes the authenticated dashboard webhook every 30s.
 * Replaces the pre-2026-04-21 Supabase Realtime WebSocket indicator, which
 * can no longer authenticate after migration 030 (anon role is denied by
 * RLS). The dot is green when the most recent probe succeeded, red when it
 * failed, and falls back to "Checking…" on first render.
 */
export default function ConnectionStatus() {
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        await dashboardRead('projects_list');
        if (!cancelled) setConnected(true);
      } catch (_) {
        if (!cancelled) setConnected(false);
      }
    };
    probe();
    const id = setInterval(probe, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const label =
    connected === null ? 'Checking connection…'
    : connected       ? 'Webhook reachable'
                      : 'Webhook unreachable';
  const color =
    connected === null ? 'bg-muted'
    : connected       ? 'bg-success'
                      : 'bg-danger';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`w-2 h-2 rounded-full ${color}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
