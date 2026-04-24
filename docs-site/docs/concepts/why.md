# Why this platform exists

## What this is

Vision GridAI turns any niche into a YouTube channel. The operator types a niche
(for example "credit cards" or "stoic philosophy") into the dashboard and the
platform researches it, generates 25 SEO-optimised topics, writes a 2-hour
documentary script, produces every scene with audio + image + Ken Burns motion +
captions, assembles the final video, and publishes to YouTube. The same source
script is then re-cut into native 9:16 shorts for TikTok, Instagram Reels, and
YouTube Shorts. See [`CLAUDE.md`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/CLAUDE.md)
"What This Is" for the canonical one-liner.

## Why this design

The pipeline has two halves with very different shapes, and the design keeps
them strictly separated.

The first half is **agentic**. Niche research, topic generation, and script
generation all use Claude with web search and structured prompts. They are
expensive ($0.20–$1.80 per video), variable in latency, and benefit from human
review at clear handoff points. This half is built around prompts stored in
[`prompt_configs`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/supabase/migrations/001_initial_schema.sql)
and the
[`prompt_templates`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/supabase/migrations/024_register_specs.sql)
table — never hardcoded in workflow JSON.

The second half is **deterministic**. TTS, image generation, Ken Burns motion,
color grading, caption burn, and assembly are all batch operations on n8n with
predictable cost per scene and predictable runtime. They use
[resume/checkpoint logic](../subsystems/resume-retry.md) so that a crashed scene
restarts the next morning from where it left off.

Each phase has a single Supabase column it writes when complete
(`topics.pipeline_stage`) and a single status enum per asset
(`scenes.audio_status`, `scenes.image_status`, `scenes.clip_status`). The
dashboard reads these via Supabase Realtime so that progress is reflected within
milliseconds of an n8n write.

## The 3 invariants

These are the rules every workflow obeys. Violating any one of them breaks
something downstream.

- **Audio is the master clock.** TTS produces the source audio for every scene.
  FFprobe measures the actual duration in milliseconds (never estimated from
  file size or word count) and writes it to `scenes.audio_duration_ms`. Every
  visual derives its length from that field — Ken Burns clips use `-t
  audio_duration_ms/1000`, transitions are calculated against cumulative audio
  offsets, and assembly checks that the final video is within 5 seconds of the
  summed audio. See [`directives/05-ken-burns-color.md`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/directives/05-ken-burns-color.md)
  rule 1.

- **Write to Supabase after every asset.** Each scene row is updated
  immediately when its audio, image, or clip lands — not in batch at the end of
  a stage. The dashboard subscribes to Supabase Realtime on `scenes`, `topics`,
  and `production_logs` and depends on those instant writes for live progress
  bars. Batched writes break the dashboard.

- **4 approval gates pause the pipeline.** Topics → Script → Video → Shorts.
  The pipeline halts at each gate until the operator acts (or, in auto-pilot
  mode, a score threshold is met). See [the 4 approval gates](gates.md) for the
  full table.

## What it is NOT

- **Not a real-time editing tool.** The pipeline is a deterministic batch
  process. There is no scrubbing, no live preview during render, no in-browser
  effect tweaking. If you want to change a color grade after assembly, you
  re-run that stage.

- **Not a one-shot generator.** A single video moves through ten distinct
  stages over hours, with reviews at four of them. You cannot push a button
  and get a finished video without human approval at gates 1, 2, and 3.

- **Not human-free.** Auto-pilot can skip gates if topic and script scores
  exceed configured thresholds, but it always publishes as `unlisted` — never
  public. A human still flips the visibility flag. See
  [`CLAUDE.md`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/CLAUDE.md)
  "Auto-pilot mode per project" for the policy.
