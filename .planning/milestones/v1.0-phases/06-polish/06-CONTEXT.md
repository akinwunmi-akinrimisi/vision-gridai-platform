# Phase 6: Polish - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Settings page with per-project configuration (production config, YouTube/Drive IDs, model selection) and a prompt editor for viewing/editing all 7 dynamic prompt types. Two requirements: OPS-03 (per-project config) and OPS-04 (prompt editor). The existing Settings.jsx scaffold is rewritten from read-only display to a fully functional tabbed settings page.

</domain>

<decisions>
## Implementation Decisions

### Settings Field Editability
- All production config fields editable: script approach, image/video models, word count target, scene count target, images per video, i2v/t2v clip counts
- YouTube/Drive config fully editable: channel ID, 3 playlist IDs, Drive root/assets folder IDs
- Changes apply to NEXT video produced, not in-progress ones
- API/Webhooks section (n8n URL, Supabase URL, webhook status) remains read-only status display
- Security section (PIN, session duration) remains read-only status display
- Appearance section (theme) remains read-only status display (toggle already in sidebar)

### Save Behavior
- Save button per section (per glass-card), appears when any field in that section is edited
- Matches MetadataPanel inline edit pattern from Phase 5 (Edit mode with Save/Cancel)
- Each section saves independently via n8n webhook

### Prompt Editor Interaction
- Full textarea per prompt type, auto-resize to fit content (no internal scroll)
- Monospace font for readability, character/word count shown below textarea
- Version badge displayed on each prompt card (e.g., "v3")
- Click version badge opens inline dropdown showing version history (version number + date)
- Select a previous version to view it in textarea (read-only), "Revert to this version" button
- Reverting creates a new version (preserving full history)
- Collapsible "Available Variables" reference list below each textarea showing all {{variables}} the prompt type supports
- No syntax highlighting in textarea — keep it a plain textarea
- No test/preview feature — prompts get used on next production run
- "Regenerate All Prompts" button at top of Prompts tab with confirmation dialog (warns it will overwrite all custom edits, creates new versions preserving history)

### Prompt Grouping
- All 7 prompt types visible, grouped into 3 categories:
  - **Core:** system_prompt, topic_generator
  - **Script Pipeline:** script_pass1, script_pass2, script_pass3
  - **Evaluation:** evaluator, visual_director
- All prompts start collapsed — show type name, version badge, and first-line preview
- Click to expand and see full textarea + variable reference

### Settings Page Organization
- Tabbed layout at top of Settings page: "Configuration" tab and "Prompts" tab
- **Configuration tab:** All 5 existing sections (Production Config, YouTube, API/Webhooks, Security, Appearance). Production Config and YouTube are editable with Save buttons. API, Security, Appearance are read-only (no opacity-60 styling — just no edit controls)
- **Prompts tab:** 7 prompt editor cards grouped into 3 categories, all collapsed by default. "Regenerate All Prompts" button in the tab header area

### Claude's Discretion
- Exact input types for each config field (text input, dropdown, number input)
- Tab component styling and animation
- Prompt card expand/collapse animation
- Variable reference list content per prompt type
- Error handling for save failures
- Regenerate confirmation dialog copy

</decisions>

<specifics>
## Specific Ideas

- The Settings page should feel professional but lightweight — you visit it occasionally to configure, not daily
- Prompt cards when collapsed should give you enough info to know which one to expand (type name + version + first line of prompt text)
- The "Regenerate All Prompts" action should feel like a deliberate choice — confirmation dialog making it clear this overwrites custom edits
- Version dropdown should be quick and lightweight — not a full modal, just an inline dropdown you can glance at

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Settings.jsx`: Existing scaffold with 5 glass-card sections, hardcoded values, ComingSoon component — rewrite to live data
- `MetadataPanel.jsx` (Phase 5): Inline edit pattern with Save/Cancel — reuse pattern for config sections
- `ConfirmDialog.jsx`: Centered modal with variants — reuse for regenerate confirmation
- `FilterDropdown.jsx`: Custom dropdown component — could adapt for tab switcher or version dropdown
- `useRealtimeSubscription.js`: Realtime hook for live updates after saves
- `lib/api.js`: `webhookCall()` helper with Bearer token auth — reuse for settings webhooks
- `ComingSoon.jsx`: Currently shown on Settings page — remove when implementing

### Established Patterns
- TanStack Query for data fetching + Supabase Realtime for cache invalidation
- n8n webhook mutations (not direct Supabase writes from dashboard)
- Glass-card sections with icon headers (already in Settings.jsx)
- Inline edit toggle pattern: display mode → click Edit → inputs appear → Save/Cancel (MetadataPanel)

### Integration Points
- New hooks needed: `useProjectSettings(projectId)` for config data, `usePromptConfigs(projectId)` for prompts
- New API helpers: settings update webhook, prompt update webhook, prompt regenerate webhook
- n8n webhook endpoints needed: `/webhook/project/update-settings`, `/webhook/prompts/update`, `/webhook/prompts/regenerate`
- Supabase tables: `projects` (config fields), `prompt_configs` (prompts with versioning)
- Route: existing `/project/:id/settings` — no new route needed

</code_context>

<deferred>
## Deferred Ideas

- Prompt A/B testing (save two versions, run both, compare results) — v2 feature
- Settings import/export (copy config between projects) — v2 feature
- Prompt templates marketplace (share prompts between projects) — v2 feature
- Advanced prompt validation (check for missing variables, syntax errors) — v2 feature

</deferred>

---

*Phase: 06-polish*
*Context gathered: 2026-03-09*
