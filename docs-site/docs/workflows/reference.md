# Workflow reference

One **Template 2** card per Vision GridAI workflow, grouped by domain. Two
caveats apply across the page:

- **Snapshot, may differ from live.** Cards marked with this badge are
  populated from the JSON checked into `workflows/` only — we have no
  guarantee the live n8n VPS matches. Cards with an n8n ID listed are
  cross-referenced against `MEMORY.md` "Production Workflow IDs" and
  reflect the live state as of the last verification there.
- **Webhook auth.** Every webhook-triggered card requires the standard
  `Authorization: Bearer ${DASHBOARD_API_TOKEN}` header. See
  [Architecture](architecture.md#webhook-bearer-auth-the-missing-expression-trap)
  for the rationale and the `=` expression trap.

For active/inactive state, see [workflow status](status.md). For chain
patterns, see [Architecture](architecture.md).

---

## Production

### WF_MASTER
**ID:** — · **Active:** ✅ (live, no JSON ID in MEMORY) · **Trigger:** webhook (`/webhook/master/start`)

- **Purpose:** Resume launcher. Reads a topic's column state and POSTs to the right next-stage webhook.
- **Reads:** `topics.script_json`, `topics.status`, `topics.images_progress`, `topics.audio_progress`, `topics.assembly_status`, `topics.thumbnail_url`.
- **Writes:** none directly (logs via `production_log`).
- **Calls:** the next-stage webhook (`/webhook/script/generate`, `/webhook/scene-classify`, `/webhook/production/images`, `/webhook/production/tts`, `/webhook/production/assembly`, `/webhook/production/thumbnail`).
- **Notes:** 18 nodes. Returns `HTTP 202` and lets the chain run async. `start_from='auto'` is the normal path; pass a stage name to force re-run.

### WF_PROJECT_CREATE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/internal/project-create`)

- **Purpose:** Niche research + dynamic prompt generation for a new project.
- **Reads:** request body (`name`, `niche`, `niche_description`).
- **Writes:** `projects` row, `niche_profiles`, `prompt_configs` (auto-generated system + topic + script prompts).
- **Calls:** Anthropic API (Claude with web_search tool).
- **Notes:** 30 nodes. Snapshot, may differ from live.

### WF_TOPICS_GENERATE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/topics/generate`)

- **Purpose:** Generate 25 topics + avatars for a project (Phase B / Gate 1).
- **Reads:** `projects` (niche, expertise, playlist angles, blue-ocean strategy), `niche_profiles`.
- **Writes:** 25 rows into `topics`, 25 into `avatars`, 1 into `production_log`.
- **Calls:** Anthropic Claude (3-pass blue-ocean prompt), `WF_OUTLIER_SCORE` and `WF_SEO_SCORE` (sub-workflow).
- **Notes:** 26 nodes. After Session 38 fix, scoring chain is restored via a `Prep Scoring Input` Set node that reattaches `project_id`. See `MEMORY.md` Session 38 part 7.

### WF_TOPICS_ACTION
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/topics/action`)

- **Purpose:** Gate 1 actions — approve / reject / refine / edit topic / edit avatar.
- **Reads:** `topics` (incl. all 24 sibling topics for refine context), `avatars`.
- **Writes:** `topics.review_status`, `topics.refinement_history`, `avatars.*`, `production_log`.
- **Calls:** Anthropic Claude (refinement only).
- **Notes:** 29 nodes. Switch node has 5 outputs (one per action). Hardened in Session 9 (idempotency + production_log + error handler).

### WF_SCRIPT_GENERATE
**ID:** `DzugaN9GtVpTznvs` · **Active:** ✅ · **Trigger:** webhook (`/webhook/script/generate`)

- **Purpose:** 3-pass script generation orchestrator. Calls `WF_SCRIPT_PASS` three times with rolling context.
- **Reads:** `topics`, `avatars`, `prompt_configs` (script_pass1/2/3), `projects.niche_*`, intelligence-layer tables (via 029 RPC).
- **Writes:** `topics.script_json`, `topics.script_evaluation`, `topics.script_pass_scores`, `topics.word_count`, `topics.scene_count`, `scenes` (172 rows), `production_log`.
- **Calls:** Anthropic Claude (Sonnet) via `WF_SCRIPT_PASS` sub-workflow.
- **Notes:** 26 nodes. Per-pass threshold 6.0, combined threshold 7.0, max 3 regenerations.

### WF_SCRIPT_PASS
**ID:** `CRC9USwaGgk7x6xN` · **Active:** ✅ · **Trigger:** sub-workflow (Execute Workflow)

- **Purpose:** Execute one script pass + evaluate it. Single unified workflow handles all 3 passes.
- **Reads:** input from caller (`pass_number`, `prompt`, `prior_pass_summary`).
- **Writes:** returns `{ script_text, evaluation, score }` to caller.
- **Calls:** Anthropic Claude (Sonnet for pass, Haiku for eval), `WF_RETRY_WRAPPER`.
- **Notes:** 2 nodes shown in JSON (skeletal export); live workflow does the actual heavy lifting. Snapshot, may differ from live.

### WF_SCRIPT_APPROVE
**ID:** `qRsX9Ec7DWxqJiaS` · **Active:** ✅ · **Trigger:** webhook (`/webhook/script/approve`)

- **Purpose:** Gate 2 approval. Sets `pipeline_stage='cost_selection'` so the dashboard can present cost calculator.
- **Reads:** `topics`, request body.
- **Writes:** `topics.script_review_status='approved'`, `topics.pipeline_stage='cost_selection'`, `production_log`.
- **Calls:** none (does NOT directly trigger production — that happens after the cost-calculator gate).
- **Notes:** 10 nodes.

### WF_SCRIPT_REJECT
**ID:** `7yo7dZAtewNxK9TE` · **Active:** ✅ · **Trigger:** webhook (`/webhook/script/reject`)

- **Purpose:** Gate 2 rejection / refinement.
- **Reads:** `topics`, request body (rejection feedback).
- **Writes:** `topics.script_review_status='rejected'`, `topics.script_review_feedback`, `production_log`.
- **Calls:** optionally re-fires `WF_SCRIPT_GENERATE` if user requested a regenerate.
- **Notes:** 8 nodes.

### WF_SCENE_CLASSIFY
**ID:** `WaPnGhyhQO2gDemX` · **Active:** ✅ · **Trigger:** webhook (`/webhook/scene-classify`)

- **Purpose:** Visual-type classification (`static_image` / `i2v` / `t2v`) per scene. Updates `pipeline_stage='tts'` then triggers production.
- **Reads:** `scenes`, `topics`.
- **Writes:** `scenes.visual_type`, `topics.pipeline_stage`, `production_log`.
- **Calls:** Anthropic Claude (Haiku), then POSTs to `/webhook/production/trigger`.
- **Notes:** 11 nodes. Auto-pass for image-only registers.

### WF_TTS_AUDIO
**ID:** `4L2j3aU2WGnfcvvj` · **Active:** ✅ · **Trigger:** webhook (`/webhook/production/tts`)

- **Purpose:** Generate per-scene voiceover via Google Cloud TTS (Chirp 3 HD).
- **Reads:** `scenes` (with `audio_status='pending'`), `topics.target_voice`.
- **Writes:** `scenes.audio_file_drive_id`, `scenes.audio_duration_ms`, `scenes.audio_status='uploaded'`, `topics.audio_progress`, `production_log`.
- **Calls:** Google Cloud TTS, Google Drive, `WF_RETRY_WRAPPER`.
- **Notes:** 39 nodes. Resume-aware: skips scenes already uploaded. Activated in Session 9 after `child_process` was added to `NODE_FUNCTION_ALLOW_BUILTIN`.

### WF_IMAGE_GENERATION
**ID:** `ScP3yoaeuK7BwpUo` · **Active:** ✅ · **Trigger:** webhook (`/webhook/production/images`)

- **Purpose:** Per-scene image generation via Fal.ai Seedream 4.5.
- **Reads:** `scenes` (with `image_status='pending'`), `topics.style_dna`, `prompt_templates` (composition prefixes).
- **Writes:** `scenes.image_url`, `scenes.image_drive_id`, `scenes.image_status='uploaded'`, `topics.images_progress`, `production_log`.
- **Calls:** Fal.ai (`fal-ai/bytedance/seedream/v4.5/text-to-image`) async queue, `WF_RETRY_WRAPPER`.
- **Notes:** 20 nodes. Universal negative prompt applied per call. Composition prefix + scene subject + style DNA built per prompt.

### WF_SCENE_IMAGE_PROCESSOR
**ID:** `Lik3MUT0E9a6JUum` · **Active:** ✅ · **Trigger:** webhook (`/webhook/process-scene/image`)

- **Purpose:** Single-scene image worker — generates + uploads one image, used for retries / individual scene fixes.
- **Reads:** scene row by ID.
- **Writes:** `scenes.image_*`, `production_log`.
- **Calls:** Fal.ai, Google Drive.
- **Notes:** 7 nodes.

### WF_SCENE_I2V_PROCESSOR
**ID:** `TOkpPY35veSf5snS` · **Active:** ✅ · **Trigger:** webhook (live; no JSON checked in)

- **Purpose:** Single-scene I2V (image-to-video) worker — generates one Seedance 2.0 Fast clip from an image.
- **Reads:** scene row.
- **Writes:** `scenes.video_url`, `scenes.video_drive_id`, `scenes.video_status`, `production_log`.
- **Calls:** Fal.ai (`fal-ai/bytedance/seedance/v2/fast/i2v`).
- **Notes:** Snapshot from `MEMORY.md` only — workflow JSON not in `workflows/`.

### WF_SCENE_T2V_PROCESSOR
**ID:** `VLrMKfaDeKYFLU75` · **Active:** ✅ · **Trigger:** webhook (live; no JSON checked in)

- **Purpose:** Single-scene T2V (text-to-video) worker.
- **Reads:** scene row.
- **Writes:** `scenes.video_*`, `production_log`.
- **Calls:** Fal.ai T2V model.
- **Notes:** Snapshot from `MEMORY.md` only — workflow JSON not in `workflows/`.

### WF_SEEDANCE_I2V
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/production/i2v-hybrid`)

- **Purpose:** Hybrid-scene I2V orchestrator (Cost Calculator selected ratio of scenes).
- **Reads:** `scenes` (with `clip_status='pending'` and `visual_type='i2v'`).
- **Writes:** `scenes.video_*`, `topics.i2v_progress`, `production_log`.
- **Calls:** Fal.ai Seedance 2.0 Fast, `WF_RETRY_WRAPPER`.
- **Notes:** 9 nodes.

### WF_KEN_BURNS
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/production/ken-burns`)

- **Purpose:** Per-scene FFmpeg Ken Burns motion + color grade. Fires `/webhook/production/captions-assembly` when done.
- **Reads:** `scenes` (with `clip_status='pending'`), `scenes.zoom_direction`, `scenes.color_mood`, `scenes.selective_color_element`.
- **Writes:** `scenes.clip_url`, `scenes.clip_status='uploaded'`, `production_log`.
- **Calls:** FFmpeg via `docker exec`, Google Drive.
- **Notes:** 11 nodes. Selective-color scenes skip color grade. Batches of 20 to manage VPS memory.

### WF_CAPTIONS_ASSEMBLY
**ID:** `Fhdy66BLRh7rAwTi` · **Active:** ✅ · **Trigger:** webhook (`/webhook/production/assembly`)

- **Purpose:** Concat all 172 scene clips with xfade transitions, normalize audio, fire caption-burn service, upload final to Drive.
- **Reads:** all `scenes` for topic, `topics.transition_to_next` per scene.
- **Writes:** `topics.assembly_status`, `topics.drive_video_url`, `production_log`. Triggers `WF_THUMBNAIL_GENERATE` and `WF_VIDEO_METADATA` via "Log Assembly Complete".
- **Calls:** FFmpeg via `docker exec`, caption burn service `:9998`, Google Drive.
- **Notes:** 47 nodes. **Three-layer crash prevention** (Build Scene Clip auto-fix, Concat Video pre-scan, post-concat duration check). 15-20 scene batches before final concat.

### WF_MUSIC_GENERATE
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Generate background music via Vertex AI Lyria, ducked under voiceover.
- **Reads:** `topics.music_sections`, `projects.music_*`.
- **Writes:** writes track to Drive, returns URL to caller.
- **Calls:** Vertex AI Lyria (`lyria-002`), FFmpeg ducking.
- **Notes:** 3 nodes (skeletal). Snapshot, may differ from live.

### WF_ENDCARD
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Append branded end card (5-8s long-form, 3s short).
- **Reads:** input video URL + duration.
- **Writes:** new video URL with end card appended.
- **Calls:** FFmpeg.
- **Notes:** 3 nodes (skeletal).

### WF_THUMBNAIL_GENERATE
**ID:** `7GqpEAug8hxxU7f6` · **Active:** ✅ · **Trigger:** chained from `WF_CAPTIONS_ASSEMBLY` (live; no JSON checked in)

- **Purpose:** Generate thumbnail via Fal.ai Seedream + text overlay (Sharp/Jimp). Photorealistic style locked (Canon EOS R5, RAW, teal-orange grade).
- **Reads:** `topics.script_metadata.thumbnail_prompt`, `topics.style_dna`.
- **Writes:** `topics.thumbnail_url`, `production_log`.
- **Calls:** Fal.ai Seedream, Google Drive.
- **Notes:** Snapshot from `MEMORY.md` only — workflow JSON not in `workflows/`.

### WF_VIDEO_METADATA
**ID:** `k0F6KAtkn74PEIDl` · **Active:** ✅ · **Trigger:** chained from `WF_CAPTIONS_ASSEMBLY` (live; no JSON checked in)

- **Purpose:** Generate YouTube SEO description (3-5K chars) + 15-20 tags + chapter timestamps. Uploads SEO doc to Drive.
- **Reads:** `topics.script_json`, intelligence layer via 029 RPC.
- **Writes:** `topics.yt_description`, `topics.yt_tags`, Drive SEO doc.
- **Calls:** Anthropic Claude.
- **Notes:** 10 nodes per `MEMORY.md`. After 029 renderer rollout, coverage went from ~5% to 100% of intelligence sources.

### WF_QA_CHECK
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Run 13 automated QA checks on assembled video (visual / caption / audio / platform compliance).
- **Reads:** final render via FFprobe.
- **Writes:** `renders.qa_results` (JSONB).
- **Calls:** FFprobe via `docker exec`.
- **Notes:** 2 nodes (skeletal). Auto-pilot fires publish only when all 13 pass.

### WF_PLATFORM_METADATA
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Generate platform-specific captions/hashtags (YouTube, TikTok, Instagram).
- **Reads:** topic data.
- **Writes:** `platform_metadata` rows.
- **Calls:** Anthropic Claude.
- **Notes:** 2 nodes (skeletal).

### WF_RETRY_WRAPPER
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow (Execute Workflow Trigger)

- **Purpose:** Reusable exponential-backoff retry wrapper for ALL external API calls.
- **Reads:** input `{ url, method, headers, body, maxRetries }`.
- **Writes:** returns `{ success, data, attempts }`.
- **Calls:** the wrapped HTTP request, with backoff `1s → 2s → 4s → 8s` (cap 30s).
- **Notes:** 3 nodes. Default `maxRetries=4`. Must be called as Execute Workflow, not webhook.

### WF_ASSEMBLY_WATCHDOG
**ID:** `Exm836gCGtxNKOeD` · **Active:** ✅ · **Trigger:** cron (live; no JSON checked in)

- **Purpose:** Detect stuck assemblies (FFmpeg hung, caption-burn timeout) and surface to dashboard.
- **Reads:** `topics.assembly_status`, `production_logs`.
- **Writes:** alerts on `production_log`, optionally retries.
- **Calls:** none (read-mostly).
- **Notes:** Snapshot from `MEMORY.md` only.

---

## Research / Intelligence

### WF_RESEARCH_ORCHESTRATOR
**ID:** `sq67vfV0vHhaL2hd` · **Active:** ✅ · **Trigger:** webhook (`/webhook/research/run`)

- **Purpose:** Topic Intelligence orchestrator. Derives keywords via Haiku, dispatches 5-source parallel scrape, triggers categorization on completion.
- **Reads:** `projects.niche`, `projects.niche_description`.
- **Writes:** `research_runs` row, progress columns.
- **Calls:** WF_RESEARCH_REDDIT, _YOUTUBE, _TIKTOK, _GOOGLE_TRENDS, _QUORA in parallel; then WF_RESEARCH_CATEGORIZE.
- **Notes:** 4 nodes (orchestrator only — heavy work in sub-workflows).

### WF_RESEARCH_REDDIT
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Mine top Reddit posts/comments by keyword (PRAW or Apify).
- **Reads:** input keywords, `time_range`.
- **Writes:** `research_results` rows (top 10 by upvotes + comments×2, last 7d).
- **Calls:** Reddit API / Apify.
- **Notes:** 2 nodes (skeletal). Snapshot, may differ from live.

### WF_RESEARCH_YOUTUBE
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Mine top YouTube comments by keyword.
- **Reads:** input keywords.
- **Writes:** `research_results` (top 10 by likes + replies×3).
- **Calls:** YouTube Data API v3.
- **Notes:** 2 nodes (skeletal).

### WF_RESEARCH_TIKTOK
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Mine top TikTok posts by keyword via Apify.
- **Reads:** input keywords.
- **Writes:** `research_results` (top 10 by likes + comments×2 + shares×3).
- **Calls:** Apify TikTok actor.
- **Notes:** 2 nodes (skeletal). Apify cold-start can hit 120s — set timeout accordingly.

### WF_RESEARCH_GOOGLE_TRENDS
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Pull Google Trends interest + People-Also-Ask via pytrends + SerpAPI.
- **Reads:** input keywords.
- **Writes:** `research_results` (interest × 10, PAA base 500, breakout 2×).
- **Calls:** pytrends, SerpAPI.
- **Notes:** 2 nodes (skeletal).

### WF_RESEARCH_QUORA
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Mine top Quora questions by keyword via Apify.
- **Reads:** input keywords.
- **Writes:** `research_results` (top 10 by follows + answers×2).
- **Calls:** Apify Quora actor.
- **Notes:** 2 nodes (skeletal).

### WF_RESEARCH_CATEGORIZE
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Cluster + rank research results, generate video titles per category.
- **Reads:** all `research_results` for the run.
- **Writes:** `research_categories` (gold/silver/bronze tier).
- **Calls:** Anthropic Claude (Haiku).
- **Notes:** 2 nodes (skeletal).

### WF_YOUTUBE_DISCOVERY
**ID:** `jE9UBJhqYnjrUAIy` · **Active:** ✅ · **Trigger:** webhook (`/webhook/youtube/discover` — live; no JSON checked in)

- **Purpose:** Niche-research engine — scrape top YouTube channels by keyword and surface high-engagement videos.
- **Reads:** request body `{ niche, keywords }`.
- **Writes:** `yt_discovery_runs`, `yt_discovery_results` (live tables; not in `supabase/migrations/`).
- **Calls:** YouTube Data API v3 (~5,000 quota units per run; max 2 runs/day).
- **Notes:** Snapshot from `MEMORY.md` only.

### WF_YOUTUBE_ANALYZE
**ID:** `T26tPJTPt2ZCdY0p` · **Active:** ✅ · **Trigger:** webhook (`/webhook/youtube/analyze` — live; no JSON checked in)

- **Purpose:** Per-video Claude analysis (10x strategy, content quality, comment insights).
- **Reads:** `yt_discovery_results` row.
- **Writes:** `yt_video_analyses` row.
- **Calls:** Anthropic Claude (Sonnet).
- **Notes:** Consumed by intelligence renderer (migration 029).

### WF_AUDIENCE_INTELLIGENCE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/audience/intelligence`)

- **Purpose:** Audience Memory Layer (CF16) — synthesize `audience_insights` from `audience_comments`.
- **Reads:** `audience_comments` for project.
- **Writes:** `audience_insights`.
- **Calls:** Anthropic Claude.
- **Notes:** 6 nodes.

### WF_CHANNEL_ANALYZE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/channel-analyze`)

- **Purpose:** Deep-analyze a single YouTube channel (top videos, content pillars, monetization signals).
- **Reads:** request body (channel ID).
- **Writes:** `channel_analyses` row, optionally feeds `analysis_groups`.
- **Calls:** YouTube Data API v3, Anthropic Claude.
- **Notes:** 11 nodes.

### WF_CHANNEL_COMPARE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/channel-compare`)

- **Purpose:** Compare two or more channels side-by-side, generate competitive report.
- **Reads:** `channel_analyses` rows.
- **Writes:** `channel_comparison_reports`.
- **Calls:** Anthropic Claude.
- **Notes:** 7 nodes.

### WF_DISCOVER_COMPETITORS
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/discover-competitors`)

- **Purpose:** Niche-keyword overlap scoring (60%) + cleaned-query channel discovery.
- **Reads:** `projects.niche`, `projects.niche_description`.
- **Writes:** `discovered_channels`.
- **Calls:** YouTube Data API v3, Anthropic Claude.
- **Notes:** 9 nodes. Rewritten in Session 38 part 2 to fix off-niche results.

### WF_COMPETITOR_MONITOR
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/competitor/monitor/run`)

- **Purpose:** Periodic competitor video drop check.
- **Reads:** `competitor_channels`, prior runs.
- **Writes:** alerts on `production_log`.
- **Calls:** YouTube Data API v3.
- **Notes:** 7 nodes.

### WF_DAILY_IDEAS
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/ideas/generate`)

- **Purpose:** AI Coach (CF08) — daily project-aware idea generation.
- **Reads:** project intelligence layer via 029 RPC.
- **Writes:** `daily_ideas` rows.
- **Calls:** Anthropic Claude.
- **Notes:** 6 nodes.

### WF_KEYWORD_SCAN
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/keywords/scan`)

- **Purpose:** Keyword research + saturation scan.
- **Reads:** project niche.
- **Writes:** `keywords`, `topic_keywords`.
- **Calls:** SerpAPI, pytrends.
- **Notes:** 8 nodes.

### WF_NICHE_HEALTH
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/niche-health/compute`)

- **Purpose:** Weekly niche-health score (CF11) — composite over RPM, saturation, audience growth.
- **Reads:** project + intelligence-layer tables.
- **Writes:** `niche_health_history`, `projects.niche_health_score`.
- **Calls:** Anthropic Claude.
- **Notes:** 6 nodes.

### WF_NICHE_VIABILITY
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/niche-viability`)

- **Purpose:** Niche viability assessment — entry-ease / sponsorship reasoning / revenue projections.
- **Reads:** `analysis_groups`, `channel_analyses`, `audience_insights`.
- **Writes:** `niche_viability_reports`, `projects.niche_viability_*`.
- **Calls:** Anthropic Claude.
- **Notes:** 10 nodes. Column rename `entry_difficulty_*` → `entry_ease_*` retroactively applied by migration 026 + Session 38.

### WF_OUTLIER_SCORE
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Per-topic outlier scoring (how unusual is this topic vs niche baseline).
- **Reads:** topic + project niche.
- **Writes:** `topics.outlier_score`.
- **Calls:** Anthropic Claude.
- **Notes:** 5 nodes. Auth credential swap landed in Session 38 part 7 (`DASHBOARD_API_TOKEN` → `Authorization`).

### WF_SEO_SCORE
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** Per-topic SEO score (search-volume × competition × intent fit).
- **Reads:** topic, keyword data.
- **Writes:** `topics.seo_score`.
- **Calls:** Anthropic Claude, SerpAPI.
- **Notes:** 5 nodes. Same Session 38 credential fix as `WF_OUTLIER_SCORE`.

### WF_HOOK_ANALYZER
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/hooks/analyze`)

- **Purpose:** Analyze script hook strength, suggest rewrites.
- **Reads:** `topics.script_json` first scenes.
- **Writes:** `topics.script_evaluation.hook_*`.
- **Calls:** Anthropic Claude.
- **Notes:** 6 nodes.

### WF_PPS_CALIBRATE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/pps/calibrate`)

- **Purpose:** Calibrate Performance Prediction Score model (CF13) per project from historical analytics.
- **Reads:** `topics.yt_*` analytics, `projects`.
- **Writes:** `pps_calibration` row.
- **Calls:** Anthropic Claude (statistical reasoning).
- **Notes:** 6 nodes.

### WF_PREDICT_PERFORMANCE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/pps/calculate`)

- **Purpose:** Run a topic through the calibrated PPS model to predict views/CTR/RPM.
- **Reads:** `pps_config`, `pps_calibration`, topic, intelligence layer.
- **Writes:** `topics.predicted_*`.
- **Calls:** Anthropic Claude.
- **Notes:** 6 nodes.

### WF_RPM_CLASSIFY
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/rpm/classify`)

- **Purpose:** Classify a niche/topic into an RPM tier from `rpm_benchmarks`.
- **Reads:** `rpm_benchmarks`, project niche.
- **Writes:** `projects.rpm_tier`.
- **Calls:** Anthropic Claude.
- **Notes:** 5 nodes.

### WF_REVENUE_ATTRIBUTION
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/revenue/attribute`)

- **Purpose:** Attribute revenue to topics via YouTube + AdSense (CF12).
- **Reads:** `topics.yt_estimated_revenue`, monetization tables.
- **Writes:** `revenue_attribution` rows.
- **Calls:** YouTube Analytics API.
- **Notes:** 6 nodes.

### WF_AB_TEST_ROTATE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/ab-test/start`)

- **Purpose:** Rotate `ab_test_variants` on the live YouTube video, capture impressions + views per window.
- **Reads:** `ab_tests`, `ab_test_variants`, YouTube Analytics.
- **Writes:** `ab_test_impressions`, `ab_tests.current_variant_id`, `ab_test_variants.is_winner`.
- **Calls:** YouTube Data API v3 (update video / thumbnail), YouTube Analytics API.
- **Notes:** 8 nodes. Confidence threshold default 0.95.

### WF_CTR_OPTIMIZE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/ctr/optimize`)

- **Purpose:** Pre-publish CTR scoring (CF05/CF06) — predict CTR for title/thumbnail variants.
- **Reads:** topic, candidate variants.
- **Writes:** `ab_test_variants.predicted_ctr_score`.
- **Calls:** Anthropic Claude.
- **Notes:** 6 nodes.

### WF_THUMBNAIL_SCORE
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/thumbnail/score`)

- **Purpose:** Score a candidate thumbnail against niche baselines.
- **Reads:** thumbnail URL, niche.
- **Writes:** scoring result (caller uses).
- **Calls:** Anthropic Claude (vision).
- **Notes:** 6 nodes.

### WF_VIRAL_TAG
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/viral/tag`)

- **Purpose:** Tag candidate clips with viral signals (used by `WF_SHORTS_ANALYZE`).
- **Reads:** scene narration, hook strength.
- **Writes:** scoring result.
- **Calls:** Anthropic Claude.
- **Notes:** 6 nodes.

### WF_STYLE_DNA
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/style-dna/analyze`)

- **Purpose:** Generate / refresh the locked Style DNA string for a project.
- **Reads:** project niche, sample images.
- **Writes:** `projects.style_dna`.
- **Calls:** Anthropic Claude.
- **Notes:** 7 nodes. Locked per project — should never change mid-video.

### WF_SUPERVISOR
**ID:** — · **Active:** ✅ · **Trigger:** cron (every 30 min)

- **Purpose:** Pipeline-wide health watchdog. Detects stuck topics, retries failed scenes, alerts on cost-budget breach.
- **Reads:** `topics`, `scenes`, `production_logs`, `projects.monthly_*`.
- **Writes:** alerts on `production_log`, may retry / skip scenes.
- **Calls:** Supabase only.
- **Notes:** 26 nodes. **Was silently failing for ~30 days** before Session 38 fixed the missing-`=` Authorization expression bug across 11 nodes.

---

## Analytics / Engagement

### WF_ANALYTICS_CRON
**ID:** — · **Active:** ✅ · **Trigger:** cron (daily)

- **Purpose:** Daily YouTube + TikTok + Instagram analytics pull, write to `topics.yt_*` / shorts platform metrics.
- **Reads:** all published `topics`, `shorts`.
- **Writes:** `topics.yt_*`, `shorts.tiktok_*`, `shorts.instagram_*`, `shorts.youtube_shorts_*`.
- **Calls:** YouTube Analytics API, TikTok API, Instagram Graph API.
- **Notes:** 23 nodes. **Was silently failing for ~30 days** before Session 38 fixed the missing-`=` bug across 6 nodes.

### WF_COMMENTS_SYNC
**ID:** — · **Active:** ✅ · **Trigger:** cron (daily)

- **Purpose:** Sync new comments from YouTube/TikTok/Instagram into `comments`, then trigger `WF_COMMENT_ANALYZE`.
- **Reads:** all published topics + shorts.
- **Writes:** `comments` rows.
- **Calls:** YouTube/TikTok/Instagram APIs.
- **Notes:** 2 nodes (skeletal).

### WF_COMMENT_ANALYZE
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** AI sentiment + intent scoring for new comments.
- **Reads:** new `comments`.
- **Writes:** `comments.sentiment`, `comments.intent_score`, `comments.intent_signals`.
- **Calls:** Anthropic Claude (Haiku).
- **Notes:** 2 nodes (skeletal). Comments with `intent_score > 0.7` flagged on Engagement Hub.

### WF_AI_COACH
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/coach/message`)

- **Purpose:** AI Coach chat surface (CF09) — project-aware Q&A over intelligence layer.
- **Reads:** project intelligence via 029 RPC.
- **Writes:** message log (audit only).
- **Calls:** Anthropic Claude.
- **Notes:** 5 nodes.

---

## Social

### WF_SCHEDULE_PUBLISHER
**ID:** — · **Active:** ✅ · **Trigger:** cron (every 15 min)

- **Purpose:** Pick due `scheduled_posts` rows, upload to platform, mark published.
- **Reads:** `scheduled_posts` where `status='scheduled'` AND `scheduled_at <= NOW()`.
- **Writes:** `scheduled_posts.status`, `scheduled_posts.published_at`, `scheduled_posts.error_message`.
- **Calls:** YouTube / TikTok / Instagram upload APIs.
- **Notes:** 2 nodes (skeletal). Visibility defaults from `projects.auto_pilot_default_visibility` (`unlisted`).

### WF_SOCIAL_POSTER
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/social/post`)

- **Purpose:** Direct social posting (immediate, not scheduled).
- **Reads:** `shorts` row, `social_accounts`, `platform_metadata`.
- **Writes:** `shorts.{tiktok,instagram,youtube_shorts}_*`.
- **Calls:** TikTok Content API, Instagram Graph API, YouTube Data API v3.
- **Notes:** 15 nodes. Credentials rotated in Session 38 part 8.

### WF_SOCIAL_ANALYTICS
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/social/analytics/refresh`)

- **Purpose:** Per-shorts engagement refresh across all 3 platforms.
- **Reads:** `shorts` rows with platform IDs set.
- **Writes:** `shorts.{tiktok,instagram,youtube_shorts}_{views,likes,comments,shares}`.
- **Calls:** TikTok, Instagram, YouTube APIs.
- **Notes:** 12 nodes. Verified post-Session 38 credential rotation.

---

## Utility / Webhook

### WF_DASHBOARD_READ
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/dashboard/read`)

- **Purpose:** Aggregator — single read endpoint the dashboard hits for project-level rollups (avoids N round-trips to PostgREST).
- **Reads:** `projects`, `topics`, `scenes` (counts only).
- **Writes:** none.
- **Calls:** Supabase only.
- **Notes:** 3 nodes.

### WF_WEBHOOK_PRODUCTION
**ID:** `SsdE4siQ8EbO76ye` · **Active:** ✅ · **Trigger:** webhook (multiple paths)

- **Purpose:** Single workflow exposes all production-control endpoints: `/webhook/production/{trigger,trigger-batch,stop,resume,restart,retry-scene,retry-all-failed,skip-scene,skip-all-failed,edit-retry-scene,assemble}`.
- **Reads:** `topics`, `scenes`, request body.
- **Writes:** `topics.*`, `scenes.*`, `production_log`.
- **Calls:** routes to the right downstream production webhook.
- **Notes:** 77 nodes — the largest workflow. Top-of-pipeline router.

### WF_SHORTS_ANALYZE
**ID:** `pbh7LaZI9kua5oxI` · **Active:** ✅ · **Trigger:** webhook (`/webhook/shorts/analyze` — live; no JSON checked in)

- **Purpose:** Analyze a published topic for 20 viral clip candidates (Gate 4 pre-production).
- **Reads:** `topics.script_json`, `topics.yt_*` analytics.
- **Writes:** `shorts` candidate rows (`review_status='pending'`).
- **Calls:** Anthropic Claude.
- **Notes:** Snapshot from `MEMORY.md` only.

### WF_SHORTS_PRODUCE
**ID:** `mg9gWUz2yiGhOq7r` · **Active:** ✅ · **Trigger:** webhook (`/webhook/shorts/produce` — live; no JSON checked in)

- **Purpose:** Build approved shorts: fresh TTS, 9:16 images, Ken Burns / I2V, kinetic captions, assembly.
- **Reads:** `shorts` row, project assets.
- **Writes:** `shorts.portrait_drive_url`, `shorts.thumbnail_url`, `shorts.production_*`.
- **Calls:** Google TTS, Fal.ai Seedream + Seedance, FFmpeg, caption burn service `:9998`.
- **Notes:** Snapshot from `MEMORY.md` only.

### WF_CREATE_PROJECT_FROM_ANALYSIS
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/project/create-from-analysis`)

- **Purpose:** Materialize a `projects` row from a `niche_viability_reports` decision.
- **Reads:** `niche_viability_reports`, `analysis_groups`.
- **Writes:** `projects` row, FK from `analysis_groups.project_id`.
- **Calls:** Anthropic Claude (for prompt-config bootstrap).
- **Notes:** 9 nodes.

### WF_YOUTUBE_UPLOAD
**ID:** — · **Active:** ✅ · **Trigger:** sub-workflow

- **Purpose:** YouTube resumable upload with metadata + captions + thumbnail.
- **Reads:** input `{ topic_id, file_url, title, description, tags, thumbnail_url, visibility }`.
- **Writes:** `topics.youtube_url`, `topics.youtube_video_id`, `topics.youtube_caption_id`, `topics.published_at`.
- **Calls:** YouTube Data API v3.
- **Notes:** 30 nodes. Quota: 1,600 units per upload — budget for max 6 uploads/day.

### WF_WEBHOOK_PUBLISH
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/video/schedule`)

- **Purpose:** Schedule or immediately publish a finished topic. Wraps `WF_YOUTUBE_UPLOAD`.
- **Reads:** `topics`, `platform_metadata`, `renders`.
- **Writes:** `topics.published_at`, `scheduled_posts`.
- **Calls:** `WF_YOUTUBE_UPLOAD` via Execute Workflow (workflow ID from `$env.WF_YOUTUBE_UPLOAD_ID`).
- **Notes:** 63 nodes.

### WF_WEBHOOK_SETTINGS
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/prompts/regenerate`)

- **Purpose:** Settings page surface — regenerate prompt configs for a project, edit auto-pilot thresholds.
- **Reads:** `projects`, `prompt_configs`.
- **Writes:** `prompt_configs` (new versions), `projects.auto_pilot_*`.
- **Calls:** Anthropic Claude.
- **Notes:** 29 nodes.

### WF_WEBHOOK_STATUS
**ID:** — · **Active:** ✅ · **Trigger:** webhook (`/webhook/status`)

- **Purpose:** Health check endpoint.
- **Reads:** none.
- **Writes:** none.
- **Calls:** none.
- **Notes:** 4 nodes. Returns `{ status: 'healthy', services: {...} }`.

### WF_WEBHOOK_PROJECT_CREATE
**ID:** — · **Active:** ⚠️ stub · **Trigger:** webhook (`/webhook/project/create`)

- **Purpose:** Original Phase-1 stub for project creation. Superseded by `WF_PROJECT_CREATE` at `/webhook/internal/project-create`.
- **Notes:** 4 nodes (stub). Kept for backwards compatibility; dashboard now hits the internal endpoint.

### WF_WEBHOOK_TOPICS_GENERATE
**ID:** — · **Active:** ⚠️ stub · **Trigger:** webhook (`/webhook/topics/generate`)

- **Purpose:** Original Phase-1 stub. **Webhook path collides with `WF_TOPICS_GENERATE`** — the larger workflow takes precedence on n8n's internal routing because both bind the same path.
- **Notes:** 4 nodes (stub). Reconciliation needed.

### WF_WEBHOOK_TOPICS_ACTION
**ID:** — · **Active:** ⚠️ stub · **Trigger:** webhook (`/webhook/topics/action`)

- **Purpose:** Original Phase-1 stub. **Webhook path collides with `WF_TOPICS_ACTION`**.
- **Notes:** 4 nodes (stub). Reconciliation needed (see [status](status.md)).
