# Research Page Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add platform multi-select, time range selector, and research history browsing to the Research page; reorder sidebar nav; update backend orchestrator to accept new parameters.

**Architecture:** Frontend-only state for platform/time range selection, passed through existing `webhookCall` to n8n webhook. New DB columns on `research_runs` store what was selected. History browsing uses existing `useAllRuns` + new `useRunById` hook.

**Tech Stack:** React 18, Tailwind CSS, @tanstack/react-query, Supabase JS, n8n (via MCP), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/006_research_enhancements.sql` | Create | Add `platforms`/`time_range` columns, drop `lookback_days` |
| `dashboard/src/components/layout/Sidebar.jsx` | Edit (line 50-55) | Reorder `platformNavItems` array |
| `dashboard/src/hooks/useResearch.js` | Edit | Update `useRunResearch` signature, add `useRunById` |
| `dashboard/src/pages/Research.jsx` | Edit | Platform toggles, time range pills, history enhancement |
| `dashboard/src/__tests__/Research.test.jsx` | Create | Tests for new Research page features |
| `workflows/WF_RESEARCH_ORCHESTRATOR.json` | Edit (via n8n MCP) | Conditional platform dispatch, time_range passthrough |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/006_research_enhancements.sql`

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/006_research_enhancements.sql`:

```sql
-- ═══════════════════════════════════════════════════
-- 006: Research Enhancements
-- Adds platform selection + flexible time range to research_runs
-- ═══════════════════════════════════════════════════

-- Add new columns
ALTER TABLE research_runs
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT ARRAY['reddit','youtube','tiktok','trends','quora'],
  ADD COLUMN IF NOT EXISTS time_range TEXT DEFAULT '7d';

-- Backfill existing rows
UPDATE research_runs
SET platforms = ARRAY['reddit','youtube','tiktok','trends','quora'],
    time_range = COALESCE(lookback_days::text || 'd', '7d')
WHERE platforms IS NULL;

-- Drop old column
ALTER TABLE research_runs DROP COLUMN IF EXISTS lookback_days;
```

- [ ] **Step 2: Apply migration to live Supabase**

Run via SSH to VPS:

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud \
  "docker exec -i supabase-db-1 psql -U postgres -d postgres" < supabase/migrations/006_research_enhancements.sql
```

Expected: No errors. Verify:

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud \
  "docker exec supabase-db-1 psql -U postgres -d postgres -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'research_runs' AND column_name IN ('platforms', 'time_range', 'lookback_days');\""
```

Expected output: `platforms` (ARRAY), `time_range` (text). No `lookback_days`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_research_enhancements.sql
git commit -m "db: add platforms/time_range to research_runs, drop lookback_days"
```

---

### Task 2: Sidebar Nav Reorder

**Files:**
- Edit: `dashboard/src/components/layout/Sidebar.jsx:50-55`

- [ ] **Step 1: Reorder the platformNavItems array**

In `dashboard/src/components/layout/Sidebar.jsx`, change lines 50-55 from:

```js
const platformNavItems = [
  { label: 'Projects', icon: LayoutDashboard, path: '/' },
  { label: 'Topic Research', icon: Microscope, path: '/research' },
  { label: 'Shorts Creator', icon: Clapperboard, path: '/shorts' },
  { label: 'Social Publisher', icon: Share2, path: '/social' },
];
```

To:

```js
const platformNavItems = [
  { label: 'Topic Research', icon: Microscope, path: '/research' },
  { label: 'Projects', icon: LayoutDashboard, path: '/' },
  { label: 'Shorts Creator', icon: Clapperboard, path: '/shorts' },
  { label: 'Social Publisher', icon: Share2, path: '/social' },
];
```

- [ ] **Step 2: Verify in dev server**

```bash
cd dashboard && npm run dev
```

Open sidebar — Topic Research should appear first in the Platform section.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/layout/Sidebar.jsx
git commit -m "ui: reorder sidebar — Topic Research first"
```

---

### Task 3: Hook Changes (useResearch.js)

**Files:**
- Edit: `dashboard/src/hooks/useResearch.js`
- Create: `dashboard/src/__tests__/Research.test.jsx`

- [ ] **Step 1: Write tests for the hook changes**

Create `dashboard/src/__tests__/Research.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'run-1', status: 'complete' }, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

import { useRunResearch, useRunById } from '../hooks/useResearch';
import { webhookCall } from '../lib/api';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useRunResearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends platforms and time_range in webhook payload', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    result.current.mutate({
      projectId: 'proj-1',
      platforms: ['reddit', 'youtube'],
      timeRange: '30d',
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('research/run', {
        project_id: 'proj-1',
        platforms: ['reddit', 'youtube'],
        time_range: '30d',
      });
    });
  });

  it('sends all platforms when none specified', async () => {
    const { result } = renderHook(() => useRunResearch(), { wrapper });

    result.current.mutate({
      projectId: 'proj-1',
      platforms: ['reddit', 'youtube', 'tiktok', 'trends', 'quora'],
      timeRange: '7d',
    });

    await waitFor(() => {
      expect(webhookCall).toHaveBeenCalledWith('research/run', {
        project_id: 'proj-1',
        platforms: ['reddit', 'youtube', 'tiktok', 'trends', 'quora'],
        time_range: '7d',
      });
    });
  });
});

describe('useRunById', () => {
  it('fetches a specific run by ID', async () => {
    const { result } = renderHook(() => useRunById('run-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 'run-1', status: 'complete' });
    });
  });

  it('is disabled when runId is null', () => {
    const { result } = renderHook(() => useRunById(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd dashboard && npx vitest run src/__tests__/Research.test.jsx
```

Expected: FAIL — `useRunResearch` still takes a plain `projectId` string, and `useRunById` doesn't exist.

- [ ] **Step 3: Update useRunResearch in useResearch.js**

In `dashboard/src/hooks/useResearch.js`, replace the `useRunResearch` function (lines 84-95):

From:

```js
export function useRunResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId) => {
      return webhookCall('research/run', { project_id: projectId });
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['research-run', projectId] });
    },
  });
}
```

To:

```js
export function useRunResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, platforms, timeRange }) => {
      return webhookCall('research/run', {
        project_id: projectId,
        platforms,
        time_range: timeRange,
      });
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['research-run', projectId] });
      queryClient.invalidateQueries({ queryKey: ['research-runs-all'] });
    },
  });
}
```

- [ ] **Step 4: Add useRunById to useResearch.js**

Append before the closing of the file (after `useAllRuns`):

```js
/**
 * Fetch a specific research run by ID (for viewing historical results).
 */
export function useRunById(runId) {
  return useQuery({
    queryKey: ['research-run-by-id', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_runs')
        .select('*, projects(name, niche)')
        .eq('id', runId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd dashboard && npx vitest run src/__tests__/Research.test.jsx
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/hooks/useResearch.js dashboard/src/__tests__/Research.test.jsx
git commit -m "feat: update useRunResearch payload, add useRunById hook"
```

---

### Task 4: Research Page — Platform Toggles + Time Range

**Files:**
- Edit: `dashboard/src/pages/Research.jsx`

- [ ] **Step 1: Add platform toggle and time range state**

In `dashboard/src/pages/Research.jsx`, add these imports at the top (merge with existing lucide imports):

```js
import { Filter } from 'lucide-react';
```

Add state variables inside the `Research` component, after the existing `useState` declarations (after line 113):

```js
const ALL_PLATFORMS = ['reddit', 'youtube', 'tiktok', 'trends', 'quora'];
const PLATFORM_LABELS = {
  reddit: 'Reddit',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  trends: 'Google Trends',
  quora: 'Quora',
};
const TIME_RANGES = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '1d', label: '1d' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'custom', label: 'Custom' },
];
```

Inside the component function, after `const [selectedSource, setSelectedSource] = useState('all');`:

```js
const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(ALL_PLATFORMS));
const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
const [customRange, setCustomRange] = useState({ start: '', end: '' });
```

- [ ] **Step 2: Add platform toggle helper functions**

Add these inside the component, after the state declarations:

```js
const allPlatformsSelected = selectedPlatforms.size === ALL_PLATFORMS.length;

const togglePlatform = (key) => {
  setSelectedPlatforms((prev) => {
    const next = new Set(prev);
    if (next.has(key)) {
      if (next.size <= 1) return prev; // minimum 1 platform
      next.delete(key);
    } else {
      next.add(key);
    }
    return next;
  });
};

const toggleAll = () => {
  if (allPlatformsSelected) {
    // Deselect all except the first one (minimum 1)
    setSelectedPlatforms(new Set([ALL_PLATFORMS[0]]));
  } else {
    setSelectedPlatforms(new Set(ALL_PLATFORMS));
  }
};
```

- [ ] **Step 3: Update handleRunResearch to pass new parameters**

Replace the existing `handleRunResearch` function:

From:

```js
const handleRunResearch = () => {
  if (!selectedProjectId) return;
  runResearch.mutate(selectedProjectId);
};
```

To:

```js
const handleRunResearch = () => {
  if (!selectedProjectId) return;
  const timeRange =
    selectedTimeRange === 'custom'
      ? { start: customRange.start, end: customRange.end }
      : selectedTimeRange;
  runResearch.mutate({
    projectId: selectedProjectId,
    platforms: [...selectedPlatforms],
    timeRange,
  });
};
```

- [ ] **Step 4: Add the config row JSX below the PageHeader**

After the closing `</PageHeader>` tag (line 227), add the config row:

```jsx
{/* Platform + Time Range config row */}
{selectedProjectId && (
  <div className="flex flex-wrap items-center gap-3 mb-6 animate-slide-up">
    {/* Platform toggles */}
    <div className="flex items-center gap-1.5">
      <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
      <button
        onClick={toggleAll}
        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
          allPlatformsSelected
            ? 'bg-primary/15 text-primary border-primary/30'
            : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
        }`}
      >
        All
      </button>
      {ALL_PLATFORMS.map((key) => (
        <button
          key={key}
          onClick={() => togglePlatform(key)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
            selectedPlatforms.has(key)
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
          }`}
        >
          {PLATFORM_LABELS[key]}
        </button>
      ))}
    </div>

    {/* Spacer */}
    <div className="flex-1" />

    {/* Time range selector */}
    <div className="flex items-center gap-1">
      {TIME_RANGES.map((tr) => (
        <button
          key={tr.value}
          onClick={() => setSelectedTimeRange(tr.value)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
            selectedTimeRange === tr.value
              ? 'bg-accent/15 text-accent border-accent/30'
              : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
          }`}
        >
          {tr.label}
        </button>
      ))}
    </div>
  </div>
)}

{/* Custom date range picker (shown when Custom is selected) */}
{selectedProjectId && selectedTimeRange === 'custom' && (
  <div className="flex items-center gap-3 mb-6 pl-6 animate-slide-up">
    <label className="text-[11px] text-muted-foreground">From</label>
    <input
      type="datetime-local"
      value={customRange.start}
      onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
      className="input text-xs h-8 w-auto"
    />
    <label className="text-[11px] text-muted-foreground">To</label>
    <input
      type="datetime-local"
      value={customRange.end}
      onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
      className="input text-xs h-8 w-auto"
    />
  </div>
)}
```

- [ ] **Step 5: Verify in dev server**

```bash
cd dashboard && npm run dev
```

Visit `/research`. Confirm:
- Platform pills render with all 5 selected by default
- Clicking a pill toggles it on/off
- Cannot deselect the last platform
- "All" toggles all on/off
- Time range pills render with "7d" active
- Clicking "Custom" shows date inputs
- "Run Research" sends the correct payload (check browser Network tab)

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/pages/Research.jsx
git commit -m "feat: add platform toggles + time range selector to Research page"
```

---

### Task 5: Research Page — History Enhancement

**Files:**
- Edit: `dashboard/src/pages/Research.jsx`

- [ ] **Step 1: Add useRunById import and selectedRunId state**

In `dashboard/src/pages/Research.jsx`, update the import from `useResearch`:

From:

```js
import {
  useLatestRun,
  useCategories,
  useResults,
  useRunResearch,
  useAllRuns,
} from '../hooks/useResearch';
```

To:

```js
import {
  useLatestRun,
  useCategories,
  useResults,
  useRunResearch,
  useAllRuns,
  useRunById,
} from '../hooks/useResearch';
```

Add state after the existing `useState` declarations:

```js
const [selectedRunId, setSelectedRunId] = useState(null);
```

Add the `useRunById` hook call after the other hook calls:

```js
const { data: historicalRun } = useRunById(selectedRunId);
```

- [ ] **Step 2: Compute the active run (latest or historical)**

After the hook calls, add:

```js
// Use historical run if selected, otherwise latest
const activeRun = selectedRunId && historicalRun ? historicalRun : latestRun;
const isViewingHistory = !!selectedRunId && !!historicalRun;
```

- [ ] **Step 3: Replace all `latestRun` references with `activeRun`**

Throughout the JSX, replace these references:

- `useCategories(latestRun?.id)` → `useCategories(activeRun?.id)`
- `useResults(latestRun?.id, selectedSource)` → `useResults(activeRun?.id, selectedSource)`
- All JSX references to `latestRun` in the completed/failed/running sections → `activeRun`

Specifically:

Replace `const isRunning = latestRun?.status === 'scraping' || latestRun?.status === 'categorizing';` with:
```js
const isRunning = activeRun?.status === 'scraping' || activeRun?.status === 'categorizing';
```

Replace `const isComplete = latestRun?.status === 'complete';` with:
```js
const isComplete = activeRun?.status === 'complete';
```

Replace `const hasRun = !!latestRun;` with:
```js
const hasRun = !!activeRun;
```

In the KPI `useMemo` deps, replace `latestRun` with `activeRun`:
```js
cost: activeRun?.cost || 0,
```
and deps: `[isComplete, results, categories, activeRun]`

In the JSX, replace every `latestRun` with `activeRun` (the progress section, completed section, failed section, and run metadata).

Keep `const { data: latestRun, isLoading: runLoading } = useLatestRun(selectedProjectId);` unchanged — it still fetches the latest. We just use `activeRun` for display.

- [ ] **Step 4: Add "Back to Latest" banner when viewing history**

After the config row (platform toggles section) and before the "No project selected" empty state, add:

```jsx
{/* Viewing historical run banner */}
{isViewingHistory && (
  <div className="flex items-center justify-between mb-4 px-4 py-2.5 bg-info-bg border border-info-border rounded-lg animate-slide-up">
    <span className="text-xs text-info font-medium">
      Viewing run from {formatRunAge(activeRun.created_at)} — {activeRun.projects?.name || 'Unknown project'}
    </span>
    <button
      onClick={() => setSelectedRunId(null)}
      className="text-xs font-medium text-info hover:text-info/80 underline underline-offset-2"
    >
      Back to Latest
    </button>
  </div>
)}
```

- [ ] **Step 5: Enhance RunHistoryRow with platform badges, time range, and result count**

Replace the existing `RunHistoryRow` component (lines 68-105) with:

```jsx
function RunHistoryRow({ run, isSelected, onSelect }) {
  const projectName = run.projects?.name || run.projects?.niche || 'Unknown';
  const isActive = run.status === 'scraping' || run.status === 'categorizing';
  const platforms = run.platforms || ALL_PLATFORMS;
  const timeRange = run.time_range || '7d';

  return (
    <button
      onClick={() => onSelect(run)}
      className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-card-hover ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{projectName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatRunAge(run.created_at)}
            </span>
            {/* Platform badges */}
            <div className="flex gap-0.5">
              {ALL_PLATFORMS.map((p) => (
                <span
                  key={p}
                  className={`w-1.5 h-1.5 rounded-full ${
                    platforms.includes(p) ? 'bg-primary' : 'bg-border'
                  }`}
                  title={PLATFORM_LABELS[p]}
                />
              ))}
            </div>
            {/* Time range */}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {timeRange}
            </span>
            {/* Result count */}
            {run.total_results > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {run.total_results} results
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isActive && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-medium border ${
              run.status === 'complete'
                ? 'bg-success-bg text-success border-success-border'
                : run.status === 'failed'
                  ? 'bg-danger-bg text-danger border-danger-border'
                  : 'bg-warning-bg text-warning border-warning-border'
            }`}
          >
            {run.status}
          </span>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 6: Move history section and update onSelect handler**

Move the "Recent Research Runs" section from the bottom of the page to **between the KPI cards and Category cards**. In the completed run section, reorder:

1. KPI cards (existing)
2. Run history (moved here)
3. Category cards (existing)
4. Source tabs (existing)
5. Run metadata footer (existing)

Update the history section's `onSelect` handler to load the specific run:

From:

```jsx
{allRuns && allRuns.length > 1 && (
  <div className="mt-6">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      Recent Research Runs
    </h2>
    <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
      {allRuns.map((run) => (
        <RunHistoryRow
          key={run.id}
          run={run}
          isSelected={run.project_id === selectedProjectId}
          onSelect={setSelectedProjectId}
        />
      ))}
    </div>
  </div>
)}
```

To (placed after the KPI cards div, before the category cards):

```jsx
{/* Run history */}
{allRuns && allRuns.length > 1 && (
  <div className="mb-6 animate-slide-up stagger-5" style={{ opacity: 0 }}>
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      Research History
    </h2>
    <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
      {allRuns.map((run) => (
        <RunHistoryRow
          key={run.id}
          run={run}
          isSelected={selectedRunId ? run.id === selectedRunId : run.id === activeRun?.id}
          onSelect={(r) => {
            setSelectedRunId(r.id);
            setSelectedProjectId(r.project_id);
            setSelectedSource('all');
          }}
        />
      ))}
    </div>
  </div>
)}
```

Update the stagger classes on subsequent sections:
- Category cards: `stagger-5` → `stagger-6`
- Source tabs heading: `stagger-6` → `stagger-7`

- [ ] **Step 7: Remove the old history section at the bottom**

Delete the entire block at the bottom of the page (the old `{allRuns && allRuns.length > 1 && ...}` section that was at the end, since we moved it above).

- [ ] **Step 8: Verify in dev server**

```bash
cd dashboard && npm run dev
```

Visit `/research`. Confirm:
- History section appears between KPIs and categories
- Each row shows platform dots, time range pill, result count
- Clicking a history row loads that run's results (KPIs + categories + source tabs update)
- "Back to Latest" banner appears, clicking it returns to latest run
- "Run Research" still works and creates a new run

- [ ] **Step 9: Commit**

```bash
git add dashboard/src/pages/Research.jsx
git commit -m "feat: enhance research history with platform badges, time range, run browsing"
```

---

### Task 6: Update WF_RESEARCH_ORCHESTRATOR (n8n)

**Files:**
- Edit via n8n MCP: workflow ID `F1he4SUW7nz6YPda`

- [ ] **Step 1: Update "Initialize Run" node to read and store new fields**

Use `mcp__synta-mcp__n8n_update_partial_workflow` to update the "Initialize Run" node (id: `code-1`).

The `jsCode` needs these changes:
1. Read `platforms` and `time_range` from webhook body
2. Include both in the research_runs INSERT

Updated jsCode for "Initialize Run" node:

```js
// Create research run + derive keywords from niche
const body = $input.first().json.body;
const projectId = body.project_id;
const platforms = body.platforms || ['reddit', 'youtube', 'tiktok', 'trends', 'quora'];
const timeRange = body.time_range || '7d';

// Fetch project niche info
const project = await this.helpers.httpRequest({
  method: 'GET',
  url: `${process.env.SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=niche,niche_description`,
  headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
});

const niche = project?.[0]?.niche || '';
const nicheDesc = project?.[0]?.niche_description || niche;

// Derive keywords using Claude Haiku
let keywords = [niche];
try {
  const aiResp = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: `Given this niche: "${niche}" with description: "${nicheDesc}", generate 5-8 search keywords for surfacing active discussions and pain points. Return ONLY a JSON array of strings.` }],
    }),
  });
  const text = aiResp.content?.[0]?.text || '[]';
  const parsed = JSON.parse(text.match(/\[[^\]]*\]/)?.[0] || '[]');
  if (parsed.length > 0) keywords = parsed;
} catch (e) { /* fallback to niche name */ }

// Create research_runs row with platforms and time_range
const run = await this.helpers.httpRequest({
  method: 'POST',
  url: `${process.env.SUPABASE_URL}/rest/v1/research_runs`,
  headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
  body: JSON.stringify({
    project_id: projectId,
    status: 'scraping',
    platforms: platforms,
    time_range: typeof timeRange === 'object' ? JSON.stringify(timeRange) : timeRange,
    derived_keywords: keywords,
    started_at: new Date().toISOString(),
  }),
});

return [{ json: { run_id: run[0].id, project_id: projectId, keywords, niche_description: nicheDesc, platforms, time_range: timeRange } }];
```

- [ ] **Step 2: Update "Run All Scrapers" node for conditional dispatch**

Update the "Run All Scrapers" node (id: `code-2`) jsCode to only run selected platforms:

```js
// Fire scrapers only for selected platforms
const data = $input.first().json;
const selectedPlatforms = data.platforms || ['reddit', 'youtube', 'tiktok', 'trends', 'quora'];
const timeRange = data.time_range || '7d';

const scraperIds = {
  reddit: 'VimOYktAz3iac6Of',
  youtube: 'Gt9mU64OKi3nlWIV',
  tiktok: 'yBVo1esSFDznHeWx',
  trends: 'XYszOEUQ1uv4DFp2',
  quora: '9Jb8mGd7iAynUdo3',
};

// Map time_range to a date for sub-workflows
let lookbackDate;
if (typeof timeRange === 'object' && timeRange.start) {
  lookbackDate = timeRange.start;
} else {
  const now = new Date();
  const map = { '1h': 3600000, '6h': 21600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 };
  const ms = map[timeRange] || 604800000;
  lookbackDate = new Date(now.getTime() - ms).toISOString();
}

const results = [];
const payload = {
  run_id: data.run_id,
  project_id: data.project_id,
  keywords: data.keywords,
  time_range: timeRange,
  lookback_date: lookbackDate,
};

// Run only selected scrapers sequentially
for (const [source, wfId] of Object.entries(scraperIds)) {
  if (!selectedPlatforms.includes(source)) continue;

  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `http://localhost:5678/api/v1/workflows/${wfId}/run`,
      headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    });
    results.push({ source, success: true });
  } catch (e) {
    results.push({ source, success: false, error: e.message });
  }

  // Update sources_completed count
  const completed = results.filter(r => r.success).length;
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${process.env.SUPABASE_URL}/rest/v1/research_runs?id=eq.${data.run_id}`,
    headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ sources_completed: completed }),
  });
}

// Count total results
const allResults = await this.helpers.httpRequest({
  method: 'GET',
  url: `${process.env.SUPABASE_URL}/rest/v1/research_results?run_id=eq.${data.run_id}&select=id`,
  headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
});

// Update run with totals
await this.helpers.httpRequest({
  method: 'PATCH',
  url: `${process.env.SUPABASE_URL}/rest/v1/research_runs?id=eq.${data.run_id}`,
  headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
  body: JSON.stringify({ status: 'categorizing', total_results: allResults?.length || 0 }),
});

return [{ json: { ...data, scraper_results: results, total_results: allResults?.length || 0 } }];
```

- [ ] **Step 3: Push updates via n8n MCP**

Use `mcp__synta-mcp__n8n_update_partial_workflow` with workflow ID `F1he4SUW7nz6YPda` to update both Code nodes.

- [ ] **Step 4: Update the local JSON file**

After pushing to n8n, fetch the updated workflow and save to `workflows/WF_RESEARCH_ORCHESTRATOR.json`:

```bash
# Use n8n MCP n8n_get_workflow to fetch the updated JSON, then write to file
```

- [ ] **Step 5: Verify webhook accepts new payload**

Test with curl:

```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/research/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer __REDACTED_DASHBOARD_API_TOKEN_OLD__" \
  -d '{"project_id":"75eb2712-ef3e-47b7-b8db-5be3740233ff","platforms":["reddit","youtube"],"time_range":"1d"}'
```

Expected: 200 response. Check `research_runs` table — new row should have `platforms = {reddit,youtube}` and `time_range = '1d'`. Only Reddit and YouTube scrapers should fire.

- [ ] **Step 6: Commit local workflow JSON**

```bash
git add workflows/WF_RESEARCH_ORCHESTRATOR.json
git commit -m "feat: WF_RESEARCH_ORCHESTRATOR conditional platform dispatch + time_range"
```

---

### Task 7: Build Dashboard + Run All Tests

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

```bash
cd dashboard && npx vitest run
```

Expected: All existing tests pass + new Research tests pass.

- [ ] **Step 2: Fix any broken tests**

The existing test files may reference the old `useRunResearch` API that took a plain `projectId`. Check:

```bash
cd dashboard && grep -r "runResearch.mutate(" src/ --include="*.jsx" --include="*.js" | grep -v node_modules
```

If any other files call `runResearch.mutate(projectId)` (plain string), update them to use the new object form: `runResearch.mutate({ projectId, platforms: [...], timeRange: '7d' })`.

- [ ] **Step 3: Build for production**

```bash
cd dashboard && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Deploy to VPS**

```bash
scp -i ~/.ssh/vps_gridai -r dashboard/dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/
```

- [ ] **Step 5: Verify on live site**

Open https://dashboard.operscale.cloud/research. Confirm:
- Sidebar: Topic Research is first
- Platform toggles visible and functional
- Time range selector visible, "7d" default
- Run history shows between KPIs and categories
- History rows show platform dots, time range, result count
- Clicking a history row loads that run's data
- "Back to Latest" works

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: build dashboard for deployment"
```
