import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-key-check-env';

// Realtime disabled 2026-04-21 (audit migration 030 locked anon RLS;
// a Realtime subscription with the anon key now returns no events and
// just spams "WebSocket not available" in the console). All hooks poll
// via dashboardRead() instead. See useRealtimeSubscription.js.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { apikey: '' } },
  auth: { persistSession: false, autoRefreshToken: false },
});
