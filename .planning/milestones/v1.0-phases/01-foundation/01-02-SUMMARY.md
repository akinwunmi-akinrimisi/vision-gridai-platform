---
phase: 01-foundation
plan: 02
subsystem: data-layer
tags: [supabase, realtime, tanstack-query, webhook-api, react-hooks]
dependency_graph:
  requires: [01-01]
  provides: [supabase-client, realtime-hook, query-client, webhook-api]
  affects: [all-dashboard-pages]
tech_stack:
  added: ["@supabase/supabase-js (singleton client)", "useRealtimeSubscription (custom hook)", "webhookCall (API helper)"]
  patterns: ["Supabase Realtime -> TanStack Query invalidation", "Bearer auth on webhook calls", "Channel cleanup on unmount"]
key_files:
  created:
    - dashboard/src/lib/supabase.js
    - dashboard/src/lib/api.js
    - dashboard/src/hooks/useRealtimeSubscription.js
    - dashboard/src/components/layout/ConnectionStatus.jsx
    - dashboard/src/__tests__/supabase.test.js
    - dashboard/src/__tests__/queryClient.test.js
    - dashboard/src/__tests__/api.test.js
    - dashboard/src/__tests__/useRealtimeSubscription.test.js
  modified:
    - dashboard/src/components/layout/Sidebar.jsx
decisions:
  - "Supabase client fallback key 'missing-key-check-env' instead of empty string (createClient throws on empty key)"
  - "Channel name includes Date.now() suffix to prevent collision on re-subscribe"
  - "queryKeys excluded from useEffect deps -- caller must pass stable references"
metrics:
  duration: "2 min 24 sec"
  completed: "2026-03-08"
  tasks: 2
  tests_added: 20
  tests_total: 35
---

# Phase 1 Plan 2: Data Layer Wiring Summary

Supabase client singleton, Realtime subscription hook with TanStack Query cache invalidation, n8n webhook API helper with Bearer auth, and live ConnectionStatus indicator in the sidebar.

## What Was Built

### Task 1: Supabase client, TanStack Query, webhook API helper (390e354)

**supabase.js** -- Singleton Supabase client initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. Falls back to a placeholder key (not empty string) because `createClient` throws on empty key.

**queryClient.js** -- Already existed from Plan 01 with correct config (staleTime 30s, retry 1, refetchOnWindowFocus true). No changes needed.

**api.js** -- `webhookCall(endpoint, data)` sends POST to `${VITE_N8N_WEBHOOK_BASE}/${endpoint}` with `Authorization: Bearer ${VITE_API_TOKEN}` header. Returns parsed JSON envelope `{ success, data, error }`. On fetch failure, returns `{ success: false, data: null, error: message }`.

**Tests** -- 14 tests across 3 files covering: client exports, query defaults, Bearer auth, URL construction, JSON parsing, error handling.

### Task 2: Realtime subscription hook, ConnectionStatus, Sidebar integration (2ac943c)

**useRealtimeSubscription(table, filter, queryKeys)** -- Creates a Supabase Realtime channel subscribing to `postgres_changes` on any table with optional PostgREST filter. On receiving events, invalidates all provided TanStack Query keys via `queryClient.invalidateQueries()`. Cleans up channel on unmount via `supabase.removeChannel()`. Channel name includes timestamp to prevent collision.

**ConnectionStatus** -- Subscribes to a lightweight heartbeat channel and displays connection state as a colored dot (green=connected, yellow=reconnecting, red=disconnected). Cleans up on unmount.

**Sidebar update** -- Replaced hardcoded green dot with real ConnectionStatus component. Removed unused `Circle` import from lucide-react.

**Tests** -- 6 tests covering: channel creation, filter handling, subscribe call, cleanup on unmount, empty table guard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase createClient throws on empty key**
- **Found during:** Task 1
- **Issue:** `createClient(url, '')` throws `supabaseKey is required`
- **Fix:** Changed fallback from `''` to `'missing-key-check-env'`
- **Files modified:** `dashboard/src/lib/supabase.js`
- **Commit:** 390e354

## Verification Results

- All 35 tests pass (6 test files)
- `npm run build` succeeds (435 KB bundle)
- Supabase client exports `.from()`, `.channel()`, `.removeChannel()` methods
- Webhook API sends Bearer token and handles both success and error responses
- Realtime hook subscribes, invalidates, and cleans up correctly
- ConnectionStatus renders in sidebar footer

## Self-Check: PASSED

All files verified to exist on disk, all commits verified in git log.
