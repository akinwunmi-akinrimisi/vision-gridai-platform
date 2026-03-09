# Phase 2: Niche Research + Topics - Research

**Researched:** 2026-03-08
**Domain:** React dashboard (data fetching, modals, side panels, realtime), n8n webhook workflows, Anthropic Claude API with web search tool
**Confidence:** HIGH

## Summary

Phase 2 transforms the static Phase 1 dashboard scaffold into a functional application. It spans three domains: (1) dashboard UI -- making ProjectsHome, a new Research page, and TopicReview fully interactive with real Supabase data, modals, side panels, and realtime subscriptions; (2) n8n webhook workflows -- project creation, niche research via Claude + web search, dynamic prompt generation, topic generation, and topic action endpoints (approve/reject/refine); (3) data flow -- wiring TanStack Query hooks to Supabase reads and n8n webhook calls for mutations.

The existing codebase provides strong foundations: `webhookCall()` in `lib/api.js`, `useRealtimeSubscription` hook, Supabase client singleton, TanStack Query client with 30s stale time, React Router 7 routes, and a comprehensive CSS component system (glass-card, card-elevated, badges, animations including shimmer). The primary technical risks are the Claude web search API integration inside n8n (requires HTTP Request node with specific tool JSON format), the topic refinement flow (must pass all 24 other topics as context, which is token-expensive), and ensuring Supabase Realtime properly triggers TanStack Query cache invalidation for live progress updates.

**Primary recommendation:** Build backend n8n workflows first (project creation, niche research, topic generation, topic actions), then wire up dashboard pages with TanStack Query hooks that read from Supabase and mutate via webhook calls.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Modal overlay on Projects Home for project creation -- niche name (with cycling example hints), optional description, target video count (default 25)
- Submit: brief success animation (checkmark + "Project created!") for 1-2 seconds, then closes
- New project card appears immediately with live research progress (4-5 named steps with checkmarks)
- Research triggered via n8n workflow webhook (not direct Anthropic API from dashboard)
- Research page at /project/:id/research -- two-column grid, blue-ocean hero + playlists left, competitors + pain points + keywords + red ocean right
- Competitor audit as channel cards, pain points grouped by source, keywords as colored tag cloud, red ocean as warning list
- Summary dashboard view with "View Full Research" expand for details
- 3 playlist angles as editable cards with "Regenerate Playlists" option
- "Generate Topics" button below playlist section, "Re-research Niche" button with confirmation
- Generated prompts NOT shown on research page (Settings only)
- Topic generation: clicking "Generate Topics" redirects to /project/:id/topics immediately
- 25 skeleton card placeholders that fill in via Supabase Realtime
- Collapsed cards by default, grouped by playlist angle
- Collapsed: topic number, title, playlist badge, review status badge, CPM, viral potential, avatar name preview
- Background tint by status (green/red/amber at 5%)
- Side panel for Refine + Edit (right-side, slide-in)
- Multi-select checkboxes with sticky bottom bar for bulk actions
- Centered modal confirmation for ALL actions
- Filter dropdowns: status + playlist
- Sticky summary bar: "25 Topics -- 0 Approved -- 0 Rejected -- 25 Pending"
- Banner CTA when all resolved: "All topics reviewed! [Start Production for X approved topics]"
- Reject has optional feedback textarea
- Both individual refine AND bulk "Regenerate Rejected" available
- Project cards use smart routing by status
- Sidebar project-scoped subnav with "Back to Projects" link
- Deploy n8n workflows via Synta MCP

### Claude's Discretion
- Exact modal animation/transition for project creation
- Skeleton card animation timing for topic generation reveal
- Side panel width and animation
- Confirmation dialog exact styling (follows design system glass-card pattern)
- Research page card grid breakpoints
- Exact filter dropdown component implementation
- Error states and empty states for research/topics

### Deferred Ideas (OUT OF SCOPE)
- Project delete/archive -- Phase 6 polish
- Keyboard shortcuts for topic review -- Phase 6 polish
- Prompt editing UI on Settings page -- Phase 6 (OPS-04)
- Auto-approve toggle -- v2 (AUTO-01)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NICH-01 | Create project from dashboard (niche name + description) | Modal UI pattern + webhookCall to /webhook/project/create + optimistic TanStack Query update |
| NICH-02 | Research niche via Claude + web search (competitors, pain points, keywords, blue-ocean) | n8n HTTP Request node calling Anthropic Messages API with web_search_20250305 tool |
| NICH-03 | Store research in niche_profiles with JSONB | Supabase REST API PATCH/POST from n8n workflow |
| NICH-04 | Generate dynamic prompts per niche | Second Claude call in n8n workflow after research completes |
| NICH-05 | Store prompts in prompt_configs with versioning | Supabase INSERT with version tracking from n8n |
| NICH-06 | 3 playlist angles generated per niche | Part of niche research Claude response, stored in projects table |
| NICH-07 | Projects Home displays real project cards | TanStack Query useQuery fetching from Supabase projects table + Realtime subscription |
| TOPC-01 | Trigger topic generation from dashboard | webhookCall to /webhook/topics/generate + redirect to topics page |
| TOPC-02 | Blue-ocean methodology with quality benchmarks | Encoded in topic_generator prompt stored in prompt_configs |
| TOPC-03 | Each topic: SEO title, hook, segments, CPM, viral potential | Topics table columns already in schema |
| TOPC-04 | Each avatar: 10 data points | Avatars table columns already in schema |
| TOPC-05 | Topic Review page with expandable cards + avatar | React component with collapse/expand, grouped by playlist |
| TOPC-06 | Approve topics (Gate 1) | webhookCall to /webhook/topics/approve + Supabase Realtime update |
| TOPC-07 | Reject with feedback | webhookCall to /webhook/topics/reject with optional feedback field |
| TOPC-08 | Refine with instructions (considers 24 other topics) | webhookCall to /webhook/topics/refine; n8n loads all 24 topics as context for Claude |
| TOPC-09 | Inline edit topic fields | Side panel with form fields, direct Supabase update via webhook |
| TOPC-10 | Bulk actions (approve all, approve by playlist) | Multi-select UI + batch webhook call |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2+ | UI framework | Already in dashboard/package.json |
| react-router | 7.1+ | Routing | Already configured with project routes |
| @tanstack/react-query | 5.62+ | Server state | Already configured with queryClient |
| @supabase/supabase-js | 2.39+ | Database client + Realtime | Already initialized in lib/supabase.js |
| lucide-react | 0.263+ | Icons | Already used throughout |
| sonner | 2.0+ | Toast notifications | Already in package.json |
| tailwindcss | 3.4+ | Styling | Already configured |

### No New Dependencies Needed
This phase requires NO new npm packages. Everything can be built with the existing stack:
- Modals: React portals or conditional rendering with existing glass-card CSS
- Side panels: Absolute/fixed positioned div with CSS transitions
- Skeleton loading: Existing `animate-shimmer` CSS class
- Filter dropdowns: Native HTML select or custom div dropdown
- Multi-select: React state management with checkboxes
- Animations: Existing CSS keyframes (animateIn, shimmer, shake)

### n8n Workflow Stack
| Tool | Purpose | Configuration |
|------|---------|---------------|
| Webhook node | Receive dashboard requests | POST endpoints with JSON body |
| HTTP Request node | Call Anthropic API | POST to api.anthropic.com/v1/messages |
| HTTP Request node | Read/write Supabase | REST API with PostgREST syntax |
| Respond to Webhook node | Return responses to dashboard | JSON response body |
| Code node | Transform data | JavaScript for JSON manipulation |

## Architecture Patterns

### Recommended Project Structure (new/modified files)
```
dashboard/src/
├── pages/
│   ├── ProjectsHome.jsx      # MODIFY: real data, create modal, smart routing
│   ├── TopicReview.jsx        # REWRITE: full functional implementation
│   └── NicheResearch.jsx      # NEW: /project/:id/research route
├── components/
│   ├── ui/
│   │   ├── Modal.jsx          # NEW: reusable glass-card modal with overlay
│   │   ├── SidePanel.jsx      # NEW: slide-in right panel for refine/edit
│   │   ├── ConfirmDialog.jsx  # NEW: centered confirmation modal
│   │   ├── SkeletonCard.jsx   # NEW: shimmer placeholder card
│   │   └── FilterDropdown.jsx # NEW: status/playlist filter
│   ├── projects/
│   │   ├── CreateProjectModal.jsx  # NEW: project creation form
│   │   └── ProjectCard.jsx         # NEW: extracted from ProjectsHome
│   ├── research/
│   │   ├── BlueOceanHero.jsx       # NEW: blue-ocean strategy display
│   │   ├── CompetitorCards.jsx      # NEW: competitor audit display
│   │   ├── PainPoints.jsx          # NEW: grouped pain points
│   │   ├── KeywordCloud.jsx        # NEW: colored keyword tags
│   │   └── PlaylistCards.jsx       # NEW: editable playlist angles
│   └── topics/
│       ├── TopicCard.jsx           # NEW: collapsible topic card
│       ├── TopicSummaryBar.jsx     # NEW: sticky summary counts
│       ├── TopicBulkBar.jsx        # NEW: sticky bottom selection bar
│       ├── RefinePanel.jsx         # NEW: side panel for refinement
│       └── EditPanel.jsx           # NEW: side panel for inline edit
├── hooks/
│   ├── useProjects.js         # NEW: TanStack Query hook for projects
│   ├── useNicheProfile.js     # NEW: TanStack Query hook for niche_profiles
│   └── useTopics.js           # NEW: TanStack Query hook for topics + avatars
├── lib/
│   ├── api.js                 # MODIFY: add specific endpoint helpers
│   ├── supabase.js            # EXISTING: no changes needed
│   └── queryClient.js         # EXISTING: no changes needed
└── App.jsx                    # MODIFY: add /project/:id/research route
```

### Pattern 1: TanStack Query + Supabase Read Hook
**What:** Custom hooks that wrap useQuery with Supabase client reads
**When to use:** Every data-fetching component

```javascript
// Source: Established project pattern + TanStack Query v5 docs
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, topics(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTopics(projectId) {
  return useQuery({
    queryKey: ['topics', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*, avatars(*)')
        .eq('project_id', projectId)
        .order('topic_number', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
```

### Pattern 2: Webhook Mutation + Optimistic Update
**What:** useMutation wrapping webhookCall with optimistic cache updates
**When to use:** All dashboard actions (create project, approve, reject, refine)

```javascript
// Source: TanStack Query v5 mutation pattern
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { webhookCall } from '../lib/api';

export function useApproveTopics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicIds }) =>
      webhookCall('topics/approve', { topic_ids: topicIds }),
    onMutate: async ({ topicIds }) => {
      await queryClient.cancelQueries({ queryKey: ['topics'] });
      const previous = queryClient.getQueryData(['topics']);
      // Optimistic update
      queryClient.setQueryData(['topics'], (old) =>
        old?.map((t) =>
          topicIds.includes(t.id)
            ? { ...t, review_status: 'approved' }
            : t
        )
      );
      return { previous };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['topics'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}
```

### Pattern 3: Realtime + Query Invalidation (existing pattern)
**What:** useRealtimeSubscription triggers TanStack cache invalidation
**When to use:** Research progress on project cards, topic generation reveal

```javascript
// Source: Existing useRealtimeSubscription.js in codebase
// Already implemented -- just wire it up:
useRealtimeSubscription(
  'projects',
  `id=eq.${projectId}`,
  [['projects'], ['niche-profile', projectId]]
);

useRealtimeSubscription(
  'topics',
  `project_id=eq.${projectId}`,
  [['topics', projectId]]
);
```

### Pattern 4: n8n Webhook Workflow Structure
**What:** Webhook trigger -> validate -> process -> write to Supabase -> respond
**When to use:** Every n8n workflow in this phase

```
[Webhook] -> [Code: Validate Input] -> [HTTP Request: Read Supabase]
  -> [Code: Build Claude Prompt / Process Data]
  -> [HTTP Request: Call Anthropic API] (for research/generation)
  -> [Code: Parse Response]
  -> [HTTP Request: Write to Supabase]
  -> [Respond to Webhook: Return result]
```

### Pattern 5: n8n HTTP Request to Anthropic with Web Search
**What:** Calling Claude Messages API with the web_search tool from n8n
**When to use:** Niche research workflow (NICH-02)

```json
// HTTP Request node configuration in n8n
// Method: POST
// URL: https://api.anthropic.com/v1/messages
// Headers:
//   x-api-key: {{$credentials.anthropicApiKey}}
//   anthropic-version: 2023-06-01
//   content-type: application/json
// Body (JSON):
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 8192,
  "tools": [
    {
      "type": "web_search_20250305",
      "name": "web_search",
      "max_uses": 10
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Research the niche '{{$json.niche}}' for a YouTube channel..."
    }
  ]
}
```

**Critical:** The Anthropic API handles the web search tool execution server-side. The n8n workflow does NOT need to handle tool_use responses or call the tool itself. Claude searches, gets results, and returns a final text response with citations -- all in one API call. However, if `stop_reason` is `"tool_use"` in the response (unlikely with server-side tools but possible with `pause_turn`), the workflow should handle continuation.

### Anti-Patterns to Avoid
- **Calling Anthropic API directly from dashboard:** All AI calls go through n8n webhooks. Dashboard never holds API keys.
- **Polling for research progress:** Use Supabase Realtime subscriptions, not setInterval polling.
- **Storing research in localStorage:** All data lives in Supabase. Dashboard is a pure view layer.
- **Creating multiple Supabase clients:** Use the singleton from lib/supabase.js.
- **Hardcoding niche-specific prompts:** All prompts are dynamically generated and stored in prompt_configs table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | `sonner` (already installed) | Handles positioning, stacking, dismiss timing |
| Data caching | useState + useEffect fetching | TanStack Query useQuery | Handles stale data, background refetch, cache invalidation |
| Realtime subscriptions | Raw supabase.channel() in components | useRealtimeSubscription hook | Already handles cleanup, channel naming, query invalidation |
| Form validation | Custom validation logic | HTML5 validation + simple checks | Project creation form is simple enough; no form library needed |
| Animation library | Framer Motion or similar | CSS keyframes + Tailwind transitions | Existing animate-in, animate-shimmer, transitions handle all needs |
| State management | Redux/Zustand for global state | TanStack Query + React state | Server state in TQ, UI state (modals, selections) in useState |
| UUID generation | Manual UUID creation | Let Supabase gen_random_uuid() handle it | Database generates IDs on INSERT |

## Common Pitfalls

### Pitfall 1: Realtime Subscription Filter Syntax
**What goes wrong:** Subscription doesn't fire because filter uses wrong PostgREST syntax
**Why it happens:** Supabase Realtime filters use `column=eq.value` (string), not `{ column: value }` (object)
**How to avoid:** Always use string format: `useRealtimeSubscription('topics', 'project_id=eq.abc-123', [...])`
**Warning signs:** Dashboard doesn't update when n8n writes to Supabase

### Pitfall 2: Topic Refinement Token Cost
**What goes wrong:** Refining a single topic costs more than expected (~$0.15/refinement)
**Why it happens:** Per CLAUDE.md, refinement includes all 24 other topics as context to avoid overlap
**How to avoid:** Include cost warning in refinement UI. Consider batching "Regenerate Rejected" to amortize context cost.
**Warning signs:** Unexpected Anthropic API bills

### Pitfall 3: n8n Webhook Timeout
**What goes wrong:** Niche research webhook times out because Claude + web search takes 30-60+ seconds
**Why it happens:** Default n8n webhook response timeout is 30 seconds; Claude with 10 web searches can take much longer
**How to avoid:** Use async webhook pattern: webhook returns immediately with project_id, n8n continues processing, dashboard watches Supabase Realtime for progress updates. Do NOT wait for the full research response synchronously.
**Warning signs:** Dashboard shows error on project creation; n8n logs show timeout

### Pitfall 4: Optimistic Update Race Conditions
**What goes wrong:** Optimistic update shows approved, then flickers back to pending, then back to approved
**Why it happens:** Realtime subscription fires before webhook mutation settles, causing double invalidation
**How to avoid:** In the mutation's onSettled, use `queryClient.invalidateQueries` which deduplicates. Also ensure the optimistic update and the Realtime callback produce the same state.
**Warning signs:** Brief UI flicker on approve/reject actions

### Pitfall 5: Supabase REPLICA IDENTITY for Realtime Updates
**What goes wrong:** Realtime subscription for UPDATE events doesn't include the changed columns
**Why it happens:** Table needs REPLICA IDENTITY FULL to send full row data on UPDATE
**How to avoid:** Already handled in schema migration (ALTER TABLE topics REPLICA IDENTITY FULL). Verify niche_profiles also has it if subscribing to research progress.
**Warning signs:** payload.new is empty or missing fields in Realtime callback

### Pitfall 6: Claude Web Search Response Format
**What goes wrong:** n8n Code node tries to parse response as simple text but gets content blocks array
**Why it happens:** Claude Messages API returns an array of content blocks (text, server_tool_use, web_search_tool_result), not a simple string
**How to avoid:** In the n8n Code node, extract text from `response.content.filter(c => c.type === 'text').map(c => c.text).join('')`
**Warning signs:** n8n workflow errors with "unexpected token" or "cannot read property of undefined"

### Pitfall 7: React Router 7 Import
**What goes wrong:** Import from 'react-router-dom' fails
**Why it happens:** Project uses React Router 7 which unified imports under 'react-router'
**How to avoid:** Always import from 'react-router': `import { useParams, useNavigate, NavLink } from 'react-router'`
**Warning signs:** Build errors about missing module

## Code Examples

### Modal Component (glass-card pattern)
```jsx
// Reusable modal following design system
import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass-card p-6 relative z-10 w-full ${maxWidth} animate-in`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

### Async Webhook Pattern (for long-running operations)
```javascript
// Dashboard triggers research, gets immediate response, watches Realtime
async function createProject(formData) {
  // 1. Webhook returns immediately with project ID
  const result = await webhookCall('project/create', {
    niche: formData.niche,
    description: formData.description,
    target_video_count: formData.targetVideoCount,
  });

  if (result.success) {
    // 2. Add project to local cache optimistically
    queryClient.setQueryData(['projects'], (old) => [
      { ...result.data, status: 'researching' },
      ...(old || []),
    ]);
    // 3. Dashboard watches Realtime for status changes
    // useRealtimeSubscription handles this automatically
  }

  return result;
}
```

### n8n Niche Research Workflow Structure
```
1. [Webhook: POST /webhook/project/create]
   Input: { niche, description, target_video_count }

2. [HTTP Request: INSERT project into Supabase]
   POST https://supabase.operscale.cloud/rest/v1/projects
   Body: { name: niche, niche, niche_description: description, status: 'researching' }
   Headers: Prefer: return=representation

3. [Respond to Webhook: Return project_id immediately]
   Body: { success: true, data: { id: project_id } }

4. [HTTP Request: Update project status to 'researching_competitors']
   PATCH projects?id=eq.{{project_id}}

5. [HTTP Request: Call Anthropic API with web_search tool]
   POST https://api.anthropic.com/v1/messages
   (Full niche research prompt with web_search_20250305 tool)

6. [Code: Parse research response into structured JSONB]
   Extract: competitor_analysis, audience_pain_points, keyword_research,
            blue_ocean_opportunities, playlist angles, expertise profile

7. [HTTP Request: INSERT into niche_profiles]
   POST niche_profiles with parsed JSONB

8. [HTTP Request: UPDATE projects with playlist angles + system prompt]
   PATCH projects?id=eq.{{project_id}}

9. [HTTP Request: Call Anthropic API for dynamic prompt generation]
   (Generates: topic_generator, script_pass1/2/3, evaluator, visual_director prompts)

10. [Code: Parse prompts]

11. [HTTP Request: INSERT prompt_configs (6-7 rows)]
    POST prompt_configs (one per prompt_type)

12. [HTTP Request: UPDATE project status to 'ready_for_topics']
    PATCH projects?id=eq.{{project_id}}
```

### Skeleton Card for Topic Generation
```jsx
export function TopicSkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-5 rounded-full animate-shimmer" />
        <div className="w-24 h-5 rounded-full animate-shimmer" />
      </div>
      <div className="h-5 w-3/4 rounded animate-shimmer mb-2" />
      <div className="h-4 w-1/2 rounded animate-shimmer mb-4" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-12 rounded-xl animate-shimmer" />
        <div className="h-12 rounded-xl animate-shimmer" />
        <div className="h-12 rounded-xl animate-shimmer" />
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| web_search_20250305 (basic) | web_search_20260209 (dynamic filtering) | Feb 2026 | Better search accuracy, lower token usage. But requires code execution tool. Use basic version for simplicity in n8n. |
| React Router v6 (react-router-dom) | React Router v7 (unified react-router) | Late 2024 | All imports from 'react-router' only |
| TanStack Query v4 (onSuccess in useQuery) | TanStack Query v5 (callbacks in useMutation only) | 2024 | onSuccess/onError removed from useQuery; use mutation callbacks |

**Note on web search tool version:** Use `web_search_20250305` (not `20260209`) in n8n workflows. The newer version requires the code execution tool which adds complexity. The basic version is sufficient for niche research and is simpler to integrate with n8n HTTP Request nodes.

## Open Questions

1. **Synta MCP for n8n deployment**
   - What we know: CONTEXT.md mentions deploying n8n workflows via Synta MCP
   - What's unclear: Whether Synta MCP is installed and accessible, or if workflows need manual import
   - Recommendation: Plan tasks to create workflow JSON files that can be imported into n8n. If Synta MCP is available, use it; if not, provide manual import instructions.

2. **Research progress granularity**
   - What we know: User wants 4-5 named steps with checkmarks on project card during research
   - What's unclear: Whether n8n can reliably update project status between each research substep (competitor audit, pain points, keywords, blue-ocean, prompt generation) without hitting Supabase rate limits
   - Recommendation: Update project status column with each step name. 5 PATCH requests over 30-60 seconds is well within limits.

3. **niche_profiles Realtime**
   - What we know: projects table already has REPLICA IDENTITY FULL
   - What's unclear: Whether niche_profiles table needs it too for research page live updates
   - Recommendation: Add REPLICA IDENTITY FULL to niche_profiles if subscribing to it. Alternatively, only subscribe to projects table status changes and fetch niche_profiles on navigation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1+ with @testing-library/react 16.1+ |
| Config file | dashboard/vite.config.js (vitest inline config or vitest.config.js) |
| Quick run command | `cd dashboard && npx vitest run --reporter=verbose` |
| Full suite command | `cd dashboard && npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NICH-01 | Create project modal renders, validates input, calls webhook | unit | `cd dashboard && npx vitest run src/__tests__/CreateProjectModal.test.jsx -x` | Wave 0 |
| NICH-07 | Projects Home fetches and renders real project data | unit | `cd dashboard && npx vitest run src/__tests__/ProjectsHome.test.jsx -x` | Wave 0 |
| TOPC-05 | Topic Review renders expandable cards with avatar data | unit | `cd dashboard && npx vitest run src/__tests__/TopicReview.test.jsx -x` | Wave 0 |
| TOPC-06 | Approve action calls webhook with correct topic IDs | unit | `cd dashboard && npx vitest run src/__tests__/TopicActions.test.jsx -x` | Wave 0 |
| TOPC-07 | Reject action includes optional feedback | unit | `cd dashboard && npx vitest run src/__tests__/TopicActions.test.jsx -x` | Wave 0 |
| TOPC-08 | Refine calls webhook with instructions | unit | `cd dashboard && npx vitest run src/__tests__/TopicActions.test.jsx -x` | Wave 0 |
| TOPC-10 | Bulk select + approve sends batch request | unit | `cd dashboard && npx vitest run src/__tests__/TopicBulkActions.test.jsx -x` | Wave 0 |
| NICH-02 | n8n research workflow returns structured JSONB | manual-only | Manual: trigger webhook, verify Supabase data | N/A (n8n workflow) |
| NICH-04 | n8n prompt generation creates correct prompt_configs rows | manual-only | Manual: verify prompt_configs table after research | N/A (n8n workflow) |
| TOPC-01 | n8n topic generation creates 25 topics + 25 avatars | manual-only | Manual: trigger webhook, verify Supabase counts | N/A (n8n workflow) |

### Sampling Rate
- **Per task commit:** `cd dashboard && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd dashboard && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/src/__tests__/CreateProjectModal.test.jsx` -- covers NICH-01
- [ ] `dashboard/src/__tests__/ProjectsHome.test.jsx` -- covers NICH-07 (replace mock-only version)
- [ ] `dashboard/src/__tests__/TopicReview.test.jsx` -- covers TOPC-05
- [ ] `dashboard/src/__tests__/TopicActions.test.jsx` -- covers TOPC-06, TOPC-07, TOPC-08
- [ ] `dashboard/src/__tests__/TopicBulkActions.test.jsx` -- covers TOPC-10
- [ ] Vitest config may need explicit jsdom environment setup (check if vitest.config.js is needed)

## Sources

### Primary (HIGH confidence)
- Anthropic Claude API web search tool docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool -- Full tool definition, parameters, response format, pricing
- Existing codebase: dashboard/src/hooks/useRealtimeSubscription.js, lib/api.js, lib/supabase.js -- Established patterns
- Existing codebase: dashboard/src/styles/index.css -- All available CSS classes (glass-card, animate-shimmer, badges)
- Existing codebase: dashboard/src/App.jsx -- Current route structure

### Secondary (MEDIUM confidence)
- n8n webhook docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/ -- Webhook node configuration
- TanStack Query + Supabase pattern: https://makerkit.dev/blog/saas/supabase-react-query -- useQuery/useMutation patterns verified against TQ v5 docs
- Supabase Realtime discussion: https://github.com/orgs/supabase/discussions/5048 -- Realtime + React Query integration considerations

### Tertiary (LOW confidence)
- n8n + Anthropic HTTP Request community forum: https://community.n8n.io/t/http-request-anthropic-claude-api-messages-input-should-be-a-valid-list-need-help-with-array-parameter/133080 -- Common error patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured in Phase 1
- Architecture: HIGH - Patterns derived from existing codebase + verified official docs
- Pitfalls: HIGH - Most pitfalls derived from codebase inspection and official API docs
- n8n workflows: MEDIUM - HTTP Request to Anthropic API pattern verified but not tested in this specific n8n setup
- Web search tool: HIGH - Verified from official Anthropic docs with full API reference

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (30 days - stable stack, no expected breaking changes)
