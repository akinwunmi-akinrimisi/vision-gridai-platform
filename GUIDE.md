# Vision GridAI — Consolidated Build Guide
## 31 Features: Gap Analysis v2 + Effects Playbook + Topic Intelligence
## Superpowers + gstack + frontend-design + Agency Agents

**Version 3.0 | March 2026**

---

## How This Guide Works

31 features organized into 6 build phases. Each phase has: objective, agency agents, Superpowers workflow, exact Claude Code prompts, and gstack quality commands.

**Superpowers workflow per phase:**
1. Spec: `docs/superpowers/specs/{date}-{feature}.md`
2. Plan: `docs/superpowers/plans/{date}-{feature}.md`
3. Execute: subagent-driven-development with checkbox tracking
4. Quality: `/qa` + `/review` from gstack

---

## Phase 1: Foundation — Schema + Script Upgrade + Resilience

**Objective:** Database migrations, script prompt upgrade, Style DNA, composition library, resume/checkpoint, retry wrapper, negative prompt, production logs.

**Agents:** `@devops-engineer` (migrations), `@prompt-engineer` (script prompts), `@backend-architect` (retry/resume)

### Prompt 1.1: Supabase Migrations

```
Use @devops-engineer. Apply 3 Supabase migrations in order.

Read AGENT_MERGE_SECTIONS in VisionGridAI_Platform_Agent.md for exact SQL.

1. Migration 002_research_tables.sql — 3 tables (research_runs, research_results, research_categories) + RLS
2. Migration 003_cinematic_fields.sql — ALTER scenes table: add color_mood, zoom_direction, caption_highlight_word, transition_to_next, b_roll_insert, composition_prefix, selective_color_element, pipeline_stage. ALTER topics: add pipeline_stage. UPDATE all existing scenes SET visual_type = 'static_image'.
3. Migration 004_calendar_engagement_music.sql — 6 new tables: scheduled_posts, platform_metadata, comments, music_library (for Lyria-generated + optional manual tracks), renders, production_logs. ALTER projects: add auto_pilot fields + budget fields.

Apply all to live Supabase at https://supabase.operscale.cloud.
Use /careful for schema changes.
```

### Prompt 1.2: Style DNA + Composition Library

```
Use @prompt-engineer. Seed the prompt_templates table.

Insert 4 Style DNA templates (Historical, Finance, Tech, Inspirational) — exact text in VisionGridAI_Platform_Agent.md "Style DNA Templates" section.

Insert 8 composition prefix templates (wide_establishing, medium_closeup, over_shoulder, extreme_closeup, high_angle, low_angle, symmetrical, leading_lines) — exact text in "Composition Prefix Library" section.

Insert 1 universal negative prompt — exact text in "Universal Negative Prompt" section.

All entries: template_type = 'style_dna' | 'composition' | 'negative', is_active = true, version = 1.
```

### Prompt 1.3: Script Generation Prompt Upgrade

```
Use @prompt-engineer. Upgrade the script generation prompts in prompt_configs.

Replace the existing script generation prompts with the Master Script Generator (Long-Form — 2 Hours) from VisionGridAI_Platform_Agent.md. This outputs the FULL scene schema: color_mood, zoom_direction, composition_prefix, caption_highlight_word, transition_to_next, b_roll_insert, selective_color_elements, music_sections, retention_hooks, style_dna.

The 3-pass system stays:
- Pass 1: narrative + color_mood + zoom_direction + act
- Pass 2: composition_prefix + caption_highlight_word + b_roll_insert
- Pass 3: transition_to_next + selective_color_elements + music_sections + style_dna

Add 3 niche adapter prompts (Finance, Historical, Tech) — exact text in Agent.md.
Add Image Prompt Enhancer prompt.
Add Keyword Extraction prompt.
Add YouTube SEO Metadata Generator prompt.
Add Background Music Mood Descriptor prompt (used by WF_MUSIC_GENERATE for Lyria generation).

Use /careful — these prompts determine ALL downstream quality.
```

### Prompt 1.4: Resume/Checkpoint + Retry Wrapper

```
Use @backend-architect. Build 2 critical resilience features.

1. WF_RETRY_WRAPPER — reusable n8n sub-workflow.
   Accepts: webhook_url, payload, max_retries (default 4), base_delay_ms (default 1000)
   Implements: exponential backoff 1s→2s→4s→8s, capped at 30s
   Logs each attempt to production_logs table
   Returns: response or throws after max retries

2. Resume logic in ALL production workflows (WF_TTS, WF_IMAGE, WF_KEN_BURNS, WF_CAPTIONS_ASSEMBLY):
   BEFORE processing, query: SELECT id FROM scenes WHERE topic_id = X AND {stage}_status = 'pending'
   Only process pending scenes. Skip completed ones.
   Update topics.pipeline_stage after each workflow completes.

Store WF_RETRY_WRAPPER.json in workflows/.
Use /careful for the retry logic. Use /qa after.
```

### Prompt 1.5: Production Logging

```
Use @backend-architect. Add structured logging to all production workflows.

After EVERY external API call (Fal.ai, Claude, Google TTS, YouTube), insert a row to production_logs:
  topic_id, stage, scene_number, action (e.g., 'fal_ai_seedream'), status, duration_ms, cost_usd, retry_count

Add a n8n Function node template that wraps API calls with timing + logging.
The dashboard's ProductionMonitor page will read this table for per-video logs.
```

**Quality:** `/qa` → `/review`

---

## Phase 2: Cinematic Pipeline — Ken Burns + Color Grade + Transitions

**Objective:** Replace WF_I2V + WF_T2V with WF_KEN_BURNS. Add color grading. Add xfade transitions. Upgrade assembly workflow.

**Agents:** `@api-developer` (workflows), `@backend-architect` (assembly logic)

### Prompt 2.1: WF_KEN_BURNS Workflow

```
Use @api-developer. Build WF_KEN_BURNS — replaces WF_I2V and WF_T2V.

Read VisionGridAI_Platform_Agent.md: Ken Burns Motion section (6 directions) + Color Science section (7 moods).

For each scene (172 total):
1. Check clip_status — skip if not 'pending' (resume support)
2. Download image from image_url
3. Get zoom_direction → look up Z/X/Y expressions from the 6-direction table
4. Get color_mood → look up FFmpeg filter chain from the 7-mood table
5. Check selective_color_element — if NOT NULL, skip color grade filters
6. Calculate FRAMES = duration_seconds × 30
7. Determine OUTPUT_SIZE: 1920x1080 for long-form
8. Build FFmpeg command:
   ffmpeg -loop 1 -i {INPUT}.png -vf "
     scale=8000:-1,
     zoompan=z='{Z}':x='{X}':y='{Y}':d={FRAMES}:s={SIZE}:fps=30,
     {COLOR_FILTERS}
   " -t {DURATION} -c:v libx264 -pix_fmt yuv420p -preset medium {OUTPUT}.mp4
9. Upload clip to Google Drive
10. Update scenes: clip_url, clip_status = 'uploaded'
11. Log to production_logs

Process in batches of 20 to manage VPS memory.
Store as workflows/WF_KEN_BURNS.json.
Use /careful for the FFmpeg expressions — one wrong character breaks the pipeline.
```

### Prompt 2.2: Upgrade WF_CAPTIONS_ASSEMBLY with Transitions

```
Use @backend-architect. Upgrade the assembly workflow to use xfade transitions.

Read VisionGridAI_Platform_Agent.md: Transition System section (5 types + offset formula).

Replace simple concat with xfade chain:
1. For each scene pair, get transition_to_next from scenes table
2. Map to FFmpeg xfade type: crossfade→fade, hard_cut→(concat), zoom_blur→circleopen, wipe_left→wipeleft, dissolve_slow→dissolve
3. Calculate offset: offset_N = SUM(durations[0..N-1]) - SUM(transition_durations[0..N-2])
4. For 172 scenes, batch in groups of 20:
   - Assemble scenes 1-20 with xfade → batch_1.mp4
   - Assemble scenes 21-40 with xfade → batch_2.mp4
   - ...
   - Final: concat all batches with crossfade
5. Burn ASS captions onto assembled video
6. Log total assembly time to production_logs

The n8n Function node dynamically builds the FFmpeg filter_complex string from scene data.
Use /careful for offset calculation — off-by-one errors cause audio desync.
```

**Quality:** `/qa` → `/review`

---

## Phase 3: Audio — Background Music (Lyria) + End Cards

**Objective:** AI music generation via Vertex AI Lyria, FFmpeg ducking, end card generation.

**Agents:** `@api-developer` (workflows), `@prompt-engineer` (music mood prompt)

### Prompt 3.1: Background Music System (Lyria)

```
Use @api-developer and @prompt-engineer. Build WF_MUSIC_GENERATE.

1. During script generation, the music_sections array specifies mood per chapter
2. WF_MUSIC_GENERATE uses Anthropic API (Claude Haiku) to analyze the script and determine mood/tempo/instruments per section
3. Vertex AI Lyria (lyria-002) generates custom 30-second clips per mood section
4. FFmpeg merges + loops Lyria clips to match video duration
5. Mix voiceover + generated track:
   ffmpeg -i voiceover.wav -i music.mp3 \
     -filter_complex "[1:a]volume=0.12[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[out]" \
     -map "[out]" -c:a aac -b:a 192k mixed.m4a
6. For long-form with multiple music sections: crossfade between Lyria clips at chapter boundaries

Store as WF_MUSIC_GENERATE.json.
```

### Prompt 3.2: End Card + Thumbnail

```
Use @api-developer. Build WF_ENDCARD and WF_THUMBNAIL.

WF_ENDCARD:
1. Generate end card image: dark background (#0A0A1A) + channel logo + subscribe text
2. FFmpeg: ffmpeg -loop 1 -i endcard.png -vf "fade=in:st=0:d=0.5,fade=out:st=4.5:d=0.5" -t 5 endcard.mp4
3. Concatenate onto final assembled video
4. Duration: 5-8 seconds for long-form

WF_THUMBNAIL:
1. Use AI (Fal.ai Seedream) to generate a thumbnail image from script hook + style_dna
2. Add text overlay via n8n Code node (Sharp/Jimp): thumbnail_text from YouTube SEO Metadata prompt
3. Upload to Google Drive
4. Store URL in platform_metadata table

Store as WF_ENDCARD.json and WF_THUMBNAIL.json.
```

**Quality:** `/qa`

---

## Phase 4: Platform Publishing — Metadata + Calendar + Exports

**Objective:** Platform-specific metadata, export profiles, content calendar, scheduled posting.

**Agents:** `@api-developer` (workflows), `@frontend-developer` (calendar page), `@prompt-engineer` (metadata prompts)

### Prompt 4.1: Platform Metadata + Export Profiles

```
Use @api-developer and @prompt-engineer. Build WF_PLATFORM_METADATA.

1. After video assembly, trigger this workflow
2. Send topic data to Claude Haiku with YouTube SEO Metadata Generator prompt
3. Generate platform-specific variants:
   - YouTube: SEO title (60 chars), long description with chapters + timestamps, 15-20 tags, thumbnail text
   - TikTok: Punchy caption (150 chars), trending hashtags (15-20), no description
   - Instagram: Storytelling caption, hashtag blocks (30 max)
4. Store all in platform_metadata table (one row per platform)

Then build platform-specific FFmpeg render step:
   YouTube Long: CRF 17-19, preset slow, 12 Mbps, 192k AAC, 1920x1080
   YouTube Shorts: CRF 18-20, preset slow, 6 Mbps, 192k AAC, 1080x1920
   TikTok: CRF 20-23, preset medium, 4 Mbps, 128k AAC, 1080x1920
   Instagram: CRF 20-23, preset medium, 3.5 Mbps, 128k AAC, 1080x1920
All with -movflags +faststart. Store each in renders table.

Store as WF_PLATFORM_METADATA.json.
```

### Prompt 4.2: Content Calendar Dashboard Page

```
Use @frontend-developer. Use frontend-design skill. Read design-system/MASTER.md.

Build pages/ContentCalendar.jsx at route /project/:id/calendar.

Layout:
- Monthly/weekly toggle view
- Grid cells show scheduled + published content
- Color-coded by platform: YouTube (red), TikTok (black/cyan), Instagram (purple)
- Status indicators: scheduled (outline), publishing (pulsing), published (solid), failed (red border)
- Drag-and-drop to reschedule (update scheduled_posts.scheduled_at)
- Click to open ScheduleModal: set date/time, pick platform(s), set visibility

Components: CalendarGrid.jsx, ContentBlock.jsx (draggable), ScheduleModal.jsx
Hook: useSchedule.js — queries scheduled_posts + Supabase Realtime

Add route to App.jsx:
  const ContentCalendar = lazy(() => import('./pages/ContentCalendar'));
  <Route path="/project/:id/calendar" element={<ContentCalendar />} />

Add sidebar nav item: { label: 'Calendar', icon: Calendar, path: '/project/:id/calendar' }
```

### Prompt 4.3: Schedule Publisher Workflow

```
Use @api-developer. Build WF_SCHEDULE_PUBLISHER as n8n cron (every 15 min).

1. Query: SELECT * FROM scheduled_posts WHERE status = 'scheduled' AND scheduled_at <= NOW()
2. For each due post:
   a. Get render file URL from renders table for this topic + platform
   b. Get metadata from platform_metadata table
   c. Upload to platform (YouTube API / TikTok API / Instagram API)
   d. Update: status = 'published', published_at = NOW()
   e. On failure: status = 'failed', error_message = error, retry next cycle (max 3)
3. Default visibility: use project's auto_pilot_default_visibility (default 'unlisted')

Store as WF_SCHEDULE_PUBLISHER.json.
```

**Quality:** `/qa` → `/review`

---

## Phase 5: Engagement + Analytics + Auto-Pilot

**Objective:** Comment sync, AI sentiment/intent, engagement hub, enhanced analytics, auto-pilot mode.

**Agents:** `@frontend-developer` (pages), `@api-developer` (workflows), `@prompt-engineer` (AI prompts)

### Prompt 5.1: Comment Sync + AI Analysis

```
Use @api-developer. Build WF_COMMENTS_SYNC (daily cron) and WF_COMMENT_ANALYZE.

WF_COMMENTS_SYNC:
1. For each published video, fetch latest comments from YouTube/TikTok/Instagram APIs
2. Store in comments table: platform, author, text, like_count, platform_comment_id
3. Deduplicate by platform_comment_id

WF_COMMENT_ANALYZE:
1. Triggers after sync
2. Send batch of new comments to Claude Haiku:
   "Classify each comment: sentiment (positive/negative/neutral), intent_score (0-1), intent_signals array.
   High intent signals: 'link please', 'how to buy', 'price?', 'where can I get', 'DM me', 'need this'.
   Return JSON array."
3. Update comments table with sentiment, intent_score, intent_signals
4. Comments with intent_score > 0.7 are flagged for engagement

Store as WF_COMMENTS_SYNC.json and WF_COMMENT_ANALYZE.json.
```

### Prompt 5.2: Engagement Hub Page

```
Use @frontend-developer. Use frontend-design skill.

Build pages/EngagementHub.jsx at route /project/:id/engagement.

Layout:
1. Filter bar: platform tabs (All | YouTube | TikTok | Instagram), sentiment filter, intent filter
2. Comment feed: unified list, sorted by intent_score descending (highest conversion potential first)
3. Each comment card: author avatar, text, platform badge, sentiment indicator, intent score bar, "Reply" button
4. AI Reply panel: click Reply → AI generates 3 suggested replies → one-click to post
5. Sentiment chart: per-video breakdown (Recharts pie/bar)
6. Summary stats: total comments, avg sentiment, high-intent count, reply rate

Components: CommentFeed.jsx, ConversionSignals.jsx, ReplyComposer.jsx, SentimentChart.jsx
Hooks: useComments.js, useEngagement.js

Add route + sidebar nav: { label: 'Engagement', icon: MessageCircle, path: '/project/:id/engagement' }
```

### Prompt 5.3: Auto-Pilot Mode

```
Use @backend-architect and @frontend-developer.

Backend: Modify orchestrator workflows to check projects.auto_pilot_enabled.
When auto-pilot ON:
- After topic generation: if topic_score > auto_pilot_topic_threshold, auto-approve (skip Gate 1)
- After script eval: if combined_eval > auto_pilot_script_threshold, auto-approve (skip Gate 2)
- After video render + QA check (all 13 pass): auto-publish as UNLISTED (skip Gate 3)
- If monthly_spend_usd > monthly_budget_usd: PAUSE, alert on dashboard
- If 2 consecutive videos score < 6.0: PAUSE, alert

Frontend: Add auto-pilot toggle to ProjectDashboard and Settings page.
- Toggle switch with confirmation dialog: "Auto-pilot will publish as UNLISTED. You review weekly."
- Pulsing indicator badge when active
- After 5+ successful videos with avg eval > 7.5: prompt "Enable Auto-Pilot?"
```

### Prompt 5.4: Enhanced Analytics

```
Use @frontend-developer. Upgrade pages/Analytics.jsx.

Add:
1. Cross-platform comparison: same content's views/likes/comments on YouTube vs TikTok vs Instagram (side-by-side bar chart)
2. Follower/subscriber growth timeline (line chart, overlaid with publish dates)
3. Engagement rate per video: (comments + likes) / views (percentage column in table)
4. Content performance heatmap: which days/times get most engagement (7×24 grid)
5. Cost vs Revenue waterfall chart per video
6. Subscriber milestone tracker

Use Recharts for all charts. Follow design-system/MASTER.md.
```

**Quality:** `/qa` → `/review`

---

## Phase 6: Topic Intelligence + Dashboard Polish + QA

**Objective:** 5-source research, Research page, CreateProjectModal dropdown, QA workflow, Settings overhaul, enhanced pages.

**Agents:** `@api-developer` (scraper workflows), `@frontend-developer` (pages), `@qa-engineer` (testing)

### Prompt 6.1: Topic Intelligence Workflows

```
Use @api-developer. Build all 7 research workflows exactly as specified in VisionGridAI_Platform_Agent.md.

WF_RESEARCH_ORCHESTRATOR: webhook trigger, keyword derivation via Haiku, parallel 5-source dispatch, progress tracking, triggers categorization on completion.
WF_RESEARCH_REDDIT: PRAW or Apify, top 10 by engagement (upvotes + comments×2), last 7 days.
WF_RESEARCH_YOUTUBE: YouTube Data API v3, top 10 comments by likes + replies×3.
WF_RESEARCH_TIKTOK: Apify, top 10 by likes + comments×2 + shares×3.
WF_RESEARCH_GOOGLE_TRENDS: pytrends + SerpAPI, interest index×10, PAA base 500, breakout 2x.
WF_RESEARCH_QUORA: Apify, top 10 by follows + answers×2.
WF_RESEARCH_CATEGORIZE: Claude Haiku, organic clustering, ranking, video title generation.

ALL scrapers use WF_RETRY_WRAPPER for API calls.
Store as WF_RESEARCH_*.json in workflows/.
```

### Prompt 6.2: Research Page + CreateProjectModal

```
Use @frontend-developer. Use frontend-design skill.

1. Build pages/Research.jsx at global route /research.
   - Project selector + "Run Research" button
   - Realtime progress (sources_completed / 5)
   - Ranked category cards (gold/silver/bronze)
   - Source tabs (Reddit | YouTube | TikTok | Google Trends | Quora)
   - "Use This Topic" button per result

2. Modify CreateProjectModal.jsx:
   - Add "From Research" section above niche input
   - Category filter dropdown → topic dropdown → auto-fills niche + description
   - "No research data" → links to /research
   - "OR enter manually below" separator

3. Modify App.jsx: add Research route
4. Modify Sidebar.jsx: add global "Topic Research" nav item

Hooks: useResearch.js (queries + Realtime)
```

### Prompt 6.3: Automated QA Workflow

```
Use @api-developer. Build WF_QA_CHECK — runs after final render.

13 automated checks from VisionGridAI_Platform_Agent.md QA section:

Visual: resolution, file size, black frames, frame rate, aspect ratio (FFprobe)
Caption: ASS file exists, no overflow, highlight words match narration
Audio: duration match (±500ms), loudness (-16 LUFS ±1), no gaps > 2s
Platform: H.264 codec, AAC audio, .mp4 container, faststart flag

Store results as JSON in a qa_results JSONB field on the renders table.
Dashboard shows pass/fail checklist on VideoReview page.

If auto-pilot ON and all 13 pass: auto-trigger publish.
Store as WF_QA_CHECK.json.
```

### Prompt 6.4: Settings Overhaul + VideoReview Enhancement

```
Use @frontend-developer.

Settings page (/project/:id/settings) — rebuild from 2K stub to full page:
- Auto-pilot config: enable/disable toggle, topic threshold, script threshold, default visibility
- Platform connections: YouTube ✅/⚠️/❌, TikTok status, Instagram status
- API health: Fal.ai, Anthropic, Google TTS — last response time, error rate (from production_logs)
- Cost budget: monthly budget input, current spend progress bar, alert threshold
- Music library manager: upload tracks, set mood tags, preview, delete
- Default schedule templates: "YouTube: Tue/Thu 9am", "TikTok: daily 6pm"

VideoReview page — add:
- Upload visibility toggle (public/unlisted/private) — default unlisted
- Platform selector checkboxes (YouTube ✓, TikTok ✓, Instagram ✓)
- Thumbnail preview + "Regenerate" button
- SEO metadata preview per platform (from platform_metadata table)
- QA checklist (13 items, pass/fail badges from WF_QA_CHECK results)

ProjectDashboard — add:
- Auto-pilot toggle with pulsing indicator
- Pipeline health: green/yellow/red based on recent production_logs errors
- Quick actions: "Generate Next Video", "Run Research", "View Calendar"
- Activity feed: last 5 pipeline events from production_logs
```

### Prompt 6.5: E2E Testing

```
Use @qa-engineer. Comprehensive testing across all 31 features.

TEST 1: Full cinematic pipeline — create project, generate script (verify new fields), generate 5 images (verify composition + style DNA), Ken Burns (verify zoom + color grade), assembly (verify xfade transitions), music ducking, end card, platform renders, QA check.

TEST 2: Topic Intelligence — run research, verify 50 results, categories, dropdown in CreateProjectModal.

TEST 3: Content Calendar — schedule a post, verify cron picks it up, publishes as unlisted.

TEST 4: Engagement Hub — sync comments (mock data), verify sentiment scoring, AI reply generation.

TEST 5: Auto-pilot — enable, trigger pipeline, verify gates skipped, video published as unlisted.

TEST 6: Resume — crash a workflow mid-scene, restart, verify it resumes from failed scene.

TEST 7: Retry — simulate Fal.ai timeout, verify exponential backoff, verify production log entries.

Use /qa per test. Use /review for final report.
```

**Quality:** `/qa` → `/review` → `/freeze`

---

## Phase 7: Remotion Hybrid Rendering — AI Scene Classification + Data Graphics

**Objective:** Add AI-powered scene classification (fal_ai vs remotion) and data graphic rendering to the production pipeline. Slots AFTER the 31-feature merge (Phases 1-6). New pipeline step: After script approval → AI classifies all scenes → dashboard shows results → operator reviews → image generation splits into Fal.ai + Remotion tracks.

**Build order:** 5 sub-phases, 9 Claude Code prompts.

**Agents:** `@devops-engineer`, `@backend-architect`, `@frontend-developer`, `@prompt-engineer`, `@api-developer`, `@qa-engineer`

### Sub-Phase 7.1: Schema + Remotion Service

**Objective:** Database migration, Remotion template table seeded, render service deployed.
**Agents:** `@devops-engineer`, `@backend-architect`

#### Prompt 7.1.1: Supabase Migration

```
Use @devops-engineer. Apply migration 005_remotion_hybrid_rendering.sql.

Read REMOTION_AGENT_MERGE.md — the full SQL is in the "Migration: 005" section.

This migration:
1. ALTERs scenes: adds render_method, data_payload, remotion_template, classification_reasoning, classification_status
2. ALTERs topics: adds classification_status
3. Creates remotion_templates table with props_schema JSONB
4. Seeds 12 core templates (stat_callout, comparison_layout, bar_chart, timeline_graphic, quote_card, list_breakdown, chapter_title, data_table, before_after, percentage_ring, map_visual, metric_highlight) with their full JSON schemas
5. RLS policies

Apply to live Supabase. Verify all 12 template rows exist after seeding.
Use /careful for the JSON schemas — they drive template rendering validation.
```

#### Prompt 7.1.2: Remotion Render Service

```
Use @backend-architect. Build the Remotion render service.

Create dashboard/src/remotion/render-service.js — a lightweight Express/Fastify server:

Endpoints:
  POST /render — renders a single scene
    Body: { template_key, data_payload, color_mood, format ('long'|'short'), style_dna, output_path }
    Internally calls: npx remotion still with the correct composition and props
    Returns: { success, file_path, render_time_ms }

  POST /preview — same as /render but saves to /tmp/previews/ (no Drive upload)
    Returns: { success, preview_url } (served as static file)

  GET /health — returns { status: 'ok', templates_loaded: 12 }

The service:
- Loads template registry from dashboard/src/remotion/templates/index.js
- Validates data_payload against props_schema from remotion_templates table (fetch on startup)
- Returns 400 with specific validation errors if payload doesn't match schema
- Runs on port 3100
- Add to infra/docker-compose.override.yml or run as systemd service

Also create the template index file at dashboard/src/remotion/templates/index.js
that exports a map: { stat_callout: StatCallout, comparison_layout: ComparisonLayout, ... }

Use /qa after deployment. Test with: curl -X POST localhost:3100/render -H 'Content-Type: application/json' -d '{"template_key":"stat_callout","data_payload":{"primary_value":"$4,700","label":"Annual Rewards"},"color_mood":"warm_gold","format":"long"}'
```

### Sub-Phase 7.2: Remotion Templates

**Objective:** Build all 12 Remotion template components.
**Agents:** `@frontend-developer`

#### Prompt 7.2.1: Shared Components + MoodTheme

```
Use @frontend-developer. Use the frontend-design skill — read SKILL.md first.
Read design-system/MASTER.md for the Neon Pipeline design system.

Build the shared Remotion components at dashboard/src/remotion/templates/shared/:

1. MoodTheme.js — export MOOD_THEMES constant mapping all 7 color_mood values to { bg, text, accent, muted, gradient } colors. These colors are derived from the FFmpeg color grade values but adapted for on-screen graphics:
   - cold_desat: dark navy bg (#0A0F1A), cool blue accent, muted text
   - cool_neutral: deep slate bg (#0F172A), bright blue accent, light gray text
   - dark_mono: near-black bg (#0A0A0A), ice blue accent, subdued text
   - warm_sepia: dark brown bg (#1A130D), amber accent, cream text
   - warm_gold: dark olive bg (#1A1508), golden accent (#F5A623), warm white text
   - full_natural: dark charcoal bg (#0F1419), green accent, clean white text
   - muted_selective: dark blue-gray bg (#0D1117), purple accent, cool gray text
   Export a useMoodTheme(colorMood) hook.

2. Typography.js — Montserrat ExtraBold for values/numbers, Inter for labels/body.
   Export font-size presets for long-form (1920x1080) and short-form (1080x1920).

3. AnimatedNumber.js — A component that displays a number. For still rendering this is just styled text, but structured for future video rendering with count-up animation.

4. TrendArrow.js — Up (green), down (red), neutral (gray) arrow icon.

5. GlassCard.js — Frosted glass card with subtle border, backdrop blur effect on PNG.
   Accepts mood theme colors for background tint.

All components must look cinematic, NOT like a PowerPoint slide. Think: Netflix data cards, Bloomberg terminal aesthetics, Apple keynote graphics. Dark backgrounds, precise typography, subtle gradients, generous whitespace.
```

#### Prompt 7.2.2: Core Templates (6 most common)

```
Use @frontend-developer. Build the 6 most frequently used Remotion templates.

Each template:
- Is a React component accepting { data, colorMood, format, styleDna } props
- Uses useMoodTheme(colorMood) for all colors
- Renders at 1920x1080 (format='long') or 1080x1920 (format='short')
- Has dark cinematic background matching the mood theme
- Uses Montserrat ExtraBold for primary values, Inter for labels
- Is visually indistinguishable from a Fal.ai image when placed in the video timeline

Build these 6:

1. StatCallout.jsx — Large number center-screen (AnimatedNumber), label below, sublabel smaller, optional trend arrow. The number should be MASSIVE (200px+ for long-form). Subtle gradient glow behind the number matching the accent color.

2. ComparisonLayout.jsx — Two GlassCard panels side-by-side (long) or stacked (short). Each has title, subtitle, feature list. Winning side gets accent color border. Features aligned in rows for easy scanning. Subtle "VS" divider between panels.

3. BarChart.jsx — Horizontal or vertical bars. Each bar has label + value. Highlighted bars use accent color, others use muted. Clean grid lines, minimal axis labels. The bar with the highest value should visually dominate.

4. ListBreakdown.jsx — Numbered list with icon support. Each item: number/icon on left, text + subtext on right. Highlighted items get accent treatment. Clean vertical rhythm. Works as numbered (1, 2, 3) or with custom icons.

5. ChapterTitle.jsx — Full-bleed design. Large chapter number (semi-transparent, background), chapter title in Montserrat ExtraBold, optional subtitle, thin accent line separator. Should feel like a Netflix chapter card.

6. QuoteCard.jsx — Large quotation marks in accent color (decorative). Quote text in Inter italic. Author name + role below with small divider. Optional circular avatar placeholder. Elegant, editorial feel.

For each template, test with sample data from the remotion_templates.props_schema.
Use /qa after building all 6.
```

#### Prompt 7.2.3: Remaining Templates (6 specialized)

```
Use @frontend-developer. Build the remaining 6 templates.

7. TimelineGraphic.jsx — Horizontal timeline (long-form) or vertical (short-form). Events as dots on a line with date above and label below. Highlighted event is larger with accent glow. Connecting line uses gradient from muted to accent.

8. DataTable.jsx — Clean grid with alternating row shading. Header row in accent color. Highlighted column or row has accent border. Cell text aligned. Max 5 rows × 4 columns for readability. Feels like a premium financial report table.

9. BeforeAfter.jsx — Split screen with arrow in center. "Before" side uses muted/negative colors (red tint). "After" side uses accent/positive colors (green tint). Transformation label on the arrow. Values are large and prominent on each side.

10. PercentageRing.jsx — Large circular progress ring (SVG). Percentage number in center (Montserrat ExtraBold, 160px+). Ring fill uses accent color, track uses muted. Label below ring. Optional sublabel. Radial gradient glow behind ring.

11. MapVisual.jsx — Simplified SVG map (US states or world regions). Highlighted regions use accent fill. Non-highlighted use muted fill. Region labels with values. Title at top. This is a simplified artistic map, not a geographic data viz.

12. MetricHighlight.jsx — Row or 2x2 grid of KPI cards. Each card: value (large), label (small), optional trend arrow. Cards are GlassCard components. Grid layout auto-adjusts for 2-4 metrics. Most important metric gets accent treatment.

Test each template with all 7 color moods to verify visual consistency.
Use /qa after all 12 templates are complete.
Use /review for the full template library.
```

### Sub-Phase 7.3: Classification Workflow

**Objective:** Build WF_SCENE_CLASSIFY and integrate into pipeline.
**Agents:** `@prompt-engineer`, `@api-developer`

#### Prompt 7.3.1: Classification Workflow

```
Use @prompt-engineer and @api-developer. Build WF_SCENE_CLASSIFY.

Read REMOTION_AGENT_MERGE.md — the full AI Classification Prompt and Data Payload Generation Prompt are there. Use them EXACTLY as written.

Build an n8n workflow:
1. Trigger: webhook POST /webhook/classify-scenes with body { topic_id }
2. Verify topic exists and topics.status = script_approved (Gate 2 passed)
3. Update topics SET classification_status = 'classifying'
4. Fetch all scenes for this topic, ordered by scene_number
5. Batch into groups of 30 scenes
6. For each batch, call Claude Haiku via Anthropic API with the AI Classification Prompt
   - Model: claude-haiku-4-5-20251001
   - Temperature: 0.2 (low for consistent classification)
   - Include: niche, topic title, style_dna from project
   - Use WF_RETRY_WRAPPER for the API call
7. Parse JSON response. For each scene:
   - UPDATE scenes SET render_method, remotion_template, data_payload, classification_reasoning, classification_status = 'classified'
8. For Remotion scenes where data_payload is incomplete (missing required fields per props_schema):
   - Fetch the template's props_schema from remotion_templates table
   - Call Claude Haiku with the Data Payload Generation Prompt
   - Update data_payload with enriched data
9. Update topics SET classification_status = 'classified'
10. Log to production_logs: { stage: 'classification', scenes_classified: N, fal_ai_count: X, remotion_count: Y, cost: Z }

Handle malformed JSON: strip markdown fences, retry with "RESPOND ONLY WITH VALID JSON ARRAY" appended.
If all retries fail: default all scenes in the batch to render_method = 'fal_ai'.

Store as workflows/WF_SCENE_CLASSIFY.json.
Use /careful for the prompt — classification accuracy determines visual quality.
```

#### Prompt 7.3.2: Modify Image Generation Workflow

```
Use @api-developer. Modify WF_IMAGE_GENERATION to split into Fal.ai + Remotion tracks.

Current flow: fetch all pending scenes → generate all via Fal.ai
New flow: fetch all pending scenes → split by render_method → parallel tracks

Track A (Fal.ai):
  SELECT * FROM scenes WHERE topic_id = X AND image_status = 'pending' AND render_method = 'fal_ai'
  For each: composition_prefix + image_prompt + style_dna → Fal.ai Seedream → upload → update image_url

Track B (Remotion):
  SELECT * FROM scenes WHERE topic_id = X AND image_status = 'pending' AND render_method = 'remotion'
  For each:
    1. POST to localhost:3100/render with { template_key: remotion_template, data_payload, color_mood, format, style_dna }
    2. Upload rendered PNG to Google Drive
    3. Update image_url, image_status = 'uploaded'

Both tracks run in parallel (n8n SplitInBatches or separate Execute Workflow nodes).
Both write to the same scenes table.
Downstream (Ken Burns, color grade, assembly) is UNCHANGED — it processes all scenes with image_status = 'uploaded' regardless of how the image was created.

Also add a pre-check: if topics.classification_status != 'reviewed', refuse to start.
This ensures the operator has reviewed and accepted the classification before images are generated.

Use /careful for the parallel execution logic.
```

### Sub-Phase 7.4: Dashboard Components

**Objective:** Build the SceneClassificationReview component and integrate into production flow.
**Agents:** `@frontend-developer`

#### Prompt 7.4.1: SceneClassificationReview Component

```
Use @frontend-developer. Use the frontend-design skill — read SKILL.md first.
Read design-system/MASTER.md.

Build dashboard/src/components/production/SceneClassificationReview.jsx

This component is shown AFTER script approval and BEFORE image generation. It displays the AI classification results and lets the operator review/override.

Layout (read the wireframe in REMOTION_AGENT_MERGE.md "Classification Review on Dashboard" section):

1. SUMMARY BAR:
   - Total scenes count
   - Fal.ai count with blue badge
   - Remotion count with purple badge
   - Pie chart (small, Recharts) showing the split
   - Estimated image cost (Fal.ai count × $0.03)
   - Estimated savings vs all-Fal.ai

2. FILTER BAR:
   - Tabs: All | Fal.ai Only | Remotion Only
   - Search box (filter by narration text)

3. SCENE LIST:
   - Each row: scene number, render_method badge (blue "FAL.AI" or purple "REMOTION"), narration text (truncated, expandable), classification_reasoning (gray subtext)
   - For Remotion scenes additionally: template name badge, [Preview] button, [Edit Data] button
   - Each row has an override dropdown: [Override → Remotion ▾] or [Override → Fal.ai ▾]
   - Override to Remotion: opens inline template selector + data payload form
   - Override to Fal.ai: clears remotion_template and data_payload, sets classification_status = 'overridden'

4. REMOTION PREVIEW:
   - Clicking [Preview] calls POST /preview on render service
   - Shows a modal with the rendered PNG at actual dimensions
   - Below the preview: template name, data_payload as formatted JSON, color_mood badge

5. DATA EDITOR:
   - Clicking [Edit Data] opens a form-based editor (generated from props_schema)
   - Each field from props_schema becomes a form input (text, number, select, array)
   - Save updates data_payload in Supabase
   - Preview auto-refreshes after save

6. ACTION BUTTONS:
   - [Re-classify All] — triggers WF_SCENE_CLASSIFY again
   - [Accept & Proceed to Image Generation →] — updates topics.classification_status = 'reviewed', triggers WF_IMAGE_GENERATION

Use Supabase Realtime to show classification progress (scenes updating from 'pending' to 'classified' in real-time as the workflow runs).

Also build dashboard/src/hooks/useSceneClassification.js:
- Queries scenes for a topic with classification fields
- Provides mutation functions: overrideRenderMethod(sceneId, newMethod, template?, dataPayload?)
- Provides acceptClassification(topicId) — sets status to 'reviewed'
- Subscribes to Realtime on scenes table for live progress
```

#### Prompt 7.4.2: Integrate into Production Flow

```
Use @frontend-developer. Wire SceneClassificationReview into the existing production flow.

1. Modify dashboard/src/pages/ProductionMonitor.jsx:
   - Add a new pipeline step between "Script Approved" and "Generating Images"
   - Step label: "Scene Classification"
   - Status colors: green (reviewed), yellow (classified, awaiting review), blue-spinning (classifying), gray (pending)
   - Clicking the step navigates to the classification review

2. Modify the production flow logic:
   - After Gate 2 (script approved), automatically trigger WF_SCENE_CLASSIFY via webhook
   - Dashboard shows SceneClassificationReview component
   - Image generation button is DISABLED until classification_status = 'reviewed'
   - The "Accept & Proceed" button on SceneClassificationReview is the trigger for image gen

3. For AUTO-PILOT mode:
   - If projects.auto_pilot_enabled = true AND classification completes without errors:
     Auto-accept classification (set reviewed) and trigger image gen
   - Auto-pilot trusts the AI classifier
   - Still logged: operator can review later

4. Modify dashboard/src/components/production/PipelineTable.jsx (or equivalent):
   - Add classification_status to the pipeline step visualization
   - Show Fal.ai/Remotion split counts inline

5. For SHORT-FORM production:
   - When shorts scenes are displayed in ShortsCreator.jsx, show render_method badge per scene
   - If shorts pipeline regenerates visuals, classification review appears for short-form scenes too

Use /qa then /review.
```

### Sub-Phase 7.5: Testing

**Objective:** Verify full hybrid pipeline end-to-end.
**Agents:** `@qa-engineer`

#### Prompt 7.5.1: E2E Testing

```
Use @qa-engineer. Test the Remotion hybrid rendering pipeline.

TEST 1 — Classification Accuracy (Finance Niche):
- Create a test topic in the credit cards niche with 20 scenes
- Include: 5 scenes with specific dollar amounts/percentages, 3 comparison scenes,
  2 chart/data scenes, 2 quote scenes, 8 photorealistic scenes
- Run WF_SCENE_CLASSIFY
- Verify: the 12 data-heavy scenes are classified as 'remotion', the 8 photorealistic as 'fal_ai'
- Check classification_reasoning is coherent for each scene

TEST 2 — Classification Accuracy (Historical Niche):
- Create a test topic about World War 2 with 20 scenes
- Expect: mostly fal_ai (historical imagery), maybe 2-3 remotion (timeline, stat callout)
- Verify niche sensitivity: AI adapts classification to content type

TEST 3 — Dashboard Review:
- Load SceneClassificationReview for test topic
- Verify summary counts match
- Override 2 scenes (fal_ai → remotion, remotion → fal_ai)
- Verify overrides persist in Supabase
- Click "Accept & Proceed"
- Verify topics.classification_status changes to 'reviewed'

TEST 4 — Remotion Rendering:
- For the Remotion-classified scenes, verify render service produces valid PNGs
- Check each PNG: correct resolution (1920x1080 or 1080x1920), non-blank, text readable
- Compare visual style: Remotion renders should have matching color_mood treatment to Fal.ai images

TEST 5 — Full Pipeline Integration:
- Run full pipeline for 10 scenes (5 fal_ai + 5 remotion)
- Verify: classification → image gen (parallel tracks) → Ken Burns → color grade → assembly
- The final assembled video should look seamless — no visual discontinuity between Fal.ai and Remotion scenes

TEST 6 — Edge Cases:
- Empty data_payload for Remotion scene → should trigger Data Payload Generation prompt
- Remotion render service down → should fail gracefully, suggest override to fal_ai
- All scenes classified as fal_ai → should work (Remotion track has 0 scenes, no error)
- All scenes classified as remotion → should work (Fal.ai track has 0 scenes)
- Auto-pilot mode → classification should auto-accept

TEST 7 — Preview Function:
- Click Preview on 3 different Remotion templates
- Verify preview modal shows correct render
- Edit data_payload, save, preview again — verify update

Report: pass/fail per test, screenshots, any visual quality issues.
Use /qa per test. Use /review for final report.
```

---

## Phase 8: Kinetic Typography Engine — Dual Production Style

**Objective:** Add "Kinetic Typography" as a second production style alongside "AI Cinematic." Build the Python service, n8n integration, and dashboard views.

**Build order:** 6 sub-phases, 12 prompts.

---

### Sub-Phase 8.1: Schema + Service Scaffold

**Agents:** `@devops-engineer`, `@backend-architect`

#### Prompt 8.1.1: Migration

```
Use @devops-engineer. Apply migration 006_kinetic_typography.sql.

Read KINETIC_AGENT_MERGE.md for exact SQL.

1. ALTER projects ADD production_style (default 'ai_cinematic')
2. CREATE kinetic_scenes table (scene_number, scene_type, duration, chapter, elements JSONB, render/audio status)
3. CREATE kinetic_jobs table (status, progress tracking, performance log)
4. RLS policies for both tables
5. Verify on live Supabase

Use /careful.
```

#### Prompt 8.1.2: Python Service Scaffold

```
Use @backend-architect. Create the kinetic typography service.

Create directory: kinetic-typo-engine/ at project root with this structure:
  src/ (12 Python modules), fonts/, tests/, requirements.txt, .env.example

Build main.py FIRST as a FastAPI service on port 3200:
  POST /generate — accepts { topic_id, project_id, keyword, niche, duration_seconds, style_dna, supabase_url, supabase_key, drive_folder_id }
    Creates kinetic_jobs row, spawns background task, returns { job_id, status: "queued" }
  GET /status/{job_id} — reads kinetic_jobs row, returns progress
  POST /cancel/{job_id} — sets job status to cancelled
  GET /health — returns ok + active job count

Build config.py with ALL constants from KINETIC_AGENT_MERGE.md:
  COLORS dict, VIDEO specs (1920x1080, 30fps, JPEG q95, CRF 18), TTS config, duck config, font paths, Supabase client init

Build requirements.txt:
  fastapi, uvicorn, pillow, pycairo, numpy, scipy, pydub, google-cloud-texttospeech,
  google-auth, google-api-python-client, anthropic, python-dotenv, supabase, rich, pydantic,
  imageio-ffmpeg

Create systemd service file: kinetic-typo-engine/kinetic-typo.service for VPS deployment.

Use /qa after scaffold.
```

---

### Sub-Phase 8.2: Rendering Engine (Python)

**Agents:** `@frontend-developer` (visual), `@backend-architect` (perf)

#### Prompt 8.2.1: Animation + Background + Typography

```
Use @backend-architect. Build the core rendering modules.

Read KINETIC_AGENT_MERGE.md "Python Module Specifications" section AND the full
kinetic-typo-engine skills.md for implementation patterns (easing functions, rendering
optimization, cached layer pre-rendering, color palette, particle system).

Build in order, test each before moving on:

1. animation_engine.py — 4 easing functions + interpolate() + get_animation_progress()
   Test: all easings return ~0.0 at t=0 and ~1.0 at t=1

2. background.py — render_background() with dark gradient + purple/teal glow zones,
   render_grid_overlay() at 15% opacity, particle system (generate, update, render)
   Test: render a single 1920x1080 frame, save as test_bg.jpg, visual check

3. typography.py — measure_text() via pycairo, render_text_layer() cached,
   render_glow_layer() with Gaussian blur (ONCE not per frame),
   render_divider_layer() gradient, composite_with_opacity() via numpy
   Style presets: LABEL, HEADLINE, ACCENT, BODY, STAT_VALUE, STAT_LABEL
   Test: render text "HELLO WORLD" in each style, save frames

4. cards.py — render_card() with rounded rect, border glow, colored index,
   title and body text. Index colors: 1=purple, 2=teal, 3=orange, 4=pink, 5=cyan
   Test: render 3 cards, verify visual

Use /careful for the cached layer optimization — it's the difference between 99ms and 42ms per frame.
Use /qa after all 4 modules pass visual tests.
```

#### Prompt 8.2.2: Frame Renderer

```
Use @backend-architect. Build frame_renderer.py — the core scene renderer.

Read KINETIC_AGENT_MERGE.md scene types table and animation types table.

render_scene(scene, output_dir, start_frame, particles) → frame_count:
1. Pre-render: For each element in scene.elements, pre-render text/glow/card layers
   based on style (ONCE per scene)
2. Per-frame loop (duration_seconds × 30 frames):
   a. Copy background
   b. Update + render particles
   c. For each element:
      - Calculate animation progress via get_animation_progress(elapsed_ms, delay_ms, duration_ms, easing)
      - If typewriter/word_by_word: render partial text per frame
      - Else: composite pre-rendered layer with interpolated opacity/position
   d. Save as JPEG quality=95: frame_{global_frame:06d}.jpg
3. Return frame_count

Scene type layouts:
- hook: label top, headline center, body below
- comparison: two columns with divider line between
- list: sequential card reveal (delay each card by 200ms × index)
- statement: single centered headline with glow
- stats: large stat_value center, stat_label below, optional counter animation
- quote: quote_text italic with large quote marks, quote_author below
- transition: fade to black / gradient shift
- chapter_title: large chapter number (semi-transparent bg), title center
- cta: subscribe prompt with accent highlights

JPEG output mandatory. PNG causes OOM at ~400 frames.
Test: render a 5-second test scene (150 frames), assemble via FFmpeg, watch it.
Use /careful for the per-frame loop — any bug here multiplies by 216,000 frames.
```

---

### Sub-Phase 8.3: Script, Voice, Audio (Python)

**Agents:** `@prompt-engineer`, `@api-developer`

#### Prompt 8.3.1: Script Generator

```
Use @prompt-engineer and @api-developer. Build script_generator.py.

Read KINETIC_AGENT_MERGE.md — the FULL short-form prompt and chunked long-form prompts
(Chapter Outline + Per-Chapter Scene Generation). Use them EXACTLY as written.

generate_script(keyword, niche, duration_seconds) → dict:
- If duration_seconds <= 900: single Claude API call with direct scene prompt
- If duration_seconds > 900: chunked approach:
  1. Generate chapter outline (duration/300 chapters)
  2. For each chapter: generate scenes (pass previous chapter's last scene as context)
  3. Stitch: concatenate scene arrays, re-number IDs sequentially
  4. Validate total duration (reject if off by >10s)
- Retry with exponential backoff (max 3 attempts)
- Write script to Supabase (topic record)
- Insert scenes into kinetic_scenes table

Duration validation: abs(actual - target) > 10 → reject and regenerate.

Use /careful for the prompts — script quality determines everything downstream.
Test: generate a 300s script for "AI automation", verify 18-22 scenes, verify duration = 300±10.
```

#### Prompt 8.3.2: Voice + Audio

```
Use @api-developer. Build voice_generator.py and audio_generator.py.

voice_generator.py:
- preprocess_for_tts(text) — EXACT implementation from KINETIC_AGENT_MERGE.md TTS rules
  (ALL_CAPS to title case preserving ACRONYMS, symbol expansion, skip card indices)
- calculate_speaking_rate(text, duration_ms) — auto-increase up to 1.5x
- generate_voice(elements, output_dir) — Google Cloud TTS per element,
  concatenate with silence padding matching delay_ms timing
- Voice: en-US-Journey-D, LINEAR16 48kHz, NO pitch parameter (Journey rejects it)

audio_generator.py:
- select_music(mood_tags, duration_seconds) — query music_library table (same as AI Cinematic)
- mix_final_audio(narration_path, music_path, output_path) — music ducking
  Detect voice regions via RMS in 20ms windows, duck music -7dB during voice,
  smooth with 50ms rolling average to prevent clicks
- Export WAV 48kHz stereo

Test: generate voice for "AI Is Eating the World" → should say "AI Is Eating the World"
  not "A-I I-S E-A-T-I-N-G T-H-E W-O-R-L-D"
Test: "$15.7T market" → "15.7 trillion dollars market"
Test: mix voice + music → verify ducking is audible and clean
Use /qa.
```

---

### Sub-Phase 8.4: Assembly + Upload (Python)

**Agents:** `@backend-architect`

#### Prompt 8.4.1: Video Assembler

```
Use @backend-architect. Build video_assembler.py.

assemble_video(frames_dir, audio_path, output_path):
  FFmpeg command:
    ffmpeg -y -framerate 30 -i {frames_dir}/frame_%06d.jpg -i {audio_path}
    -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p
    -c:a aac -b:a 192k -ar 48000
    -threads 1 -filter_threads 1
    -shortest -movflags +faststart
    {output_path}

For long-form (>15 min): assemble per-chapter, then concat chapters:
  1. Each chapter: render scenes → per-scene frame dir → per-scene clip → concat scene clips
  2. Delete frames immediately after each scene's FFmpeg pass (memory management)
  3. After all chapters: concat chapter clips → final video
  4. gc.collect() between chapters

_find_ffmpeg(): check PATH first, fallback to imageio-ffmpeg
Log full FFmpeg command before executing
Verify sync with ffprobe if available (skip gracefully if not)

Also build drive_uploader.py — reuse existing Vision GridAI Drive upload logic.

Test: assemble a 10-second test video (300 frames + audio). Verify plays in VLC.
Use /qa.
```

---

### Sub-Phase 8.5: n8n + Dashboard Integration

**Agents:** `@api-developer`, `@frontend-developer`

#### Prompt 8.5.1: n8n Workflows

```
Use @api-developer. Build 3 n8n workflows for kinetic integration.

WF_KINETIC_TRIGGER:
  Trigger: after script approval for projects where production_style = 'kinetic_typography'
  1. Read topic data (keyword, niche, duration)
  2. POST to kinetic service at localhost:3200/generate
  3. Store job_id in kinetic_jobs table
  4. Trigger WF_KINETIC_POLL

WF_KINETIC_POLL:
  Trigger: cron every 30 seconds (active only when kinetic job is running)
  1. GET /status/{job_id}
  2. Update kinetic_jobs: status, frames_rendered, current_scene
  3. If status = 'complete': trigger WF_KINETIC_COMPLETE, stop polling
  4. If status = 'failed': log error, stop polling, alert dashboard

WF_KINETIC_COMPLETE:
  Trigger: webhook from poll completion
  1. Update topic status to 'video_ready'
  2. Trigger thumbnail generation (reuse WF_THUMBNAIL)
  3. Trigger platform metadata generation (reuse WF_PLATFORM_METADATA)
  4. Dashboard shows video preview at Gate 3

Store as WF_KINETIC_*.json.
```

#### Prompt 8.5.2: CreateProjectModal Update

```
Use @frontend-developer. Use frontend-design skill.

Modify dashboard/src/components/projects/CreateProjectModal.jsx:

Add production_style dropdown between niche name and description fields.
Options: "AI Cinematic" (default), "Kinetic Typography"
Store as projects.production_style on creation.

When "Kinetic Typography" selected:
- Show info note: "Animated text graphics. Best for data-driven, explainer, educational content. No AI images — all visuals programmatic."
- Description placeholder changes

Also modify useCreateProject hook to include production_style in the creation payload.
```

#### Prompt 8.5.3: KineticScriptReview Component

```
Use @frontend-developer. Use frontend-design skill.

Build dashboard/src/components/script/KineticScriptReview.jsx

Shows element-level timeline (NOT scene-level narration like AI Cinematic).
Read the wireframe in KINETIC_AGENT_MERGE.md "KineticScriptReview" section.

Layout:
- Chapter accordion (expandable)
- Inside each chapter: scene cards with type badge and duration
- Inside each scene: element rows with text, style badge (label/headline/accent/body/stat), animation badge, timing (delay + duration)
- Color-coded by element style
- Approve/Reject/Refine buttons (same gate logic as AI Cinematic)

Also build KineticSceneCard.jsx and KineticElementRow.jsx sub-components.

The page conditionally renders KineticScriptReview OR the existing ScriptReview
based on project.production_style.
```

#### Prompt 8.5.4: KineticProductionMonitor Component

```
Use @frontend-developer. Use frontend-design skill.

Build dashboard/src/components/production/KineticProductionMonitor.jsx

Read wireframe in KINETIC_AGENT_MERGE.md "KineticProductionMonitor" section.

Different pipeline stages from AI Cinematic:
[Script ✅] → [Frame Rendering 🔵] → [TTS ⬜] → [Audio Mix ⬜] → [Assembly ⬜] → [Upload ⬜]

Shows:
- Current chapter and scene being rendered
- Frame progress bar (frames_rendered / total_frames)
- Per-chapter progress bars
- Estimated time remaining
- Performance stats (avg frame time)

Subscribe to Supabase Realtime on kinetic_jobs + kinetic_scenes tables.

The ProductionMonitor page conditionally renders this OR the existing AI Cinematic
monitor based on project.production_style.
```

#### Prompt 8.5.5: Route + Pipeline Branching

```
Use @frontend-developer.

Modify production flow to branch on production_style:

1. ScriptReview page: if production_style === 'kinetic_typography' → render KineticScriptReview, else existing ScriptReview

2. After Gate 2 (script approved):
   - If AI Cinematic: trigger WF_SCENE_CLASSIFY (existing flow)
   - If Kinetic Typography: trigger WF_KINETIC_TRIGGER (skip classification entirely)

3. ProductionMonitor page: if production_style === 'kinetic_typography' → render KineticProductionMonitor, else existing monitor

4. VideoReview, Analytics, Calendar, Engagement, Settings: UNCHANGED — work for both styles

5. ProjectDashboard: show production_style badge next to project name

6. ProjectCard (on ProjectsHome): show small badge "AI Cinematic" or "Kinetic Typo"

Use /qa then /review.
```

---

### Sub-Phase 8.6: Testing

**Agents:** `@qa-engineer`

#### Prompt 8.6.1: E2E Testing

```
Use @qa-engineer. Test the full kinetic typography pipeline.

TEST 1 — Short-form (5 min):
- Create project with production_style = 'kinetic_typography'
- Generate script for "AI automation" (300s)
- Verify: 18-22 scenes, all scene types present, duration = 300±10s
- Review on KineticScriptReview — verify element timeline display
- Approve → verify WF_KINETIC_TRIGGER fires (not WF_SCENE_CLASSIFY)
- Monitor on KineticProductionMonitor — verify progress updates
- Review final video — verify: text readable, animations smooth, audio synced

TEST 2 — Long-form (30 min for practical test, extrapolate to 2hr):
- Create project, generate script (1800s, chunked into 6 chapters)
- Verify: chapter outline generated first, then per-chapter scenes
- Verify: scene IDs sequential across chapters, total duration correct
- Run full render — verify scene-by-scene cleanup (disk stays under 2GB active)

TEST 3 — TTS Preprocessing:
- Script with "AI IS THE FUTURE" → TTS says "AI Is the Future" (not letter-by-letter)
- Script with "$15.7T" → TTS says "15.7 trillion dollars"
- Script with "85%" → TTS says "85 percent"
- Script with card index "1" → skipped (not narrated)

TEST 4 — Dashboard Branching:
- Create 2 projects: one AI Cinematic, one Kinetic Typography
- Verify: ScriptReview shows correct variant per project
- Verify: ProductionMonitor shows correct variant per project
- Verify: VideoReview works for both (same component)
- Verify: ProjectCard shows correct badge

TEST 5 — Kinetic service resilience:
- Stop kinetic service → verify dashboard shows error state
- Start kinetic service → verify job resumes (if supported) or retrigger
- Kill service mid-render → verify no corrupted output, clean error

Use /qa per test. Use /review for final report. Use /freeze.
```

---

## Quick Reference — All Phases

| Phase | Features | Agents | gstack |
|-------|---------|--------|--------|
| 1 | Schema + script upgrade + resilience (6 prompts) | `@devops-engineer` `@prompt-engineer` `@backend-architect` | `/careful` → `/qa` → `/review` |
| 2 | Ken Burns + color grade + transitions (2 prompts) | `@api-developer` `@backend-architect` | `/careful` → `/qa` |
| 3 | Music + end cards + thumbnails (2 prompts) | `@api-developer` `@prompt-engineer` | `/qa` |
| 4 | Platform metadata + calendar + exports (3 prompts) | `@api-developer` `@frontend-developer` `@prompt-engineer` | `/qa` → `/review` |
| 5 | Engagement + analytics + auto-pilot (4 prompts) | `@frontend-developer` `@api-developer` `@backend-architect` `@prompt-engineer` | `/qa` → `/review` |
| 6 | Topic Intelligence + QA + Settings + testing (5 prompts) | `@api-developer` `@frontend-developer` `@qa-engineer` | `/qa` → `/review` → `/freeze` |
| 7 | Remotion hybrid rendering + classification + templates (9 prompts) | `@devops-engineer` `@backend-architect` `@frontend-developer` `@prompt-engineer` `@api-developer` `@qa-engineer` | `/careful` → `/qa` → `/review` → `/freeze` |
| 8 | Kinetic Typography engine + dual production style (12 prompts) | `@devops-engineer` `@backend-architect` `@frontend-developer` `@prompt-engineer` `@api-developer` `@qa-engineer` | `/careful` → `/qa` → `/review` → `/freeze` |
