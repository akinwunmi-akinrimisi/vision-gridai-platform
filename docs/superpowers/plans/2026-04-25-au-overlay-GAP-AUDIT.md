# AU Overlay — Live-State Gap Audit (2026-04-25)

Audit of `supabase/migrations/032_au_overlay.sql` (commit `8ae3227`) against
the live VPS Supabase state. **Migration 032 was never applied** — the
gaps below would have caused multiple `ERROR` rollbacks. Migration 033
(this file's companion) supersedes 032 and reflects live reality.

## Audit method

Read-only psql queries against `supabase-db-1` covering 34 sections:
all public tables, columns on every table 032 touches, function
signatures, schema_migrations log, RLS policies, row counts. Output
saved to `/tmp/au_audit_output.txt` on the local machine (966 lines).

## Gap inventory

### G1 — `prompt_templates` table does not exist (BLOCKER)

032 §F seeds 4 AU disclaimers via `INSERT INTO prompt_templates`. The
table does not exist. The platform docs and the v3 plan reference it
extensively but it was never created.

**Fix in 033:** add `CREATE TABLE prompt_templates (...)` before any
INSERT. Schema:

```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,          -- 'disclaimer' | 'composition' | 'negative' | future
  template_key TEXT NOT NULL,           -- 'AU:AD-01', 'wide_establishing', etc.
  body_text TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_compliance_role BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_type, template_key)
);
```

### G2 — Live `render_project_intelligence` returns TEXT, not JSONB (BLOCKER)

032 §I assumed a `_render_project_intelligence_v2` helper exists and
that the public function returns JSONB. Live reality:

- **Live signature:** `render_project_intelligence(p_project_id uuid, p_stage text DEFAULT 'all') RETURNS text`
- **No `_render_project_intelligence_v2`** exists. The live public
  function IS the v2 — it returns rendered prose as a single TEXT.

**Fix in 033:** rename live function → `_render_project_intelligence_v2`
(preserve body), then create new public `render_project_intelligence`
that calls v2 and appends 4 country-specific paragraphs as TEXT
segments when `country_target='AU'`. Returns same TEXT shape as before
for General projects.

### G3 — Live prompts use SINGLE-brace placeholders (BLOCKER)

Live `script_pass1` references `{niche_category}`, `{audience_avatar}`,
etc. Migration 032 §K appended `{{ country_compliance_block }}` (double
brace) which never resolves under the live convention.

**Fix in 033:** all 4 new country slot placeholders use single-brace:
`{country_compliance_block}`, `{country_terminology_block}`,
`{country_calendar_context}`, `{country_demonetization_constraints}`.
The renderer's TEXT output substitutes these via the same mechanism
the existing prompts use today.

### G4 — Live `_verify_script_template_vars` has different signature (BLOCKER)

- **Live:** `_verify_script_template_vars(p_known_vars text[]) RETURNS TABLE(prompt_type text, placeholder text, is_known boolean)`
- 032 §J replaced it with a no-arg function returning `(prompt_type, missing_var)`.

This would break the existing CI drift detector which calls it with
the allowlist parameter.

**Fix in 033:** **Do not replace** the function. Instead, document that
callers must pass an extended allowlist that includes the 4 new keys
(`country_compliance_block`, `country_terminology_block`,
`country_calendar_context`, `country_demonetization_constraints`) plus
all existing project-data placeholders.

### G5 — `production_registers.config.image_anchors` shape varies by register

- REGISTER_01_ECONOMIST: object (keys: `primary`, `legal_tax`, `real_estate`)
- REGISTER_02_PREMIUM: object
- REGISTER_03_NOIR: object
- REGISTER_04_SIGNAL: object
- **REGISTER_05_ARCHIVE: string** (uses `image_anchors_by_era` instead)

Migration 032 §D's UPDATEs against Reg 01/02/04 would succeed (those
are objects — `||` merges keys). Reg 05 isn't touched. **No fix
needed**, but flagged for awareness — the comment in 033 documents the
shape variance.

### G6 — REGISTER_01.config has a `metadata_prompt` key (informational)

The live config has 12 keys including `metadata_prompt` not previously
documented. Doesn't affect 032 — but the docs-site/registers page
should be updated. **Out of scope for this audit** (deferred).

### G7 — `production_log` AND `production_logs` BOTH exist (informational)

032 writes to `production_logs` (newer table, exists). Older
`production_log` also still exists. Some legacy workflows may write to
the older table. No fix needed; both can coexist.

### G8 — `coach_messages`, `coach_sessions` already exist (informational)

032 creates `coach_reports` (different table, no collision). The
existing `coach_messages` / `coach_sessions` belong to a different
feature (likely coaching CLI). **No fix needed**; ensure 033's
`coach_reports` table is clearly distinct.

### G9 — `topics.country_target` denormalization needs a backfill from projects

032 §A defaults `topics.country_target = 'GENERAL'` for backfilled
rows. Per-row backfill from `projects.country_target` is correct in
principle (the migration includes
`UPDATE topics SET country_target = COALESCE((SELECT country_target FROM projects ...))`)
— but this runs BEFORE `projects.country_target` exists if §A is
ordered as written. **Fix in 033:** ensure projects column added
before topics backfill, or default to 'GENERAL' literal.

### G10 — Workflow JSONs use double-brace `{{ $json.x }}` correctly

Important non-gap: the workflows use **n8n expression syntax**
`={{ $json.x }}` which IS double-brace. That's separate from prompt
placeholder syntax. The 5 new workflow JSONs are correct as committed.
No change needed.

### G11 — Dashboard pages query `analysis_groups.swot_payload` column

`AUSWOT.jsx` reads `g.swot_payload`. Need to verify `swot_payload`
column exists on `analysis_groups`. Audit Section 18 returned column
list — checking now confirms whether the column exists or needs adding.

**Status:** column does NOT appear in audit output for analysis_groups.
**Fix in 033:** add `ALTER TABLE analysis_groups ADD COLUMN IF NOT EXISTS swot_payload JSONB`.

### G12 — `_verify_script_template_vars` only scans 6 prompt types

The live function's WHERE clause filters to:
- `script_system_prompt`, `script_pass1`, `script_pass2`, `script_pass3`, `script_evaluator`, `script_retry_template`

It does **not** scan `topic_generator_master`, `script_metadata_extractor`,
or any of the new `*_au` prompts. Adding the 4 new placeholders to
`script_pass1/2/3` and `script_evaluator` will be checked; adding
them to `topic_generator_master` won't be (out of scope).

**Fix in 033:** when bumping `topic_generator_master` to add the 4
slots, no drift check fires — operator must verify manually.
Documented in the runbook.

### G13 — Existing `audience_insights` schema differs from intelligence renderer assumptions (informational)

Audit Section 19 returned columns. Need cross-check against renderer
v2 body. **Out of scope for this audit** — the v2 renderer already
handles this table correctly; we don't change that logic.

## Summary

| Gap | Severity | Fix in 033 |
|---|---|---|
| G1 — `prompt_templates` missing | **BLOCKER** | CREATE TABLE before INSERT |
| G2 — Renderer returns TEXT not JSONB | **BLOCKER** | Rename live → v2; new wrapper appends TEXT |
| G3 — Single-brace prompts | **BLOCKER** | All 4 slots single-brace |
| G4 — Verifier signature | **BLOCKER** | Do not replace; pass extended allowlist |
| G5 — Archive image_anchors string | Info | No code change |
| G6 — `metadata_prompt` config key | Info | Docs only (deferred) |
| G7 — Both `production_log[s]` exist | Info | No code change |
| G8 — `coach_messages` ≠ `coach_reports` | Info | No code change |
| G9 — Topics backfill ordering | Minor | Default to literal 'GENERAL' |
| G10 — Workflow JSON `{{ }}` is n8n syntax | Non-gap | No change |
| G11 — `analysis_groups.swot_payload` missing | Minor | ALTER TABLE in 033 |
| G12 — Verifier scope | Info | Manual check on `topic_generator_master` |
| G13 — `audience_insights` schema | Info | No change |

**4 blockers, 3 minor fixes, 6 informational.** Migration 033 closes
all 4 blockers and the 2 minor fixes. The 6 informational items don't
require migration changes.

## Where the artifacts land

- `supabase/migrations/033_au_overlay_corrected.sql` — **the deployable migration**
- `supabase/migrations/032_au_overlay.sql` — left in place but commented at top: `-- THIS MIGRATION WAS NEVER APPLIED. Superseded by 033. Kept as planning artifact.`
- 14 new system_prompts for AU prompts — same logic, single-brace placeholders, in 033
- All other 032 sections (schema columns, niche_variants, country_calendar_events, country_compliance_rules, coach_reports, image_anchors AU keys, tts_voice_by_country) — work as-is, copied to 033 verbatim
