# Dashboard page reference

One Template-5 card per dashboard route. Each card lists the JSX file, the
React-query / mutation hooks the page imports, the Supabase tables it reads
(via the `dashboardRead('sb_query', ...)` shim — see
[Realtime data patterns](realtime-patterns.md)), the n8n webhooks it
triggers, and a one-sentence purpose. Routes are taken verbatim from
[`dashboard/src/App.jsx:48-71`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/App.jsx).

!!! note "Reads vs writes"
    After the 2026-04-21 RLS lockdown (migration 030) the anon role cannot
    SELECT or write any VG table. **All** "reads tables" entries flow
    through `WF_DASHBOARD_READ` over `/webhook/dashboard/read` — they are
    never direct PostgREST. Mutations always flow through dedicated n8n
    webhooks. See [`dashboard/src/lib/supabase.js:1-26`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/lib/supabase.js).

## Platform routes

### `/`

- **Component:** `dashboard/src/pages/ProjectsHome.jsx`
- **Hooks:** `useProjects`, `useRetryResearch`, `useDeleteProject`,
  `useNicheHealthHistoryBatch`
- **Reads tables:** `projects` (with embedded `topics_summary`),
  `niche_health_history` (batched per project)
- **Calls webhooks:** `POST /webhook/project/create` (via
  `useProjects.useCreateProject`), `POST /webhook/project/create` with
  `project_id` only (retry research)
- **Purpose:** Project switcher landing page; lists every project with
  health, status, total spend, and a "+ New Project" CTA that opens
  `CreateProjectModal`.

### `/research`

- **Component:** `dashboard/src/pages/Research.jsx`
- **Hooks:** from `useResearch`: `useLatestRun`, `useAllRuns`,
  `useRunById`, `useCategories`, `useResults`, `useRunResearch`,
  `useCancelResearch`
- **Reads tables:** `research_runs`, `research_categories`,
  `research_results`
- **Calls webhooks:** `POST /webhook/research/run`,
  `POST /webhook/research/cancel` (via the `useResearch` hook,
  see [`hooks/useResearch.js:87`, `:117-137`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/hooks/useResearch.js))
- **Purpose:** Global Topic Intelligence run controller — pick project +
  platforms, fire 5-source scrape, watch ranked categories materialise.
  See [Topic Intelligence](../subsystems/topic-intelligence.md).

### `/youtube-discovery`

- **Component:** `dashboard/src/pages/YouTubeDiscovery.jsx`
- **Hooks:** from `useYouTubeDiscovery`: `useLatestDiscoveryRun`,
  `useAllDiscoveryRuns`, `useRunDiscovery`, `useAllAnalyses`
- **Reads tables:** `yt_discovery_runs`, `yt_discovery_results`
- **Calls webhooks:** `POST /webhook/youtube/discover`
- **Purpose:** Niche-research engine that scrapes top YouTube channels
  in selected niches and surfaces high-engagement videos to seed
  reference-channel pickers in `CreateProjectModal`.

### `/youtube-discovery/analysis/:analysisId`

- **Component:** `dashboard/src/pages/VideoAnalysis.jsx`
- **Hooks:** `useVideoAnalysis(:analysisId)` from `useYouTubeDiscovery`
- **Reads tables:** `yt_video_analyses`
- **Calls webhooks:** `POST /webhook/youtube/analyze` (re-trigger if
  analysis missing)
- **Purpose:** Per-video deep-dive — title score, hook deconstruction,
  thumbnail analysis, niche fit. Linked from YouTubeDiscovery rows.

### `/channel-analyzer`

- **Component:** `dashboard/src/pages/ChannelAnalyzer.jsx`
- **Hooks:** from `useChannelAnalyzer`: `useAnalysisGroups`,
  `useChannelAnalyses`, `useChannelComparisonReports`,
  `useDiscoveredChannels`, `useNicheViabilityReports`,
  `useAnalyzeChannel`, `useDiscoverCompetitors`,
  `useGenerateNicheViability`
- **Reads tables:** `analysis_groups`, `channel_analyses`,
  `channel_comparison_reports`, `discovered_channels`,
  `niche_viability_reports`
- **Calls webhooks:** `POST /webhook/channel-analyze`,
  `POST /webhook/discover-competitors`,
  `POST /webhook/niche-viability`
- **Purpose:** Stand-alone niche-validation tool — group competitor
  channels, generate viability reports, surface entry-ease /
  sponsorship / audience-size scores before committing to a project.

### `/shorts`

- **Component:** `dashboard/src/pages/ShortsCreator.jsx`
- **Hooks:** `useProjects`, `useAnalyzeForClips`,
  `useRealtimeSubscription` (no-op stub), local
  `useQuery(['shorts-by-topic'])`
- **Reads tables:** `shorts` (per-project + per-topic), `production_log`
  (clip-level progress)
- **Calls webhooks:** `POST /webhook/shorts/analyze`,
  `POST /webhook/shorts/produce` (via `useShorts.useApproveClip` /
  `useProduceAllClips` — see
  [`hooks/useShorts.js:231,249`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/hooks/useShorts.js))
- **Purpose:** Gate 4 — pick a published topic, analyse for ~20 viral
  clips, review virality scores, approve/skip individual clips, fire
  per-clip production.

### `/social`

- **Component:** `dashboard/src/pages/SocialPublisher.jsx`
- **Hooks:** `useSocialPosts`, `usePostClip`, `useAutoScheduleAll`
- **Reads tables:** `shorts` (filtered to clips with `portrait_drive_url`
  populated)
- **Calls webhooks:** `POST /webhook/social/post`,
  `POST /webhook/social/auto-schedule`
- **Purpose:** Cross-platform publisher — pick a finished short, post
  immediately or schedule per platform (TikTok / Instagram / YouTube
  Shorts), or bulk auto-schedule with peak-hour stagger.

## Per-project routes (`/project/:id/...`)

### `/project/:id`

- **Component:** `dashboard/src/pages/ProjectDashboard.jsx`
- **Hooks:** `useTopics`, `useProjectMetrics`, `useQuotaStatus`,
  `useBatchPublish`, `useProjectSettings`, `useUpdateSettings`
- **Reads tables:** `projects`, `topics` (full pipeline state)
- **Calls webhooks:** `POST /webhook/production/trigger` (single),
  `POST /webhook/production/trigger-all` (project-wide),
  plus auto-pilot toggle via `useUpdateSettings`
- **Purpose:** Per-project command center — KPIs, PipelineTable across
  all topics, batch publish dialog, auto-pilot switch.

### `/project/:id/research`

- **Component:** `dashboard/src/pages/NicheResearch.jsx`
- **Hooks:** `useProject`, `useNicheProfile`, `useCancelTopicGeneration`
- **Reads tables:** `projects`, `niche_profiles`
- **Calls webhooks:** `POST /webhook/topics/generate`,
  `POST /webhook/project/research`,
  `POST /webhook/project/regenerate-playlists`
- **Purpose:** Per-project niche profile — competitor cards, audience
  pain points, blue-ocean strategy, playlist angles. Distinct from
  global `/research` (Topic Intelligence).

### `/project/:id/topics`

- **Component:** `dashboard/src/pages/TopicReview.jsx`
- **Hooks:** `useTopics`, `useApproveTopics`, `useRejectTopics`,
  `useRefineTopic`, `useEditTopic`, `useEditAvatar`,
  `useProject`, `useCancelTopicGeneration`
- **Reads tables:** `topics`, `avatars`, `projects` (for outlier/SEO
  thresholds)
- **Calls webhooks:** `POST /webhook/topics/action` (action ∈
  `approve`, `reject`, `refine`, `edit`, `edit_avatar`,
  `regenerate-rejected`)
- **Purpose:** Gate 1 — review the 25 generated topics with avatars,
  outlier and SEO badges; approve/reject/refine each; bulk approve
  by playlist. See [Gates](../concepts/gates.md).

### `/project/:id/topics/:topicId`

- **Component:** `dashboard/src/pages/TopicDetail.jsx`
- **Hooks:** `useScript`, `useProductionProgress`, `useProductionLog`,
  `useProductionMutations`
- **Reads tables:** `topics`, `scenes` (via `useScript`), `production_log`
- **Calls webhooks:** mutations from `useProductionMutations`
  (`production/trigger`, `production/stop`, `production/restart`)
- **Purpose:** 14-step vertical pipeline roadmap for one topic — live
  asset cards, expandable scene drill-down, links to Script Review
  and Video Review. Built in Session 25.

### `/project/:id/topics/:topicId/script`

- **Component:** `dashboard/src/pages/ScriptReview.jsx`
- **Hooks:** `useScript`, `useScenes`, `useTopics`, `useProject`,
  `useApproveScript`, `useRejectScript`, `useRefineScript`,
  `useGenerateScript`, `useRegenPrompts` (all from
  `useScriptMutations`), `useAnalyzeHooks`
- **Reads tables:** `topics`, `scenes` (visual type assignments)
- **Calls webhooks:** `POST /webhook/script/generate`,
  `POST /webhook/script/approve`, `POST /webhook/script/reject`,
  `POST /webhook/script/refine`, `POST /webhook/script/regen-prompts`,
  `POST /webhook/production/trigger` (stop action via ScorePanel)
- **Purpose:** Gate 2 — full script viewer with 7-dimension score panel,
  3-pass tracker, hook analyzer tab, force-pass banner, inline scene
  edit + refine.

### `/project/:id/topics/:topicId/review`

- **Component:** `dashboard/src/pages/VideoReview.jsx`
- **Hooks:** `useVideoReview`, `useTopics`, `useProjectSettings`,
  publish mutations from `usePublishMutations`,
  CTR mutations from `useCTROptimization`, `useCalculatePPS`,
  direct `supabase.from('production_log')` for crash detail
- **Reads tables:** `topics` (full publish + analytics state),
  `scenes` (final manifest), `production_log` (recent failures)
- **Calls webhooks:** `POST /webhook/video/approve`,
  `POST /webhook/video/reject`, `POST /webhook/video/publish`,
  `POST /webhook/video/batch-publish`,
  `POST /webhook/thumbnail/regenerate`,
  `POST /webhook/video/update-metadata`,
  `POST /webhook/video/retry-upload`,
  `POST /webhook/ctr/optimize`,
  `POST /webhook/ab-test/start`
- **Purpose:** Gate 3 — final video preview, 13-check QA badges,
  per-platform metadata + thumbnail editor, publish dialog with
  visibility selector (default unlisted), CTR optimisation + A/B
  test launcher.

### `/project/:id/production`

- **Component:** `dashboard/src/pages/ProductionMonitor.jsx`
- **Hooks:** `useTopics`, `useProductionProgress`,
  `useProductionMutations`, `useProductionLog`
- **Reads tables:** `topics`, `scenes`, `production_log`
- **Calls webhooks:** all of `lib/productionApi.js`
  (`production/trigger`, `production/stop`, `production/resume`,
  `production/restart`, `production/retry-scene`,
  `production/retry-all-failed`, `production/skip-scene`,
  `production/skip-all-failed`, `production/edit-retry-scene`,
  `production/assemble`), plus `POST /webhook/thumbnail/generate`
  and `POST /webhook/metadata/generate`
- **Purpose:** Real-time production console — current topic stage,
  per-scene dot grid, stage progress bars, cost breakdown, register
  selector, supervisor alerts, failed-scenes manager, activity log.

### `/project/:id/analytics`

- **Component:** `dashboard/src/pages/Analytics.jsx`
- **Hooks:** `useAnalytics`, `usePPSCalibration`, ad-hoc
  `supabase.from('shorts'/'topics'/'projects')`
- **Reads tables:** `topics` (yt_*, tt_*, ig_* columns), `shorts`
  (engagement metrics), `projects`, `pps_calibration`,
  `niche_health_history`, `pps_config`, `revenue_attribution`
- **Calls webhooks:** `POST /webhook/analytics/refresh`
- **Purpose:** Per-project performance — KPIs, views/revenue charts,
  cost-vs-revenue waterfall, traffic-source donut, A/B test list,
  niche-health card, PPS accuracy scatter + weights editor.

### `/project/:id/calendar`

- **Component:** `dashboard/src/pages/ContentCalendar.jsx`
- **Hooks:** `useSchedule` (queries scheduled_posts + insert/update
  helpers), `useTopics`
- **Reads tables:** `scheduled_posts`, `topics`
- **Calls webhooks:** none direct — `useSchedule` writes through the
  `sb_query` shim (insert/update against `scheduled_posts`); the
  scheduled post is then picked up by the cron-triggered
  `WF_SCHEDULE_PUBLISHER`.
- **Purpose:** Visual scheduling grid (monthly / weekly) across
  YouTube, TikTok, Instagram. Drag-to-reschedule, click cell to
  open ScheduleModal.

### `/project/:id/engagement`

- **Component:** `dashboard/src/pages/EngagementHub.jsx`
- **Hooks:** `useComments`, `useHighIntentComments`,
  `useReplyToComment`, `useEngagementStats`
- **Reads tables:** `comments`
- **Calls webhooks:** `POST /webhook/comments/sync` (manual sync
  trigger), reply mutation through `useReplyToComment`
- **Purpose:** Unified comment feed across YouTube/TikTok/Instagram,
  ranked by AI intent score, with AI-suggested replies and a
  sentiment chart per video.

### `/project/:id/keywords`

- **Component:** `dashboard/src/pages/Keywords.jsx`
- **Hooks:** `useKeywords`, `useScanKeywords`
- **Reads tables:** `keywords`, `topic_keywords` (Realtime-published
  in migration 014)
- **Calls webhooks:** `POST /webhook/keywords/scan`
- **Purpose:** Per-project SEO keyword inventory — search volume, KGR,
  rank tracking, "scan now" trigger.

### `/project/:id/intelligence`

- **Component:** `dashboard/src/pages/IntelligenceHub.jsx`
- **Hooks:** from `useIntelligenceHub`: `useCompetitorChannels`,
  `useCompetitorVideos`, `useCompetitorAlerts`, `useStyleProfiles`,
  `useCompetitorIntelligence`, `useRpmBenchmarks`,
  `useMonitorCompetitors`, `useAnalyzeStyleDna`,
  `useClassifyRpm`; plus `AudienceInsightsSection` reads
  `useAudienceInsights`
- **Reads tables:** `competitor_channels`, `competitor_videos`,
  `competitor_alerts`, `style_profiles`, `competitor_intelligence`,
  `rpm_benchmarks`, `audience_insights`, `topics`, `projects`
- **Calls webhooks:** `POST /webhook/competitor/monitor/run`,
  `POST /webhook/style-dna/analyze`, `POST /webhook/rpm/classify`,
  `POST /webhook/audience/intelligence`
- **Purpose:** Competitor + audience intelligence rollup —
  competitor velocity tracker, alert feed, style-DNA matrix,
  RPM benchmark, audience insights blocks.

### `/project/:id/ideas`

- **Component:** `dashboard/src/pages/DailyIdeas.jsx`
- **Hooks:** from `useDailyIdeas`: `useDailyIdeas`,
  `useGenerateIdeas`, `useApproveIdea`, `useRejectIdea`,
  `useIdeaTopicConversion`
- **Reads tables:** `daily_ideas`, `topics`
- **Calls webhooks:** `POST /webhook/ideas/generate`
- **Purpose:** Daily AI-generated topic ideas surfaced from
  audience-intelligence + competitor signal — approve flips an
  idea into a `topics` row at the head of the production queue.

### `/project/:id/coach`

- **Component:** `dashboard/src/pages/AICoach.jsx`
- **Hooks:** from `useAICoach`: `useCoachSessions`,
  `useCoachMessages`, `useSendCoachMessage`,
  `useCreateSession`, `useArchiveSession`, `useRenameSession`
- **Reads tables:** `coach_sessions`, `coach_messages`
- **Calls webhooks:** `POST /webhook/coach/message`
  (`timeoutMs: 120_000`)
- **Purpose:** Conversational AI assistant scoped to one project's
  context (recent topics, analytics, intelligence). Sidebar shows
  session history; chat pane streams Claude responses.

### `/project/:id/settings`

- **Component:** `dashboard/src/pages/Settings.jsx`
- **Hooks:** `useProjectSettings`, `useUpdateSettings`,
  `usePromptConfigs`, `usePromptUpdate`, `usePromptRevert`,
  `usePromptRegenerate`, `usePromptTest`
- **Reads tables:** `projects`, `prompt_configs`
- **Calls webhooks:** `POST /webhook/project/update-settings`,
  `POST /webhook/prompts/update`, `POST /webhook/prompts/revert`,
  `POST /webhook/prompts/regenerate`, `POST /webhook/prompt/test`,
  `POST /webhook/social/connect`
- **Purpose:** Per-project configuration — auto-pilot thresholds,
  visibility default, monthly budget, social account connections,
  prompt-template editor with versioning.

## Routes not in the Sidebar

The following routes are reachable only via in-page links or direct URL:

- `/project/:id/topics/:topicId` — TopicDetail (link from PipelineTable
  rows or Topics list)
- `/project/:id/topics/:topicId/script` — ScriptReview (link from
  TopicCard / TopicDetail)
- `/project/:id/topics/:topicId/review` — VideoReview (link from
  TopicDetail / ProductionMonitor "View video")
- `/youtube-discovery/analysis/:analysisId` — VideoAnalysis (link from
  YouTubeDiscovery row)
- `/research` — global Topic Intelligence (link from CreateProjectModal
  "From Research" or typed manually)

## Inventory match

The 22 routes above match [`App.jsx:49-70`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/App.jsx) 1:1. No additional routes were
discovered beyond the design-spec list; **`Keywords`**,
**`IntelligenceHub`**, **`DailyIdeas`**, **`AICoach`**,
**`YouTubeDiscovery`**, **`VideoAnalysis`**, and **`ChannelAnalyzer`** were
present in the source but not enumerated in the upstream task brief —
they are documented above. ⚠ Needs verification — `Keywords` page is
mounted but `topic_keywords` Realtime publication is in migration 014; if
the Keywords table itself is sourced elsewhere (e.g. n8n workflows
seeding from Apify), the read-side wiring is still through `dashboardRead`.
