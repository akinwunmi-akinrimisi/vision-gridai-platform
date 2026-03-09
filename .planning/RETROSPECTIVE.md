# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-09
**Phases:** 6 | **Plans:** 29 | **Commits:** 128

### What Was Built
- React 18 dashboard with 7 pages, PIN auth, dark mode, glassmorphism design system
- Projects Home, Niche Research, Topic Review (Gate 1), Script Review (Gate 2), Production Monitor, Video Review (Gate 3), Analytics, Settings
- TanStack Query + Supabase Realtime data layer across all pages
- n8n webhook API stubs + production workflow JSONs (TTS, images, I2V, T2V, assembly, supervisor, publish, analytics, settings)
- Per-project settings editing and prompt version history editor
- 172-scene DotGrid real-time production tracking

### What Worked
- GSD wave-based parallel execution: 29 plans completed in ~3 hours across 6 phases
- Fresh 200K context per executor agent: zero context rot, each agent self-contained
- Wave 0 TDD pattern: test scaffolds + stubs created first, then GREEN implementations
- Linter auto-enhancement: during Wave 0, linter sometimes enhanced stubs to full implementations, saving Wave 1 work
- Design system persistence: MASTER.md + per-page overrides kept all pages visually consistent
- TanStack Query + Realtime pattern: established once in Phase 1, reused identically in every phase

### What Was Inefficient
- Some SUMMARY.md files lack structured one-liner fields, making automated extraction fail
- Phase 2 and 3 roadmap checkmarks got out of sync with actual completion (disk had all summaries but ROADMAP showed unchecked)
- gsd-tools commit command has recurring pathspec issues when message contains spaces (workaround: manual git add + git commit)
- 11 backend requirements (niche research + topic generation AI workflows) were deferred — dashboard UI is complete but backend orchestration not yet built

### Patterns Established
- EditableSection component with Edit/Save/Cancel toggle (MetadataPanel → ConfigTab)
- Glass-card sections with icon headers for all page layouts
- Single n8n workflow JSON per webhook domain (not per endpoint)
- Production API in separate module (productionApi.js) to match test imports
- Weighted progress formula: audio 20%, images 20%, i2v 15%, t2v 15%, assembly 30%
- Scene status color mapping: gray=pending, blue=audio, cyan=image, purple=video, green=complete, red=failed
- Recharts theme-aware pattern: useTheme isDark drives grid/text/tooltip colors

### Key Lessons
- Start with design system before any UI work — pays off across all phases
- Wave 0 (test scaffolds + stubs) is critical for parallel execution — agents need importable modules
- n8n workflow JSONs can be large (500+ lines) but are manageable as single-domain files
- Dashboard-first approach works: build the UI, stub the webhooks, fill in backend later
- Supabase Realtime + TanStack Query is a powerful pattern — initial query + cache invalidation on changes

### Cost Observations
- Model: Claude Opus 4.6 (quality profile)
- 6 phases executed in ~3 hours total
- Average plan execution: ~7 minutes
- Wave parallelization saved significant time (2-3 agents running concurrently per wave)

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 6 |
| Plans | 29 |
| Duration | ~3 hours |
| Files | 256 |
| LOC | 49,282 |
| Avg plan time | ~7 min |
