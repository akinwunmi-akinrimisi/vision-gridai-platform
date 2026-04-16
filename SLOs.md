# SLOs.md — Service Level Objectives (Baseline)
**Generated:** 2026-04-16 | **Phase:** 0 Reconnaissance

---

## Production Pipeline SLOs

| SLO | Target | Measurement | Notes |
|-----|--------|-------------|-------|
| Niche research completion | <= 120 s | Wall clock from webhook trigger to project.status = 'researching_complete' | Anthropic Opus + web search |
| Topic generation (25 topics + avatars) | <= 90 s | From trigger to 25 topic rows inserted | Single Opus call + Fal.ai avatar gen |
| Single script pass | <= 180 s | From Pass N start to Pass N complete | Opus 4.6, 5-10K words per pass |
| Full 3-pass script + scoring | <= 10 min | From Pass 1 start to evaluation complete | Includes 3 passes + combined eval |
| TTS for 172 scenes | <= 25 min | From TTS start to all 172 audio_status = 'uploaded' | Google Cloud TTS Chirp 3 HD |
| Image batch (172 Seedream) | <= 30 min | From start to all 172 image_status = 'uploaded' | Fal.ai rate limit: 2 img/10s |
| Ken Burns + Color Grade (172 scenes) | <= 45 min | From start to all 172 clip_status = 'uploaded' | FFmpeg zoompan + colorbalance |
| FFmpeg 2 hr assembly | <= 30 min | From concat start to final MP4 ready | Batch 15-20 scenes per xfade chain |
| FFmpeg peak RSS during assembly | <= 3 GB | `docker stats` peak memory | n8n container limit: 4096M |
| Dashboard Realtime latency | <= 2 s | From Supabase write to dashboard UI update | Supabase Realtime WebSocket |
| Webhook cold-trigger ACK | <= 500 ms | From POST to HTTP 200 response | n8n webhook handler |
| Gate resume to next stage start | <= 5 s | From approve webhook to next workflow trigger | Self-chaining via Execute Workflow |
| Topic refinement cost | <= $0.15 per call | Anthropic API cost per refinement | Includes all 24 sibling topics as context |
| Final MP4 A/V sync | < 200 ms drift | `ffprobe` scene audio sum vs output duration | Master clock invariant |
| Final MP4 loudness | [-17, -15] LUFS | `ffmpeg -af loudnorm -f null` measurement | Target: I=-16, TP=-1.5, LRA=11 |

---

## Intelligence Layer SLOs

| SLO | Target | Measurement | Feature |
|-----|--------|-------------|---------|
| Outlier + SEO scoring (25 topics) | <= 5 min | From trigger to all topics scored | CF01+CF02 (YouTube API rate-limited) |
| RPM classification | <= 30 s | From trigger to projects.niche_rpm_category set | CF03 |
| Daily Ideas generation (20 ideas) | <= 3 min | From trigger to >=8 daily_ideas rows | CF08 (threshold lowered from 15 to 8) |
| AI Coach turn pair | <= 120 s | From user message POST to assistant response stored | CF09 (Opus 4.6 reasoning) |
| PPS calculation | <= 30 s | From trigger to predicted_performance_score set | CF13 |
| Hook analysis (5-10 chapters) | <= 60 s | From trigger to hook_scores JSONB populated | CF12 |
| Style DNA extraction (3-pass Vision) | <= 5 min | From trigger to style_profiles row complete | CF14 |
| Audience intelligence weekly | <= 10 min | From trigger to audience_insights row upserted | CF16 (500 comments + synthesis) |
| CTR title optimization (5 variants) | <= 60 s | From trigger to title_options with 5 entries | CF05 |
| Thumbnail Vision scoring (7 factors) | <= 45 s | From trigger to thumbnail_ctr_score populated | CF06 |

---

## Cost SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Long-form video total cost | <= $8.09 | Sum of all API costs per video (script + TTS + images + assembly) |
| Shorts pack (20 clips) cost | <= $0.50 | All 20 clips including TTS + images |
| Intelligence overhead per project | <= $7.50 | All intelligence API costs for one project cycle |
| Ongoing monthly intelligence (10 projects) | <= $15.00 | Monthly cron costs across all intelligence workflows |
| YouTube API daily budget for intelligence | <= 5,000 units | Reserve 5,000 for production (uploads) |
| Per-video ceiling (long + shorts + intelligence) | <= $50.00 | Absolute max before auto-pause |
| Test campaign daily spend cap | <= $5.00 | Hard cap on any real API calls during testing |

---

## Reliability SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| All 4 gates pause pipeline | 100% | No auto-advance without dashboard webhook POST |
| Supabase write after every asset | 100% | Each scene row updates immediately (not batch) |
| Self-chaining error handling | 100% | Every workflow writes failure state to Supabase on error |
| YouTube quota never exceeded | 100% | Pre-flight check before upload; max 6 uploads/day |
| Shorts native 9:16 | 100% | `image_size: "portrait_9_16"`, no post-processing crop |
| Intelligence webhook auth | 100% | All 18 intelligence webhooks require DASHBOARD_API_TOKEN |
| Score recomputation (no Claude drift) | 100% | All Claude-returned scores recomputed from clamped components |
| Deterministic fallbacks on intelligence fields | 100% | Dashboard never renders null for any intelligence column |
| Crons disabled by default | 100% | All Schedule Trigger nodes have `disabled: true` |

---

## Performance SLOs (Load)

| SLO | Target | Measurement |
|-----|--------|-------------|
| 3 concurrent projects at Stages 8-12 | No crash | n8n container + FFmpeg co-resident on KVM 4 VPS |
| 20 simultaneous webhook calls to one gate | No double-trigger | Race condition guard on gate resume |
| n8n container memory (steady state) | <= 2 GB | `docker stats` during production |
| n8n container memory (peak assembly) | <= 4 GB | `docker stats` during FFmpeg concat |
| VPS disk headroom | >= 30% free | `df -h` after full pipeline run |

---

## Availability SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Supabase REST reachable | 99.9% | Health check from n8n |
| n8n webhook responsive | 99.9% | ACK within 500ms |
| Dashboard loads | 99.9% | HTTP 200 on index.html |
| Caption burn service (:9998) | 99.5% | systemd restart on crash |

---

## Deviation Tracking

Deviations from these baselines will be captured in `SLO_DEVIATIONS.md` during Phase 2 testing with exact measurements, root cause, and remediation plan.
