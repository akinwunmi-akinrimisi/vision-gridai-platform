# Vision GridAI Platform — Workflow Documentation
> STATUS: NEW FILE

---

## Overview

This document describes end-to-end user journeys through the Vision GridAI platform. Each workflow maps the human decision points, automated pipeline steps, and system intelligence layers.

---

## Workflow 1: New Project Setup (Intelligence-First)

**User goal:** Launch a new niche, make informed decisions before committing production budget.

**Total time:** 15–20 minutes human time + ~45 minutes automated background work

```
1. USER: Opens /niches → clicks "+ New Project"
2. USER: Inputs niche name and 2-sentence description
   Example: "Credit card rewards and optimization (CardMath style)"

3. SYSTEM (automated, ~10 min):
   a. WF_WEBHOOK → creates project record in Supabase
   b. WF_NICHE_RESEARCH fires:
      - Web search: top 20 channels in niche
      - Competitor pain points + blue-ocean gaps
      - RPM classification → F03 RPM Niche Intelligence
      - Seeds competitor_channels (top 5 auto-added)
   c. WF_NICHE_HEALTH fires:
      - Calculates initial niche health score
      - Writes niche_health_score to project

4. USER: Receives notification "Niche research complete ✅"
5. USER: Reviews project card showing:
   - Niche Health: 82/100 THRIVING
   - Estimated RPM: $18–$45/1K views
   - Competitors: 5 channels seeded

6. USER: Decides to proceed → clicks "Generate Topics"

7. SYSTEM (automated, ~15 min):
   a. WF_TOPIC_GENERATE → 25 SEO-researched topics + customer avatars
   b. WF_OUTLIER_SCORE → scores all 25 topics for algorithm momentum
   c. WF_SEO_SCORE → scores all 25 topics for search opportunity
   d. WF_TOPIC_INTELLIGENCE (5-source scraper) → enriches with Reddit/Trends/Comments
   e. Combined scores stored in topics table

8. USER: Navigates to Gate 1 — Topic Review
   - Sees scatter chart: topics plotted on Outlier vs SEO axes
   - Top 5 "Recommended" topics highlighted with intelligence badge
   - Reviews each topic card with dual score display

9. USER: Approves 10, rejects 5, refines 10 over 10 minutes
   - Rejected topics fire refinement considering all 24 others as context

10. SYSTEM: Pipeline fires for first approved topic → Gate 2 (script review)
```

---

## Workflow 2: Production to Publish (Single Video)

**User goal:** Take an approved topic through the full production pipeline and publish on YouTube.

**Total time:** 3–5 hours automated production + 25 minutes human review (3 gates)

```
GATE 2 — Script Review:
1. SYSTEM: WF_SCRIPT_GENERATE (3-pass, ~$1-2):
   - Pass 1: Foundation 5-7K words
   - Pass 2: Depth 8-10K words (Pass 1 as context)
   - Pass 3: Resolution 5-7K words + viral moment tagging
   - 7-dimension quality scoring per pass
   - CTR title optimization (5 variants + scores)

2. USER: Reviews script on Gate 2 page
   - Reads quality scores per dimension
   - Reviews viral moment tags (pre-populated from Pass 3)
   - Accepts or refines script

3. USER: Approves script → gate fires
4. SYSTEM: WF_TTS_AUDIO → 172 audio scenes generated
   - FFprobe measures each duration → master clock established

PRODUCTION PIPELINE (fully automated, ~3-4 hours):
5. WF_IMAGE_GENERATION: 172 Seedream 4.0 images at $0.03 each (single visual pipeline, no I2V/T2V)
6. 7. 8. WF_THUMBNAIL_GENERATE: AI thumbnail from niche reference
9. WF_CTR_OPTIMIZE_THUMBNAIL: Vision score → regenerate if <60
10. WF_CAPTIONS_ASSEMBLY: SRT captions + FFmpeg concat → final 2hr video
11. WF_PREDICT_PERFORMANCE: PPS calculation from all scores

GATE 3 — Video Review:
12. USER: Reviews assembled video on Gate 3 page
    - Sees PPS: 78 🟢 GREEN LIGHT
    - Picks from 5 CTR-scored title variants
    - Views thumbnail CTR score: 74/100
    - Edits description/tags
    - Optionally regenerates thumbnail if not satisfied

13. USER: Approves → schedules publish (best time recommendation shown)
14. SYSTEM: WF_YOUTUBE_UPLOAD → uploads to YouTube with metadata
15. SYSTEM: WF_VIDEO_METADATA sets title, description, thumbnail, tags, cards
```

---

## Workflow 3: Competitor Intelligence Loop

**User goal:** Monitor competitors daily and use their breakouts as topic inspiration.

**Frequency:** Background automation, user checks weekly.

```
DAILY (06:00 UTC, automated):
1. WF_COMPETITOR_MONITOR:
   - Fetches last 5 videos from each of 10 monitored competitors
   - Calculates view velocity + outlier ratio
   - Flags outlier_ratio > 3x → creates competitor_alert

WEEKLY USER REVIEW:
2. USER: Sees notification "🔥 3 competitor breakouts this week"
3. USER: Opens /intelligence → Competitor Feed

4. For each breakout alert:
   a. "CompetitorChannel just got 240K views on 'The Hidden Fee on Every Credit Card'"
   b. USER: Clicks "Add to Topic Ideas"
   c. SYSTEM: Creates pre-analyzed topic in project topic pool with Style DNA context
   d. USER can immediately generate a competing video idea ("our angle on this topic")

5. WEEKLY SYNTHESIS (Sunday 03:00 UTC):
   - Claude synthesizes all competitor activity → competitor_intelligence record
   - Generates: "This week's most viral topic cluster in your niche: Balance transfer strategies (4 competitor videos, avg 180K views)"
   - Surfaces on /intelligence as "Weekly Intelligence Digest"
```

---

## Workflow 4: Shorts Production Loop

**User goal:** Extract 20 viral short-form clips from each published long-form video.

**Trigger:** After long-form video is published to YouTube (Gate 3 approved)

```
1. SYSTEM: WF_SHORTS_ANALYZE fires:
   - Claude analyzes published script
   - Identifies 20 viral-worthy segments using viral_moment tags (from F10)
   - Scores each segment: virality 1-10, shorts-worthiness, self-containedness
   - Rewrites narration for short-form pacing
   - Rewrites image prompts for 9:16 TikTok-bold aesthetic
   - Generates hashtag sets per clip

GATE 4 — Shorts Review:
2. USER: Reviews 20 proposed clips on Shorts Creator page
   - Each clip card: segment excerpt, virality score, proposed hashtags, narration preview
   - Actions: Approve / Skip / Edit Narration
   - Drag to reorder priority

3. USER: Approves 15 clips → gate fires

4. SYSTEM: WF_SHORTS_PRODUCE (fully automated):
   a. Fresh TTS audio (rewritten narration, NOT recycled from long-form)
   b. 9:16 portrait images via Seedream 4.0 (TikTok-bold style)
      c. Kinetic ASS subtitles burned via caption burn service :9998 (FFmpeg libass)
   d. FFmpeg stitch + normalize
   e. 15 complete 9:16 portrait videos ready

5. SYSTEM: WF_SOCIAL_POST (staggered schedule):
   - TikTok: +0h, +4h, +8h, +12h...
   - YouTube Shorts: +1h offset
   - Instagram Reels: +2h offset
   - Peak hours respected: Tue/Thu/Sat prioritized for first 3 clips
```

---

## Workflow 5: Style DNA Intelligence

**User goal:** Understand what makes a competitor channel visually and structurally successful, then apply those patterns.

**Trigger:** Manual — user activates from /intelligence page.

```
1. USER: Opens /intelligence → clicks "Analyze Competitor Channel"
2. USER: Pastes channel URL
3. SYSTEM: WF_STYLE_DNA fires:
   a. YouTube Data API: fetch last 20 videos (titles, thumbnails, views, dates)
   b. Title analysis: extract structural patterns, score frequency
   c. Claude Vision: analyze each thumbnail for color, text position, emotion
   d. Content pillar clustering: group topics into 3-5 buckets
   e. Cadence analysis: frequency, day-of-week patterns, length patterns
   f. Synthesize style_summary: 200-word narrative

4. USER: Views Style DNA card:
   "This channel uses fear-curiosity titles 45% of the time. Thumbnails: 
   red/white, face showing shock, left-aligned text. Uploads 2x/week. 
   Content pillars: gotchas, comparisons, hidden fees."

5. USER: Clicks "Apply DNA to Project"
6. SYSTEM: Injects style constraints into project's prompt_configs:
   - Title formula preferences → title CTR scorer uses these patterns
   - Thumbnail style parameters → thumbnail generation prompts updated
   - Content pillar context → topic generation prompt enriched

7. Next topic generation round: produces topics and titles that match this DNA
```

---

## Workflow 6: Monthly Revenue Review

**User goal:** Understand the ROI of the production system and optimize niche/content decisions.

**Trigger:** Monthly cron + manual on /analytics page.

```
1. SYSTEM: WF_REVENUE_ATTRIBUTION runs monthly:
   a. Pulls 30-day YouTube Analytics (revenue, views, by video)
   b. Loads production_costs per video from Supabase
   c. Calculates ROI per video: revenue / cost × 100%
   d. Groups by: topic type, niche, video length, upload day
   e. PPS calibration: compares predictions to actual → updates weights

2. USER: Opens /analytics → Revenue tab
3. USER: Reviews:
   - "Best ROI videos this month: [list]"
   - "Worst ROI videos: [list]"
   - "Your average ROI: 340% (producing $340 for every $100 invested)"
   - "Break-even view count for next video: 6,200 views"

4. System insight: "Videos in the 'hidden fees' pillar generate 2.8x higher RPM than 
   'rewards optimization' pillar. Recommend prioritizing 'hidden fees' topics."

5. USER: Uses this insight to refine Gate 1 topic selection next cycle.
```

---

## n8n Workflow Registry (Updated)

**EXISTING WORKFLOWS (28):**
> Reference: existing CLAUDE.md for WF_01 through WF_28

**NEW WORKFLOWS:**
| ID | Name | Trigger | Description |
|----|------|---------|-------------|
| WF_29 | WF_OUTLIER_SCORE | HTTP (post topic gen) | Score 25 topics for outlier potential |
| WF_30 | WF_SEO_SCORE | HTTP (post topic gen) | Score 25 topics for SEO opportunity |
| WF_31 | WF_COMPETITOR_MONITOR | Daily cron 06:00 UTC | Monitor competitor channels |
| WF_32 | WF_CTR_OPTIMIZE | HTTP (post Gate 2) | Generate + score 5 title variants |
| WF_33 | WF_THUMBNAIL_SCORE | HTTP (post thumbnail gen) | Score + optionally regenerate thumbnail |
| WF_34 | WF_NICHE_HEALTH | Weekly cron Sun 03:00 UTC | Calculate niche health scores |
| WF_35 | WF_PREDICT_PERFORMANCE | HTTP (at Gate 3) | Calculate PPS from all scores |
| WF_36 | WF_STYLE_DNA | HTTP (manual trigger) | Extract competitor channel DNA |
| WF_37 | WF_AUDIENCE_INTELLIGENCE | Weekly cron | Process comments → audience insights |
| WF_38 | WF_REVENUE_ATTRIBUTION | Monthly cron | Calculate ROI per video + PPS calibrate |
