# SOP 10 — Intelligence Layer (17 Features)

## Purpose
Growth-intelligence overlay on the production pipeline. Does not change how videos are produced — changes what topics you pick, how you decide to publish, how you price niches, and how you learn from what ships.

## Feature Inventory

### Sprint S1 — Intelligence Foundation
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF01 | Outlier Intelligence Engine | on-demand | After topic generation | `WF_OUTLIER_SCORE` |
| CF02 | Topic SEO Scoring | on-demand | After topic generation | `WF_SEO_SCORE` |
| CF03 | RPM Niche Intelligence | on-demand | During project creation | `WF_RPM_CLASSIFY` |

### Sprint S2 — Competitive Intel
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF04 | Competitor Channel Monitor | daily cron | Schedule trigger | `WF_COMPETITOR_MONITOR` (extends WF_YOUTUBE_DISCOVERY) |
| CF14 | Style DNA Extractor | manual | Per competitor channel | `WF_STYLE_DNA` |

### Sprint S3 — CTR + A/B Testing
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF05 | CTR Title Optimizer | on-demand | After script approval | `WF_CTR_OPTIMIZE` |
| CF06 | CTR Thumbnail Scorer | on-demand | After thumbnail generation | `WF_THUMBNAIL_SCORE` |
| CF17 | A/B Testing Engine | cron + manual | 48h rotation cycle | `WF_AB_TEST_ROTATE` |

### Sprint S4 — Prediction
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF12 | Viral Moment Pre-Scoring + Hook Analyzer | on-demand | During script Pass 3 | `WF_HOOK_ANALYZER` |
| CF13 | Predictive Performance Score (PPS) | on-demand | After assembly | `WF_PREDICT_PERFORMANCE` |

### Sprint S5 — Media Polish
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF07 | Background Music + Ducking | on-demand | After assembly | `WF_MUSIC_GENERATE` (already built) |

### Sprint S6 — AI Advisory
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF08 | Daily Idea Engine | daily cron | Schedule trigger | `WF_DAILY_IDEAS` |
| CF09 | AI Growth Coach | on-demand | Dashboard chat UI | `WF_AI_COACH` |

### Sprint S7 — Analytics Loop
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF10 | Post-Publish Analytics | daily cron | After YouTube data pull | `WF_ANALYTICS_CRON` |
| CF11 | Niche Health Score | weekly cron | Schedule trigger | `WF_NICHE_HEALTH` |
| CF15 | Revenue Attribution Engine | monthly cron | Schedule trigger | `WF_REVENUE_ATTRIBUTION` |

### Sprint S8 — Audience Memory
| ID | Feature | Type | Trigger | Workflow |
|----|---------|------|---------|----------|
| CF16 | Audience Memory Layer | weekly cron | Schedule trigger | `WF_AUDIENCE_INTELLIGENCE` |

## Cron Schedule Summary
| Workflow | Frequency | Time |
|----------|-----------|------|
| `WF_COMPETITOR_MONITOR` | Daily | 3:00 AM UTC |
| `WF_DAILY_IDEAS` | Daily | 6:00 AM UTC |
| `WF_COMMENTS_SYNC` | Daily | 4:00 AM UTC |
| `WF_COMMENT_ANALYZE` | Daily | 4:30 AM UTC (after sync) |
| `WF_ANALYTICS_CRON` | Daily | 5:00 AM UTC |
| `WF_SOCIAL_ANALYTICS` | Daily | 5:30 AM UTC |
| `WF_NICHE_HEALTH` | Weekly (Mon) | 2:00 AM UTC |
| `WF_AUDIENCE_INTELLIGENCE` | Weekly (Mon) | 2:30 AM UTC |
| `WF_PPS_CALIBRATE` | Monthly (1st) | 1:00 AM UTC |
| `WF_REVENUE_ATTRIBUTION` | Monthly (1st) | 1:30 AM UTC |
| `WF_AB_TEST_ROTATE` | Every 48h | Rolling |
| `WF_SUPERVISOR` | Every 30 min | Rolling |
| `WF_SCHEDULE_PUBLISHER` | Every 15 min | Rolling |

## Webhook Triggers
| Endpoint | Workflow | When |
|----------|----------|------|
| `/webhook/research/run` | `WF_RESEARCH_ORCHESTRATOR` | Manual from Research page |
| `/webhook/youtube/discover` | `WF_YOUTUBE_DISCOVERY` | Manual from Intelligence Hub |
| `/webhook/youtube/analyze` | `WF_YOUTUBE_ANALYZE` | Manual per video |
| `/webhook/shorts/analyze` | `WF_SHORTS_ANALYZE` | Manual from Shorts Creator |
| `/webhook/shorts/produce` | `WF_SHORTS_PRODUCE` | After Gate 4 approval |

## Critical Rules
1. **All intelligence workflows use `fetch()` + `$env`** in n8n Code nodes — never `this.helpers.httpRequest` or `process.env` (broken in n8n 2.8.4 task runner).
2. **Cost-sensitive batch workflows stay on Haiku 4.5** — competitor monitor, niche health, comment classification, daily ideas. Script gen + scoring workflows use Opus 4.6.
3. **Anthropic model IDs:** `claude-opus-4-6` (scoring/scripts), `claude-haiku-4-5-20251001` (batch/classification).
4. **YouTube API quota: 10,000 units/day.** Discovery runs ~5,000 units. Max 2 discovery runs/day. Resets midnight Pacific.
5. **Exponential backoff on ALL external API calls** via WF_RETRY_WRAPPER.
6. **Write results to Supabase immediately.** Dashboard uses Realtime for live updates.
7. **PPS calibration** compares predicted vs actual monthly. Weights auto-adjust. Manual override available in Settings.
8. **A/B test rotation** swaps title/thumbnail variants every 48h. Tracks impressions + CTR per variant. Winner locked after statistical significance.
9. **Audience memory** distills weekly comment themes into a context block injected into script Pass 1 prompts.

## Error Handling
- Intelligence failure is NEVER a pipeline blocker. Production continues with null scores.
- Cron failures: log to `production_logs`, retry next cycle. Alert after 3 consecutive failures.
- API quota exceeded: back off until reset. Log warning.
- Model ID mismatch: fail loudly with clear error message identifying the model string.
