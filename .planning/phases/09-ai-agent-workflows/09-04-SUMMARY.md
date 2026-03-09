---
phase: 09-ai-agent-workflows
plan: "04"
subsystem: dashboard-topic-review
tags:
  - dashboard
  - inline-edit
  - topic-review
  - tdd
dependency_graph:
  requires:
    - 09-03  # WF_TOPICS_ACTION edit_avatar route must exist for save to work
  provides:
    - DASH-01  # Inline topic editing complete
  affects:
    - dashboard/src/components/topics/TopicCard.jsx
    - dashboard/src/hooks/useTopics.js
    - dashboard/src/hooks/useProjects.js
    - dashboard/src/components/projects/ProjectCard.jsx
    - dashboard/src/pages/TopicReview.jsx
    - dashboard/src/pages/NicheResearch.jsx
tech_stack:
  added: []
  patterns:
    - "isEditing local state for inline card edit mode"
    - "Promise.all for parallel webhook calls (edit + edit_avatar)"
    - "ConfirmDialog for topics_exist guard before additive generation"
    - "stopPropagation on NavLink-embedded action buttons"
key_files:
  created: []
  modified:
    - dashboard/src/components/topics/TopicCard.jsx
    - dashboard/src/hooks/useTopics.js
    - dashboard/src/hooks/useProjects.js
    - dashboard/src/components/projects/ProjectCard.jsx
    - dashboard/src/pages/TopicReview.jsx
    - dashboard/src/pages/NicheResearch.jsx
    - dashboard/src/pages/ProjectsHome.jsx
    - dashboard/src/__tests__/TopicActions.test.jsx
    - dashboard/src/__tests__/TopicReview.test.jsx
    - dashboard/src/__tests__/ProjectsHome.test.jsx
decisions:
  - "useEditTopic webhook path corrected from 'topics/edit' (non-existent) to 'topics/action' with action='edit'"
  - "Edit mode stays inline in TopicCard (not SidePanel) per locked CONTEXT.md decision"
  - "Both edit and edit_avatar calls include project_id for production_log non-null constraint"
  - "TopicBulkActions.test.jsx RED stubs are pre-existing (from plan 02-02) — out of scope"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_modified: 10
---

# Phase 9 Plan 04: Dashboard Inline Edit + Retry + Topics Exist Confirm Summary

DASH-01 implemented: TopicCard inline edit mode with controlled inputs for 3 topic fields and 10 avatar fields; useEditTopic webhook path bug fixed (topics/edit → topics/action); useEditAvatar hook added; useRetryResearch hook added with retry button on ProjectCard for research_failed; EditPanel SidePanel removed from TopicReview; topics_exist confirm dialog added to NicheResearch with force=true re-send; deployed to VPS.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TDD RED — write failing test assertions | cc15c4b | TopicActions.test, TopicReview.test, ProjectsHome.test |
| 2 | Implement inline edit, retry button, topics_exist dialog | 2c3a074 | TopicCard, useTopics, useProjects, ProjectCard, TopicReview, NicheResearch, ProjectsHome |

## What Was Built

### A. TopicCard.jsx — Inline Edit Mode
- Added `isEditing`, `isSaving`, `editTopicFields`, `editAvatarFields` state
- Pencil button click initializes all field values from current topic/avatar data and sets `isEditing=true`; card auto-expands
- In edit mode, expanded section shows `<input>` for `seo_title` and `<textarea>` for `narrative_hook` and `key_segments`, plus 10 avatar `<input>` fields in a 2-column grid
- Save button calls `onSave` and `onSaveAvatar` in parallel via `Promise.all`, both including `project_id` for production_log
- Cancel button exits edit mode without saving, no API calls made
- All inputs have `data-testid` attributes (`edit-seo-title`, `edit-narrative-hook`, `edit-key-segments`, `edit-save`, `edit-cancel`, `edit-avatar-{key}`)
- Header click is blocked while editing to prevent accidental collapse

### B. useTopics.js — Webhook Path Fix + useEditAvatar
- **Bug fixed:** `useEditTopic` called `webhookCall('topics/edit', ...)` — this route does not exist in WF_TOPICS_ACTION. Fixed to `webhookCall('topics/action', { action: 'edit', topic_id, project_id, fields })`
- **New hook:** `useEditAvatar` — calls `webhookCall('topics/action', { action: 'edit_avatar', topic_id, project_id, fields })`, invalidates `['topics', projectId]` on settled

### C. useProjects.js — useRetryResearch
- **New hook:** `useRetryResearch` — calls `webhookCall('project/create', { project_id })`, invalidates `['projects']` on settled
- Re-uses the same WF_WEBHOOK_PROJECT_CREATE webhook path; WF_PROJECT_CREATE handles existing project_id (idempotency)

### D. ProjectCard.jsx — Retry Button
- Added `onRetry` prop to component signature
- When `status === 'research_failed'` and `onRetry` provided: renders "Retry Research" button with `RotateCcw` icon and amber styling
- Button uses `e.preventDefault()` + `e.stopPropagation()` to prevent the parent `NavLink` from navigating
- `data-testid="retry-research-{id}"` for test selection

### E. ProjectsHome.jsx — Wire onRetry
- Imports `useRetryResearch` alongside `useProjects`
- `retryResearchMutation = useRetryResearch()` instantiated
- `onRetry={retryResearchMutation.mutate}` passed to each `ProjectCard`

### F. TopicReview.jsx — Remove EditPanel SidePanel
- Removed `EditPanel` import
- Added `useEditAvatar` import alongside existing hooks
- `handleEdit` converted to no-op (TopicCard handles edit internally)
- Removed `handleEditSubmit` function (no longer needed)
- Removed `<EditPanel ...>` from render tree (only `<RefinePanel>` remains for the refine SidePanel)
- Each `TopicCard` now receives `onSave={(vars) => editMutation.mutateAsync(vars)}` and `onSaveAvatar={(vars) => editAvatarMutation.mutateAsync(vars)}`

### G. NicheResearch.jsx — topics_exist Confirm Dialog
- Added `topicsExistCount` and `generateMoreOpen` state
- `handleGenerateTopics` captures response: if `result?.topics_exist === true`, sets count and opens dialog instead of navigating
- `handleConfirmGenerateMore` re-sends with `force: true` then navigates to `/topics`
- Second `<ConfirmDialog>` added below existing re-research dialog

## Tests

All 19 tests in the 3 target files pass GREEN:
- `TopicActions.test.jsx`: 7 tests (approve, reject, refine, edit enters mode, cancel, save, shows buttons)
- `TopicReview.test.jsx`: 6 tests (header, filter dropdown, skeleton, summary bar, no SidePanel, topics_exist stable)
- `ProjectsHome.test.jsx`: 6 tests (4 pre-existing + 2 new: retry button visible, retry calls mutation)

Pre-existing out-of-scope RED stubs: `TopicBulkActions.test.jsx` (4 tests marked "implement in plan 02-02") — not caused by this plan.

## Deviations from Plan

### Auto-fixed Issues

None beyond scope adjustments.

### Out-of-scope Discoveries (deferred)

**TopicBulkActions.test.jsx** — 4 pre-existing `expect(true).toBe(false)` RED stubs from plan 02-02. Not caused by this plan. Logged here only.

## Deployment

Dashboard built (`npm run build` — 56s, zero errors) and deployed to VPS via `scp -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/`. Assets verified at `/opt/dashboard/assets/`.

## Self-Check: PASSED

All files verified present. Both task commits verified in git history (cc15c4b, 2c3a074).
