# Agent Instructions (DOE)
## Vision GridAI Platform — Multi-Niche AI Video Production
### Directive → Observation → Experiment

> **This is a PLATFORM, not a pipeline.** Any niche. Any topic. Full control from a dashboard.
> Supabase is the brain. n8n is the muscle. The dashboard is the control room.
> Audio is the master clock. Every asset is cached. No work is ever repeated.
> Hybrid architecture: agentic where reasoning adds value, deterministic where speed matters.

**Version 4.0 | Operscale Systems | March 2026**
**Changelog v4.0:** Cinematic Production System (Ken Burns + Color Science + Style DNA), I2V/T2V deprecated, 13-point QA, Auto-Pilot, Content Calendar, Engagement Hub, 38 workflows, $8.06/video (was $28)
**Owner:** Akinwunmi Akinrimisi

---

## ⚠️ IMMUTABLE — Non-Negotiable Operating Rules

- Read the relevant `directives/` file before writing or modifying any logic.
- **Never hardcode API keys.** Use n8n credentials. Any key in workflow JSON must be rotated.
- **Audio is the master clock.** No visual is assembled until its scene audio duration is measured with FFprobe (NOT estimated from file size).
- **Never regenerate existing assets.** Check the `scenes` table — if `audio_status = 'uploaded'`, skip that scene.
- **Write to Supabase after EVERY asset.** Each scene row is updated immediately after generation, not in batch.
- **Niche is NEVER hardcoded.** All prompts are dynamically generated per project. System prompts, expertise profiles, and topic constraints live in the `prompt_configs` table.
- **3 approval gates are MANDATORY.** The pipeline pauses after topic generation, after script generation, and after video assembly. No auto-publishing.
- Do not rewrite this file unless explicitly instructed.
- **Topic Intelligence is niche-agnostic.** Every scraping workflow derives keywords dynamically from the project's `niche` and `niche_description` via AI. No hardcoded keywords anywhere.
- **7-day lookback window.** Every research scraping run collects data from the last 7 days only.
- **AI categorization is a second pass, not a filter.** All 50 raw results (10 per source) are stored first. Clustering and ranking happen after collection, never during.
- **Every scraping result must have a source URL.** No orphaned data. If a result cannot be traced to its origin, discard it.
- **Superpowers is the primary build methodology, NOT GSD.** Use Superpowers for specs, plans, and subagent-driven execution. GSD slash commands in `.claude/commands/gsd/` remain for legacy reference but are NOT used for new work. Use gstack selectively: only `/qa`, `/browse`, `/careful`, `/freeze`, `/review`. Do NOT use gstack's planning skills (they conflict with Superpowers).
- **Use Anthropic frontend-design skill for all dashboard UI work.** Read the SKILL.md before building any React component. It overrides generic UI patterns.
- **ALL scenes use text-to-image + FFmpeg Ken Burns.** No I2V or T2V. Every scene gets a Seedream 4.0 image → FFmpeg zoompan + color grade → .mp4 clip. The `visual_type` field is kept as `'static_image'` for backwards compatibility.
- **Style DNA is LOCKED per project.** The style suffix is generated during script creation and appended to EVERY image prompt. Never modify it between scenes. Scene prompts describe WHAT. Style DNA describes HOW IT LOOKS.
- **Color grading is MANDATORY.** Every scene clip receives FFmpeg color grading based on `color_mood`. Exception: scenes with `selective_color_element` skip FFmpeg grading (color baked into AI image prompt).
- **Composition prefix + Subject + Style DNA = Image prompt.** Three-part architecture. Never mix style words into the subject description.
- **Universal negative prompt on ALL Fal.ai calls.** Stored in n8n workflow static data.
- **Resume/checkpoint on every production workflow.** If a workflow crashes at scene N, resume from N+1, not scene 1. Check `audio_status`/`image_status`/`clip_status` before processing each scene.
- **Exponential backoff retry on ALL external API calls.** Fal.ai, Anthropic, Google TTS, YouTube, Apify, SerpAPI — all route through a retry wrapper (1s → 2s → 4s → 8s, max 4 attempts).
- **Auto-pilot publishes as UNLISTED only.** Never public automatically. Human reviews batch weekly.
- **Platform-specific metadata per video.** YouTube gets SEO long description + tags. TikTok gets punchy caption + trending hashtags. Instagram gets storytelling caption + hashtag blocks.
- **Background music is ducked under voiceover.** Volume at -18 to -22 dB below voice (short-form), -16 to -20 dB (long-form).
- **Single visual pipeline — no hybrid rendering.** Every scene (long-form and short-form) flows through exactly one path: `composition_prefix + scene_subject + style_dna` → Fal.ai Seedream 4.0 → FFmpeg zoompan + color grade → .mp4 clip. No scene classification, no Remotion, no data graphics, no I2V/T2V.

---

## 1. Architecture

```
DASHBOARD (React + Tailwind on Nginx/VPS)
  │
  ▼ HTTPS (Nginx reverse proxy)
n8n (Docker on VPS) — webhook API + production workflows
  │
  ▼ localhost
SUPABASE (Docker on VPS) — PostgreSQL + Realtime
  │
  ▼ APIs
Claude (Anthropic) · Google Cloud TTS · Fal.ai · YouTube · Google Drive
```

| Layer | Technology | Role |
|-------|-----------|------|
| Dashboard | React 18 + Tailwind CSS + Supabase JS client | User interface — control everything |
| API | n8n webhooks (REST) | Bridge between dashboard and workflows |
| Orchestration | n8n workflows (self-chaining) | Execute pipeline stages |
| Database | Supabase PostgreSQL | All data — projects, topics, scenes, shorts, prompts, analytics |
| Realtime | Supabase Realtime subscriptions | Dashboard auto-updates (no polling) |
| Storage | Google Drive | Media files (audio, images, videos) |
| AI | Claude Sonnet (Anthropic direct) | Scripts, evaluation, niche research, visual direction |
| Media (Images) | Fal.ai → Seedream 4.0 | Text-to-image generation (16:9 + 9:16), ALL 172 scenes |
| Media (Video) | FFmpeg Ken Burns (zoompan + color grade) | Animated clips from static images (replaces I2V/T2V) |
| ~~Media (Video)~~ | ~~Fal.ai → Wan 2.5~~ | ~~I2V + T2V generation [DEPRECATED — replaced by WF_KEN_BURNS]~~ |
| Audio | Google Cloud TTS (Chirp 3 HD) | Voiceover |
| Assembly | FFmpeg | Video production |
| Captions | Whisper forced alignment → kinetic ASS subtitles → FFmpeg libass (host-side caption burn service :9998) | Word-by-word animated captions for long-form and short-form |
| Distribution | YouTube Data API v3 + TikTok API + Instagram Graph API | Upload + analytics |
| Agent Expertise | Agency Agents (61 specialists in ~/.claude/agents/) | Domain expertise for GSD executor agents |

### Topic Intelligence — 5 Data Sources

| # | Source | Method | Cost | What We Extract |
|---|--------|--------|------|-----------------|
| 1 | **Reddit** | PRAW (free) or Apify Reddit Scraper (~$0.05) | Free–$0.05 | Post titles, body text, subreddit, upvotes, comment count, URL, date |
| 2 | **YouTube Comments** | YouTube Data API v3 (free, 10K units/day) | Free | Comments from top niche videos (last 7d), likes, replies, video URL |
| 3 | **TikTok** | Apify TikTok Scraper | ~$0.05 | Video captions, hashtags, likes, comments, shares, URL, date |
| 4 | **Google Trends + PAA** | pytrends (free) + SerpAPI (~$0.01/search) | Free–$0.01 | Trending queries, People Also Ask questions, breakout topics |
| 5 | **Quora** | Apify Quora Scraper | ~$0.05 | Question titles, follow count, answer count, URL |

**Total cost per run: ~$0.13 | Monthly at 4 runs/week: ~$2.08**

### Keyword Derivation

No `niche_keywords` column needed. At research-run start, the orchestrator sends `niche` + `niche_description` to Claude Haiku:

```
Given this niche: "{niche}" with description: "{niche_description}",
generate 5-8 search keywords for surfacing active discussions and pain points.
Return ONLY a JSON array of strings.
```

Derived keywords are stored in `research_runs.derived_keywords` for audit.

### Cinematic Production System — 9 Stages

The production pipeline follows a 9-stage cinematic system. Every video passes through all 9 stages. Stage outputs are stored in Supabase per-scene.

| Stage | Name | Tool | Per-Scene Output |
|-------|------|------|-----------------|
| 1 | Script & Narrative Architecture | Claude Sonnet API | Full scene JSON with color_mood, zoom_direction, composition, highlight_word, transitions |
| 2 | AI Image Generation | Fal.ai Seedream 4.0 | One image per scene (composition + subject + style DNA) |
| 3 | Color Science & Grading | FFmpeg eq + colorbalance | Color-graded image (applied during Ken Burns) |
| 4 | Ken Burns Motion | FFmpeg zoompan | Animated .mp4 clip per scene (zoom/pan + color grade combined) |
| 5 | Voiceover & Audio Design | Google Cloud TTS | WAV audio + word-level timestamps per scene |
| 6 | Kinetic Caption System | n8n Function → ASS file | .ass subtitle file with two-tone highlights |
| 7 | Transitions & Assembly | FFmpeg xfade chain | Assembled video with transitions between scenes |
| 8 | End Cards & CTAs | FFmpeg from static image | 5-8s branded end card appended |
| 9 | Final Render & Export | FFmpeg per platform | Platform-specific exports (YouTube, TikTok, Instagram) |

**Additionally:** Background music is mixed in between Stage 7 and Stage 9.

### Format Specification Matrix

| Parameter | Short-Form (9:16) | Long-Form (16:9) |
|-----------|-------------------|-------------------|
| Resolution | 1080 x 1920 px | 1920 x 1080 px |
| Frame Rate | 30 fps | 30 fps |
| Duration | 90-120 seconds | ~2 hours |
| Scene Count | 15-25 scenes | ~172 scenes |
| Scene Duration | 4-6 seconds avg | 5-8 seconds avg |
| Caption Style | 2-4 words/line, pop-in | Full sentence, fade-in |
| Codec | H.264 High Profile | H.264 High Profile |
| Audio | 128 kbps AAC | 192 kbps AAC |

### Style DNA System

Every project has a locked Style DNA string stored in `projects.style_dna` (field already exists). It is appended to EVERY image prompt for visual consistency.

**Image prompt architecture (3-part):**
```
{COMPOSITION_PREFIX} {SCENE_SUBJECT} {STYLE_DNA_SUFFIX}
```

**Style DNA Templates (store in `prompt_templates` table):**

**Historical / Period Drama:**
```
cinematic still frame, {ERA} period accuracy, dramatic chiaroscuro lighting, 35mm film grain texture, desaturated muted color palette, deep shadows, documentary photorealism, volumetric fog, depth of field bokeh, 8K detail
```

**Modern Finance / Premium:**
```
modern commercial photography, clean minimalist composition, premium luxury aesthetic, soft directional studio lighting, subtle depth of field, neutral background tones, crisp 4K sharpness, contemporary color palette, professional product photography feel
```

**Tech / Futuristic:**
```
futuristic cinematic still, cool blue-purple ambient lighting, clean glass and steel surfaces, subtle neon accents, high contrast shadows, modern tech aesthetic, volumetric light rays, ultra-sharp detail, dark background with rim lighting
```

**Warm Human / Inspirational:**
```
warm golden hour photography, natural soft lighting, rich earth tones, gentle lens flare, human-centered composition, emotional depth, 35mm film warmth, intimate documentary feel, subtle grain, shallow focus on subject
```

### Composition Prefix Library (store in `prompt_templates`)

| Composition Type | Prompt Prefix | Best For |
|-----------------|---------------|----------|
| Wide Establishing | `wide angle establishing shot, full scene visible, environmental context,` | Opening hooks, location reveals |
| Medium Close-Up | `medium close-up shot, subject fills center frame, shoulders and above,` | Character focus, emotional beats |
| Over-Shoulder POV | `over the shoulder perspective, looking outward from behind subject,` | Immersive moments |
| Extreme Close-Up | `extreme close-up, tight crop on detail, shallow depth of field,` | B-roll, product shots, detail emphasis |
| High Angle Down | `high angle shot looking down, bird's eye perspective, subject below,` | Power dynamics, vulnerability |
| Low Angle Up | `low angle shot looking up, subject towering above, dramatic perspective,` | Authority, grandeur |
| Symmetrical Center | `perfectly symmetrical composition, centered subject, architectural framing,` | Formal scenes, dramatic reveals |
| Leading Lines | `composition using strong leading lines converging to subject,` | Pathways, corridors, perspective depth |

### Universal Negative Prompt (stored in n8n workflow static data)

```
text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI
```

### Color Science — 7 Mood Profiles

| Mood ID | Emotional Register | FFmpeg Filter Chain |
|---------|-------------------|-------------------|
| `cold_desat` | Tension, stakes | `eq=saturation=0.3:contrast=1.2:brightness=-0.05, colorbalance=bs=0.1:bm=0.05:bh=0.15` |
| `cool_neutral` | Objectivity, info | `eq=saturation=0.6:contrast=1.08, colorbalance=bs=0.05:bm=0.02:bh=0.05` |
| `dark_mono` | Severity, gravity | `eq=saturation=0.15:contrast=1.25:brightness=-0.08, colorbalance=bs=0.05:bh=0.05, curves=m=0/0 0.15/0.05 0.5/0.45 1/1` |
| `warm_sepia` | Hope, transition | `eq=saturation=0.6:contrast=1.1, colorbalance=rs=0.15:gm=0.05:bh=-0.1` |
| `warm_gold` | Success, payoff | `eq=saturation=0.9:contrast=1.03:brightness=0.02, colorbalance=rs=0.1:gm=0.05:bs=-0.05` |
| `full_natural` | Freedom, openness | `eq=saturation=1.1:contrast=1.03:brightness=0.03` |
| `muted_selective` | Reflection, legacy | `eq=saturation=0.35:contrast=1.12:brightness=-0.02, colorbalance=bs=0.05:bm=0.03:bh=0.08` |

**Exception:** Scenes with `selective_color_element` set SKIP FFmpeg color grading (color baked into image prompt).

### Ken Burns Motion — 6 Direction Templates

Base FFmpeg structure:
```
ffmpeg -loop 1 -i {INPUT}.png -vf "
  scale=8000:-1,
  zoompan=z={Z_EXPR}:x={X_EXPR}:y={Y_EXPR}:d={FRAMES}:s={OUTPUT_SIZE}:fps=30,
  {COLOR_GRADE_FILTERS}
" -t {DURATION} -c:v libx264 -pix_fmt yuv420p -preset medium {OUTPUT}.mp4
```

| Direction | Z Expression | X Expression | Y Expression |
|-----------|-------------|-------------|-------------|
| `in` | `min(zoom+0.0015,1.5)` | `iw/2-(iw/zoom/2)` | `ih/2-(ih/zoom/2)` |
| `out` | `if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))` | `iw/2-(iw/zoom/2)` | `ih/2-(ih/zoom/2)` |
| `pan_left` | `1.2` | `iw*0.3-(iw*0.3-iw*0.05)*on/(d-1)` | `ih/2-(ih/zoom/2)` |
| `pan_right` | `1.2` | `iw*0.05+(iw*0.3-iw*0.05)*on/(d-1)` | `ih/2-(ih/zoom/2)` |
| `pan_up` | `1.2` | `iw/2-(iw/zoom/2)` | `ih*0.35-(ih*0.35-ih*0.1)*on/(d-1)` |
| `static_slight_zoom` | `min(zoom+0.0005,1.15)` | `iw/2-(iw/zoom/2)` | `ih/2-(ih/zoom/2)` |

**Sequencing rules:** Never repeat same direction 3x consecutively. Match zoom_in to emotional intensification, zoom_out to emotional release. Pan directions follow implied subject motion.

### Transition System — 5 Types

| Transition | FFmpeg xfade Type | Duration | Best For |
|-----------|------------------|----------|----------|
| `crossfade` | `fade` | 0.5s | Default scene-to-scene |
| `hard_cut` | (simple concat) | 0s | Dramatic contrast, shock |
| `zoom_blur` | `circleopen` | 0.4s | Emotional intensification |
| `wipe_left` | `wipeleft` | 0.5s | Temporal progression |
| `dissolve_slow` | `dissolve` | 0.8s | Long-form contemplative moods |

**Offset calculation:** `offset_N = SUM(durations[0..N-1]) - SUM(transition_durations[0..N-2])`

**For 172 scenes:** Assemble in batches of 15-20 scenes with xfade transitions, then concat batches with crossfade to avoid FFmpeg memory limits.

### Background Music System

**Music is generated via Google Vertex AI Lyria (lyria-002), not from a static library.** The workflow WF_MUSIC_GENERATE uses: Anthropic API (Claude Haiku) for script analysis to determine mood/tempo/instruments per chapter, then Vertex AI Lyria generates custom 30-second clips per mood section, then FFmpeg merges + loops clips to match video duration.

**Music mixing FFmpeg:**
```
ffmpeg -i voiceover.wav -i music.mp3 \
  -filter_complex "[1:a]volume=0.12[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[out]" \
  -map "[out]" -c:a aac -b:a {BITRATE}k mixed.m4a
```

| Parameter | Short-Form | Long-Form |
|-----------|-----------|-----------|
| Volume | -18 to -22 dB below voice | -16 to -20 dB below voice |
| Style | Single mood | Shifts at chapter boundaries |
| Ducking | Under voiceover, lift in pauses | Same, with crossfade between sections |

### End Card System

| Element | Short-Form | Long-Form |
|---------|-----------|-----------|
| Background | Dark solid (#0A0A1A) or blurred last scene | Dark gradient or branded |
| Logo | Channel icon, 120x120px | Channel logo, 160x60px |
| Duration | 3 seconds | 5-8 seconds |
| Animation | Fade in 0.5s | Staggered fade 0.3s per element |

```
ffmpeg -loop 1 -i endcard.png -vf "fade=in:st=0:d=0.5,fade=out:st=2.5:d=0.5" -t 3 endcard.mp4
```

### Platform-Specific Export Profiles

| Platform | CRF | Preset | Max Bitrate | Audio | Resolution |
|----------|-----|--------|-------------|-------|-----------|
| TikTok | 20-23 | medium | 4 Mbps | 128k AAC | 1080x1920 |
| Instagram Reels | 20-23 | medium | 3.5 Mbps | 128k AAC | 1080x1920 |
| YouTube Shorts | 18-20 | slow | 6 Mbps | 192k AAC | 1080x1920 |
| YouTube (Long) | 17-19 | slow | 12 Mbps | 192k AAC | 1920x1080 |

### Auto-Pilot Mode

```
Project Settings → Auto-Pilot: [OFF] / [ON]

When ON:
├── Topics → auto-approve if topic_score > auto_pilot_topic_threshold (default 8.0)
├── Script → auto-approve if combined_eval > auto_pilot_script_threshold (default 7.5)
├── Video → auto-publish as UNLISTED to YouTube
├── Shorts → auto-produce + auto-publish as UNLISTED
└── Weekly digest: "N videos published. Review and set to public?"

Safeguards:
├── NEVER publish as public automatically
├── Cost cap: pause if monthly_spend_usd > monthly_budget_usd
├── Quality floor: if 2 consecutive videos score < 6.0, pause + alert
└── Dashboard indicator: pulsing badge when auto-pilot active
```

**Trusted niche prompt:** After 5+ successful videos with avg eval > 7.5, dashboard shows: "Enable Auto-Pilot for this niche?"

### Resume/Checkpoint System

Each production workflow checks scene status BEFORE processing:

```sql
-- TTS workflow: only process scenes without audio
SELECT id, scene_number, narration_text FROM scenes
WHERE topic_id = {TOPIC_ID} AND audio_status = 'pending'
ORDER BY scene_number;

-- Image workflow: only process scenes without images
SELECT id, scene_number, image_prompt, composition_prefix, color_mood, selective_color_element
FROM scenes WHERE topic_id = {TOPIC_ID} AND image_status = 'pending'
ORDER BY scene_number;

-- Ken Burns: only process scenes without clips
SELECT id, scene_number, zoom_direction, color_mood, selective_color_element
FROM scenes WHERE topic_id = {TOPIC_ID} AND clip_status = 'pending'
ORDER BY scene_number;
```

`topics.pipeline_stage` tracks the last completed stage globally. If a workflow crashes, the orchestrator reads this field to determine where to resume.

### Exponential Backoff Retry

All external API calls route through a reusable retry wrapper:

```javascript
// n8n Function node: retry wrapper
async function withRetry(fn, maxRetries = 4, baseDelay = 1000, maxDelay = 30000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      await new Promise(r => setTimeout(r, delay));
      // Log retry to production_logs
    }
  }
}
```

Applied to: Fal.ai, Anthropic Claude, Google Cloud TTS, YouTube API, Apify, SerpAPI.

### Structured Production Logs

Every API call, timing, cost, and error is logged to `production_logs` table. Dashboard shows per-video production log in a collapsible panel on ProductionMonitor.

---

## 2. Infrastructure

### Server
- **Host:** Hostinger KVM 4 VPS (4 vCPU, 16GB RAM, 200GB NVMe)
- **n8n:** Docker container `n8n-n8n-1` at `https://n8n.srv1297445.hstgr.cloud`
- **Supabase:** Self-hosted Docker at `https://supabase.operscale.cloud`
- **Dashboard:** Nginx serving React build at `https://dashboard.operscale.cloud` (or subdomain TBD)

### APIs & Credentials

| Service | Auth Method | n8n Credential Name |
|---------|-------------|-------------------|
| Anthropic Claude | HTTP Header Auth (x-api-key) | `Anthropic API Key` |
| Google Cloud TTS | Service Account (preferred) / OAuth2 | `Google Cloud account` |
| Fal.ai | HTTP Header Auth (`Key` prefix) | `Fal API Key` |
| Google Drive | OAuth2 | `Google Drive account` |
| YouTube Data API v3 | OAuth2 | `YouTube account` |
| Supabase | API Key (anon / service_role) | `Supabase API Key` |
| TikTok Content Posting API | OAuth2 | `TikTok account` |
| Instagram Graph API | OAuth2 (via Facebook) | `Instagram account` |

---

## 3. Supabase Schema

### Table: `projects`

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  niche_description TEXT,
  channel_style TEXT DEFAULT '2hr_documentary',
  target_video_count INTEGER DEFAULT 25,
  niche_system_prompt TEXT,
  niche_expertise_profile TEXT,
  niche_red_ocean_topics TEXT[],
  niche_competitor_channels TEXT[],
  niche_pain_point_sources TEXT,
  niche_blue_ocean_strategy TEXT,
  playlist1_name TEXT,
  playlist1_theme TEXT,
  playlist2_name TEXT,
  playlist2_theme TEXT,
  playlist3_name TEXT,
  playlist3_theme TEXT,
  youtube_channel_id TEXT,
  youtube_playlist1_id TEXT,
  youtube_playlist2_id TEXT,
  youtube_playlist3_id TEXT,
  drive_root_folder_id TEXT,
  drive_assets_folder_id TEXT,
  script_approach TEXT DEFAULT '3_pass',
  images_per_video INTEGER DEFAULT 172,  -- Updated: ALL scenes get images (no I2V/T2V)
  i2v_clips_per_video INTEGER DEFAULT 0,  -- DEPRECATED: kept for backwards compat
  t2v_clips_per_video INTEGER DEFAULT 0,  -- DEPRECATED: kept for backwards compat
  target_word_count INTEGER DEFAULT 19000,
  target_scene_count INTEGER DEFAULT 172,
  style_dna TEXT,                          -- Locked visual style suffix for ALL image prompts
  image_model TEXT DEFAULT 'fal-ai/bytedance/seedream/v4/text-to-image',
  image_cost DECIMAL(6,4) DEFAULT 0.030,
  i2v_model TEXT DEFAULT 'fal-ai/wan-25-preview/image-to-video',  -- DEPRECATED
  i2v_cost DECIMAL(6,4) DEFAULT 0.050,  -- DEPRECATED
  t2v_model TEXT DEFAULT 'fal-ai/wan-25-preview/text-to-video',  -- DEPRECATED
  t2v_cost DECIMAL(6,4) DEFAULT 0.050,  -- DEPRECATED
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `niche_profiles`

```sql
CREATE TABLE niche_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  competitor_analysis JSONB,
  audience_pain_points JSONB,
  keyword_research JSONB,
  blue_ocean_opportunities JSONB,
  search_queries_used TEXT[],
  search_results_raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `prompt_configs`

```sql
CREATE TABLE prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,  -- 'system_prompt','topic_generator','script_pass1','script_pass2','script_pass3','evaluator','visual_director'
  prompt_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `topics`

```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  topic_number INTEGER NOT NULL,
  playlist_group INTEGER,
  playlist_angle TEXT,
  original_title TEXT,
  seo_title TEXT,
  narrative_hook TEXT,
  key_segments TEXT,
  estimated_cpm TEXT,
  viral_potential TEXT,
  review_status TEXT DEFAULT 'pending',  -- pending/approved/rejected/refined
  review_feedback TEXT,
  refinement_history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',  -- pending/scripting/audio/images/video/assembly/review/uploading/published/failed
  last_status_change TIMESTAMPTZ DEFAULT now(),
  error_log TEXT,
  script_json JSONB,
  script_metadata JSONB,
  word_count INTEGER,
  scene_count INTEGER,
  script_attempts INTEGER DEFAULT 0,
  script_force_passed BOOLEAN DEFAULT false,
  script_quality_score DECIMAL(3,1),
  script_evaluation JSONB,
  script_pass_scores JSONB,  -- { pass1: {score, feedback}, pass2: {...}, pass3: {...}, combined: {...} }
  script_review_status TEXT DEFAULT 'pending',
  script_review_feedback TEXT,
  audio_progress TEXT DEFAULT 'pending',
  images_progress TEXT DEFAULT 'pending',
  i2v_progress TEXT DEFAULT 'pending',  -- DEPRECATED: kept for backwards compat
  t2v_progress TEXT DEFAULT 'pending',  -- DEPRECATED: kept for backwards compat
  ken_burns_progress TEXT DEFAULT 'pending',  -- NEW: replaces I2V/T2V progress
  assembly_status TEXT DEFAULT 'pending',
  drive_folder_id TEXT,
  drive_subfolder_ids JSONB,
  drive_video_url TEXT,
  youtube_url TEXT,
  youtube_video_id TEXT,
  youtube_caption_id TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  video_review_status TEXT DEFAULT 'pending',
  video_review_feedback TEXT,
  total_cost DECIMAL(8,2),
  cost_breakdown JSONB,
  yt_views INTEGER DEFAULT 0,
  yt_watch_hours DECIMAL(8,2) DEFAULT 0,
  yt_avg_view_duration TEXT,
  yt_avg_view_pct DECIMAL(5,2),
  yt_ctr DECIMAL(5,2),
  yt_impressions INTEGER DEFAULT 0,
  yt_likes INTEGER DEFAULT 0,
  yt_comments INTEGER DEFAULT 0,
  yt_subscribers_gained INTEGER DEFAULT 0,
  yt_estimated_revenue DECIMAL(8,2) DEFAULT 0,
  yt_actual_cpm DECIMAL(6,2),
  yt_last_updated TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  supervisor_alerted BOOLEAN DEFAULT false,
  force_regenerate BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `avatars`

```sql
CREATE TABLE avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  video_title_short TEXT,
  avatar_name_age TEXT,
  occupation_income TEXT,
  life_stage TEXT,
  pain_point TEXT,
  spending_profile TEXT,
  knowledge_level TEXT,
  emotional_driver TEXT,
  online_hangouts TEXT,
  objection TEXT,
  dream_outcome TEXT,
  review_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `scenes`

```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  scene_id TEXT NOT NULL,
  narration_text TEXT,
  image_prompt TEXT,
  visual_type TEXT,  -- 'static_image' (all scenes; 'i2v','t2v' DEPRECATED — kept for backwards compat)
  emotional_beat TEXT,
  chapter TEXT,
  audio_duration_ms INTEGER,
  audio_file_drive_id TEXT,
  audio_file_url TEXT,
  start_time_ms BIGINT,
  end_time_ms BIGINT,
  image_url TEXT,
  image_drive_id TEXT,
  video_url TEXT,
  video_drive_id TEXT,
  audio_status TEXT DEFAULT 'pending',
  image_status TEXT DEFAULT 'pending',
  video_status TEXT DEFAULT 'pending',
  clip_status TEXT DEFAULT 'pending',
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scenes_topic ON scenes(topic_id);
CREATE INDEX idx_scenes_status ON scenes(topic_id, audio_status);
CREATE INDEX idx_scenes_visual ON scenes(topic_id, visual_type);
```

### Table: `production_log`

```sql
CREATE TABLE production_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  topic_id UUID REFERENCES topics(id),
  stage TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_log_topic ON production_log(topic_id);
```

### Table: `shorts`

```sql
CREATE TABLE shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  clip_number INTEGER,
  start_scene INTEGER,
  end_scene INTEGER,
  estimated_duration_ms INTEGER,
  actual_duration_ms INTEGER,
  virality_score INTEGER,
  virality_reason TEXT,
  clip_title TEXT,
  hook_text TEXT,
  hashtags TEXT[],
  caption TEXT,
  rewritten_narration JSONB,
  rewritten_image_prompts JSONB,
  emphasis_word_map JSONB,            -- [{word, start_ms, end_ms, emphasis: bool}] for kinetic ASS caption generation
  short_form_style TEXT DEFAULT 'tiktok_bold',
  audio_scenes JSONB,
  visual_scenes JSONB,
  portrait_drive_id TEXT,
  portrait_drive_url TEXT,
  thumbnail_drive_id TEXT,
  thumbnail_url TEXT,
  srt_text TEXT,
  review_status TEXT DEFAULT 'pending',
  review_feedback TEXT,
  production_status TEXT DEFAULT 'pending',
  production_progress TEXT,
  tiktok_status TEXT DEFAULT 'pending',
  tiktok_post_id TEXT,
  tiktok_scheduled_at TIMESTAMPTZ,
  tiktok_published_at TIMESTAMPTZ,
  tiktok_caption TEXT,
  tiktok_views INTEGER DEFAULT 0,
  tiktok_likes INTEGER DEFAULT 0,
  tiktok_comments INTEGER DEFAULT 0,
  tiktok_shares INTEGER DEFAULT 0,
  instagram_status TEXT DEFAULT 'pending',
  instagram_post_id TEXT,
  instagram_scheduled_at TIMESTAMPTZ,
  instagram_published_at TIMESTAMPTZ,
  instagram_caption TEXT,
  instagram_views INTEGER DEFAULT 0,
  instagram_likes INTEGER DEFAULT 0,
  instagram_comments INTEGER DEFAULT 0,
  youtube_shorts_status TEXT DEFAULT 'pending',
  youtube_shorts_video_id TEXT,
  youtube_shorts_scheduled_at TIMESTAMPTZ,
  youtube_shorts_published_at TIMESTAMPTZ,
  youtube_shorts_views INTEGER DEFAULT 0,
  youtube_shorts_likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shorts_topic ON shorts(topic_id);
CREATE INDEX idx_shorts_posting ON shorts(tiktok_status, instagram_status, youtube_shorts_status);
```

### Table: `social_accounts`

```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,           -- 'tiktok', 'instagram', 'youtube_shorts'
  account_name TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Topic Intelligence Tables

#### Table: `research_runs`

```sql
CREATE TABLE research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',  -- pending | scraping | categorizing | complete | failed
  sources_completed INTEGER DEFAULT 0,
  total_results INTEGER DEFAULT 0,
  total_categories INTEGER DEFAULT 0,
  lookback_days INTEGER DEFAULT 7,
  derived_keywords TEXT[],
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read research_runs" ON research_runs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service insert research_runs" ON research_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update research_runs" ON research_runs FOR UPDATE USING (true);
```

#### Table: `research_results`

```sql
CREATE TABLE research_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES research_runs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,  -- reddit | youtube | tiktok | google_trends | quora
  raw_text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  engagement_score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  ai_video_title TEXT,
  category_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE research_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read research_results" ON research_results FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service insert research_results" ON research_results FOR INSERT WITH CHECK (true);
```

#### Table: `research_categories`

```sql
CREATE TABLE research_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES research_runs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  summary TEXT,
  total_engagement INTEGER DEFAULT 0,
  result_count INTEGER DEFAULT 0,
  rank INTEGER,
  top_video_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE research_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read research_categories" ON research_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service insert research_categories" ON research_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update research_categories" ON research_categories FOR UPDATE USING (true);

-- FK from research_results to research_categories
ALTER TABLE research_results ADD CONSTRAINT fk_research_category
  FOREIGN KEY (category_id) REFERENCES research_categories(id) ON DELETE SET NULL;
```

#### Engagement Score Normalization

```
Reddit:        engagement_score = upvotes + (comments * 2)
YouTube:       engagement_score = likes + (replies * 3)
TikTok:        engagement_score = likes + (comments * 2) + (shares * 3)
Google Trends: engagement_score = search_interest_index * 10 (0-1000 scale)
Quora:         engagement_score = follows + (answers * 2)
```

### Migration: 003_cinematic_fields.sql

```sql
-- Add cinematic production fields to scenes
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS color_mood TEXT DEFAULT 'full_natural';
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS zoom_direction TEXT DEFAULT 'in';
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS caption_highlight_word TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS transition_to_next TEXT DEFAULT 'crossfade';
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS b_roll_insert TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS composition_prefix TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS selective_color_element TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'pending';

-- Set all existing scenes to static_image (backwards compat)
UPDATE scenes SET visual_type = 'static_image' WHERE visual_type IS NULL OR visual_type != 'static_image';

-- Add pipeline_stage to topics for resume capability
ALTER TABLE topics ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'pending';
-- Values: pending | scripting | tts | images | ken_burns | color_grade | captions | assembly | render | complete | failed
```

### Migration: 004_calendar_engagement_music.sql

```sql
-- Scheduled posts for content calendar
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,  -- youtube | tiktok | instagram
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',  -- scheduled | publishing | published | failed | cancelled
  published_at TIMESTAMPTZ,
  visibility TEXT DEFAULT 'unlisted',  -- public | unlisted | private
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform-specific metadata
CREATE TABLE platform_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,  -- youtube | tiktok | instagram
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  hashtags TEXT[],
  thumbnail_url TEXT,
  thumbnail_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, platform)
);

-- Comment engagement tracking
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_comment_id TEXT,
  author TEXT,
  author_avatar_url TEXT,
  text TEXT NOT NULL,
  sentiment TEXT,  -- positive | negative | neutral
  intent_score NUMERIC(3,2) DEFAULT 0,  -- 0.00-1.00, higher = purchase/interest intent
  intent_signals TEXT[],  -- ['link_request', 'price_inquiry', 'purchase_intent']
  like_count INTEGER DEFAULT 0,
  replied BOOLEAN DEFAULT false,
  reply_text TEXT,
  replied_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Music library (available for pre-made tracks, but primary music is AI-generated via Vertex AI Lyria lyria-002)
CREATE TABLE music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  mood_tags TEXT[],  -- ['tense', 'hopeful', 'triumphant', 'reflective']
  bpm INTEGER,
  duration_seconds INTEGER,
  file_url TEXT NOT NULL,
  file_drive_id TEXT,
  instrument_palette TEXT,  -- 'low cello drone, sparse piano'
  source TEXT DEFAULT 'lyria',  -- 'lyria' (AI-generated) or 'manual' (uploaded)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Render outputs per platform
CREATE TABLE renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  file_url TEXT,
  file_drive_id TEXT,
  file_size_bytes BIGINT,
  render_time_seconds INTEGER,
  crf INTEGER,
  preset TEXT,
  max_bitrate TEXT,
  audio_bitrate TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Production logs (per-video structured log)
CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,  -- tts | image_gen | ken_burns | color_grade | captions | assembly | render
  scene_number INTEGER,
  action TEXT NOT NULL,
  status TEXT NOT NULL,  -- started | completed | failed | retried
  duration_ms INTEGER,
  cost_usd NUMERIC(8,4),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-pilot configuration per project
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_topic_threshold NUMERIC(3,1) DEFAULT 8.0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_script_threshold NUMERIC(3,1) DEFAULT 7.5;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_default_visibility TEXT DEFAULT 'unlisted';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monthly_budget_usd NUMERIC(8,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monthly_spend_usd NUMERIC(8,2) DEFAULT 0;

-- RLS for all new tables
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
```

---

## 4. Pipeline Phases

### Overview

```
Phase A: Project Creation + Niche Research (agentic, web search)      ⚡
Phase B: Topic + Avatar Generation (agentic, approval gate)           ⚡ ⏸ GATE 1
Phase C: Script Generation (3-pass, agentic, per-pass scoring)        ⚡ ⏸ GATE 2
Phase D: Production (deterministic — TTS, images, video, assembly)
Phase E: Video Review + YouTube Publish                               ⏸ GATE 3
Phase F: Analytics Pull (daily cron)
Phase G: Shorts Pipeline (agentic analysis + deterministic production) ⚡ ⏸ GATE 4
Phase H: Social Media Publishing (TikTok, Instagram, YouTube Shorts)
Phase TI: Topic Intelligence (5-source scrape + AI categorization)         On-demand
```

### Topic Intelligence Phases

| Phase | What | Type | Cost |
|-------|------|------|------|
| TI | Topic Intelligence research (5-source scrape + AI categorization) | On-demand | ~$0.13/run |

### Topic Intelligence Sub-Phases (Build Order)

| Sub-Phase | What Gets Built | Agency Agent |
|-----------|----------------|--------------|
| TI-1 | Environment: migration, credentials, Apify actors | `@devops-engineer` |
| TI-2 | Reddit Scraper workflow | `@api-developer` |
| TI-3 | YouTube Comments Scraper workflow | `@api-developer` |
| TI-4 | TikTok Scraper workflow | `@api-developer` |
| TI-5 | Google Trends + PAA workflow | `@api-developer` + `@data-scientist` |
| TI-6 | Quora Scraper workflow | `@api-developer` |
| TI-7 | Orchestrator (parallel + error handling + keyword derivation) | `@backend-architect` |
| TI-8 | AI Categorization (clustering, ranking, title generation) | `@prompt-engineer` |
| TI-9 | Dashboard: `/research` page + `CreateProjectModal` dropdown | `@frontend-developer` |
| TI-10 | E2E testing | `@qa-engineer` |

### Phase A: Project Creation + Niche Research ⚡ AGENTIC

**Trigger:** User clicks "New Project" in dashboard, inputs niche name + description

**Step A1:** Insert project record in Supabase, create Drive folders

**Step A2:** Claude + web search researches the niche:
- Competitor audit (top 10 YouTube channels, what they cover)
- Audience pain points (Reddit, Quora, forums)
- Keyword gaps (high volume, low competition)
- Blue ocean analysis (unoccupied content angles)
- Store all in `niche_profiles` table

**Step A3:** Claude generates dynamic prompts for this niche:
- Niche-specific system prompt (e.g., "You are a Senior Credit Card Analyst..." or "You are a Classical Philosophy Scholar...")
- Niche expertise profile
- 3 playlist angles with names and themes
- Red-ocean topics to avoid
- Topic generator prompt
- Script Pass 1, 2, 3 templates
- All stored in `prompt_configs` table

**Cost:** ~$0.60 per project (one-time, web search + analysis)

### Phase B: Topic + Avatar Generation ⚡ AGENTIC + ⏸ GATE 1

**Trigger:** User clicks "Generate Topics" from dashboard

**Step B1:** Load topic generator prompt from `prompt_configs`. Claude generates 25 topics + 25 avatars using blue-ocean methodology (quality benchmarks: 2 AM Test, Share Test, Blue-Ocean Test, Rewatch Test).

**Step B2:** Insert 25 rows in `topics` + 25 rows in `avatars`, all with `review_status = 'pending'`

**Step B3: ⏸ APPROVAL GATE 1** — Dashboard shows all 25 topics. Actions per topic:
- ✅ **Approve** → `review_status = 'approved'`
- ❌ **Reject** → `review_status = 'rejected'`
- 🔄 **Refine** → User provides instruction → Claude regenerates that topic WHILE considering all other 24 topics to avoid overlap. Uses all 24 titles + descriptions as context in the refinement prompt.
- ✏️ **Edit** → Inline editing of any field

Pipeline pauses until at least 1 topic is approved.

**Refinement prompt structure:**
```
Regenerate topic #{{topic_number}} with this instruction: "{{user_feedback}}"

Here are the other 24 topics already generated (DO NOT overlap with these):
{{list of 24 other seo_titles + narrative_hooks}}

Maintain the same blue-ocean quality standards. Return the topic in the same JSON structure.
```

**Cost:** ~$0.20 per generation. Refinements: ~$0.05 each.

### Phase C: Script Generation (3-Pass) ⚡ AGENTIC + ⏸ GATE 2

**Trigger:** User clicks "Start Production" on an approved topic

**Step C1:** Load dynamic prompts from `prompt_configs` for this project. Inject topic + avatar variables.

**Step C2: Master Script Generator** — the 3-pass system is RETAINED, but each pass outputs the extended cinematic scene schema:

```
You are a cinematic documentary scriptwriter. Generate a complete production
script for a 2-hour horizontal video (16:9) about: {TOPIC}.

The video will be published on YouTube and must maintain viewer retention
across its full 2-hour length.

OUTPUT FORMAT (JSON):
{
  "title": "YouTube-optimized title (max 60 chars)",
  "description": "YouTube description (first 2 lines visible above fold)",
  "chapters": [
    {
      "chapter_title": "Chapter name for YouTube chapters",
      "timestamp_start": "MM:SS",
      "scenes": [
        {
          "scene_number": 1,
          "duration_seconds": 7,
          "act": "hook|context|conflict|resolution|legacy",
          "narration": "Exact voiceover text. 20-50 words for long-form.",
          "image_prompt_subject": "Subject/action/setting description only — no style words",
          "color_mood": "cold_desat|cool_neutral|dark_mono|warm_sepia|warm_gold|full_natural|muted_selective",
          "zoom_direction": "in|out|pan_left|pan_right|pan_up|static_slight_zoom",
          "caption_highlight_word": "Single most impactful word in the narration",
          "b_roll_insert": null or "Brief description of a 1-2 sec detail shot",
          "transition_to_next": "crossfade|hard_cut|zoom_blur|wipe_left|dissolve_slow",
          "composition_prefix": "wide_establishing|medium_closeup|over_shoulder|extreme_closeup|high_angle|low_angle|symmetrical|leading_lines"
        }
      ]
    }
  ],
  "style_dna": "Locked visual style suffix for ALL image prompts",
  "music_sections": [
    { "timestamp": "00:00", "mood": "Tense, low strings, 70 bpm" },
    { "timestamp": "15:00", "mood": "Hopeful, piano-led, 90 bpm" }
  ],
  "selective_color_elements": [
    { "scene_number": 1, "colored_element": "red coat", "purpose": "Emotional anchor" }
  ],
  "retention_hooks": [
    { "timestamp": "00:00", "technique": "Open loop / unanswered question" },
    { "timestamp": "02:30", "technique": "Pattern interrupt / visual surprise" }
  ]
}

RULES:
- Insert a retention hook every 60-90 seconds
- Chapter structure creates natural YouTube chapters
- Narration pacing: 2.5 words/sec normal, 2.0 words/sec emotional beats
- b_roll_insert scenes add visual variety: close-ups, detail shots, data
- Music mood shifts at act boundaries
- Include static_slight_zoom for dialogue-heavy scenes
- Total ~172 scenes (8-12 scenes per minute)
- Vary zoom_direction — never same direction 3x in a row
- Use selective color sparingly: max 2 scenes per video as bookend anchors
- style_dna locks: era, photography style, lighting, film grain
- color_mood follows 5-act emotional arc: Hook=cold, Context=cool, Conflict=dark, Resolution=warm, Legacy=muted
```

**3-pass distribution of cinematic fields:**

| Pass | Words | Context Injected | Cinematic Fields Generated | Evaluator After? |
|------|-------|-----------------|---------------------------|-----------------|
| Pass 1: Foundation | 5,000-7,000 | Topic + avatar data | `narration`, `color_mood`, `zoom_direction`, `act` per scene | Score Pass 1 |
| Pass 2: Depth | 8,000-10,000 | Full Pass 1 output | `composition_prefix`, `caption_highlight_word`, `b_roll_insert`, enriched `narration` | Score Pass 2 |
| Pass 3: Resolution | 5,000-7,000 | Summaries of Pass 1 + 2 | `transition_to_next`, `selective_color_elements`, `music_sections`, `retention_hooks`, finalizes `style_dna` | Score Pass 3 + Combined |

**Per-pass scoring:** After each pass, the evaluator scores it on the 7 dimensions. If a pass scores < 6.0, it is regenerated with targeted corrections BEFORE moving to the next pass. This catches problems early (e.g., Pass 1 has no avatar usage → fix before Pass 2 builds on it).

**Combined scoring:** After all 3 passes, the full script is evaluated as a whole. Pass mark: 7.0/10. If below, the lowest-scoring pass is regenerated. Max 3 total regeneration attempts across all passes. Force-pass on attempt 3.

Evaluation rubric adds: "Visual Prompt Quality" dimension (15%) — composition + lighting + mood + format correctness.

**Niche Adapter Prompts** (append to master prompt per niche):

**Finance / Credit Cards:**
```
NICHE CONTEXT: Credit card analysis channel.
- Use data-driven hooks: dollar amounts, percentages, APR comparisons
- image_prompt_subject: credit cards, bank interiors, financial charts, luxury items
- style_dna must include: "modern financial photography, clean lines, premium feel, soft studio lighting, shallow depth of field, 4K detail"
- Selective color: brand colors (sapphire blue for Chase, gold for Amex)
- caption_highlight_word: dollar amounts, card names, percentages, action verbs
```

**Historical / Biographical:**
```
NICHE CONTEXT: Historical or biographical narrative.
- Emotional hooks: a specific moment, a choice, a consequence
- image_prompt_subject: period-accurate scenes, architecture, crowds
- style_dna must include: "cinematic period photography, {ERA} era, dramatic chiaroscuro lighting, 35mm film grain, desaturated palette, documentary realism"
- Selective color: ONE symbolic element (a red coat, a candle, a flag) as recurring anchor
- color_mood strict mapping: Hook=cold, Conflict=dark_mono, Resolution=warm_sepia, Legacy=muted_selective
```

**Tech / AI / SaaS:**
```
NICHE CONTEXT: Technology concept, AI tool, or SaaS product.
- Hook with before-vs-after contrast or surprising capability
- image_prompt_subject: futuristic interfaces, data visualization, workspace environments
- style_dna must include: "modern tech photography, clean minimalist aesthetic, cool blue-purple gradient lighting, sharp focus, glass and steel, 2025 aesthetic"
- color_mood: cool_neutral default, warm_gold for reveals, full_natural for human impact
- caption_highlight_word: technical terms, product names, metric improvements (10x, 90%)
```

**Selective Color Prompt Injection** — for scenes with `selective_color_element` set, inject between subject and style DNA:
```
{COMPOSITION_PREFIX} {SCENE_SUBJECT}, the entire scene is rendered in black and white monochrome EXCEPT for {COLORED_ELEMENT} which is rendered in vivid {COLOR} — selective color photography effect, high contrast between the colored element and the monochrome surroundings, {STYLE_DNA}
```

**Image Prompt Enhancer** (Claude Sonnet API call per scene):
```
You are a visual prompt engineer for AI image generation. Given a brief scene description, expand it into a detailed, production-ready image generation prompt.

INPUT:
- Scene subject: {SUBJECT}
- Composition type: {COMPOSITION}
- Color mood: {MOOD}
- Format: long (16:9 horizontal framing)

RULES:
- Output ONLY the expanded subject description (no style DNA, appended separately)
- Include: specific visual details, spatial relationships, lighting cues, environmental context
- Do NOT include: art style terms, camera settings, resolution, aspect ratio
- 30-60 words maximum
- Comma-separated descriptive phrases (AI image gen prompt syntax)
```

**Keyword Extraction Prompt** (caption highlights):
```
Given the following narration text broken into caption phrases, select the single most impactful word in each phrase to highlight in yellow. Return ONLY a JSON array.

SELECTION PRIORITY (highest to lowest):
1. Specific numbers, dollar amounts, percentages
2. Proper nouns, brand names, place names
3. Emotionally charged action verbs
4. Time markers and dates
5. Superlatives and absolute terms
6. Final content word in phrase (fallback)

NARRATION PHRASES: {PHRASES_ARRAY}

OUTPUT: [{ "phrase_index": 0, "highlight_word": "1200", "reason": "specific number" }]
```

**YouTube SEO Metadata Generator:**
```
Generate optimized YouTube metadata for the following video.

VIDEO TOPIC: {TOPIC}
VIDEO DURATION: {DURATION}
NICHE: {NICHE}
CHAPTER TITLES: {CHAPTERS}

Generate:
1. Title (max 60 chars, primary keyword, curiosity gap)
2. Description (first 2 lines hook + keyword, then summary, chapters with timestamps, hashtags)
3. Tags (15-20, mix broad and specific, long-tail keywords)
4. Thumbnail text (max 4 words, high contrast, urgency/curiosity)

OUTPUT (JSON):
{ "title": "...", "description": "...", "tags": [...], "thumbnail_text": "...", "thumbnail_emotion": "shock|curiosity|disbelief|excitement" }
```

**Background Music Mood Descriptor (used by WF_MUSIC_GENERATE — Anthropic analysis step before Lyria generation):**
```
Given the following video script with emotional arc, describe ideal background music for Vertex AI Lyria generation.

VIDEO TOPIC: {TOPIC}
TOTAL DURATION: {DURATION}
EMOTIONAL ARC: {ACTS_WITH_MOODS}

For each section provide: tempo (BPM), emotional register, instrument palette, reference tracks, transition description.

OUTPUT: [{ "start_time": "00:00", "end_time": "00:30", "bpm": 70, "register": "tense", "instruments": "low cello drone, sparse piano", "reference": "Hans Zimmer - Time", "transition_to_next": "gradual swell" }]
```

**Step C3:** Insert scene rows into `scenes` table (one row per scene, including all cinematic fields: `color_mood`, `zoom_direction`, `composition_prefix`, `caption_highlight_word`, `transition_to_next`, `b_roll_insert`, `selective_color_element`)

**Step C4: ⏸ APPROVAL GATE 2** — Dashboard shows:
- Full script by chapter (collapsible)
- Per-pass quality scores + combined score
- Cinematic field distribution (color mood arc, zoom direction variety, composition mix)
- Avatar usage highlights
- Word count, scene count
- Actions: Approve / Reject / Refine (can refine specific passes)

**Cost:** $0.60-$1.80 per topic (3 passes x $0.15/pass + 4 evaluator calls x $0.05 + potential retries)

### Phase D: Production Pipeline (DETERMINISTIC)

Updated cinematic pipeline — all scenes use text-to-image + FFmpeg Ken Burns (no I2V/T2V):

```
WF03: TTS (172 scenes → FFprobe → Master Timeline)         → writes to scenes table
WF04: Images (172 Seedream 4.0 on Fal.ai, ALL scenes)      → writes to scenes table
WF_KEN_BURNS: FFmpeg zoompan + color grade (172 scenes)     → writes to scenes table
WF06: Captions (ASS files with highlight words)             → writes to scenes table
WF07: FFmpeg Assembly (xfade transitions, batch 15-20)      → writes to topics table
WF_MUSIC_GENERATE: Anthropic analysis → Lyria generation → FFmpeg merge + ducking → mixed audio
WF_ENDCARD: Generate branded end card                       → appended to assembly
WF08: Drive Upload                                          → writes to scenes table
WF_PLATFORM_METADATA: AI per-platform title/desc/tags       → writes to platform_metadata table
WF_QA_CHECK: 13-point automated quality checklist           → writes to topics table
```

**WF05A: I2V (Wan 2.5) [DEPRECATED — replaced by WF_KEN_BURNS]**
**WF05B: T2V (Wan 2.5) [DEPRECATED — replaced by WF_KEN_BURNS]**

**All writes go to Supabase** `scenes` table. Dashboard gets instant updates via Supabase Realtime.

**Critical rules preserved:**
- FFprobe for actual duration (not estimation)
- Upload to Drive + write to `scenes` table after EVERY asset
- Resume/checkpoint: each workflow checks `{stage}_status = 'pending'` before processing each scene
- Exponential backoff retry on all Fal.ai calls (1s → 2s → 4s → 8s, max 4 attempts)
- force_regenerate honoured across all workflows
- Self-chaining: each WF fires next on completion
- Error handling: write `status = 'failed'` + `error_log` on failure, log to `production_logs`

### Phase E: Video Review + YouTube ⏸ GATE 3

After FFmpeg assembly:

**⏸ APPROVAL GATE 3** — Dashboard shows:
- Embedded video player (from Drive URL)
- Thumbnail preview
- Generated YouTube metadata (title, description, tags, chapters)
- Total production cost
- Actions: Approve & Publish / Approve & Schedule / Reject / Edit Metadata

On approval → WF09: YouTube upload + captions + thumbnail + playlist assignment

### Phase F: Analytics (Daily Cron)

WF10: YouTube Analytics API pull → writes `yt_*` columns to `topics` table. Unchanged from current spec.

### Phase G: Shorts Pipeline ⚡ AGENTIC + DETERMINISTIC + ⏸ GATE 4

**Trigger:** User clicks "Analyze for Viral Clips" on a published topic in the Shorts Creator tab.

**Only available for topics where `status = 'published'`** (YouTube video is live).

**Step G1: Viral Analysis + Content Rewrite ⚡ AGENTIC**

Claude reads `script_json` from Supabase and:
1. Identifies 20 best ~5-minute segments with virality scores (1-10)
2. Rewrites narration for short-form (punchier pacing, standalone hooks, CTA at end)
3. Rewrites image prompts for 9:16 portrait + TikTok aesthetic (vibrant, high contrast, bold, vertical composition)
4. Marks emphasis words in each clip's narration for kinetic captions: `[{word, start_ms, end_ms, emphasis: true/false}]`
5. Generates thumbnail prompts (diagonal slant layout, short phrase filling 70-80% of text area)
6. Stores all in `shorts` table with `review_status = 'pending'`

**Step G2: ⏸ GATE 4 — Shorts Review**

Dashboard shows 20 proposed clips. User can approve, skip, or edit each clip's title, rewritten narration, hashtags, and emphasis word choices.

**Step G3: Shorts Production (DETERMINISTIC)**

For each approved clip:
```
WF_SHORTS_AUDIO     → Fresh TTS from rewritten narration → FFprobe → Drive
WF_SHORTS_IMAGES    → 9:16 images (Seedream 4.0 on Fal.ai, ALL scenes, TikTok aesthetic)
                    → 20 thumbnails (diagonal slant, AI-generated)
WF_KEN_BURNS        → 9:16 Ken Burns zoompan + color grade per scene (replaces I2V/T2V)
WF_SHORTS_I2V       → [DEPRECATED — replaced by WF_KEN_BURNS]
WF_SHORTS_T2V       → [DEPRECATED — replaced by WF_KEN_BURNS]
WF_SHORTS_CAPTIONS  → Whisper forced alignment → kinetic ASS subtitle file
                      (center screen, emphasis words in yellow/red, word-by-word pop-in via ASS tags)
WF_SHORTS_ASSEMBLY  → FFmpeg: stitch scenes → caption burn service (:9998) burns ASS via libass → final clip
WF_SHORTS_UPLOAD    → Upload clips + thumbnails to Drive (topic_folder/shorts/)
```

**Caption spec (kinetic ASS):**
- Animation: Word-by-word pop-in via ASS override tags (Hormozi/MrBeast style)
- Position: Center of screen
- Emphasis: Bold color change (yellow or red) on key words, rest white
- Font: Bold sans-serif (Montserrat Black or Inter Black), minimum 48px
- Shadow: Strong drop shadow for readability over any background
- Render: Host-side caption burn service on VPS port :9998 runs FFmpeg libass via `docker exec` (bypasses n8n OOM)

**Thumbnail spec:**
- Layout: Diagonal slant divider — AI-generated image on one side, bold text on other
- Text: Short phrase (3-6 words), fills 70-80% of text area
- Style: Vibrant, high contrast — matches TikTok aesthetic
- Format: 1080×1920 (9:16)
- Generation: Claude writes prompt → Seedream 4.0 renders → $0.03/thumbnail

### Phase H: Social Media Publishing

**Tab:** 📤 Social Media Publisher (separate from Shorts Creator)

**Platforms:** TikTok (Content Posting API) + Instagram Reels (Graph API) + YouTube Shorts (Data API v3, same channel as long-form)

**Features:**
- Post Now (immediate upload to selected platform)
- Schedule (pick date/time per platform per clip)
- Auto-Schedule (AI suggests peak hours: TikTok 6PM/8PM/10PM, Instagram 12PM/6PM)
- Cross-platform stagger (TikTok first, Instagram 24h later, YouTube Shorts same day)
- Edit caption/hashtags per platform before posting
- Posting history with engagement metrics

**Workflows:**
```
WF_SOCIAL_POSTER     → Scheduled cron (every 2 hours): picks up scheduled posts, uploads
WF_SOCIAL_ANALYTICS  → Daily cron: pulls views/likes/comments from all 3 platforms
```

---

## 5. Script Scoring Rubric (7 Dimensions, Niche-Agnostic)

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Persona Integration | 20% | Does the avatar appear by name? Pain point addressed? Dream outcome delivered? |
| Hook Strength | 15% | First 5 scenes — specific, concrete, open loop by scene 3? |
| Pacing & Structure | 15% | 3-act structure, 5+ revelation moments, even chapter distribution? |
| Specificity & Depth | 20% | 1 data point per 3 scenes, concrete examples, mechanism explained? |
| TTS Readability | 10% | Numbers spelled out, no abbreviations, sentences 10-30 words? |
| Visual Prompt Quality | 10% | Subject + composition + lighting + mood + "photorealistic, 16:9"? |
| Anti-Pattern Detection | 10% | No filler phrases, no listicle degradation, no repetitive structure? |

**Pass mark:** 7.0/10 weighted score. Force-pass on attempt 3.
**Evaluator:** Separate Claude call, temperature 0.3, niche-agnostic rubric.
**Retry prompt:** Built dynamically from ONLY low-scoring dimensions (< 7). Tells Claude "fix ONLY these, preserve what scored 7+."

### Per-Pass Scoring (NEW)

Each pass is evaluated independently after generation:

| Pass | Score Threshold | If Below |
|------|----------------|----------|
| Pass 1 (Foundation) | 6.0 | Regenerate Pass 1 before starting Pass 2 |
| Pass 2 (Depth) | 6.0 | Regenerate Pass 2 (with corrected Pass 1 as context) |
| Pass 3 (Resolution) | 6.0 | Regenerate Pass 3 |
| Combined (all 3) | 7.0 | Identify weakest pass, regenerate that one only |

Max 3 regeneration attempts total across all passes. Force-pass on attempt 3.

**Cost per evaluator call:** ~$0.05 (reads script + rubric, returns scores). 4 evaluator calls per topic (3 per-pass + 1 combined) = $0.20 in evaluation. With retries, worst case ~$0.40.

---

## 6. Supervisor Agent ⚡ AGENTIC

**Workflow:** `WF_SUPERVISOR_AGENT`
**Schedule:** Every 30 minutes
**Purpose:** Diagnoses stuck pipelines, decides action (retry / skip scene / alert owner)

**Tools:** `retry_workflow`, `skip_scene`, `alert_owner`, `read_pipeline_state`
**Decision rules:** Rate limit errors → RETRY. Auth errors → ALERT. NSFW filter → SKIP_SCENE. Progress advancing → WAIT. Retried 3+ times → ALERT.
**Cost:** ~$0.01/run, ~$14.40/month.

---

## 7. Dashboard — React + Tailwind SPA

**Tech:** React 18, Tailwind CSS, Supabase JS client, React Router
**Hosting:** Nginx on VPS, serves build output
**Realtime:** Supabase subscriptions (no polling)
**Auth:** Simple password gate (solo user)

### 12 Pages

| Page | URL | Purpose |
|------|-----|---------|
| Projects Home | `/` | All niches as cards, create new project |
| Project Dashboard | `/project/:id` | Command center — metrics, pipeline status table, auto-pilot toggle, pipeline health, recent activity |
| Topic Review | `/project/:id/topics` | Gate 1 — approve/reject/refine 25 topics |
| Script Review | `/project/:id/topics/:tid/script` | Gate 2 — quality scores, cinematic field distribution, script viewer, approve/refine |
| Production Monitor | `/project/:id/production` | Real-time progress with Supabase Realtime, structured production logs |
| Video Review | `/project/:id/topics/:tid/video` | Gate 3 — preview video, approve/reject/edit metadata, upload visibility toggle, 13-point QA checklist, SEO metadata preview per platform |
| Shorts Creator | `/shorts` | Gate 4 — analyze scripts, review viral clips, produce 9:16 shorts |
| Social Media Publisher | `/social` | Post/schedule clips to TikTok, Instagram, YouTube Shorts |
| Analytics | `/project/:id/analytics` | YouTube + social media performance, revenue, CPM, cross-platform comparison, engagement rate, cost vs revenue waterfall |
| Settings | `/project/:id/settings` | Per-project config, prompt editor, model selection, social accounts, auto-pilot config, API health, Lyria music config, schedule templates |
| Topic Research | `/research` | Topic Intelligence — 5-source scrape results, ranked categories, run research |
| Content Calendar | `/project/:id/calendar` | Visual monthly/weekly grid of scheduled + published content across YouTube, TikTok, Instagram. Drag-and-drop reschedule. Color-coded by platform and status. |
| Engagement Hub | `/project/:id/engagement` | Unified comment feed from YouTube, TikTok, Instagram. AI-flagged high-conversion comments. AI-suggested replies. Sentiment chart per video. |

### New Dashboard Components

**Content Calendar** (`/project/:id/calendar`):
- Components: `pages/ContentCalendar.jsx`, `components/calendar/CalendarGrid.jsx`, `components/calendar/ContentBlock.jsx`, `components/calendar/ScheduleModal.jsx`, `hooks/useSchedule.js`

**Engagement Hub** (`/project/:id/engagement`):
- Components: `pages/EngagementHub.jsx`, `components/engagement/CommentFeed.jsx`, `components/engagement/ConversionSignals.jsx`, `components/engagement/ReplyComposer.jsx`, `components/engagement/SentimentChart.jsx`, `hooks/useComments.js`, `hooks/useEngagement.js`

### Enhanced Existing Pages

**VideoReview** — added: upload visibility toggle (public/unlisted/private), platform selector, thumbnail preview + regenerate, SEO metadata preview per platform, automated QA checklist (13-point pass/fail)

**Analytics** — added: cross-platform comparison, follower growth timeline, engagement rate per video, content performance heatmap, cost vs revenue waterfall

**ProjectDashboard** — added: auto-pilot toggle, pipeline health indicator, quick actions, recent activity feed

**Settings** — added: auto-pilot config (thresholds, visibility, budget), platform connection status, API health dashboard, Lyria music config, default schedule templates, first-run setup wizard

### Topic Intelligence Dashboard Integration

#### New Global Route: `/research`

Not project-scoped. Lives in sidebar as a top-level nav item alongside "Projects." Research results feed into ANY project via the CreateProjectModal dropdown.

**Route:** `/research`
**Page:** `pages/Research.jsx`

**Layout:**
1. **Header:** Title + "Run Research" button (requires selecting a project for niche context) + last run timestamp
2. **Progress bar:** Visible during active runs. Shows `sources_completed / 5` with per-source status pills (Reddit [done], YouTube [running], etc.). Uses Supabase Realtime on `research_runs`.
3. **Ranked Categories:** Cards ordered by `rank`. Each shows: rank badge (#1 gold, #2 silver, #3 bronze), label, summary, top video title with "Use This Topic" button, total engagement, result count. Expandable to show all results in the cluster.
4. **Source Tabs:** Reddit | YouTube | TikTok | Google Trends | Quora. Each tab shows a 10-row table: rank, raw text (truncated, expandable), AI video title, engagement score with breakdown tooltip, source URL (clickable), posted date (relative), category badge (color-coded).
5. **Summary bar:** Total results, categories, top category, run duration, estimated cost.

**New components:**
- `components/research/ResearchRunButton.jsx`
- `components/research/ResearchProgress.jsx`
- `components/research/CategoryCards.jsx`
- `components/research/SourceTabs.jsx`
- `components/research/TopicRow.jsx`
- `hooks/useResearch.js`

#### Modified: `CreateProjectModal.jsx`

Add optional "Pick from Research" above the niche input:

```
┌──────────────────────────────────────────┐
│ New Project                               │
│                                           │
│ ┌── From Research (optional) ───────────┐│
│ │ [Filter by category          ▾]       ││
│ │ [Select a researched topic   ▾]       ││
│ │                                       ││
│ │   — or enter manually below —         ││
│ └───────────────────────────────────────┘│
│                                           │
│ Niche Name *  [__________________]        │
│ Description   [__________________]        │
│ Target Videos [25]                        │
│                                           │
│               [Cancel] [Start Research]   │
└──────────────────────────────────────────┘
```

**Behavior:**
- Pulls from latest `research_runs` where `status = 'complete'`
- Category dropdown filters by `research_categories.label`
- Topic dropdown shows `ai_video_title` values within selected category
- Selecting a topic auto-fills `niche` (from the run's project context) and `description` (from `ai_video_title` + category summary)
- User can override any auto-filled field
- If no research data exists: "No research data yet. [Run Research →]" links to `/research`
- Proceeding without research is always allowed

#### Modified: `App.jsx`

```jsx
const Research = lazy(() => import('./pages/Research'));
// Add route:
<Route path="/research" element={<Research />} />
```

#### Modified: `Sidebar.jsx`

Add to global nav items (above project nav):
```jsx
{ label: 'Topic Research', icon: Microscope, path: '/research' }
```

### Dashboard ↔ n8n API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhook/project/create` | POST | Create project + trigger niche research |
| `/webhook/topics/generate` | POST | Generate 25 topics for project |
| `/webhook/topics/approve` | POST | Approve topic(s), move to production queue |
| `/webhook/topics/reject` | POST | Reject topic with feedback |
| `/webhook/topics/refine` | POST | Refine topic with custom instruction |
| `/webhook/production/trigger` | POST | Start production for approved topic |
| `/webhook/production/trigger-all` | POST | Start production for all approved topics |
| `/webhook/script/approve` | POST | Approve script, continue to TTS |
| `/webhook/script/reject` | POST | Reject script with feedback |
| `/webhook/script/refine` | POST | Refine specific pass with instruction |
| `/webhook/video/approve` | POST | Approve video, upload to YouTube |
| `/webhook/video/schedule` | POST | Approve + set publish date |
| `/webhook/video/reject` | POST | Reject, option to re-process |
| `/webhook/status` | POST | Read all topics for a project |
| `/webhook/assets/:topic_id` | GET | Get all asset URLs for a topic |
| `/webhook/analytics/:project_id` | GET | Get YouTube analytics |

### Supabase Realtime Integration

```javascript
// Dashboard subscribes to live updates
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Scene-level updates (progress dots)
supabase.channel('scenes').on('postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'scenes', filter: `topic_id=eq.${topicId}` },
  (payload) => updateSceneIndicator(payload.new)
).subscribe();

// Topic-level updates (status changes, approval requests)
supabase.channel('topics').on('postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'topics', filter: `project_id=eq.${projectId}` },
  (payload) => updateTopicRow(payload.new)
).subscribe();
```

No polling. Dashboard updates the instant Supabase receives a write.

### n8n Workflows (Complete)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| WF_MASTER_orchestrator | Webhook | Pipeline launcher |
| WF00_project_creation | Webhook | Create project + Drive folders |
| WF01_niche_research | Sub-workflow | Claude + web search niche analysis |
| WF02_topic_generation | Webhook | 25 topics + avatars |
| WF03_script_3pass | Webhook | 3-pass cinematic script generation |
| WF04_scene_segmentation | Sub-workflow | Parse script JSON into scene rows |
| WF05_voiceover | Sub-workflow | TTS audio (172 scenes) |
| WF06_image_generation | Sub-workflow | Seedream 4.0 images (172 scenes) |
| WF07a_i2v_generation | Sub-workflow | **[DEPRECATED — replaced by WF_KEN_BURNS]** |
| WF07b_t2v_generation | Sub-workflow | **[DEPRECATED — replaced by WF_KEN_BURNS]** |
| WF_KEN_BURNS | Sub-workflow | FFmpeg zoompan + color grade per scene (replaces WF07a + WF07b) |
| WF08_captions | Sub-workflow | ASS caption files with highlight words |
| WF09_ffmpeg_assembly | Sub-workflow | xfade transitions + batch assembly |
| WF10_drive_upload | Sub-workflow | Upload to Google Drive |
| WF11_youtube_upload | Webhook | YouTube upload + captions + thumbnail |
| WF12_youtube_analytics | Cron (daily) | YouTube analytics pull |
| WF_SUPERVISOR_AGENT | Cron (30 min) | Pipeline health monitor |
| WF_WEBHOOK_dashboard_api | Webhook | Dashboard API bridge |
| WF_SHORTS_ANALYZE | Webhook | Viral analysis + narration rewrite |
| WF_SHORTS_PRODUCE | Webhook | Shorts production pipeline |
| WF_SOCIAL_POSTER | Cron (2 hrs) | Post to TikTok/Instagram/YT Shorts |
| WF_SOCIAL_ANALYTICS | Cron (daily) | Pull engagement metrics from 3 platforms |
| WF_RESEARCH_ORCHESTRATOR | Webhook | Parallel 5-source scrape + AI categorization |
| WF_RESEARCH_REDDIT | Sub-workflow | Reddit scraping |
| WF_RESEARCH_YOUTUBE | Sub-workflow | YouTube comment scraping |
| WF_RESEARCH_TIKTOK | Sub-workflow | TikTok scraping via Apify |
| WF_RESEARCH_GOOGLE_TRENDS | Sub-workflow | Google Trends + PAA |
| WF_RESEARCH_QUORA | Sub-workflow | Quora scraping via Apify |
| WF_RESEARCH_CATEGORIZE | Sub-workflow | AI clustering + ranking |
| WF_THUMBNAIL | After assembly | AI thumbnail + text overlay + upload |
| WF_PLATFORM_METADATA | Before publish | AI generates per-platform title/desc/tags |
| WF_SCHEDULE_PUBLISHER | Cron (15 min) | Publishes scheduled posts when due |
| WF_COMMENTS_SYNC | Cron (daily) | Pull comments from YouTube/TikTok/Instagram |
| WF_COMMENT_ANALYZE | After sync | AI sentiment + intent scoring |
| WF_QA_CHECK | After render | Automated 13-point quality checklist |
| WF_RETRY_WRAPPER | Sub-workflow | Exponential backoff for any API call |
| WF_MUSIC_GENERATE | During assembly | Anthropic script analysis → Vertex AI Lyria generation → FFmpeg merge + ducking |
| WF_ENDCARD | After assembly | Generate branded end card |
| WF_DRIVE_UPLOAD | Called by caption burn service | Uploads captioned final video to Google Drive via n8n OAuth2 |

### AI Categorization Prompt

Sent to Claude Haiku via Anthropic API direct after all scrapers complete:

```
You are a content strategist analyzing 50 discussion topics from 5 online sources.
All topics relate to the niche: {niche_description}.

Tasks:
1. Group topics into organic categories by theme. Do NOT force a fixed count.
   Let the data determine clusters (typically 4-8).
2. For each category provide:
   - label: short theme name (3-6 words)
   - summary: 2-3 sentences on what this cluster covers and why the audience cares
   - top_video_title: the single best YouTube video title from this cluster
3. Rank categories by total engagement_score (sum of all topics in category).

Topics:
{json_array_of_50_results}

Respond ONLY in JSON. No preamble. No markdown fences.
```

**Model:** `claude-3-5-haiku-latest` via Anthropic API direct
**Temperature:** 0.3
**Cost:** ~$0.02 per run

---

## 8. Directory Structure

```
vision-gridai-platform/
├── CLAUDE.md                                 ← Claude Code auto-loads this
├── Agent.md                                  ← THIS FILE (IMMUTABLE)
├── skills.md                                 ← Skills reference map
├── skills.sh                                 ← Environment setup + skill installer
├── .env                                      ← API keys (never commit)
├── directives/
│   ├── 00_project_creation.md
│   ├── 01_niche_research.md
│   ├── 02_topic_generation.md
│   ├── 03_script_generation_3pass.md
│   ├── 04_scene_segmentation.md
│   ├── 05_voiceover.md
│   ├── 06_image_generation.md
│   ├── 07a_image_to_video.md
│   ├── 07b_text_to_video.md
│   ├── 08_captions.md
│   ├── 09_ffmpeg_assembly.md
│   ├── 10_drive_upload.md
│   ├── 11_youtube_upload.md
│   ├── 12_youtube_analytics.md
│   ├── 13_supervisor_agent.md
│   └── 14_dashboard.md
├── execution/
│   ├── build_scene_clips.sh
│   ├── concat_video.sh
│   ├── normalize_audio.sh
│   ├── generate_srt.js
│   ├── download_assets.sh
│   └── cleanup.sh
├── dashboard/
│   ├── package.json                          ← React + Tailwind + Supabase JS
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.jsx                           ← Router + layout
│   │   ├── pages/
│   │   │   ├── ProjectsHome.jsx
│   │   │   ├── ProjectDashboard.jsx
│   │   │   ├── TopicReview.jsx
│   │   │   ├── ScriptReview.jsx
│   │   │   ├── ProductionMonitor.jsx
│   │   │   ├── VideoReview.jsx
│   │   │   ├── ShortsCreator.jsx             ← NEW: Viral analysis + clip review + production
│   │   │   ├── SocialMediaPublisher.jsx      ← Post/schedule to TikTok/Instagram/YT Shorts
│   │   │   ├── Analytics.jsx
│   │   │   ├── ContentCalendar.jsx           ← NEW: Visual calendar, drag-and-drop scheduling
│   │   │   ├── EngagementHub.jsx             ← NEW: Unified comment feed, AI intent scoring
│   │   │   ├── Research.jsx                  ← Topic Intelligence dashboard
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── TopicCard.jsx
│   │   │   ├── ScoreRadar.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── SceneGrid.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   ├── RefineModal.jsx
│   │   │   ├── ShortClipCard.jsx             ← Viral clip review card
│   │   │   ├── PostScheduler.jsx             ← Schedule/post UI per platform
│   │   │   ├── calendar/                     ← NEW: CalendarGrid, ContentBlock, ScheduleModal
│   │   │   ├── engagement/                   ← NEW: CommentFeed, ConversionSignals, ReplyComposer, SentimentChart
│   │   │   └── research/                     ← ResearchRunButton, ResearchProgress, CategoryCards, SourceTabs
│   │   ├── hooks/
│   │   │   ├── useSupabase.js
│   │   │   ├── useRealtime.js
│   │   │   ├── useProject.js
│   │   │   ├── useResearch.js               ← Topic Intelligence data hooks
│   │   │   ├── useSchedule.js               ← Content Calendar scheduling hooks
│   │   │   ├── useComments.js               ← Comment fetching hooks
│   │   │   └── useEngagement.js             ← Engagement metrics hooks
│   │   └── lib/
│   │       ├── supabase.js                   ← Supabase client init
│   │       └── api.js                        ← n8n webhook calls
│   ├── public/
│   └── nginx.conf                            ← Nginx config for VPS
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql            ← All CREATE TABLE statements
├── data/                                     ← Source files per project
│   └── credit_cards_topics.xlsx
└── workflows/
    ├── WF_MASTER_orchestrator.json
    ├── WF00_project_creation.json
    ├── WF01_niche_research.json
    ├── WF02_topic_generation.json
    ├── WF03_script_3pass.json
    ├── WF04_scene_segmentation.json
    ├── WF05_voiceover.json
    ├── WF06_image_generation.json
    ├── WF07a_i2v_generation.json          ← [DEPRECATED — replaced by WF_KEN_BURNS]
    ├── WF07b_t2v_generation.json          ← [DEPRECATED — replaced by WF_KEN_BURNS]
    ├── WF_KEN_BURNS.json                  ← FFmpeg zoompan + color grade per scene
    ├── WF08_captions.json
    ├── WF09_ffmpeg_assembly.json
    ├── WF10_drive_upload.json
    ├── WF11_youtube_upload.json
    ├── WF12_youtube_analytics.json
    ├── WF_SUPERVISOR_AGENT.json
    ├── WF_WEBHOOK_dashboard_api.json
    ├── WF_SHORTS_ANALYZE.json            ← Viral analysis + narration rewrite + prompt rewrite
    ├── WF_SHORTS_AUDIO.json              ← Fresh TTS for rewritten narration
    ├── WF_SHORTS_IMAGES.json             ← 9:16 images + thumbnails (Fal.ai)
    ├── WF_SHORTS_I2V.json                ← [DEPRECATED — replaced by Ken Burns in shorts pipeline]
    ├── WF_SHORTS_T2V.json                ← [DEPRECATED — replaced by Ken Burns in shorts pipeline]
    ├── WF_SHORTS_CAPTIONS.json           ← Whisper forced alignment + kinetic ASS generation
    ├── WF_SHORTS_ASSEMBLY.json           ← FFmpeg stitch + caption burn service (:9998 libass)
    ├── WF_SHORTS_UPLOAD.json             ← Upload to Drive shorts/ subfolder
    ├── WF_SOCIAL_POSTER.json             ← Scheduled cron: post to TikTok/Instagram/YT Shorts
    ├── WF_SOCIAL_ANALYTICS.json          ← Daily cron: pull engagement metrics
    ├── WF_RESEARCH_ORCHESTRATOR.json     ← 5-source parallel scrape + AI categorization
    ├── WF_RESEARCH_REDDIT.json           ← Reddit scraping sub-workflow
    ├── WF_RESEARCH_YOUTUBE.json          ← YouTube comment scraping sub-workflow
    ├── WF_RESEARCH_TIKTOK.json           ← TikTok scraping via Apify sub-workflow
    ├── WF_RESEARCH_GOOGLE_TRENDS.json    ← Google Trends + PAA sub-workflow
    ├── WF_RESEARCH_QUORA.json            ← Quora scraping via Apify sub-workflow
    ├── WF_RESEARCH_CATEGORIZE.json       ← AI clustering + ranking sub-workflow
    ├── WF_THUMBNAIL.json                 ← AI thumbnail + text overlay + upload
    ├── WF_PLATFORM_METADATA.json         ← AI per-platform title/desc/tags
    ├── WF_SCHEDULE_PUBLISHER.json        ← Cron: publish scheduled posts when due
    ├── WF_COMMENTS_SYNC.json             ← Daily cron: pull comments from 3 platforms
    ├── WF_COMMENT_ANALYZE.json           ← AI sentiment + intent scoring
    ├── WF_QA_CHECK.json                  ← Automated 13-point quality checklist
    ├── WF_RETRY_WRAPPER.json             ← Exponential backoff for any API call
    ├── WF_MUSIC_GENERATE.json            ← Anthropic analysis → Lyria generation → FFmpeg merge + ducking
    └── WF_ENDCARD.json                   ← Generate branded end card
```

---

## 9. Cost Tracking

### Per Video (Main 2-hour YouTube) — Updated: Text-to-Image + Ken Burns Only

| Phase | What | Cost |
|-------|------|------|
| A | Project creation + niche research | ~$0.60 |
| B | Topic + avatar generation → GATE 1 | ~$0.20 |
| C | 3-pass script + scoring → GATE 2 | ~$1.80 |
| D1 | TTS audio (172 scenes) | ~$0.30 |
| D2 | Images (Fal.ai Seedream 4.0, 172 scenes × $0.03) | ~$5.16 |
| D3 | Ken Burns + Color Grade (FFmpeg, 172 scenes) | $0.00 |
| D4 | Captions + Transitions + Assembly | $0.00 |
| D5 | Background music (Lyria generation + FFmpeg mixing) | ~$0.10 |
| D6 | End card generation | $0.00 |
| D7 | Platform-specific renders | $0.00 |
| E | Video review → GATE 3 → Publish | $0.00 |
| TI | Topic Intelligence (5-source research) | ~$0.13 |
| **Total per video** | | **~$8.09** |

*Single visual pipeline: Fal.ai Seedream 4.0 for every scene. No hybrid rendering, no I2V/T2V, no data-graphic classification.*

### Per Video — Legacy Cost (with I2V/T2V) [DEPRECATED]

| Component | Cost |
|-----------|------|
| ~~Script (3-pass + 4 evaluator calls)~~ | ~~$0.80-$1.80~~ |
| ~~TTS audio (172 scenes)~~ | ~~$0.30~~ |
| ~~Seedream 4.0 images on Fal.ai (75)~~ | ~~$2.25~~ |
| ~~Wan 2.5 I2V clips on Fal.ai (25 x 5s)~~ | ~~$6.25~~ |
| ~~Wan 2.5 T2V clips on Fal.ai (72 x 5s)~~ | ~~$18.00~~ |
| ~~**Total per main video**~~ | ~~**~$27.50-$28.50**~~ |

### Per Topic — Shorts (20 clips)

| Component | Cost |
|-----------|------|
| Viral analysis + narration rewrite + prompt rewrite + emphasis marking | ~$0.08 |
| Fresh TTS audio (~140 scenes) | ~$0.28 |
| 9:16 images, Seedream 4.0 on Fal.ai (~82, all scenes — no I2V/T2V) | $2.46 |
| 20 thumbnails, Seedream 4.0 on Fal.ai | $0.60 |
| Ken Burns + Color Grade (FFmpeg, all scenes) | Free (local) |
| Kinetic ASS caption generation + FFmpeg libass burn (20 clips) | Free (local) |
| FFmpeg assembly (20 clips) | Free (local) |
| **Total per topic shorts** | **~$3.42** |

*Previously ~$22/topic with I2V/T2V. Savings: ~$18.58/topic (84% reduction).*

### Combined Per Topic

| | Cost |
|---|------|
| Main 2-hour YouTube video | ~$8 |
| 20 short-form clips (TikTok/Instagram/YT Shorts) | ~$3.42 |
| **Total per topic** | **~$11.42** |

### Per Project Setup (one-time)

| Component | Cost |
|-----------|------|
| Niche research (web search + analysis) | ~$0.60 |
| Topic generation (25 topics + avatars) | ~$0.20 |
| Dynamic prompt generation | ~$0.10 |
| **Total project setup** | **~$0.90** |

### Monthly

| Volume | Main Videos | Shorts | Supervisor | Research | Total |
|--------|-----------|--------|------------|----------|-------|
| 25 topics (video + shorts) | ~$202 | ~$86 | $14.40 | ~$2.08 | **~$304** |
| 30 topics (video + shorts) | ~$242 | ~$103 | $14.40 | ~$2.08 | **~$361** |

*Previously ~$1,273-$1,539/month. New: ~$304-$361/month (76% reduction).*

---

## 10. n8n ↔ Supabase Integration Pattern

All workflows use HTTP Request nodes to Supabase REST API:

```
READ:  GET  https://supabase.operscale.cloud/rest/v1/{{table}}?{{filters}}
WRITE: PATCH https://supabase.operscale.cloud/rest/v1/{{table}}?id=eq.{{id}}
INSERT: POST https://supabase.operscale.cloud/rest/v1/{{table}}

Headers:
  apikey: {{SUPABASE_ANON_KEY}}
  Authorization: Bearer {{SUPABASE_SERVICE_ROLE_KEY}}
  Content-Type: application/json
  Prefer: return=representation (for INSERT/PATCH to get row back)
```

---

## 11. Error Handling

### Topic Intelligence Errors

| Failure | Response | Recovery |
|---------|----------|----------|
| Apify actor timeout | Log to `research_runs.error_log`, mark source `failed` | Continue with remaining sources |
| YouTube API quota hit | Log, mark source `failed` | Use last successful run's data, show "stale" badge |
| All 5 sources fail | Mark run `failed` | Dashboard shows error state + last successful results |
| AI categorization bad JSON | Retry with stricter prompt | If retry fails, show raw results uncategorized |
| Keyword derivation empty | Fall back to `niche` as single keyword | Log warning |

### Production Pipeline Errors

| Failure | Response | Recovery |
|---------|----------|----------|
| FFmpeg Ken Burns OOM (172 scenes) | Batch in groups of 20 | Process 20 scenes → concat batch → next 20 |
| Fal.ai timeout | Retry wrapper (4 attempts, exponential) | Log to production_logs, continue |
| Scene crash mid-pipeline | Resume from failed scene | Check `{stage}_status = 'pending'` per scene |
| YouTube API quota hit (publish) | Pause, schedule retry next day | Log warning, mark topic as `publish_pending` |
| Auto-pilot budget exceeded | Pause all production | Alert on dashboard, require manual resume |
| Music ducking clips audio | Lower Lyria music volume further | Reduce to volume=0.08 and re-mix |
| All 5 research sources fail | Mark run `failed` | Show last successful results |

---

## 12. Self-Annealing — Topic Intelligence

After every research run, improve:
1. **Scraping accuracy:** Source returns irrelevant results → update search query logic in directive.
2. **Categorization quality:** Categories too broad/granular → refine AI prompt.
3. **Engagement weighting:** Ranking surfaces low-value topics → adjust normalization weights.
4. **Source reliability:** Track failure rates. >30% failure → investigate or replace source.

---

## 13. Automated Quality Assurance — 13 Points

Run via `WF_QA_CHECK` after final render. Results displayed on VideoReview page.

**Visual (5 checks):**
1. Resolution matches target platform (FFprobe check)
2. File size within platform limits
3. No black frames (sample every 30s, check luminance)
4. Frame rate = 30 fps
5. Aspect ratio correct (16:9 or 9:16)

**Caption (3 checks):**
6. ASS file exists and has correct scene count
7. No caption text exceeds screen width
8. Highlight words exist in narration text

**Audio (3 checks):**
9. Audio duration matches video duration (±500ms tolerance)
10. Loudness normalized (-16 LUFS ±1)
11. No silence gaps > 2 seconds (except intentional pauses)

**Platform (2 checks):**
12. H.264 codec, AAC audio, .mp4 container
13. movflags +faststart flag present

---

## Summary

You operate between **a niche name typed into a dashboard** and **published content across YouTube (2-hour documentaries), TikTok, Instagram Reels, and YouTube Shorts** — across any niche, with full control at 4 approval gates, powered by 61 specialist AI agents.

**v4.0 architecture:** Every scene is text-to-image + Ken Burns motion + color grading (no I2V/T2V). 9-stage cinematic pipeline. Style DNA locks visual consistency across 172 scenes. 13-point automated QA. Auto-pilot for trusted niches. Content calendar + engagement hub. 38 n8n workflows. ~$8/video (was ~$28).

Read directives. Make decisions. Run tools. Observe results. Improve the system.

Be pragmatic. Be reliable. **Self-anneal.**

---

> **IMMUTABLE** — Do not rewrite, regenerate, or replace this file unless explicitly instructed.
> Before performing any task: read this file. Apply it strictly.
> Audio is the master clock. Supabase is the source of truth. No niche is hardcoded. No work is repeated.
> Fal.ai Seedream 4.0 for images. FFmpeg Ken Burns for motion. Kinetic ASS subtitles + FFmpeg libass (caption burn service :9998) for word-by-word captions. Agency Agents for specialist expertise.
