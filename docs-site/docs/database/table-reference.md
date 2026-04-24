# Table reference

One card per significant Vision GridAI table, organised by domain. Column
lists are top-level only — for tables with 30+ columns, the most-used ~10
are shown with a pointer to the source migration for the rest. RLS state
reflects the post-[migration 030](migration-history.md#post-audit-lockdown-030-031)
lockdown: every VG table is `RESTRICTIVE FOR anon DENY` + `PERMISSIVE FOR
service_role`. The "Realtime" line lists whether the table is on the
`supabase_realtime` publication with `REPLICA IDENTITY FULL`.

Cardinality and semantics are summarised in the
[schema overview](schema-overview.md). Column-level evolution beyond what's
shown here lives in the [migration history](migration-history.md).

## Core video pipeline

### Table: `projects`

**Purpose:** One row per niche/channel direction. Holds AI-generated niche
profile (system prompt, expertise profile, blue-ocean strategy, red-ocean
list), playlist metadata (5 playlists), default model IDs and per-unit
costs, auto-pilot configuration, music preferences, niche viability digest,
weekly niche health score, and Style DNA. The widest projects-domain table —
~50 columns assembled across 10 migrations.

**Realtime:** yes (`REPLICA IDENTITY FULL`)  ·  **RLS:** locked-down (anon
denied, service_role permitted)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | TEXT NOT NULL | Operator-facing project name |
| `niche` | TEXT NOT NULL | Niche slug (e.g. `us_credit_cards`) |
| `niche_description` | TEXT | Long-form description fed into prompts |
| `channel_style` | TEXT | Default `'2hr_documentary'` |
| `niche_system_prompt` | TEXT | Phase A AI-generated system prompt |
| `niche_expertise_profile` | TEXT | "Senior Credit Card Analyst…" string |
| `niche_red_ocean_topics` | TEXT[] | Topics to AVOID |
| `style_dna` | TEXT | Locked per project, appended to every image prompt (added 004) |
| `auto_pilot_enabled` | BOOLEAN | Default false (added 004) |
| `auto_pilot_default_visibility` | TEXT | Default `'unlisted'` — never `'public'` (added 004) |
| `niche_viability_score` | INTEGER 0-100 | From `niche_viability_reports` (added 021) |
| `niche_health_score` | INTEGER 0-100 | Weekly Claude-computed (added 016) |
| `music_enabled` / `music_volume` / `music_mood_override` / `music_source` | mixed | Lyria + ducking config (added 014) |

…plus ~35 more across playlists, YouTube channel/playlist IDs, Drive folder
IDs, model defaults (`image_model`, `i2v_model`, `image_cost`, etc.), RPM
classification, viability fields, and analysis_group_id.

**Written by:** WF_PROJECT_CREATE, WF_NICHE_VIABILITY (viability fields),
WF_NICHE_HEALTH_CRON, dashboard `/settings`
**Read by:** every workflow that needs niche context (which is most of them)
**Migration history:** 001 (created), 004 (auto-pilot + style_dna), 007
(playlist 4 + 5), 010 (RPM cols), 014 (music prefs), 015 (audience),
016 (niche health), 019 (model defaults bumped to Seedream 4.5 + Seedance
2.0), 020 (channel_analysis_context, analysis_group_id), 021 (viability
digest)

---

### Table: `niche_profiles`

**Purpose:** Free-form research output from Phase A. Stores the JSONB
returned by Claude after web-searching the niche.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `project_id` | UUID FK → projects | CASCADE delete |
| `competitor_analysis` | JSONB | `{channels: [...], top_videos: [...], gaps: [...]}` |
| `audience_pain_points` | JSONB | `{reddit: [...], quora: [...], forums: [...]}` |
| `keyword_research` | JSONB | `{high_volume, low_competition, trending}` |
| `blue_ocean_opportunities` | JSONB | `{unoccupied_angles, value_curve_gaps}` |
| `search_queries_used` | TEXT[] | Audit |
| `search_results_raw` | JSONB | Audit |
| `created_at` | TIMESTAMPTZ | |

**Written by:** WF_PROJECT_CREATE
**Read by:** WF_TOPICS_GENERATE (via the intelligence renderer RPC since 029)
**Migration history:** 001

---

### Table: `prompt_configs`

**Purpose:** Per-project prompt templates with version history and
`is_active` flag. System-wide prompts live in `system_prompts` instead.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `project_id` | UUID FK | CASCADE |
| `prompt_type` | TEXT | e.g. `topic_generator`, `script_pass1` |
| `prompt_text` | TEXT | The actual template |
| `version` | INTEGER | |
| `is_active` | BOOLEAN | Only one active per (project_id, prompt_type) |

**Written by:** WF_PROJECT_CREATE (initial seed), dashboard `/settings`
prompt editor
**Read by:** every Claude-call workflow
**Migration history:** 001

---

### Table: `system_prompts`

**Purpose:** Universal prompt registry — one row per `prompt_type` (UNIQUE).
Holds the Master Topic Generator, the 3-pass script templates, the
evaluator, the metadata generator, and the music mood descriptor.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `prompt_type` | TEXT UNIQUE | e.g. `topic_generator_master` |
| `prompt_text` | TEXT | Full markdown prompt body (some are 30+ KB) |
| `version` | INTEGER | |
| `is_active` | BOOLEAN | |
| `description` | TEXT | One-liner shown in the dashboard's prompt editor |

**Written by:** migration 007 seed; dashboard prompt editor
**Read by:** WF_TOPICS_GENERATE, WF_SCRIPT_GENERATE, WF_SCRIPT_PASS,
WF_VIDEO_METADATA, WF_MUSIC_GENERATE
**Migration history:** 007 (`007_grand_master_integration.sql` creates the
table; `007_seed_system_prompts.sql` populates 8 rows)

---

### Table: `production_registers`

**Purpose:** Five seeded register rows. Each row's `config` JSONB carries
image_anchors, negative_additions, tts_voice, tts_speaking_rate,
music_bpm_min/max, music_mood_keywords, ken_burns_default_preset,
typical_scene_length_sec, transition_duration_ms, font_family. The
`REGISTER_05_ARCHIVE` row also carries `image_anchors_by_era` (1920s, 1960s,
1980s, 2000s, modern) for sub-LUT selection.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `register_id` | TEXT PK | One of `REGISTER_01_ECONOMIST`, `REGISTER_02_PREMIUM`, `REGISTER_03_NOIR`, `REGISTER_04_SIGNAL`, `REGISTER_05_ARCHIVE` |
| `name` | TEXT | Display name |
| `short_description` | TEXT | One-liner |
| `accent_color_hex` | TEXT | Brand swatch |
| `config` | JSONB NOT NULL | Production parameters keyed as above |
| `version` / `is_active` | mixed | Defaults 1 / true |

> **Note on naming:** the brief refers to this table as `register_specs`;
> the actual table is `production_registers`. There is no separate
> `register_specs` table.

**Written by:** migration 024 seed (idempotent ON CONFLICT update)
**Read by:** WF_IMAGE_GENERATION, WF_TTS_AUDIO, WF_MUSIC_GENERATE,
WF_KEN_BURNS
**Migration history:** 024

---

### Table: `topics`

**Purpose:** One row per video. The schema's largest single table —
~150 columns across all extensions. Carries Phase B topic metadata,
review/refinement state, the full 3-pass script as JSONB, scene/audio
production progress, intelligence scoring (outlier, SEO, hooks, viral
moments, predicted performance score), CTR predictions for title and
thumbnail, video ratio + production register selections, YouTube metadata
+ analytics + traffic-source breakdown, ROI, and ALL gate-status columns
(`review_status`, `script_review_status`, `video_review_status`).

**Realtime:** yes (`REPLICA IDENTITY FULL`)  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `project_id` | UUID FK | CASCADE |
| `topic_number` | INTEGER | 1-25 within project |
| `seo_title` | TEXT | The chosen title (also see `selected_title` from CF05) |
| `narrative_hook` | TEXT | 2-3 sentence cold open |
| `review_status` | TEXT | Gate 1 — `pending` / `approved` / `rejected` / `refined` |
| `script_review_status` | TEXT | Gate 2 |
| `video_review_status` | TEXT | Gate 3 |
| `script_json` | JSONB | Full Pass-1+2+3 scenes array |
| `pipeline_stage` | TEXT | `pending` → `scripting` → `cost_selection` → `register_selection` → `classifying` → `tts` → `images` → `i2v` → `ken_burns` → `assembly` → `render` → `complete` (constraint extended in 025) |
| `outlier_score` / `seo_score` | INTEGER 0-100 | CF01 + CF02 (added 010) |
| `predicted_performance_score` | INTEGER 0-100 | CF13 PPS (added 013) |
| `title_options` / `selected_title` / `title_ctr_score` | mixed | CF05 (added 012) |
| `thumbnail_ctr_score` / `thumbnail_decision` | mixed | CF06 (added 012) |
| `viral_moments` / `hook_scores` | JSONB | CF12 (added 013) |
| `production_mode` / `production_register` | TEXT | Register-gate selections (added 023) |
| `yt_views` / `yt_ctr` / `yt_estimated_revenue` / `yt_traffic_source_breakdown` | mixed | YouTube Analytics pull |
| `production_cost_usd` / `roi_pct` / `break_even_views` | DECIMAL | CF15 (added 016) |

…plus ~110 more covering avatar fields, script attempts/scoring, drive IDs,
YouTube IDs, refinement history, intelligence sub-scores, audience-source
fields, and timestamp columns for every stage. Full schema across
migrations 001, 003, 007, 010, 011, 012, 013, 016, 019, 023.

**Written by:** WF_TOPICS_GENERATE (initial 25 rows), every gate-action
webhook, every production workflow stage
**Read by:** every dashboard page, every production workflow
**Migration history:** see above

---

### Table: `avatars`

**Purpose:** One customer avatar per topic.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `topic_id` | UUID FK | CASCADE |
| `project_id` | UUID FK | CASCADE (denormalised) |
| `video_title_short` | TEXT | |
| `avatar_name_age` | TEXT | "Marcus, 34" |
| `occupation_income` | TEXT | "Software engineer, $145K" |
| `pain_point` | TEXT | |
| `emotional_driver` | TEXT | |
| `dream_outcome` | TEXT | |
| `psychographics` | TEXT | Added 007 |
| `key_emotional_drivers` | TEXT | Added 007 |
| `target_audience_segment` | TEXT | Added 007 |
| `viewer_search_intent` | TEXT | Added 007 |

**Written by:** WF_TOPICS_GENERATE
**Read by:** WF_SCRIPT_GENERATE (avatar fields fan into Pass 1 prompt)
**Migration history:** 001 (created), 007 (richer v3.0 fields)

---

### Table: `scenes`

**Purpose:** Per-scene manifest. One row per scene per topic (~172 per
long-form video). Carries narration, image prompt, audio + image + video
URLs, per-stage status, cinematic fields (color_mood, zoom_direction,
transition_to_next, composition_prefix, selective_color_element), and the
hybrid-pipeline video clip placement.

**Realtime:** yes (`REPLICA IDENTITY FULL`)  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `topic_id` | UUID FK | CASCADE |
| `project_id` | UUID FK | denormalised |
| `scene_number` | INTEGER | 1..N |
| `scene_id` | TEXT | e.g. `scene_001` |
| `narration_text` | TEXT | TTS input |
| `image_prompt` | TEXT | Seedream 4.5 input (composition_prefix + subject + style_dna) |
| `visual_type` | TEXT | Always `static_image` since 003 |
| `audio_duration_ms` | INTEGER | Master clock |
| `image_url` / `video_url` | TEXT | Drive URLs |
| `audio_status` / `image_status` / `video_status` / `clip_status` | TEXT | Per-stage |
| `color_mood` / `zoom_direction` | TEXT | Added 003; map to FFmpeg filter chains |
| `composition_prefix` / `selective_color_element` | TEXT | Added 003 |
| `caption_highlight_word` | TEXT | Added 003; **constrained to ≤40 chars + safe ASCII charset by 031** |
| `transition_to_next` | TEXT | xfade type |
| `has_video` / `video_clip_url` / `video_placement_start_ms` / `video_placement_end_ms` | mixed | Hybrid pipeline (added 019) |
| `scene_classification` | TEXT | `motion_required` / `motion_beneficial` / `static_optimal` (added 019) |
| `production_register` | TEXT | Stamped by WF_SCENE_CLASSIFY (added 023) |

**Written by:** WF_SCRIPT_GENERATE (initial INSERT), every per-scene
production workflow (UPDATE per stage)
**Read by:** every dashboard scene viewer, every production workflow
**Migration history:** 001 (created), 003 (cinematic fields), 005 (Remotion
hybrid — DROPPED by 009), 009 (cleanup), 019 (hybrid I2V), 023 (register
stamp), 031 (caption_highlight_word CHECK)

---

### Table: `shorts`

**Purpose:** Short-form clip rows. One row per viral candidate (typically
20 per long-form topic). Carries virality score + reason, rewritten
short-form narration + image prompts, emphasis word map, per-platform
status + post IDs + analytics.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `topic_id` / `project_id` | UUID FK | CASCADE |
| `clip_number` / `start_scene` / `end_scene` | INTEGER | Source-scene span |
| `virality_score` | INTEGER 1-10 | |
| `clip_title` / `hook_text` / `hashtags` / `caption` | mixed | Authored content |
| `rewritten_narration` / `rewritten_image_prompts` / `emphasis_word_map` | JSONB | Re-built for short-form |
| `short_form_style` | TEXT | Default `'tiktok_bold'` |
| `portrait_drive_id` / `portrait_drive_url` | TEXT | Final 9:16 mp4 |
| `thumbnail_url` / `srt_text` | TEXT | |
| `review_status` / `production_status` / `production_progress` | TEXT | Pipeline state |
| `tiktok_status` / `tiktok_post_id` / `tiktok_views` / `tiktok_likes` / `tiktok_comments` / `tiktok_shares` | mixed | TikTok per-platform block |
| `instagram_*` | mixed | Same shape for Instagram |
| `youtube_shorts_*` | mixed | Same shape for YouTube Shorts |

**Written by:** WF_SHORTS_ANALYZE (initial 20 rows at Gate 4),
WF_SHORTS_PRODUCE (production fields), WF_SOCIAL_POSTER (per-platform
status + post IDs), WF_SOCIAL_ANALYTICS (per-platform metrics)
**Read by:** dashboard `/shorts` and `/social` pages
**Migration history:** **Not in `supabase/migrations/`.** Created by
`skills.sh` bootstrap (and CLAUDE.md describes it as "incl. shorts +
social_accounts tables" in migration 001 — the description is aspirational;
the bootstrap is the ground truth).

---

### Table: `cost_calculator_snapshots`

**Purpose:** Audit row per Cost Calculator gate decision. Captures the four
ratio options shown to the operator and the one they picked.

**Realtime:** yes (added to publication in 019)  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `topic_id` / `project_id` | UUID FK | CASCADE |
| `scene_count` | INTEGER | |
| `options` | JSONB NOT NULL | The four `100_0` / `95_5` / `90_10` / `85_15` cost projections |
| `selected_option` | TEXT | One of the four (CHECK) |
| `scene_classifications` | JSONB | The motion classifications at decision time |
| `selected_at` | TIMESTAMPTZ | |

**Written by:** dashboard Cost Calculator → `/webhook/cost/select`
**Read by:** dashboard for audit, WF_SCENE_CLASSIFY (uses `selected_option`)
**Migration history:** 019

---

### Table: `keywords`

**Purpose:** Project-scoped keyword graph. Stores discovered keywords with
search-volume proxies, competition signals, and opportunity scores.

**Realtime:** yes (added to publication in 010)  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `project_id` | UUID FK | CASCADE |
| `keyword` / `normalized_keyword` | VARCHAR | UNIQUE on `(project_id, normalized_keyword)` |
| `search_volume_proxy` / `autocomplete_hits` / `competing_videos_count` | INTEGER | |
| `competition_level` | VARCHAR(10) | `low` / `medium` / `high` (CHECK) |
| `opportunity_score` | INTEGER 0-100 | |
| `seo_classification` | VARCHAR(20) | `blue-ocean` / `competitive` / `red-ocean` / `dead-sea` |
| `related_keywords` | JSONB | Array of `{keyword, autocomplete_hits}` |
| `trend_signal` | VARCHAR(20) | `rising` / `stable` / `declining` |
| `times_used_in_topics` | INTEGER | Bumped by topic_keywords inserts |

**Written by:** keyword scan workflow
**Read by:** dashboard keyword research panels
**Migration history:** 010

---

### Table: `topic_keywords`

**Purpose:** Junction table linking topics to researched keywords with a
relevance score and a primary-keyword flag.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` / `keyword_id` | UUID | UNIQUE on `(topic_id, keyword_id)` |
| `relevance_score` | INTEGER 0-100 | |
| `is_primary` | BOOLEAN | One primary per topic (not enforced by constraint) |

**Written by:** WF_TOPICS_GENERATE (links chosen topics to keywords)
**Read by:** dashboard keyword research panels
**Migration history:** 010

---

## Production audit

### Table: `production_log`

**Purpose:** Original audit trail (singular, from migration 001). One row
per stage transition.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` / `topic_id` | UUID | |
| `stage` | TEXT | e.g. `script_generation` |
| `action` | TEXT | `started` / `completed` / `failed` / `retried` / `skipped` |
| `details` | JSONB | Free-form |
| `created_at` | TIMESTAMPTZ | |

**Migration history:** 001

---

### Table: `production_logs`

**Purpose:** Structured per-API-call log (note plural — both tables
coexist). The single source of truth for cost roll-ups.

**Realtime:** yes (added in 004)  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` | UUID | CASCADE |
| `stage` | TEXT | `tts` / `image_gen` / `ken_burns` / `color_grade` / `captions` / `assembly` / `render` |
| `scene_number` | INTEGER | Nullable (e.g. for whole-topic actions) |
| `action` / `status` | TEXT | `started` / `completed` / `failed` / `retried` |
| `duration_ms` | INTEGER | |
| `cost_usd` | NUMERIC(8,4) | Aggregated into `topics.production_cost_usd` |
| `error_message` | TEXT | |
| `retry_count` | INTEGER | |
| `metadata` | JSONB | |

**Written by:** every external API call wrapper (Fal.ai, Claude, Google
TTS, YouTube)
**Read by:** dashboard `/topic/:id` ProductionMonitor; the cost-rollup
trigger that bumps `topics.production_cost_usd`
**Migration history:** 004

---

### Table: `renders`

**Purpose:** One row per platform export of a topic.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` / `project_id` | UUID | |
| `platform` | TEXT | `youtube_long` / `youtube_shorts` / `tiktok` / `instagram` |
| `file_url` / `file_drive_id` | TEXT | |
| `file_size_bytes` | BIGINT | |
| `render_time_seconds` | INTEGER | |
| `crf` / `preset` / `max_bitrate` / `audio_bitrate` / `resolution` | mixed | Encoding params |
| `status` | TEXT | |

**Migration history:** 004

---

### Table: `music_library`

**Purpose:** Catalogue of background-music tracks (Lyria-generated or
hand-uploaded) referenced by mood when assembling a video's audio bed.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `mood_tags` | TEXT[] | e.g. `['tense', 'hopeful', 'triumphant', 'reflective']` |
| `bpm` | INTEGER | |
| `duration_seconds` | INTEGER | |
| `file_url` / `file_drive_id` | TEXT | |
| `instrument_palette` | TEXT | e.g. `'low cello drone, sparse piano'` |

**Migration history:** 004

---

## Shorts + social

### Table: `social_accounts`

**Purpose:** Per-project OAuth tokens for posting workflows. **One of two
tables holding production secrets in the database** (the other being
`prompt_configs` if it stores API keys, which it does not). Locked down
extra-aggressively by 030.

**Realtime:** no  ·  **RLS:** locked-down (anon DENY restrictive policy)

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` | UUID | CASCADE |
| `platform` | TEXT NOT NULL | `tiktok` / `instagram` / `youtube` |
| `account_name` / `account_id` | TEXT | |
| `access_token` / `refresh_token` | TEXT | OAuth credentials |
| `token_expires_at` | TIMESTAMPTZ | |
| `is_active` | BOOLEAN | |

**Written by:** OAuth callback workflows
**Read by:** WF_SOCIAL_POSTER, WF_SOCIAL_ANALYTICS
**Migration history:** **Not in `supabase/migrations/`.** Same source as
`shorts` — created by `skills.sh` bootstrap.

---

### Table: `scheduled_posts`

**Purpose:** Calendar scheduling state. The every-15-min cron picks up rows
where `status = 'scheduled' AND scheduled_at <= NOW()` and dispatches them
to `WF_SCHEDULE_PUBLISHER`.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` / `project_id` | UUID | CASCADE |
| `platform` | TEXT NOT NULL | `youtube` / `tiktok` / `instagram` |
| `scheduled_at` | TIMESTAMPTZ NOT NULL | |
| `status` | TEXT | `scheduled` / `publishing` / `published` / `failed` / `cancelled` |
| `published_at` | TIMESTAMPTZ | |
| `visibility` | TEXT | `public` / `unlisted` / `private` (default `unlisted`) |
| `error_message` | TEXT | |

**Migration history:** 004

---

### Table: `platform_metadata`

**Purpose:** Per-platform title/description/tags for a topic. UNIQUE on
`(topic_id, platform)`.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` | UUID | CASCADE |
| `platform` | TEXT NOT NULL | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `tags` / `hashtags` | TEXT[] | |
| `thumbnail_url` / `thumbnail_text` | TEXT | |

**Migration history:** 004

---

## CTR + AB testing

### Table: `ab_tests`

**Purpose:** One AB-test definition per topic. Drives title and/or
thumbnail rotation against the live YouTube video, with statistical
confidence tracking and an `is_winner` promotion step.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` / `project_id` | UUID | `project_id` denormalized |
| `youtube_video_id` | VARCHAR(20) | Set after publish |
| `test_type` | VARCHAR(20) | `title` / `thumbnail` / `combined` |
| `status` | VARCHAR(20) | `pending` / `running` / `paused` / `completed` / `aborted` |
| `min_impressions_per_variant` / `min_days_per_variant` | INTEGER | Test gating thresholds |
| `rotation_interval_hours` | INTEGER | Default 48 |
| `confidence_threshold` | FLOAT | Default 0.95 |
| `current_variant_id` / `winning_variant_id` | UUID | Soft-FK to `ab_test_variants` |
| `last_rotated_at` / `started_at` / `completed_at` | TIMESTAMPTZ | |
| `winner_applied` | BOOLEAN | Was the winner promoted as the permanent live version? |

**Migration history:** 012

---

### Table: `ab_test_variants`

**Purpose:** The candidate titles/thumbnails being rotated for an
`ab_tests` row. Up to 5 variants per test; baseline is `variant_order = 0`.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `ab_test_id` | UUID | |
| `variant_label` | VARCHAR(10) | `'A'` / `'B'` / `'C'` (unique per test) |
| `variant_order` | INTEGER | 0 = baseline, 1+ = challengers |
| `title` | VARCHAR(500) | Null if thumbnail-only test |
| `thumbnail_url` / `thumbnail_drive_id` | mixed | Null if title-only test |
| `predicted_ctr_score` | INTEGER | From CF05/CF06 pre-publish scoring |
| `total_impressions` / `total_views` / `total_ctr` | mixed | Cumulative while live |
| `total_hours_live` / `rotation_count` / `last_live_at` | mixed | Live-time accounting |
| `confidence_score` | FLOAT | Statistical confidence this variant is the winner |
| `is_winner` | BOOLEAN | |

**Migration history:** 012

---

### Table: `ab_test_impressions`

**Purpose:** Per-window impressions/views snapshots from YouTube Analytics,
keyed to the variant that was live during the window. Drives the rolling
CTR + significance computation.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `ab_test_variant_id` / `ab_test_id` | UUID | |
| `snapshot_at` | TIMESTAMPTZ | When this row was captured |
| `window_start` / `window_end` | TIMESTAMPTZ | Measurement window |
| `impressions` / `views` | INTEGER | Delta in this window |
| `ctr` | FLOAT | `views / impressions` for this window |
| `avg_view_duration_seconds` | FLOAT | |
| `source` | VARCHAR(30) | Default `'youtube_analytics_api'` |

**Migration history:** 012

---

## Engagement

### Table: `comments`

**Purpose:** Unified engagement feed across YouTube/TikTok/Instagram with
AI-classified sentiment + intent.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` / `project_id` | UUID | CASCADE |
| `platform` / `platform_comment_id` | TEXT | |
| `author` / `author_avatar_url` | TEXT | |
| `text` | TEXT NOT NULL | |
| `sentiment` | TEXT | `positive` / `negative` / `neutral` |
| `intent_score` | NUMERIC(3,2) | 0.00-1.00 |
| `intent_signals` | TEXT[] | e.g. `['link_request', 'price_inquiry']` |
| `like_count` | INTEGER | |
| `replied` / `reply_text` / `replied_at` | mixed | Operator-driven |
| `fetched_at` / `created_at` | TIMESTAMPTZ | |

**Migration history:** 004

---

### Table: `audience_comments`

**Purpose:** Per-comment classification feeding the audience memory
synthesis. Separate from `comments` because this one is project-scoped
audience memory; `comments` is per-video conversation.

**Realtime:** no (high-volume)  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` / `topic_id` | UUID | |
| `youtube_video_id` / `youtube_comment_id` | VARCHAR | UNIQUE on `(project_id, youtube_comment_id)` |
| `author_display_name` / `author_channel_id` | VARCHAR | For persona correlation |
| `comment_text` | TEXT | |
| `classification` | VARCHAR(20) | `question` / `complaint` / `praise` / `suggestion` / `noise` (CHECK) |
| `extracted_intent` | TEXT | Haiku-extracted one-liner |
| `language_hint` | VARCHAR(10) | ISO 2-letter |
| `classified_at` / `classified_by` / `first_seen_at` | mixed | |

**Migration history:** 017

---

### Table: `audience_insights`

**Purpose:** Weekly project-scoped synthesis from Opus. Renders the
`audience_context_block` injected into Pass 1 of every script generation.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` | UUID | UNIQUE on `(project_id, week_of)` |
| `week_of` | DATE | Sunday |
| `comments_analyzed` / `questions_count` / `complaints_count` / `praise_count` / `suggestions_count` / `noise_count` | INTEGER | |
| `recurring_questions` / `content_complaints` / `topic_suggestions` | JSONB | Arrays of structured items |
| `audience_persona_summary` | TEXT | One paragraph |
| `vocabulary_level` | VARCHAR(20) | `beginner` / `intermediate` / `advanced` / `mixed` |
| `audience_context_block` | TEXT | Pre-rendered prompt block |
| `synthesis_cost_usd` | FLOAT | |

**Migration history:** 017

---

## Topic Intelligence research

### Table: `research_runs`

**Purpose:** One row per `/webhook/research/run` invocation.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` | UUID | CASCADE |
| `status` | TEXT | `pending` / `scraping` / `categorizing` / `complete` / `failed` |
| `sources_completed` | INTEGER | 0-5 |
| `total_results` / `total_categories` | INTEGER | |
| `derived_keywords` | TEXT[] | AI-derived per-niche |
| `platforms` | TEXT[] | Default `['reddit','youtube','tiktok','trends','quora']` (added 006) |
| `time_range` | TEXT | Default `'7d'` (added 006, replaces older `lookback_days`) |
| `started_at` / `completed_at` | TIMESTAMPTZ | |
| `error_log` | JSONB | Append-only |

**Migration history:** 002 (created), 006 (platforms + time_range,
`lookback_days` dropped)

---

### Table: `research_results`

**Purpose:** ~50 raw scraped items per run (10 per source × 5 sources).

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `run_id` / `project_id` | UUID | CASCADE on run_id |
| `source` | TEXT | `reddit` / `youtube` / `tiktok` / `google_trends` / `quora` |
| `raw_text` | TEXT NOT NULL | |
| `source_url` | TEXT NOT NULL | |
| `engagement_score` | INTEGER | Per-source ranking formula (see migration 002 footer) |
| `upvotes` / `comments` / `shares` | INTEGER | |
| `posted_at` | TIMESTAMPTZ | |
| `ai_video_title` | TEXT | Suggested title from categoriser |
| `category_id` | UUID FK → research_categories | SET NULL (added 002) |
| `metadata` | JSONB | |

**Migration history:** 002

---

### Table: `research_categories`

**Purpose:** AI-generated clusters per run, ranked.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `run_id` / `project_id` | UUID | CASCADE |
| `label` | TEXT NOT NULL | 3-6 words |
| `summary` | TEXT | 2-3 sentences |
| `total_engagement` / `result_count` / `rank` | INTEGER | |
| `top_video_title` | TEXT | Best title from cluster |

**Migration history:** 002

---

## Intelligence Layer

### Table: `rpm_benchmarks`

**Purpose:** Static RPM lookup for 12 niches (finance, credit_cards,
insurance, health_wellness, software_saas, education, business, gaming,
entertainment, travel, cooking, tech_reviews). Seeded by 010.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `category` | VARCHAR(50) UNIQUE | Lookup key |
| `display_name` | VARCHAR(100) | |
| `rpm_low` / `rpm_mid` / `rpm_high` | FLOAT NOT NULL | USD per 1000 views |
| `notes` | TEXT | |

**Migration history:** 010

---

### Tables: `competitor_channels`, `competitor_videos`, `competitor_alerts`, `competitor_intelligence`

**Purpose:** CF04 Competitor Channel Monitor + weekly synthesis. The four
tables form a pipeline: channels are tracked → videos are crawled →
outliers raise alerts → weekly Claude generates a synthesis row.

**Realtime:** all four are on the publication  ·  **RLS:** all locked-down

`competitor_channels` (~25 columns) — channel_id, channel_name,
uploads_playlist_id, subscriber_count, avg_views_30d/90d, last_checked_at,
consecutive_fetch_failures.

`competitor_videos` (~20 columns) — title, thumbnail_url, published_at,
duration_seconds, is_shorts, views_24h/7d/30d, is_outlier, outlier_ratio,
matched_topic_id.

`competitor_alerts` — alert_type (CHECK: outlier_breakout / topic_match /
rapid_growth / channel_surge / style_dna_ready), severity (low/normal/
high/critical), is_read, is_dismissed.

`competitor_intelligence` — week_of (UNIQUE per project), top_topic_clusters
JSONB, emerging_patterns JSONB, summary_markdown.

**Migration history:** 011

---

### Table: `style_profiles`

**Purpose:** CF14 Style DNA per analysed channel — title formulas, thumbnail
DNA, content pillars, upload cadence.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` / `competitor_channel_id` | UUID | |
| `channel_id` / `channel_name` / `channel_url` | VARCHAR/TEXT | |
| `title_formulas` | JSONB | Array of `{pattern_name, template, frequency_pct, ...}` |
| `title_stats` | JSONB | Aggregate stats |
| `thumbnail_dna` | JSONB | `{dominant_colors, text_position, face_presence_pct, ...}` |
| `content_pillars` | JSONB | Array of pillars with example_titles |
| `upload_cadence` | JSONB | `{uploads_per_week, preferred_days, ...}` |
| `replication_difficulty` | VARCHAR(10) | `easy` / `medium` / `hard` |
| `style_summary` | TEXT | |
| `applied_to_project` / `applied_at` | mixed | Operator pin |

**Migration history:** 011

---

### Tables: `ab_tests`, `ab_test_variants`, `ab_test_impressions`

**Purpose:** CF17 A/B Testing Engine. Rotates title and/or thumbnail
variants on live YouTube videos and snapshots CTR per window.

**Realtime:** `ab_tests` + `ab_test_variants` on publication;
`ab_test_impressions` is time-series (no realtime)
**RLS:** all locked-down

`ab_tests` — test_type (CHECK: title / thumbnail / combined), status
(pending / running / paused / completed / aborted), rotation_interval_hours,
confidence_threshold, current_variant_id, winning_variant_id,
winner_applied.

`ab_test_variants` — variant_label (A/B/C), title, thumbnail_url,
predicted_ctr_score, total_impressions, total_views, total_ctr,
rotation_count, confidence_score, is_winner.

`ab_test_impressions` — snapshot_at, window_start, window_end, impressions,
views, ctr, avg_view_duration_seconds (delta values per window).

**Migration history:** 012

---

### Table: `pps_config`

**Purpose:** Per-project PPS factor weights (one row per project) with a
sum-to-1.0 CHECK constraint.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` | UUID UNIQUE | |
| `outlier_weight` | FLOAT | Default 0.30 |
| `seo_weight` | FLOAT | Default 0.20 |
| `script_quality_weight` | FLOAT | Default 0.20 |
| `niche_health_weight` | FLOAT | Default 0.15 |
| `thumbnail_ctr_weight` | FLOAT | Default 0.10 |
| `title_ctr_weight` | FLOAT | Default 0.05 |
| `calibration_sample_count` | INTEGER | |

**Migration history:** 013

---

### Table: `pps_calibration`

**Purpose:** Post-publish predicted-vs-actual variance for weight
regression.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` / `project_id` | UUID | UNIQUE on `(topic_id, calibration_run_at)` |
| `predicted_pps` | INTEGER | |
| `pps_breakdown` | JSONB | Snapshot of per-factor scores at prediction time |
| `actual_views_7d` / `actual_views_30d` / `actual_impressions_30d` / `actual_ctr` | mixed | |
| `actual_revenue_usd` | FLOAT | |
| `implied_actual_score` | INTEGER | Normalised 0-100 |
| `variance_pct` | FLOAT | (implied_actual − predicted) / predicted |

**Migration history:** 013

---

### Table: `daily_ideas`

**Purpose:** CF08 — daily Opus-generated batch of 15-20 ranked topic ideas,
contextualised by niche + competitor activity + trending keywords.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` | UUID | CASCADE |
| `run_date` | DATE | One batch per project per day |
| `batch_id` | UUID | Groups all ideas from one run |
| `position_in_batch` | INTEGER | 1-20 |
| `idea_title` | VARCHAR(300) | |
| `idea_angle` | TEXT | |
| `viral_potential_score` / `seo_opportunity_score` / `rpm_fit_score` / `combined_score` | INTEGER 0-100 | |
| `rationale` | TEXT | |
| `source_signals` | JSONB | `{competitor_titles, trending_keywords, recent_topics}` |
| `status` | VARCHAR(20) | `pending` / `saved` / `dismissed` / `used` |
| `used_as_topic_id` | UUID FK → topics | SET NULL on topic delete |

**Migration history:** 015

---

### Tables: `coach_sessions`, `coach_messages`

**Purpose:** CF09 AI Growth Coach conversational advisor with persistent
session history and project-context injection.

**Realtime:** both on publication  ·  **RLS:** both locked-down

`coach_sessions` — title (auto-derived), focus_area (growth / monetization /
competitors / content / general), message_count, total_input_tokens,
total_output_tokens, estimated_cost_usd, last_message_at, is_archived.

`coach_messages` — turn_index, role (user/assistant/system), content,
context_snapshot JSONB (project_state, competitor_activity, pps_trends,
niche_health, recent_topics at turn time), input_tokens, output_tokens,
cost_usd, claude_model.

**Migration history:** 015

---

### Table: `niche_health_history`

**Purpose:** Weekly 0-100 niche health score per project with momentum
trend.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `project_id` | UUID | UNIQUE on `(project_id, week_of)` |
| `week_of` | DATE | Sunday |
| `health_score` | INTEGER 0-100 NOT NULL | |
| `classification` | VARCHAR(20) | `thriving` / `stable` / `warning` / `critical` |
| `momentum_trend` | VARCHAR(20) | `rising` / `stable` / `declining` |
| `saturation_signal` | BOOLEAN | |
| `competitor_velocity_score` / `new_channel_entry_score` / `topic_freshness_score` / `rpm_stability_score` | INTEGER | Sub-factor contributions |
| `score_breakdown` | JSONB | Full factor JSON for tooltip |
| `week_over_week_delta` | INTEGER | |
| `insight_summary` | TEXT | Claude one-liner |

**Migration history:** 016

---

### Table: `revenue_attribution`

**Purpose:** Per-topic monthly snapshot — production cost, views, revenue,
RPM, ROI.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `topic_id` / `project_id` | UUID | UNIQUE on `(topic_id, snapshot_month)` |
| `snapshot_month` | DATE | YYYY-MM-01 |
| `youtube_video_id` | VARCHAR(20) | |
| `production_cost_usd` | DECIMAL(8,3) | |
| `cost_breakdown` | JSONB | |
| `views_30d` / `impressions_30d` | INTEGER | |
| `ctr_30d` / `avg_view_duration_seconds` | FLOAT | |
| `estimated_revenue_usd` | DECIMAL(10,2) | |
| `actual_rpm_usd` | DECIMAL(6,2) | revenue / (views / 1000) |
| `rpm_vs_niche_benchmark_pct` | DECIMAL(6,2) | |
| `roi_pct` | DECIMAL(8,2) | |
| `break_even_achieved` | BOOLEAN | |
| `analytics_api_successful` / `analytics_error_message` | mixed | |

**Migration history:** 016

---

## Channel analyzer + viability

### Table: `channel_analyses`

**Purpose:** Standalone YouTube channel deep-dives.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `youtube_channel_id` | TEXT NOT NULL | |
| `channel_name` / `channel_url` / `channel_description` / `channel_avatar_url` / `channel_banner_url` | mixed | |
| `subscriber_count` / `total_view_count` / `video_count` | mixed | |
| `avg_views_per_video` / `median_views_per_video` / `upload_frequency_days` | mixed | |
| `growth_trajectory` | TEXT | `accelerating` / `stable` / `decelerating` / `dormant` |
| `primary_topics` | TEXT[] | |
| `title_patterns` / `thumbnail_patterns` / `scripting_depth` | JSONB | |
| `top_videos` | JSONB | |
| `strengths` / `weaknesses` | TEXT[] | |
| `blue_ocean_opportunities` / `content_saturation_map` | JSONB | |
| `verdict` | TEXT | `strong_opportunity` / `moderate_opportunity` / `weak_opportunity` / `avoid` |
| `verdict_score` | INTEGER 0-100 | |
| `analysis_group_id` | UUID FK → analysis_groups | Added by 022 |
| `project_id` | UUID FK → projects | SET NULL |
| `analysis_cost_usd` / `analysis_duration_seconds` | mixed | |

**Migration history:** 020 (created), 022 (FK to analysis_groups)

---

### Table: `channel_comparison_reports`

**Purpose:** Multi-channel comparison aggregating multiple
`channel_analyses` into a single report.

**Realtime:** no  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `analysis_group_id` | UUID | |
| `channel_analysis_ids` | UUID[] NOT NULL | |
| `combined_topic_landscape` / `combined_blue_ocean_gaps` / `combined_saturation_map` | JSONB | |
| `differentiation_strategy` | TEXT | |
| `recommended_niche_description` | TEXT | |
| `recommended_content_pillars` | TEXT[] | |
| `overall_verdict` / `overall_verdict_score` | mixed | |
| `project_id` | UUID FK | SET NULL |

**Migration history:** 020

---

### Table: `discovered_channels`

**Purpose:** Auto-discovered competitor channels staged before deep
analysis.

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `analysis_group_id` / `source_channel_analysis_id` | UUID | UNIQUE on `(analysis_group_id, youtube_channel_id)` |
| `youtube_channel_id` / `channel_name` / `channel_handle` | mixed | |
| `subscriber_count` / `total_view_count` / `video_count` / `avg_views_per_video` | mixed | |
| `discovery_method` | TEXT | `keyword_search` / `related_channels` / `tag_match` / `manual` |
| `discovery_rank` | INTEGER | |
| `relevance_score` | INTEGER 0-100 | |
| `analysis_depth` | TEXT | `quick` / `medium` / `deep` |
| `analysis_status` | TEXT | `discovered` / `analyzing` / `completed` / `skipped` / `failed` |
| `channel_analysis_id` | UUID FK | SET NULL once analysed |

**Migration history:** 021

---

### Table: `niche_viability_reports`

**Purpose:** One per analysis group. Carries the headline viability score
plus four weighted factors, monetization estimates, blue-ocean strategy,
moat indicators, revenue projections, and seed content (recommended_topics,
topics_to_avoid, content pillars, title/thumbnail DNA).

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` / `analysis_group_id` / `project_id` | UUID | |
| `channels_analyzed` / `total_subscribers` / `total_monthly_views` | mixed | |
| `viability_score` | INTEGER 0-100 NOT NULL | |
| `viability_verdict` / `viability_reasoning` | mixed | |
| `monetization_score` / `monetization_breakdown` | INTEGER + JSONB | |
| `audience_demand_score` / `audience_demand_breakdown` | INTEGER + JSONB | |
| `competition_gap_score` / `competition_gap_breakdown` | INTEGER + JSONB | |
| `entry_ease_score` / `entry_ease_breakdown` | INTEGER + JSONB | **Renamed from `entry_difficulty_*` by migration 026** |
| `estimated_rpm_low/mid/high` | NUMERIC(6,2) | |
| `ad_category` / `sponsorship_potential` | mixed | |
| `blue_ocean_opportunities` / `saturated_topics` / `recommended_topics` | JSONB | |
| `topics_to_avoid` | TEXT[] | |
| `recommended_angle` / `recommended_content_pillars` / `differentiation_strategy` | mixed | |
| `moat_indicators` / `revenue_projections` | JSONB | |
| `script_depth_targets` / `title_dna_patterns` / `thumbnail_dna_patterns` | JSONB | |
| `analysis_cost_usd` | NUMERIC(8,4) | |

**Migration history:** 021 (created), 026 (entry_difficulty → entry_ease
column rename)

---

### Table: `analysis_groups`

**Purpose:** Named container for channel analyses with self-healing counter
columns (added by 026 triggers).

**Realtime:** yes  ·  **RLS:** locked-down

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` / `description` | TEXT | |
| `status` | TEXT | `active` / `archived` |
| `channels_count` / `completed_count` | INTEGER | Self-healed by 026 trigger from `channel_analyses` |
| `has_viability_report` | BOOLEAN | Self-healed by 026 trigger from `niche_viability_reports` |
| `viability_score` | INTEGER 0-100 | Self-healed by 026 trigger |
| `viability_phase` | TEXT | `idle` / `validating` / `aggregating` / `analyzing` / `writing_report` / `linking` / `done` / `failed` (added 027) |
| `viability_started_at` / `viability_error` | mixed | Added 027 |
| `project_id` | UUID FK | SET NULL |

**Migration history:** 022 (created), 026 (trigger functions
`sync_analysis_group_counters` + `sync_analysis_group_viability`,
backfill, retroactive `entry_difficulty_*` rename), 027 (viability progress
columns)

---

## YouTube discovery + per-video analysis

### Tables: `yt_discovery_runs`, `yt_discovery_results`, `yt_video_analyses`

**Purpose:** Niche-research engine that scrapes top YouTube channels by
keyword and surfaces high-engagement videos. `yt_video_analyses` is
per-video Claude analysis (incl. `ten_x_strategy`, `content_quality`,
`comment_insights`) consumed by the intelligence renderer in 029.

**Realtime:** unknown — not in any numbered migration  ·  **RLS:** locked
down by 030 (which lists all three by name)

> **Schema source missing.** No CREATE TABLE for these three tables exists
> in `supabase/migrations/`. They are referenced by:
> - migration 011 (FK soft-link from `competitor_channels.yt_discovery_result_id`),
> - migration 029 (the renderer reads `yt_video_analyses` columns),
> - migration 030 (the lockdown lists all three),
> - dashboard `useYouTubeDiscovery` hook,
> - workflows `WF_YOUTUBE_DISCOVERY`, `WF_YOUTUBE_ANALYZE`.
>
> Treat the live VPS Postgres as the schema source-of-truth; capture into
> a future migration before next clone.

**Migration history:** not in `supabase/migrations/` (live-applied only)
