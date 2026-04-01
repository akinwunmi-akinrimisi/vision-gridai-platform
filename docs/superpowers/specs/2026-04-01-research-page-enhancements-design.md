# Research Page Enhancements — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Sidebar reorder, platform multi-select, time range selector, research history enhancement, backend webhook update

---

## 1. Sidebar Nav Reorder

**File:** `dashboard/src/components/layout/Sidebar.jsx`

Change `platformNavItems` array order from:
1. Projects, 2. Topic Research, 3. Shorts Creator, 4. Social Publisher

To:
1. Topic Research (Microscope), 2. Projects (LayoutDashboard), 3. Shorts Creator (Clapperboard), 4. Social Publisher (Share2)

No other sidebar changes. Paths stay the same.

---

## 2. Platform Selection (Multi-Select Pill Toggles)

**File:** `dashboard/src/pages/Research.jsx`

### UI
A second row in the PageHeader area, below the existing project selector + Run button row:

```
[Select All] [Reddit] [YouTube] [TikTok] [Google Trends] [Quora]    [1h] [6h] [1d] [7d] [30d] [Custom]
|--- platform toggles (left-aligned) ---|                            |--- time range (right-aligned) ---|
```

### Platform Toggle Behavior
- Each platform is a small toggle pill button (outline when off, filled accent when on)
- Visual style: match existing SourceTabs tab styling for consistency
- "Select All" toggles all 5 on/off. Shows as active when all 5 are selected.
- Clicking individual platforms toggles them independently
- If all 5 are manually selected, "Select All" auto-shows as active
- **Minimum 1 platform must remain selected** — if user tries to deselect the last one, it stays selected (no-op with subtle shake or toast)
- Platform keys: `reddit`, `youtube`, `tiktok`, `trends`, `quora`

### State
```js
const [selectedPlatforms, setSelectedPlatforms] = useState(
  new Set(['reddit', 'youtube', 'tiktok', 'trends', 'quora'])
);
```

### Integration
Platforms passed in the `runResearch` mutation payload:
```js
runResearch.mutate({
  project_id: selectedProjectId,
  platforms: [...selectedPlatforms],
  time_range: selectedTimeRange,
});
```

---

## 3. Time Range Selector (Button Group)

**File:** `dashboard/src/pages/Research.jsx`

### UI
Right-aligned button group on the same row as platform toggles:
```
[1h] [6h] [1d] [7d] [30d] [Custom]
```

### Behavior
- Single-selection button group (radio-style, styled as pills)
- Default: `7d` (matches existing `lookback_days: 7` behavior)
- Active pill: filled accent color. Inactive: outline/ghost
- "Custom" selection: reveals an inline date range picker below the button group
  - Two date inputs: "From" and "To" (native `<input type="datetime-local">` or a lightweight date picker)
  - Custom value stored as: `{ start: "ISO string", end: "ISO string" }`
- Preset values stored as strings: `"1h"`, `"6h"`, `"1d"`, `"7d"`, `"30d"`

### State
```js
const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
const [customRange, setCustomRange] = useState({ start: '', end: '' });
```

When `selectedTimeRange === 'custom'`, the payload sends:
```js
time_range: { start: customRange.start, end: customRange.end }
```

Otherwise: `time_range: "7d"` (string).

---

## 4. Research History Enhancement

**File:** `dashboard/src/pages/Research.jsx`

### Current State
- "Recent Research Runs" section exists at the bottom of the page
- Shows project name, age, status badge
- Clicking selects a project (loads that project's latest run)

### Changes

**4a. Relocate:** Move the history section from the page bottom to **between KPIs and Categories** when a completed run is displayed. When no run exists, keep it below the empty state.

**4b. Enhanced row data:** Each `RunHistoryRow` now shows:
- Project name (existing)
- Date/age (existing)
- **Platforms used**: small icon badges (e.g., Reddit icon, YouTube icon) for each platform in `run.platforms`
- **Time range**: pill showing `run.time_range` value (e.g., "7d", "30d")
- **Result count**: `run.total_results` number
- Status badge (existing)

**4c. "View Results" action:** Clicking a history row now loads **that specific run's results** instead of just switching the selected project. This requires:
- New state: `selectedRunId` — when set, overrides `latestRun` for displaying results
- When user clicks a history row: set `selectedRunId = run.id` and `selectedProjectId = run.project_id`
- A "Back to Latest" button appears when viewing a historical run
- The KPIs, categories, and source tabs all read from the selected run (they already accept `runId` as parameter)

**4d. Hook addition:** Add `useRunById(runId)` to `useResearch.js`:
```js
export function useRunById(runId) {
  return useQuery({
    queryKey: ['research-run-by-id', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_runs')
        .select('*')
        .eq('id', runId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });
}
```

---

## 5. Database Migration

**File:** `supabase/migrations/006_research_enhancements.sql`

```sql
-- Add platform selection and flexible time range to research_runs
ALTER TABLE research_runs
  ADD COLUMN platforms TEXT[] DEFAULT ARRAY['reddit','youtube','tiktok','trends','quora'],
  ADD COLUMN time_range TEXT DEFAULT '7d';

-- Backfill existing rows
UPDATE research_runs
SET platforms = ARRAY['reddit','youtube','tiktok','trends','quora'],
    time_range = COALESCE(lookback_days::text || 'd', '7d')
WHERE platforms IS NULL;

-- Drop old column
ALTER TABLE research_runs DROP COLUMN IF EXISTS lookback_days;
```

### New columns on `research_runs`:
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `platforms` | TEXT[] | `{reddit,youtube,tiktok,trends,quora}` | Which platforms were scraped |
| `time_range` | TEXT | `'7d'` | Lookback period (`1h`, `6h`, `1d`, `7d`, `30d`, or JSON `{"start":"...","end":"..."}` for custom) |

### Removed columns:
| Column | Reason |
|--------|--------|
| `lookback_days` | Replaced by `time_range` (more flexible, supports hours) |

---

## 6. Hook Changes (`useResearch.js`)

### Modified: `useRunResearch`
Mutation payload changes from `{ project_id }` to `{ project_id, platforms, time_range }`:
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

### Added: `useRunById(runId)`
Fetches a specific run by ID for viewing historical results (see Section 4d).

### Unchanged:
- `useLatestRun(projectId)` — no changes, just returns new columns now
- `useCategories(runId)` — already accepts `runId`
- `useResults(runId, source)` — already accepts `runId`
- `useAllRuns()` — no changes, new columns auto-included in `select('*')`

---

## 7. Backend: WF_RESEARCH_ORCHESTRATOR

**File:** `workflows/WF_RESEARCH_ORCHESTRATOR.json` (n8n workflow ID: `F1he4SUW7nz6YPda`)

### Webhook Payload (new format)
```json
{
  "project_id": "uuid",
  "platforms": ["reddit", "youtube", "tiktok", "trends", "quora"],
  "time_range": "7d"
}
```

### Changes to workflow logic:

**7a. Read new fields from webhook body:**
- `platforms`: default to all 5 if not provided (backward compatible)
- `time_range`: default to `"7d"` if not provided

**7b. Store in research_runs record:**
- INSERT now includes `platforms` and `time_range` columns

**7c. Conditional dispatch:**
Current: sequentially fires all 5 sub-workflows.
New: only dispatch sub-workflows for platforms in the `platforms` array.

```
IF "reddit" IN platforms → fire WF_RESEARCH_REDDIT
IF "youtube" IN platforms → fire WF_RESEARCH_YOUTUBE
IF "tiktok" IN platforms → fire WF_RESEARCH_TIKTOK
IF "trends" IN platforms → fire WF_RESEARCH_GOOGLE_TRENDS
IF "quora" IN platforms → fire WF_RESEARCH_QUORA
```

**7d. Adjust sources_completed tracking:**
- Total expected = `platforms.length` (not always 5)
- Progress: `sources_completed / platforms.length`

**7e. Pass time_range to sub-workflows:**
- Each sub-workflow receives `time_range` in its payload
- Sub-workflows convert to their native format:
  - Reddit/Quora (Apify): `"1h"` → last 1 hour filter
  - YouTube: `publishedAfter` ISO date parameter
  - TikTok (Apify): date range filter
  - Google Trends: `timeframe` parameter mapping

### Sub-workflow time_range mapping:
| time_range | Reddit/Quora | YouTube `publishedAfter` | TikTok | Google Trends `timeframe` |
|------------|-------------|-------------------------|--------|--------------------------|
| `1h` | 1 hour ago | 1 hour ago ISO | 1 hour | `now 1-H` |
| `6h` | 6 hours ago | 6 hours ago ISO | 6 hours | `now 7-d` (min granularity) |
| `1d` | 1 day ago | 1 day ago ISO | 1 day | `now 1-d` |
| `7d` | 7 days ago | 7 days ago ISO | 7 days | `now 7-d` |
| `30d` | 30 days ago | 30 days ago ISO | 30 days | `today 1-m` |
| custom | start/end dates | start ISO | start/end | custom range |

---

## 8. Files Changed Summary

| File | Change Type | Description |
|------|------------|-------------|
| `dashboard/src/components/layout/Sidebar.jsx` | Edit | Reorder `platformNavItems` array |
| `dashboard/src/pages/Research.jsx` | Edit | Add platform toggles, time range selector, enhance history |
| `dashboard/src/hooks/useResearch.js` | Edit | Update `useRunResearch` payload, add `useRunById` |
| `supabase/migrations/006_research_enhancements.sql` | New | Add `platforms`/`time_range` columns, drop `lookback_days` |
| `workflows/WF_RESEARCH_ORCHESTRATOR.json` | Edit (via n8n MCP) | Conditional platform dispatch, time_range passthrough |

No new components needed — all changes fit within existing files.
