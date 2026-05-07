# Resume — variable-pace segments architecture (Task #12)

## Task list state at handoff (paused 2026-05-07 ~21:25 UTC, context 78%)
- #8  ✅ completed — Image-relevance fix: anti-hallucination Visual Assignment + register prompts
- #9  ✅ completed — Thumbnail: add scroll_stopper format matching Screenshot.png reference
- #10 ✅ completed — Migration: scene_segments table for variable-pace image rotation
- #11 ✅ completed — WF_BUILD_SEGMENTS: Haiku post-TTS step that splits scenes into 5/8/12s segments
- #12 ⏳ in_progress — **Refactor image + Ken Burns + assembly to iterate scene_segments** ← RESUME HERE

When the next session opens, recreate the task list with this single in-progress item:

```
TaskCreate subject="Refactor image + Ken Burns + assembly to iterate scene_segments"
   description="WF_TTS_AUDIO reroute → /production/build-segments. WF_IMAGE_GENERATION
   dispatcher iterates scene_segments when uses_segments=true. WF_SCENE_IMAGE_PROCESSOR
   accepts segment_id payload + PATCHes scene_segments. WF_KEN_BURNS SELECTs scene_segments
   for clip building with segment.duration_ms. WF_CAPTIONS_ASSEMBLY Build Scene Clip
   pre-concats per-segment kb_*.mp4 into scene-level video before audio merge."
TaskUpdate status=in_progress
```

## Goal
Finish the 5-touch-point chain that lets new topics actually use the `scene_segments` rows produced by `WF_BUILD_SEGMENTS`. Until this chain is complete, the segmenter inserts rows but downstream image-gen / Ken Burns / assembly still iterates the legacy `scenes` table — so segments never get rendered.

## What's already shipped (do NOT redo)
- ✅ Migration 041 — `paused` enum
- ✅ Migration 042 (+ fixup + register01 finalize) — register prompts emit `requires_text_rendering`
- ✅ Migration 043 (+ fixup) — anti-hallucination + `key_visual_anchor` in 5 register prompts + scenes.key_visual_anchor column
- ✅ Migration 044 — `scene_segments` table, indexes, Realtime, scenes.uses_segments flag, topic telemetry
- ✅ WF_SCRIPT_GENERATE — Build Visual Prompt + Build Scenes Array patched for anchor/anti-hallucination, pushed to n8n
- ✅ WF_THUMBNAIL_GENERATE — `scroll_stopper` text_format added, alternating yellow/white rendering, dark slab + vertical divider, pushed to n8n. Matches Screenshot.png reference.
- ✅ WF_BUILD_SEGMENTS — new workflow created (ID `BYdbUw8xSA6YQEpA`), active on n8n. Single-Code-node monolith. On webhook `/production/build-segments`: pulls scenes → picks 5/8/12s target by emotional_beat (data/revelation=5, hook/tension/story=8, resolution/transition=12) → splits narration proportionally → ONE Haiku batch call per topic for all per-segment prompts (+ key_visual_anchor + requires_text_rendering) → bulk inserts scene_segments → marks scenes.uses_segments=true → fires `/production/images`. Local file at `workflows/WF_BUILD_SEGMENTS.json`.
- ✅ Image-relevance fix is FORWARD-ONLY: topic 4 (`a904bff1-2994-4a71-8a8c-5c47cdb1503c`) ALREADY SHIPPED, no retroactive regen.

## Read first (do this before patching anything)
1. `memory/MEMORY.md` — top entry "Topic 4 SHIPPED" has the full context
2. `memory/session_2026_05_07_topic4_shipped_recraft_routing_fix.md` — earlier session's wins
3. `memory/session_2026_05_07_segments_architecture_partial.md` — THIS session's segment work

## Critical context
- **Segments use audio as master clock.** Each segment's `duration_ms` sums exactly to its parent scene's `audio_duration_ms`. Captions burn over the final concat — sync is automatic.
- **Forward-only.** Topic 4 stays on legacy 1-image-per-scene path. Any topic with `scenes.uses_segments=false` or NULL must continue working through the existing legacy chain.
- **WF_BUILD_SEGMENTS currently fires `/production/images` on completion.** That endpoint hits WF_IMAGE_GENERATION which still iterates `scenes`. So today, the segments table gets populated but nothing actually consumes it.

## The 5 patches needed (in order)

### Patch 1 — WF_TTS_AUDIO: route TTS-complete to build-segments
File: `workflows/WF_TTS_AUDIO.json`
Node: `fire-images-workflow` (also rename to `Fire Build Segments`)
Change: URL `{{ $env.N8N_WEBHOOK_BASE }}/production/images` → `{{ $env.N8N_WEBHOOK_BASE }}/production/build-segments`
Mirror change in `activeVersion.nodes` if present.

### Patch 2 — WF_IMAGE_GENERATION: iterate segments when uses_segments=true
File: `workflows/WF_IMAGE_GENERATION.json`
Affected: BOTH dispatcher Code nodes at lines 271 + 1019 (and their mirrors in activeVersion.nodes).
Change: BEFORE the `for (const scene of scenes)` loop, query `scene_segments WHERE scene_id IN (...)` for any scene with `uses_segments=true`. Iterate segments and fire to NEW endpoint `/process-segment/image` with payload `{segment_id, scene_id, scene_number, segment_number, image_prompt, requires_text_rendering, composition_prefix, color_mood, zoom_direction, register_id, negative_prompt, topic_id, project_id}`. For scenes with `uses_segments=false`, keep firing `/process-scene/image` (legacy).
Also extend the `Get Pending Scenes` SELECT to add `uses_segments` column.

### Patch 3 — WF_SCENE_IMAGE_PROCESSOR: handle segment_id payload
File: `workflows/WF_SCENE_IMAGE_PROCESSOR.json`
Add a new webhook trigger at path `process-segment/image` (or modify existing `process-scene/image` to dispatch on `body.segment_id`).
Generate Scene Image Code node (v4 → v5): if `body.segment_id` is present, PATCH `scene_segments?id=eq.{segment_id}` instead of `scenes?id=eq.{scene_id}`. Update `image_url`, `image_model`, `image_cost_usd`, `image_status='uploaded'`, `image_drive_id`. Other behavior (Recraft V3 routing, retry-on-429, collision guard) stays.

### Patch 4 — WF_KEN_BURNS: produce per-segment clips when applicable
File: `workflows/WF_KEN_BURNS.json` (ID `OYahvKcydMrUxK8j`)
Change `Get Pending Scenes` SELECT to: `scene_segments?topic_id=eq.X&clip_status=eq.pending&image_url=not.is.null&select=id,scene_id,segment_number,start_offset_ms,duration_ms,image_url`.
Build the per-segment Ken Burns clip with `duration_ms` (not the scene's audio_duration_ms — segments are silent). Output filename: `kb_<topic>_<scene_number>_<segment_number>.mp4`. PATCH `scene_segments` on completion (`clip_status='uploaded'`, `clip_url`).
Backwards compat: when topic has no segments (`scenes.uses_segments=false`), keep legacy SELECT from `scenes` table.

### Patch 5 — WF_CAPTIONS_ASSEMBLY: pre-concat segments per scene before audio merge
File: `workflows/WF_CAPTIONS_ASSEMBLY.json` (ID `Fhdy66BLRh7rAwTi`)
Build Scene Clip Code node: detect if scene has segments (`scene_segments WHERE scene_id=X count > 0`). If yes:
1. Build a `seg_concat.txt` listing all `kb_<topic>_<scene>_<segment>.mp4` in segment_number order
2. ffmpeg concat them into a temp scene-video (no audio): `kb_<topic>_<scene>.mp4`
3. Existing flow continues — merge with `scene_<NNN>.mp3` audio, add fade in/out
If no segments, use legacy `kb_<topic>_<NNN>.mp4` directly.

## Push instructions for each patched workflow
Use the `scp + curl` cycle (PowerShell HTTP mangles bytes — verified 2026-05-07):
```powershell
# 1. Build minimal PUT body
$wf = Get-Content workflows/WF_X.json -Raw | ConvertFrom-Json
$putBody = @{ name=$wf.name; nodes=$wf.nodes; connections=$wf.connections; settings=@{executionOrder='v1'} } | ConvertTo-Json -Depth 100
$tmp = "C:\tmp\put_<wfId>.json"
[System.IO.File]::WriteAllText($tmp, $putBody, (New-Object System.Text.UTF8Encoding $false))
# 2. Deactivate, scp, PUT, activate
ssh -i $key root@srv1297445.hstgr.cloud "curl -sS -X POST -H 'X-N8N-API-KEY: $n8nKey' -H 'Content-Length: 0' https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/<wfId>/deactivate"
scp -i $key $tmp root@srv1297445.hstgr.cloud:/tmp/put.json
ssh -i $key root@srv1297445.hstgr.cloud "curl -s -w 'HTTP %{http_code}' -X PUT -H 'X-N8N-API-KEY: $n8nKey' -H 'Content-Type: application/json' --data-binary @/tmp/put.json https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/<wfId>"
ssh -i $key root@srv1297445.hstgr.cloud "curl -sS -X POST -H 'X-N8N-API-KEY: $n8nKey' -H 'Content-Length: 0' https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/<wfId>/activate"
```

Workflow IDs:
- WF_TTS_AUDIO: `4L2j3aU2WGnfcvvj`
- WF_IMAGE_GENERATION: `ScP3yoaeuK7BwpUo`
- WF_SCENE_IMAGE_PROCESSOR: `Lik3MUT0E9a6JUum`
- WF_KEN_BURNS: `OYahvKcydMrUxK8j`
- WF_CAPTIONS_ASSEMBLY: `Fhdy66BLRh7rAwTi`
- WF_BUILD_SEGMENTS: `BYdbUw8xSA6YQEpA`

## Smoke test order (after all 5 patches)
1. Pick a small fresh topic (or re-fire build-segments for a non-shipped topic)
2. Manually fire `/webhook/production/build-segments {topic_id: ...}` (skip TTS for now)
3. Verify scene_segments rows populate (~1400 for 142 scenes)
4. Verify scenes.uses_segments=true
5. Watch image_status flip to uploaded across segments (vs scenes)
6. Watch clip_status flip via WF_KEN_BURNS
7. Verify Build Scene Clip pre-concats correctly (look for kb_<topic>_<scene>_*.mp4 → kb_<topic>_<scene>.mp4)
8. Final captioned mp4 lands on Drive with synced visuals

## Open follow-ups deferred from earlier sessions
- Delete OPS_* duplicate workflows permanently (deactivated but reactivate on n8n restart): `cQZc47GfASF4Vf03`, `ImcrmlyzjIGLRX58`, `FkDEUWLsSAllJGDY`, `J4x7cdF11GaTY4sF`, `YiM6EJv7qXgeuXvI`, `lbI4uo0fIaKsDe3s`, `kZh8H5L1oQvouDGX`, `ajdCDRkwFx9N9TzD`, `c90QWN48172ckqNP`
- Re-enable WF_ASSEMBLY_WATCHDOG (`Exm836gCGtxNKOeD`) once it gates on `assembly_status='in_progress'`
- Patch caption-burn service (`/opt/caption-burn/caption_burn_service.py` line ~140) to send `drive_folder_id` not `folder_id` when triggering `/webhook/drive-upload`
- Remove WF_DRIVE_UPLOAD's hardcoded fallback folder ID `1NjhTfdPzEwtY29QhtN5fB3xj-ODkj_Xg` (file no longer exists in Drive — causes 404 on missing folder_id)
- Delete topic 4 `_no_captions.mp4` backup at `/tmp/production/a904bff1-2994-4a71-8a8c-5c47cdb1503c/final/` (1.55 GB)
- Commit all uncommitted local file changes from this and prior sessions:
  - `supabase/migrations/041` `042` `042_fixup` `042_register01_finalize` `043` `043_fixup` `044`
  - `workflows/WF_SCRIPT_GENERATE.json` `WF_IMAGE_GENERATION.json` `WF_SCENE_IMAGE_PROCESSOR.json` `WF_THUMBNAIL_GENERATE.json` `WF_BUILD_SEGMENTS.json`
  - `dashboard/src/hooks/useCostCalculator.js` + ConfigTab + CostCalculator + CostEstimateDialog + TopicDetail + 2 test files
  - `prompt.md` (this file)
