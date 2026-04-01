# Remotion Hybrid Rendering — CLAUDE.md Merge Sections

---

## >>>> ADD: Tech Stack section <<<<

```
* **Remotion Hybrid Rendering:** Scenes AI-classified as fal_ai (photorealistic) or remotion (data/typographic). Remotion renders pixel-perfect stats, charts, comparisons, timelines. Both produce .png → same Ken Burns pipeline.
* **Remotion Render Service:** Node.js on VPS, renders via `npx remotion still`. Called by n8n for Remotion-classified scenes.
```

---

## >>>> ADD: Critical rules <<<<

```
IMPORTANT: Hybrid rendering — Fal.ai + Remotion. After script approval (Gate 2), ALL scenes are AI-classified as fal_ai or remotion via WF_SCENE_CLASSIFY. Results visible on dashboard. Operator reviews and can override any classification. Must click "Accept & Proceed" before image generation starts. This applies to both long-form and short-form production. Remotion scenes use data_payload (structured JSON), not image prompts. Both tracks produce .png files that enter the same Ken Burns + color grade pipeline.
```

---

## >>>> ADD: Pipeline Quick Reference <<<<

Add between Gate 2 and D2:

| Phase | What | Type | Cost |
|-------|------|------|------|
| C+ | Scene render classification → operator review | Agentic + Dashboard | ~$0.03 |

Update D2 row:
| D2 | Images (Fal.ai ~108 + Remotion ~64 scenes) | Deterministic | ~$3.24 |

Update total: **~$6.17/video** (finance niche, was $8.06)

---

## >>>> ADD: Project Structure <<<<

```
├── dashboard/src/remotion/
│   ├── templates/
│   │   ├── index.js
│   │   ├── shared/
│   │   │   ├── MoodTheme.js
│   │   │   ├── Typography.js
│   │   │   ├── AnimatedNumber.js
│   │   │   ├── TrendArrow.js
│   │   │   └── GlassCard.js
│   │   ├── StatCallout.jsx
│   │   ├── ComparisonLayout.jsx
│   │   ├── BarChart.jsx
│   │   ├── TimelineGraphic.jsx
│   │   ├── QuoteCard.jsx
│   │   ├── ListBreakdown.jsx
│   │   ├── ChapterTitle.jsx
│   │   ├── DataTable.jsx
│   │   ├── BeforeAfter.jsx
│   │   ├── PercentageRing.jsx
│   │   ├── MapVisual.jsx
│   │   └── MetricHighlight.jsx
│   └── render-service.js        ← Node.js render endpoint
├── dashboard/src/components/production/
│   └── SceneClassificationReview.jsx  ← NEW
├── dashboard/src/hooks/
│   └── useSceneClassification.js      ← NEW
├── workflows/
│   ├── WF_SCENE_CLASSIFY.json         ← NEW
│   └── WF_REMOTION_RENDER.json        ← NEW
├── supabase/migrations/
│   └── 005_remotion_hybrid_rendering.sql  ← NEW
```

---

## >>>> ADD: Gotchas <<<<

- Remotion render service must be running on VPS for image generation to work. Check with `curl localhost:3100/health`.
- Remotion templates derive colors from `color_mood` field. If color_mood is null, template defaults to `cool_neutral`.
- `data_payload` must match the template's `props_schema` from `remotion_templates` table. Mismatched schema = render failure.
- Classification runs in batches of 30 scenes per Haiku call (context management).
- Operator must explicitly "Accept & Proceed" after classification review. This is NOT automatic even with auto-pilot on. Auto-pilot skips Gates 1-3 but NOT classification review (it auto-accepts if classification completes without errors).
- Short-form scenes inherit classification from parent long-form scenes. If shorts pipeline regenerates 9:16 visuals, classification runs again.
- Remotion rendering: ~1-2 seconds per scene. 64 scenes = ~90 seconds total. Much faster than Fal.ai (~3-5 seconds per image).
- Preview renders use the same Remotion service but skip Drive upload. Preview PNGs are temporary.
