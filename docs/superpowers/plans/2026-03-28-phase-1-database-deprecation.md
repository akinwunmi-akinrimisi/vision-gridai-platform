# Phase 1: Database + Deprecation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy all new Supabase tables to VPS, add cinematic fields to scenes, deactivate I2V/T2V workflows, and establish a clean foundation for all subsequent phases.

**Architecture:** SSH into VPS to run 3 SQL migrations against the remote Supabase PostgreSQL. Deactivate 4 n8n workflows via the n8n REST API. Update existing scene data for backwards compatibility. All operations are non-destructive (IF NOT EXISTS, ALTER ADD IF NOT EXISTS).

**Tech Stack:** Supabase PostgreSQL (remote via SSH + docker exec), n8n REST API, bash

**VPS:** `root@srv1297445.hstgr.cloud` (SSH key: `~/.ssh/vps_gridai`)
**Supabase container:** `supabase-db-1` (PostgreSQL)
**n8n URL:** `https://n8n.srv1297445.hstgr.cloud`
**n8n API Key:** stored in `.env` as `N8N_API_KEY`

---

### Task 1: Deploy migration 002 — Research Tables

**Files:**
- Reference: `supabase/migrations/002_research_tables.sql`

- [ ] **Step 1: Copy migration to VPS**

```bash
scp -i ~/.ssh/vps_gridai supabase/migrations/002_research_tables.sql root@srv1297445.hstgr.cloud:/tmp/002_research_tables.sql
```

- [ ] **Step 2: Run migration on VPS**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec -i supabase-db-1 psql -U postgres -f /dev/stdin < /tmp/002_research_tables.sql"
```

If `supabase-db-1` doesn't work, try `supabase-db`:
```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec -i supabase-db psql -U postgres -f /dev/stdin < /tmp/002_research_tables.sql"
```

- [ ] **Step 3: Verify tables exist**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec supabase-db-1 psql -U postgres -c \"SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'research%' ORDER BY tablename;\""
```

Expected output:
```
     tablename
--------------------
 research_categories
 research_results
 research_runs
```

- [ ] **Step 4: Verify via Supabase REST API**

```bash
source .env
curl -s -o /dev/null -w "%{http_code}" "https://supabase.operscale.cloud/rest/v1/research_runs?select=id&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: `200` (empty array is fine, just needs to not 404)

- [ ] **Step 5: Commit verification log**

No code changes — just note in commit that migration was deployed.

```bash
git commit --allow-empty -m "ops: deploy 002_research_tables.sql to VPS Supabase"
```

---

### Task 2: Deploy migration 003 — Cinematic Fields

**Files:**
- Reference: `supabase/migrations/003_cinematic_fields.sql`

- [ ] **Step 1: Copy migration to VPS**

```bash
scp -i ~/.ssh/vps_gridai supabase/migrations/003_cinematic_fields.sql root@srv1297445.hstgr.cloud:/tmp/003_cinematic_fields.sql
```

- [ ] **Step 2: Run migration on VPS**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec -i supabase-db-1 psql -U postgres -f /dev/stdin < /tmp/003_cinematic_fields.sql"
```

- [ ] **Step 3: Verify cinematic fields on scenes table**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec supabase-db-1 psql -U postgres -c \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='scenes' AND column_name IN ('color_mood','zoom_direction','caption_highlight_word','transition_to_next','b_roll_insert','composition_prefix','selective_color_element','pipeline_stage') ORDER BY column_name;\""
```

Expected: 8 rows, all with correct defaults (color_mood='full_natural', zoom_direction='in', transition_to_next='crossfade', pipeline_stage='pending').

- [ ] **Step 4: Verify pipeline_stage on topics table**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec supabase-db-1 psql -U postgres -c \"SELECT column_name FROM information_schema.columns WHERE table_name='topics' AND column_name='pipeline_stage';\""
```

Expected: 1 row.

- [ ] **Step 5: Verify all existing scenes set to static_image**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec supabase-db-1 psql -U postgres -c \"SELECT visual_type, COUNT(*) FROM scenes GROUP BY visual_type;\""
```

Expected: All rows should show `static_image`. No `i2v` or `t2v` values remaining.

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "ops: deploy 003_cinematic_fields.sql — scenes + topics cinematic columns"
```

---

### Task 3: Deploy migration 004 — Calendar, Engagement, Music, Renders, Logs

**Files:**
- Reference: `supabase/migrations/004_calendar_engagement_music.sql`

- [ ] **Step 1: Copy migration to VPS**

```bash
scp -i ~/.ssh/vps_gridai supabase/migrations/004_calendar_engagement_music.sql root@srv1297445.hstgr.cloud:/tmp/004_calendar_engagement_music.sql
```

- [ ] **Step 2: Run migration on VPS**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec -i supabase-db-1 psql -U postgres -f /dev/stdin < /tmp/004_calendar_engagement_music.sql"
```

- [ ] **Step 3: Verify all 6 new tables**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec supabase-db-1 psql -U postgres -c \"SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('scheduled_posts','platform_metadata','comments','music_library','renders','production_logs') ORDER BY tablename;\""
```

Expected: 6 rows.

- [ ] **Step 4: Verify auto-pilot columns on projects**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec supabase-db-1 psql -U postgres -c \"SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name LIKE 'auto_pilot%' OR column_name IN ('monthly_budget_usd','monthly_spend_usd','style_dna') ORDER BY column_name;\""
```

Expected: `auto_pilot_enabled`, `auto_pilot_topic_threshold`, `auto_pilot_script_threshold`, `auto_pilot_default_visibility`, `monthly_budget_usd`, `monthly_spend_usd`, `style_dna`.

- [ ] **Step 5: Verify Realtime enabled for new tables**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud "docker exec supabase-db-1 psql -U postgres -c \"SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename IN ('scheduled_posts','comments','production_logs','research_runs','research_categories') ORDER BY tablename;\""
```

Expected: 5 rows.

- [ ] **Step 6: Verify via REST API (spot check 3 tables)**

```bash
source .env
for table in scheduled_posts comments production_logs; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://supabase.operscale.cloud/rest/v1/${table}?select=id&limit=1" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
  echo "$table: HTTP $code"
done
```

Expected: All return `200`.

- [ ] **Step 7: Commit**

```bash
git commit --allow-empty -m "ops: deploy 004_calendar_engagement_music.sql — 6 tables + auto-pilot columns"
```

---

### Task 4: Deactivate I2V/T2V Workflows on n8n

**Files:**
- Reference: `.env` for N8N_API_KEY

Workflow IDs to deactivate (from MEMORY.md):
- WF_I2V_GENERATION: `rHQa9gThXQleyStj`
- WF_T2V_GENERATION: `KQDyQt5PV8uqCrXM`
- WF_SCENE_I2V_PROCESSOR: `TOkpPY35veSf5snS`
- WF_SCENE_T2V_PROCESSOR: `VLrMKfaDeKYFLU75`

- [ ] **Step 1: Deactivate WF_I2V_GENERATION**

```bash
source .env
curl -s -X PATCH "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/rHQa9gThXQleyStj" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"name\"]}: active={d[\"active\"]}')"
```

Expected: `WF_I2V_GENERATION: active=False`

- [ ] **Step 2: Deactivate WF_T2V_GENERATION**

```bash
curl -s -X PATCH "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/KQDyQt5PV8uqCrXM" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"name\"]}: active={d[\"active\"]}')"
```

Expected: `WF_T2V_GENERATION: active=False`

- [ ] **Step 3: Deactivate WF_SCENE_I2V_PROCESSOR**

```bash
curl -s -X PATCH "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/TOkpPY35veSf5snS" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"name\"]}: active={d[\"active\"]}')"
```

- [ ] **Step 4: Deactivate WF_SCENE_T2V_PROCESSOR**

```bash
curl -s -X PATCH "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/VLrMKfaDeKYFLU75" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"name\"]}: active={d[\"active\"]}')"
```

- [ ] **Step 5: Verify all 4 are inactive**

```bash
for wf_id in rHQa9gThXQleyStj KQDyQt5PV8uqCrXM TOkpPY35veSf5snS VLrMKfaDeKYFLU75; do
  result=$(curl -s "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/$wf_id" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"name\"]}: active={d[\"active\"]}')")
  echo "$result"
done
```

Expected: All 4 show `active=False`.

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "ops: deactivate I2V/T2V workflows — replaced by Ken Burns (Phase 3)"
```

---

### Task 5: Final Phase 1 Verification

- [ ] **Step 1: Run comprehensive check**

```bash
source .env

echo "=== TABLES ==="
for table in research_runs research_results research_categories scheduled_posts platform_metadata comments music_library renders production_logs; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://supabase.operscale.cloud/rest/v1/${table}?select=id&limit=1" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
  echo "  $table: $code"
done

echo ""
echo "=== CINEMATIC FIELDS ==="
curl -s "https://supabase.operscale.cloud/rest/v1/scenes?select=color_mood,zoom_direction&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "=== I2V/T2V STATUS ==="
for wf_id in rHQa9gThXQleyStj KQDyQt5PV8uqCrXM TOkpPY35veSf5snS VLrMKfaDeKYFLU75; do
  curl -s "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/$wf_id" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  {d[\"name\"]}: active={d[\"active\"]}')"
done
```

Expected:
- All 9 tables return HTTP 200
- Cinematic fields visible in scenes query
- All 4 I2V/T2V workflows show active=False

- [ ] **Step 2: Update MEMORY.md with Phase 1 completion**

Add to memory:
```
## Phase 1 Complete (2026-03-28)
- Migrations 002-004 deployed to VPS Supabase
- 9 new tables: research_runs, research_results, research_categories, scheduled_posts, platform_metadata, comments, music_library, renders, production_logs
- Cinematic fields on scenes: color_mood, zoom_direction, caption_highlight_word, transition_to_next, b_roll_insert, composition_prefix, selective_color_element, pipeline_stage
- Auto-pilot columns on projects: auto_pilot_enabled, thresholds, visibility, budget
- pipeline_stage on topics
- style_dna on projects
- I2V/T2V workflows DEACTIVATED (not deleted): rHQa9gThXQleyStj, KQDyQt5PV8uqCrXM, TOkpPY35veSf5snS, VLrMKfaDeKYFLU75
- All existing scenes updated to visual_type='static_image'
```

- [ ] **Step 3: Final commit**

```bash
git commit --allow-empty -m "ops: Phase 1 complete — database deployed, I2V/T2V deactivated"
```
