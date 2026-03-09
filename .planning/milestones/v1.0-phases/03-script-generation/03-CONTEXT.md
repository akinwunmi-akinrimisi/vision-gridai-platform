# Phase 3: Script Generation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

3-pass script generation pipeline with per-pass scoring (7 dimensions), scene segmentation with visual type assignment, and Gate 2 approval from the Script Review dashboard page. User triggers script generation per topic, monitors pass-by-pass progress, reviews the scored script, and approves/rejects/refines before production begins.

</domain>

<decisions>
## Implementation Decisions

### Script Review Page Layout
- Two-column layout: sticky left score panel + scrollable right script panel
- Full-width header bar above columns: topic number, SEO title, playlist badge, status badge, prev/next topic arrows
- Score panel sections (top to bottom): Quality Score (7 bars), Metadata (words/scenes/visual split/attempts), Action buttons (Approve/Reject/Refine), Collapsible Customer Avatar, Collapsible YouTube Metadata
- Score panel is sticky (stays visible while scrolling script)
- Script panel has its own scroll container (independent from score panel)
- Mobile: score panel collapses to compact top bar showing score + action buttons, script goes full-width below

### Script Content Display
- Combined seamless script view — no pass boundaries visible, organized by chapter
- First chapter expanded by default, rest collapsed
- Glass-card accordion chapter headers showing: chapter name, word count, scene count, expand/collapse chevron
- Clean prose styling: 14-15px body text, 1.7 line-height, subtle divider lines between scenes
- Subtle left-margin scene numbers (like line numbers in a code editor): muted, small, e.g. "047"
- Visual type badges per scene: blue=static_image, purple=i2v, amber=t2v (using existing badge system)
- Image prompts hidden by default, visible on hover/click per scene
- No separate reading mode — review mode with badges/numbers is the only mode

### Script Panel Toolbar
- Expand All / Collapse All chapters
- Regenerate Edited Prompts button (batch action, shows count of edited scenes)
- Search within script (text search across all scenes)
- Pass indicator (informational: which pass structure, attempt count)

### Scene Editing
- Click-to-edit inline expand: scene expands in-place showing narration textarea + image prompt textarea + visual type dropdown + Save/Cancel buttons
- "Regen Prompt" button per scene — but prompt regeneration is BATCH, not immediate
- "Regenerate All Edited Prompts" button in toolbar triggers n8n webhook to regenerate prompts for all edited scenes at once
- Narration and image prompt are independent edits; regen prompt is optional after narration change

### Script Generation Progress UX
- Step-by-step pass tracker on the Script Review page (replaces empty state after clicking "Generate Script")
- Shows: Pass 1 (Foundation) with status/score -> Pass 2 (Depth) -> Pass 3 (Resolution)
- Each pass shows: generating... -> scoring... -> score result (pass/fail)
- Auto-regeneration visible in tracker: "Pass 1 scored 5.2 — regenerating (attempt 2/3)..."
- Live updates via Supabase Realtime on topics table (script_pass_scores, status changes)

### Script Review Empty State
- "Generate Script" CTA button when topic is approved but no script exists yet
- Manual trigger per topic (not auto-queue on approval)
- Topic cards on Topic Review page show script status badges: Generating / Review / Approved / Failed

### Navigation
- Navigate to Script Review from Topic Review cards ("View Script" button on approved topics)
- Prev/Next topic arrows at top of Script Review page for cycling between approved topics
- No separate Scripts list page — Topic Review shows script status badges

### Per-Pass Scoring Display
- Combined score prominent in score panel (7-dimension bars)
- Per-pass breakdown in a collapsible section below combined score
- Force-pass warning banner (amber) on score panel when script scored below 7.0 after 3 attempts: "Force-passed after 3 attempts. Score: X/10. Review carefully."

### Gate 2 Approval Actions
- Approve: sets topic status to 'approved' (script approved), shows badge on Topic Review
- Reject: ConfirmDialog with optional feedback textarea, sets script_review_status to 'rejected'
- Refine: SidePanel (same pattern as topic refine) — whole-script refine with instructions textarea + refinement history. Claude regenerates the weakest pass incorporating feedback.
- After approval: status updates only. Production pipeline (Phase 4) not wired yet.

### Claude's Discretion
- Exact animation timing for pass tracker steps
- Score bar color thresholds (green/amber/red breakpoints)
- Toolbar layout and button sizing
- Chapter header expand/collapse animation
- Scene edit form validation rules
- Error states for failed generation/scoring
- Emotional beat field display (can show/hide as appropriate)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ScriptReview.jsx`: Has mock scaffolding with score panel, 7-dimension bars, chapter accordion, approve/reject/refine buttons — needs to be rewritten with real data
- `SidePanel.jsx`: Right-side slide panel — reuse for script refine (same pattern as topic refine)
- `ConfirmDialog.jsx`: Centered modal with children support + success/danger/primary variants — reuse for approve/reject confirmations
- `useTopics.js`: Has mutation hooks — extend with script-specific mutations (useGenerateScript, useApproveScript, etc.)
- `useRealtimeSubscription.js`: Realtime hook with TanStack Query invalidation — use for live script generation progress
- `FilterDropdown.jsx`: Custom dropdown — reuse if needed for any script filters
- `SkeletonCard.jsx`: Loading placeholder — reuse for script loading states
- CSS: `glass-card`, `badge-blue`, `badge-purple`, `badge-amber`, `animate-in`, `animate-shimmer` all available

### Established Patterns
- TanStack Query + Supabase Realtime for live updates (same as topics)
- n8n webhooks for AI operations (generate, refine, score)
- Glassmorphism UI with glass-card pattern
- SidePanel for edit/refine actions
- ConfirmDialog for destructive/important actions
- React Router 7 unified imports from 'react-router'

### Integration Points
- n8n webhooks needed: `/webhook/script/generate`, `/webhook/script/refine`, `/webhook/script/approve`, `/webhook/script/reject`, `/webhook/script/regen-prompts`
- Supabase tables: `topics` (script_json, script_metadata, script_quality_score, script_evaluation, script_pass_scores, script_review_status), `scenes` (inserted after visual type assignment)
- New hook: `useScript(topicId)` for script data + `useScenes(topicId)` for scene data
- Route: `/project/:id/topics/:topicId/script` — new route for Script Review
- Topic Review integration: "View Script" button on approved topic cards, script status badges

</code_context>

<specifics>
## Specific Ideas

- Pass tracker should feel like the research progress steps from Phase 2 — named steps with animated checkmarks, scores revealed as they complete
- Scene numbers styled like line numbers in VS Code — muted, monospace, left-aligned margin
- Glass-card chapter accordions should feel solid — not flimsy dropdowns
- The "Generate Script" empty state CTA should be inviting, not just a button — brief explanation of what will happen (3-pass process, ~8-10 min, scoring)
- Force-pass warning should be noticeable but not alarming — amber, not red

</specifics>

<deferred>
## Deferred Ideas

- Auto-queue script generation on topic approval — keep manual for v1
- Per-pass targeted refine (select which pass to regenerate) — Phase 6 polish if needed
- Script comparison view (before/after refine) — Phase 6 polish
- Batch script generation for all approved topics — consider for Phase 6
- Keyboard shortcuts for script navigation — Phase 6 polish

</deferred>

---

*Phase: 03-script-generation*
*Context gathered: 2026-03-08*
