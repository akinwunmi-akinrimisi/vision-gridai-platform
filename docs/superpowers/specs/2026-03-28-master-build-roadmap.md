# Vision GridAI — Master Build Roadmap (31 Features)

**Date:** 2026-03-28
**Strategy:** Foundation up, 10 small phases, immediate I2V/T2V deprecation
**Reference:** VisionGridAI_Platform_Agent.md (v4.0), CLAUDE.md, GUIDE.md
**Gap Analysis:** 17 new workflows, 3 new pages, 4 hooks, 6 page enhancements, 2 scripts, 3 migrations to deploy

---

## Phase Overview

| Phase | Name | Duration | Deliverable | Depends On |
|-------|------|----------|-------------|------------|
| 1 | Database + Deprecation | 1 day | Migrations deployed, I2V/T2V deactivated | — |
| 2 | Retry Wrapper + Resume System | 1 day | WF_RETRY_WRAPPER + checkpoint logic | Phase 1 |
| 3 | Ken Burns + Color Grade Pipeline | 2 days | WF_KEN_BURNS replaces I2V/T2V end-to-end | Phase 2 |
| 4 | Captions + Transitions + Assembly | 2 days | Updated WF_CAPTIONS_ASSEMBLY with xfade + ASS | Phase 3 |
| 5 | Music + End Cards + Platform Exports | 1-2 days | WF_MUSIC_SELECT, WF_ENDCARD, platform renders | Phase 4 |
| 6 | QA + Thumbnails + Metadata | 1-2 days | WF_QA_CHECK, WF_THUMBNAIL, WF_PLATFORM_METADATA | Phase 5 |
| 7 | Topic Intelligence Engine | 2-3 days | 7 research workflows + /research page | Phase 1 |
| 8 | Content Calendar + Scheduling | 1-2 days | WF_SCHEDULE_PUBLISHER + /calendar page | Phase 1 |
| 9 | Engagement Hub + Comments | 1-2 days | WF_COMMENTS_SYNC + WF_COMMENT_ANALYZE + /engagement page | Phase 1 |
| 10 | Page Enhancements + Auto-Pilot + Deploy | 2 days | Enhanced Settings/Dashboard/VideoReview/Analytics/ScriptReview + auto-pilot | Phases 6-9 |

**Total: ~15-19 days of work**

**Parallelism:** Phases 7, 8, 9 can run in parallel with each other (all depend only on Phase 1). Phases 2-6 are strictly sequential (cinematic pipeline chain).

```
Phase 1 ─── Phase 2 ─── Phase 3 ─── Phase 4 ─── Phase 5 ─── Phase 6 ───┐
   │                                                                       │
   ├─── Phase 7 (Topic Intelligence) ─────────────────────────────────────┤
   ├─── Phase 8 (Calendar) ──────────────────────────────────────────────┤
   └─── Phase 9 (Engagement) ────────────────────────────────────────────┤
                                                                          │
                                                                    Phase 10
```

---

## Phase 1: Database + Deprecation

**Goal:** All new tables exist on VPS. I2V/T2V workflows deactivated. Clean foundation.

### 1.1 Deploy migrations to VPS

SSH into VPS and run migrations 002-004:
```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud
docker exec -i supabase-db psql -U postgres < supabase/migrations/002_research_tables.sql
docker exec -i supabase-db psql -U postgres < supabase/migrations/003_cinematic_fields.sql
docker exec -i supabase-db psql -U postgres < supabase/migrations/004_calendar_engagement_music.sql
```

Verify all tables exist:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected new tables: `research_runs`, `research_results`, `research_categories`, `scheduled_posts`, `platform_metadata`, `comments`, `music_library`, `renders`, `production_logs`

Verify cinematic fields on scenes:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'scenes' AND column_name IN ('color_mood', 'zoom_direction', 'composition_prefix', 'transition_to_next', 'selective_color_element', 'pipeline_stage');
```

### 1.2 Deactivate I2V/T2V workflows on n8n

Deactivate (do NOT delete) these workflows via n8n UI:
- WF_I2V_GENERATION (`rHQa9gThXQleyStj`)
- WF_T2V_GENERATION (`KQDyQt5PV8uqCrXM`)
- WF_SCENE_I2V_PROCESSOR (`TOkpPY35veSf5snS`)
- WF_SCENE_T2V_PROCESSOR (`VLrMKfaDeKYFLU75`)

### 1.3 Update all existing scenes to static_image

```sql
UPDATE scenes SET visual_type = 'static_image' WHERE visual_type != 'static_image' OR visual_type IS NULL;
```

### 1.4 Add Style DNA column to projects (if not already present)

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS style_dna TEXT;
```

### Verification
- [ ] All 9 new tables exist on VPS
- [ ] Cinematic fields exist on scenes table
- [ ] pipeline_stage field exists on topics table
- [ ] auto_pilot columns exist on projects table
- [ ] I2V/T2V workflows deactivated (not deleted)
- [ ] All existing scenes set to `static_image`
- [ ] Style DNA column exists on projects

---

## Phase 2: Retry Wrapper + Resume System

**Goal:** Resilience infrastructure used by ALL subsequent workflows.

### 2.1 Build WF_RETRY_WRAPPER

n8n sub-workflow that wraps any API call with exponential backoff:
- Input: API call configuration (URL, method, headers, body)
- Logic: Try → catch → wait (1s → 2s → 4s → 8s) → retry, max 4 attempts
- Output: API response or final error
- On each retry: log to `production_logs` table
- Webhook: none (called as sub-workflow only)

Reference: Agent.md "Exponential Backoff Retry" section for the JS code pattern.

```javascript
// Core retry logic (n8n Function node)
async function withRetry(fn, maxRetries = 4, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

### 2.2 Add resume/checkpoint logic pattern

Create a reusable n8n node pattern for checking scene status before processing:
```sql
-- Template: only process pending scenes
SELECT id, scene_number, narration_text
FROM scenes
WHERE topic_id = {TOPIC_ID} AND {stage}_status = 'pending'
ORDER BY scene_number;
```

Every production workflow will use this pattern. Document it in a shared n8n note or sticky.

### 2.3 Create production_logs helper

n8n Function node (reusable) that inserts into `production_logs`:
```javascript
// Input: stage, scene_number, action, status, duration_ms, cost_usd, error_message
await $http.request({
  method: 'POST',
  url: `${$env.SUPABASE_URL}/rest/v1/production_logs`,
  headers: {
    'apikey': $env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: { topic_id, stage, scene_number, action, status, duration_ms, cost_usd, error_message }
});
```

### Verification
- [ ] WF_RETRY_WRAPPER deployed to n8n, tested with mock failing endpoint
- [ ] Resume query pattern documented
- [ ] Production log helper tested (inserts visible in Supabase)

---

## Phase 3: Ken Burns + Color Grade Pipeline

**Goal:** Replace I2V/T2V with FFmpeg Ken Burns + color grading. Every scene: image → zoompan + color grade → .mp4 clip.

### 3.1 Create Ken Burns execution script

`execution/ken_burns.sh`:
```bash
#!/bin/bash
# Generates a Ken Burns .mp4 clip from a static image
# Args: INPUT_IMAGE, DURATION, ZOOM_DIRECTION, COLOR_MOOD, OUTPUT_FILE

INPUT="$1"
DURATION="$2"
ZOOM_DIR="$3"
COLOR_MOOD="$4"
OUTPUT="$5"
FRAMES=$((DURATION * 30))  # 30fps

# Zoom direction → zoompan expressions (from Agent.md table)
case "$ZOOM_DIR" in
  in)    Z="min(zoom+0.0015,1.5)"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
  out)   Z="if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
  pan_left)  Z="1.2"; X="iw*0.3-(iw*0.3-iw*0.05)*on/(d-1)"; Y="ih/2-(ih/zoom/2)" ;;
  pan_right) Z="1.2"; X="iw*0.05+(iw*0.3-iw*0.05)*on/(d-1)"; Y="ih/2-(ih/zoom/2)" ;;
  pan_up)    Z="1.2"; X="iw/2-(iw/zoom/2)"; Y="ih*0.35-(ih*0.35-ih*0.1)*on/(d-1)" ;;
  static_slight_zoom) Z="min(zoom+0.0005,1.15)"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
  *)     Z="min(zoom+0.0015,1.5)"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
esac

# Color mood → FFmpeg filter chain (from Agent.md Color Science table)
case "$COLOR_MOOD" in
  cold_desat)    COLOR="eq=saturation=0.3:contrast=1.2:brightness=-0.05,colorbalance=bs=0.1:bm=0.05:bh=0.15" ;;
  cool_neutral)  COLOR="eq=saturation=0.6:contrast=1.08,colorbalance=bs=0.05:bm=0.02:bh=0.05" ;;
  dark_mono)     COLOR="eq=saturation=0.15:contrast=1.25:brightness=-0.08,colorbalance=bs=0.05:bh=0.05" ;;
  warm_sepia)    COLOR="eq=saturation=0.6:contrast=1.1,colorbalance=rs=0.15:gm=0.05:bh=-0.1" ;;
  warm_gold)     COLOR="eq=saturation=0.9:contrast=1.03:brightness=0.02,colorbalance=rs=0.1:gm=0.05:bs=-0.05" ;;
  full_natural)  COLOR="eq=saturation=1.1:contrast=1.03:brightness=0.03" ;;
  muted_selective) COLOR="eq=saturation=0.35:contrast=1.12:brightness=-0.02,colorbalance=bs=0.05:bm=0.03:bh=0.08" ;;
  *)             COLOR="eq=saturation=1.1:contrast=1.03:brightness=0.03" ;;
esac

ffmpeg -y -loop 1 -i "$INPUT" \
  -vf "scale=8000:-1,zoompan=z='$Z':x='$X':y='$Y':d=$FRAMES:s=1920x1080:fps=30,$COLOR" \
  -t "$DURATION" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
  "$OUTPUT"
```

### 3.2 Build WF_KEN_BURNS workflow

n8n workflow that processes all pending scenes for a topic:
1. **Trigger:** Called by orchestrator after image generation completes
2. **Query:** `SELECT * FROM scenes WHERE topic_id = X AND clip_status = 'pending' AND image_url IS NOT NULL ORDER BY scene_number`
3. **For each scene:**
   - Download image from URL
   - Check if `selective_color_element` is set → if yes, skip FFmpeg color grading
   - Run Ken Burns script with scene's `zoom_direction` and `color_mood`
   - Upload clip to Google Drive
   - Update scene: `clip_status = 'generated'`, `video_url`, `video_drive_id`
   - Log to `production_logs`
4. **Use WF_RETRY_WRAPPER** for Fal.ai image downloads and Drive uploads
5. **Resume-safe:** Only processes `clip_status = 'pending'` scenes

### 3.3 Update WF_IMAGE_GENERATION for cinematic prompts

Modify the existing image generation workflow to use the 3-part prompt architecture:
```
{COMPOSITION_PREFIX} {SCENE_SUBJECT} {STYLE_DNA}
```

- Read `composition_prefix` from scene row
- Read `style_dna` from project row
- Combine: `${scene.composition_prefix} ${scene.image_prompt} ${project.style_dna}`
- Add universal negative prompt from workflow static data

### 3.4 Update WF_WEBHOOK_PRODUCTION orchestrator

Chain after images: trigger WF_KEN_BURNS instead of WF_I2V + WF_T2V.

### Verification
- [ ] Ken Burns script produces valid .mp4 from test image
- [ ] All 6 zoom directions produce visually distinct motion
- [ ] All 7 color moods produce visually distinct grades
- [ ] Selective color scenes skip FFmpeg grading
- [ ] WF_KEN_BURNS processes 172 scenes for a test topic
- [ ] Pipeline chains correctly: images → Ken Burns → next stage
- [ ] Resume works: crash mid-batch → restart processes only remaining scenes

---

## Phase 4: Captions + Transitions + Assembly

**Goal:** Updated assembly pipeline with xfade transitions and ASS kinetic captions.

### 4.1 Update caption generation for cinematic fields

Modify caption system to use `caption_highlight_word` from scene data:
- Read highlight word per scene
- Generate ASS subtitle with two-tone highlight (white text, yellow/red for highlight word)
- Reference: Agent.md "Kinetic Caption System" and existing `execution/generate_kinetic_ass.py`

### 4.2 Build transition assembly with xfade

Create `execution/assemble_with_transitions.sh`:
- Read `transition_to_next` field per scene
- Apply xfade between consecutive clips using the 5 transition types
- **Batch processing:** Assemble in groups of 15-20 scenes (FFmpeg memory limit), then concat batches
- Offset calculation: `offset_N = SUM(durations[0..N-1]) - SUM(transition_durations[0..N-2])`

### 4.3 Update WF_CAPTIONS_ASSEMBLY

Modify existing workflow:
- Replace simple concat with xfade-based assembly
- Use new ASS captions with highlight words
- Add transition_to_next field to concat logic
- Maintain batch assembly pattern for 172 scenes

### Verification
- [ ] ASS captions show highlight words in contrasting color
- [ ] All 5 transition types render correctly
- [ ] 172-scene assembly completes without OOM (batched)
- [ ] Audio sync maintained through transitions

---

## Phase 5: Music + End Cards + Platform Exports

**Goal:** Background music, branded end cards, platform-specific renders.

### 5.1 Build WF_MUSIC_SELECT

- Input: topic_id
- Read script's `music_sections` from topic's `script_json`
- Match moods to tracks in `music_library` table
- Mix with FFmpeg ducking: `volume=0.12` under voiceover
- Output: mixed audio file

### 5.2 Build WF_ENDCARD

- Input: topic_id, format (short/long)
- Generate branded end card image (dark bg, logo, subscribe CTA)
- FFmpeg fade in/out: 3s for shorts, 5-8s for long-form
- Append to assembled video

### 5.3 Build platform-specific export renders

Create WF_PLATFORM_RENDERS or add to assembly:
- YouTube Long: CRF 17-19, slow preset, 12 Mbps max, 192k AAC, 1920x1080
- TikTok: CRF 20-23, medium preset, 4 Mbps max, 128k AAC, 1080x1920
- Instagram Reels: CRF 20-23, medium preset, 3.5 Mbps max, 128k AAC, 1080x1920
- YouTube Shorts: CRF 18-20, slow preset, 6 Mbps max, 192k AAC, 1080x1920

Store renders in `renders` table with file URLs.

### 5.4 Seed music library

Upload 10-20 royalty-free tracks to Google Drive, insert metadata into `music_library` table with mood_tags, bpm, duration, instrument_palette.

### Verification
- [ ] Music ducking level is barely perceptible (volume=0.12)
- [ ] End card appends correctly with fade
- [ ] 4 platform exports produce distinct files with correct specs
- [ ] Renders table populated with file URLs and metadata

---

## Phase 6: QA + Thumbnails + Metadata

**Goal:** Automated quality checks, AI thumbnails, per-platform SEO metadata.

### 6.1 Build WF_QA_CHECK

13-point automated checklist (from Agent.md):

**Visual (5):** Resolution, file size, no black frames, frame rate 30fps, aspect ratio
**Caption (3):** ASS file exists + correct count, no overflow, highlight words valid
**Audio (3):** Duration matches video, loudness -16 LUFS, no silence gaps >3s
**Platform (2):** YouTube description ≤5000 chars, TikTok caption ≤2200 chars

Run FFprobe + FFmpeg analysis. Store pass/fail results in `production_logs`.

### 6.2 Build WF_THUMBNAIL

- Read `script_metadata.thumbnail_prompt` from topic
- Generate image via Fal.ai Seedream 4.0
- Add text overlay via Sharp/Jimp (4 words max, high contrast)
- Upload to Google Drive + update topic `thumbnail_url`

### 6.3 Build WF_PLATFORM_METADATA

- Input: topic_id
- AI generates per-platform metadata:
  - YouTube: SEO title (60 chars), long description, 15-20 tags
  - TikTok: Punchy caption, trending hashtags
  - Instagram: Storytelling caption, hashtag blocks
- Store in `platform_metadata` table (one row per platform)
- Reference: Agent.md "YouTube SEO Metadata Generator" prompt

### Verification
- [ ] QA check runs on a test video, produces 13 pass/fail results
- [ ] Thumbnail generates with text overlay
- [ ] Platform metadata generates for all 3 platforms
- [ ] Results visible in Supabase tables

---

## Phase 7: Topic Intelligence Engine

**Goal:** 5-source research scraping + AI categorization + dashboard page.

*Can run in parallel with Phases 2-6.*

### 7.1 Build research scraper workflows (5)

Each scraper is an n8n sub-workflow:

**WF_RESEARCH_REDDIT:**
- Use PRAW (Python via n8n Code node) or Apify Reddit Scraper
- Search derived keywords across relevant subreddits
- Extract: title, body, subreddit, upvotes, comment_count, URL, date
- Engagement: `upvotes + (comments * 2)`
- Store 10 results in `research_results`

**WF_RESEARCH_YOUTUBE:**
- YouTube Data API v3 (already have credential)
- Search top niche videos from last 7 days
- Extract top comments (sorted by relevance)
- Engagement: `likes + (replies * 3)`
- Store 10 results

**WF_RESEARCH_TIKTOK:**
- Apify TikTok Scraper actor
- Search by keyword
- Extract: caption, hashtags, likes, comments, shares, URL
- Engagement: `likes + (comments * 2) + (shares * 3)`
- Store 10 results

**WF_RESEARCH_GOOGLE_TRENDS:**
- pytrends via n8n Code node + SerpAPI for PAA
- Get trending queries, related queries, breakout topics
- Extract People Also Ask questions
- Engagement: `search_interest_index * 10`
- Store 10 results

**WF_RESEARCH_QUORA:**
- Apify Quora Scraper actor
- Search by keyword
- Extract: question, follow_count, answer_count, URL
- Engagement: `follows + (answers * 2)`
- Store 10 results

### 7.2 Build WF_RESEARCH_ORCHESTRATOR

- Trigger: webhook POST `/webhook/research/run` with `{ project_id }`
- Step 1: Create `research_runs` row (status: 'scraping')
- Step 2: Derive keywords from project niche via Claude Haiku
- Step 3: Run all 5 scrapers in parallel (each as sub-workflow)
- Step 4: Update `sources_completed` after each completes
- Step 5: After all 5 done → set status to 'categorizing' → call WF_RESEARCH_CATEGORIZE
- Error handling: If a source fails, continue with remaining. Log to `error_log`.

### 7.3 Build WF_RESEARCH_CATEGORIZE

- Read all 50 results for the run
- Send to Claude Haiku with categorization prompt (from Agent.md)
- Create `research_categories` rows (4-8 clusters)
- Update each result's `category_id` and `ai_video_title`
- Set run status to 'complete'

### 7.4 Build dashboard: /research page

**New files:**
- `dashboard/src/pages/Research.jsx`
- `dashboard/src/hooks/useResearch.js`
- `dashboard/src/components/research/ResearchRunButton.jsx`
- `dashboard/src/components/research/ResearchProgress.jsx`
- `dashboard/src/components/research/CategoryCards.jsx`
- `dashboard/src/components/research/SourceTabs.jsx`
- `dashboard/src/components/research/TopicRow.jsx`

**Page layout** (from Agent.md):
1. Header + "Run Research" button + last run timestamp
2. Progress bar (Supabase Realtime on `research_runs`)
3. Ranked category cards with "Use This Topic" button
4. Source tabs (Reddit/YouTube/TikTok/Trends/Quora) with 10-row tables
5. Summary bar (total results, categories, cost)

**Route:** Add `/research` to App.jsx + Sidebar nav

### 7.5 Update CreateProjectModal

Add "Pick from Research" dropdown:
- Pulls from latest complete research run
- Category dropdown filters by `research_categories.label`
- Topic dropdown shows `ai_video_title` values
- Selecting auto-fills niche name + description
- Manual entry still available

### Verification
- [ ] Each of 5 scrapers returns 10 results for test niche
- [ ] Orchestrator runs all 5 in parallel, handles failures gracefully
- [ ] AI categorization produces 4-8 ranked clusters
- [ ] /research page shows progress, categories, source tabs
- [ ] CreateProjectModal dropdown pre-fills from research data
- [ ] Total cost per run ~$0.13

---

## Phase 8: Content Calendar + Scheduling

**Goal:** Visual scheduling page + automated publishing cron.

### 8.1 Build WF_SCHEDULE_PUBLISHER

- Trigger: Cron every 15 minutes
- Query: `SELECT * FROM scheduled_posts WHERE status = 'scheduled' AND scheduled_at <= NOW()`
- For each due post: publish to appropriate platform (YouTube/TikTok/Instagram)
- Update status to 'published' or 'failed'
- Uses WF_RETRY_WRAPPER for API calls

### 8.2 Build dashboard: /project/:id/calendar page

**New files:**
- `dashboard/src/pages/ContentCalendar.jsx`
- `dashboard/src/hooks/useSchedule.js`
- `dashboard/src/components/calendar/CalendarGrid.jsx`
- `dashboard/src/components/calendar/ContentBlock.jsx`
- `dashboard/src/components/calendar/ScheduleModal.jsx`

**Page layout:**
1. Monthly/weekly toggle grid
2. Color-coded blocks by platform (YouTube blue, TikTok dark, Instagram gradient)
3. Drag-and-drop to reschedule (updates `scheduled_at`)
4. Click block → ScheduleModal with details + edit
5. Supabase Realtime on `scheduled_posts`

**Route:** Add `/project/:id/calendar` to App.jsx + Sidebar nav

### Verification
- [ ] Calendar shows existing scheduled posts
- [ ] Drag-and-drop updates schedule time in Supabase
- [ ] WF_SCHEDULE_PUBLISHER publishes when time arrives
- [ ] Failed publishes show error state on calendar

---

## Phase 9: Engagement Hub + Comments

**Goal:** Unified comment feed, AI analysis, reply composer.

### 9.1 Build WF_COMMENTS_SYNC

- Trigger: Daily cron
- For each published video across all projects:
  - Pull YouTube comments (YouTube Data API)
  - Pull TikTok comments (Apify/API)
  - Pull Instagram comments (Graph API)
- Deduplicate by `platform_comment_id`
- Store in `comments` table

### 9.2 Build WF_COMMENT_ANALYZE

- Trigger: After WF_COMMENTS_SYNC completes
- For new (unanalyzed) comments:
  - AI sentiment analysis (positive/negative/neutral)
  - AI intent scoring (0-1, purchase/interest signals)
  - Store results on comment row
- Uses Claude Haiku via OpenRouter

### 9.3 Build dashboard: /project/:id/engagement page

**New files:**
- `dashboard/src/pages/EngagementHub.jsx`
- `dashboard/src/hooks/useComments.js`
- `dashboard/src/hooks/useEngagement.js`
- `dashboard/src/components/engagement/CommentFeed.jsx`
- `dashboard/src/components/engagement/ConversionSignals.jsx`
- `dashboard/src/components/engagement/ReplyComposer.jsx`
- `dashboard/src/components/engagement/SentimentChart.jsx`

**Page layout:**
1. Unified comment feed (all platforms, filterable)
2. AI-flagged high-conversion comments (intent > 0.7)
3. Sentiment chart per video (Recharts)
4. Reply composer with AI-suggested replies
5. Supabase Realtime on `comments`

**Route:** Add `/project/:id/engagement` to App.jsx + Sidebar nav

### Verification
- [ ] Comments sync pulls from all 3 platforms
- [ ] AI analysis tags sentiment and intent correctly
- [ ] Engagement page shows unified feed
- [ ] Reply composer posts back to platform
- [ ] High-intent comments highlighted

---

## Phase 10: Page Enhancements + Auto-Pilot + Final Deploy

**Goal:** Enhance existing pages, add auto-pilot, full deploy + smoke test.

### 10.1 Enhance Settings page

Currently 46 lines. Add:
- **Auto-pilot tab:** Enable/disable toggle, topic threshold (default 8.0), script threshold (default 7.5), default visibility (unlisted), monthly budget
- **Music tab:** Music library browser, upload tracks, set mood tags
- **API health tab:** Connection status for all external services (Fal.ai, YouTube, TikTok, Instagram, Supabase, n8n)
- **Schedule templates tab:** Default posting times per platform

### 10.2 Enhance ProjectDashboard

Add:
- Auto-pilot toggle (prominent, top-right)
- Pipeline health indicator (green/amber/red based on failure rate)
- Recent activity feed (from `production_logs`)
- Quick actions bar (run research, start production, publish all)

### 10.3 Enhance VideoReview

Add:
- Visibility toggle (public/unlisted/private) before publish
- Platform selector (which platforms to publish to)
- QA checklist display (13-point pass/fail from WF_QA_CHECK)
- Thumbnail preview + regenerate button
- Per-platform metadata preview tabs

### 10.4 Enhance Analytics

Add:
- Cross-platform comparison (YouTube vs TikTok vs Instagram)
- Follower growth timeline
- Engagement rate per video
- Cost vs revenue waterfall chart

### 10.5 Enhance ScriptReview

Add:
- Display cinematic fields in scene rows: `color_mood` badge, `zoom_direction` icon, `composition_prefix` tag
- Visual preview of color mood (colored dot/bar matching the mood palette)
- Highlight word indicator on narration text

### 10.6 Enhance CreateProjectModal (if not done in Phase 7)

Verify "Pick from Research" dropdown works end-to-end.

### 10.7 Auto-pilot logic

Add to WF_WEBHOOK_PRODUCTION orchestrator:
```
IF project.auto_pilot_enabled:
  Topics with score > threshold → auto-approve
  Scripts with eval > threshold → auto-approve
  Videos → auto-publish as UNLISTED
  Check monthly_spend < monthly_budget (pause if exceeded)
  If 2 consecutive videos score < 6.0 → pause + alert
```

### 10.8 Final deploy

1. Build dashboard: `cd dashboard && npm run build`
2. Deploy: `scp -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/`
3. Smoke test all 15 pages on https://dashboard.operscale.cloud
4. Verify all new workflows active on n8n
5. Run full pipeline test: create project → research → topics → script → production → publish

### Verification
- [ ] Settings page has all new tabs, auto-pilot config saves to Supabase
- [ ] ProjectDashboard shows auto-pilot toggle and pipeline health
- [ ] VideoReview shows QA checklist and visibility toggle
- [ ] Analytics shows cross-platform data
- [ ] ScriptReview shows cinematic fields per scene
- [ ] Auto-pilot auto-approves and publishes as unlisted
- [ ] Full pipeline test passes end-to-end

---

## Per-Phase Execution Pattern

Each phase follows the Superpowers workflow:

```
1. Write spec (if phase needs design decisions):
   docs/superpowers/specs/{date}-{feature}.md

2. Write plan (always):
   docs/superpowers/plans/{date}-{feature}.md

3. Execute:
   Superpowers subagent-driven-development

4. Quality gate:
   /qa after each deliverable
   /review before marking phase complete

5. Commit + push
```

**For n8n workflow phases (2-6, 7-9):** Build in n8n UI, test manually, export JSON to `workflows/`, commit.

**For dashboard phases (7-10):** Build locally, `npm run build`, deploy to VPS, visual QA.

---

## Cost Impact

| Metric | Before (v3.0) | After (v4.0) | Change |
|--------|---------------|-------------|--------|
| Cost per video | ~$28 | ~$8.06 | -71% |
| Cost per shorts topic | ~$22 | ~$3.42 | -84% |
| Monthly (30 videos) | ~$1,540 | ~$361 | -76% |
| Topic Intelligence | N/A | ~$2.08/month | New |
| Engagement analysis | N/A | ~$0.60/month | New |

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Ken Burns zoompan quality inferior to I2V | Test with 20 sample scenes before committing to full deprecation. Keep I2V workflows inactive (not deleted) for rollback. |
| FFmpeg xfade OOM on 172 scenes | Batch assembly in groups of 15-20. Already documented in Agent.md. |
| Apify actors unreliable | WF_RETRY_WRAPPER handles transient failures. Track failure rates per source. |
| Auto-pilot publishes bad content | UNLISTED only. Human reviews weekly. Quality floor: 2 bad videos → auto-pause. |
| Migration breaks existing data | All migrations use IF NOT EXISTS and ALTER ADD IF NOT EXISTS. Non-destructive. |
