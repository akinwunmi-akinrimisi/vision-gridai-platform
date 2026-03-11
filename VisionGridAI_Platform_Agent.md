# Agent Instructions (DOE)
## Vision GridAI Platform — Multi-Niche AI Video Production
### Directive → Observation → Experiment

> **This is a PLATFORM, not a pipeline.** Any niche. Any topic. Full control from a dashboard.
> Supabase is the brain. n8n is the muscle. The dashboard is the control room.
> Audio is the master clock. Every asset is cached. No work is ever repeated.
> Hybrid architecture: agentic where reasoning adds value, deterministic where speed matters.

**Version 3.0 | Operscale Systems | March 2026**
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
| Media (Images) | Fal.ai → Seedream 4.0 | Text-to-image generation (16:9 + 9:16) |
| Media (Video) | Fal.ai → Wan 2.5 | I2V + T2V generation (16:9 + 9:16) |
| Audio | Google Cloud TTS (Chirp 3 HD) | Voiceover |
| Assembly | FFmpeg | Video production |
| Captions (Shorts) | Remotion (React-based video renderer) | Kinetic word-by-word caption overlays for short-form |
| Distribution | YouTube Data API v3 + TikTok API + Instagram Graph API | Upload + analytics |
| Agent Expertise | Agency Agents (61 specialists in ~/.claude/agents/) | Domain expertise for GSD executor agents |

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
  images_per_video INTEGER DEFAULT 100,
  i2v_clips_per_video INTEGER DEFAULT 25,
  t2v_clips_per_video INTEGER DEFAULT 72,
  target_word_count INTEGER DEFAULT 19000,
  target_scene_count INTEGER DEFAULT 172,
  image_model TEXT DEFAULT 'fal-ai/bytedance/seedream/v4/text-to-image',
  image_cost DECIMAL(6,4) DEFAULT 0.030,
  i2v_model TEXT DEFAULT 'fal-ai/wan-25-preview/image-to-video',
  i2v_cost DECIMAL(6,4) DEFAULT 0.050,
  t2v_model TEXT DEFAULT 'fal-ai/wan-25-preview/text-to-video',
  t2v_cost DECIMAL(6,4) DEFAULT 0.050,
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
  i2v_progress TEXT DEFAULT 'pending',
  t2v_progress TEXT DEFAULT 'pending',
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
  visual_type TEXT,  -- 'static_image','i2v','t2v'
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
  emphasis_word_map JSONB,            -- [{word, start_ms, end_ms, emphasis: bool}] for Remotion
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
```

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

**Step C2:** 3-pass generation with per-pass scoring:

| Pass | Words | Context Injected | Evaluator After? |
|------|-------|-----------------|-----------------|
| Pass 1: Foundation | 5,000–7,000 | Topic + avatar data | ✅ Score Pass 1 |
| Pass 2: Depth | 8,000–10,000 | Full Pass 1 output | ✅ Score Pass 2 |
| Pass 3: Resolution | 5,000–7,000 | Summaries of Pass 1 + 2 | ✅ Score Pass 3 + Combined |

**Per-pass scoring:** After each pass, the evaluator scores it on the 7 dimensions. If a pass scores < 6.0, it is regenerated with targeted corrections BEFORE moving to the next pass. This catches problems early (e.g., Pass 1 has no avatar usage → fix before Pass 2 builds on it).

**Combined scoring:** After all 3 passes, the full script is evaluated as a whole. Pass mark: 7.0/10. If below, the lowest-scoring pass is regenerated. Max 3 total regeneration attempts across all passes. Force-pass on attempt 3.

**Step C3:** WF02_AGENT — Claude assigns visual types intelligently (same as current Agent.md)

**Step C4:** Insert scene rows into `scenes` table (one row per scene)

**Step C5: ⏸ APPROVAL GATE 2** — Dashboard shows:
- Full script by chapter (collapsible)
- Per-pass quality scores + combined score
- Visual type distribution chart
- Avatar usage highlights
- Word count, scene count
- Actions: Approve / Reject / Refine (can refine specific passes)

**Cost:** $0.60–$1.80 per topic (3 passes × $0.15/pass + 4 evaluator calls × $0.05 + potential retries)

### Phase D: Production Pipeline (DETERMINISTIC)

Unchanged from current Agent.md — WF03 through WF08:

```
WF03: TTS (172 scenes → FFprobe → Master Timeline) → writes to scenes table
WF04: Images (75 static, Seedream 4.0 on Fal.ai) → writes to scenes table  
WF05A: I2V (25 clips, Wan 2.5 on Fal.ai) ──┐
WF05B: T2V (72 clips, Wan 2.5 on Fal.ai) ──┴→ WF06: Captions → WF07: FFmpeg → WF08: Drive Upload
```

**All writes go to Supabase** `scenes` table. Dashboard gets instant updates via Supabase Realtime.

**Critical rules preserved:**
- FFprobe for actual duration (not estimation)
- Upload to Drive + write to `scenes` table after EVERY asset
- force_regenerate honoured across all workflows
- Self-chaining: each WF fires next on completion
- Error handling: write `status = 'failed'` + `error_log` on failure

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
WF_SHORTS_IMAGES    → 9:16 images (Seedream 4.0 on Fal.ai, TikTok aesthetic)
                    → 20 thumbnails (diagonal slant, AI-generated)
WF_SHORTS_I2V       → 9:16 I2V clips (Wan 2.5 on Fal.ai) ──┐
WF_SHORTS_T2V       → 9:16 T2V clips (Wan 2.5 on Fal.ai) ──┴→ parallel
WF_SHORTS_CAPTIONS  → Remotion renders word-by-word kinetic caption overlays
                      (center screen, emphasis words in yellow/red, pop-in animation)
WF_SHORTS_ASSEMBLY  → FFmpeg: stitch scenes → composite caption overlay → final clip
WF_SHORTS_UPLOAD    → Upload clips + thumbnails to Drive (topic_folder/shorts/)
```

**Caption spec (Remotion):**
- Animation: Word-by-word pop-in (Hormozi/MrBeast style)
- Position: Center of screen
- Emphasis: Bold color change (yellow or red) on key words, rest white
- Font: Bold sans-serif (Montserrat Black or Inter Black), minimum 48px
- Shadow: Strong drop shadow for readability over any background
- Render: ~3-5 min per clip on KVM 4 VPS (90 min total for 20 clips)

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

### 9 Pages

| Page | URL | Purpose |
|------|-----|---------|
| Projects Home | `/` | All niches as cards, create new project |
| Project Dashboard | `/project/:id` | Command center — metrics, pipeline status table |
| Topic Review | `/project/:id/topics` | Gate 1 — approve/reject/refine 25 topics |
| Script Review | `/project/:id/topics/:tid/script` | Gate 2 — quality scores, script viewer, approve/refine |
| Production Monitor | `/project/:id/production` | Real-time progress with Supabase Realtime |
| Video Review | `/project/:id/topics/:tid/video` | Gate 3 — preview video, approve/reject/edit metadata |
| 📱 Shorts Creator | `/shorts` | Gate 4 — analyze scripts, review viral clips, produce 9:16 shorts |
| 📤 Social Media Publisher | `/social` | Post/schedule clips to TikTok, Instagram, YouTube Shorts |
| Analytics | `/project/:id/analytics` | YouTube + social media performance, revenue, CPM |
| Settings | `/project/:id/settings` | Per-project config, prompt editor, model selection, social accounts |
| Analytics | `/project/:id/analytics` | YouTube performance, revenue, CPM by topic/niche |
| Settings | `/project/:id/settings` | Per-project config, prompt editor, model selection |

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
│   ├── package.json                          ← React + Tailwind + Supabase JS + Remotion
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
│   │   │   ├── SocialMediaPublisher.jsx      ← NEW: Post/schedule to TikTok/Instagram/YT Shorts
│   │   │   ├── Analytics.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── TopicCard.jsx
│   │   │   ├── ScoreRadar.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── SceneGrid.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   ├── RefineModal.jsx
│   │   │   ├── ShortClipCard.jsx             ← NEW: Viral clip review card
│   │   │   └── PostScheduler.jsx             ← NEW: Schedule/post UI per platform
│   │   ├── remotion/                          ← NEW: Kinetic caption renderer
│   │   │   ├── KineticCaptions.jsx           ← Word-by-word pop-in component
│   │   │   ├── render-captions.js            ← CLI script to render caption overlay
│   │   │   └── composition.jsx               ← Remotion composition config
│   │   ├── hooks/
│   │   │   ├── useSupabase.js
│   │   │   ├── useRealtime.js
│   │   │   └── useProject.js
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
    ├── WF07a_i2v_generation.json
    ├── WF07b_t2v_generation.json
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
    ├── WF_SHORTS_I2V.json                ← 9:16 I2V clips (Fal.ai)
    ├── WF_SHORTS_T2V.json                ← 9:16 T2V clips (Fal.ai)
    ├── WF_SHORTS_CAPTIONS.json           ← Remotion kinetic caption rendering
    ├── WF_SHORTS_ASSEMBLY.json           ← FFmpeg stitch + caption composite
    ├── WF_SHORTS_UPLOAD.json             ← Upload to Drive shorts/ subfolder
    ├── WF_SOCIAL_POSTER.json             ← Scheduled cron: post to TikTok/Instagram/YT Shorts
    └── WF_SOCIAL_ANALYTICS.json          ← Daily cron: pull engagement metrics
```

---

## 9. Cost Tracking

### Per Video (Main 2-hour YouTube)

| Component | Cost |
|-----------|------|
| Script (3-pass + 4 evaluator calls) | $0.80–$1.80 |
| Visual type assignment (WF04_AGENT) | ~$0.03 |
| TTS audio (172 scenes) | ~$0.30 |
| Seedream 4.0 images on Fal.ai (75) | $2.25 |
| Wan 2.5 I2V clips on Fal.ai (25 × 5s) | $6.25 |
| Wan 2.5 T2V clips on Fal.ai (72 × 5s) | $18.00 |
| **Total per main video** | **~$27.50–$28.50** |

### Per Topic — Shorts (20 clips)

| Component | Cost |
|-----------|------|
| Viral analysis + narration rewrite + prompt rewrite + emphasis marking | ~$0.08 |
| Fresh TTS audio (~140 scenes) | ~$0.28 |
| 9:16 images, Seedream 4.0 on Fal.ai (~62) | $1.86 |
| 20 thumbnails, Seedream 4.0 on Fal.ai | $0.60 |
| 9:16 I2V clips, Wan 2.5 on Fal.ai (~21 × 5s) | $5.25 |
| 9:16 T2V clips, Wan 2.5 on Fal.ai (~57 × 5s) | $14.25 |
| Remotion caption rendering (20 clips) | Free (local) |
| FFmpeg assembly (20 clips) | Free (local) |
| **Total per topic shorts** | **~$22.32** |

### Combined Per Topic

| | Cost |
|---|------|
| Main 2-hour YouTube video | ~$28 |
| 20 short-form clips (TikTok/Instagram/YT Shorts) | ~$22 |
| **Total per topic** | **~$50** |

### Per Project Setup (one-time)

| Component | Cost |
|-----------|------|
| Niche research (web search + analysis) | ~$0.60 |
| Topic generation (25 topics + avatars) | ~$0.20 |
| Dynamic prompt generation | ~$0.10 |
| **Total project setup** | **~$0.90** |

### Monthly

| Volume | Main Videos | Shorts | Supervisor | Total |
|--------|-----------|--------|------------|-------|
| 25 topics (video + shorts) | ~$700 | ~$558 | $14.40 | **~$1,273** |
| 30 topics (video + shorts) | ~$855 | ~$670 | $14.40 | **~$1,539** |

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

## Summary

You operate between **a niche name typed into a dashboard** and **published content across YouTube (2-hour documentaries), TikTok, Instagram Reels, and YouTube Shorts** — across any niche, with full control at 4 approval gates, powered by 61 specialist AI agents.

Read directives. Make decisions. Run tools. Observe results. Improve the system.

Be pragmatic. Be reliable. **Self-anneal.**

---

> ⚠️ **IMMUTABLE** — Do not rewrite, regenerate, or replace this file unless explicitly instructed.
> Before performing any task: read this file. Apply it strictly.
> Audio is the master clock. Supabase is the source of truth. No niche is hardcoded. No work is repeated.
> Fal.ai for media generation. Remotion for kinetic captions. Agency Agents for specialist expertise.
