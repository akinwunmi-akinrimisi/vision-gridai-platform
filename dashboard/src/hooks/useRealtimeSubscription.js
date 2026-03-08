import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Subscribe to Supabase Realtime postgres_changes on a table.
 * Automatically invalidates TanStack Query caches when events arrive.
 *
 * @param {string} table - Table name (e.g., 'projects', 'topics', 'scenes')
 * @param {string|null} filter - PostgREST filter string (e.g., 'project_id=eq.abc') or null for all rows
 * @param {Array<Array<string>>} queryKeys - TanStack Query keys to invalidate on change
 * @returns {{ status: string }} - Current channel subscription status
 */
export function useRealtimeSubscription(table, filter, queryKeys) {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);
  const statusRef = useRef('CLOSED');

  useEffect(() => {
    if (!table) return;

    const channelName = `${table}-${filter || 'all'}-${Date.now()}`;

    const channelConfig = {
      event: '*',
      schema: 'public',
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, () => {
        // Invalidate all provided query keys
        if (queryKeys) {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      })
      .subscribe((status) => {
        statusRef.current = status;
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter]); // queryKeys intentionally excluded - caller should pass stable reference

  return { status: statusRef.current };
}
