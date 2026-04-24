# Cost economics

What it costs to run the pipeline, broken down per API call. Numbers
are sourced from `CLAUDE.md` Pipeline Quick Reference,
`Dashboard_Implementation_Plan.md §10`, and `skills.md`. They drift —
treat the numbers as Q2-2026 snapshots and confirm against current
provider pricing before basing a decision on them.

For the conceptual overview, see [Pipeline Economics](../concepts/economics.md).

## Per-video cost — long-form (2 hours, 172 scenes)

| Stage | Item | Per video | Notes |
|---|---|---|---|
| A | Niche research + topics | ~$0.80 | One-time per project, amortized over 25 videos |
| C | 3-pass script + evaluation | $0.45 – $1.35 | Sonnet for passes, Haiku for eval. Worst case is 3 retries × 3 passes |
| C | Visual type assignment + scene metadata | $0.03 – $0.05 | Haiku |
| D1 | TTS (Google Cloud Chirp 3 HD) | ~$0.30 | 172 scenes × ~50-90 chars each |
| D2 | Images: Fal.ai Seedream 4.5 — all scenes | $5.16 – $6.88 | $0.030 – $0.040 per image × 172 |
| D2.5 | I2V clips: Fal.ai Seedance 2.0 Fast (selected scenes) | $0 – $62.89 | $0.2419/sec × 10s × N. Cost-Calc Stage 7.5 picks N (0/5/10/15%) |
| D3 | Ken Burns + Color Grade (FFmpeg) | $0.00 | VPS CPU only |
| D4 | Captions + Transitions + Assembly (FFmpeg) | $0.00 | VPS CPU only |
| D5 | Background music: Vertex AI Lyria | ~$0.02 – $0.05 | Per generation × music_sections (typically 3-5) |
| D5 | Music ducking + mix (FFmpeg) | $0.00 | VPS CPU only |
| D6 | End card | $0.00 | Static branded image + FFmpeg |
| D6 | Thumbnail (Fal.ai Seedream + Sharp/Jimp text overlay) | ~$0.03 | 1 image |
| D7 | Platform-specific renders (4 exports) | $0.00 | VPS CPU only |
| E | YouTube upload | $0.00 | API quota cost only |
| F | Analytics pull | $0.00 | API quota cost only |

**Long-form total: ~$8 – $77 per video** (the wide range is the I2V
selection at Stage 7.5).

## Per-video cost — shorts (~20 viral clips per long-form)

Phase G + H workflows. Per long-form video:

| Stage | Item | Per topic (20 shorts) |
|---|---|---|
| G | Viral analysis + rewrite (Anthropic Sonnet) | ~$0.08 |
| G | Fresh TTS for 20 shorts | ~$0.28 |
| G | 9:16 images + thumbnails (Fal.ai, ~24 calls) | ~$2.46 |
| G | I2V + T2V short clips (Fal.ai Seedance) | ~$19.50 |
| G | Caption burn (FFmpeg + libass on host service) | $0.00 |
| H | Cross-platform posting (TikTok / Instagram / YouTube Shorts) | $0.00 (API only) |

**Shorts total: ~$22 per topic** for 20 clips.

## Topic Intelligence (per run)

Standalone — not tied to a specific topic.

| Item | Cost |
|---|---|
| Reddit / YouTube / TikTok scraping (Apify + native APIs) | ~$0.05 |
| Google Trends + PAA (pytrends + SerpAPI) | ~$0.02 |
| Quora (Apify) | ~$0.02 |
| Categorization + ranking (Anthropic Haiku) | ~$0.04 |
| **Per-run total** | **~$0.13** |

Monthly (~16 runs): **~$2.08**.

## Monthly fixed costs

| Item | Cost |
|---|---|
| Hostinger VPS (Plus tier) | ~$15 |
| Supabase (self-hosted on VPS) | $0 marginal |
| n8n (self-hosted on VPS) | $0 marginal |
| Domain / DNS (3 hostnames) | ~$1 |
| Supervisor agent (Anthropic Haiku, every 30 min) | ~$14 |
| Comment sync + sentiment (Anthropic Haiku, daily) | ~$0.60 |
| **Total fixed** | **~$31/month** |

Plus per-video costs above × throughput.

## Quota constraints

These bite before pricing does:

- **YouTube Data API v3:** 10,000 units/day. A `videos.insert` upload
  costs **1,600 units**, so the hard ceiling is **6 uploads/day per
  project**. Discovery runs are ~5,000 units each (max 2/day if you've
  already uploaded a video). Quota resets at midnight Pacific.
- **Fal.ai async queue:** 2 image / 10s, 1 T2V / 60s, 2 I2V / 10s. The
  queue auto-throttles; `WF_RETRY_WRAPPER` absorbs 429s.
- **Anthropic tier rate limits:** depend on your tier. Pipeline burst
  is during 3-pass script generation (3 Sonnet calls + 3 Haiku evals
  back-to-back per topic).
- **Google Cloud TTS:** no operational quota in our usage band.
- **Vertex AI Lyria:** project quota — apply for higher quota before
  running >50 videos/month.
- **Apify actors:** cold start can be 120s; bake the timeout into
  `WF_RETRY_WRAPPER` calls or use scheduled actors.

## Cost-control levers

Three knobs that disproportionately move per-video cost:

1. **I2V ratio at Cost-Calc Stage 7.5.** Going from 0% to 15% I2V on a
   172-scene video adds ~$63. The dashboard shows the projected delta
   before the user picks a ratio.
2. **Script regeneration count.** Each regenerate is another full pass
   ($0.15-$0.45). Tightening the per-pass threshold from 6.0 to 6.5
   raises retry rates; loosening saves money but lowers floor quality.
3. **Auto-pilot threshold.** Auto-publishing as `unlisted` at score
   ≥ 7.0 vs ≥ 7.5 changes how many script regens you eat per video.

## Budget guardrails

`projects.monthly_budget_usd` + `projects.monthly_spend_usd` columns
power the supervisor's budget alert. When `monthly_spend >= 0.9 *
monthly_budget`, the supervisor sets `auto_pilot_enabled = false` on
the project and posts an alert to `production_log`. The dashboard
ProjectDashboard page surfaces a budget progress bar.

For day-to-day cost monitoring, query:

```sql
SELECT
  p.name, p.monthly_budget_usd, p.monthly_spend_usd,
  COUNT(t.id) AS topics_this_month,
  SUM(t.total_cost) AS spend_from_topics
FROM projects p
LEFT JOIN topics t ON t.project_id = p.id
  AND t.published_at >= date_trunc('month', NOW())
GROUP BY p.id;
```
