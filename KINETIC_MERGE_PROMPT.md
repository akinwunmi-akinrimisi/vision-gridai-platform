# Claude Code — Kinetic Typography Merge Prompt
## Paste this into Claude Code AFTER Phases 1-7 are complete. This is Phase 8.

---

```
I need to merge the Kinetic Typography Engine as a SECOND production style
into Vision GridAI. This adds "Kinetic Typography" alongside "AI Cinematic."

CONTEXT: Phases 1-7 are complete (cinematic pipeline, topic intelligence,
calendar, engagement, auto-pilot, Remotion hybrid). This is Phase 8.

Kinetic Typography = programmatic frame rendering (Python + Pillow + pycairo).
No AI images. Animated text, particles, gradients. Runs as standalone Python
service on port 3200. n8n triggers via webhook.

There are 3 files to read:
1. KINETIC_AGENT_MERGE.md → merges into VisionGridAI_Platform_Agent.md
2. KINETIC_SUPPORTING_MERGES.md → contains merges for CLAUDE.md + skills.md + skills.sh (3 in 1)
3. KINETIC_GUIDE.md → append as Phase 8 to existing GUIDE.md

## Step-by-step:

### Step 1: VisionGridAI_Platform_Agent.md
Read KINETIC_AGENT_MERGE.md. Apply each section:

a) IMMUTABLE rules: append 6 new bullets about dual production styles
b) Supabase Schema: add migration 006 (ALTER projects + CREATE kinetic_scenes + CREATE kinetic_jobs)
c) After Architecture: add "Kinetic Typography Engine" subsection with:
   - Architecture diagram (service on :3200)
   - Service API spec (4 endpoints)
   - Visual style reference (full COLORS dict)
   - Scene types table (9 types)
   - Animation types table (8 animations)
   - Rendering optimization (cached layers)
   - Long-form chunked script generation (2 prompts: chapter outline + per-chapter scenes)
   - All 12 Python module specifications (config through main)
   - TTS preprocessing code (preprocess_for_tts function)
   - Performance budget table (2-hour video math)
d) Dashboard: CreateProjectModal dropdown, KineticScriptReview wireframe, KineticProductionMonitor wireframe
e) Workflows: 3 new (WF_KINETIC_TRIGGER, WF_KINETIC_POLL, WF_KINETIC_COMPLETE)
f) Cost: kinetic pricing table ($0.15 for 5min, $1.50 for 2hr)
g) Error handling: 7 new rows
h) Self-annealing: 5 kinetic-specific rules

### Step 2: CLAUDE.md
Read the "CLAUDE.md Merge Sections" part of KINETIC_SUPPORTING_MERGES.md:
- ADD tech stack lines (Kinetic Typography Service, Production Style Selector)
- ADD critical rule about dual production styles
- ADD pipeline reference row
- ADD project structure (kinetic-typo-engine directory tree)
- ADD 10 gotchas

### Step 3: skills.md
Read the "skills.md Merge Sections" part of KINETIC_SUPPORTING_MERGES.md:
- ADD Kinetic Typography skill category (8 skills)
- ADD pipeline stage matrix rows (K1-K6)
- ADD cost reference table

### Step 4: skills.sh
Read the "skills.sh Merge Sections" part of KINETIC_SUPPORTING_MERGES.md:
- ADD Section 7: Kinetic Typography Engine checks
  (service health, Python deps, Supabase tables, production_style column, fonts)

### Step 5: GUIDE.md
Read KINETIC_GUIDE.md. APPEND as Phase 8 to existing GUIDE.md.
Do NOT replace Phases 1-7. Add Phase 8 after Phase 7.
Update the Quick Reference table at the bottom.

### Step 6: Create migration
Create supabase/migrations/006_kinetic_typography.sql from KINETIC_AGENT_MERGE.md SQL.

### Step 7: Create kinetic engine directory
```
mkdir -p kinetic-typo-engine/src kinetic-typo-engine/fonts kinetic-typo-engine/tests
```

Create placeholder files (0-byte) for all 12 Python modules:
  src/__init__.py, src/main.py, src/config.py, src/animation_engine.py,
  src/background.py, src/typography.py, src/cards.py, src/frame_renderer.py,
  src/script_generator.py, src/voice_generator.py, src/audio_generator.py,
  src/video_assembler.py, src/drive_uploader.py

Create requirements.txt with:
  fastapi, uvicorn, pillow, pycairo, numpy, scipy, pydub,
  google-cloud-texttospeech, google-auth, google-api-python-client,
  anthropic, python-dotenv, supabase, rich, pydantic, imageio-ffmpeg

### Step 8: Verify
grep -c "kinetic_typography" VisionGridAI_Platform_Agent.md
# Should be > 5

grep -c "production_style" VisionGridAI_Platform_Agent.md
# Should be > 3

grep -c "KineticScriptReview\|KineticProductionMonitor" VisionGridAI_Platform_Agent.md
# Should be > 0

grep "3200" VisionGridAI_Platform_Agent.md | head -3
# Should show the kinetic service port

grep "1.50" CLAUDE.md VisionGridAI_Platform_Agent.md
# Should find kinetic cost reference

ls supabase/migrations/006*
# Should exist

ls kinetic-typo-engine/src/
# Should show 13 Python files

wc -l GUIDE.md
# Should be > 1100 (was ~888, adding ~300 for Phase 8)

Use /careful for the Agent.md merge.
Use /review after all merges complete.
```
