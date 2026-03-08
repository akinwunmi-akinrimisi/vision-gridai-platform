---
phase: 03-script-generation
plan: 02
subsystem: dashboard
tags: [script-review, gate-2, ui-components, two-column-layout]
dependency_graph:
  requires: [03-01]
  provides: [script-review-page, gate-2-approval, topic-card-script-integration]
  affects: [dashboard-routing, topic-review]
tech_stack:
  added: []
  patterns: [chapter-accordion, inline-scene-edit, prev-next-navigation, mobile-responsive-two-column]
key_files:
  created:
    - dashboard/src/components/script/ChapterAccordion.jsx
    - dashboard/src/components/script/SceneRow.jsx
    - dashboard/src/components/script/SceneEditForm.jsx
    - dashboard/src/components/script/ScriptToolbar.jsx
    - dashboard/src/components/script/ScriptContent.jsx
    - dashboard/src/components/script/ScriptRefinePanel.jsx
  modified:
    - dashboard/src/pages/ScriptReview.jsx
    - dashboard/src/components/topics/TopicCard.jsx
    - dashboard/src/__tests__/ScriptReview.test.jsx
    - dashboard/src/__tests__/routes.test.jsx
decisions:
  - "Scenes sourced from useScenes hook with fallback to topic.script_json.scenes for display"
  - "TopicCard conditionally renders FileText (View Script) link instead of Pencil (Edit) button for approved topics"
  - "Routes test updated with supabase mock and container assertion since ScriptReview no longer has static heading"
metrics:
  duration: 9min
  completed: "2026-03-08T20:00:00Z"
  tasks: 2
  files_created: 6
  files_modified: 4
---

# Phase 3 Plan 02: Script Review Page & Gate 2 Summary

Complete Script Review page with two-column layout (sticky score panel + scrollable chapter accordions), inline scene editing, VS Code-style line numbers, Gate 2 approve/reject/refine flow, and TopicCard integration with script status badges.

## What Was Built

### Task 1: Script Content Components (5 components)
- **ChapterAccordion**: Glass-card accordion with chapter name, word count, scene count, rotating chevron. First chapter expanded by default.
- **SceneRow**: 3-digit zero-padded monospace line numbers, narration text at 1.7 line-height, visual type badges (blue=Image, purple=I2V, amber=T2V), hidden image prompts revealed on hover/click via eye icon.
- **SceneEditForm**: Inline expand below scene with narration textarea, image prompt textarea, visual type dropdown, Regen Prompt button (batch), Save/Cancel. Tracks local state to survive Realtime updates.
- **ScriptToolbar**: Expand/Collapse All, batch "Regen Prompts ({count})" button, search input (client-side filter), pass info badge.
- **ScriptContent**: Container that groups scenes by chapter, manages accordion expanded state, editing state, search filtering, and batch regen scene ID tracking.

### Task 2: ScriptReview Page Rewrite + TopicCard Integration
- **ScriptReview.jsx**: Full rewrite replacing mock scaffold. Uses useScript, useScenes, useTopics hooks. Header bar with back arrow, topic number, SEO title, playlist badge, script status badge, prev/next navigation among approved topics.
- **Three display modes**: (1) Generate Script CTA when approved topic has no script, (2) PassTracker during generation, (3) Two-column layout with script content when script exists.
- **Gate 2 actions**: Approve (direct mutation), Reject (ConfirmDialog with optional feedback textarea), Refine (ScriptRefinePanel SidePanel with instructions + history).
- **Mobile responsive**: Score panel collapses to compact top bar on small screens with inline action buttons.
- **ForcePassBanner** rendered above script content when topic.script_force_passed is true.
- **ScriptRefinePanel**: SidePanel wrapper following RefinePanel pattern. Instructions textarea, refinement history, submit triggers refineScript mutation.
- **TopicCard**: Added script status badges (Generating/Review/Script Approved/Script Rejected). View Script (FileText icon) link replaces Edit button for approved topics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed routes.test.jsx broken by ScriptReview rewrite**
- **Found during:** Task 2
- **Issue:** routes.test.jsx expected `getByRole('heading', { name: 'Script Review' })` but rewritten ScriptReview page no longer has a static heading -- it shows the topic title dynamically.
- **Fix:** Added supabase and webhookCall mocks to routes.test.jsx. Changed assertion to check for `.animate-in` container element confirming the page component rendered.
- **Files modified:** dashboard/src/__tests__/routes.test.jsx
- **Commit:** 4903c81

## Test Results

- 12 ScriptReview tests: all passing
- 16 ScriptActions/ScriptGenerate tests: all passing
- 10 ScorePanel tests: all passing
- 8 routes tests: all passing (including fixed ScriptReview route)
- 13 pre-existing RED stubs from Topic Review tests (02-02 future plan): expected failures

Total: 85 passing / 13 expected RED stubs

## Self-Check: PASSED

All created files verified to exist. All commit hashes verified in git log.
