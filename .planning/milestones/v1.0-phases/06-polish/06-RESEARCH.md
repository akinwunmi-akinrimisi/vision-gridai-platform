# Phase 6: Polish - Research

**Researched:** 2026-03-09
**Domain:** React settings page with inline editing + prompt editor (dashboard UI)
**Confidence:** HIGH

## Summary

Phase 6 rewrites the existing scaffold `Settings.jsx` into a fully functional tabbed settings page with two tabs: Configuration (per-project production config and YouTube/Drive settings) and Prompts (7 prompt type editors with version history). This is a pure dashboard UI phase -- no new n8n workflows need to be built from scratch, only 3 new webhook endpoints for settings updates, prompt updates, and prompt regeneration.

The existing codebase provides all necessary patterns: TanStack Query for data fetching, `webhookCall()` for mutations, `useRealtimeSubscription` for live updates, glass-card sections with icon headers (already in Settings.jsx), and the MetadataPanel inline edit pattern (Edit mode with Save/Cancel). The phase adds 2 new hooks, 1 new API helper module, 2 new components (tab switcher, prompt card), and rewrites Settings.jsx.

**Primary recommendation:** Follow established project patterns exactly -- TanStack Query hooks with Supabase reads, webhook mutations via `webhookCall()`, optimistic updates, glass-card styling. No new libraries needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All production config fields editable: script approach, image/video models, word count target, scene count target, images per video, i2v/t2v clip counts
- YouTube/Drive config fully editable: channel ID, 3 playlist IDs, Drive root/assets folder IDs
- Changes apply to NEXT video produced, not in-progress ones
- API/Webhooks section (n8n URL, Supabase URL, webhook status) remains read-only status display
- Security section (PIN, session duration) remains read-only status display
- Appearance section (theme) remains read-only status display (toggle already in sidebar)
- Save button per section (per glass-card), appears when any field in that section is edited
- Matches MetadataPanel inline edit pattern from Phase 5 (Edit mode with Save/Cancel)
- Each section saves independently via n8n webhook
- Full textarea per prompt type, auto-resize to fit content (no internal scroll)
- Monospace font for readability, character/word count shown below textarea
- Version badge displayed on each prompt card (e.g., "v3")
- Click version badge opens inline dropdown showing version history (version number + date)
- Select a previous version to view it in textarea (read-only), "Revert to this version" button
- Reverting creates a new version (preserving full history)
- Collapsible "Available Variables" reference list below each textarea showing all {{variables}} the prompt type supports
- No syntax highlighting in textarea -- keep it a plain textarea
- No test/preview feature -- prompts get used on next production run
- "Regenerate All Prompts" button at top of Prompts tab with confirmation dialog (warns it will overwrite all custom edits, creates new versions preserving history)
- All 7 prompt types visible, grouped into 3 categories: Core (system_prompt, topic_generator), Script Pipeline (script_pass1, script_pass2, script_pass3), Evaluation (evaluator, visual_director)
- All prompts start collapsed -- show type name, version badge, and first-line preview
- Click to expand and see full textarea + variable reference
- Tabbed layout at top: "Configuration" tab and "Prompts" tab
- Configuration tab: All 5 existing sections. Production Config and YouTube are editable with Save buttons. API, Security, Appearance are read-only (no opacity-60 styling -- just no edit controls)
- Prompts tab: 7 prompt editor cards grouped into 3 categories, all collapsed by default. "Regenerate All Prompts" button in the tab header area

### Claude's Discretion
- Exact input types for each config field (text input, dropdown, number input)
- Tab component styling and animation
- Prompt card expand/collapse animation
- Variable reference list content per prompt type
- Error handling for save failures
- Regenerate confirmation dialog copy

### Deferred Ideas (OUT OF SCOPE)
- Prompt A/B testing (save two versions, run both, compare results) -- v2 feature
- Settings import/export (copy config between projects) -- v2 feature
- Prompt templates marketplace (share prompts between projects) -- v2 feature
- Advanced prompt validation (check for missing variables, syntax errors) -- v2 feature
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OPS-03 | Settings page allows per-project config (script approach, image/video models, word count, scene count) | Configuration tab with editable Production Config and YouTube sections, saved via webhook to projects table |
| OPS-04 | Settings page includes prompt editor for viewing/editing dynamic prompts | Prompts tab with 7 prompt cards, version history dropdown, variable reference, regenerate all button |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.2.0 | UI framework | Already in project |
| TanStack Query | ^5.62.0 | Data fetching + cache | Established project pattern |
| @supabase/supabase-js | ^2.39.0 | DB reads + Realtime | Established project pattern |
| Tailwind CSS | ^3.4.0 | Styling | Established project pattern |
| lucide-react | ^0.263.1 | Icons | Established project pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.0 | Toast notifications | Save success/error feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom tab component | React tab library (radix-ui/tabs) | Adds dependency for 2 tabs -- not worth it |
| Custom auto-resize textarea | react-textarea-autosize | Extra dep for simple CSS solution (field.scrollHeight) |

**Installation:**
```bash
# No new packages needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
dashboard/src/
├── pages/
│   └── Settings.jsx               # Rewrite: tabbed layout, config + prompts
├── components/
│   └── settings/
│       ├── ConfigTab.jsx           # Production Config + YouTube + read-only sections
│       ├── PromptsTab.jsx          # 7 prompt cards grouped by category
│       └── PromptCard.jsx          # Individual prompt editor with version history
├── hooks/
│   ├── useProjectSettings.js      # Fetch single project config fields
│   └── usePromptConfigs.js        # Fetch prompt_configs for project + mutations
├── lib/
│   └── settingsApi.js             # Webhook helpers for settings/prompts endpoints
└── __tests__/
    └── Settings.test.jsx          # Tests for settings page
```

### Pattern 1: Inline Edit per Section (from MetadataPanel)
**What:** Each glass-card section has display mode and edit mode. Click "Edit" to switch to inputs, Save/Cancel to commit or discard.
**When to use:** Production Config and YouTube sections
**Example:**
```jsx
// Pattern from MetadataPanel.jsx (already in codebase)
const [isEditing, setIsEditing] = useState(false);
const [editValues, setEditValues] = useState({});

const startEditing = () => {
  setEditValues({ ...currentValues }); // copy current
  setIsEditing(true);
};

const handleSave = () => {
  onSave(editValues);
  setIsEditing(false);
};

const cancelEditing = () => {
  setIsEditing(false);
};
```

### Pattern 2: TanStack Query Hook with Realtime (from useProjects.js)
**What:** useQuery for initial fetch, useRealtimeSubscription for live cache invalidation
**When to use:** useProjectSettings and usePromptConfigs hooks
**Example:**
```jsx
// Pattern from useProjects.js (already in codebase)
export function useProjectSettings(projectId) {
  useRealtimeSubscription('projects', `id=eq.${projectId}`, [['project-settings', projectId]]);

  return useQuery({
    queryKey: ['project-settings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('script_approach, images_per_video, ...')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
```

### Pattern 3: Webhook Mutation (from usePublishMutations.js)
**What:** useMutation calling webhookCall(), with onSettled invalidation
**When to use:** All settings save operations
**Example:**
```jsx
// Pattern from usePublishMutations.js (already in codebase)
export function useUpdateSettings(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields) => updateSettings(projectId, fields),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
    },
  });
}
```

### Pattern 4: Auto-Resize Textarea (CSS-only approach)
**What:** Textarea that grows with content, no internal scrollbar
**When to use:** Prompt editor textareas
**Example:**
```jsx
// Simple approach: set height on input event
const handleInput = (e) => {
  e.target.style.height = 'auto';
  e.target.style.height = e.target.scrollHeight + 'px';
};

<textarea
  onInput={handleInput}
  className="w-full font-mono text-sm resize-none overflow-hidden"
  style={{ minHeight: '120px' }}
/>
```

### Pattern 5: Collapsible Prompt Card
**What:** Click to expand/collapse prompt content. Shows type name, version badge, first-line preview when collapsed.
**When to use:** All 7 prompt cards in Prompts tab
**Example:**
```jsx
const [isExpanded, setIsExpanded] = useState(false);

<div className="glass-card">
  <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-4">
    <div className="flex items-center gap-3">
      <span className="font-semibold">{promptType}</span>
      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">v{version}</span>
    </div>
    <span className="text-xs text-slate-400 truncate max-w-[300px]">{firstLine}</span>
  </button>
  {isExpanded && (
    <div className="px-4 pb-4">
      {/* textarea, variable reference, version dropdown */}
    </div>
  )}
</div>
```

### Anti-Patterns to Avoid
- **Direct Supabase writes from dashboard:** All mutations go through n8n webhooks (established pattern)
- **Global state for form values:** Use local useState per section, not a global form library
- **Full page form with single submit:** Each section saves independently (per CONTEXT.md decision)
- **Opacity-60 on read-only sections:** Remove opacity-60 from read-only sections (per CONTEXT.md -- just no edit controls)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | `sonner` (already installed) | Already used throughout project |
| Confirmation dialog | Custom modal | `ConfirmDialog.jsx` (already built) | Reuse existing component |
| Loading spinners | Custom spinner | Existing spinner pattern (border-t animate-spin) | Consistent across app |
| Data fetching | fetch() + useEffect | TanStack Query hooks | Caching, deduplication, refetching |

**Key insight:** This phase requires zero new libraries. Every pattern and component needed already exists in the codebase from Phases 1-5.

## Common Pitfalls

### Pitfall 1: Stale Edit State After Realtime Update
**What goes wrong:** User is editing a field, Realtime pushes an update, edit state gets overwritten
**Why it happens:** useRealtimeSubscription invalidates the query, causing re-render with server data
**How to avoid:** Only populate edit state when entering edit mode (startEditing), not on every render. The isEditing flag gates which values to display.
**Warning signs:** Form fields "jumping" or resetting while typing

### Pitfall 2: Prompt Version History Query Performance
**What goes wrong:** Querying all versions of all 7 prompts on page load is expensive
**Why it happens:** prompt_configs may have many historical versions per project
**How to avoid:** Only fetch active (is_active=true) prompts initially. Fetch version history on demand when user clicks the version badge.
**Warning signs:** Slow page load, large payload on settings page

### Pitfall 3: Textarea Auto-Resize Not Shrinking
**What goes wrong:** Textarea grows when typing but does not shrink when deleting text
**Why it happens:** Setting height directly without resetting first
**How to avoid:** Always set `height = 'auto'` before setting `height = scrollHeight + 'px'`
**Warning signs:** Textarea only grows, never shrinks

### Pitfall 4: Tab State Lost on Navigation
**What goes wrong:** User switches to Prompts tab, navigates away, comes back -- always lands on Configuration tab
**Why it happens:** Tab state stored in local useState resets on mount
**How to avoid:** This is acceptable behavior for a settings page. Do NOT persist tab state to URL or localStorage -- it's unnecessary complexity for an infrequently visited page.
**Warning signs:** Over-engineering tab persistence

### Pitfall 5: Prompt Regeneration Overwriting Active Edits
**What goes wrong:** User edits a prompt, then clicks "Regenerate All" and loses their edit
**Why it happens:** Regeneration replaces all prompts server-side
**How to avoid:** The ConfirmDialog warns about this explicitly. If a prompt is currently in edit mode, show additional warning. Regeneration should create NEW versions (increment version number), preserving history so user can revert.
**Warning signs:** No unsaved-changes warning before regeneration

## Code Examples

### Configuration Tab Field Definitions
```jsx
// Recommended field config for Production Config section
const productionFields = [
  { key: 'script_approach', label: 'Script Approach', type: 'select', options: [
    { value: '3_pass', label: '3-Pass (Default)' },
    { value: 'single_call', label: 'Single Call' },
  ]},
  { key: 'images_per_video', label: 'Images Per Video', type: 'number', min: 10, max: 200 },
  { key: 'i2v_clips_per_video', label: 'I2V Clips Per Video', type: 'number', min: 5, max: 100 },
  { key: 't2v_clips_per_video', label: 'T2V Clips Per Video', type: 'number', min: 10, max: 200 },
  { key: 'target_word_count', label: 'Target Word Count', type: 'number', min: 5000, max: 30000 },
  { key: 'target_scene_count', label: 'Target Scene Count', type: 'number', min: 50, max: 300 },
  { key: 'image_model', label: 'Image Model', type: 'text' },
  { key: 'i2v_model', label: 'I2V Model', type: 'text' },
  { key: 't2v_model', label: 'T2V Model', type: 'text' },
];

// YouTube/Drive section fields
const youtubeFields = [
  { key: 'youtube_channel_id', label: 'Channel ID', type: 'text' },
  { key: 'youtube_playlist1_id', label: 'Playlist 1 ID', type: 'text' },
  { key: 'youtube_playlist2_id', label: 'Playlist 2 ID', type: 'text' },
  { key: 'youtube_playlist3_id', label: 'Playlist 3 ID', type: 'text' },
  { key: 'drive_root_folder_id', label: 'Drive Root Folder ID', type: 'text' },
  { key: 'drive_assets_folder_id', label: 'Drive Assets Folder ID', type: 'text' },
];
```

### Settings API Helper Module
```jsx
// dashboard/src/lib/settingsApi.js
import { webhookCall } from './api';

export const updateProjectSettings = (projectId, fields) =>
  webhookCall('project/update-settings', { project_id: projectId, ...fields });

export const updatePrompt = (promptId, promptText) =>
  webhookCall('prompts/update', { prompt_id: promptId, prompt_text: promptText });

export const revertPrompt = (promptId, version) =>
  webhookCall('prompts/revert', { prompt_id: promptId, version });

export const regenerateAllPrompts = (projectId) =>
  webhookCall('prompts/regenerate', { project_id: projectId });
```

### Prompt Variable Reference Map
```jsx
// Variables available per prompt type (for collapsible reference section)
const PROMPT_VARIABLES = {
  system_prompt: [
    '{{niche}}', '{{niche_description}}', '{{niche_expertise_profile}}',
    '{{channel_style}}', '{{blue_ocean_strategy}}',
  ],
  topic_generator: [
    '{{niche}}', '{{niche_expertise_profile}}', '{{target_video_count}}',
    '{{playlist1_name}}', '{{playlist1_theme}}',
    '{{playlist2_name}}', '{{playlist2_theme}}',
    '{{playlist3_name}}', '{{playlist3_theme}}',
    '{{red_ocean_topics}}', '{{competitor_channels}}',
  ],
  script_pass1: [
    '{{seo_title}}', '{{narrative_hook}}', '{{key_segments}}',
    '{{avatar_name_age}}', '{{occupation_income}}', '{{pain_point}}',
    '{{emotional_driver}}', '{{dream_outcome}}', '{{niche_expertise_profile}}',
  ],
  script_pass2: [
    '{{seo_title}}', '{{pass1_output}}', '{{key_segments}}',
    '{{content_angle_blue_ocean}}',
  ],
  script_pass3: [
    '{{seo_title}}', '{{pass1_summary}}', '{{pass2_summary}}',
    '{{dream_outcome}}', '{{practical_takeaways}}',
  ],
  evaluator: [
    '{{combined_script}}', '{{word_count}}', '{{scene_count}}',
  ],
  visual_director: [
    '{{scene_narration}}', '{{emotional_beat}}', '{{chapter}}',
  ],
};
```

### Version History Dropdown
```jsx
// Inline dropdown when clicking version badge
const [showVersions, setShowVersions] = useState(false);
const [versions, setVersions] = useState([]);

const loadVersionHistory = async () => {
  const { data } = await supabase
    .from('prompt_configs')
    .select('id, version, created_at')
    .eq('project_id', projectId)
    .eq('prompt_type', promptType)
    .order('version', { ascending: false });
  setVersions(data || []);
  setShowVersions(true);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Settings.jsx hardcoded scaffold | Live data from Supabase + webhook saves | Phase 6 | All config editable |
| opacity-60 on all sections | Only edit controls removed from read-only | Phase 6 | Cleaner visual hierarchy |
| No prompt visibility | Full prompt editor with versioning | Phase 6 | Users can customize AI behavior |

**Deprecated/outdated:**
- The `ComingSoon` component import in Settings.jsx should be removed
- The `settingSections` array with hardcoded values should be replaced with live data

## Open Questions

1. **Prompt version storage model**
   - What we know: `prompt_configs` table has `version` and `is_active` columns. Each prompt_type per project can have multiple rows (one per version).
   - What's unclear: When saving an edit, should we INSERT a new row (new version) or UPDATE the active row? CONTEXT.md says "Reverting creates a new version" which implies INSERT-based versioning for reverts. For normal edits, UPDATE the active row is simpler.
   - Recommendation: Normal edits UPDATE the active row. Reverts INSERT a new row with incremented version. This keeps version history meaningful (only tracks deliberate revert points, not every keystroke save).

2. **n8n webhook for settings update**
   - What we know: Need `/webhook/project/update-settings`, `/webhook/prompts/update`, `/webhook/prompts/regenerate`
   - What's unclear: Whether these n8n workflows exist yet
   - Recommendation: Plan must include creating these webhook workflows in n8n (simple PATCH/INSERT to Supabase). These are straightforward CRUD operations, not complex pipelines.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1 + @testing-library/react 16 |
| Config file | `dashboard/vite.config.js` (test block) |
| Quick run command | `cd dashboard && npx vitest run --reporter=verbose -- Settings` |
| Full suite command | `cd dashboard && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPS-03 | Settings page renders Configuration tab with editable production config fields | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |
| OPS-03 | Save button appears when field is edited, calls webhook on save | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |
| OPS-03 | YouTube/Drive fields editable with independent save | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |
| OPS-03 | Read-only sections (API, Security, Appearance) show data without edit controls | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |
| OPS-04 | Prompts tab renders 7 prompt cards in 3 groups | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |
| OPS-04 | Prompt card expands on click, shows textarea and variable reference | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |
| OPS-04 | Version badge click shows version dropdown | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |
| OPS-04 | Regenerate All button shows confirmation dialog | unit | `cd dashboard && npx vitest run -- Settings.test` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd dashboard && npx vitest run --reporter=verbose -- Settings`
- **Per wave merge:** `cd dashboard && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/src/__tests__/Settings.test.jsx` -- covers OPS-03, OPS-04
- [ ] No new framework install needed -- Vitest + testing-library already configured

## Sources

### Primary (HIGH confidence)
- Existing codebase files (Settings.jsx, MetadataPanel.jsx, useProjects.js, usePublishMutations.js, publishApi.js, ConfirmDialog.jsx) -- established patterns
- CONTEXT.md -- user decisions and code context analysis
- Agent.md / Dashboard_Implementation_Plan.md -- schema reference for projects and prompt_configs tables

### Secondary (MEDIUM confidence)
- Settings page design system override (design-system/vision-gridai/pages/settings.md) -- generated design rules

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new libraries, all patterns from existing codebase
- Architecture: HIGH -- direct extension of established hooks/mutations/components pattern
- Pitfalls: HIGH -- based on real patterns observed in the existing codebase (MetadataPanel edit state, Realtime invalidation)

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies to change)
