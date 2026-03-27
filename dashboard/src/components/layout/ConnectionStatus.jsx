import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel('connection-check').subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-success' : 'bg-danger'
            }`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{connected ? 'Realtime connected' : 'Disconnected'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
