import { QueryClient, keepPreviousData } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Persisted react-query cache so dashboard refresh shows last-known data
// instantly while revalidating in the background. Without this, every
// hard-refresh wiped the in-memory cache and every page sat on isLoading
// for the duration of the (3-5s) /webhook/dashboard/read shim.
//
// Bump cache key when the query shape changes incompatibly so old cached
// payloads don't render against new component code (rare; do it manually).
export const QUERY_CACHE_KEY = 'vision-gridai-rq-cache-v1';
const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Treat data as fresh for 5 min: avoids the burst of refetches that
      // hit when a route mounts and 5+ hooks all query the same shim.
      staleTime: 5 * ONE_MIN,
      // Keep cache around for 24h so refresh / re-open within a day shows
      // last-known data instantly. The persister flushes to localStorage
      // on every mutation so the cache survives full reloads.
      gcTime: ONE_DAY,
      // When a query key changes (project switch, topic switch), keep the
      // previous data on screen until the new fetch resolves. No more
      // empty-state flashes while navigating between projects/topics.
      placeholderData: keepPreviousData,
      // Tab refocus = quietly revalidate (no flash since data stays mounted).
      refetchOnWindowFocus: 'always',
      // Don't retry-storm a slow shim — one retry is enough.
      retry: 1,
    },
  },
});

export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: QUERY_CACHE_KEY,
  // Compress nothing for now (~kB per project of dashboard reads); revisit
  // if the cache grows past localStorage's 5-10MB envelope.
  throttleTime: 1000,
});
