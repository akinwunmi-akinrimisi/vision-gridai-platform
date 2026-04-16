# SOP 07 — Background Music + End Card + Thumbnail

## Purpose
Generate AI background music via Vertex AI Lyria, duck under voiceover, generate end card, produce AI thumbnail with SEO text overlay.

## Trigger
- Assembly complete (chained from WF_CAPTIONS_ASSEMBLY "Log Assembly Complete" node)

## Background Music (Lyria)

### Inputs
| Field | Source |
|-------|--------|
| `script_json` music_sections | `topics` table |
| Mood descriptors | AI-derived from script analysis |

### Process
1. Claude Haiku analyzes script and determines mood/tempo/instruments per chapter
2. Vertex AI Lyria (`lyria-002`) generates custom 30-second clips per mood section
3. FFmpeg loops and crossfades Lyria clips to match video duration at chapter boundaries
4. Voice ducking mix:
```bash
ffmpeg -i voiceover.wav -i music.mp3 \
  -filter_complex "[1:a]volume=0.12[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[out]" \
  -map "[out]" -c:a aac -b:a 192k mixed.m4a
```

### Critical Rule
- **Music volume = 0.12** — NOT 0.5. Music should be barely perceptible under voice. This is non-negotiable.

## End Card

### Process
1. Static branded image: dark background (#0A0A1A) + channel branding + subscribe CTA
2. FFmpeg fade in/out:
```bash
ffmpeg -loop 1 -i endcard.png \
  -vf "fade=in:st=0:d=0.5,fade=out:st=4.5:d=0.5" \
  -t 5 -c:v libx264 -pix_fmt yuv420p endcard.mp4
```
3. Concatenate onto final assembled video

### Duration
- **Long-form: 5-8 seconds.** Include in total video length calculation.
- **Shorts: 3 seconds.**

## Thumbnail

### Process
1. AI-generated image via Fal.ai Seedream 4.0 using script hook + style_dna
2. **Style: photorealistic** — Canon EOS R5, RAW, NOT illustration, teal-orange color grade
3. Text overlay via Sharp/Jimp in n8n Code node
4. **Text must fill 70-75% of allotted space, always in question format**
5. **2-4 core keywords in contrasting color** (black+white outline on yellow, red+black outline on white)
6. Auto-upload to Google Drive
7. Store URL in `platform_metadata` table

### 3 Thumbnail Styles
- `single_face` — one person, direct eye contact, emotion-driven
- `dual_face` — two faces/elements, comparison or confrontation
- `scene_overlay` — cinematic wide shot with bold text

### Thumbnail CTR Scoring (CF06)
After thumbnail generation, `WF_THUMBNAIL_SCORE` sends the image to Claude Vision for 7-factor scoring. If score < threshold, auto-regenerate (max 2 regen attempts).

## Workflow Chain
```
WF_MUSIC_GENERATE → WF_ENDCARD → WF_THUMBNAIL_GENERATE → WF_THUMBNAIL_SCORE
```

## Critical Rules
1. **Music ducking at volume=0.12.** Verified by loudness check post-mix.
2. **End card duration included in total video length** — affects YouTube Analytics watch time calculation.
3. **Thumbnail text in question format** — per user feedback, always frame as a question.
4. **Thumbnail keyword emphasis** — 2-4 keywords in contrasting color per user feedback.
5. **All Fal.ai calls include universal negative prompt.**
6. **Write every asset to Supabase immediately.**
7. **Exponential backoff on all API calls** (Lyria, Fal.ai, Claude Vision).

## Error Handling
- Lyria generation failure: use silence + proceed. Music is enhancement, not blocker.
- Thumbnail generation failure: retry 2x. If still fails, proceed without thumbnail (manual upload later).
- End card FFmpeg failure: retry once. Non-blocking — video can publish without end card.

## Cost
- Lyria music: $0.00 (Vertex AI free tier)
- Thumbnail image: $0.03 (Seedream 4.0)
- End card: $0.00 (FFmpeg)

## n8n Workflows
- `WF_MUSIC_GENERATE.json`
- `WF_ENDCARD.json`
- `WF_THUMBNAIL_GENERATE.json` (ID: `7GqpEAug8hxxU7f6`)
- `WF_THUMBNAIL_SCORE.json` — Claude Vision CTR scoring (CF06)
