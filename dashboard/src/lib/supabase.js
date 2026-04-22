// ──────────────────────────────────────────────────────────────────────
// `supabase` proxy — replaces the @supabase/supabase-js client (2026-04-22)
//
// After migration 030 (2026-04-21 RLS lockdown) anon can no longer SELECT
// or write any VG table. The dashboard used to open a Supabase Realtime
// WebSocket on init; after lockdown that subscribe failed forever and
// spammed "WebSocket not available" in the console.
//
// This module ships a hand-rolled shim with the same fluent interface
// the 35+ hooks/pages/components already use:
//
//   supabase.from('channel_analyses')
//     .select('*', { count: 'exact', head: true })
//     .eq('analysis_group_id', gid)
//     .order('analyzed_at', { ascending: false })
//     .limit(50)
//
// Under the hood, the chain builds a state object and POSTs it to
// `/webhook/dashboard/read` with query='sb_query'. The server-side
// handler (WF_DASHBOARD_READ) validates against a table allowlist and
// runs the PostgREST request with service_role.
//
// `supabase.channel()` / `removeChannel()` are no-ops — no WebSocket
// opens, no console noise. Hooks that previously used Realtime for
// invalidation now poll via react-query.
// ──────────────────────────────────────────────────────────────────────

import { dashboardRead } from './api';

function wrap(queryResult) {
  return queryResult.then(
    (data) => ({ data, error: null, count: null }),
    (err) => ({ data: null, error: { message: err?.message || String(err), details: null, hint: null, code: null }, count: null }),
  );
}

function buildFrom(table) {
  const state = {
    table,
    action: 'select',
    select: '*',
    filters: [],
    orders: [],
    limit: null,
    offset: null,
    single: false,
    maybeSingle: false,
    countOnly: false,
    head: false,
    insertPayload: null,
    updatePayload: null,
    preferReturn: null,
  };

  function exec() {
    return dashboardRead('sb_query', state).then((data) => {
      // Server returns either an array (most selects), a single row (single/maybeSingle),
      // { rows, count } (countOnly), or null (delete/minimal insert/update).
      if (data && typeof data === 'object' && 'rows' in data && 'count' in data) {
        return { data: data.rows, error: null, count: data.count };
      }
      return { data, error: null, count: null };
    }, (err) => ({
      data: null,
      error: { message: err?.message || String(err), details: null, hint: null, code: null },
      count: null,
    }));
  }

  const chain = {
    // selectors
    select(cols = '*', opts = {}) {
      state.select = typeof cols === 'string' ? cols : '*';
      if (opts && opts.count === 'exact') state.countOnly = true;
      if (opts && opts.head) state.head = true;
      return chain;
    },
    // mutations
    insert(payload, opts = {}) {
      state.action = 'insert';
      state.insertPayload = payload;
      if (opts.returning === 'minimal') state.preferReturn = 'minimal';
      return chain;
    },
    update(payload, opts = {}) {
      state.action = 'update';
      state.updatePayload = payload;
      if (opts.returning === 'minimal') state.preferReturn = 'minimal';
      return chain;
    },
    upsert(payload) {
      // treat as insert with Prefer: resolution=merge-duplicates (simplified)
      state.action = 'insert';
      state.insertPayload = payload;
      state.preferReturn = null;
      return chain;
    },
    delete() {
      state.action = 'delete';
      return chain;
    },
    // filters
    eq(col, val)    { state.filters.push([col, 'eq', val]);   return chain; },
    neq(col, val)   { state.filters.push([col, 'neq', val]);  return chain; },
    gt(col, val)    { state.filters.push([col, 'gt', val]);   return chain; },
    gte(col, val)   { state.filters.push([col, 'gte', val]);  return chain; },
    lt(col, val)    { state.filters.push([col, 'lt', val]);   return chain; },
    lte(col, val)   { state.filters.push([col, 'lte', val]);  return chain; },
    like(col, val)  { state.filters.push([col, 'like', val]); return chain; },
    ilike(col, val) { state.filters.push([col, 'ilike', val]);return chain; },
    is(col, val)    { state.filters.push([col, 'is', val]);   return chain; },
    in(col, vals)   { state.filters.push([col, 'in', vals]);  return chain; },
    not(col, op, val) { state.filters.push([col, `not.${op}`, val]); return chain; },
    // ordering + paging
    order(col, opts = {}) {
      state.orders.push({ col, ascending: opts.ascending !== false, nullsFirst: !!opts.nullsFirst, nullsLast: !!opts.nullsLast });
      return chain;
    },
    limit(n) { state.limit = n; return chain; },
    range(from, to) {
      state.offset = from;
      state.limit = (to - from) + 1;
      return chain;
    },
    // terminators
    single()      { state.single = true;      return exec(); },
    maybeSingle() { state.maybeSingle = true; return exec(); },
    // thenable so `await supabase.from(...).select(...).eq(...)` works
    then(resolveFn, rejectFn) { return exec().then(resolveFn, rejectFn); },
    catch(rejectFn) { return exec().catch(rejectFn); },
    finally(fn)     { return exec().finally(fn); },
  };

  return chain;
}

// Channel/realtime stubs — no WebSocket, no connection attempts.
function stubChannel() {
  const ch = {
    on() { return ch; },
    subscribe(cb) { if (typeof cb === 'function') cb('DISABLED'); return ch; },
    unsubscribe() { return Promise.resolve('ok'); },
  };
  return ch;
}

export const supabase = {
  from: (table) => buildFrom(table),
  channel: () => stubChannel(),
  removeChannel: () => {},
  removeAllChannels: () => [],
  getChannels: () => [],
  // auth stub — dashboard does not use Supabase Auth
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  // storage stub — nothing writes directly from the browser
  storage: {
    from: () => ({
      upload: () => Promise.reject(new Error('Supabase Storage from the browser is disabled by the 2026-04-21 security audit.')),
      list: () => Promise.reject(new Error('Supabase Storage from the browser is disabled by the 2026-04-21 security audit.')),
    }),
  },
  // rpc stub — RPC calls should be migrated to dashboardRead query types
  rpc: () => Promise.reject(new Error('Direct supabase.rpc() is disabled. Add an sb_rpc handler to WF_DASHBOARD_READ if needed.')),
};
