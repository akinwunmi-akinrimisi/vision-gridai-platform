# VISION GRIDAI PLATFORM — Dashboard Implementation Plan
## Multi-Niche AI Video Production Platform
### Supabase + Dashboard + Dynamic Pipeline

---

## 1. WHAT WE'RE BUILDING

A complete AI video production platform where you:

1. **Open the dashboard** → type a niche (e.g., "credit cards" or "stoic philosophy")
2. **The system researches** that niche using real web search — audits competitors, mines Reddit/Quora pain points, identifies blue-ocean gaps
3. **Generates 25 SEO-optimized topics** with full customer avatars (10 data points each)
4. **You review** from the dashboard — accept, reject, or refine each topic with custom instructions
5. **Production begins** — scripts (3-pass), voiceover, images, video clips, assembly
6. **You review scripts** from the dashboard — accept, reject, or refine
7. **Videos are assembled** and you preview before publishing
8. **One click to publish** to YouTube with full metadata + captions + thumbnails
9. **Analytics flow back** into the dashboard showing performance per video, per niche

All powered by: Supabase (database) + n8n (orchestration) + Dashboard (UI) + Claude (intelligence) + Kie.ai (media generation) + FFmpeg (assembly)

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD (Nginx on VPS)                                    │
│  dashboard.srv1297445.hstgr.cloud                            │
│                                                               │
│  React or vanilla JS SPA                                      │
│  ├── Project Manager (create/switch niches)                   │
│  ├── Topic Research & Review                                  │
│  ├── Production Pipeline Monitor                              │
│  ├── Script Review & Refinement                               │
│  ├── Video Preview & Approval                                 │
│  ├── YouTube Analytics                                        │
│  └── Cost Tracker                                             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (Nginx reverse proxy)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  n8n (Docker on VPS)                                          │
│  n8n.srv1297445.hstgr.cloud                                   │
│                                                               │
│  Webhook endpoints (dashboard API layer)                      │
│  ├── /webhook/project/create                                  │
│  ├── /webhook/topics/generate                                 │
│  ├── /webhook/topics/approve                                  │
│  ├── /webhook/topics/reject                                   │
│  ├── /webhook/production/trigger                              │
│  ├── /webhook/script/approve                                  │
│  ├── /webhook/script/reject                                   │
│  ├── /webhook/video/approve                                   │
│  ├── /webhook/video/reject                                    │
│  ├── /webhook/status                                          │
│  ├── /webhook/assets/{topic_id}                               │
│  └── /webhook/analytics                                       │
│                                                               │
│  Production workflows (WF00–WF10 + agents)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ localhost:54321
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (Docker on VPS)                                     │
│  supabase.operscale.cloud                                     │
│                                                               │
│  PostgreSQL database                                          │
│  ├── projects                                                 │
│  ├── niche_profiles                                           │
│  ├── topics                                                   │
│  ├── avatars                                                  │
│  ├── scenes                                                   │
│  ├── production_progress                                      │
│  ├── assets                                                   │
│  ├── youtube_analytics                                        │
│  └── cost_tracking                                            │
│                                                               │
│  Realtime subscriptions (dashboard auto-refresh)              │
│  Row Level Security (future: multi-user)                      │
└─────────────────────────────────────────────────────────────┘
```

### Why This Architecture

**Supabase over Google Sheets:**
- Real relational database — proper foreign keys between projects → topics → scenes → assets
- Real-time subscriptions — dashboard updates live as n8n writes to DB (no polling needed)
- No API rate limits like Google Sheets (60 req/min)
- Proper indexing — query "all topics for project X where status = pending" in milliseconds
- Stores JSON natively (scene manifests, evaluation results, prompt configs)
- Scales to thousands of topics across dozens of niches without spreadsheet lag
- Row Level Security ready for future multi-user/client access

**Dashboard on same VPS:**
- Zero latency to n8n and Supabase (all localhost)
- No CORS issues
- No authentication complexity for solo use
- Nginx serves static files + reverse proxies to n8n webhooks and Supabase

---

## 3. SUPABASE DATABASE SCHEMA

### Table: `projects`

The top-level entity. One project = one niche = one YouTube channel direction.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- "Credit Card Rewards Channel"
  niche TEXT NOT NULL,                         -- "US Credit Cards"
  niche_description TEXT,                      -- Longer description for prompt context
  channel_style TEXT DEFAULT '2hr_documentary', -- Video format
  target_video_count INTEGER DEFAULT 25,
  
  -- AI-GENERATED niche profile (created during research phase)
  niche_system_prompt TEXT,                    -- Dynamic system prompt for this niche
  niche_expertise_profile TEXT,                -- "Senior Credit Card Analyst and Data Journalist..."
  niche_red_ocean_topics TEXT[],               -- Topics to AVOID (oversaturated)
  niche_competitor_channels TEXT[],            -- Channels already covering this niche
  niche_pain_point_sources TEXT,               -- Where the audience hangs out (Reddit, forums)
  niche_blue_ocean_strategy TEXT,              -- The strategic positioning for this channel
  
  -- PLAYLIST STRUCTURE (3 angles, AI-generated per niche)
  playlist1_name TEXT,                         -- e.g., "The Mathematician"
  playlist1_theme TEXT,
  playlist2_name TEXT,                         -- e.g., "Your Exact Life"
  playlist2_theme TEXT,
  playlist3_name TEXT,                         -- e.g., "The Investigator"
  playlist3_theme TEXT,
  
  -- YOUTUBE CONFIG
  youtube_channel_id TEXT,
  youtube_playlist1_id TEXT,
  youtube_playlist2_id TEXT,
  youtube_playlist3_id TEXT,
  
  -- GOOGLE DRIVE
  drive_root_folder_id TEXT,
  drive_assets_folder_id TEXT,
  
  -- PRODUCTION CONFIG (customizable per project from dashboard)
  script_approach TEXT DEFAULT '3_pass',        -- '3_pass' or 'single_call'
  images_per_video INTEGER DEFAULT 100,
  i2v_clips_per_video INTEGER DEFAULT 25,
  t2v_clips_per_video INTEGER DEFAULT 72,
  target_word_count INTEGER DEFAULT 19000,      -- Center of 18K-20K range
  target_scene_count INTEGER DEFAULT 172,
  
  -- COSTS
  image_model TEXT DEFAULT 'seedream/seedream-4.5-text-to-image',
  image_cost_per_unit DECIMAL(6,4) DEFAULT 0.032,
  i2v_model TEXT DEFAULT 'kling/v2-1-standard-image-to-video',
  i2v_cost_per_unit DECIMAL(6,4) DEFAULT 0.125,
  t2v_model TEXT DEFAULT 'kling/v2-1-standard-text-to-video',
  t2v_cost_per_unit DECIMAL(6,4) DEFAULT 0.125,
  
  -- STATUS
  status TEXT DEFAULT 'created',               -- created → researching → topics_pending_review → active → paused
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `niche_profiles`

Stores the research output from the niche analysis phase. This is what powers the dynamic prompt generation.

```sql
CREATE TABLE niche_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- RESEARCH OUTPUTS (populated by web search + Claude analysis)
  competitor_analysis JSONB,                   -- { "channels": [...], "top_videos": [...], "gaps": [...] }
  audience_pain_points JSONB,                  -- { "reddit": [...], "quora": [...], "forums": [...] }
  keyword_research JSONB,                      -- { "high_volume": [...], "low_competition": [...], "trending": [...] }
  blue_ocean_opportunities JSONB,              -- { "unoccupied_angles": [...], "value_curve_gaps": [...] }
  
  -- QUALITY CHECKS (from the 6-point verification)
  two_am_test_notes TEXT,                      -- Would someone search this at 2 AM?
  share_test_notes TEXT,                       -- Would someone share with a friend?
  
  -- RAW SEARCH RESULTS (for reference/audit)
  search_queries_used TEXT[],
  search_results_raw JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `topics`

One row per video topic. This replaces the Topics tab in Google Sheets.

```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  topic_number INTEGER NOT NULL,               -- 1-25 within this project
  
  -- TOPIC DATA (from generation)
  playlist_group INTEGER,                      -- 1, 2, or 3
  playlist_angle TEXT,                         -- "The Mathematician" / "Your Exact Life" / "The Investigator"
  original_title TEXT,
  seo_title TEXT,
  narrative_hook TEXT,
  key_segments TEXT,                           -- Chapter structure for 2hr runtime
  estimated_cpm TEXT,
  viral_potential TEXT,
  
  -- REVIEW STATUS
  review_status TEXT DEFAULT 'pending',        -- pending → approved → rejected → refined
  review_feedback TEXT,                        -- User's rejection reason or refinement instructions
  refinement_history JSONB DEFAULT '[]',       -- Array of { instruction, result, timestamp }
  
  -- PRODUCTION STATUS
  status TEXT DEFAULT 'pending',               -- pending → scripting → audio → images → video → assembly → review → uploading → published → failed
  last_status_change TIMESTAMPTZ DEFAULT now(),
  error_log TEXT,
  
  -- SCRIPT DATA
  script_json JSONB,                           -- Full scene array (stored directly, no Google Doc needed)
  script_metadata JSONB,                       -- { video_metadata: { title, description, tags, thumbnail_prompt } }
  word_count INTEGER,
  scene_count INTEGER,
  script_attempts INTEGER DEFAULT 0,
  script_force_passed BOOLEAN DEFAULT false,
  script_quality_score DECIMAL(3,1),
  script_evaluation JSONB,                     -- Full 7-dimension scoring
  script_review_status TEXT DEFAULT 'pending', -- pending → approved → rejected → refined
  script_review_feedback TEXT,
  
  -- SCENE MANIFEST (the master data structure)
  scene_manifest JSONB,                        -- Array of all scenes with visual types, URLs, timestamps
  
  -- PROGRESS TRACKING
  audio_progress TEXT DEFAULT 'pending',       -- "done:47/172" or "complete"
  images_progress TEXT DEFAULT 'pending',
  i2v_progress TEXT DEFAULT 'pending',
  t2v_progress TEXT DEFAULT 'pending',
  assembly_status TEXT DEFAULT 'pending',
  
  -- DRIVE & YOUTUBE
  drive_folder_id TEXT,
  drive_subfolder_ids JSONB,                   -- { audio: "...", images: "...", video_clips: "...", captions: "...", script: "..." }
  drive_video_url TEXT,
  youtube_url TEXT,
  youtube_video_id TEXT,
  youtube_caption_id TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  
  -- VIDEO REVIEW (Gate 3)
  video_review_status TEXT DEFAULT 'pending',  -- pending → approved → rejected
  video_review_feedback TEXT,
  
  -- COST
  total_cost DECIMAL(8,2),
  cost_breakdown JSONB,                        -- { script: 0.45, tts: 0.30, images: 3.20, i2v: 3.13, t2v: 9.00 }
  
  -- YOUTUBE ANALYTICS
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
  
  -- SUPERVISOR
  retry_count INTEGER DEFAULT 0,
  supervisor_alerted BOOLEAN DEFAULT false,
  force_regenerate BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `avatars`

One avatar per topic. Separate table for clean normalization.

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
  spending_profile TEXT,                       -- Or "lifestyle_profile" for non-finance niches
  knowledge_level TEXT,
  emotional_driver TEXT,
  online_hangouts TEXT,
  objection TEXT,
  dream_outcome TEXT,
  
  -- REVIEW (avatars reviewed as part of topic review gate)
  review_status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `scenes`

Individual scene data. Replaces the scene manifest Google Doc. One row per scene per topic.

```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  scene_number INTEGER NOT NULL,
  scene_id TEXT NOT NULL,                      -- "scene_001"
  
  -- SCRIPT DATA
  narration_text TEXT,
  image_prompt TEXT,
  visual_type TEXT,                            -- "static_image" | "i2v" | "t2v"
  emotional_beat TEXT,
  chapter TEXT,
  
  -- AUDIO (Master Clock)
  audio_duration_ms INTEGER,
  audio_file_drive_id TEXT,
  audio_file_url TEXT,
  start_time_ms BIGINT,                        -- Cumulative timestamp
  end_time_ms BIGINT,
  
  -- VISUALS
  image_url TEXT,
  image_drive_id TEXT,
  video_url TEXT,                              -- For i2v and t2v scenes
  video_drive_id TEXT,
  
  -- STATUS
  audio_status TEXT DEFAULT 'pending',         -- pending → generated → uploaded → failed
  image_status TEXT DEFAULT 'pending',
  video_status TEXT DEFAULT 'pending',         -- For i2v/t2v scenes
  clip_status TEXT DEFAULT 'pending',          -- FFmpeg individual clip built
  
  -- SKIP (supervisor can skip individual scenes)
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_scenes_topic ON scenes(topic_id);
CREATE INDEX idx_scenes_status ON scenes(topic_id, audio_status);
CREATE INDEX idx_scenes_visual_type ON scenes(topic_id, visual_type);
```

### Table: `production_log`

Audit trail of everything that happens in the pipeline.

```sql
CREATE TABLE production_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  topic_id UUID REFERENCES topics(id),
  
  stage TEXT NOT NULL,                         -- "script_generation", "audio", "images", etc.
  action TEXT NOT NULL,                        -- "started", "completed", "failed", "retried", "skipped"
  details JSONB,                               -- { scene_id, error_message, attempt_number, etc. }
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_log_topic ON production_log(topic_id);
CREATE INDEX idx_log_created ON production_log(created_at);
```

### Table: `prompt_configs`

Stores the dynamically generated prompts for each niche. Reusable across topics within the same project.

```sql
CREATE TABLE prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  prompt_type TEXT NOT NULL,                   -- "system_prompt", "topic_generator", "script_pass1", "script_pass2", "script_pass3", "evaluator", "visual_director"
  prompt_text TEXT NOT NULL,
  
  -- VERSION TRACKING
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. THE PIPELINE — PHASE BY PHASE

### Phase A: Project Creation & Niche Research (NEW — dashboard-driven)

**Trigger:** User clicks "New Project" in dashboard, types a niche name + optional description

**Step A1: Create project record**
- Insert into `projects` table with niche name
- Create Google Drive root folder + assets subfolder
- Store folder IDs in project record

**Step A2: Niche Research (agentic, web search)** ⚡

Claude receives the niche and performs REAL research:

```
System: You are a Senior Content Strategist and Market Researcher. You will research a YouTube 
niche to identify blue-ocean opportunities for a 2-hour documentary-style channel.

User: Research the niche "{{niche}}" for a YouTube channel. Using the web search tool:

1. COMPETITOR AUDIT: Search YouTube for the top 10 channels in this niche. For each, note:
   - Channel name, subscriber count, avg views
   - What topics they cover repeatedly (RED OCEAN)
   - What topics they've never covered (opportunities)

2. AUDIENCE PAIN POINTS: Search Reddit, Quora, and niche forums for:
   - Most upvoted questions/complaints in this niche
   - Common frustrations with existing content
   - What people say is "missing" from current YouTube coverage

3. KEYWORD GAPS: Search for high-volume, low-competition keywords in this niche

4. BLUE OCEAN ANALYSIS: Based on your research, identify:
   - 5-8 content angles that NO top channel covers well
   - The value curve gaps (where existing content is shallow, surface-level, or biased)
   - The channel positioning statement (what makes THIS channel different)

5. GENERATE NICHE PROFILE:
   - A dynamic system prompt for script generation (what expertise should the AI embody?)
   - A niche expertise description (e.g., "Senior Credit Card Analyst and Data Journalist")
   - 3 playlist angles with names and themes
   - A list of 10+ red-ocean topics to AVOID
   - The primary audience psychographic profile

Return as JSON.
```

Tools available: `web_search` (Anthropic's built-in search tool)

**Step A3: Store niche profile**
- Save all research outputs to `niche_profiles` table
- Save generated system prompt, playlist angles, red-ocean list to `projects` table
- Set project status = "researching_complete"

**Step A4: Generate dynamic prompts**
- Using the niche profile, Claude generates all prompt templates:
  - Topic generator prompt (with blue-ocean constraints baked in)
  - Script Pass 1, 2, 3 templates (with niche-specific expertise)
  - Evaluator prompt (niche-agnostic rubric, already defined)
  - Visual director prompt (niche-agnostic, already defined)
- Store all in `prompt_configs` table
- Set project status = "ready_for_topics"

**Dashboard shows:** Research results, niche profile, playlist angles, generated prompts — all reviewable before proceeding.

---

### Phase B: Topic Generation (agentic, with approval gate)

**Trigger:** User clicks "Generate Topics" from dashboard

**Step B1: Generate 25 topics**

Uses the stored `topic_generator` prompt from `prompt_configs`, which was dynamically built during Phase A with the niche's specific blue-ocean constraints.

The prompt follows the structure from your original 30-topic generation approach:
- Blue-ocean methodology (Four Actions Framework)
- Quality benchmarks (2 AM Test, Share Test, Rewatch Test)
- 3 playlist groups matching the generated angles
- Each topic includes: SEO title, narrative hook, key segments, CPM estimate, viral potential
- Each topic includes: full 10-category customer avatar

Claude generates all 25 in one call (with web search enabled for SEO title validation).

**Step B2: Store in database**
- Insert 25 rows into `topics` table
- Insert 25 rows into `avatars` table
- All with `review_status = "pending"`

**Step B3: ⏸️ APPROVAL GATE 1 — Topic Review**

Dashboard shows all 25 topics in a card/table view. For each topic, the user can:

| Action | What Happens |
|--------|-------------|
| ✅ **Approve** | Sets `review_status = "approved"`. Topic enters production queue. |
| ❌ **Reject** | Sets `review_status = "rejected"`. Removed from production. |
| 🔄 **Refine** | Opens a text input for custom instructions (e.g., "make this more specific to millennials" or "change the angle from investigative to data-driven"). Claude regenerates that specific topic using the refinement instruction. New version stored in `refinement_history`. |
| ✏️ **Edit** | Direct inline editing of title, hook, avatar fields. For quick tweaks that don't need AI. |

**Bulk actions:**
- "Approve All" — approves all 25
- "Approve Playlist 1 Only" — approves one group
- "Regenerate All Rejected" — re-runs generation for rejected topics with feedback

Pipeline pauses here until at least 1 topic is approved.

---

### Phase C: Script Generation (3-pass, agentic, with approval gate)

**Trigger:** User clicks "Start Production" on an approved topic, OR auto-starts for all approved topics

**Step C1: Dynamic prompt injection**

The script prompts are loaded from `prompt_configs` for this project. Variables are injected from the `topics` and `avatars` tables:

```
{{niche_expertise_profile}} → from projects table
{{seo_title}} → from topics table
{{narrative_hook}} → from topics table
{{avatar_name_age}} → from avatars table
{{pain_point}} → from avatars table
... (all 16 fields)
```

The system prompt is the dynamically generated one — not hardcoded. If the niche is "credit cards," Claude becomes a Credit Card Analyst. If it's "stoic philosophy," Claude becomes a Classical Philosophy Scholar. This was auto-generated in Phase A.

**Step C2: 3-pass script generation**

```
Pass 1 (Foundation): 5,000–7,000 words
  - Hook + pattern establishment + core framework
  - Uses: niche expertise, avatar data, narrative hook
  
Pass 2 (Depth): 8,000–10,000 words  
  - Deep dive into mechanism + evidence + case studies
  - Receives: full Pass 1 output as context
  - Uses: content_angle_blue_ocean, key_segments

Pass 3 (Resolution): 5,000–7,000 words
  - Practical takeaways + transformation + CTA
  - Receives: summaries of Pass 1 + Pass 2
  - Uses: dream_outcome, practical_takeaways
```

Total: 18,000–24,000 words across 3 passes.

**Step C3: Scene parsing + visual type assignment (WF02_AGENT)**

Claude reads all scenes and assigns visual types intelligently (same as current Agent.md).

**Step C4: Script evaluation (7-dimension scoring)**

Separate evaluator call scores the combined 3-pass output. Same rubric as current Agent.md. If below 7.0, retry with targeted corrections. Max 3 attempts.

**Step C5: ⏸️ APPROVAL GATE 2 — Script Review**

Dashboard shows:
- Full script text (collapsible by chapter/pass)
- Quality score breakdown (7 dimensions with individual scores)
- Visual type distribution chart
- Word count and scene count
- Avatar usage highlights (where the avatar appears in the script)
- Force-pass warning if applicable

Actions:
| Action | What Happens |
|--------|-------------|
| ✅ **Approve** | Script enters production (TTS begins) |
| ❌ **Reject** | Script is discarded. Option to regenerate with feedback. |
| 🔄 **Refine** | Custom instructions (e.g., "the hook is weak, make it more confrontational" or "add more data points in chapter 3"). Claude regenerates affected passes only. |
| ✏️ **Edit Scenes** | Inline editing of individual scene narration/prompts |

---

### Phase D: Production Pipeline (deterministic, same as current Agent.md)

After script approval, the deterministic pipeline runs automatically:

```
WF03: TTS (172 audio files) → FFprobe → Master Timeline
WF04: Images (100 Seedream 4.5)
WF05A: I2V (25 clips) ─┐
WF05B: T2V (72 clips) ──┴→ WF06: Captions → WF07: FFmpeg Assembly → WF08: Drive Upload
```

**All data writes go to Supabase** instead of Google Sheets:
- Each scene's `audio_duration_ms`, `audio_file_drive_id` → `scenes` table
- Each scene's `image_url`, `image_drive_id` → `scenes` table
- Progress updates → `topics` table
- Production log entries → `production_log` table

**Dashboard shows real-time progress** via Supabase Realtime subscriptions:
- Progress bars per stage
- Scene-by-scene completion (172 dots filling in)
- Current cost accumulating
- Estimated time remaining

---

### Phase E: Video Review & YouTube Publish (with approval gate)

**Step E1: ⏸️ APPROVAL GATE 3 — Video Preview**

After FFmpeg assembly, before YouTube upload. Dashboard shows:
- Embedded video player (plays from Google Drive URL)
- Thumbnail preview
- Generated YouTube metadata (title, description, tags)
- Total production cost
- Option to download video file

Actions:
| Action | What Happens |
|--------|-------------|
| ✅ **Approve & Publish** | Uploads to YouTube with metadata + captions + thumbnail |
| ✅ **Approve & Schedule** | Sets publish date/time, uploads as private, scheduled public |
| ❌ **Reject** | Option to go back to specific stage (re-do assembly, or even re-generate images) |
| ✏️ **Edit Metadata** | Inline edit title, description, tags before publish |

**Step E2: YouTube Upload (WF09)**
- Same as current Agent.md (resumable upload, captions, thumbnail, playlist assignment)
- Writes `youtube_url`, `youtube_video_id` to topics table

**Step E3: Analytics Pull (WF10)**
- Daily cron, same as current Agent.md
- Writes to `topics` table `yt_*` columns
- Dashboard shows analytics in real-time

---

## 5. DASHBOARD PAGES — DETAILED SPEC

### Page 1: Projects Home

**URL:** `/`

Shows all niches/projects as cards:
```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 💳 Credit Card Rewards       │  │ 🧠 Relationship Psychology   │
│ 25 topics · 12 published    │  │ 25 topics · 0 published     │
│ $196 spent · $4,200 revenue │  │ $0 spent · Setup in progress│
│ Status: Active              │  │ Status: Topics Pending Review│
│ [Open Dashboard]            │  │ [Open Dashboard]             │
└─────────────────────────────┘  └─────────────────────────────┘

                    [+ New Project]
```

Clicking "+ New Project" opens a modal:
- Niche name (text input)
- Niche description (optional textarea)
- Target video count (default 25)
- Video style (default "2hr_documentary")
- [Start Research] button → triggers Phase A

### Page 2: Project Dashboard (Command Center)

**URL:** `/project/{id}`

Top metrics bar:
```
| Total Topics: 25 | Approved: 22 | Published: 12 | In Progress: 3 | Failed: 1 |
| Total Spend: $196.40 | Total Revenue: $4,200 | ROI: 21.4x | Avg CPM: $34 |
```

Pipeline status table (all topics):
```
# | Title (truncated)              | Angle        | Status       | Progress           | Score | Views | Revenue
1 | Amex Platinum Worth $695...    | Mathematician| ✅ Published | ████████████ 100%  | 7.8   | 45K   | $1,575
2 | Perfect 3-Card Wallet...       | Mathematician| ▶️ Assembly  | ████████░░░░ 75%   | 8.1   | —     | —
3 | CSR vs CSP: 365 Days...        | Mathematician| ⏸ Script Rev | ████░░░░░░░░ 30%   | 6.2   | —     | —
```

### Page 3: Topic Research & Review

**URL:** `/project/{id}/topics`

After topic generation, shows all 25 in expandable cards:
```
┌──────────────────────────────────────────────────────────────────────┐
│ #1 | The Mathematician                                               │
│ Is the Amex Platinum Worth $695? I Did the Math for 7 Lifestyles    │
│                                                                      │
│ Narrative Hook: "Every YouTuber says get the Amex Platinum..."      │
│ Chapters: 5 segments (20min + 15min + 60min + 15min + 10min)       │
│ CPM: $35-$50+ | Viral: Very High                                    │
│                                                                      │
│ 👤 Avatar: Marcus, 34 | Software Engineer, $145K/yr                 │
│ Pain: Paying $695/yr, not sure getting value back                   │
│ Emotional Driver: Validation anxiety                                 │
│ Objection: "These comparison videos always end with an affiliate..." │
│                                                                      │
│ [✅ Approve] [❌ Reject] [🔄 Refine] [✏️ Edit]                      │
└──────────────────────────────────────────────────────────────────────┘
```

Clicking "Refine" expands a text area:
```
┌──────────────────────────────────────────────────────────────────────┐
│ Refinement instruction:                                              │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Make this more focused on the 2026 changes to Amex Platinum     │ │
│ │ benefits. The narrative hook should reference the recent         │ │
│ │ removal of the Walmart+ benefit.                                │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ [Submit Refinement]                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Page 4: Script Review

**URL:** `/project/{id}/topics/{topic_id}/script`

Full script viewer with quality scores:

```
┌─────────────────────────────┬──────────────────────────────────────┐
│ QUALITY SCORE: 7.8/10 ✅    │ Script: Is the Amex Platinum Worth...│
│                              │                                      │
│ Persona Integration: 8/10   │ Chapter 1: The Amex Platinum Myth    │
│ ████████░░                   │                                      │
│ Hook Strength: 9/10         │ Meet Marcus. He's 34, a software     │
│ █████████░                   │ engineer pulling in a hundred and    │
│ Pacing: 7/10                │ forty-five thousand a year in Austin.│
│ ███████░░░                   │ Every month, six hundred and         │
│ Specificity: 8/10           │ ninety-five dollars disappears from  │
│ ████████░░                   │ his statement...                     │
│ TTS Readability: 7/10       │                                      │
│ ███████░░░                   │ [Scene 001] [Scene 002] [Scene 003] │
│ Visual Prompts: 8/10        │                                      │
│ ████████░░                   │ ▼ Chapter 2: The 7 Personas          │
│ Anti-Patterns: 7/10         │ ▼ Chapter 3: Persona-by-Persona ROI  │
│ ███████░░░                   │ ▼ Chapter 4: Hidden Costs            │
│                              │ ▼ Chapter 5: The Verdict             │
│ Word Count: 18,742          │                                      │
│ Scene Count: 172            │                                      │
│ Visual Split: 75/25/72      │                                      │
│ Attempts: 1 of 3            │                                      │
│                              │                                      │
│ [✅ Approve] [❌ Reject]     │                                      │
│ [🔄 Refine with feedback]   │                                      │
└─────────────────────────────┴──────────────────────────────────────┘
```

### Page 5: Production Monitor

**URL:** `/project/{id}/production`

Real-time view of all active production:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ACTIVE: Topic #2 — The Perfect 3-Card Wallet                        │
│ Stage: Audio Generation (TTS)                                        │
│ Progress: ████████████░░░░░░░░ 98/172 scenes                       │
│ Elapsed: 12 min 34 sec | Est. remaining: 6 min                     │
│ Current cost: $0.75 (script) + $0.18 (TTS so far)                  │
│                                                                      │
│ Scene-by-Scene: ●●●●●●●●●●●●●●●●●●●●●●●●●●●●○○○○○○○○○○○○○○○○...  │
│ (● = complete, ○ = pending, 🔴 = failed)                            │
└─────────────────────────────────────────────────────────────────────┘

QUEUE:
┌─────────────┬──────────────────┬────────────┐
│ #3 CSR vs CSP| Waiting (script  | Next up    │
│ #4 Points   | Waiting          | Queued     │
│ #5 Q4 Play  | Waiting          | Queued     │
└─────────────┴──────────────────┴────────────┘
```

Powered by **Supabase Realtime** — no polling. The dashboard subscribes to changes on the `scenes` table and `topics` table. Every time n8n writes a scene completion, the dashboard updates instantly.

### Page 6: Analytics & Revenue

**URL:** `/project/{id}/analytics`

Same as current Agent.md Section 13 spec — views, watch hours, CTR, revenue, CPM. But now:
- Filterable by project (niche)
- Comparison across niches ("credit cards avg CPM: $34" vs "stoic philosophy avg CPM: $18")
- Trend charts per project

### Page 7: Settings

**URL:** `/project/{id}/settings`

Per-project configuration:
- Script approach toggle (3-pass vs single-call)
- Image/video model selection
- Target word count / scene count
- YouTube channel ID and playlist IDs
- Google Drive folder configuration
- Prompt editor (view/edit all dynamic prompts for this niche)

---

## 6. SUPABASE REALTIME — HOW THE DASHBOARD STAYS LIVE

```javascript
// In dashboard app.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://supabase.operscale.cloud',
  'your-anon-key'
);

// Subscribe to scene completions for active topic
const subscription = supabase
  .channel('scenes-progress')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'scenes', filter: `topic_id=eq.${activeTopicId}` },
    (payload) => {
      // A scene was updated (audio generated, image generated, etc.)
      updateSceneIndicator(payload.new.scene_number, payload.new.audio_status);
      updateProgressBar();
    }
  )
  .subscribe();

// Subscribe to topic status changes
const topicSub = supabase
  .channel('topic-status')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'topics', filter: `project_id=eq.${projectId}` },
    (payload) => {
      updateTopicRow(payload.new.id, payload.new.status);
      if (payload.new.status === 'review') showReviewNotification(payload.new);
    }
  )
  .subscribe();
```

No polling. No 15-second refresh interval. The dashboard updates the instant Supabase receives a write from n8n.

---

## 7. n8n ↔ SUPABASE INTEGRATION

All workflows replace Google Sheets nodes with HTTP Request nodes hitting Supabase's REST API:

```javascript
// READ a topic
GET https://supabase.operscale.cloud/rest/v1/topics?id=eq.{{topic_id}}&select=*
Headers:
  apikey: {{SUPABASE_ANON_KEY}}
  Authorization: Bearer {{SUPABASE_ANON_KEY}}

// UPDATE a scene
PATCH https://supabase.operscale.cloud/rest/v1/scenes?id=eq.{{scene_id}}
Headers:
  apikey: {{SUPABASE_ANON_KEY}}
  Authorization: Bearer {{SUPABASE_ANON_KEY}}
  Content-Type: application/json
  Prefer: return=minimal
Body:
{
  "audio_status": "uploaded",
  "audio_duration_ms": 8432,
  "audio_file_drive_id": "1abc..."
}

// INSERT a production log entry
POST https://supabase.operscale.cloud/rest/v1/production_log
Headers: (same)
Body:
{
  "project_id": "...",
  "topic_id": "...",
  "stage": "audio",
  "action": "completed",
  "details": { "scene_id": "scene_047", "duration_ms": 8432 }
}
```

**n8n has a native Supabase node** (community node) — but HTTP Request nodes give more control and don't depend on community node maintenance.

---

## 8. WHAT CHANGES FROM CURRENT AGENT.MD

| Component | Current (Agent.md) | New (Platform) |
|-----------|-------------------|----------------|
| Database | Google Sheets (2 tabs) | Supabase PostgreSQL (8+ tables) |
| Scene manifest | Google Doc (JSON) | `scenes` table (one row per scene) |
| Script storage | Google Doc | `topics.script_json` column (JSONB) |
| Progress tracking | String in Sheet ("done:47/172") | Individual scene rows with status columns |
| Niche | Hardcoded (credit cards) | Dynamic — user inputs any niche |
| System prompt | Hardcoded in Agent.md | AI-generated per niche, stored in `prompt_configs` |
| Topic generation | Pre-loaded from Excel | AI-generated with web search + approval gate |
| Script review | None (auto-continues) | Dashboard approval gate with inline editing |
| Video review | None (auto-publishes) | Dashboard preview + approval gate |
| Real-time updates | Polling (15s interval) | Supabase Realtime subscriptions (instant) |
| Multi-project | Single project | Unlimited niches, each a separate project |
| Dashboard | Not built yet | Full SPA with 7 pages |

---

## 9. IMPLEMENTATION ORDER

### Sprint 1: Foundation (Supabase + Core Dashboard)
1. Create Supabase schema (all tables from Section 3)
2. Build dashboard skeleton (Projects Home + Project Dashboard)
3. Build n8n webhook API layer (WF_WEBHOOK)
4. Wire up Supabase Realtime to dashboard

### Sprint 2: Niche Research + Topic Generation
5. Build Phase A workflows (project creation, niche research with web search, dynamic prompt generation)
6. Build Phase B workflows (topic + avatar generation)
7. Build Topic Review page in dashboard (approve/reject/refine)

### Sprint 3: Script Generation + Review
8. Build 3-pass script generation workflow (with dynamic prompts from `prompt_configs`)
9. Build script evaluation workflow (7-dimension scoring)
10. Build Script Review page in dashboard

### Sprint 4: Production Pipeline (migrate existing)
11. Migrate WF03–WF09 from Google Sheets to Supabase
12. Update all scene tracking to write to `scenes` table
13. Build Production Monitor page in dashboard

### Sprint 5: Video Review + YouTube
14. Build video preview page in dashboard
15. Build YouTube upload with approval gate
16. Build Analytics page

### Sprint 6: Polish
17. Cost tracker page
18. Settings page (per-project config)
19. Supervisor agent (updated for Supabase)
20. Mobile responsiveness

---

## 10. COST ESTIMATE

| Component | Per Video | Per 25 Videos | Monthly (30 videos) |
|-----------|-----------|---------------|---------------------|
| Niche research (one-time per project) | — | ~$0.30 | — |
| Topic generation (one-time per project) | — | ~$0.20 | — |
| Dynamic prompt generation (one-time) | — | ~$0.10 | — |
| Script generation (3-pass) | $0.45–$1.35 | $11.25–$33.75 | $13.50–$40.50 |
| Script evaluation | $0.05–$0.15 | $1.25–$3.75 | $1.50–$4.50 |
| Visual type assignment | $0.03 | $0.75 | $0.90 |
| TTS audio | $0.30 | $7.50 | $9.00 |
| Seedream 4.5 images | $3.20 | $80.00 | $96.00 |
| Kling I2V clips | $3.13 | $78.25 | $93.75 |
| Kling T2V clips | $9.00 | $225.00 | $270.00 |
| Supervisor agent | — | — | ~$14.40 |
| Web search (topic research) | — | ~$0.50 | — |
| Supabase | — | — | $0 (self-hosted) |
| **TOTAL** | **~$16.50** | **~$405 + $1.10 setup** | **~$543** |

---

## 11. OPEN QUESTIONS FOR YOU

Before I modify the files:

1. **Dashboard tech stack:** Vanilla HTML/JS (simpler, faster to build) or React (more scalable for multi-page app with state management)? Given 7 pages with real-time updates, React might be worth it.

2. **Supabase credentials:** Do you have the Supabase URL + anon key + service_role key ready? I need these for the n8n integration spec.

3. **The refinement flow:** When you reject a topic and provide instructions, should Claude refine JUST that one topic, or should it consider the other 24 topics to avoid overlap?

4. **The 3-pass approach + scoring:** Should each PASS be independently scored, or only the final combined output? (Current plan: evaluate only the combined output after all 3 passes.)
