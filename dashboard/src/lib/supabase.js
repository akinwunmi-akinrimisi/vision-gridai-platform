import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-key-check-env';

// Auth session persistence disabled 2026-04-21 — dashboard does not use
// Supabase Auth; autoRefreshToken caused noisy refresh loops in the
// console post-migration 030. Realtime is intentionally left enabled so
// the client doesn't throw at init on pages that still import it for
// code-split reasons; any actual supabase.channel() call fails closed
// (RLS blocks anon) and hooks that previously relied on it now poll
// via dashboardRead(). See useRealtimeSubscription.js for the no-op stub.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
