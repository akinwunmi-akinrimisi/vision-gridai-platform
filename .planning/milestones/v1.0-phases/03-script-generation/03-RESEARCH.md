# Phase 3: Script Generation - Research

**Researched:** 2026-03-08
**Domain:** 3-pass script generation pipeline + Script Review dashboard page
**Confidence:** HIGH

## Summary

Phase 3 builds the 3-pass script generation pipeline with per-pass scoring (7 dimensions), scene segmentation with visual type assignment, and the Script Review dashboard page (Gate 2). The phase spans two layers: n8n webhook endpoints that orchestrate Claude API calls for generation/scoring/refinement, and the React dashboard page that displays scripts, scores, and provides approve/reject/refine controls.

The existing codebase from Phase 1-2 provides strong patterns to follow: TanStack Query + Supabase Realtime for live updates, n8n webhooks via `webhookCall()` for AI operations, glassmorphism UI with `glass-card` pattern, SidePanel for edit/refine actions, and ConfirmDialog for approval confirmations. The ScriptReview.jsx page exists as a mock scaffold and needs a full rewrite with real data binding.

**Primary recommendation:** Follow the established Phase 2 patterns exactly. The Script Review page is structurally similar to Topic Review (data from Supabase, mutations via webhooks, Realtime for live updates) but adds a two-column layout with sticky score panel, chapter accordion for script content, and inline scene editing. The n8n webhooks are the backend -- they receive requests and orchestrate Claude API calls, writing results to Supabase as they go.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-column layout: sticky left score panel + scrollable right script panel
- Full-width header bar above columns: topic number, SEO title, playlist badge, status badge, prev/next topic arrows
- Score panel sections (top to bottom): Quality Score (7 bars), Metadata (words/scenes/visual split/attempts), Action buttons (Approve/Reject/Refine), Collapsible Customer Avatar, Collapsible YouTube Metadata
- Combined seamless script view -- no pass boundaries visible, organized by chapter
- First chapter expanded by default, rest collapsed
- Glass-card accordion chapter headers showing: chapter name, word count, scene count, expand/collapse chevron
- Clean prose styling: 14-15px body text, 1.7 line-height, subtle divider lines between scenes
- Subtle left-margin scene numbers (like line numbers in a code editor): muted, small, monospace
- Visual type badges per scene: blue=static_image, purple=i2v, amber=t2v
- Image prompts hidden by default, visible on hover/click per scene
- Click-to-edit inline expand for scenes
- "Regenerate All Edited Prompts" batch button in toolbar
- Step-by-step pass tracker for generation progress (like research progress from Phase 2)
- "Generate Script" CTA button when topic approved but no script
- Manual trigger per topic (not auto-queue)
- Navigate to Script Review from Topic Review cards ("View Script" button)
- Prev/Next topic arrows for cycling between approved topics
- Combined score prominent; per-pass breakdown in collapsible section
- Force-pass warning banner (amber) when script scored below 7.0 after 3 attempts
- Approve sets status; Reject uses ConfirmDialog; Refine uses SidePanel
- After approval: status updates only (production pipeline not wired yet in Phase 3)

### Claude's Discretion
- Exact animation timing for pass tracker steps
- Score bar color thresholds (green/amber/red breakpoints)
- Toolbar layout and button sizing
- Chapter header expand/collapse animation
- Scene edit form validation rules
- Error states for failed generation/scoring
- Emotional beat field display (can show/hide as appropriate)

### Deferred Ideas (OUT OF SCOPE)
- Auto-queue script generation on topic approval
- Per-pass targeted refine (select which pass to regenerate)
- Script comparison view (before/after refine)
- Batch script generation for all approved topics
- Keyboard shortcuts for script navigation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCPT-01 | 3-pass script generation using dynamic prompts from `prompt_configs` | n8n webhook orchestrates 3 sequential Claude calls, loading prompts from prompt_configs table |
| SCPT-02 | Pass 1 (Foundation, 5-7K words) generated with topic + avatar data injected | Webhook injects topic/avatar variables into prompt_configs.script_pass1 template |
| SCPT-03 | Pass 2 (Depth, 8-10K words) generated with full Pass 1 as context | Pass 2 prompt includes full Pass 1 output; n8n stores intermediate results |
| SCPT-04 | Pass 3 (Resolution, 5-7K words) generated with summaries of Pass 1 + 2 | Pass 3 receives summaries (not full text) of prior passes |
| SCPT-05 | Per-pass scoring on 7 dimensions -- pass below 6.0 regenerated before next pass | n8n evaluator call after each pass; score stored in script_pass_scores JSONB; conditional retry |
| SCPT-06 | Combined scoring after all 3 passes -- below 7.0 triggers weakest pass regeneration | Combined evaluator call on full script; identifies weakest pass for targeted regen |
| SCPT-07 | Max 3 regeneration attempts total, force-pass on attempt 3 | script_attempts counter on topics table; force-pass logic in n8n |
| SCPT-08 | Visual type assignment (static_image/i2v/t2v) by Claude for each scene | Separate Claude call (WF02_AGENT equivalent) after script passes complete |
| SCPT-09 | Scene rows inserted into `scenes` table (one row per scene, ~172 per video) | Bulk INSERT to scenes table after visual type assignment |
| SCPT-10 | Script Review page shows full script by chapter, per-pass scores, combined score, visual distribution | Two-column layout with score panel + chapter accordion; data from topics + scenes tables |
| SCPT-11 | User can approve script from dashboard (Gate 2) | Approve button calls `/webhook/script/approve`; sets script_review_status='approved' |
| SCPT-12 | User can reject script with feedback or refine specific passes | Reject via ConfirmDialog; Refine via SidePanel; webhooks update topics table |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.2.0 | UI framework | Already in use |
| @tanstack/react-query | ^5.62.0 | Server state management | Already in use, provides mutations + cache invalidation |
| @supabase/supabase-js | ^2.39.0 | Database client + Realtime | Already in use |
| react-router | ^7.1.0 | Routing | Already in use, unified imports from 'react-router' |
| lucide-react | ^0.263.1 | Icons | Already in use |
| sonner | ^2.0.0 | Toast notifications | Already in use |
| tailwindcss | ^3.4.0 | Styling | Already in use |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^2.1.0 | Test runner | Unit + component tests |
| @testing-library/react | ^16.1.0 | Component testing | React component assertions |
| recharts | ^2.10.0 | Charts | Visual type distribution chart (if needed) |

### No New Dependencies Needed
This phase requires zero new npm packages. All patterns are covered by the existing stack.

## Architecture Patterns

### Recommended Component Structure
```
dashboard/src/
  pages/
    ScriptReview.jsx          # Full rewrite (currently mock scaffold)
  components/
    script/                    # NEW directory
      ScorePanel.jsx           # Left sticky column: scores + metadata + actions
      ScriptContent.jsx        # Right scrollable column: chapters + scenes
      ChapterAccordion.jsx     # Glass-card accordion per chapter
      SceneRow.jsx             # Individual scene: number, text, badges, inline edit
      SceneEditForm.jsx        # Expanded edit form (narration + image prompt + visual type)
      PassTracker.jsx          # Step-by-step generation progress display
      ScriptToolbar.jsx        # Expand All/Collapse All, Regen Prompts, Search
      ScriptRefinePanel.jsx    # SidePanel for whole-script refine
      ForcePassBanner.jsx      # Amber warning banner
    topics/
      TopicCard.jsx            # MODIFY: add script status badge + "View Script" link
  hooks/
    useScript.js               # NEW: fetch topic script data + Realtime subscription
    useScenes.js               # NEW: fetch scenes for topic + Realtime subscription
    useScriptMutations.js      # NEW: generate, approve, reject, refine, regen-prompts mutations
  lib/
    api.js                     # MODIFY: add script webhook helpers
```

### Pattern 1: Data Flow (follows Phase 2 exactly)
**What:** Dashboard reads from Supabase, writes via n8n webhooks, gets live updates via Realtime
**When to use:** All script operations

```javascript
// useScript.js - follows useTopics pattern exactly
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export function useScript(topicId) {
  // Subscribe to Realtime updates on topics table for this topic
  useRealtimeSubscription(
    topicId ? 'topics' : null,
    topicId ? `id=eq.${topicId}` : null,
    [['script', topicId]]
  );

  return useQuery({
    queryKey: ['script', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*, avatars(*)')
        .eq('id', topicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });
}
```

### Pattern 2: Scene Data Hook with Realtime
**What:** Separate hook for scenes (different table, different query key)

```javascript
// useScenes.js
export function useScenes(topicId) {
  useRealtimeSubscription(
    topicId ? 'scenes' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['scenes', topicId]]
  );

  return useQuery({
    queryKey: ['scenes', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('topic_id', topicId)
        .order('scene_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });
}
```

### Pattern 3: Mutation Hooks (follows useTopics pattern)
**What:** Optimistic updates + webhook calls + cache invalidation

```javascript
// useScriptMutations.js - same pattern as useApproveTopics/useRejectTopics
export function useGenerateScript(topicId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic_id }) =>
      webhookCall('script/generate', { topic_id }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['script', topicId] });
      // Optimistic: set status to 'scripting'
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['script', topicId] });
    },
  });
}
```

### Pattern 4: Script JSON Structure in Supabase
**What:** How script data is stored in the topics table

The `script_json` JSONB column stores the full scene array:
```json
{
  "scenes": [
    {
      "scene_id": "scene_001",
      "scene_number": 1,
      "chapter": "Chapter 1: The Amex Platinum Myth",
      "narration_text": "Meet Marcus. He's thirty-four...",
      "image_prompt": "A professional man in his mid-thirties, sitting at a modern desk...",
      "visual_type": "static_image",
      "emotional_beat": "curiosity"
    }
  ],
  "chapters": [
    { "name": "Chapter 1: The Amex Platinum Myth", "scene_range": [1, 34] }
  ],
  "metadata": {
    "total_words": 18742,
    "total_scenes": 172,
    "visual_split": { "static_image": 75, "i2v": 25, "t2v": 72 }
  }
}
```

The `script_pass_scores` JSONB column stores per-pass and combined scores:
```json
{
  "pass1": {
    "score": 7.2,
    "dimensions": {
      "persona_integration": 7.5,
      "hook_strength": 8.0,
      "pacing": 7.0,
      "specificity": 7.5,
      "tts_readability": 6.8,
      "visual_prompts": 7.0,
      "anti_patterns": 7.5
    },
    "feedback": "Strong hook, good persona usage. TTS readability needs improvement in scenes 12-18."
  },
  "pass2": { ... },
  "pass3": { ... },
  "combined": {
    "score": 7.8,
    "dimensions": { ... },
    "feedback": "..."
  }
}
```

### Pattern 5: Chapter Grouping from Scene Data
**What:** Group scenes by chapter for the accordion UI

```javascript
// Derive chapters from scenes array
function groupByChapter(scenes) {
  const chapters = {};
  for (const scene of scenes) {
    const ch = scene.chapter || 'Uncategorized';
    if (!chapters[ch]) chapters[ch] = { name: ch, scenes: [], wordCount: 0 };
    chapters[ch].scenes.push(scene);
    chapters[ch].wordCount += (scene.narration_text || '').split(/\s+/).length;
  }
  return Object.values(chapters);
}
```

### Pattern 6: n8n Webhook Endpoints for Script Operations

| Endpoint | Method | Payload | What n8n Does |
|----------|--------|---------|---------------|
| `/webhook/script/generate` | POST | `{ topic_id }` | Loads prompt_configs, runs 3-pass generation with per-pass scoring, writes script_json + script_pass_scores + inserts scenes |
| `/webhook/script/approve` | POST | `{ topic_id }` | Sets script_review_status='approved', sets status='approved' |
| `/webhook/script/reject` | POST | `{ topic_id, feedback }` | Sets script_review_status='rejected', stores feedback |
| `/webhook/script/refine` | POST | `{ topic_id, instructions }` | Regenerates weakest pass with instructions, re-scores, updates script_json |
| `/webhook/script/regen-prompts` | POST | `{ topic_id, scene_ids }` | Regenerates image prompts for edited scenes only |

### Pattern 7: Script Generation Progress via Realtime

The n8n generate webhook updates the topics table progressively:
1. Sets `status = 'scripting'`
2. After Pass 1: updates `script_pass_scores.pass1`
3. After Pass 2: updates `script_pass_scores.pass2`
4. After Pass 3: updates `script_pass_scores.pass3`
5. After combined eval: updates `script_pass_scores.combined`, `script_quality_score`
6. After visual assignment + scene insert: updates `script_json`, `word_count`, `scene_count`

Dashboard subscribes to `topics` table changes for this topic_id. The PassTracker component reads `script_pass_scores` to show which passes are complete and their scores.

### Anti-Patterns to Avoid
- **Polling for generation progress:** Use Supabase Realtime, not `setInterval`. The existing `useRealtimeSubscription` hook handles this.
- **Storing scenes only in script_json:** Scenes MUST also be inserted into the `scenes` table (one row per scene). The scenes table is what Phase 4 reads for production.
- **Fetching all scenes with the script query:** Keep `useScript` and `useScenes` as separate hooks with separate query keys. Scenes are ~172 rows and should have their own cache.
- **Auto-queuing generation:** User explicitly clicks "Generate Script" per topic. No auto-queue.
- **Showing pass boundaries in the script view:** The combined view is seamless, organized by chapter. Pass structure is informational only (in the pass tracker / score breakdown).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Optimistic updates | Manual state management | TanStack Query `onMutate` pattern | Already working in useTopics; error rollback built-in |
| Live progress updates | setInterval polling | Supabase Realtime + useRealtimeSubscription hook | Zero polling, instant updates, already working |
| Toast notifications | Custom notification system | sonner `toast.success/error` | Already in use across Phase 2 |
| Slide panels | Custom drawer component | SidePanel.jsx | Already built, supports Escape close + body scroll lock |
| Confirmation modals | Custom modal | ConfirmDialog.jsx with children support | Already built, supports feedback textarea children |
| Chapter accordion | Custom collapse logic | CSS height transition + state toggle | Simple boolean per chapter, no animation library needed |
| Score color mapping | Complex conditionals | Simple threshold function: >=8 green, >=7 amber, <7 red | Matches existing mock scaffold |

## Common Pitfalls

### Pitfall 1: Supabase Realtime Filter on Single Row
**What goes wrong:** Subscribing to `topics` table with `id=eq.{topicId}` may not fire for all column updates if REPLICA IDENTITY is not FULL.
**Why it happens:** Supabase Realtime requires REPLICA IDENTITY FULL for UPDATE events on filtered subscriptions.
**How to avoid:** The schema already has `ALTER TABLE topics REPLICA IDENTITY FULL;` -- verified in migrations. This is already working for Topic Review.
**Warning signs:** Realtime updates not triggering on topics table changes.

### Pitfall 2: Large Script JSON in Topics Table
**What goes wrong:** The `script_json` JSONB column can be 50KB+ for a 172-scene script. Fetching all topics with script_json included bloats the Topic Review query.
**Why it happens:** `useTopics` does `select('*, avatars(*)')` which includes script_json.
**How to avoid:** The `useTopics` query should explicitly exclude large columns: `select('id, topic_number, seo_title, ..., script_review_status, script_quality_score')` -- or accept the overhead since it is only 25 rows. For Phase 3, the simpler approach is fine. Optimize in Phase 6 if needed.
**Warning signs:** Topic Review page loading slowly after scripts are generated.

### Pitfall 3: Scene Insertion Race Condition
**What goes wrong:** If the n8n webhook inserts scenes and the dashboard tries to read them before the transaction completes, the scenes query returns partial data.
**Why it happens:** Supabase Realtime fires per-row, so 172 INSERT events fire in rapid succession.
**How to avoid:** The n8n webhook should do a bulk INSERT (single HTTP call inserts all 172 scenes), then update the topic status. The dashboard should only show the scenes view after topic status changes to indicate scenes are ready. The Realtime subscription on topics (not scenes) is the signal.
**Warning signs:** Scenes count flickering from 0 to partial to full.

### Pitfall 4: Prev/Next Topic Navigation
**What goes wrong:** When navigating between topics with prev/next arrows, stale data from the previous topic flashes before new data loads.
**Why it happens:** TanStack Query cache may have old data for the previous topic; new topic data needs to fetch.
**How to avoid:** Use `useParams()` topicId as the query key. TanStack Query will show loading state for the new topic. The ScriptReview page should show a skeleton/loading state while fetching.
**Warning signs:** Previous topic's script showing briefly when navigating.

### Pitfall 5: Inline Scene Edit Losing State on Realtime Update
**What goes wrong:** User is editing a scene narration, Realtime triggers a cache invalidation, and the edit form resets.
**Why it happens:** `useRealtimeSubscription` invalidates queries, which refetches data, which re-renders the component.
**How to avoid:** Track which scene is being edited in local state. When in edit mode, don't apply incoming Realtime updates to that specific scene's form fields. Only apply on save/cancel.
**Warning signs:** User's unsaved edits disappearing during active editing.

### Pitfall 6: Script Generation Webhook Timeout
**What goes wrong:** The 3-pass generation with scoring can take 5-10 minutes. The webhook HTTP response times out.
**Why it happens:** n8n webhook nodes have a default response timeout.
**How to avoid:** The generate webhook should return immediately with `{ success: true, message: "Generation started" }` and do the actual work asynchronously. Progress is communicated via Supabase Realtime updates (writing to the topics table as each pass completes). This is the standard pattern for long-running n8n operations.
**Warning signs:** Webhook call returning timeout error in the dashboard.

## Code Examples

### Score Bar Component (from existing mock, refined)
```jsx
// ScorePanel.jsx - score bar rendering
const SCORE_DIMENSIONS = [
  { key: 'persona_integration', label: 'Persona Integration' },
  { key: 'hook_strength', label: 'Hook Strength' },
  { key: 'pacing', label: 'Pacing & Structure' },
  { key: 'specificity', label: 'Specificity & Depth' },
  { key: 'tts_readability', label: 'TTS Readability' },
  { key: 'visual_prompts', label: 'Visual Prompts' },
  { key: 'anti_patterns', label: 'Anti-Patterns' },
];

function scoreColor(score) {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 7) return 'bg-amber-500';
  return 'bg-red-500';
}
```

### Chapter Accordion Pattern
```jsx
// ChapterAccordion.jsx
function ChapterAccordion({ chapter, isExpanded, onToggle, children }) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full glass-card flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
      >
        <span>{chapter.name}</span>
        <span className="flex items-center gap-3 text-xs text-text-muted dark:text-text-muted-dark font-normal">
          <span>{chapter.wordCount.toLocaleString()} words</span>
          <span>{chapter.scenes.length} scenes</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {isExpanded && (
        <div className="px-4 py-3 space-y-0">
          {children}
        </div>
      )}
    </div>
  );
}
```

### Scene Row with Line Number Pattern
```jsx
// SceneRow.jsx - VS Code-style line numbers
function SceneRow({ scene, onEdit, onTogglePrompt }) {
  return (
    <div className="flex gap-3 py-2 border-b border-border/20 dark:border-white/[0.03] group">
      {/* Line number */}
      <span className="w-8 text-right text-xs font-mono text-slate-300 dark:text-slate-600 pt-0.5 select-none flex-shrink-0">
        {String(scene.scene_number).padStart(3, '0')}
      </span>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-[1.7]">
          {scene.narration_text}
        </p>
        {/* Visual type badge */}
        <span className={`badge mt-1 ${
          scene.visual_type === 'static_image' ? 'badge-blue' :
          scene.visual_type === 'i2v' ? 'badge-purple' : 'badge-amber'
        }`}>
          {scene.visual_type}
        </span>
      </div>
    </div>
  );
}
```

### Pass Tracker Pattern
```jsx
// PassTracker.jsx - generation progress display
const PASSES = [
  { key: 'pass1', label: 'Pass 1: Foundation', wordRange: '5-7K words' },
  { key: 'pass2', label: 'Pass 2: Depth', wordRange: '8-10K words' },
  { key: 'pass3', label: 'Pass 3: Resolution', wordRange: '5-7K words' },
];

function PassTracker({ passScores, status }) {
  return (
    <div className="space-y-3">
      {PASSES.map((pass, i) => {
        const score = passScores?.[pass.key];
        const isActive = !score && status === 'scripting';
        const isComplete = !!score;
        return (
          <div key={pass.key} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isComplete ? 'bg-emerald-500 text-white' :
              isActive ? 'bg-primary/20 text-primary animate-pulse' :
              'bg-slate-100 dark:bg-white/[0.06] text-slate-400'
            }`}>
              {isComplete ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <div>
              <p className="text-sm font-medium">{pass.label}</p>
              {isComplete && (
                <p className="text-xs text-text-muted">
                  Score: {score.score}/10
                  {score.score < 6.0 && ' -- regenerated'}
                </p>
              )}
              {isActive && <p className="text-xs text-primary">Generating...</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### API Helpers Extension
```javascript
// api.js additions
export const generateScript = (topicId) => webhookCall('script/generate', { topic_id: topicId });
export const approveScript = (topicId) => webhookCall('script/approve', { topic_id: topicId });
export const rejectScript = (topicId, feedback) => webhookCall('script/reject', { topic_id: topicId, feedback });
export const refineScript = (topicId, instructions) => webhookCall('script/refine', { topic_id: topicId, instructions });
export const regenPrompts = (topicId, sceneIds) => webhookCall('script/regen-prompts', { topic_id: topicId, scene_ids: sceneIds });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Sheets for script storage | Supabase JSONB column | Phase 1 migration | Proper querying, no rate limits, Realtime |
| Polling for progress | Supabase Realtime subscriptions | Phase 1 | Instant updates, no wasted requests |
| Single scoring after all passes | Per-pass scoring with early retry | Platform v3 | Catches issues early, saves cost on downstream passes |
| react-router-dom imports | react-router unified imports | Phase 1 decision | React Router 7 pattern |

## Open Questions

1. **Script JSON size in topics query**
   - What we know: script_json can be 50KB+ per topic; useTopics fetches all 25 topics
   - What's unclear: Whether this causes noticeable performance issues
   - Recommendation: Accept the overhead for now (25 * 50KB = 1.25MB worst case). Add column exclusion in Phase 6 if needed. The useScript hook fetches a single topic anyway.

2. **Prompt configs availability**
   - What we know: Phase 2 should create prompt_configs entries during niche research (NICH-04, NICH-05)
   - What's unclear: Whether Phase 2 n8n workflows are complete (NICH-02 through NICH-06 are pending per REQUIREMENTS.md)
   - Recommendation: The n8n webhook for script/generate should validate prompt_configs exist and return an error if missing. Dashboard should show a clear error: "Niche research must be completed before generating scripts."

3. **Scene bulk insert format**
   - What we know: Supabase REST API supports bulk INSERT via POST with array body
   - What's unclear: Whether n8n HTTP Request node handles 172-row array inserts reliably
   - Recommendation: Use a single POST with JSON array body. If it fails on large payloads, chunk into batches of 50.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.0 + @testing-library/react 16.1.0 |
| Config file | `dashboard/vite.config.js` (test block) |
| Quick run command | `cd dashboard && npx vitest run --reporter=verbose` |
| Full suite command | `cd dashboard && npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCPT-10 | Script Review page renders score panel, chapters, scenes | unit | `cd dashboard && npx vitest run src/__tests__/ScriptReview.test.jsx -x` | Wave 0 |
| SCPT-11 | Approve script calls webhook and updates status | unit | `cd dashboard && npx vitest run src/__tests__/ScriptActions.test.jsx -x` | Wave 0 |
| SCPT-12 | Reject/Refine script calls webhook with feedback | unit | `cd dashboard && npx vitest run src/__tests__/ScriptActions.test.jsx -x` | Wave 0 |
| SCPT-01 | Generate script webhook called from dashboard | unit | `cd dashboard && npx vitest run src/__tests__/ScriptGenerate.test.jsx -x` | Wave 0 |
| SCPT-05 | Pass scores displayed correctly in score panel | unit | `cd dashboard && npx vitest run src/__tests__/ScorePanel.test.jsx -x` | Wave 0 |
| SCPT-08 | Visual type badges render correctly per scene | unit | `cd dashboard && npx vitest run src/__tests__/SceneRow.test.jsx -x` | Wave 0 |
| SCPT-09 | Scenes hook fetches scene rows from Supabase | unit | `cd dashboard && npx vitest run src/__tests__/useScenes.test.js -x` | Wave 0 |
| SCPT-02-04 | 3-pass generation orchestration | manual-only | n8n workflow testing (not dashbaord) | N/A |
| SCPT-06-07 | Combined scoring + force-pass logic | manual-only | n8n workflow testing (not dashboard) | N/A |

### Sampling Rate
- **Per task commit:** `cd dashboard && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd dashboard && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/ScriptReview.test.jsx` -- covers SCPT-10 (page renders with score panel, chapters)
- [ ] `src/__tests__/ScriptActions.test.jsx` -- covers SCPT-11, SCPT-12 (approve/reject/refine mutations)
- [ ] `src/__tests__/ScriptGenerate.test.jsx` -- covers SCPT-01 (generate button calls webhook)
- [ ] `src/__tests__/ScorePanel.test.jsx` -- covers SCPT-05 (score dimensions display)
- [ ] `src/__tests__/SceneRow.test.jsx` -- covers SCPT-08 (visual type badges)
- [ ] `src/__tests__/useScenes.test.js` -- covers SCPT-09 (scenes hook)

## Sources

### Primary (HIGH confidence)
- Project codebase: `dashboard/src/` -- all existing patterns, components, hooks examined directly
- `VisionGridAI_Platform_Agent.md` -- script generation spec (Section 4 Phase C, Section 5 Scoring Rubric)
- `Dashboard_Implementation_Plan.md` -- dashboard page specs, Supabase Realtime patterns
- `CLAUDE.md` -- project rules and tech stack
- `03-CONTEXT.md` -- user decisions for Phase 3

### Secondary (MEDIUM confidence)
- Supabase bulk insert via REST API -- standard PostgREST pattern, well-documented

### Tertiary (LOW confidence)
- n8n webhook async response pattern -- standard n8n pattern for long-running operations, but exact implementation details depend on n8n node configuration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and proven in Phase 1-2
- Architecture: HIGH -- directly follows established patterns from Phase 1-2 codebase
- Pitfalls: HIGH -- identified from examining actual codebase patterns and data flow
- Dashboard UI: HIGH -- user decisions are extremely specific, mock scaffold exists
- n8n webhooks: MEDIUM -- webhook patterns established but specific script generation orchestration details are n8n-side

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- all libraries locked, patterns established)
