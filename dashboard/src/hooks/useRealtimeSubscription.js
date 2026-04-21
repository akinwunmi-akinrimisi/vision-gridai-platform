/**
 * Realtime subscription — NO-OP STUB (2026-04-21 audit B4.5).
 *
 * After the RLS lockdown in migration 030 the anon role can no longer
 * subscribe to Supabase Realtime (every `postgres_changes` event is
 * filtered by RLS). Opening a WebSocket would just produce zombie
 * connections that never emit. All hooks that depended on this for
 * cache invalidation are now on react-query polling via dashboardRead().
 *
 * Re-enable via an authenticated Realtime proxy in Batch 4.6 (tracked
 * in docs/SECURITY_REMEDIATION_2026_04_21_STATUS.md).
 *
 * Callers are unchanged — the signature and return value are preserved.
 */
export function useRealtimeSubscription(_table, _filter, _queryKeys) {
  return { status: 'DISABLED_BY_AUDIT_2026_04_21' };
}
