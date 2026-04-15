# Kinetic Typography Engine — Agent.md Merge Sections
## Target: VisionGridAI_Platform_Agent.md
## Adds "Kinetic Typography" as second production style alongside "AI Cinematic"

---

## >>>> MERGE INTO: IMMUTABLE rules (append) <<<<

- **Two production styles exist: "AI Cinematic" and "Kinetic Typography."** Selected per project in CreateProjectModal. Stored in `projects.production_style`. All downstream workflows, script prompts, and dashboard views branch on this field. The styles have COMPLETELY separate script schemas, rendering pipelines, and production monitors.
- **Kinetic Typography uses NO AI images.** All visuals are programmatically rendered frames (Python + Pillow + pycairo). 30fps JPEG frames assembled via FFmpeg. Cost per scene: $0.00.
- **Kinetic Typography runs as a standalone Python service** on VPS port 3200. n8n triggers it via webhook. The service writes progress directly to Supabase so the dashboard gets real-time updates.
- **Kinetic long-form (2hr) uses chunked script generation.** Chapter outline first (20-24 chapters × 5min), then per-chapter scene generation (18-22 scenes per chapter), then stitched into master script. Render scene-by-scene, delete frames after each scene's FFmpeg pass.
- **Kinetic Typography bypasses Remotion scene classification entirely.** When `production_style = 'kinetic_typography'`, WF_SCENE_CLASSIFY is skipped. The kinetic engine handles ALL visual types (stats, comparisons, lists, charts) natively through its scene types.
- **Frame output MUST be JPEG quality=95.** PNG frames (6MB each) cause FFmpeg OOM at ~400 frames. JPEG (~212KB each) scales to 216,000 frames without issues.

---

## >>>> MERGE INTO: Supabase Schema section <<<<

### Migration: 006_kinetic_typography.sql

```sql
-- Production style per project
ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_style TEXT DEFAULT 'ai_cinematic'
  CHECK (production_style IN ('ai_cinematic', 'kinetic_typography'));

-- Kinetic-specific scene schema (separate from AI Cinematic scenes table)
CREATE TABLE kinetic_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  scene_type TEXT NOT NULL,  -- hook | comparison | list | statement | stats | quote | transition | cta | chapter_title
  duration_seconds NUMERIC(5,1) NOT NULL,
  chapter_number INTEGER,
  chapter_title TEXT,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each element: { text, style, animation, delay_ms, duration_ms, color_override, font_size_override }
  -- style: label | headline | accent | body | stat_value | stat_label | card_index | card_title | card_body | quote_text | quote_author | divider
  -- animation: fade_in | slide_up | typewriter | word_by_word | pop | slide_in_left | counter | line_draw
  render_status TEXT DEFAULT 'pending',  -- pending | rendering | rendered | failed
  frames_total INTEGER,
  frames_rendered INTEGER DEFAULT 0,
  audio_status TEXT DEFAULT 'pending',
  audio_file_url TEXT,
  audio_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, scene_number)
);

CREATE INDEX idx_kinetic_scenes_topic ON kinetic_scenes(topic_id);
CREATE INDEX idx_kinetic_scenes_status ON kinetic_scenes(topic_id, render_status);
ALTER TABLE kinetic_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read kinetic_scenes" ON kinetic_scenes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write kinetic_scenes" ON kinetic_scenes FOR ALL USING (true);

-- Kinetic render job tracking
CREATE TABLE kinetic_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued',  -- queued | generating_script | rendering_frames | generating_tts | mixing_audio | assembling | uploading | complete | failed
  current_scene INTEGER,
  total_scenes INTEGER,
  total_frames INTEGER,
  frames_rendered INTEGER DEFAULT 0,
  render_start TIMESTAMPTZ,
  render_end TIMESTAMPTZ,
  output_file_url TEXT,
  output_drive_id TEXT,
  error_message TEXT,
  performance_log JSONB DEFAULT '{}'::jsonb,  -- { avg_frame_ms, total_render_s, file_size_mb }
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kinetic_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read kinetic_jobs" ON kinetic_jobs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write kinetic_jobs" ON kinetic_jobs FOR ALL USING (true);
```

---

## >>>> MERGE INTO: After Architecture section, as new subsection <<<<

### Kinetic Typography Engine — Production System

#### Architecture

```
n8n (webhook trigger)
    │
    ▼ POST /generate
┌──────────────────────────────────┐
│  Kinetic Typography Service       │  ← Python service on VPS port 3200
│  (standalone, writes to Supabase) │
│                                   │
│  1. Script Generator              │  ← Claude API (chunked for long-form)
│  2. Frame Renderer                │  ← Pillow + pycairo (JPEG q=95)
│  3. Voice Generator               │  ← Google Cloud TTS per-element
│  4. Audio Mixer                   │  ← Background music + ducking
│  5. Video Assembler               │  ← FFmpeg frames + audio → MP4
│  6. Drive Uploader                │  ← Google Drive API v3
└──────────────────────────────────┘
    │
    ▼ writes progress to Supabase
Dashboard (Realtime subscription on kinetic_jobs + kinetic_scenes)
```

#### Service API

```
POST /generate
Body: {
  topic_id: uuid,
  project_id: uuid,
  keyword: string,          // from topic title
  niche: string,            // from project
  duration_seconds: integer, // 300 for 5min, 7200 for 2hr
  style_dna: string,        // project style DNA (adapted for kinetic palette)
  supabase_url: string,
  supabase_key: string,
  drive_folder_id: string
}
Response: { job_id: uuid, status: "queued" }

GET /status/{job_id}
Response: {
  job_id: uuid,
  status: "rendering_frames",
  current_scene: 12,
  total_scenes: 22,
  frames_rendered: 2400,
  total_frames: 9000,
  estimated_remaining_seconds: 180
}

POST /cancel/{job_id}
Response: { cancelled: true }

GET /health
Response: { status: "ok", active_jobs: 0 }
```

#### Visual Style Reference

```python
COLORS = {
    'bg_dark':       (10, 10, 26),       # #0a0a1a
    'bg_purple':     (45, 27, 78),       # #2d1b4e
    'bg_teal':       (13, 59, 59),       # #0d3b3b
    'text_white':    (255, 255, 255),    # #ffffff
    'text_gray':     (136, 136, 136),    # #888888
    'text_light':    (170, 170, 170),    # #aaaaaa
    'accent_purple': (155, 89, 182),     # #9B59B6
    'accent_cyan':   (0, 188, 212),      # #00BCD4
    'accent_orange': (255, 152, 0),      # #FF9800
    'card_bg':       (20, 20, 40, 200),  # Semi-transparent
    'card_border':   (100, 100, 140, 100),
}
```

- Background: deep navy/black with purple and teal gradient glow zones
- Grid overlay: faint geometric lines at ~15% opacity
- Particles: small glowing dots (white, purple, cyan) with slow drift
- Typography hierarchy: section labels (small caps gray), headlines (bold white 120-160px with glow), accent (purple/cyan), body (light gray)
- Animations: fade-in, slide-up, typewriter, word-by-word, pop, counter
- Dividers: horizontal gradient lines (purple → cyan → white)
- Cards: rounded rectangles with border glow, colored indices (01=purple, 02=teal, 03=orange)

#### Scene Types (target 18-22 scenes per 5-minute chapter)

| Type | Duration | Description |
|------|----------|-------------|
| `hook` | 15s | Bold opening statement, attention grab |
| `comparison` | 20s | Old vs New / Before vs After with divider |
| `list` | 25s | Numbered cards (3-5 items) with sequential reveal |
| `statement` | 15s | Single powerful statement with emphasis |
| `stats` | 20s | Data points with animated counters |
| `quote` | 15s | Attributed quote with subtle formatting |
| `transition` | 5s | Brief visual break between sections |
| `chapter_title` | 8s | Chapter number and title (long-form only) |
| `cta` | 15s | Call to action closing |

#### Animation Types

| Animation | Properties | Duration | Easing |
|-----------|-----------|----------|--------|
| `fade_in` | opacity 0→1 | 500-800ms | ease_out_cubic |
| `slide_up` | y_offset 50→0 + opacity | 600-1000ms | ease_out_cubic |
| `typewriter` | char_reveal 0→len(text) | 50ms/char | linear |
| `word_by_word` | word_index 0→count | 200ms/word | ease_out_quad |
| `pop` | scale 0.5→1.0 + opacity | 400ms | ease_out_back |
| `slide_in_left` | x_offset -100→0 + opacity | 700ms | ease_out_cubic |
| `counter` | number 0→target | 1500ms | ease_out_quad |
| `line_draw` | width 0→target | 800ms | ease_in_out |

Only `typewriter` and `word_by_word` require per-frame text rendering. All others use pre-rendered cached layers with opacity/position interpolation.

#### Rendering Optimization

Pre-render static layers ONCE per scene, composite per-frame:
- `render_text_layer()` → reusable RGBA text image
- `render_glow_layer()` → Gaussian blur runs ONCE (not per frame)
- `render_divider_layer()` → gradient divider image
- `composite_with_opacity()` → fast numpy alpha blending per frame

Impact: avg frame time ~99ms → ~42ms. List scenes: 168ms → 31ms (5.6x).

**JPEG output mandatory:** PNG frames are ~6MB each. At 9,000 frames = 54GB temp. JPEG at quality=95 = ~212KB each = 1.9GB. At 216,000 frames (2hr): JPEG = 45GB (manageable), PNG = 1.3TB (impossible).

#### Long-Form Chunked Script Generation

For videos > 15 minutes, script generation is chunked:

**Step 1: Chapter Outline Prompt**
```
You are a kinetic typography content strategist. Given a topic and target duration,
create a chapter outline for a long-form video.

TOPIC: {topic}
NICHE: {niche}
TOTAL DURATION: {duration_seconds} seconds
TARGET CHAPTERS: {ceil(duration_seconds / 300)} chapters of ~5 minutes each

OUTPUT FORMAT (JSON):
{
  "title": "Video Title",
  "chapters": [
    {
      "chapter_number": 1,
      "chapter_title": "Chapter Name",
      "duration_seconds": 300,
      "focus": "What this chapter covers — one sentence",
      "key_points": ["point 1", "point 2", "point 3"],
      "emotional_arc": "hook → build → climax → resolve"
    }
  ]
}

RULES:
- Total duration across all chapters MUST equal EXACTLY {duration_seconds}
- Each chapter is 240-360 seconds (4-6 minutes)
- Chapter titles are short and punchy (max 5 words)
- Chapters progress logically — narrative arc across the full video
- First chapter hooks hard, last chapter has strong CTA
- Verify sum of all chapter durations equals {duration_seconds} before responding
```

**Step 2: Per-Chapter Scene Generation Prompt**
```
You are a kinetic typography scriptwriter. Generate scene-by-scene script for
ONE chapter of a larger video.

TOPIC: {topic}
NICHE: {niche}
CHAPTER: {chapter_number} of {total_chapters} — "{chapter_title}"
CHAPTER FOCUS: {focus}
KEY POINTS: {key_points}
CHAPTER DURATION: EXACTLY {chapter_duration_seconds} seconds
PREVIOUS CHAPTER ENDED WITH: {last_scene_summary_or_null}

OUTPUT FORMAT (JSON):
{
  "chapter_number": {chapter_number},
  "chapter_title": "{chapter_title}",
  "scenes": [
    {
      "id": 1,
      "type": "chapter_title",
      "duration_seconds": 8,
      "elements": [
        { "text": "CHAPTER {N}", "style": "label", "animation": "fade_in", "delay_ms": 0, "duration_ms": 800 },
        { "text": "{chapter_title}", "style": "headline", "animation": "slide_up", "delay_ms": 800, "duration_ms": 1000 }
      ]
    },
    {
      "id": 2,
      "type": "hook",
      "duration_seconds": 15,
      "elements": [
        { "text": "IN 2026,", "style": "label", "animation": "fade_in", "delay_ms": 0, "duration_ms": 600 },
        { "text": "EVERYTHING CHANGED", "style": "headline", "animation": "slide_up", "delay_ms": 600, "duration_ms": 1000 },
        { "text": "And nobody saw it coming.", "style": "body", "animation": "fade_in", "delay_ms": 2000, "duration_ms": 800 }
      ]
    }
  ]
}

RULES:
- Sum of ALL scene duration_seconds MUST equal EXACTLY {chapter_duration_seconds}
- Use 18-22 scenes per 5-minute chapter
- Scene types: hook, comparison, list, statement, stats, quote, transition, chapter_title, cta
- Keep text SHORT and PUNCHY — max 6 words per headline, 12 words per body line
- Text elements include: text, style, animation, delay_ms, duration_ms
- Styles: label | headline | accent | body | stat_value | stat_label | card_index | card_title | card_body | quote_text | quote_author | divider
- Animations: fade_in | slide_up | typewriter | word_by_word | pop | slide_in_left | counter | line_draw
- If this is the FIRST chapter, start with a strong hook scene
- If this is the LAST chapter, end with a CTA scene
- Otherwise, start with a chapter_title scene and end with a transition
- Ensure continuity with the previous chapter's ending
- Verify duration sum before responding
```

**Step 3: Script Stitching**
After all chapters are generated:
1. Concatenate chapter scene arrays into one master `scenes` array
2. Re-number scene IDs sequentially (1, 2, 3... N)
3. Validate total duration = target
4. Store master script in Supabase
5. Insert individual scenes into `kinetic_scenes` table

#### Python Module Specifications

The kinetic service contains 12 Python modules. All source files are built by Claude Code during Phase execution.

**Module 1: config.py**
- All constants: COLORS dict, VIDEO_WIDTH (1920), VIDEO_HEIGHT (1080), FPS (30), JPEG_QUALITY (95)
- TTS config: voice_name, speaking_rate, max_rate, sample_rate
- Duck config: duck_db (-7), fade_ms (50), rms_window_ms (20)
- Font paths, output dirs, temp dirs
- API key loading via python-dotenv (check CWD + parent for .env)
- Supabase client initialization

**Module 2: animation_engine.py**
- Easing functions: ease_out_cubic, ease_in_out_quad, ease_out_back, ease_out_elastic
- `interpolate(start, end, progress, easing_fn)` → float
- `get_animation_progress(elapsed_ms, delay_ms, duration_ms, easing)` → float (0-1)

**Module 3: background.py**
- `render_background(width, height)` → PIL Image (dark gradient with purple/teal glow zones)
- `render_grid_overlay(width, height, opacity=0.15)` → PIL Image (geometric grid lines)
- `generate_particles(count=50)` → list[Particle] (position, velocity, color, size)
- `update_particles(particles, dt)` → mutates positions with drift + bounce
- `render_particles(image, particles)` → composites particles onto image

**Module 4: typography.py**
- `measure_text(text, font_face, font_size)` → (width, height) via pycairo
- `render_text_layer(text, font_face, font_size, color, width, height)` → PIL Image (cached RGBA)
- `render_glow_layer(text_layer, blur_radius, glow_color)` → PIL Image (Gaussian blur ONCE)
- `render_divider_layer(width, height, colors)` → PIL Image (gradient line)
- `composite_with_opacity(base, layer, position, opacity)` → PIL Image (numpy alpha blend)
- Style presets: LABEL (small caps, gray, 24px), HEADLINE (bold white, 120-160px), ACCENT (purple/cyan, bold), BODY (light gray, 36px), STAT_VALUE (huge white, 200px), STAT_LABEL (gray, 28px)

**Module 5: cards.py**
- `render_card(index, title, body, width, height, accent_color)` → PIL Image
- Card has: rounded rectangle bg, subtle border glow, colored index number, title, body text
- Index colors: 1=purple, 2=teal, 3=orange, 4=pink, 5=cyan

**Module 6: frame_renderer.py**
- `render_scene(scene, output_dir, start_frame, particles)` → frame_count
- Orchestrates: background copy → particle update → text/card composite → JPEG save
- Pre-renders static layers at scene start, composites per-frame
- For typewriter/word_by_word: per-frame text rendering (only these two animations)
- Handles all 9 scene types with layout logic per type
- Writes JPEG frames: `frame_{global_frame:06d}.jpg`

**Module 7: script_generator.py**
- `generate_script(keyword, niche, duration_seconds)` → dict
- For ≤ 900s: single Claude API call with direct scene prompt
- For > 900s: chunked approach (outline → per-chapter → stitch)
- Duration validation: reject if abs(actual - target) > 10s
- Retry with exponential backoff (max 3 attempts)
- Writes script JSON to Supabase

**Module 8: voice_generator.py**
- `generate_voice(elements, output_dir)` → list[audio_clip_path]
- Text preprocessing: ALL_CAPS → title case (preserve acronyms), symbol expansion ($, %, M, B, T)
- Skip card index numbers (single-digit visual-only elements)
- Auto-increase speaking_rate (up to 1.5x) when text exceeds duration_ms window
- Google Cloud TTS (Journey-D voice, LINEAR16 48kHz)
- Per-element clips concatenated with silence padding matching delay_ms timing

**Module 9: audio_generator.py**
- Uses the existing music library system (same as AI Cinematic)
- `select_music(mood_tags, duration_seconds)` → music file path
- `mix_final_audio(narration_path, music_path, output_path)` → mixed audio
- Ducking: detect voice regions via RMS in 20ms windows, duck music by -7dB during voice, smooth with 50ms rolling average
- Export as WAV 48kHz stereo

**Module 10: video_assembler.py**
- `assemble_video(frames_dir, audio_path, output_path)` → output_path
- FFmpeg: `-framerate 30 -i frame_%06d.jpg -i mixed_audio.wav -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart`
- For long-form: assemble per-chapter (scene-by-scene within chapter), then concat chapters
- `_find_ffmpeg()` with imageio-ffmpeg fallback
- `-threads 1 -filter_threads 1` on <8GB RAM systems
- Verify sync with ffprobe (skip gracefully if unavailable)

**Module 11: drive_uploader.py**
- Same as AI Cinematic pipeline (existing upload logic)
- Service account auth, resumable upload, shareable link

**Module 12: main.py**
- Flask/FastAPI service with /generate, /status/{job_id}, /cancel/{job_id}, /health endpoints
- Runs generation in background thread/process
- Writes progress to Supabase kinetic_jobs + kinetic_scenes tables in real-time
- Scene-by-scene rendering: render scene → FFmpeg scene clip → delete frames → next scene
- Memory management: gc.collect() between scenes, batch frame rendering

#### TTS Preprocessing Rules

```python
ACRONYMS = {"AI", "API", "ML", "SaaS", "CEO", "CTO", "AWS", "GCP",
            "ROI", "KPI", "CRM", "ERP", "NLP", "LLM", "GPT", "IOT"}

def preprocess_for_tts(text):
    # Skip card indices (visual only)
    if text.strip().isdigit() and len(text.strip()) <= 2:
        return None
    # Expand symbols BEFORE case conversion
    text = re.sub(r'\$(\d+\.?\d*)[Tt]', r'\1 trillion dollars', text)
    text = re.sub(r'\$(\d+\.?\d*)[Bb]', r'\1 billion dollars', text)
    text = re.sub(r'\$(\d+\.?\d*)[Mm]', r'\1 million dollars', text)
    text = re.sub(r'\$(\d+\.?\d*)', r'\1 dollars', text)
    text = re.sub(r'(\d+\.?\d*)%', r'\1 percent', text)
    # ALL_CAPS to title case (preserve acronyms)
    words = text.split()
    result = []
    for word in words:
        clean = word.strip(".,!?;:")
        if clean.upper() in ACRONYMS:
            result.append(word)
        elif clean.isupper() and len(clean) > 1:
            result.append(word[0] + word[1:].lower())
        else:
            result.append(word)
    return " ".join(result)
```

#### Performance Budget (2-hour video)

| Component | Per Frame | Per Scene (450 frames, 15s) | Per Chapter (5min) | Full 2hr |
|-----------|-----------|---------------------------|-------------------|----------|
| Background copy | ~1ms | ~0.45s | ~2.7s | ~65s |
| Particle render | ~3ms | ~1.35s | ~8.1s | ~194s |
| Text composite | ~5ms | ~2.25s | ~13.5s | ~324s |
| JPEG save | ~5ms | ~2.25s | ~13.5s | ~324s |
| **Frame total** | **~14ms** | **~6.3s** | **~37.8s** | **~907s (~15min)** |

Actual avg: ~42ms/frame due to scene variation. Total render: ~2.5 hours for 2hr video.
Disk: 216,000 JPEG frames × 212KB avg = ~45GB (scene-by-scene rendering deletes after each scene: max ~2GB active).

---

## >>>> MERGE INTO: Dashboard section <<<<

### Modified: CreateProjectModal.jsx

Add production style dropdown between niche input and description:

```
┌──────────────────────────────────────────┐
│ New Project                               │
│                                           │
│ ┌── From Research (optional) ──────────┐ │
│ │ [Category filter ▾] [Topic ▾]        │ │
│ └──────────────────────────────────────┘ │
│                                           │
│ Niche Name *     [________________]       │
│ Production Style [AI Cinematic      ▾]    │
│                  [AI Cinematic      ]     │
│                  [Kinetic Typography ]     │
│ Description      [________________]       │
│ Target Videos    [25]                     │
│                                           │
│              [Cancel] [Start Research]    │
└──────────────────────────────────────────┘
```

When "Kinetic Typography" is selected:
- Description field changes placeholder to "Brief description for kinetic typography style..."
- A note appears: "Videos will use animated text graphics instead of AI-generated images. Best for data-driven, explainer, and educational content."

### New Component: KineticScriptReview

Different from AI Cinematic ScriptReview. Shows element-level timeline instead of scene-level narration:

```
┌──────────────────────────────────────────────────────────────┐
│ Script Review — Kinetic Typography                            │
│ Topic: "AI Automation in 2026" | 24 chapters | ~2 hours      │
│                                                               │
│ ┌── Chapter 1: The AI Revolution (5:00) ───────────────────┐│
│ │ Scene 1 [chapter_title] 8s                                ││
│ │   ├─ "CHAPTER 1" label, fade_in 0ms                       ││
│ │   └─ "The AI Revolution" headline, slide_up 800ms         ││
│ │                                                            ││
│ │ Scene 2 [hook] 15s                                        ││
│ │   ├─ "IN 2026," label, fade_in 0ms                        ││
│ │   ├─ "EVERYTHING CHANGED" headline, slide_up 600ms        ││
│ │   └─ "And nobody saw it coming." body, fade_in 2000ms     ││
│ │                                                            ││
│ │ Scene 3 [stats] 20s                                       ││
│ │   ├─ "THE NUMBERS" label, fade_in 0ms                     ││
│ │   ├─ "$15.7T" stat_value, counter 500ms                   ││
│ │   └─ "Global AI Market by 2030" stat_label, fade_in 2000ms││
│ └────────────────────────────────────────────────────────────┘│
│                                                               │
│        [Reject] [Refine] [Approve Script →]                  │
└──────────────────────────────────────────────────────────────┘
```

Components: `components/script/KineticScriptReview.jsx`, `components/script/KineticSceneCard.jsx`, `components/script/KineticElementRow.jsx`

### New Component: KineticProductionMonitor

Different pipeline stages from AI Cinematic:

```
Pipeline Stages:
[Script ✅] → [Frame Rendering 🔵 34%] → [TTS ⬜] → [Audio Mix ⬜] → [Assembly ⬜] → [Upload ⬜]

Current: Rendering Chapter 3, Scene 12 of 22
Frames: 4,800 / 54,000 (8.9%)
Est. remaining: 1h 45min

┌── Scene Progress ──────────────────────────────┐
│ Ch.1 ████████████████████████████ 100%          │
│ Ch.2 ████████████████████████████ 100%          │
│ Ch.3 ████████████░░░░░░░░░░░░░░░  42%          │
│ Ch.4 ░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%         │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

Components: `components/production/KineticProductionMonitor.jsx`, subscribes to Supabase Realtime on `kinetic_jobs` + `kinetic_scenes`.

---

## >>>> MERGE INTO: New Workflows table <<<<

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| WF_KINETIC_TRIGGER | After script approval (kinetic projects) | POST to kinetic service /generate endpoint |
| WF_KINETIC_POLL | Cron (every 30s during active job) | GET /status/{job_id}, update kinetic_jobs in Supabase |
| WF_KINETIC_COMPLETE | Webhook from kinetic service on completion | Trigger Drive upload, update topic status, notify dashboard |

---

## >>>> MERGE INTO: Pipeline Phases / Cost table <<<<

### Kinetic Typography Cost Per Video

| Item | 5-min video | 2-hour video |
|------|------------|-------------|
| Script generation (Claude Sonnet) | ~$0.05 | ~$1.20 (chunked) |
| Frame rendering (Python) | $0.00 | $0.00 |
| TTS (Google Cloud) | ~$0.10 | ~$0.30 |
| Background music (from library) | $0.00 | $0.00 |
| Audio mixing | $0.00 | $0.00 |
| FFmpeg assembly | $0.00 | $0.00 |
| **Total** | **~$0.15** | **~$1.50** |

*Compare: AI Cinematic = ~$6.17/video (2hr). Kinetic = ~$1.50/video (2hr). 76% cheaper.*

---

## >>>> MERGE INTO: Error Handling table <<<<

| Failure | Response | Recovery |
|---------|----------|----------|
| Kinetic service down | n8n poll returns connection error | Alert dashboard, retry in 5 min |
| Frame render OOM | Reduce batch size, use gc.collect() | Re-render failed scene with smaller batch |
| TTS ALL_CAPS mispronunciation | Preprocess to title case | Already handled by preprocess_for_tts() |
| Script duration mismatch (>10s off) | Reject, regenerate with stricter prompt | Max 3 retries |
| JPEG temp disk full (45GB for 2hr) | Scene-by-scene render + delete | Max ~2GB active at any time |
| FFmpeg assembly crash on long-form | Assemble per-chapter, then concat | Smaller FFmpeg jobs |
| Long-form script chunking loses coherence | Previous chapter context passed to next | last_scene_summary ensures continuity |

---

## >>>> MERGE INTO: Self-Annealing section <<<<

### Kinetic Typography Self-Annealing

1. **Frame quality:** If rendered frames look different from reference aesthetic, update COLORS and style presets in config.py.
2. **Animation smoothness:** If animations feel jerky, check easing functions. Linear = always robotic. Cubic ease-out is default.
3. **TTS pronunciation:** If words are mispronounced, add to ACRONYMS list or expand symbol patterns.
4. **Script coherence (long-form):** If chapters feel disconnected, increase context passed between chapter generation calls.
5. **Render performance:** Track avg_frame_ms per job. If degrading, check for memory leaks in particle system or cached layer growth.
