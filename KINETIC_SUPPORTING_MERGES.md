# Kinetic Typography — CLAUDE.md Merge Sections

---

## >>>> ADD: Tech Stack <<<<

```
* **Kinetic Typography Service:** Python (FastAPI) on VPS port 3200. Programmatic frame rendering (Pillow + pycairo). No AI images. 30fps JPEG frames assembled via FFmpeg. Triggered by n8n webhook.
* **Production Style Selector:** Per-project choice: "AI Cinematic" or "Kinetic Typography" in CreateProjectModal.
```

## >>>> ADD: Critical rule <<<<

```
IMPORTANT: Two production styles — "AI Cinematic" and "Kinetic Typography." Selected per project via production_style field. AI Cinematic uses Fal.ai images + Remotion + Ken Burns + color grade. Kinetic Typography uses Python-rendered frames (Pillow + pycairo) with animated text, particles, and data graphics. No AI images. Kinetic runs as a standalone service on :3200, triggered by n8n. After script approval: AI Cinematic → scene classification → image gen. Kinetic → straight to frame rendering (skips classification entirely). Both use same TTS, music, Drive upload, YouTube publish, dashboard approval gates, analytics.
```

## >>>> ADD: Pipeline Quick Reference row <<<<

| Phase | What | Type | Cost (Kinetic 2hr) |
|-------|------|------|--------------------|
| K | Kinetic Typography rendering (all frames + assembly) | Deterministic | ~$1.50 total |

## >>>> ADD: Project Structure <<<<

```
├── kinetic-typo-engine/
│   ├── src/
│   │   ├── main.py              ← FastAPI service (port 3200)
│   │   ├── config.py            ← Constants, colors, TTS config
│   │   ├── animation_engine.py  ← Easing functions + interpolation
│   │   ├── background.py        ← Gradients, grid, particles
│   │   ├── typography.py        ← Text rendering, cached layers
│   │   ├── cards.py             ← Numbered card components
│   │   ├── frame_renderer.py    ← Scene-level frame renderer
│   │   ├── script_generator.py  ← Claude API (chunked for long-form)
│   │   ├── voice_generator.py   ← Google Cloud TTS + preprocessing
│   │   ├── audio_generator.py   ← Music selection + ducking
│   │   ├── video_assembler.py   ← FFmpeg assembly
│   │   └── drive_uploader.py    ← Google Drive upload
│   ├── fonts/
│   ├── tests/
│   ├── requirements.txt
│   └── kinetic-typo.service     ← systemd unit file
├── workflows/
│   ├── WF_KINETIC_TRIGGER.json
│   ├── WF_KINETIC_POLL.json
│   └── WF_KINETIC_COMPLETE.json
├── supabase/migrations/
│   └── 006_kinetic_typography.sql
├── dashboard/src/components/script/
│   ├── KineticScriptReview.jsx
│   ├── KineticSceneCard.jsx
│   └── KineticElementRow.jsx
├── dashboard/src/components/production/
│   └── KineticProductionMonitor.jsx
```

## >>>> ADD: Gotchas <<<<

- Kinetic service must be running on :3200 for kinetic projects to work. Check: `curl localhost:3200/health`
- production_style is per-project, not per-topic. All videos in a project use the same style.
- Kinetic bypasses scene classification AND Remotion entirely. No render_method field used.
- Long-form kinetic (2hr) generates ~216,000 JPEG frames. Scene-by-scene rendering keeps disk under 2GB active.
- JPEG quality=95 mandatory. PNG causes OOM at ~400 frames.
- TTS Journey-D voice does NOT support pitch parameter. Will throw INVALID_ARGUMENT.
- ALL_CAPS text must be preprocessed to title case before TTS (otherwise spells letter-by-letter).
- The kinetic Python service writes directly to Supabase (kinetic_jobs, kinetic_scenes). n8n polls for status changes.
- For chunked script generation (>15min), each chapter prompt receives the previous chapter's last scene as context for continuity.
- Frame render avg: 42ms. Full 2hr video: ~2.5 hours render time. This is expected and communicated in dashboard.

---

# Kinetic Typography — skills.md Merge Sections

## >>>> ADD: Skill category <<<<

### Kinetic Typography Production

| Skill | Purpose |
|-------|---------|
| Pillow Frame Rendering | Background gradients, particle compositing, JPEG output |
| pycairo Text Rendering | Anti-aliased text, kerning, variable weight, glow effects |
| Animation Easing | ease_out_cubic, ease_in_out_quad, ease_out_back, ease_out_elastic |
| Cached Layer Optimization | Pre-render static layers ONCE per scene, composite per frame |
| Procedural Particles | Generate, update, render floating particles with drift |
| Chunked Script Generation | Chapter outline + per-chapter scenes for long-form (>15min) |
| TTS Preprocessing | ALL_CAPS conversion, symbol expansion, card index skip |
| Scene-by-Scene Rendering | Render → assemble → delete frames per scene (memory management) |

## >>>> ADD: Pipeline Stage Matrix rows <<<<

| Pipeline Stage | Primary Skills | Secondary Skills |
|---------------|---------------|-----------------|
| **K1:** Kinetic Script Gen | Claude API, Chunked Prompts | Supabase |
| **K2:** Frame Rendering | Pillow, pycairo, Animation Easing, Cached Layers | Particles, JPEG |
| **K3:** Voice (TTS) | Google Cloud TTS, TTS Preprocessing | Audio sync |
| **K4:** Audio Mix | Music Library, Audio Ducking | pydub, numpy |
| **K5:** Assembly | FFmpeg, Scene-by-Scene Assembly | Disk management |
| **K6:** Upload | Google Drive API | Supabase status update |

## >>>> ADD: Cost Reference <<<<

### Kinetic Typography Cost

| Duration | Script | TTS | Music | Total |
|----------|--------|-----|-------|-------|
| 5 min | ~$0.05 | ~$0.10 | $0 | ~$0.15 |
| 15 min | ~$0.15 | ~$0.15 | $0 | ~$0.30 |
| 2 hours | ~$1.20 | ~$0.30 | $0 | ~$1.50 |

*Compare AI Cinematic 2hr: ~$6.17. Kinetic is 76% cheaper.*

---

# Kinetic Typography — skills.sh Merge Sections

## >>>> ADD: After Remotion checks (Section 6) <<<<

```bash
# ─── 7. KINETIC TYPOGRAPHY ENGINE CHECKS ─────────────────────
echo ""
echo "▶ Kinetic Typography Engine..."

# Check service
KINETIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/health 2>/dev/null || echo "000")
if [ "$KINETIC_STATUS" = "200" ]; then
    echo "  ✅ Kinetic service: running on :3200"
else
    echo "  ⚠️  Kinetic service not running (HTTP $KINETIC_STATUS)"
    echo "     Start: cd kinetic-typo-engine && python -m uvicorn src.main:app --port 3200"
fi

# Check Python deps
for pkg in pillow pycairo numpy scipy pydub anthropic fastapi uvicorn; do
    python3 -c "import ${pkg//-/_}" 2>/dev/null && \
        echo "  ✅ $pkg" || echo "  ⚠️  $pkg missing"
done

# Check kinetic tables
for table in kinetic_scenes kinetic_jobs; do
    RESP=$(curl -s -o /dev/null -w "%{http_code}" \
        "${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1" \
        -H "apikey: ${SUPABASE_ANON_KEY:-none}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-none}" 2>/dev/null || echo "000")
    [ "$RESP" = "200" ] && echo "  ✅ $table" || echo "  ❌ $table — run migration 006"
done

# Check production_style column on projects
STYLE_CHECK=$(curl -s "${SUPABASE_URL}/rest/v1/projects?select=production_style&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY:-none}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-none}" 2>/dev/null || echo "error")
echo "$STYLE_CHECK" | grep -q "production_style" && \
    echo "  ✅ production_style column on projects" || \
    echo "  ❌ production_style column missing — run migration 006"

# Check fonts directory
[ -d "kinetic-typo-engine/fonts" ] && echo "  ✅ Fonts directory exists" || echo "  ⚠️  No fonts directory"
```
