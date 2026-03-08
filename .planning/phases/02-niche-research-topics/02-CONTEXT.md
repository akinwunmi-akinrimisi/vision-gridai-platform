# Phase 2: Niche Research + Topics - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

User can create a project by entering a niche, system researches the niche automatically via n8n + Claude + web search, generates 25 topics with avatars, and user approves/rejects/refines them from the dashboard. Includes new research page route, functional Projects Home with real data, and complete Topic Review page with Gate 1 approval flow.

</domain>

<decisions>
## Implementation Decisions

### Project Creation Flow
- Modal overlay on Projects Home — triggered by "New Project" button
- Modal fields: niche name (text input with cycling example hints like "e.g., US Credit Cards"), optional description textarea, target video count (default 25)
- Submit: modal shows brief success animation (checkmark + "Project created!") for 1-2 seconds, then closes
- New project card appears immediately on Projects Home with live research progress
- Research progress shown as 4-5 named steps with checkmarks on the card: Creating project → Auditing competitors → Mining pain points → Blue-ocean analysis → Generating prompts
- Research triggered via n8n workflow webhook (not direct Anthropic API from dashboard) — deploy via Synta MCP
- After research completes, card links to new /project/:id/research page to review niche profile
- Projects Home remains the root route (/)
- Project cards use smart routing by status: researching → research page, topics pending → topic review, in production → project dashboard
- Project delete/archive is NOT in Phase 2 — deferred to Phase 6

### Sidebar Navigation
- Project-scoped subnav when inside a project: Dashboard, Research, Topics, Scripts, Production, Analytics, Settings
- "Back to Projects" link at top of sidebar when viewing a project
- Sidebar items wired to real project IDs from URL params

### Research Page (/project/:id/research)
- New dedicated route — separate from ProjectDashboard
- Two-column grid layout
- Left column: blue-ocean hero + playlist angles + "Generate Topics" CTA
- Right column: competitor cards + pain points + keywords + red ocean
- Blue-ocean strategy is the hero section at top of left column — most prominent element (channel positioning statement + value curve gaps)
- Competitor audit displayed as channel cards with key metrics (name, subscriber count, avg views, coverage tags, gap tags)
- Audience pain points grouped by source (Reddit, Quora, forums) with quoted questions/complaints
- Keyword research shown as colored tag cloud (high-volume=blue, low-competition=green, trending=amber)
- Red ocean topics shown as a warning list with red/amber styling: "Topics to Avoid (Oversaturated)"
- Summary dashboard view — top-level summary cards (key stats) with "View Full Research" expand for details
- 3 playlist angles shown as editable cards with "Regenerate Playlists" option
- "Generate Topics" button positioned below playlist section — natural flow: review research → check playlists → generate
- "Re-research Niche" button available with confirmation dialog (warns about overwrite)
- Generated prompts NOT shown on research page — editable in Settings page only

### Topic Generation UX
- Clicking "Generate Topics" redirects to /project/:id/topics immediately
- Topic Review page shows 25 skeleton card placeholders that fill in as topics arrive via Supabase Realtime
- Exciting reveal experience — cards animate in as they're generated

### Topic Card Design
- Collapsed cards by default, click to expand
- Collapsed state shows: topic number, title, playlist badge, review status badge, CPM estimate, viral potential, avatar name preview
- Background tint by status: default=none, approved=green/5%, rejected=red/5%, refined=amber/5%
- Topics grouped by playlist angle — three sections with playlist name headers
- Expanded card shows: full narrative hook, key segments, all metadata, full 10-point avatar data (name/age, occupation/income, life stage, pain point, spending profile, knowledge level, emotional driver, online hangouts, objection, dream outcome)
- Action buttons always visible regardless of status — user can change decisions freely

### Side Panel (Refine + Edit)
- Right-side panel opens for both Refine and Edit actions
- Refine mode: topic summary at top + textarea for custom instructions + Submit button
- Edit mode: same panel with editable form fields for all topic fields
- Collapsible refinement history section at bottom showing prior versions with timestamps and instructions
- During refine processing: card gets shimmer animation + amber "Refining..." badge; side panel shows spinner

### Approval Workflow
- Multi-select checkboxes on each topic card
- When 1+ topics selected: sticky bottom bar slides up with "X selected • [Approve] [Reject]"
- Centered modal dialog confirmation for ALL actions (single + bulk) — shows topic title preview
- "Approve All" button in header with confirmation dialog: "Approve all 25 pending topics?"
- Filter dropdowns: status (All/Pending/Approved/Rejected) + playlist (All/Playlist 1/2/3)
- Sticky summary bar at top of Topic Review: "25 Topics • 0 Approved • 0 Rejected • 25 Pending" with colored counts
- When all pending topics resolved: banner CTA appears: "All topics reviewed! [Start Production for X approved topics]"
- Reject has optional feedback textarea (not required)
- Both individual refine AND bulk "Regenerate Rejected" available

### Claude's Discretion
- Exact modal animation/transition for project creation
- Skeleton card animation timing for topic generation reveal
- Side panel width and animation
- Confirmation dialog exact styling (follows design system glass-card pattern)
- Research page card grid breakpoints
- Exact filter dropdown component implementation
- Error states and empty states for research/topics

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProjectsHome.jsx`: Has mock project card structure, "New Project" button shell, stats row, dashed "Add New Project" placeholder — all need to be wired to real data
- `TopicReview.jsx`: Has mock topic card with action buttons (approve/reject/refine/edit), avatar preview, filter button, "Approve All" button — all need to become functional
- `ProjectDashboard.jsx`: Existing command center page — stays as-is for pipeline view, research gets its own route
- `webhookCall()` in `lib/api.js`: Ready-to-use API helper with Bearer token auth
- `useRealtimeSubscription.js`: Realtime hook with TanStack Query invalidation — use for live topic updates and research progress
- `supabase.js`: Client singleton — ready for direct reads
- `queryClient.js`: TanStack Query client — ready for data fetching hooks
- `ComingSoon.jsx`: Phase placeholder component — will be removed from pages that become functional
- CSS system: `glass-card`, `card-elevated`, `badge-*`, `animate-in`, `animate-shimmer`, `page-header`, `page-title`, `metric-value` — all available

### Established Patterns
- Glassmorphism UI with `glass-card` (backdrop-blur-xl, semi-transparent backgrounds)
- Dark + light mode with Linear-style dark theme
- Badge system: `badge-blue`, `badge-green`, `badge-amber`, `badge-red`, `badge-purple`
- Sidebar with 3px blue accent bar for active nav item
- TanStack Query + Supabase Realtime for live updates
- React Router 7 unified imports from 'react-router'
- Inter font via Google Fonts CDN

### Integration Points
- n8n webhooks: `/webhook/project/create`, `/webhook/topics/generate`, `/webhook/topics/approve`, `/webhook/topics/reject`, `/webhook/topics/refine` — need corresponding n8n workflows deployed via Synta MCP
- Supabase tables: `projects`, `niche_profiles`, `prompt_configs`, `topics`, `avatars` — schema already deployed
- Supabase Realtime on `projects` table (research progress) and `topics` table (topic generation/status changes)
- React Router: new route `/project/:id/research` needed
- Sidebar: needs project-scoped subnav logic based on URL params

</code_context>

<specifics>
## Specific Ideas

- Research progress steps should feel alive — checkmarks animate in as each step completes (not just appear)
- Topic cards revealing via skeleton → real content should feel like "unwrapping" — exciting, not jarring
- The blue-ocean hero section should feel like the key insight — visually distinct, maybe gradient border or accent background
- Side panel should slide in from the right smoothly, similar to Linear's detail panels
- Confirmation modals should be clean glass-card style, not browser-native dialogs
- "Regenerate Rejected" button should only appear when rejected topics exist
- Smart routing on project cards: the card itself links to the most relevant action page based on project status

</specifics>

<deferred>
## Deferred Ideas

- Project delete/archive — Phase 6 polish
- Keyboard shortcuts for topic review (arrow nav, action keys) — Phase 6 polish
- Prompt editing UI on Settings page — Phase 6 (OPS-04)
- Auto-approve toggle after manually approving 5+ items — v2 (AUTO-01)

</deferred>

---

*Phase: 02-niche-research-topics*
*Context gathered: 2026-03-08*
