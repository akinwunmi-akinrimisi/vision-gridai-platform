# SOP 09 — Shorts Pipeline (9:16 Short-Form)

## Purpose
Analyze published long-form videos for viral clip candidates, produce native 9:16 shorts with fresh TTS/images/captions, and publish to TikTok/Instagram/YouTube Shorts.

## Trigger
- Dashboard: user clicks "Analyze for Viral Clips" on a published topic
- Webhook: `POST /webhook/shorts/analyze` with `{ topic_id }`

## Prerequisites
- Topic must have `status = 'published'` (long-form video exists)
- Script JSON available in `topics.script_json`

## Phase 1: Viral Analysis (WF_SHORTS_ANALYZE)

### Process
1. Claude analyzes full script and identifies 20 viral-worthy segments
2. Each clip scored 1-10 for virality (8+ gets fire emoji in dashboard)
3. Narration rewritten for punchy short-form pacing (NOT reused from long-form)
4. Image prompts rewritten for 9:16 TikTok-bold aesthetic
5. Emphasis words mapped for caption highlighting
6. Hashtags generated per clip

### Outputs (per clip)
- `shorts` row with `review_status = 'pending'`
- `virality_score`, `clip_title`, `hook_text`
- `rewritten_narration` (JSONB — scene-level)
- `rewritten_image_prompts` (JSONB — 9:16 specific)
- `emphasis_word_map` (JSONB)
- `hashtags` (text array)

## GATE 4 — Shorts Review (Pipeline Pauses)
Dashboard shows 20 proposed clips as cards:
- Virality score with fire emoji for 8+
- Original vs rewritten narration (side by side)
- Rewritten image prompts preview
- Emphasis words highlighted
- Editable hashtags and title

| Action | Effect |
|--------|--------|
| Approve | Enters production queue |
| Skip | Excluded from production |
| Edit | Modify narration/prompts/hashtags |
| Approve All | Bulk approve |
| Approve Top 10 | Approve by virality score |

## Phase 2: Production (WF_SHORTS_PRODUCE)

### Per approved clip:
```
1. TTS Audio — Fresh Google Cloud TTS on rewritten narration (NOT reused)
2. Image Gen — Fal.ai Seedream 4.0, image_size: "portrait_9_16", TikTok-bold style
3. Ken Burns — FFmpeg zoompan (zoom intensity 0.0015 — aggressive), 1080x1920 output
4. Color Grade — Same 7-mood system as long-form
5. ASS Captions — Whisper alignment → generate_kinetic_ass.py → word-by-word pop-in
   - Center screen, bigger text than long-form
   - Emphasis words in yellow/red
   - Dynamic positioning (per user feedback)
6. Assembly — Concat clips + loudnorm
7. Caption Burn — FFmpeg libass via caption burn service (:9998)
8. Upload — Google Drive
```

## Critical Rules
1. **Shorts are NATIVE 9:16 (`portrait_9_16`).** NOT cropped from 16:9. Different visual style.
2. **Fresh TTS audio** — rewritten narration has punchier pacing. Never reuse long-form audio.
3. **Ken Burns zoom intensity: 0.0015** for shorts (aggressive), vs 0.001 for long-form (subtle).
4. **Caption style: bigger text, dynamic positioning, emphasis-driven** — per user feedback. Hormozi/MrBeast style.
5. **End card duration: 3 seconds** for shorts (vs 5-8s long-form).
6. **YouTube Shorts auto-detect** by 9:16 aspect + <=60s. Clips >60s upload as regular vertical.
7. **Resume/checkpoint on every production step** — check status before processing.
8. **Write to Supabase after every asset.**

## Social Publishing
- **YouTube Shorts** (Data API v3) — same channel, auto-detect by 9:16 + <=60s
- **TikTok** (Content API) — requires Developer account + app approval
- **Instagram Reels** (Graph API) — requires Facebook Business account
- `WF_SCHEDULE_PUBLISHER` cron (15 min) checks `scheduled_posts`
- Peak hours: TikTok 6PM/8PM/10PM EST, Instagram 12PM/6PM
- Stagger: TikTok first -> Instagram 24h later -> YouTube Shorts same day
- Default visibility: always unlisted (auto-pilot never publishes public)
- Thumbnail: diagonal slant divider, AI image + bold phrase (3-6 words, 70-80% fill)

## Error Handling
- Viral analysis failure: retry once. If fails, present empty list with "Analysis failed" message.
- Single clip production failure: mark `production_status = 'failed'`, continue with others.
- Social API posting failure: retry 3x via WF_RETRY_WRAPPER. Queue for next cycle if persistent.
- TikTok/Instagram auth token expiry: refresh token flow. If fails, mark `social_accounts.is_active = false`.

## Cost (per topic, ~20 clips)
- TTS: ~$0.28
- Images (Seedream 4.0): ~$0.60
- Ken Burns + Assembly: $0.00
- Total: ~$0.88/topic for shorts production

## n8n Workflows
`WF_SHORTS_ANALYZE` (ID: `pbh7LaZI9kua5oxI`), `WF_SHORTS_PRODUCE` (ID: `mg9gWUz2yiGhOq7r`), `WF_SCHEDULE_PUBLISHER`, `WF_SOCIAL_POSTER`, `WF_SOCIAL_ANALYTICS`
