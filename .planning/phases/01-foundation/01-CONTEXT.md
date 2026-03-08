# Phase 1: Foundation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard skeleton with navigation, Supabase client + Realtime hooks, n8n webhook API layer, PIN-based auth gate, design system application, and infrastructure hardening. This is the wiring — every subsequent phase plugs into what's built here.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Shell — Navigation & Layout
- Collapsible left sidebar with icons + labels (Lucide icons from package.json)
- Sidebar collapses to icon-only rail on medium screens, hidden with hamburger menu on mobile
- Project switcher as dropdown in sidebar header (project name + niche)
- Sidebar footer shows global pipeline status indicator (active productions + health)
- Unbuilt pages show a centered "Coming soon — Built in Phase N" card
- Icon + text logo mark ("Vision GridAI") in sidebar header, collapses to icon on small sidebar
- Logout button at bottom of sidebar

### Dashboard Shell — Visual Design
- Light mode AND dark mode with toggle
- Dark theme: Linear-style (deep navy/charcoal backgrounds, subtle borders, muted accents)
- Light theme: Per design system MASTER.md (background #F8FAFC, text #1E293B, primary #2563EB, CTA #F97316)
- Spacious information density — generous padding, clear visual separation
- Inter font loaded via Google Fonts CDN

### Dashboard Shell — Interactions
- Skeleton loaders for page transitions (shimmer placeholders while data loads)
- Toast notification stack (bottom-right, auto-dismiss) for success/error messages
- Subtle fade animation on page transitions
- React Router 7 for routing (unified package, import from `react-router`)

### Auth Gate
- 4-6 digit PIN code (not password) for login
- Full-screen split layout: left side branding/illustration, right side PIN form
- Wrong PIN: input shakes animation, shows "Wrong PIN" message, unlimited retries
- Session persists for 30 days via localStorage/cookie
- PIN stored as hash in Supabase settings table (changeable later)
- Explicit logout button in sidebar

### Webhook API Design
- JSON envelope response format: `{ success: bool, data: {}, error: string }` for all endpoints
- Bearer token auth: shared token in .env, sent as Authorization header from dashboard
- n8n webhook endpoints use "Respond Immediately" mode (research recommendation for timeout avoidance)
- 16 endpoints as spec'd in Agent.md Section 7

### Realtime Patterns
- TanStack Query 5 as data layer, Realtime events trigger `invalidateQueries()` (research recommendation)
- Toast notification + automatic data refresh on important events (topic approved, production complete, errors)
- Reusable `useRealtimeSubscription` hook with proper cleanup on unmount (prevents memory leaks per research)
- Connection status indicator (connected/reconnecting/disconnected) visible somewhere in sidebar

### Claude's Discretion
- Exact skeleton loader designs per page
- Toast library choice (Sonner vs react-hot-toast)
- Tailwind dark mode implementation approach (class-based vs media-query)
- Exact sidebar widths and breakpoints
- Error boundary patterns
- Vite configuration details

</decisions>

<specifics>
## Specific Ideas

- Dark mode should feel like Linear — deep navy/charcoal, not pure black
- Dashboard is a monitoring/control tool — should feel professional and data-rich, not playful
- Design system at `design-system/vision-gridai/MASTER.md` has colors, typography, spacing, shadows, and component specs pre-generated — use these as the foundation
- Per-page design overrides exist at `design-system/vision-gridai/pages/` for projects-home, project-dashboard, topic-review, script-review, production-monitor, analytics, settings

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design-system/vision-gridai/MASTER.md`: Pre-generated design system with colors, typography, spacing, shadows, button/card specs
- `design-system/vision-gridai/pages/*.md`: Per-page design overrides for all 7 pages
- `dashboard/package.json`: Already has React 18, React Router, Supabase JS, Recharts, Lucide, Vite, Tailwind dependencies listed
- `dashboard/nginx.conf`: Nginx config template ready for deployment

### Established Patterns
- None — fully greenfield. This phase establishes all patterns.

### Integration Points
- Supabase at `https://supabase.operscale.cloud` — schema deployed, tables ready
- n8n at `https://n8n.srv1297445.hstgr.cloud` — running, needs webhook workflows
- Nginx — running, needs dashboard build deployed to `/opt/dashboard/`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-08*
