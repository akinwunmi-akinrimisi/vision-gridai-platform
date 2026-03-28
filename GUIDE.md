# Topic Intelligence Engine — Build Guide
## Superpowers + gstack + frontend-design + Agency Agents

**Version 2.0 | March 2026**
**Build methodology:** Superpowers (obra/superpowers) — primary
**Quality gates:** gstack (selective: `/qa`, `/browse`, `/careful`, `/freeze`, `/review` only)
**UI skill:** Anthropic frontend-design
**Reference:** Read `VisionGridAI_Platform_Agent.md` before using any prompt below.

---

## Build Methodology — How the Tools Work Together

### Superpowers (Primary — replaces GSD)

Superpowers manages the entire build lifecycle: specs → plans → subagent-driven execution. It lives at `docs/superpowers/` with plans and specs as markdown files.

**Superpowers workflow for each phase:**
```
1. Write a spec:     docs/superpowers/specs/{date}-{feature}.md
2. Create a plan:    docs/superpowers/plans/{date}-{feature}.md
3. Execute plan:     Superpowers subagent-driven-development reads the plan
                     and executes task-by-task with checkbox tracking
4. Verify:           Use /qa and /review from gstack
```

### gstack (Selective — 5 commands only)

Do NOT use gstack's planning skills (they conflict with Superpowers). Only these 5:

| Command | When to Trigger | What It Does |
|---------|----------------|--------------|
| `/qa` | After completing any workflow or React component | Runs quality assurance checks on the deliverable |
| `/browse` | When researching Apify actors, API docs, or third-party libraries | Opens browser-based research without leaving Claude Code |
| `/careful` | When writing AI categorization prompts or engagement scoring logic | Activates extra-careful mode for precision-critical work |
| `/freeze` | Before merging Topic Intelligence code into the main codebase | Locks current state to prevent accidental overwrites |
| `/review` | Before marking any phase complete | Full code review pass |

**Never use:** `/plan`, `/architect`, `/design`, or any gstack planning command.

### Anthropic frontend-design Skill

Installed via: `npx skills add https://github.com/anthropics/skills --skill frontend-design`

**When to use:** Before building ANY React component for the Research page or modifying CreateProjectModal. Read the SKILL.md first. It provides production-grade design patterns that override generic Tailwind approaches.

**Activation:** The skill auto-activates when Claude Code detects UI work. But explicitly reference it in prompts for best results:
```
Use the frontend-design skill. Read its SKILL.md before writing any JSX.
```

### Agency Agents (Specialists)

61 agents at `~/.claude/agents/`. They activate by context. Key agents for Topic Intelligence:

| Phase | Agent | Why |
|-------|-------|-----|
| TI-1 (Setup) | `@devops-engineer` | Supabase migration, Apify config, API credentials |
| TI-2–6 (Scrapers) | `@api-developer` | External API integration, pagination, rate limits |
| TI-5 (Google Trends) | `@data-scientist` | Trend interpretation, score normalization |
| TI-7 (Orchestrator) | `@backend-architect` | Parallel execution, state management, error recovery |
| TI-8 (Categorization) | `@prompt-engineer` | AI prompt crafting and iteration |
| TI-9 (Dashboard) | `@frontend-developer` | React components, Supabase Realtime, responsive design |
| TI-10 (Testing) | `@qa-engineer` | Test plans, edge cases, data integrity |

---

## Phase-by-Phase Prompts

### Phase TI-1: Environment Setup

**Objective:** Supabase migration, API credentials, Apify actors, connectivity tests.
**Agent:** `@devops-engineer`

**Superpowers step:** Create spec + plan, then execute.

**Prompt for Claude Code:**
```
Read VisionGridAI_Platform_Agent.md — specifically the Topic Intelligence Supabase Schema
section (research_runs, research_results, research_categories tables).

Use @devops-engineer.

Tasks:
1. Create supabase/migrations/002_research_tables.sql with all three tables,
   RLS policies, and the FK constraint. Apply to the live Supabase instance.
2. Verify Reddit access (PRAW or Apify). Test: fetch 5 posts from r/personalfinance.
3. Verify YouTube Data API v3. Test: search "credit cards tips", fetch 5 comments.
4. Verify TikTok via Apify. Test: "credit cards" query, 5 results.
5. Verify Google Trends via pytrends. Test: "credit cards" geo=US, 7 days.
6. Verify Quora via Apify. Test: "how to improve credit score", 5 results.

Do NOT proceed until all 5 sources return data. Log failures.
Use /careful for the SQL migration — schema errors are expensive to fix.
```

**Verify:** `/qa` then `/review`

---

### Phase TI-2: Reddit Scraper Workflow

**Agent:** `@api-developer`

**Prompt:**
```
Use @api-developer. Build the Reddit Scraper n8n workflow.

Read the Topic Intelligence section of VisionGridAI_Platform_Agent.md for the
engagement formula: upvotes + (comments * 2).

Build an n8n workflow that:
1. Accepts: derived_keywords (string[]), run_id (uuid), project_id (uuid)
2. Determines relevant subreddits (accept subreddit_list param, AI discovery later)
3. Fetches posts from last 7 days, sorted by engagement
4. Extracts: title, body (500 chars), subreddit, upvotes, comment_count, URL, timestamp
5. Calculates engagement_score
6. Ranks all posts, takes top 10
7. Writes to research_results (source = 'reddit')
8. Handles 429 rate limits (wait + retry), invalid subreddits (skip + log)
9. Returns { source: 'reddit', results_count: N, status: 'complete' }

Never hardcode API keys. Use n8n credentials.
Store workflow JSON in workflows/WF_RESEARCH_REDDIT.json.
Test with keywords = ["credit cards", "credit score"], subreddits = ["personalfinance", "CreditCards"].
```

**Verify:** `/qa`

---

### Phase TI-3: YouTube Comments Scraper

**Agent:** `@api-developer`

**Prompt:**
```
Use @api-developer. Build the YouTube Comments Scraper n8n workflow.

Engagement formula: likes + (replies * 3).

Build an n8n workflow that:
1. Accepts: derived_keywords, run_id, project_id
2. Searches YouTube for top 20 videos matching keywords, last 7 days, sorted by viewCount
3. Fetches commentThreads for top 10 videos (20 comments each)
4. Extracts: comment text (500 chars), like count, reply count, video URL, timestamp, video title
5. Calculates engagement_score, ranks, takes top 10
6. Writes to research_results (source = 'youtube')
7. Tracks API quota. Stop if approaching 10K daily limit.
8. Returns { source: 'youtube', results_count: N, status: 'complete' }

Store as workflows/WF_RESEARCH_YOUTUBE.json.
Test with keywords = ["best credit cards 2026"]. Log quota usage.
```

---

### Phase TI-4: TikTok Scraper

**Agent:** `@api-developer`

**Prompt:**
```
Use @api-developer. Build the TikTok Scraper n8n workflow via Apify.

Engagement formula: likes + (comments * 2) + (shares * 3).

Build an n8n workflow that:
1. Accepts: derived_keywords, run_id, project_id
2. Calls Apify TikTok Scraper: keywords joined, last 7 days, 30 results, English
3. Extracts: caption, hashtags, likes, comments, shares, URL, timestamp
4. Calculates engagement_score, ranks, takes top 10
5. Writes to research_results (source = 'tiktok')
6. Handles Apify timeout (increase to 120s), empty results (broaden keywords)
7. Returns { source: 'tiktok', results_count: N, status: 'complete' }

Store as workflows/WF_RESEARCH_TIKTOK.json.
```

---

### Phase TI-5: Google Trends + PAA

**Agent:** `@api-developer` + `@data-scientist`

**Prompt:**
```
Use @api-developer and @data-scientist. Build the Google Trends + PAA workflow.

Engagement formula: search_interest_index * 10. PAA questions get base score 500.
Breakout topics get 2x multiplier.

Build an n8n workflow that:
1. Accepts: derived_keywords, run_id, project_id
2. Queries pytrends: interest over time for each keyword, geo='US', 'now 7-d'
3. Extracts related queries (rising + top) and breakout topics (>5000% growth)
4. Queries SerpAPI for People Also Ask boxes per keyword
5. Combines all results, calculates engagement_score with multipliers
6. Ranks, takes top 10
7. Writes to research_results (source = 'google_trends')
8. Returns { source: 'google_trends', results_count: N, status: 'complete' }

Use /careful — the scoring normalization must be precise.
Store as workflows/WF_RESEARCH_GOOGLE_TRENDS.json.
```

---

### Phase TI-6: Quora Scraper

**Agent:** `@api-developer`

**Prompt:**
```
Use @api-developer. Build the Quora Scraper n8n workflow via Apify.

Engagement formula: follows + (answers * 2).

Build an n8n workflow that:
1. Accepts: derived_keywords, run_id, project_id
2. Calls Apify Quora Scraper per keyword, 20 results each
3. Deduplicates by question URL
4. Extracts: question title, answer count, follower count, URL, last activity date, answer snippet
5. Calculates engagement_score, ranks, takes top 10
6. Writes to research_results (source = 'quora')
7. Returns { source: 'quora', results_count: N, status: 'complete' }

Store as workflows/WF_RESEARCH_QUORA.json.
```

---

### Phase TI-7: Orchestrator

**Agent:** `@backend-architect` + `@api-developer`

**Prompt:**
```
Use @backend-architect and @api-developer. Build the Research Orchestrator.

Read the error handling table in VisionGridAI_Platform_Agent.md.

Build a master n8n workflow that:
1. Accepts: project_id (from webhook)
2. Reads niche + niche_description from projects table
3. Derives keywords via Claude Haiku (OpenRouter):
   "Given niche: {niche}, description: {niche_description}, generate 5-8 search keywords.
   Return ONLY a JSON array."
4. Creates research_runs row: status='scraping', stores derived_keywords
5. Triggers all 5 scrapers IN PARALLEL (n8n Execute Workflow):
   WF_RESEARCH_REDDIT, WF_RESEARCH_YOUTUBE, WF_RESEARCH_TIKTOK,
   WF_RESEARCH_GOOGLE_TRENDS, WF_RESEARCH_QUORA
6. Increments sources_completed as each returns
7. If a sub-workflow fails: logs to error_log JSONB, does NOT abort others
8. When all complete: counts total_results. If >= 10, sets status='categorizing'
   and triggers AI categorization. If < 10, sets status='failed'.
9. Exposes webhook: POST /webhook/research/run with body { project_id: uuid }

Store as workflows/WF_RESEARCH_ORCHESTRATOR.json.
Test: trigger webhook, verify parallel execution, test failure recovery.
Use /careful for the parallel coordination logic.
```

---

### Phase TI-8: AI Categorization

**Agent:** `@prompt-engineer` + `@api-developer`

**Prompt:**
```
Use @prompt-engineer and @api-developer. Build the AI Categorization workflow.

Read the AI Categorization Prompt in VisionGridAI_Platform_Agent.md.

Build an n8n workflow that:
1. Triggers after orchestrator sets status='categorizing'
2. Fetches all research_results for this run_id
3. Sends categorization prompt to Claude Haiku via OpenRouter (temp 0.3)
4. Parses JSON response into categories
5. For each category: creates research_categories row with label, summary,
   top_video_title, total_engagement, result_count, rank
6. Updates each research_result's category_id
7. Generates ai_video_title for each result (batch prompt to Haiku)
8. Updates research_runs: status='complete', total_categories=N, completed_at=now()

Handle malformed JSON: strip markdown fences, retry with stricter prompt.
Store as workflows/WF_RESEARCH_CATEGORIZE.json.
Use /careful for the categorization prompt — it determines output quality.
```

---

### Phase TI-9: Dashboard

**Agent:** `@frontend-developer`

**Prompt:**
```
Use @frontend-developer. Use the frontend-design skill — read its SKILL.md first.
Read design-system/MASTER.md for the Neon Pipeline color system.

Build the Topic Intelligence dashboard integration:

1. NEW PAGE: dashboard/src/pages/Research.jsx at route /research
   - Header: "Topic Research" + "Run Research" button + project selector dropdown
   - Progress: Supabase Realtime on research_runs, show per-source status pills
   - Ranked Categories: cards ordered by rank (gold/silver/bronze badges),
     each with label, summary, top_video_title, "Use This Topic" copy button,
     engagement score, result count, expandable to see all results
   - Source Tabs: Reddit | YouTube | TikTok | Google Trends | Quora
     Each tab: 10-row table with raw_text, ai_video_title, engagement_score
     (tooltip breakdown), source URL, posted date, category badge
   - Summary bar: totals, top category, run duration, cost estimate

2. NEW HOOK: dashboard/src/hooks/useResearch.js
   - Queries research_runs, research_results, research_categories
   - Supabase Realtime subscription for live progress

3. MODIFY: dashboard/src/components/projects/CreateProjectModal.jsx
   - Add "From Research (optional)" section above niche input
   - Category filter dropdown → topic dropdown → auto-fills niche + description
   - "No research data" state shows link to /research
   - "OR enter manually below" separator
   - Selecting research topic is optional, manual entry always works

4. MODIFY: dashboard/src/App.jsx
   - Add: const Research = lazy(() => import('./pages/Research'));
   - Add: <Route path="/research" element={<Research />} />

5. MODIFY: dashboard/src/components/layout/Sidebar.jsx
   - Add global nav item: { label: 'Topic Research', icon: Microscope, path: '/research' }
   - Position: above the project-scoped nav

Follow the existing pattern: shadcn/ui components, Tailwind utility classes,
React Query for data fetching, Supabase Realtime for subscriptions.
Use /qa after building, then /review before marking complete.
```

---

### Phase TI-10: End-to-End Testing

**Agent:** `@qa-engineer`

**Prompt:**
```
Use @qa-engineer. Run comprehensive E2E testing.

TEST 1 — Happy Path (CardMath niche):
- Select CardMath project, click "Run Research" on /research
- Time full run (target: under 3 minutes)
- Verify: 50 results, 4-8 categories, all URLs valid, categories meaningful

TEST 2 — Different Niche (stoic philosophy):
- Create test project, run research
- Verify results are relevant, categories differ from Test 1

TEST 3 — Partial Failure:
- Disable TikTok scraper, run research
- Verify: 4/5 sources complete, error logged, categorization runs on 40 results

TEST 4 — CreateProjectModal Integration:
- Open CreateProjectModal, verify "From Research" dropdown populates
- Select a category filter, select a topic, verify auto-fill
- Verify manual entry still works when dropdown is ignored

TEST 5 — Data Integrity:
- Spot-check 5 source URLs (1 per source), verify content matches raw_text

TEST 6 — Performance + Cost:
- Log per-source timing, total run time, Apify costs, OpenRouter cost

Use /qa for each test. Use /review for the final report.
Fix bugs before marking complete.
```

---

## Prompt Sequence Quick Reference

| Step | Agent | Tool Commands | Description |
|------|-------|--------------|-------------|
| TI-1 | `@devops-engineer` | `/careful` → `/qa` → `/review` | Environment + migration |
| TI-2 | `@api-developer` | `/qa` | Reddit scraper |
| TI-3 | `@api-developer` | `/qa` | YouTube scraper |
| TI-4 | `@api-developer` | `/qa` | TikTok scraper |
| TI-5 | `@api-developer` + `@data-scientist` | `/careful` → `/qa` | Google Trends + PAA |
| TI-6 | `@api-developer` | `/qa` | Quora scraper |
| TI-7 | `@backend-architect` | `/careful` → `/qa` → `/review` | Orchestrator |
| TI-8 | `@prompt-engineer` | `/careful` → `/qa` | AI categorization |
| TI-9 | `@frontend-developer` | frontend-design skill → `/qa` → `/review` | Dashboard + modal |
| TI-10 | `@qa-engineer` | `/qa` → `/review` | E2E testing |
