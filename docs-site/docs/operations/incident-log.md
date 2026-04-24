# Incident log

Reverse-chronological pointer index to per-session memory files. Each
entry is the 30-second answer to "when did we last touch X." For full
detail, follow the link to the corresponding `MEMORY.md` topic file or
session note.

The detail lives in the memory tree at
`~/.claude/projects/C--Users-DELL-Documents-Antigravity-vision-gridai-platform/memory/`
on the local machine. The pointers below name the file; the canonical
record is whatever's there at lookup time.

## 2026-04 — Security audit + intelligence renderer + lint enforcement

### 2026-04-23 — Post-rotation cleanup audit (Session 38 part 8)
- **Headline:** 22 structural fixes across 16 workflows after the JWT rotation. 17 stale `httpHeaderAuth` / `supabaseApi` credentials still firing pre-rotation values; 2 workflows (`WF_PROJECT_CREATE`, `WF_SCRIPT_APPROVE`) had `HTTP → Execute Workflow` chains that lost `project_id` between steps.
- **Root cause:** rotation procedure missed enumerating `credentials_entity` for inline JWTs.
- **Fix:** sqlite enumerate → `n8n export:credentials --decrypted` → jq patch → `n8n import:credentials`.
- **Reference:** `session_38_full_scoring_audit.md`.

### 2026-04-23 — n8n workflow linter (Session 38 part 9)
- **Headline:** `tools/lint_n8n_workflows.py` enforces `CRED-01` + `CHAIN-01` (errors) + `AUTH-01` (warning). 146 workflows scanned, 0 errors, 32 advisory warnings.
- **Reference:** `session_38_lint_tool.md`.

### 2026-04-21 — Security audit (CRITICAL)
- **Headline:** 14 findings in `docs/SECURITY_AUDIT_2026_04_21.md`. **3 Critical**: every VG table had permissive `FOR ALL USING (true)` RLS — anon could read + write everything (incl. `social_accounts.access_token`).
- **Fix:** Migration 030 (RLS lockdown) + 031 (caption_highlight_word shell-injection mitigation). JWT secret + ANON + SERVICE_ROLE rotated.
- **Reference:** `session_38_security_audit.md`.

### 2026-04-21 — JWT chain rotation
- **Headline:** Rotated JWT secret + ANON + SERVICE_ROLE; new exp = 2027-04-21 (was year-2099, finding H-1).
- **Fix:** propagated to `/docker/supabase/.env`, n8n `docker-compose.override.yml`, `_realtime.tenants.jwt_secret` (BOTH tenants), Kong consumers (`kong.yml` + `kong reload`), dashboard `.env` rebuild.
- **Reference:** `MEMORY.md` "Auth (ROTATED AGAIN 2026-04-21 …)".

### 2026-04-20 — Intelligence Renderer v2 (Session 38 part 6)
- **Headline:** Migration 029 extends the renderer + coverage check to **9 source tables**. Adds `_verify_script_template_vars()` SQL function and `tools/verify_prompt_sync.py` drift detector. Zero-drop guarantee for prompt assembly.
- **Reference:** `session_38_intel_v2_zero_drop.md`.

### 2026-04-20 — Intelligence Renderer rollout (Session 38 part 5)
- **Headline:** All 4 consumers patched to use the migration 028 `render_project_intelligence` RPC. `WF_VIDEO_METADATA` coverage went from ~5% to 100% of intelligence sources.
- **Reference:** `session_38_intel_renderer_rollout_complete.md`.

### 2026-04-20 — Scoring trigger chain fix (Session 38 part 7)
- **Headline:** Two-fix sequence: (1) credential type swap on `WF_OUTLIER_SCORE` + `WF_SEO_SCORE` from `DASHBOARD_API_TOKEN` → `Authorization`; (2) inserted `Prep Scoring Input` Set node to re-attach `project_id` after `Prefer: return=minimal` blanked it.
- **Reference:** `session_38_scoring_trigger_fix.md`.

### 2026-04-20 — Discovery off-niche fix + counter drift (Session 38 part 2)
- **Headline:** `WF_DISCOVER_COMPETITORS` rewritten with niche-keyword overlap scoring (60%) + cleaned queries. Migration 026 triggers self-heal `analysis_groups` counter columns.
- **Reference:** `session_38_latent_discovery_fix.md`.

### 2026-04-20 — Viability PGRST204 fix + info-loss audit (Session 38)
- **Headline:** `entry_difficulty_*` → `entry_ease_*` rename was only half-applied; `WF_NICHE_VIABILITY` "Write Report" node had been silently failing. Fixed + dropped sponsorship_reasoning + audience_size_reasoning recovered.
- **Reference:** `session_38_viability_column_rename_bug.md`.

### 2026-04-19 — Viability rerun + Topic Gen Cancel (Session 37)
- **Headline:** Both shipped. Latent: `WF_TOPICS_GENERATE` "Trigger WF_OUTLIER_SCORE" was getting empty `project_id` (later closed in Session 38).
- **Reference:** `session_37_cancel_topic_gen.md`.

### 2026-04-18/19 — Register Prompt Library v3 + full validation (Session 36)
- **Headline:** All 3 phases shipped + ~220 assertions in unit/integration/smoke/E2E. 4 bugs fixed (ISSUE-001..004). Webhook auth gap closed — all webhooks now Bearer-authenticated.
- **Reference:** `session_36_register_v3_full_validation.md`.

## 2026-04 — Pipeline hardening + caption burn

### 2026-04-10 — Assembly truncation fix + VPS cleanup (Session 35)
- **Headline:** "Brain Waves" 175-scene video missing last 12 scenes. Mixed 25fps/48kHz vs 30fps/24kHz; `-c copy` concat silently truncated.
- **Fix:** re-encoded outliers → re-concat → re-normalize → re-burn. 3-layer crash prevention added to `WF_CAPTIONS_ASSEMBLY` to catch the same class of bug.
- **Cleanup:** disk 65% → 39%; nginx disabled (Traefik conflict); code-executor restarted.
- **Reference:** `session-35-assembly-truncation.md` (and assembly hardening notes).

### 2026-04-08/09 — Caption burn host service + script preservation + thumbnails (Session 34)
- **Headline:** Caption burn moved to host-side systemd service `:9998`. Script segmentation now mechanical sentence-split (100% preservation); Claude only adds image prompts. Thumbnails locked to photorealistic.
- **Reference:** `session-34-caption-burn-script-fix.md`.

### 2026-04-08 — SEO metadata + multi-style thumbnails + branding (Session 33)
- **Headline:** `WF_VIDEO_METADATA` (10 nodes, 3-5K description), `WF_THUMBNAIL_GENERATE` (10 nodes, 3 styles, niche emotions, Montserrat). Migration 007_seo_metadata_columns.
- **Channel:** "Unsworn Testimony" — banner + profile pic in `channel_art/`.
- **Reference:** `session-33-seo-thumbnails.md`.

### 2026-04-07/08 — Pipeline fixes + caption burn (Session 32)
- **Headline:** 15 issues across niche consolidation, Production Monitor detection, caption burn (chunked SRT, FFmpeg via docker exec), router project_id forwarding.
- **Reference:** `session-32-fixes.md`.

## 2026-03 — Frontend overhaul + dashboard hardening

### 2026-03-15 — Assembly fix + Dashboard hardening (Session 26)
- **Headline:** I2V/T2V scenes missing `-map 0:v -map 1:a`, causing AI-generated audio over TTS. Concat changed to re-encode audio (non-monotonic DTS fix). Added webhook timeout + error toasts to dashboard.
- **Reference:** `session-26-assembly-fix.md` (or topic file if separately captured).

### Sessions 23-24 — Dashboard UI/UX overhaul
- **Headline:** Phase A+B (design foundation + core pages) + Phase C (component polish + 6 remaining pages). All 9 pages now use the design system consistently.
- **Reference:** `session-23-ui-overhaul.md`.

### Session 25 — TopicDetail page + security rotation
- **Headline:** TopicDetail at `/project/:id/topics/:topicId` (vertical pipeline roadmap, scene drill-down). GitGuardian flagged 5 leaked secrets — rotated, removed from git.
- **Reference:** `session_25.md` or `MEMORY.md` "Session 25" section.

## How to use this log

- **"When did we last touch X?"** Ctrl-F for X here.
- **"What broke last week?"** Scan top entries.
- **"What's the procedure to rotate JWTs?"** See [auth-secrets](../infrastructure/auth-secrets.md) — but the *why* is in the 2026-04-21 entries above.
- **"Why does the linter exist?"** See the 2026-04-23 entries.

When closing an incident, **append a new entry to the top** with date,
headline, root cause (one line), fix (one line), and reference. Detail
goes in the topic file, not here. The aim is 30-second discoverability,
not full incident reports.
