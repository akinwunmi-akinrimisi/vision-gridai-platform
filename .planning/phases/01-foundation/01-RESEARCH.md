# Phase 1: Foundation - Research

**Researched:** 2026-03-08
**Domain:** React SPA + Supabase Realtime + n8n Webhooks + Auth + Design System
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield build of the dashboard skeleton, data layer, webhook API, auth gate, and design system application. The dashboard directory exists with `package.json` and empty `src/` subdirectories (pages, components, hooks, lib) but zero source files. A pre-generated design system exists at `design-system/vision-gridai/MASTER.md` with per-page overrides for all 7 pages. Supabase schema is defined in `supabase/migrations/001_initial_schema.sql` with Realtime already enabled on `scenes`, `topics`, and `projects` tables.

The key technical decisions are locked: React 18 + Vite 5 + Tailwind CSS 3 + React Router 7 (unified `react-router` package, not `react-router-dom`) + TanStack Query 5 + Supabase JS v2 + Sonner for toasts + Lucide for icons. The `package.json` needs updating because it references `react-router-dom` (v6) instead of `react-router` (v7), and is missing TanStack Query and Sonner.

**Primary recommendation:** Build the foundation in three waves: (1) Vite scaffold + routing + design system + auth gate, (2) Supabase client + TanStack Query + Realtime hook, (3) n8n webhook workflows + infrastructure hardening.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Collapsible left sidebar with icons + labels (Lucide icons from package.json)
- Sidebar collapses to icon-only rail on medium screens, hidden with hamburger menu on mobile
- Project switcher as dropdown in sidebar header (project name + niche)
- Sidebar footer shows global pipeline status indicator (active productions + health)
- Unbuilt pages show a centered "Coming soon -- Built in Phase N" card
- Icon + text logo mark ("Vision GridAI") in sidebar header, collapses to icon on small sidebar
- Logout button at bottom of sidebar
- Light mode AND dark mode with toggle
- Dark theme: Linear-style (deep navy/charcoal backgrounds, subtle borders, muted accents)
- Light theme: Per design system MASTER.md (background #F8FAFC, text #1E293B, primary #2563EB, CTA #F97316)
- Spacious information density -- generous padding, clear visual separation
- Inter font loaded via Google Fonts CDN
- Skeleton loaders for page transitions (shimmer placeholders while data loads)
- Toast notification stack (bottom-right, auto-dismiss) for success/error messages
- Subtle fade animation on page transitions
- React Router 7 for routing (unified package, import from `react-router`)
- 4-6 digit PIN code (not password) for login
- Full-screen split layout: left side branding/illustration, right side PIN form
- Wrong PIN: input shakes animation, shows "Wrong PIN" message, unlimited retries
- Session persists for 30 days via localStorage/cookie
- PIN stored as hash in Supabase settings table (changeable later)
- Explicit logout button in sidebar
- JSON envelope response format: `{ success: bool, data: {}, error: string }` for all endpoints
- Bearer token auth: shared token in .env, sent as Authorization header from dashboard
- n8n webhook endpoints use "Respond Immediately" mode
- 16 endpoints as spec'd in Dashboard_Implementation_Plan.md
- TanStack Query 5 as data layer, Realtime events trigger `invalidateQueries()`
- Toast notification + automatic data refresh on important events
- Reusable `useRealtimeSubscription` hook with proper cleanup on unmount
- Connection status indicator (connected/reconnecting/disconnected) visible in sidebar

### Claude's Discretion
- Exact skeleton loader designs per page
- Toast library choice (Sonner vs react-hot-toast)
- Tailwind dark mode implementation approach (class-based vs media-query)
- Exact sidebar widths and breakpoints
- Error boundary patterns
- Vite configuration details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FNDN-01 | Dashboard skeleton renders with React Router navigation across all 7 page routes | React Router 7 unified package (`react-router`), sidebar layout component, 7 route definitions with placeholder pages |
| FNDN-02 | Supabase JS client initializes and connects to self-hosted Supabase instance | `@supabase/supabase-js` v2 singleton pattern, env vars for URL + anon key |
| FNDN-03 | Reusable Realtime subscription hook (`useRealtimeSubscription`) with proper cleanup on unmount | Supabase Realtime `channel().on('postgres_changes', ...).subscribe()` pattern with `useEffect` cleanup calling `supabase.removeChannel()` |
| FNDN-04 | TanStack Query data layer with Realtime-triggered cache invalidation | `@tanstack/react-query` v5 `QueryClientProvider` + `queryClient.invalidateQueries()` called from Realtime callbacks |
| FNDN-05 | n8n webhook API layer with endpoints for all dashboard actions | 16 n8n webhook workflows with "Respond Immediately" mode, JSON envelope responses, Bearer token auth |
| FNDN-06 | Simple password gate protecting dashboard access | PIN-based auth with SHA-256 hash comparison against Supabase `settings` table, 30-day localStorage session |
| FNDN-07 | Design system applied -- colors, typography, spacing per MASTER.md | Tailwind config extended with design system colors/spacing, Inter font via Google Fonts, dark mode class strategy |
| FNDN-08 | Infrastructure hardened -- n8n timeouts, PostgreSQL max_connections, Docker memory limits | n8n environment variables for timeouts, PostgreSQL `max_connections` via Docker config, memory limits in docker-compose |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^18.2.0 | UI framework | Already in package.json, stable LTS |
| react-router | ^7.13.1 | Client-side routing | User decision. Unified package replaces react-router-dom. All imports from `react-router` |
| @tanstack/react-query | ^5.90.0 | Server state management + caching | User decision. Caching, background refetch, optimistic updates. `isPending` replaces old `isLoading` in v5 |
| @supabase/supabase-js | ^2.39.0 | Database client + Realtime | Already in package.json. Provides REST queries + WebSocket Realtime subscriptions |
| tailwindcss | ^3.4.0 | Utility-first CSS | Already in package.json. Dark mode via `class` strategy (selector strategy also works in 3.4+) |
| vite | ^5.0.0 | Build tool + dev server | Already in package.json |
| lucide-react | ^0.263.1 | Icon library | Already in package.json. Consistent SVG icon set per design system rules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.7 | Toast notifications | All success/error/info notifications. Minimal API: add `<Toaster />` once, call `toast()` anywhere. Recommended over react-hot-toast for simpler API and better defaults |
| @tanstack/react-query-devtools | ^5.90.0 | Query debugging | Dev only. Shows cache state, active queries, stale data. Add `<ReactQueryDevtools />` in dev mode |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sonner | react-hot-toast | react-hot-toast is lighter but Sonner has better default animations, stacking, promise toasts, and is used by shadcn/ui ecosystem |
| TanStack Query | SWR | SWR is simpler but lacks mutation support, devtools, and the `invalidateQueries` pattern needed for Realtime integration |

### Package.json Updates Required

The existing `package.json` needs these changes:
- **Remove:** `react-router-dom` (v6 package, superseded by unified `react-router` v7)
- **Add:** `react-router` (v7 unified package)
- **Add:** `@tanstack/react-query` + `@tanstack/react-query-devtools`
- **Add:** `sonner`

**Installation:**
```bash
cd dashboard
npm uninstall react-router-dom
npm install react-router@latest @tanstack/react-query@latest sonner@latest
npm install -D @tanstack/react-query-devtools@latest
```

## Architecture Patterns

### Recommended Project Structure
```
dashboard/src/
├── main.jsx              # React entry point, providers
├── App.jsx               # Router + layout wrapper
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx           # Collapsible sidebar with nav
│   │   ├── AppLayout.jsx         # Sidebar + main content area
│   │   ├── ConnectionStatus.jsx  # Supabase Realtime connection indicator
│   │   └── ThemeToggle.jsx       # Dark/light mode toggle
│   ├── ui/
│   │   ├── SkeletonLoader.jsx    # Shimmer placeholder component
│   │   ├── ComingSoon.jsx        # "Built in Phase N" placeholder card
│   │   └── ErrorBoundary.jsx     # React error boundary wrapper
│   └── auth/
│       └── PinGate.jsx           # Full-screen PIN entry
├── hooks/
│   ├── useRealtimeSubscription.js  # Reusable Supabase Realtime hook
│   ├── useAuth.js                  # PIN auth state management
│   └── useTheme.js                 # Dark/light mode hook
├── lib/
│   ├── supabase.js         # Supabase client singleton
│   ├── queryClient.js      # TanStack Query client config
│   └── api.js              # n8n webhook API helper (fetch wrapper with Bearer token + JSON envelope)
├── pages/
│   ├── ProjectsHome.jsx
│   ├── ProjectDashboard.jsx
│   ├── TopicReview.jsx
│   ├── ScriptReview.jsx
│   ├── ProductionMonitor.jsx
│   ├── Analytics.jsx
│   └── Settings.jsx
└── styles/
    └── index.css           # Tailwind directives + Inter font import + dark mode CSS variables
```

### Pattern 1: Supabase Client Singleton
**What:** Single Supabase client instance shared across the app
**When to use:** Always -- prevents multiple WebSocket connections and auth state issues
**Example:**
```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Pattern 2: Realtime + TanStack Query Integration
**What:** Supabase Realtime events trigger TanStack Query cache invalidation
**When to use:** All tables that the dashboard displays (projects, topics, scenes)
**Example:**
```javascript
// src/hooks/useRealtimeSubscription.js
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useRealtimeSubscription(table, filter, queryKeys) {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    const channelConfig = {
      event: '*',
      schema: 'public',
      table,
      ...(filter ? { filter } : {}),
    };

    const channel = supabase
      .channel(`${table}-${filter || 'all'}`)
      .on('postgres_changes', channelConfig, (payload) => {
        // Invalidate relevant queries so TanStack Query refetches
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter, queryClient]); // queryKeys intentionally excluded (stable reference expected)
}
```

### Pattern 3: n8n Webhook API Helper
**What:** Centralized fetch wrapper for n8n webhook calls with Bearer token and JSON envelope
**When to use:** All dashboard-to-n8n communication
**Example:**
```javascript
// src/lib/api.js
const WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE || '/webhook';
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

export async function webhookCall(endpoint, data = {}) {
  try {
    const res = await fetch(`${WEBHOOK_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json; // { success: bool, data: {}, error: string }
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}
```

### Pattern 4: PIN Auth Gate
**What:** Lightweight PIN-based auth using SHA-256 hash comparison
**When to use:** Wraps the entire app -- unauthenticated users see only the PIN screen
**Example:**
```javascript
// src/hooks/useAuth.js
import { useState, useEffect } from 'react';

const SESSION_KEY = 'gridai_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const { expiry } = JSON.parse(session);
      if (Date.now() < expiry) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  async function login(pin) {
    // Hash PIN with SHA-256 using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare against stored hash in Supabase settings table
    // For Phase 1, can also hardcode hash in env var for simplicity
    const storedHash = import.meta.env.VITE_PIN_HASH;

    if (hashHex === storedHash) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ expiry: Date.now() + SESSION_DURATION }));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }

  return { isAuthenticated, login, logout };
}
```

### Pattern 5: Dark Mode with Tailwind Class Strategy
**What:** Toggle dark mode using a CSS class on `<html>` element, persisted in localStorage
**When to use:** Global theme toggle in sidebar
**Example:**
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
};

// src/hooks/useTheme.js
import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('gridai_theme');
    return saved ? saved === 'dark' : false; // default light
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('gridai_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(prev => !prev) };
}
```

### Anti-Patterns to Avoid
- **Multiple Supabase clients:** Creating `createClient()` inside components causes multiple WebSocket connections and auth state desync. Use singleton pattern.
- **Polling instead of Realtime:** Do not use `setInterval` to refetch data. Use Supabase Realtime subscriptions to trigger `invalidateQueries()`.
- **Missing channel cleanup:** Not calling `supabase.removeChannel()` in `useEffect` cleanup causes memory leaks and zombie subscriptions.
- **Hardcoding API keys in source:** All keys go in `.env` files with `VITE_` prefix for Vite exposure. Never commit `.env`.
- **Using `isLoading` (TanStack Query v5):** The property is now `isPending` for initial load state. `isLoading` = `isPending && isFetching`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | Sonner | Handles stacking, auto-dismiss, animations, promise toasts, accessible by default |
| Server state caching | useState + useEffect + manual fetch | TanStack Query | Handles caching, dedup, background refetch, optimistic updates, devtools |
| Realtime subscriptions | Raw WebSocket management | Supabase JS `channel().on().subscribe()` | Handles reconnection, auth, filtering, cleanup |
| Dark mode toggle | CSS custom properties + manual DOM manipulation | Tailwind `dark:` variant + class on `<html>` | Composable with all utility classes, no custom CSS needed |
| Icon set | Individual SVG imports or emoji | Lucide React | Tree-shakeable, consistent 24x24 viewBox, accessible |
| PIN hashing | Custom hash function | Web Crypto API `crypto.subtle.digest('SHA-256', ...)` | Browser-native, no dependencies, secure |

**Key insight:** This phase is all wiring -- every piece has a well-established library solution. Custom code should only exist in layout components, the auth flow, and the Realtime-to-Query bridge hook.

## Common Pitfalls

### Pitfall 1: react-router-dom vs react-router Import Confusion
**What goes wrong:** Importing from `react-router-dom` when using React Router v7 causes "module not found" errors
**Why it happens:** The existing `package.json` lists `react-router-dom` v6. React Router v7 consolidated everything into a single `react-router` package.
**How to avoid:** Uninstall `react-router-dom`, install `react-router`. All imports use `import { ... } from 'react-router'`.
**Warning signs:** Build errors mentioning `react-router-dom` not found.

### Pitfall 2: Supabase Realtime Not Firing on UPDATE
**What goes wrong:** Subscribing to `postgres_changes` for UPDATE events shows nothing
**Why it happens:** Supabase Realtime requires `REPLICA IDENTITY FULL` on the table for UPDATE events. Without it, only INSERT/DELETE work.
**How to avoid:** The migration SQL already sets `ALTER TABLE scenes/topics/projects REPLICA IDENTITY FULL`. Verify this is applied. Also ensure the table is added to `supabase_realtime` publication.
**Warning signs:** INSERT events work but UPDATE events are silent.

### Pitfall 3: Supabase Channel Name Collisions
**What goes wrong:** Multiple components subscribe to the same table but only one receives events
**Why it happens:** Each Supabase Realtime channel must have a unique name. If two components use the same channel name, they share a channel.
**How to avoid:** Include the filter in the channel name: `supabase.channel(\`topics-project-\${projectId}\`)`.
**Warning signs:** Some components update, others don't, despite subscribing to the same table.

### Pitfall 4: n8n Webhook Timeout
**What goes wrong:** Dashboard receives 504/524 errors when calling n8n webhooks
**Why it happens:** n8n webhooks default to "When Last Node Finishes" response mode. Long-running workflows (script generation, research) exceed the timeout.
**How to avoid:** Use "Respond Immediately" mode on all webhook trigger nodes. The webhook returns `{ "message": "Workflow got started" }` instantly. Dashboard polls Supabase for results.
**Warning signs:** First webhook calls work (fast workflows), but production triggers time out.

### Pitfall 5: Vite Environment Variable Prefix
**What goes wrong:** `process.env.SUPABASE_URL` is undefined in browser
**Why it happens:** Vite requires environment variables to be prefixed with `VITE_` to be exposed to client-side code. It does NOT use `process.env` -- use `import.meta.env.VITE_*`.
**How to avoid:** All client-facing env vars must start with `VITE_`. Access via `import.meta.env.VITE_SUPABASE_URL`.
**Warning signs:** Undefined values when accessing env vars in browser console.

### Pitfall 6: TanStack Query v5 Breaking Changes
**What goes wrong:** Destructuring `{ isLoading }` from `useQuery` behaves unexpectedly
**Why it happens:** In v5, `isLoading` was renamed to `isPending`. The old `isLoading` still exists but means `isPending && isFetching` (true only on initial fetch, not background refetch).
**How to avoid:** Use `isPending` for skeleton/loading states. Use `isFetching` for background refresh indicators.
**Warning signs:** Loading spinners appearing during background refetches when they shouldn't.

### Pitfall 7: Dark Mode Color Conflicts
**What goes wrong:** Design system light mode colors (#F8FAFC background) appear in dark mode
**Why it happens:** Forgetting to add `dark:` variants for every color utility class
**How to avoid:** Every `bg-`, `text-`, `border-` class that uses design system colors needs a corresponding `dark:bg-`, `dark:text-`, `dark:border-` variant. Define dark mode tokens in Tailwind config.
**Warning signs:** Light backgrounds showing in dark mode, low contrast text.

## Code Examples

### Vite Config
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/webhook': {
        target: 'https://n8n.srv1297445.hstgr.cloud',
        changeOrigin: true,
      },
    },
  },
});
```

### Tailwind Config with Design System Tokens
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        cta: '#F97316',
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#0F172A',     // Linear-style deep navy
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#1E293B',     // Charcoal card background
        },
        border: {
          DEFAULT: '#E2E8F0',
          dark: '#334155',     // Subtle dark mode border
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '64px',
      },
    },
  },
  plugins: [],
};
```

### TanStack Query Provider Setup
```javascript
// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,       // 30 seconds before refetch
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
```

### App Entry Point with All Providers
```javascript
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

### n8n Webhook Workflow Structure (JSON skeleton)
```json
{
  "name": "WF_WEBHOOK_STATUS",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "status",
        "responseMode": "immediately",
        "options": {
          "allowedOrigins": "*"
        }
      }
    },
    {
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [{ "value1": "={{ $json.headers.authorization }}", "value2": "Bearer {{$env.DASHBOARD_API_TOKEN}}" }]
        }
      }
    },
    {
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ success: true, data: $json, error: null }) }}"
      }
    }
  ]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-router-dom` package | `react-router` unified package | React Router v7 (Nov 2024) | All imports from `react-router`, not `react-router-dom`. Package.json needs updating. |
| `isLoading` in React Query | `isPending` in TanStack Query v5 | TanStack Query v5 (Oct 2023) | Loading state check changes. `isLoading` still exists but means `isPending && isFetching`. |
| Tailwind `darkMode: 'class'` | `darkMode: 'class'` or `'selector'` | Tailwind 3.4.1 (Jan 2024) | `'class'` still works fine. `'selector'` is newer but `'class'` is simpler for this use case. |
| Supabase auth-helpers | `@supabase/ssr` | 2024 | Not relevant for this project (client-side only SPA), but note the change exists |

**Deprecated/outdated:**
- `react-router-dom` package: replaced by unified `react-router` in v7
- `isLoading` in TanStack Query v5: use `isPending` for initial load state

## Open Questions

1. **PIN Hash Storage Location**
   - What we know: User wants PIN hash stored in Supabase `settings` table
   - What's unclear: Does a `settings` table exist in the schema? The migration SQL doesn't include one.
   - Recommendation: Create a simple `settings` table with `key`/`value` columns, or for Phase 1 simplicity, store the PIN hash as a `VITE_PIN_HASH` env var and migrate to Supabase settings table later.

2. **Webhook Endpoint List**
   - What we know: CONTEXT.md says "16 endpoints as spec'd in Agent.md Section 7." Agent.md doesn't exist on disk. Dashboard_Implementation_Plan.md lists 12 endpoints.
   - What's unclear: The exact 16 endpoints aren't enumerated in any existing file.
   - Recommendation: Build the endpoints listed in Dashboard_Implementation_Plan.md (project/create, topics/generate, topics/approve, topics/reject, production/trigger, script/approve, script/reject, video/approve, video/reject, status, assets/{topic_id}, analytics) and add stubs for any missing ones. Phase 1 only needs the endpoints to exist and return valid JSON envelopes -- they don't need to do real work until later phases.

3. **Dark Mode Color Tokens**
   - What we know: Light theme colors are fully defined in MASTER.md. Dark theme should be "Linear-style" (deep navy/charcoal).
   - What's unclear: Exact dark mode color values aren't specified anywhere.
   - Recommendation: Use Linear-inspired dark palette: background `#0F172A` (slate-900), card `#1E293B` (slate-800), text `#F1F5F9` (slate-100), border `#334155` (slate-700), muted text `#94A3B8` (slate-400).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (compatible with Vite, already in dev ecosystem) |
| Config file | none -- Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDN-01 | All 7 routes render without crash | smoke | `npx vitest run src/__tests__/routes.test.jsx -x` | Wave 0 |
| FNDN-02 | Supabase client initializes with correct URL | unit | `npx vitest run src/__tests__/supabase.test.js -x` | Wave 0 |
| FNDN-03 | Realtime hook subscribes and cleans up | unit | `npx vitest run src/__tests__/useRealtimeSubscription.test.js -x` | Wave 0 |
| FNDN-04 | TanStack Query provider wraps app, queries work | unit | `npx vitest run src/__tests__/queryClient.test.js -x` | Wave 0 |
| FNDN-05 | Webhook API helper sends correct headers and parses envelope | unit | `npx vitest run src/__tests__/api.test.js -x` | Wave 0 |
| FNDN-06 | PIN auth validates correct PIN, rejects wrong PIN, persists session | unit | `npx vitest run src/__tests__/useAuth.test.js -x` | Wave 0 |
| FNDN-07 | Design system colors match MASTER.md values | manual-only | Visual inspection | N/A |
| FNDN-08 | Infrastructure config applied | manual-only | SSH into server, check Docker/PostgreSQL config | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/vitest.config.js` -- Vitest configuration
- [ ] `dashboard/src/__tests__/` -- Test directory
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom` -- testing dependencies
- [ ] `dashboard/src/__tests__/setup.js` -- Test setup file (jsdom environment, Testing Library matchers)

## Sources

### Primary (HIGH confidence)
- [react-router npm](https://www.npmjs.com/package/react-router) - v7.13.1 confirmed, unified package
- [@tanstack/react-query npm](https://www.npmjs.com/package/@tanstack/react-query) - v5.90.21 confirmed
- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) - Subscription patterns, REPLICA IDENTITY requirement
- [Tailwind CSS v3 Dark Mode docs](https://v3.tailwindcss.com/docs/dark-mode) - `class` strategy configuration
- [Sonner npm](https://www.npmjs.com/package/sonner) - v2.0.7 confirmed
- [n8n Webhook docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) - Response modes, timeout behavior

### Secondary (MEDIUM confidence)
- [React Router v6 to v7 Migration](https://reactrouter.com/upgrading/v6) - Import changes verified
- [Supabase + TanStack Query integration guide (MakerKit)](https://makerkit.dev/blog/saas/supabase-react-query) - invalidateQueries pattern
- [n8n Webhook timeout community discussion](https://community.n8n.io/t/webhook-question-is-it-supposed-to-timeout/181066) - 100s timeout, 524 status code

### Tertiary (LOW confidence)
- Dark mode Linear-style color values are my interpretation of the "deep navy/charcoal" aesthetic -- should be validated visually during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all versions verified via npm, APIs verified via official docs
- Architecture: HIGH - patterns are well-established (singleton Supabase client, TanStack Query providers, Realtime hooks)
- Pitfalls: HIGH - documented in official docs (REPLICA IDENTITY, Vite env prefix, TanStack v5 breaking changes)
- Dark mode colors: MEDIUM - extrapolated from "Linear-style" description, not from a spec

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable ecosystem, 30-day validity)
