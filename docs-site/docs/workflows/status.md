# Workflow status (active vs deprecated)

State table for every workflow either checked into `workflows/` or listed
in `MEMORY.md` "Production Workflow IDs". Last-verified dates come from
the most recent commit or memory entry that touched the workflow.

For per-workflow purpose / I/O, see the [reference](reference.md).

!!! warning "Source of truth split"
    This table is built from two sources that don't always agree:
    `workflows/*.json` (checked-in snapshots) and `MEMORY.md`
    (last-known live state). Where they disagree, the row notes the
    discrepancy. Treat this as a tracking artifact, not a guarantee.

## State table

| Workflow | n8n ID | Active | Trigger | Last verified | Notes |
|---|---|---|---|---|---|
| WF_MASTER | — | ✅ | webhook `/master/start` | 2026-04-24 (JSON) | Resume launcher; ID not in MEMORY |
| WF_PROJECT_CREATE | — | ✅ | webhook `/internal/project-create` | 2026-04-20 | Snapshot, may differ from live |
| WF_TOPICS_GENERATE | — | ✅ | webhook `/topics/generate` | 2026-04-20 | Hardened in Session 9 + 38 |
| WF_TOPICS_ACTION | — | ✅ | webhook `/topics/action` | 2026-04-20 | 5-output Switch (approve/reject/refine/edit/edit_avatar) |
| WF_SCRIPT_GENERATE | `DzugaN9GtVpTznvs` | ✅ | webhook `/script/generate` | 2026-04-20 | 3-pass orchestrator |
| WF_SCRIPT_PASS | `CRC9USwaGgk7x6xN` | ✅ | sub-workflow | 2026-04-20 | Unified handler for all 3 passes |
| WF_SCRIPT_APPROVE | `qRsX9Ec7DWxqJiaS` | ✅ | webhook `/script/approve` | 2026-04-20 | Sets `pipeline_stage='cost_selection'` |
| WF_SCRIPT_REJECT | `7yo7dZAtewNxK9TE` | ✅ | webhook `/script/reject` | 2026-04-20 | |
| WF_SCENE_CLASSIFY | `WaPnGhyhQO2gDemX` | ✅ | webhook `/scene-classify` | 2026-04-20 | Auto-pass for image-only registers |
| WF_TTS_AUDIO | `4L2j3aU2WGnfcvvj` | ✅ | webhook `/production/tts` | 2026-03-09 | Activated after `child_process` allowlist |
| WF_IMAGE_GENERATION | `ScP3yoaeuK7BwpUo` | ✅ | webhook `/production/images` | 2026-03-09 | Fal.ai Seedream 4.5 |
| WF_SCENE_IMAGE_PROCESSOR | `Lik3MUT0E9a6JUum` | ✅ | webhook `/process-scene/image` | 2026-03-09 | Single-scene retry worker |
| WF_SCENE_I2V_PROCESSOR | `TOkpPY35veSf5snS` | ✅ | webhook (live) | 2026-03-09 | **No JSON in workflows/** — live-only |
| WF_SCENE_T2V_PROCESSOR | `VLrMKfaDeKYFLU75` | ✅ | webhook (live) | 2026-03-09 | **No JSON in workflows/** — live-only |
| WF_SEEDANCE_I2V | — | ✅ | webhook `/production/i2v-hybrid` | 2026-04-17 | Hybrid scenes (Cost Calculator output) |
| WF_KEN_BURNS | — | ✅ | webhook `/production/ken-burns` | 2026-04-24 | 6 zoom directions × 7 color moods |
| WF_CAPTIONS_ASSEMBLY | `Fhdy66BLRh7rAwTi` | ✅ | webhook `/production/assembly` | 2026-04-10 | 3-layer crash prevention (Session 35) |
| WF_MUSIC_GENERATE | — | ✅ | sub-workflow | 2026-04-15 | Lyria, snapshot may differ |
| WF_ENDCARD | — | ✅ | sub-workflow | 2026-04-24 | 5-8s long-form / 3s short |
| WF_THUMBNAIL_GENERATE | `7GqpEAug8hxxU7f6` | ✅ | chained from assembly | 2026-04-09 | **No JSON in workflows/** — live-only |
| WF_VIDEO_METADATA | `k0F6KAtkn74PEIDl` | ✅ | chained from assembly | 2026-04-20 | **No JSON in workflows/** — 029 RPC consumer |
| WF_QA_CHECK | — | ✅ | sub-workflow | 2026-04-24 | 13 automated checks |
| WF_PLATFORM_METADATA | — | ✅ | sub-workflow | 2026-04-24 | Per-platform caption + hashtag generation |
| WF_RETRY_WRAPPER | — | ✅ | sub-workflow (Execute Workflow) | 2026-04-24 | Reusable retry, default `maxRetries=4` |
| WF_ASSEMBLY_WATCHDOG | `Exm836gCGtxNKOeD` | ✅ | cron | 2026-03-15 | **No JSON in workflows/** — live-only |
| WF_SUPERVISOR | — | ✅ | cron (every 30 min) | 2026-04-23 | **Was failing silently 30 days** before Session 38 fix |
| WF_RESEARCH_ORCHESTRATOR | `sq67vfV0vHhaL2hd` | ✅ | webhook `/research/run` | 2026-04-20 | |
| WF_RESEARCH_REDDIT | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_RESEARCH_YOUTUBE | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_RESEARCH_TIKTOK | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_RESEARCH_GOOGLE_TRENDS | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_RESEARCH_QUORA | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_RESEARCH_CATEGORIZE | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_YOUTUBE_DISCOVERY | `jE9UBJhqYnjrUAIy` | ✅ | webhook `/youtube/discover` | 2026-04-17 | **No JSON in workflows/** — live-only. ~5K YouTube quota/run |
| WF_YOUTUBE_ANALYZE | `T26tPJTPt2ZCdY0p` | ✅ | webhook `/youtube/analyze` | 2026-04-17 | **No JSON in workflows/** — live-only |
| WF_AUDIENCE_INTELLIGENCE | — | ✅ | webhook `/audience/intelligence` | 2026-04-15 | CF16 |
| WF_CHANNEL_ANALYZE | — | ✅ | webhook `/channel-analyze` | 2026-04-17 | |
| WF_CHANNEL_COMPARE | — | ✅ | webhook `/channel-compare` | 2026-04-17 | |
| WF_DISCOVER_COMPETITORS | — | ✅ | webhook `/discover-competitors` | 2026-04-20 | Rewritten Session 38 part 2 (off-niche fix) |
| WF_COMPETITOR_MONITOR | — | ✅ | webhook `/competitor/monitor/run` | 2026-04-15 | |
| WF_DAILY_IDEAS | — | ✅ | webhook `/ideas/generate` | 2026-04-15 | CF08 |
| WF_KEYWORD_SCAN | — | ✅ | webhook `/keywords/scan` | 2026-04-15 | |
| WF_NICHE_HEALTH | — | ✅ | webhook `/niche-health/compute` | 2026-04-15 | CF11 weekly |
| WF_NICHE_VIABILITY | — | ✅ | webhook `/niche-viability` | 2026-04-20 | Column rename retroactively applied 026 + Session 38 |
| WF_OUTLIER_SCORE | — | ✅ | sub-workflow | 2026-04-20 | Auth credential swap Session 38 part 7 |
| WF_SEO_SCORE | — | ✅ | sub-workflow | 2026-04-20 | Same Session 38 cred swap |
| WF_HOOK_ANALYZER | — | ✅ | webhook `/hooks/analyze` | 2026-04-15 | |
| WF_PPS_CALIBRATE | — | ✅ | webhook `/pps/calibrate` | 2026-04-15 | CF13 |
| WF_PREDICT_PERFORMANCE | — | ✅ | webhook `/pps/calculate` | 2026-04-15 | CF13 |
| WF_RPM_CLASSIFY | — | ✅ | webhook `/rpm/classify` | 2026-04-15 | |
| WF_REVENUE_ATTRIBUTION | — | ✅ | webhook `/revenue/attribute` | 2026-04-15 | CF12 |
| WF_AB_TEST_ROTATE | — | ✅ | webhook `/ab-test/start` | 2026-04-15 | CF17 |
| WF_CTR_OPTIMIZE | — | ✅ | webhook `/ctr/optimize` | 2026-04-15 | CF05/CF06 |
| WF_THUMBNAIL_SCORE | — | ✅ | webhook `/thumbnail/score` | 2026-04-15 | |
| WF_VIRAL_TAG | — | ✅ | webhook `/viral/tag` | 2026-04-15 | |
| WF_STYLE_DNA | — | ✅ | webhook `/style-dna/analyze` | 2026-04-15 | |
| WF_AI_COACH | — | ✅ | webhook `/coach/message` | 2026-04-15 | CF09 |
| WF_ANALYTICS_CRON | — | ✅ | cron (daily) | 2026-04-23 | **Was failing silently 30 days** before Session 38 fix |
| WF_COMMENTS_SYNC | — | ✅ | cron (daily) | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_COMMENT_ANALYZE | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_SCHEDULE_PUBLISHER | — | ✅ | cron (every 15 min) | 2026-04-24 (JSON) | 2-node skeleton; live differs |
| WF_SOCIAL_POSTER | — | ✅ | webhook `/social/post` | 2026-04-23 | Credentials rotated Session 38 part 8 |
| WF_SOCIAL_ANALYTICS | — | ✅ | webhook `/social/analytics/refresh` | 2026-04-23 | Credentials rotated Session 38 |
| WF_DASHBOARD_READ | — | ✅ | webhook `/dashboard/read` | 2026-04-24 (JSON) | Aggregator |
| WF_WEBHOOK_PRODUCTION | `SsdE4siQ8EbO76ye` | ✅ | webhook (multiple `/production/*` paths) | 2026-04-24 (JSON) | 77 nodes — top-of-pipeline router |
| WF_SHORTS_ANALYZE | `pbh7LaZI9kua5oxI` | ✅ | webhook `/shorts/analyze` | 2026-04-08 | **No JSON in workflows/** — live-only |
| WF_SHORTS_PRODUCE | `mg9gWUz2yiGhOq7r` | ✅ | webhook `/shorts/produce` | 2026-04-08 | **No JSON in workflows/** — live-only |
| WF_CREATE_PROJECT_FROM_ANALYSIS | — | ✅ | webhook `/project/create-from-analysis` | 2026-04-17 | |
| WF_YOUTUBE_UPLOAD | — | ✅ | sub-workflow | 2026-04-24 (JSON) | 30 nodes; quota 1,600 units / upload |
| WF_WEBHOOK_PUBLISH | — | ✅ | webhook `/video/schedule` | 2026-04-24 (JSON) | Wraps `WF_YOUTUBE_UPLOAD` |
| WF_WEBHOOK_SETTINGS | — | ✅ | webhook `/prompts/regenerate` | 2026-04-24 (JSON) | Settings page surface |
| WF_WEBHOOK_STATUS | — | ✅ | webhook `/status` | 2026-04-24 (JSON) | Health check |
| WF_WEBHOOK_PROJECT_CREATE | — | ⚠️ stub | webhook `/project/create` | 2026-04-24 (JSON) | Superseded by `WF_PROJECT_CREATE` |
| WF_WEBHOOK_TOPICS_GENERATE | — | ⚠️ stub / collision | webhook `/topics/generate` | 2026-04-24 (JSON) | **Path collides with `WF_TOPICS_GENERATE`** |
| WF_WEBHOOK_TOPICS_ACTION | — | ⚠️ stub / collision | webhook `/topics/action` | 2026-04-24 (JSON) | **Path collides with `WF_TOPICS_ACTION`** |
| WF_I2V_GENERATION | `rHQa9gThXQleyStj` | 🔶 see notes | webhook (live) | 2026-03-09 | **Discrepancy** — see below |
| WF_T2V_GENERATION | `KQDyQt5PV8uqCrXM` | 🔶 see notes | webhook (live) | 2026-03-09 | **Discrepancy** — see below |

## Discrepancies that need reconciliation

### WF_I2V_GENERATION + WF_T2V_GENERATION — local vs live mismatch

The JSON files are in `workflows/deprecated/`:

```text
workflows/deprecated/WF_I2V_GENERATION.json
workflows/deprecated/WF_T2V_GENERATION.json
```

…but `MEMORY.md` "Production Workflow IDs" lists both as **active on
the live n8n VPS** with IDs `rHQa9gThXQleyStj` and `KQDyQt5PV8uqCrXM`.

Two possibilities:

1. The local `deprecated/` move was correct, and the live workflows are
   stale — the per-scene workers (`WF_SCENE_I2V_PROCESSOR`,
   `WF_SCENE_T2V_PROCESSOR`, `WF_SEEDANCE_I2V`) should have replaced
   them.
2. The local move was premature, and the batch workflows are still
   doing real work on the live VPS.

**Action required:** open n8n at `https://n8n.srv1297445.hstgr.cloud`,
inspect the two workflows, and either deactivate them on the VPS (then
remove from MEMORY) or restore the JSONs out of `deprecated/`. Until
that's done, treat the rows in the table above as ambiguous (`🔶`).

### Webhook-path collisions

Three pairs of workflows bind the same webhook path:

| Path | Stub | Production-grade |
|---|---|---|
| `/webhook/project/create` | `WF_WEBHOOK_PROJECT_CREATE` (4 nodes) | `WF_PROJECT_CREATE` at `/webhook/internal/project-create` |
| `/webhook/topics/generate` | `WF_WEBHOOK_TOPICS_GENERATE` (4 nodes) | `WF_TOPICS_GENERATE` (26 nodes) |
| `/webhook/topics/action` | `WF_WEBHOOK_TOPICS_ACTION` (4 nodes) | `WF_TOPICS_ACTION` (29 nodes) |

The first pair is benign — `WF_PROJECT_CREATE` lives on a different
path (`/internal/project-create`), so the stub is just dead code.

The second and third pairs **share the same path**. n8n routes only one
binding per path; the other workflow's webhook trigger is ignored. The
production-grade workflows are larger and more recent, so they're
presumed to win, but this should be verified and the stubs deleted.

## What "Active" means here

- **✅** — workflow is enabled on the live n8n VPS (per `MEMORY.md`) or
  was last seen running.
- **⚠️ stub** — early Phase-1 placeholder, superseded by a
  production-grade workflow.
- **🔶** — JSON state and live state disagree; needs human
  reconciliation.
- **❌** — would mark a workflow that's deactivated on n8n with no
  replacement (none currently in this state).

## Verifying live state

The fastest way to check what's actually active:

```bash
ssh root@srv1297445.hstgr.cloud
docker exec -it n8n-n8n-1 sh -c \
  'sqlite3 /home/node/.n8n/database.sqlite \
   "SELECT id, name, active FROM workflow_entity WHERE name LIKE \"WF_%\" ORDER BY name"'
```

Compare the output against this table; update the "Active" column and
"Last verified" date when you reconcile.
