# Agent Instructions (DOE)
## Vision GridAI — Topic Intelligence Engine
### Directive → Observation → Experiment

> **Content without demand is noise.**
> This system listens before it creates. Every video topic is backed by proof
> that real people are already asking the question, debating the answer,
> or struggling with the problem. No guessing. No gut feelings. Data first.

**Version 1.0 | Operscale Systems | March 2026**
**Owner:** Akinwunmi Akinrimisi
**Stack:** n8n (self-hosted on Hostinger KVM 4) + Supabase (self-hosted PostgreSQL) + Apify (Reddit, TikTok, Quora actors) + YouTube Data API v3 + SerpAPI / pytrends (Google Trends) + OpenRouter (Claude Haiku for AI scoring/categorization) + Vision GridAI Dashboard (React + Tailwind)

---

## IMMUTABLE — Non-Negotiable Operating Rules

- Read the relevant `directives/` file for every pipeline stage before writing or modifying any logic.
- **Never hardcode API keys.** Always reference n8n credentials or `$getWorkflowStaticData`. Any key exposed in a workflow JSON export must be rotated immediately.
- **This engine is niche-agnostic.** Every workflow, prompt, and database query must accept `niche_id` as a parameter. No niche-specific logic is hardcoded anywhere.
- **7-day lookback window.** Every scraping run collects data from the last 7 days only. Older data is historical context, not active research.
- **GSD is the project manager. Agency Agents are the specialists.** GSD plans, sequences, and verifies. Agency Agents write the code and build the workflows. Neither operates alone.
- **Every scraping result must have a source URL.** If a result cannot be traced back to its origin, it is discarded. No orphaned data.
- **AI categorization is a second pass, not a filter.** All 50 raw results (10 per source) are stored first. AI clustering and ranking happen after collection, never during.
- Treat every failed scrape as a learning signal. Log the failure, diagnose the cause, update the directive.
- Do not rewrite or regenerate this file unless explicitly instructed.

---

## 1. The 3-Layer Architecture

| Layer | Name | What lives here | Your role |
|-------|------|-----------------|-----------|
| **1** | Directive | `directives/` — Markdown SOPs per pipeline stage. Inputs, tools, outputs, edge cases. | READ before acting |
| **2** | Orchestration | **THIS AGENT — you.** Interpret niche context, route to scraping tools, handle failures, trigger AI analysis. | DECIDE and ROUTE |
| **3** | Execution | MCP servers (Synta, n8n), Apify actors, YouTube API, SerpAPI, Claude Haiku via OpenRouter, Supabase queries. | RUN and OBSERVE |

**Execution Priority Order:**
1. **Synta MCP** — First choice for external service orchestration and API discovery
2. **n8n MCP** — For workflow scaffolding, node creation, and deployment on the live n8n instance
3. **Claude Code tools** — For file creation, bash execution, web search, and local processing
4. **Manual intervention** — Only when automation cannot handle the task

---

## 2. System Overview

### What This Does
The Topic Intelligence Engine is a research tab inside the Vision GridAI dashboard. When the operator clicks "Run Research," the system:

1. Accepts a niche context (pulled from the active Vision GridAI project)
2. Dispatches 5 parallel scraping jobs across Reddit, YouTube Comments, TikTok, Google Trends, and Quora
3. Collects the top 10 most-engaged discussion points from each source (last 7 days)
4. Stores all 50 raw results in Supabase
5. Runs AI-powered categorization to cluster results into organic topic groups
6. Ranks clusters by total engagement (comments + likes + upvotes + shares)
7. Generates a summary theme label for each cluster
8. Displays everything on the Research tab: source-by-source breakdown + ranked category clusters + per-cluster summary

### What This Does NOT Do
- It does not auto-trigger the video script generation pipeline. The operator manually selects a topic and feeds it into the existing workflow.
- It does not run on a schedule. It is on-demand only.
- It does not filter or discard results during scraping. All results are stored; ranking happens after.

---

## 3. The 5 Data Sources

| # | Source | Method | Cost | What We Extract | US Audience Signal |
|---|--------|--------|------|-----------------|-------------------|
| 1 | **Reddit** | Apify Reddit Scraper actor OR PRAW (free API) | Free (PRAW) / ~$5/1000 results (Apify) | Post titles, body text, subreddit, upvotes, comment count, post URL, date | Subreddits are US-dominated by default. Filter by subreddit relevance to niche. |
| 2 | **YouTube Comments** | YouTube Data API v3 | Free (10,000 units/day quota) | Comments from top videos in niche (last 7 days), like count, reply count, video URL, comment text | Target US-based channels. Sort by relevance and recent. |
| 3 | **TikTok** | Apify TikTok Scraper actor | ~$5/1000 results | Video captions, hashtags, comment text, like count, share count, video URL, date | Filter by English language. TikTok skews younger US demographic. |
| 4 | **Google Trends + PAA** | pytrends (free) + SerpAPI ($50/mo for 5000 searches) | Free (pytrends) / ~$0.01/search (SerpAPI) | Trending queries, "People Also Ask" questions, related queries, interest over time, breakout topics | Geo-filter to US. PAA questions are direct video title candidates. |
| 5 | **Quora** | Apify Quora Scraper actor | ~$5/1000 results | Question titles, answer count, follow count, question URL, date, top answer snippet | Questions are pre-formatted video titles. High follow count = proven demand. |

### Cost Estimate Per Run
- Reddit (PRAW): Free
- YouTube Comments (API): Free
- TikTok (Apify): ~$0.05 (10 results)
- Google Trends (pytrends): Free
- Quora (Apify): ~$0.05 (10 results)
- AI Categorization (Claude Haiku via OpenRouter): ~$0.02
- **Total per run: ~$0.12**

---

## 4. Supabase Schema (New Tables)

All tables are added to the existing Vision GridAI Supabase instance. They reference `projects.id` as the niche identifier.

### Table: `research_runs`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| project_id | uuid (FK → projects.id) | Which niche/project this run belongs to |
| status | text | `pending` / `scraping` / `categorizing` / `complete` / `failed` |
| sources_completed | integer | 0-5, tracks progress |
| total_results | integer | Number of raw results collected |
| total_categories | integer | Number of organic clusters generated |
| lookback_days | integer | Default 7 |
| started_at | timestamptz | When the run was triggered |
| completed_at | timestamptz | When all processing finished |
| error_log | jsonb | Array of error objects if any source failed |
| created_at | timestamptz | Default now() |

### Table: `research_results`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| run_id | uuid (FK → research_runs.id) | Which run this belongs to |
| project_id | uuid (FK → projects.id) | Denormalized for faster queries |
| source | text | `reddit` / `youtube` / `tiktok` / `google_trends` / `quora` |
| raw_text | text | The original post title, comment, question, or query |
| source_url | text | Direct link to the original content |
| engagement_score | integer | Normalized score: upvotes + likes + comments + shares (weighted) |
| upvotes | integer | Source-specific: Reddit upvotes, YouTube likes, TikTok likes, Quora follows |
| comments | integer | Number of replies/comments on the source |
| shares | integer | TikTok shares, Reddit crossposts (0 for sources without share data) |
| posted_at | timestamptz | When the original content was posted |
| ai_video_title | text | AI-generated video topic title based on this result |
| category_id | uuid (FK → research_categories.id) | Assigned after AI categorization |
| metadata | jsonb | Source-specific extra data (subreddit name, hashtags, video ID, etc.) |
| created_at | timestamptz | Default now() |

### Table: `research_categories`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| run_id | uuid (FK → research_runs.id) | Which run this belongs to |
| project_id | uuid (FK → projects.id) | Denormalized |
| label | text | AI-generated category theme label (e.g., "Credit Score Recovery Anxiety") |
| summary | text | 2-3 sentence summary of what this cluster is about and why people care |
| total_engagement | integer | Sum of engagement_score for all results in this category |
| result_count | integer | How many of the 50 results fall into this category |
| rank | integer | Position in the ranked list (1 = highest engagement) |
| top_video_title | text | The single best video title candidate from this cluster |
| created_at | timestamptz | Default now() |

### RLS Policies
All three tables inherit the existing Vision GridAI RLS pattern:
- `SELECT`: Authenticated users can read rows where `project_id` matches their project membership
- `INSERT/UPDATE`: Service role only (n8n workflows use the service role key)

---

## 5. Pipeline Phases

### Phase 1: Environment Setup
**What:** Install dependencies, configure API credentials, create Supabase tables, set up Apify actors.
**Agency Agent:** `@devops-engineer`
**Directive:** `directives/01_environment_setup.md`
**Outputs:** Working API connections for all 5 sources, Supabase migration applied, Apify actors configured.

### Phase 2: Reddit Scraper Workflow
**What:** Build n8n workflow that accepts niche keywords, queries Reddit (PRAW or Apify), extracts top 10 posts by engagement from last 7 days, stores in `research_results`.
**Agency Agent:** `@api-developer`
**Directive:** `directives/02_reddit_scraper.md`
**Outputs:** n8n workflow node group, tested with sample niche.

### Phase 3: YouTube Comments Scraper Workflow
**What:** Build n8n workflow that searches YouTube for top videos in niche (last 7 days), pulls comments sorted by like count, extracts top 10 most-engaged comments, stores in `research_results`.
**Agency Agent:** `@api-developer`
**Directive:** `directives/03_youtube_scraper.md`
**Outputs:** n8n workflow node group, tested with sample niche.

### Phase 4: TikTok Scraper Workflow
**What:** Build n8n workflow that queries TikTok via Apify, extracts top 10 videos/comments by engagement in niche (last 7 days), stores in `research_results`.
**Agency Agent:** `@api-developer`
**Directive:** `directives/04_tiktok_scraper.md`
**Outputs:** n8n workflow node group, tested with sample niche.

### Phase 5: Google Trends + PAA Workflow
**What:** Build n8n workflow that queries pytrends for trending topics and SerpAPI for "People Also Ask" questions, extracts top 10 results, stores in `research_results`.
**Agency Agent:** `@api-developer`
**Directive:** `directives/05_google_trends_scraper.md`
**Outputs:** n8n workflow node group, tested with sample niche.

### Phase 6: Quora Scraper Workflow
**What:** Build n8n workflow that queries Quora via Apify, extracts top 10 questions by follow count and answer count in niche (last 7 days), stores in `research_results`.
**Agency Agent:** `@api-developer`
**Directive:** `directives/06_quora_scraper.md`
**Outputs:** n8n workflow node group, tested with sample niche.

### Phase 7: Orchestrator Workflow
**What:** Build the master n8n workflow that triggers all 5 scraper sub-workflows in parallel, tracks completion via `research_runs.sources_completed`, handles partial failures gracefully (if 1 source fails, the other 4 results are still usable).
**Agency Agent:** `@api-developer` + `@backend-architect`
**Directive:** `directives/07_orchestrator.md`
**Outputs:** Master workflow with error handling and progress tracking.

### Phase 8: AI Categorization Workflow
**What:** Build n8n workflow that triggers after all scrapers complete. Sends all 50 results to Claude Haiku via OpenRouter with a categorization prompt. AI clusters results into organic categories, generates labels, summaries, and a top video title per cluster. Results written to `research_categories` and `research_results.category_id` updated.
**Agency Agent:** `@prompt-engineer` + `@api-developer`
**Directive:** `directives/08_ai_categorization.md`
**Outputs:** Categorization workflow, tested prompt, ranking logic.

### Phase 9: Dashboard — Research Tab
**What:** Build the Research tab in the Vision GridAI React dashboard. Components: Run Research button, progress indicator, source-by-source results table (10 per source), ranked category cards with summary and top video title, engagement metrics visualization.
**Agency Agent:** `@frontend-developer`
**Directive:** `directives/09_dashboard_research_tab.md`
**Outputs:** React components, Supabase Realtime subscription for live progress, responsive layout.

### Phase 10: End-to-End Testing
**What:** Run a full research cycle for a test niche (e.g., "credit cards"). Verify all 5 sources return data, categorization produces meaningful clusters, dashboard displays correctly, error handling works when a source fails.
**Agency Agent:** `@qa-engineer`
**Directive:** `directives/10_e2e_testing.md`
**Outputs:** Test report, bug fixes, performance benchmarks.

---

## 6. GSD + Agency Agents Delegation Matrix

| Task Type | GSD Role | Agency Agent | How They Work Together |
|-----------|----------|-------------|----------------------|
| Planning a phase | GSD plans tasks, sets acceptance criteria | None (GSD solo) | GSD reads this AGENT.md and the relevant directive |
| Building an n8n workflow | GSD sequences the tasks | `@api-developer` writes the workflow JSON | GSD says "build the Reddit scraper," agent writes the nodes |
| Writing a scraping prompt | GSD identifies the requirement | `@prompt-engineer` crafts the prompt | GSD verifies prompt against directive spec |
| Building dashboard UI | GSD sequences components | `@frontend-developer` writes React code | GSD verifies against UI spec in directive |
| Debugging a failed scrape | GSD identifies the failure | `@api-developer` + `@devops-engineer` diagnose | GSD logs the fix and updates the directive |
| Database schema changes | GSD approves the migration | `@database-architect` writes the SQL | GSD verifies against schema in this AGENT.md |
| AI categorization logic | GSD defines requirements | `@prompt-engineer` + `@data-scientist` | GSD tests output quality and iterates |

---

## 7. File Structure

```
vision-gridai-platform/
├── AGENT.md                          ← This file (Topic Intelligence Engine DOE)
├── GUIDE.md                          ← Instructional document with phase-by-phase prompts
├── skills.md                         ← Skills reference map
├── skills.sh                         ← Environment setup and validation
├── directives/
│   ├── 01_environment_setup.md
│   ├── 02_reddit_scraper.md
│   ├── 03_youtube_scraper.md
│   ├── 04_tiktok_scraper.md
│   ├── 05_google_trends_scraper.md
│   ├── 06_quora_scraper.md
│   ├── 07_orchestrator.md
│   ├── 08_ai_categorization.md
│   ├── 09_dashboard_research_tab.md
│   └── 10_e2e_testing.md
├── workflows/
│   ├── research_orchestrator.json
│   ├── reddit_scraper.json
│   ├── youtube_scraper.json
│   ├── tiktok_scraper.json
│   ├── google_trends_scraper.json
│   ├── quora_scraper.json
│   └── ai_categorization.json
├── supabase/migrations/
│   └── xxx_research_tables.sql
└── dashboard/src/pages/
    └── Research.jsx
```

---

## 8. Engagement Score Normalization

Each source uses different engagement metrics. To rank across sources fairly, we normalize to a single `engagement_score`:

```
Reddit:       engagement_score = upvotes + (comments * 2)
YouTube:      engagement_score = likes + (replies * 3)
TikTok:       engagement_score = likes + (comments * 2) + (shares * 3)
Google Trends: engagement_score = search_interest_index * 10 (0-1000 scale)
Quora:        engagement_score = follows + (answers * 2)
```

Comment/reply counts are weighted higher because they indicate active discussion, not passive agreement. TikTok shares are weighted highest because sharing requires the most intent.

---

## 9. AI Categorization Prompt Structure

The categorization prompt sent to Claude Haiku follows this pattern:

```
You are a content strategist analyzing 50 discussion topics from 5 different online sources.
All topics are related to the niche: {niche_description}.

Your task:
1. Read all 50 topics below.
2. Group them into organic categories based on theme similarity. Do NOT force a fixed number of categories. Let the data determine how many clusters exist (typically 4-8).
3. For each category, provide:
   - A short, specific label (3-6 words, e.g., "Credit Score Recovery After Bankruptcy")
   - A 2-3 sentence summary explaining what this cluster is about and why the audience cares
   - The single best video title from the topics in this cluster
4. Rank categories by total engagement (sum of engagement_score for all topics in the category). Highest engagement = rank 1.

Topics:
{json_array_of_50_results}

Respond ONLY in JSON format. No preamble. No markdown.
```

---

## 10. Error Handling

| Failure | Response | Recovery |
|---------|----------|----------|
| Apify actor timeout | Log error, mark source as `failed` in research_runs.error_log | Orchestrator continues with remaining sources. Dashboard shows partial results with warning. |
| YouTube API quota exceeded | Log error, mark source as `failed` | Use cached results from most recent successful run for this source. Show "stale data" indicator. |
| Supabase write failure | Retry 3 times with exponential backoff | If all retries fail, dump results to local JSON file and alert operator. |
| AI categorization returns malformed JSON | Retry with stricter prompt (add "respond ONLY in valid JSON") | If retry fails, skip categorization and show raw results only. |
| All 5 sources fail | Mark run as `failed` | Dashboard shows error state with last successful run results. |

---

## 11. Self-Annealing

After every research run, the system improves itself:

1. **Scraping accuracy:** If a source consistently returns low-quality results (irrelevant posts, spam), update the search query logic in the directive.
2. **Categorization quality:** If categories are too broad or too granular, refine the AI prompt in `directives/08_ai_categorization.md`.
3. **Engagement weighting:** If the ranking consistently surfaces low-value topics, adjust the normalization weights in Section 8.
4. **Source reliability:** Track which sources have the highest failure rate. If a source fails more than 30% of runs, investigate and fix or replace.

Every fix is documented: update the directive, note the change, note the date.
