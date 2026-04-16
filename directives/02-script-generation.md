# SOP 02 — Script Generation (3-Pass) + Gate 2

## Purpose
Generate a 18,000-24,000 word documentary script across 3 passes, evaluate quality, assign cinematic metadata per scene, then pause at Gate 2 for human review.

## Trigger
- Dashboard: user clicks "Start Production" on an approved topic
- Webhook: `POST /webhook/production/trigger` with `{ topic_id }`
- Auto-pilot: auto-triggers if `auto_pilot_enabled = true` and topic score > threshold

## Inputs
| Field | Source |
|-------|--------|
| `topic_id` | dashboard / auto-pilot |
| Dynamic prompts | `prompt_configs` (script_pass1/2/3, evaluator) |
| Avatar data | `avatars` table |
| Style DNA | `projects.style_dna` |

## 3-Pass Architecture
```
Pass 1 (Foundation): 5,000-7,000 words
  → Hook + pattern establishment + core framework
  → Evaluate (threshold: 6.0) → if fail, retry pass

Pass 2 (Depth): 8,000-10,000 words
  → Deep dive + evidence + case studies
  → Receives full Pass 1 as context
  → Evaluate (threshold: 6.0) → if fail, retry pass

Pass 3 (Resolution): 5,000-7,000 words
  → Practical takeaways + transformation + CTA
  → Receives summaries of Pass 1 + Pass 2
  → Evaluate (threshold: 6.0) → if fail, retry pass

Combined evaluation (threshold: 7.0)
Max 3 regeneration attempts total across all passes.
```

## Scene Schema (per scene)
Each scene in `script_json` must include:
- `narration_text`, `image_prompt`, `visual_type` (always `static_image`)
- `color_mood` (7 options: warm_golden, cool_blue, neutral, dramatic, vintage, neon, desaturated)
- `zoom_direction` (6 options: zoom_in_center, zoom_out_center, pan_left, pan_right, pan_up, pan_down)
- `composition_prefix` (8 options: wide_establishing, medium_closeup, over_shoulder, extreme_closeup, high_angle, low_angle, symmetrical, leading_lines)
- `caption_highlight_word`, `transition_to_next`, `emotional_beat`, `chapter`
- `selective_color_element` (null for most scenes)

## Outputs
- `topics.script_json` — full scene array (JSONB)
- `topics.script_metadata` — title, description, tags, thumbnail_prompt
- `topics.word_count`, `scene_count`, `script_quality_score`, `script_evaluation`
- ~172 `scenes` rows inserted
- CTR title variants stored in `topics.title_options` (CF05)
- Hook scores per chapter stored in `topics.viral_moments` (CF12)

## Workflow Chain
```
WF_SCRIPT_GENERATE → WF_SCRIPT_PASS (x3) → WF_CTR_OPTIMIZE → WF_HOOK_ANALYZER
```

## Critical Rules
1. **Style DNA appended to EVERY image prompt** — `composition_prefix + scene_subject + style_dna`.
2. **Script segmentation is mechanical** — sentence splitting preserves 100% of narration. Claude only adds image prompts and cinematic metadata. Never touches narration text.
3. **Per-pass threshold: 6.0. Combined threshold: 7.0.** Max 3 retries total.
4. **ALL_CAPS text must be preprocessed to title case** before TTS (otherwise spells letter-by-letter).
5. **Chunked generation** for >15min scripts: each chapter prompt receives previous chapter's last scene for continuity.
6. **visual_type is always `static_image`** — no I2V, no T2V.
7. **Write scenes to Supabase immediately** after parsing — one INSERT per scene.

## GATE 2 — Script Review (Pipeline Pauses)
Dashboard shows: full script text, 7-dimension quality scores, visual type distribution, word/scene count, hook scores (CF12), CTR title variants (CF05).

| Action | Effect |
|--------|--------|
| Approve | Script enters TTS production (Stage 03) |
| Reject | Script discarded. Option to regenerate with feedback. |
| Refine | Custom instructions. Claude regenerates affected passes only. |
| Edit Scenes | Inline editing of scene narration/prompts |

## Error Handling
- Anthropic API timeout: WF_RETRY_WRAPPER handles. Max 4 attempts per API call.
- Score below threshold after 3 attempts: set `script_force_passed = true`, present to user with warning.
- Partial pass failure: preserve completed passes, retry failed pass only.

## n8n Workflows
- `WF_SCRIPT_GENERATE.json` — orchestrator
- `WF_SCRIPT_PASS.json` — unified pass handler (Execute Workflow trigger)
- `WF_SCRIPT_APPROVE.json` / `WF_SCRIPT_REJECT.json`
- `WF_CTR_OPTIMIZE.json` — title variant generation (CF05)
- `WF_HOOK_ANALYZER.json` — per-chapter hook scoring (CF12)
