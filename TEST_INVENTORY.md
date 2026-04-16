# TEST_INVENTORY.md — Phase 0 Reconnaissance
**Generated:** 2026-04-16 | **Branch:** main | **Commit:** 7d10bae

---

## 1. n8n Workflows (59 files in `workflows/`)

### Production Workflows (40)

| # | Filename | Trigger | Webhook Path | External APIs | Error Branch | Supabase Fail Write | Chain Target |
|---|----------|---------|--------------|---------------|:---:|:---:|---|
| 1 | WF_MASTER.json | Webhook | `master/start` | Supabase REST | Yes | Yes | Routes to all sub-workflows |
| 2 | WF_PROJECT_CREATE.json | Webhook | `project/create` | Anthropic (Opus 4.6), Supabase | Yes | Yes | WF_MASTER, WF_RPM_CLASSIFY |
| 3 | WF_TOPICS_GENERATE.json | Webhook+Execute | `topics/generate` | Anthropic (Opus 4.6), Fal.ai | Yes | Yes | WF_OUTLIER_SCORE+WF_SEO_SCORE |
| 4 | WF_TOPICS_ACTION.json | Webhook | `topics/action` | Anthropic (Sonnet 4.6) refine | Yes | Yes | WF_SCRIPT_GENERATE |
| 5 | WF_SCRIPT_GENERATE.json | Execute Workflow | — | Anthropic (Opus 4.6) | Yes | Yes | WF_SCRIPT_APPROVE |
| 6 | WF_SCRIPT_PASS.json | Execute Workflow | — | Anthropic (Opus 4.6) | Yes | Yes | — |
| 7 | WF_SCRIPT_APPROVE.json | Webhook | `script/approve` | — | Yes | No | WF_CTR_OPTIMIZE+WF_HOOK_ANALYZER+WF_VIRAL_TAG |
| 8 | WF_SCRIPT_REJECT.json | Webhook | `script/reject` | — | Yes | Yes | — |
| 9 | WF_TTS_AUDIO.json | Webhook | `production/tts` | Google Cloud TTS (Chirp 3 HD) | Yes | Yes | WF_IMAGE_GENERATION |
| 10 | WF_IMAGE_GENERATION.json | Webhook | `production/images` | Fal.ai Seedream 4.0 | Yes | Yes | WF_KEN_BURNS |
| 11 | WF_SCENE_IMAGE_PROCESSOR.json | Webhook | `process-scene/image` | Fal.ai Seedream 4.0 | Yes | No | — |
| 12 | WF_I2V_GENERATION.json | Webhook | `production/i2v` | Kie.ai (deprecated) | Yes | Yes | WF_CAPTIONS_ASSEMBLY |
| 13 | WF_T2V_GENERATION.json | Webhook | `production/t2v` | Kie.ai (deprecated) | Yes | Yes | WF_CAPTIONS_ASSEMBLY |
| 14 | WF_KEN_BURNS.json | Webhook | `production/ken-burns` | FFmpeg (local) | Yes | Yes | WF_CAPTIONS_ASSEMBLY |
| 15 | WF_CAPTIONS_ASSEMBLY.json | Webhook | `production/assembly` | FFmpeg, caption burn (:9998) | Yes | Yes | WF_THUMBNAIL_GENERATE+WF_VIDEO_METADATA+WF_PREDICT_PERFORMANCE |
| 16 | WF_ENDCARD.json | Execute Workflow | — | FFmpeg (local) | No | No | — |
| 17 | WF_QA_CHECK.json | Execute Workflow | — | FFmpeg+FFprobe | No | Yes | — |
| 18 | WF_PLATFORM_METADATA.json | Webhook | — | Anthropic (Haiku 4.5) | Yes | Yes | — |
| 19 | WF_SCHEDULE_PUBLISHER.json | Cron (15min) | — | YouTube/TikTok/Instagram APIs | Yes | Yes | — |
| 20 | WF_YOUTUBE_UPLOAD.json | Execute Workflow | — | YouTube Data API v3 | No | Yes | — |
| 21 | WF_ANALYTICS_CRON.json | Cron+Webhook | `analytics/refresh` | YouTube Analytics API | Yes | Yes | — |
| 22 | WF_SUPERVISOR.json | Cron (30min) | — | Supabase, n8n webhooks | Yes | Yes | Retries stuck workflows |
| 23 | WF_COMMENTS_SYNC.json | Cron | — | YouTube/TikTok/IG Comments | Yes | Yes | WF_COMMENT_ANALYZE |
| 24 | WF_COMMENT_ANALYZE.json | Execute Workflow | — | Anthropic (Haiku 4.5) | Yes | Yes | — |
| 25 | WF_SOCIAL_POSTER.json | Webhook | — | TikTok/Instagram APIs | Yes | Yes | — |
| 26 | WF_SOCIAL_ANALYTICS.json | Cron | — | TikTok/IG Analytics | Yes | Yes | — |
| 27 | WF_WEBHOOK_STATUS.json | Webhook | `status` | — | Yes | No | — |
| 28 | WF_WEBHOOK_PROJECT_CREATE.json | Webhook | `project/create` | — | Yes | No | WF_PROJECT_CREATE |
| 29 | WF_WEBHOOK_TOPICS_GENERATE.json | Webhook | `topics/generate` | — | Yes | No | WF_TOPICS_GENERATE |
| 30 | WF_WEBHOOK_TOPICS_ACTION.json | Webhook | `topics/action` | Anthropic (Sonnet 4.6) | Yes | Yes | — |
| 31 | WF_WEBHOOK_PRODUCTION.json | Webhook | `production/trigger` | — | Yes | No | Routes to TTS/Images/Assembly |
| 32 | WF_WEBHOOK_PUBLISH.json | Webhook | `video/approve` | — | Yes | No | — |
| 33 | WF_WEBHOOK_SETTINGS.json | Webhook (x4) | `project/update-settings` etc. | — | Yes | No | — |
| 34 | WF_RETRY_WRAPPER.json | Execute Workflow | — | Any (passthrough) | Yes | No | — |
| 35 | WF_RESEARCH_ORCHESTRATOR.json | Execute Workflow | — | Supabase | Yes | Yes | WF_RESEARCH_CATEGORIZE |
| 36 | WF_RESEARCH_REDDIT.json | Webhook | — | Reddit API (PRAW/Apify) | Yes | Yes | — |
| 37 | WF_RESEARCH_YOUTUBE.json | Webhook | — | YouTube Data API v3 | Yes | Yes | — |
| 38 | WF_RESEARCH_TIKTOK.json | Webhook | — | Apify (TikTok) | Yes | Yes | — |
| 39 | WF_RESEARCH_GOOGLE_TRENDS.json | Webhook | — | pytrends + SerpAPI | Yes | Yes | — |
| 40 | WF_RESEARCH_QUORA.json | Webhook | — | Apify (Quora) | Yes | Yes | — |

### Intelligence Layer Workflows (19)

| # | Filename | Sprint | Feature | Trigger | Webhook Path | Claude Model | Tables Written | Chain Source |
|---|----------|--------|---------|---------|--------------|--------------|----------------|-------------|
| 41 | WF_OUTLIER_SCORE.json | S1 | CF01 | Execute Workflow | — | Opus 4.6 | topics (outlier_score, outlier_scored_at) | From WF_TOPICS_GENERATE |
| 42 | WF_SEO_SCORE.json | S1 | CF02 | Execute Workflow | — | Opus 4.6 | topics (seo_score, seo_scored_at) | From WF_TOPICS_GENERATE |
| 43 | WF_KEYWORD_SCAN.json | S1 | CF02 | Webhook+Execute | `/webhook/keywords/scan` | Opus 4.6 | keywords, topic_keywords | Manual/Dashboard |
| 44 | WF_RPM_CLASSIFY.json | S1 | CF03 | Execute Workflow | `/webhook/rpm/classify` | Opus 4.6 | projects (niche_rpm_category) | From WF_PROJECT_CREATE |
| 45 | WF_COMPETITOR_MONITOR.json | S2 | CF04 | Schedule+Webhook | `/webhook/competitor/monitor/run` | — | competitor_channels, competitor_videos, competitor_alerts | Cron daily |
| 46 | WF_STYLE_DNA.json | S2 | CF14 | Webhook | `/webhook/style-dna/analyze` | Opus 4.6 + Vision | style_profiles | Manual/Dashboard |
| 47 | WF_CTR_OPTIMIZE.json | S3 | CF05 | Execute Workflow | `/webhook/ctr/optimize` | Opus 4.6 | topics (title_options, title_ctr_score) | From WF_SCRIPT_APPROVE |
| 48 | WF_THUMBNAIL_SCORE.json | S3 | CF06 | Execute Workflow | `/webhook/thumbnail/score` | Opus 4.6 + Vision | topics (thumbnail_ctr_score) | From WF_THUMBNAIL_GENERATE |
| 49 | WF_AB_TEST_ROTATE.json | S3 | CF17 | Cron+Webhook | `/webhook/ab-test/start`, `/webhook/ab-test/rotate` | — | ab_tests, ab_test_variants, ab_test_impressions | Cron every 6h |
| 50 | WF_PREDICT_PERFORMANCE.json | S4 | CF13 | Execute Workflow | `/webhook/pps/calculate` | Opus 4.6 | topics (predicted_performance_score, pps_light) | From WF_CAPTIONS_ASSEMBLY |
| 51 | WF_HOOK_ANALYZER.json | S4 | CF12 | Execute Workflow | `/webhook/hooks/analyze` | Opus 4.6 | topics (hook_scores, avg_hook_score) | From WF_SCRIPT_APPROVE |
| 52 | WF_VIRAL_TAG.json | S4 | CF12 | Execute Workflow | `/webhook/viral/tag` | Opus 4.6 | topics (viral_moments) | From WF_SCRIPT_APPROVE |
| 53 | WF_MUSIC_GENERATE.json | S5 | CF07 | Execute Workflow | — | Opus 4.6 | production_logs | Rewritten in-place |
| 54 | WF_DAILY_IDEAS.json | S6 | CF08 | Cron+Webhook | `/webhook/ideas/generate` | Opus 4.6 | daily_ideas | Cron daily 7AM |
| 55 | WF_AI_COACH.json | S6 | CF09 | Webhook | `/webhook/coach/message` | Opus 4.6 | coach_sessions, coach_messages | Manual/Dashboard |
| 56 | WF_NICHE_HEALTH.json | S7 | CF11 | Webhook | `/webhook/niche-health/compute` | Haiku 4.5 | niche_health_history, projects | Manual/Dashboard |
| 57 | WF_REVENUE_ATTRIBUTION.json | S7 | CF15 | Cron+Webhook | `/webhook/revenue/attribute` | — | revenue_attribution | Cron monthly |
| 58 | WF_PPS_CALIBRATE.json | S7 | CF13 | Cron+Webhook | `/webhook/pps/calibrate` | — | pps_config, pps_calibration | Cron monthly |
| 59 | WF_AUDIENCE_INTELLIGENCE.json | S8 | CF16 | Cron+Webhook | `/webhook/audience/intelligence` | Haiku 4.5 + Opus 4.6 | audience_comments, audience_insights | Cron weekly Sun |

**Totals:** 59 workflow files (40 production + 19 Intelligence Layer)

---

## 2. Dashboard Pages (21 files in `dashboard/src/pages/`)

| # | Filename | Route | Realtime | Webhook Actions | Gate | Intelligence |
|---|----------|-------|:---:|---|:---:|:---:|
| 1 | ProjectsHome.jsx | `/` | No | — | — | Yes (niche health badge) |
| 2 | ProjectDashboard.jsx | `/project/:id` | No | `production/trigger`, `production/trigger-all` | — | — |
| 3 | NicheResearch.jsx | `/project/:id/research` | No | `topics/generate`, `project/research`, `project/regenerate-playlists` | — | — |
| 4 | TopicReview.jsx | `/project/:id/topics` | No | `topics/action` | Gate 1 | Yes (outlier+SEO badges, scatter) |
| 5 | TopicDetail.jsx | `/project/:id/topics/:topicId` | No | — | — | — |
| 6 | ScriptReview.jsx | `/project/:id/topics/:topicId/script` | No | via hooks | Gate 2 | Yes (hooks tab) |
| 7 | VideoReview.jsx | `/project/:id/topics/:topicId/review` | No | via hooks | Gate 3 | Yes (PPS, title picker, thumbnail score) |
| 8 | ProductionMonitor.jsx | `/project/:id/production` | No | `thumbnail/generate`, `metadata/generate` | — | — |
| 9 | Analytics.jsx | `/project/:id/analytics` | No | — | — | Yes (niche health, PPS, revenue) |
| 10 | ContentCalendar.jsx | `/project/:id/calendar` | No | via hooks | — | — |
| 11 | EngagementHub.jsx | `/project/:id/engagement` | No | `comments/sync` | — | — |
| 12 | Settings.jsx | `/project/:id/settings` | No | — | — | Yes (music prefs) |
| 13 | Keywords.jsx | `/project/:id/keywords` | No | `keywords/scan` | — | Yes (S1) |
| 14 | IntelligenceHub.jsx | `/project/:id/intelligence` | No | `competitor/monitor`, `rpm/classify` | — | Yes (S2+S8) |
| 15 | DailyIdeas.jsx | `/project/:id/ideas` | No | via hooks | — | Yes (S6) |
| 16 | AICoach.jsx | `/project/:id/coach` | No | via hooks | — | Yes (S6) |
| 17 | Research.jsx | `/research` | No | — | — | — |
| 18 | YouTubeDiscovery.jsx | `/youtube-discovery` | No | `youtube/discover` | — | — |
| 19 | VideoAnalysis.jsx | `/youtube-discovery/analysis/:analysisId` | No | — | — | — |
| 20 | ShortsCreator.jsx | `/shorts` | Yes (`shorts`) | — | Gate 4 | — |
| 21 | SocialPublisher.jsx | `/social` | No | `social/schedule` | — | — |

**Sidebar Navigation:** 4 platform items + 12 project items (Dashboard, Research, Topics, Keywords, Intelligence, Daily Ideas, AI Coach, Production, Analytics, Calendar, Engagement, Settings)

---

## 3. Dashboard Hooks (38 files in `dashboard/src/hooks/`)

| Hook | Realtime | Purpose |
|------|:---:|---|
| useAuth.js | No | PIN-based auth with Supabase session |
| useTheme.js | No | Light/dark toggle |
| useMediaQuery.js | No | Responsive breakpoints |
| useRealtimeSubscription.js | **Yes** | Generic Realtime wrapper (shorts, topics, production_log) |
| useProjects.js | No | Project CRUD + topic summary fetch |
| useTopics.js | No | Topic approve/reject/refine/edit |
| useProjectMetrics.js | No | Dashboard KPI aggregation |
| useQuotaStatus.js | No | Token/credit quota |
| useAnalytics.js | No | YouTube analytics sync |
| useNicheProfile.js | No | Niche research data |
| useScenes.js | No | Scene-level details |
| useScript.js | No | Script data fetch |
| useScriptMutations.js | No | Script generate/approve/reject/refine |
| useVideoReview.js | No | Video assembly review |
| usePublishMutations.js | No | Video approve/reject/metadata/thumbnail/A/B |
| useProductionProgress.js | No | Stage progress tracking |
| useProductionLog.js | No | Activity log |
| useProductionMutations.js | No | Skip/retry/rebuild |
| useShorts.js | No | Shorts CRUD |
| useNotifications.js | No | Notifications |
| useSocialPosts.js | No | Social scheduling |
| useSchedule.js | No | Calendar scheduling |
| useComments.js | No | Comment feeds |
| useEngagement.js | No | Engagement stats |
| useResearch.js | No | Research runs |
| useYouTubeDiscovery.js | No | Video discovery |
| usePromptConfigs.js | No | Prompt templates |
| useProjectSettings.js | No | Project config |
| useKeywords.js | No | Keyword research |
| useCTROptimization.js | No | Title/thumbnail CTR scoring |
| usePPS.js | No | Predicted Performance Score |
| useHookAnalysis.js | No | Hook structure analysis |
| useAICoach.js | **Yes** | Multi-session coaching (coach_sessions, coach_messages) |
| useAnalyticsIntelligence.js | **Yes** | Niche health, PPS calibration |
| useIntelligenceHub.js | **Yes** | Competitor channels+alerts |
| useDailyIdeas.js | **Yes** | Daily ideas |
| useAudienceIntelligence.js | No | Audience insights |
| useABTests.js | No | A/B test tracking |

**Components:** ~148 files across 18+ subdirectories in `dashboard/src/components/`

---

## 4. Supabase Migrations (19 files, 37 active tables)

| Migration | Tables Created | Tables Altered | RLS | Intelligence |
|-----------|:-:|:-:|:---:|:---:|
| 001_initial_schema.sql | 7 (projects, niche_profiles, prompt_configs, topics, avatars, scenes, production_log) | — | No (6 core tables) | — |
| 002_research_tables.sql | 3 (research_runs, research_results, research_categories) | — | Yes | — |
| 003_cinematic_fields.sql | — | scenes (+8 cols), topics (+1 col) | — | — |
| 004_calendar_engagement_music.sql | 6 (scheduled_posts, platform_metadata, comments, music_library, renders, production_logs) | projects (+5 cols) | Yes | — |
| 005_remotion_hybrid_rendering.sql | 1 (remotion_templates) | scenes (+5 cols), topics (+1 col) | Yes | — |
| 006_research_enhancements.sql | — | research_runs (+2/-1 cols) | — | — |
| 007_grand_master_integration.sql | 1 (system_prompts) | topics (+10 cols), projects (+4 cols), avatars (+4 cols) | Yes | — |
| 007_seed_system_prompts.sql | — | (seed: 8 rows) | — | — |
| 007_seo_metadata_columns.sql | — | topics (+2 cols) | — | — |
| 008_kinetic_typography.sql | 2 (kinetic_scenes, kinetic_jobs) | projects (+1 col) | Yes | — |
| 009_remove_remotion_kinetic.sql | — | DROP 3 tables, DROP cols | — | — |
| **010_intelligence_foundation.sql** | 3 (rpm_benchmarks, keywords, topic_keywords) | topics (+16 cols), projects (+6 cols) | Yes | **S1: CF01+CF02+CF03** |
| **011_competitor_intel.sql** | 5 (competitor_channels, competitor_videos, competitor_alerts, competitor_intelligence, style_profiles) | — | Yes | **S2: CF04+CF14** |
| **012_ctr_and_ab_testing.sql** | 3 (ab_tests, ab_test_variants, ab_test_impressions) | topics (+14 cols) | Yes | **S3: CF05+CF06+CF17** |
| **013_prediction_engine.sql** | 2 (pps_config, pps_calibration) | topics (+12 cols) | Yes | **S4: CF13+CF12** |
| **014_music_settings.sql** | — | projects (+5 cols) | — | **S5: CF07** |
| **015_ai_advisory.sql** | 3 (daily_ideas, coach_sessions, coach_messages) | — | Yes | **S6: CF08+CF09** |
| **016_analytics_and_niche_health.sql** | 2 (niche_health_history, revenue_attribution) | projects (+3 cols), topics (+8 cols) | Yes | **S7: CF10+CF15+CF11** |
| **017_audience_memory.sql** | 2 (audience_comments, audience_insights) | — | Yes | **S8: CF16** |

### Tables with REPLICA IDENTITY FULL (23)

projects, topics, scenes, research_runs, research_categories, scheduled_posts, comments, production_logs, keywords, topic_keywords, competitor_channels, competitor_videos, style_profiles, ab_tests, ab_test_variants, pps_config, daily_ideas, coach_sessions, coach_messages, niche_health_history, revenue_attribution, audience_insights, shorts

### Tables on Supabase Realtime (25+)

scenes, topics, projects, production_log, research_runs, research_categories, system_prompts, scheduled_posts, comments, production_logs, keywords, topic_keywords, competitor_alerts, competitor_videos, competitor_channels, style_profiles, ab_tests, ab_test_variants, pps_config, daily_ideas, coach_sessions, coach_messages, niche_health_history, revenue_attribution, audience_insights

### RLS gap (001 tables)

Tables **without** RLS: projects, niche_profiles, prompt_configs, topics, avatars, scenes, production_log (all from migration 001). All tables from 002+ have RLS enabled.

---

## 5. Execution Scripts (10 files in `execution/`)

| Script | Purpose | External Tools |
|--------|---------|----------------|
| burn_captions.sh | Burns ASS captions onto assembled video | Python 3 (whisper), FFmpeg (libass), curl |
| whisper_align.py | Word-level timestamp extraction via Whisper forced alignment | Python 3, whisper |
| ken_burns.sh | Animated zoom/pan clips from static images (6 directions, 7 color moods) | FFmpeg (zoompan, colorbalance) |
| assemble_with_transitions.sh | Batch xfade transitions + concat from manifest JSON | FFmpeg (xfade, concat), Node.js |
| generate_kinetic_ass.py | ASS subtitle files with word-by-word pop-in animation + emphasis detection | Python 3 |
| platform_render.sh | Platform-specific video export (YouTube/TikTok/IG profiles) | FFmpeg (libx264, AAC) |
| caption_burn_service.py | HTTP server (:9998) — burns captions via docker exec FFmpeg, re-uploads to Drive | Python 3, docker CLI, FFmpeg |
| caption-burn.service | systemd unit for caption burn service | systemd |
| e2e_pipeline_test.sh | E2E test (15 stages): infra, Supabase, FFmpeg, AI, n8n, webhooks, dashboard | bash, curl, FFmpeg |
| integration_test.sh | Integration test: webhooks, CRUD, n8n triggers, caption burn, auth | bash, curl, jq |

---

## 6. Directives/SOPs

| Directory | Files | Status |
|-----------|-------|--------|
| `directives/` | 0 | Framework exists, no SOPs written |
| `directives/topic-intelligence/` | 0 | Empty placeholder |

---

## 7. Intelligence Prompts (6 files in `docs/intelligence/prompts/`)

| Prompt File | Feature | Model |
|-------------|---------|-------|
| outlier_intelligence.md | CF01 Outlier Score | Opus 4.6 |
| topic_scorer.md | CF02 SEO Score | Opus 4.6 |
| title_ctr_scorer.md | CF05 Title CTR Optimizer | Opus 4.6 |
| thumbnail_ctr_scorer.md | CF06 Thumbnail Vision Scorer | Opus 4.6 + Vision |
| style_dna_extractor.md | CF14 Style DNA | Opus 4.6 + Vision |
| ab_test_variants.md | CF17 A/B Test Variants | Opus 4.6 |

---

## 8. External API Surfaces

| Service | Auth Pattern | Rate Limit | Usage |
|---------|-------------|------------|-------|
| **Fal.ai Seedream 4.0** | `Authorization: Key {{FAL_API_KEY}}` | 2 img/10s, 1 t2v/60s | All scene images ($0.03/img) |
| **Google Cloud TTS Chirp 3 HD** | API Key (service account) | 100 req/min/project | Voiceover (48kHz mono) |
| **Anthropic API (direct)** | `x-api-key` header | Tier-dependent (~50 req/min) | Opus 4.6 (scripts, intelligence), Haiku 4.5 (batch classification) |
| **YouTube Data API v3** | API Key + OAuth 2.0 | 10,000 units/day | search (100u), videos (1u), channels (1u), commentThreads (1u), upload (1600u) |
| **YouTube Autocomplete** | None (unofficial) | Unmetered (200ms delays) | SEO demand proxy |
| **YouTube Analytics API v2** | OAuth 2.0 | 200 units/day | Revenue attribution, CTR calibration |
| **TikTok Content Posting API** | OAuth 2.0 + Access Token | Varies | Shorts posting (future) |
| **Instagram Graph API v18.0** | OAuth 2.0 + Access Token | 200 req/hr | Shorts posting (future) |
| **Supabase REST API** | `apikey` + `Authorization: Bearer` | Self-hosted (unlimited) | All CRUD on 37 tables |
| **Supabase Realtime** | API Key + JWT | Self-hosted (connection limit) | Dashboard live updates (25+ tables) |
| **Google Drive API v3** | OAuth 2.0 | Self-imposed (pageSize=1000) | Asset storage, video upload |
| **Google Vertex AI Lyria** (lyria-002) | Service account JSON | — | AI background music per video |
| **SerpAPI** (Google Trends proxy) | API Key | 100/mo free, 5K/mo paid | Niche health signals |
| **Reddit API** | OAuth 2.0 Client Credentials | 60 req/min | Topic intelligence |
| **Apify** | API Token | Actor-dependent | TikTok + Quora scraping |

---

## 9. Cron/Scheduled Jobs (all currently DISABLED)

| Workflow | Schedule | Frequency | Purpose |
|----------|----------|-----------|---------|
| WF_SUPERVISOR | `*/30 * * * *` | Every 30 min | Retry stuck workflows |
| WF_ANALYTICS_CRON | `0 6 * * *` | Daily 6AM UTC | YouTube analytics sync |
| WF_SCHEDULE_PUBLISHER | Every 15 min | 15 min | Content calendar publishing |
| WF_COMMENTS_SYNC | Schedule trigger | Daily | YouTube comment sync |
| WF_SOCIAL_ANALYTICS | Schedule trigger | Daily | TikTok/IG analytics |
| WF_COMPETITOR_MONITOR | `0 6 * * *` (approx) | Daily | Competitor video detection |
| WF_DAILY_IDEAS | `0 7 * * *` | Daily 7AM UTC | Daily idea generation |
| WF_AB_TEST_ROTATE | `0 */6 * * *` | Every 6h | A/B test rotation |
| WF_NICHE_HEALTH | Schedule trigger | Weekly | Niche health scoring |
| WF_AUDIENCE_INTELLIGENCE | `0 4 * * 0` | Weekly Sun 4AM | Audience comment synthesis |
| WF_REVENUE_ATTRIBUTION | `0 0 1 * *` | Monthly 1st | Revenue attribution |
| WF_PPS_CALIBRATE | `0 5 1 * *` | Monthly 1st 5AM | PPS weight calibration |

---

## 10. Existing Test Infrastructure

### Test Files: 44 in `dashboard/src/__tests__/`

| Category | Count | Files |
|----------|:---:|---|
| API unit tests | 3 | api, productionApi, publishApi |
| Auth | 1 | useAuth |
| Hook tests | 5 | useRealtimeSubscription, useScenes, useProductionProgress, useQuotaStatus, useYouTubeDiscovery |
| Page renders | 2 | page-renders, routes |
| Component tests | 12 | DotGrid, HeroCard, PipelineTable, PinGate, shared-components, SupervisorAlert, ScriptGenerate, ScriptActions, TopicBulkActions, CreateProjectModal, FailedScenes, VideoReview |
| Feature integration | 12 | ScriptReview, Research, VideoAnalysis, Analytics, ProductionMonitor (x2), TopicActions, TopicReview, TopicDetail-cost, ScorePanel, Settings, smoke |
| Integration suites | 3 | integration-research, integration-cross-page, integration-youtube-discovery |
| Utilities | 3 | utils, queryClient, supabase |
| Shell test scripts | 2 | e2e_pipeline_test.sh, integration_test.sh (in execution/) |

### Test Config

| Config | Status |
|--------|--------|
| vitest.config.js | Present (jsdom, setup file, aliases) |
| .eslintrc | Not configured |
| tsconfig | Not configured (JavaScript project) |
| GitHub Actions CI | Not configured |
| gitleaks pre-commit | Not configured |
| prettier | Not configured |

### Coverage Baseline: Unknown (no coverage report on file)

---

## 11. Execute Workflow Chains (6 Intelligence + Production)

| Chain | Source Workflow | Fires | Status |
|-------|---------------|-------|--------|
| CF03 | WF_PROJECT_CREATE | WF_RPM_CLASSIFY | **Wired** |
| CF01+CF02 | WF_TOPICS_GENERATE | WF_OUTLIER_SCORE + WF_SEO_SCORE | **Needs UI wiring** |
| CF05+CF12 | WF_SCRIPT_APPROVE | WF_CTR_OPTIMIZE + WF_HOOK_ANALYZER + WF_VIRAL_TAG | **Needs UI wiring** |
| CF06 | WF_THUMBNAIL_GENERATE | WF_THUMBNAIL_SCORE | **Wired** |
| CF13 | WF_CAPTIONS_ASSEMBLY | WF_PREDICT_PERFORMANCE | **Needs UI wiring** |
| CF16 | WF_SCRIPT_GENERATE (Pass 1) | Reads audience_context_block | **Needs UI wiring** |

---

## Summary Counts

| Asset | Count |
|-------|:---:|
| n8n workflow JSONs | 59 |
| Dashboard pages | 21 |
| Dashboard hooks | 38 |
| Dashboard components | ~148 |
| Dashboard test files | 44 |
| Supabase migrations | 19 |
| Active database tables | 37 |
| Tables with RLS | 31/37 (84%) |
| Tables with REPLICA IDENTITY FULL | 23/37 |
| Tables on Realtime | 25+/37 |
| Execution scripts | 10 |
| Intelligence prompts | 6 |
| External API surfaces | 15 |
| Scheduled jobs (all disabled) | 12 |
| CI pipelines | 0 |
