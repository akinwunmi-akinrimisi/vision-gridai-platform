# Migration history

Chronological listing of every file in `supabase/migrations/`. Dates come
from the commit that first added the file (not from any embedded
`-- Applied:` header — those are unreliable). "Status" reflects whether
the migration's schema artifacts are still live or were dropped by a later
migration; superseded migrations remain on disk for history.

For a domain-grouped view of the **current** schema, see the
[schema overview](schema-overview.md). For per-table column lists, see the
[table reference](table-reference.md).

## Chronological table

| # | Date | What it added | Status |
|---|---|---|---|
| 001 | 2026-03-10 | Initial schema: `projects`, `niche_profiles`, `prompt_configs`, `topics`, `avatars`, `scenes`, `production_log`. Seeds the platform's bookkeeping spine. | current |
| 002 | 2026-03-28 | Topic Intelligence: `research_runs`, `research_results`, `research_categories` + initial RLS. | current |
| 003 | 2026-03-28 | Cinematic fields on `scenes`: `color_mood`, `zoom_direction`, `composition_prefix`, `caption_highlight_word`, `transition_to_next`, `b_roll_insert`, `selective_color_element`, `pipeline_stage`. Adds `topics.pipeline_stage`. Backfills existing scenes to `visual_type = 'static_image'`. | current |
| 004 | 2026-03-28 | Calendar + engagement + music + renders + production logs: `scheduled_posts`, `platform_metadata`, `comments`, `music_library`, `renders`, `production_logs`. Plus `projects` auto-pilot + budget columns. | current |
| 005 | 2026-03-30 | **Remotion hybrid rendering** — `scenes.render_method`, `scenes.data_payload`, `remotion_templates` table. | superseded by 009 (kept on disk) |
| 006 | 2026-04-01 | Research enhancements: `research_runs.platforms` + `time_range`, drops `lookback_days`. | current |
| 007 | 2026-04-05 → 2026-04-08 | **Three competing files at the same numeric prefix.** See [the 007 collision](#the-007-collision-three-files-one-number) below. | current (all three apply, in lex order) |
| 008 | 2026-04-06 | **Kinetic Typography Engine** — `projects.production_style`, `kinetic_scenes`, `kinetic_jobs` tables. | superseded by 009 (kept on disk) |
| 009 | 2026-04-15 | **Remove Remotion + Kinetic.** Drops `remotion_templates`, `kinetic_scenes`, `kinetic_jobs`; drops 5 `scenes` columns introduced by 005; drops `projects.production_style`. Pre-conditions: 5 n8n workflows deleted, 1 renamed (`WF_KINETIC_DRIVE_UPLOAD` → `WF_DRIVE_UPLOAD`), VPS services stopped, kinetic engine directory deleted. | current — supersedes 005 + 008 |
| 010 | 2026-04-15 | Intelligence Foundation (Sprint S1): `rpm_benchmarks`, `style_profiles`, plus seed RPM rows. | current |
| 011 | 2026-04-15 | Competitive Intelligence (Sprint S2 — CF04 + CF14): `competitor_channels`, soft-FK to `yt_discovery_results`. | current |
| 012 | 2026-04-15 | CTR + AB testing (Sprint S3 — CF05/CF06/CF17): `ab_tests`, `ab_test_variants`, `ab_test_impressions`. | current |
| 013 | 2026-04-15 | Prediction Engine (Sprint S4 — CF13 + CF12): performance/score prediction tables. | current |
| 014 | 2026-04-15 | Music Preferences (Sprint S5 — CF07): `projects` music-mood columns + Lyria settings. | current |
| 015 | 2026-04-15 | AI Advisory (Sprint S6 — CF08 + CF09): `daily_ideas` + AI Coach surface. | current |
| 016 | 2026-04-15 | Analytics Loop + Niche Health (Sprint S7 — CF10/CF15/CF11): `niche_health_history`, weekly health scoring. | current |
| 017 | 2026-04-15 | Audience Memory Layer (Sprint S8 — CF16, last Intelligence sprint): `audience_insights`, `audience_comments`. | current |
| 018 | 2026-04-16 | Enable RLS on the 7 core tables from migration 001 (which predated the RLS-by-default convention). RLS is enabled but policies were still permissive at this point — locked down by 030. | current — policy bodies superseded by 030 |
| 019 | 2026-04-17 | Hybrid scene pipeline + Cost Calculator: `cost_calculator_snapshots`, hybrid I2V/Ken-Burns scene fields. | current |
| 020 | 2026-04-17 | Channel Analyzer: `channel_analyses`, `channel_comparison_reports`, `discovered_channels`. | current |
| 021 | 2026-04-17 | Niche Viability + Competitor Discovery: `niche_viability_reports`. Sets `projects.niche_viability_score`. | current — column rename retroactively applied by 026 |
| 022 | 2026-04-17 | Analysis Groups — named folders for channel analyses: `analysis_groups`, FK from `channel_analyses`. | current |
| 023 | 2026-04-18 | Production Register (Sprint R1) — first-pass register selection between Cost Calc and scene classification. | current |
| 024 | 2026-04-18 | Production Register specs (Sprint R2 data layer): `production_registers` table with image anchors / TTS rate / music BPM per register. | current |
| 025 | 2026-04-18 | Extends `topics.pipeline_stage` `CHECK` constraint with the register-flow values shipped in session 38. | current |
| 026 | 2026-04-23 | `analysis_groups` self-healing counters: trigger functions `sync_analysis_group_counters` + `sync_analysis_group_viability`, retroactive `entry_difficulty_*` → `entry_ease_*` rename on `niche_viability_reports`, 30-row backfill. | current |
| 027 | 2026-04-23 | Viability assessment progress columns on `analysis_groups`: `viability_phase`, `viability_started_at`, `viability_error`. | current |
| 028 | 2026-04-20 | Centralised Intelligence Renderer (Shape C): PL/pgSQL `render_project_intelligence(project_id, stage)` + CI-enforced coverage check. Replaces 4 ad-hoc renderers in n8n Code nodes. | superseded by 029 (kept on disk) |
| 029 | 2026-04-20 | Intelligence Renderer v2 — zero-drop guarantee. Extends the renderer + coverage check to **9 source tables** (adds `niche_profiles`, `yt_video_analyses`, `research_runs`, `research_categories`, `research_results`, `audience_insights`). Adds `_verify_script_template_vars()` SQL function and `tools/verify_prompt_sync.py` drift detector. | current — supersedes 028 |
| 030 | 2026-04-21 | **Lock down RLS on all VG public tables.** Replaces permissive `FOR ALL USING (true)` with `RESTRICTIVE FOR anon DENY` + `PERMISSIVE FOR service_role`. Closes findings C-1, C-2, C-3 from the 2026-04-21 security audit. | current |
| 031 | 2026-04-21 | Sanitize `scenes.caption_highlight_word`. CHECK constraint blocks shell metacharacters; column was rendered into FFmpeg subtitle filters and was a shell-injection sink. Closes finding H-4. | current |

## Notable history

### The 007 collision (three files, one number)

Three migration files share the `007_` numeric prefix:

| File | Added | What it does |
|---|---|---|
| `007_grand_master_integration.sql` | 2026-04-05 | Grand Master Prompts v3.0 + v1.0 integration |
| `007_seed_system_prompts.sql` | 2026-04-05 | Seeds 8 rows into `system_prompts` (idempotent — `ON CONFLICT DO UPDATE`) |
| `007_seo_metadata_columns.sql` | 2026-04-08 | Adds `topics.yt_description` + `topics.yt_tags` for `WF_VIDEO_METADATA` |

There is no migration runner enforcing strict ordering — the project
applies migrations alphabetically via `psql -f` per file. Postgres
applies all three because:

- They each touch disjoint columns/tables.
- `007_seed_system_prompts.sql` uses `ON CONFLICT DO UPDATE`, so re-running
  is safe.
- `007_seo_metadata_columns.sql` uses `ADD COLUMN IF NOT EXISTS`.

**Resolution order (lex sort):** `007_grand_master_integration` →
`007_seed_system_prompts` → `007_seo_metadata_columns`.

Treat this as a history-of-merges artifact, not a pattern. Future
migrations should not re-use a number; the convention is one strictly
incrementing prefix per migration.

### 005 + 008 superseded by 009 (Remotion + Kinetic removal)

Migrations 005 (Remotion hybrid rendering) and 008 (Kinetic Typography
Engine) added an alternative rendering pipeline alongside the AI
Cinematic flow. Both were rolled back by **migration 009** on
2026-04-15 after the team committed to AI Cinematic as the single
production style.

009's preconditions document the cleanup: 5 n8n workflows deleted, 1
renamed (`WF_KINETIC_DRIVE_UPLOAD` → `WF_DRIVE_UPLOAD`, webhook path
`/kinetic/drive-upload` → `/drive-upload`), VPS service `kinetic-typo`
stopped + removed, Remotion port `:3100` freed, `/opt/kinetic-typo-engine`
deleted (~14 GB freed). 005 and 008 remain on disk as audit history;
they are inert because their schema artifacts have been dropped.

> The header comment in `009_remove_remotion_kinetic.sql` reads
> "Supersedes migrations 005 + 006/008". The `006` reference is a typo —
> migration 006 is unrelated `research_runs` column work. 009 in fact
> supersedes only 005 + 008.

### Post-audit lockdown (030 + 031)

The 2026-04-21 security audit (`docs/SECURITY_AUDIT_2026_04_21.md`) found
that every VG table had permissive `FOR ALL USING (true)` RLS, meaning
the public `anon` JWT could read and write the entire database —
including `social_accounts.access_token` (OAuth secrets). Two follow-up
migrations closed this:

- **030 — Lock down RLS** (2026-04-21). Replaces permissive policies with
  `RESTRICTIVE FOR anon DENY` + `PERMISSIVE FOR service_role` across
  every Vision GridAI public table. Closes findings C-1 (anonymous read
  of all data), C-2 (anonymous write of all data), C-3 (OAuth token
  exposure).
- **031 — Sanitize `caption_highlight_word`** (2026-04-21). Adds a
  `CHECK` constraint that blocks shell metacharacters
  (`` ` $ \ ' " ; & | < > `` and newline). The column was interpolated
  into FFmpeg subtitle-filter strings during caption burn and was a
  shell-injection sink. Closes finding H-4.

After 030, every table-reference card in
[the table reference](table-reference.md) reads `RLS: locked-down`,
meaning "anon denied, service_role permitted." Workflows that read or
write through PostgREST must do so with the service-role key (held only
inside n8n credential storage and the dashboard's server-side proxy).

## What's deliberately not on disk

`yt_discovery_runs`, `yt_discovery_results`, and `yt_video_analyses` are
referenced by migrations 011, 029, and 030, by dashboard hooks
(`useYouTubeDiscovery`), and by workflows (`WF_YOUTUBE_DISCOVERY`,
`WF_YOUTUBE_ANALYZE`) — but no `CREATE TABLE` statement for them exists
in `supabase/migrations/`. They were applied directly against the live
VPS Postgres without being checked in. Treat the live database as the
schema-source-of-truth for those three tables, and capture them into a
future migration before any clean clone.
