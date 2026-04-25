# AU Overlay — Deployment Runbook

**Companion to:** `2026-04-25-au-overlay.md` and `2026-04-25-au-overlay-SWITCH-PATCHES.md`
**Audience:** Operator deploying the AU overlay against the live VPS + n8n + Supabase.
**Estimated total time:** 60–90 minutes for steps 1–7. Step 8 (smoke tests) adds another 30 min. Steps 9–10 (first AU video full pipeline) is hours-to-days based on render time.

---

## 0. Prerequisites

- [ ] SSH key set up: `~/.ssh/id_ed25519_antigravity`
- [ ] Local `git` clean on `main`, all AU overlay commits pushed
- [ ] `dashboard/` builds locally (`npm run build` from `dashboard/` exits 0)
- [ ] Local `psql` client installed (for migration apply)
- [ ] n8n personal access token available as `$N8N_API_KEY` env var
- [ ] Anthropic API key available in n8n credentials (already there, no action)
- [ ] Decision: **hub + 1 spoke (super_au) for v1** — confirmed in conversation

---

## 1. Pre-flight rollback snapshot

**Why:** if any later step goes wrong, this snapshot is the only path back. Don't skip.

```bash
# 1a. Schema dump of impacted tables
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec supabase-db-1 pg_dump -U postgres -d postgres \
    --schema-only \
    --table=projects --table=topics \
    --table=production_registers --table=system_prompts \
    --table=prompt_templates" \
  > /tmp/au_overlay_preflight_$(date +%Y_%m_%d).sql

# 1b. Live data of system_prompts (only is_active rows) — for prompt rollback
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec supabase-db-1 psql -U postgres -d postgres -c \
   \"COPY (SELECT * FROM system_prompts WHERE is_active = true) \
     TO STDOUT WITH CSV HEADER\"" \
  > /tmp/system_prompts_pre_au_$(date +%Y_%m_%d).csv

# 1c. Snapshot of production_registers.config (the JSON we mutate)
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec supabase-db-1 psql -U postgres -d postgres -c \
   \"COPY (SELECT register_id, config FROM production_registers) \
     TO STDOUT WITH CSV HEADER\"" \
  > /tmp/production_registers_pre_au_$(date +%Y_%m_%d).csv
```

Verify file sizes are non-zero:

```bash
ls -la /tmp/au_overlay_preflight_*.sql /tmp/system_prompts_pre_au_*.csv /tmp/production_registers_pre_au_*.csv
```

If any file is empty, **STOP** and investigate before proceeding.

---

## 2. Apply migration 033 (corrected; supersedes 032)

> **Note:** `032_au_overlay.sql` was the original draft but had 4 blockers
> against live state (see `2026-04-25-au-overlay-GAP-AUDIT.md`). The
> deployable migration is `033_au_overlay_corrected.sql`. Always dry-run
> first by swapping the final `COMMIT;` for `ROLLBACK;` and observing
> output before applying for real.

**Why:** schema + tables + seeds + renderer extension + prompt updates, all in one transaction.

```bash
# Apply migration via SSH + docker exec
scp -i ~/.ssh/id_ed25519_antigravity \
  supabase/migrations/033_au_overlay_corrected.sql \
  root@srv1297445.hstgr.cloud:/tmp/

ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker cp /tmp/033_au_overlay_corrected.sql supabase-db-1:/tmp/ \
   && docker exec -i supabase-db-1 psql -U postgres -d postgres \
        -v ON_ERROR_STOP=1 -f /tmp/033_au_overlay_corrected.sql"
```

Expected output: a series of `ALTER`/`CREATE`/`INSERT`/`COMMIT` lines, ending in `COMMIT`. No `ERROR:` lines.

**Verification queries (run as a single SQL block):**

```sql
-- Section A
SELECT column_name FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('country_target','language','channel_type','parent_project_id','cost_ceiling_usd');
-- Expect 5 rows.

SELECT column_name FROM information_schema.columns
WHERE table_name = 'topics'
  AND column_name IN ('country_target','gap_score','required_disclaimers','demonetization_audit_result','compliance_review_status','next_video_directives');
-- Expect 6 rows.

SELECT column_name FROM information_schema.columns
WHERE table_name = 'prompt_templates'
  AND column_name = 'requires_compliance_role';
-- Expect 1 row.

-- Section B
SELECT count(*) FROM niche_variants WHERE country_target = 'AU';                  -- expect 5
SELECT count(*) FROM country_calendar_events WHERE country_target = 'AU';         -- expect ≥6
SELECT count(*) FROM country_compliance_rules WHERE country_target = 'AU';        -- expect 4
SELECT count(*) FROM coach_reports;                                                -- expect 0 (none generated yet)

-- Section C
SELECT register_id, config->'tts_voice_by_country'
FROM production_registers ORDER BY register_id;
-- Expect 5 rows; each tts_voice_by_country has GENERAL + AU keys.

-- Section D
SELECT register_id, jsonb_object_keys(config->'image_anchors') AS keys
FROM production_registers
WHERE register_id IN ('REGISTER_01_ECONOMIST','REGISTER_02_PREMIUM','REGISTER_04_SIGNAL')
ORDER BY register_id, keys;
-- Expect AU keys present (credit_cards_au / super_au / property_mortgage_au / tax_au / etf_investing_au where applicable).

-- Section F
SELECT count(*) FROM prompt_templates
WHERE template_type = 'disclaimer' AND template_key LIKE 'AU:%';
-- Expect 4.

SELECT template_key, requires_compliance_role
FROM prompt_templates
WHERE template_type = 'disclaimer' AND template_key LIKE 'AU:%'
ORDER BY template_key;
-- AD-01, AD-02, AD-04 → true; AD-03 → false.

-- Section K (master prompts updated)
SELECT prompt_type, version
FROM system_prompts
WHERE is_active = true
  AND prompt_type IN ('script_pass1','script_pass2','script_pass3','script_evaluator','topic_generator_master')
ORDER BY prompt_type;
-- All 5 versions should be > 1 (the bumped versions from Section K).

-- Section L (14 AU prompts)
SELECT count(*) FROM system_prompts
WHERE is_active = true AND prompt_type LIKE '%_au';
-- Expect 14 (or 12-14 depending on prior partial seeds; 14 is target).

-- Section I+J — renderer + verifier function exist
SELECT proname FROM pg_proc WHERE proname IN ('render_project_intelligence','_verify_script_template_vars');
-- Expect 2 rows.

-- Smoke: drift detector returns zero missing variables
SELECT * FROM _verify_script_template_vars();
-- Expect 0 rows.
```

If ANY check fails, **ROLLBACK** before proceeding (see §11).

---

## 3. Import 5 new workflow JSONs into n8n

**Why:** n8n needs the workflow definitions as DB rows.

```bash
# For each new workflow:
for WF in WF_COUNTRY_ROUTER WF_TOPIC_INTELLIGENCE WF_DEMONETIZATION_AUDIT WF_COACH_REPORT WF_COMPETITOR_ANALYZER; do
  curl -X POST https://n8n.srv1297445.hstgr.cloud/api/v1/workflows \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary @workflows/${WF}.json
  echo ""
  echo "→ ${WF} imported. Capture the returned id field."
done
```

Capture each returned `id` and store in `MEMORY.md` "Production Workflow IDs" section.

**Activate each via UI** (the API doesn't always honor `active=true` on import):

```bash
# n8n UI → Workflows → toggle each new workflow's "Active" switch.
```

Then set the `WF_COUNTRY_ROUTER_ID` env var in `/docker/n8n/docker-compose.override.yml`:

```yaml
environment:
  - WF_COUNTRY_ROUTER_ID=<the_id_from_step_3>
  # ... other existing env vars unchanged
```

Restart n8n: `docker compose -f /docker/n8n/docker-compose.override.yml up -d` (this is a 30-second restart).

---

## 4. Apply 6 Switch-node patches to existing workflows

Per `2026-04-25-au-overlay-SWITCH-PATCHES.md`. Each patch is a single Execute Workflow node insertion + one parameter swap. Estimated 5–10 min per workflow.

**Order:**

1. `WF_TOPICS_GENERATE`
2. `WF_SCRIPT_PASS`
3. `WF_REGISTER_ANALYZE`
4. `WF_VIDEO_METADATA`
5. `WF_THUMBNAIL_GENERATE`
6. `WF_ANALYTICS_CRON`

After each: trigger a manual test run via webhook for an existing General project. Verify the workflow's execution log shows the Resolve Prompt node firing and the prompt text being threaded through. Confirm output unchanged for General projects.

---

## 5. Deploy dashboard build

```bash
cd dashboard
npm run build
scp -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/
```

Verify: open `https://dashboard.operscale.cloud/` in a fresh-private-window browser. The Sidebar shows the **General / Australia** toggle. Click `Australia` → routes update, AU-only nav items appear (`AU Compliance Inbox` at top, `AU Calendar` / `AU SWOT` / `AU Coach Reports` under Project nav once a project is selected).

---

## 6. Run AU competitor seed via `WF_DISCOVER_COMPETITORS`

**Why:** ground-truth competitor data for `swot_channel_au` + `swot_subniche_au`. Reuses the existing discovery workflow (no new code).

For each AU sub-niche, fire the discovery webhook:

```bash
# AU hub project must already exist (create via dashboard CreateProjectModal first)
# Capture the hub UUID:
HUB_ID=$(curl -s "https://supabase.operscale.cloud/rest/v1/projects?country_target=eq.AU&channel_type=eq.hub&select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0].id')

# Per sub-niche, post to the existing discovery webhook:
for SN in credit_cards_au super_au property_mortgage_au tax_au etf_investing_au; do
  curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/discover-competitors \
    -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"project_id\":\"$HUB_ID\",\"sub_niche\":\"$SN\",\"limit\":4}"
  echo ""
  echo "→ Discovery fired for $SN"
done
```

Each fires `WF_DISCOVER_COMPETITORS` → `WF_CHANNEL_ANALYZE` for each found channel → writes `discovered_channels` + `channel_analyses` rows. ~5 min per sub-niche due to YouTube API quota.

---

## 7. First end-to-end smoke run

### 7.1 Create the AU hub project via dashboard

1. Open `https://dashboard.operscale.cloud/`
2. Click **Australia** tab in Sidebar
3. Click **+ New Project**
4. Niche: `Australian Personal Finance`
5. Description: `CardMath Australia — five sub-niches`
6. AU configuration:
   - Channel type: `hub`
   - Cost ceiling: `8`
   - Sub-niches: all 5 checked
7. Click **Start Research**

Watch ProjectsHome for the new project. Should appear under the AU tab only.

### 7.2 Run topic discovery once

```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/topic-intelligence/run \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -d "{\"project_id\":\"$HUB_ID\"}"
```

Wait ~30 seconds, then:

```sql
SELECT topic_number, niche_variant, gap_score, country_target, review_status
FROM topics
WHERE project_id = '$HUB_ID'
ORDER BY gap_score DESC NULLS LAST;
```

Expect 5 rows with `country_target='AU'`, distinct `niche_variant` values, `gap_score` populated, `review_status='pending'`.

### 7.3 Approve top topic, run script generation

In the dashboard:
1. Navigate to AU project → **Topics**
2. Approve the top-scored topic
3. Wait for `WF_SCRIPT_GENERATE` to run (~3–5 min for a 3-pass script)

Verify:

```sql
SELECT id, niche_variant, country_target,
       jsonb_array_length(script_json->'scenes') AS scenes,
       script_quality_score
FROM topics
WHERE project_id = '$HUB_ID' AND status = 'script_completed'
ORDER BY updated_at DESC LIMIT 1;
```

Expect: `scenes` ≈ 140-180, `script_quality_score` ≥ 7.0.

Inspect the script for AU disclaimers:

```sql
SELECT (script_json->'scenes'->scene_idx)->>'narration' AS scene_text
FROM topics, generate_subscripts(script_json->'scenes', 1) AS scene_idx
WHERE id = '<topic_id>'
  AND ((script_json->'scenes'->scene_idx)->>'is_disclaimer_scene')::boolean = true;
```

Expect: at least 1 scene with `is_disclaimer_scene=true`, narration matching `AD-01` or `AD-04` body text.

### 7.4 Approve script at Gate 2, run shared production

Approve the script in the dashboard. Production chain fires automatically (`WF_SCENE_CLASSIFY` → `WF_TTS_AUDIO` → `WF_IMAGE_GENERATION` → `WF_KEN_BURNS` → `WF_CAPTIONS_ASSEMBLY` → `WF_VIDEO_METADATA` + `WF_THUMBNAIL_GENERATE`).

Watch the Production Monitor page. ~30–45 min for full assembly.

Verify TTS used the AU voice:

```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec n8n-n8n-1 sh -c \
    \"sqlite3 /home/node/.n8n/database.sqlite \
      'SELECT data FROM execution_entity \
       WHERE workflowId = (SELECT id FROM workflow_entity WHERE name = \\\"WF_TTS_AUDIO\\\") \
       ORDER BY startedAt DESC LIMIT 1' | grep -o 'en-AU-Studio-N\\|en-AU-Studio-O' | head -1\""
```

Expect output: `en-AU-Studio-N` (Reg 01 default) or `en-AU-Studio-O` (Reg 02 if topic landed there).

### 7.5 Trigger demonetization audit at Gate 3

```bash
TOPIC_ID="<finished_topic_id>"
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/demonetization/audit \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -d "{\"topic_id\":\"$TOPIC_ID\"}"
```

Expect `{"decision":"clear",...}` or `{"decision":"manual_review_required",...}`. Verify:

```sql
SELECT id, compliance_review_status, demonetization_audit_result->>'overall_decision' AS decision
FROM topics WHERE id = '$TOPIC_ID';
```

If `manual_review_required`, navigate dashboard → **AU Compliance Inbox** to confirm the topic appears.

### 7.6 Verify zero impact on General path

Run a full pipeline for an existing General project (any project with `country_target='GENERAL'`). Verify:

- Topic generation produces 25 topics, no AU disclaimers in scripts
- TTS uses the original `en-US-Studio-M` voice (the `tts_voice` string column unchanged)
- Image generation references General `image_anchors` keys (not AU keys)
- `compliance_review_status = 'not_required'` (default — never flips for General)
- Output file size and quality identical to pre-overlay shipped General videos

If General output drift is observed, **ROLLBACK** (see §11).

---

## 8. Schedule the new crons

After workflows are imported and verified:

| Workflow | Cron | What it does |
|---|---|---|
| `WF_TOPIC_INTELLIGENCE` | `0 19 * * *` UTC | Daily AU topic discovery (= 05:00 AEST) |
| `WF_COACH_REPORT` | `0 6 1 * *` UTC | Monthly coach report on 1st |
| `WF_COMPETITOR_ANALYZER` | `0 2 * * 0` UTC | Weekly Sunday SWOT synthesis |

These are baked into the workflow JSONs as `scheduleTrigger` nodes. Activating the workflows enables the crons.

---

## 9. Operator handoff checklist

After all 8 steps:

- [ ] Migration 033 applied (032 superseded) — verification queries pass
- [ ] 5 new workflows imported + activated; IDs added to `MEMORY.md`
- [ ] 6 Switch-node patches applied to existing workflows; smoke-tested
- [ ] Dashboard rebuilt + deployed; `/au/*` routes load
- [ ] AU hub project created; competitor seed runs complete
- [ ] First AU topic generated, script generated, full pipeline run, demonetization audit run
- [ ] General project verified unaffected
- [ ] AU video published (as `unlisted`)
- [ ] `MEMORY.md` updated with deploy date + AU hub project_id

---

## 10. First 30 days monitoring

| Day | What to check |
|---|---|
| 1–7 | Daily topic discovery delivers 5 candidates per day; gap_score distribution looks reasonable |
| 7 | Run retention analyzer for first published AU video; verify `next_video_directives` populated |
| 14 | Compare CPM on AU video vs benchmark (Strategy §1: $36.21 average AU CPM expected) |
| 30 | First coach report runs (1st of next month); review directives |
| 30+ | Review hub-only data; decide whether to launch the super_au spoke per Strategy §10.1 staged approach |

---

## 11. Rollback procedure

### 11.1 Migration rollback

```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec -i supabase-db-1 psql -U postgres -d postgres -c 'BEGIN; \
   DROP FUNCTION IF EXISTS render_project_intelligence(UUID, TEXT); \
   DROP FUNCTION IF EXISTS _verify_script_template_vars(); \
   DROP TABLE IF EXISTS coach_reports CASCADE; \
   DROP TABLE IF EXISTS country_compliance_rules CASCADE; \
   DROP TABLE IF EXISTS country_calendar_events CASCADE; \
   DROP TABLE IF EXISTS niche_variants CASCADE; \
   ALTER TABLE projects DROP COLUMN IF EXISTS country_target, DROP COLUMN IF EXISTS language, DROP COLUMN IF EXISTS channel_type, DROP COLUMN IF EXISTS parent_project_id, DROP COLUMN IF EXISTS cost_ceiling_usd; \
   ALTER TABLE topics DROP COLUMN IF EXISTS country_target, DROP COLUMN IF EXISTS gap_score, DROP COLUMN IF EXISTS gap_score_modifiers, DROP COLUMN IF EXISTS required_disclaimers, DROP COLUMN IF EXISTS demonetization_audit_result, DROP COLUMN IF EXISTS compliance_review_status, DROP COLUMN IF EXISTS next_video_directives; \
   ALTER TABLE prompt_templates DROP COLUMN IF EXISTS requires_compliance_role; \
   COMMIT;'"
```

Then restore production_registers.config and system_prompts from the preflight snapshot:

```bash
# system_prompts (restore is_active flags + bodies):
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec -i supabase-db-1 psql -U postgres -d postgres -c \
   'TRUNCATE system_prompts; \
    \\COPY system_prompts FROM /tmp/system_prompts_pre_au_<DATE>.csv CSV HEADER;'"
```

### 11.2 Workflow rollback

For each new workflow imported:

```bash
curl -X DELETE https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/<id> \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

For each Switch-node patched workflow: revert via n8n UI by exporting + importing the prior workflow JSON, OR by manually deleting the inserted Execute Workflow node + reverting the Anthropic node's `system` parameter.

### 11.3 Dashboard rollback

`git checkout` the prior commit, rebuild, redeploy.

---

## 12. Known limitations / out of scope

- **No A/B thumbnail picker UI** in v1 (Feature N4). AU launches with single-variant thumbnails. AB infrastructure (`ab_tests`, `WF_AB_TEST_ROTATE`) exists; the picker is a Phase 2 dashboard task.
- **No event-trigger automation** for RBA / Budget / HECS announcements. Cron-only at v1; webhook-driven event publishing is Phase 2.
- **No spoke project at launch.** Hub-only for v1 per Strategy §10.1. Spoke (CardMath_AU_Super) launches once hub clears 30 days of CPM signal.
- **No compliance role system.** F2 deferred — `requires_compliance_role` boolean + "Type CONFIRM" modal is the v1 gate.
- **No Vertex AI Lyria voice cloning** for AU register variations. Standard Google Cloud TTS Studio + Chirp 3 HD voices used.

---

**Document version:** v1
**Prepared:** 2026-04-25
**Next:** monitor for 30 days; if metrics support it, launch CardMath_AU_Super spoke per Strategy §10.1
