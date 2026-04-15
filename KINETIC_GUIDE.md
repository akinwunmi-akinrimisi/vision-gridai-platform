# Kinetic Typography — Build Guide (Phase 8)
## Appends to existing GUIDE.md as Phase 8

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

## Quick Reference — Phase 8

| Sub-Phase | Prompts | Agents | gstack |
|-----------|---------|--------|--------|
| 8.1 Schema + scaffold | 8.1.1, 8.1.2 | `@devops-engineer` `@backend-architect` | `/careful` → `/qa` |
| 8.2 Rendering engine | 8.2.1, 8.2.2 | `@frontend-developer` `@backend-architect` | `/careful` → `/qa` |
| 8.3 Script + voice + audio | 8.3.1, 8.3.2 | `@prompt-engineer` `@api-developer` | `/careful` → `/qa` |
| 8.4 Assembly + upload | 8.4.1 | `@backend-architect` | `/qa` |
| 8.5 n8n + Dashboard | 8.5.1–8.5.5 | `@api-developer` `@frontend-developer` | frontend-design → `/qa` → `/review` |
| 8.6 Testing | 8.6.1 | `@qa-engineer` | `/qa` → `/review` → `/freeze` |

**Estimated time:** 10-14 hours across sessions.
**Dependencies:** Phases 1-7 complete. Music library table populated (from Phase 3).
