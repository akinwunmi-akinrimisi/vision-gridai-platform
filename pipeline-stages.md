# Vision GridAI Platform — Pipeline Stages

## Long-Form Video (2-hour documentary) — 14 Stages

| # | Stage | Type | Approval Gate? | n8n Workflow | What Happens |
|---|-------|------|----------------|-------------|--------------|
| **1** | Project Creation | Dashboard | — | WF_WEBHOOK | User inputs niche name + description |
| **2** | Niche Research | ⚡ Agentic | — | WF_NICHE_RESEARCH | Web search → competitor audit, pain points, blue-ocean gaps, dynamic prompts |
| **3** | Topic Generation | ⚡ Agentic | — | WF_TOPIC_GENERATE | 25 SEO topics + customer avatars (10 data points each) |
| **4** | Topic Review | Dashboard | **GATE 1** | WF_WEBHOOK | Approve / Reject / Refine each topic. Pipeline pauses. |
| **5** | Script Generation (3-pass) | ⚡ Agentic | — | WF_SCRIPT_GENERATE | Pass 1 (5-7K words) → Pass 2 (8-10K words) → Pass 3 (5-7K words) + 7-dimension scoring |
| **6** | Script Review | Dashboard | **GATE 2** | WF_WEBHOOK | Review quality scores, approve/reject/refine script. Pipeline pauses. |
| **7** | Scene Segmentation | ⚡ Agentic | — | (part of script) | Parse script into ~172 scenes, assign visual types (static_image / i2v / t2v) |
| **8** | TTS Audio (Master Clock) | Deterministic | — | WF_TTS_AUDIO | Google Cloud TTS Chirp 3 HD → 172 audio files. FFprobe measures duration. This is the **master timeline**. |
| **9** | Image Generation | Deterministic | — | WF_IMAGE_GENERATION | Fal.ai Seedream 4.0 → ~75 images (16:9). $0.03/image. |
| **10** | I2V Video Generation | Deterministic | — | WF_I2V_GENERATION | Fal.ai Wan 2.5 Image-to-Video → ~25 clips. $0.05/sec. |
| **11** | T2V Video Generation | Deterministic | — | WF_T2V_GENERATION | Fal.ai Wan 2.5 Text-to-Video → ~72 clips. $0.05/sec. |
| **12** | Captions + FFmpeg Assembly | Deterministic | — | WF_CAPTIONS_ASSEMBLY | SRT captions + FFmpeg zoompan/concat → single 2hr video + audio normalization |
| **13** | Thumbnail Generation | Deterministic | — | WF_THUMBNAIL_GENERATE | AI image + text compositing (question format, keyword emphasis) |
| **14** | Video Review + Publish | Dashboard | **GATE 3** | WF_WEBHOOK | Preview video, edit metadata, approve → YouTube upload (or schedule) |

**Post-publish:** WF_VIDEO_METADATA (title/description/tags) + YouTube Analytics pull (daily cron)

---

## Short-Form Video (Shorts/TikTok/Reels) — 10 Stages

Starts **after** a long-form topic is published.

| # | Stage | Type | Approval Gate? | n8n Workflow | What Happens |
|---|-------|------|----------------|-------------|--------------|
| **1** | Viral Clip Analysis | ⚡ Agentic | — | WF_SHORTS_ANALYZE | Claude analyzes published script → identifies 20 viral-worthy segments, scores virality 1-10 |
| **2** | Shorts Review | Dashboard | **GATE 4** | WF_WEBHOOK | Review 20 proposed clips: virality score, rewritten narration, emphasis words, hashtags. Approve/Skip/Edit. |
| **3** | Narration Rewrite | ⚡ Agentic | — | (part of analyze) | Rewrite narration for punchy short-form pacing + rewrite image prompts for 9:16 TikTok-bold aesthetic |
| **4** | TTS Audio (Fresh) | Deterministic | — | WF_SHORTS_PRODUCE | Fresh Google Cloud TTS for rewritten narration (NOT reused from long-form) |
| **5** | 9:16 Image Generation | Deterministic | — | WF_SHORTS_PRODUCE | Fal.ai Seedream 4.0 portrait_9_16 images with TikTok-bold style |
| **6** | 9:16 I2V Video Generation | Deterministic | — | WF_SHORTS_PRODUCE | Fal.ai Wan 2.5 aspect_ratio 9:16 image-to-video |
| **7** | 9:16 T2V Video Generation | Deterministic | — | WF_SHORTS_PRODUCE | Fal.ai Wan 2.5 aspect_ratio 9:16 text-to-video |
| **8** | Kinetic Captions | Deterministic | — | WF_SHORTS_PRODUCE | Remotion renders word-by-word pop-in overlays (center screen, emphasis words in yellow/red) |
| **9** | FFmpeg Assembly | Deterministic | — | WF_SHORTS_PRODUCE | Composite Remotion caption overlay onto video clips → final 9:16 portrait video |
| **10** | Social Publishing | Dashboard/Cron | — | WF_SOCIAL_POST | Post to TikTok + Instagram Reels + YouTube Shorts (immediate or scheduled with peak-hour stagger) |

**Post-publish:** WF_SOCIAL_ANALYTICS pulls engagement metrics daily from all 3 platforms.

---

## Summary

| | Long-Form | Short-Form |
|---|---|---|
| **Total stages** | 14 | 10 |
| **Approval gates** | 3 (Topics, Script, Video) | 1 (Viral clips) |
| **Cost per unit** | ~$28/video | ~$22/topic (20 clips) |
| **Aspect ratio** | 16:9 | 9:16 (native, not cropped) |
| **Captions** | SRT + FFmpeg burn-in | Remotion kinetic (word-by-word pop-in) |
| **Audio** | Original TTS | Fresh TTS with rewritten narration |
