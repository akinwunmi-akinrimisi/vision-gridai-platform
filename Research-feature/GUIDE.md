# Topic Intelligence Engine — Instructional Guide
## Phase-by-Phase Prompts, Roles, and Execution Sequences

**Version 1.0 | March 2026**
**Tools:** GSD + Agency Agents + n8n MCP + Synta MCP
**Reference:** Read `AGENT.md` before using any prompt in this guide.

---

## How to Use This Guide

Each phase below contains:
- **Objective:** What this phase accomplishes
- **Agency Agent Role:** Which specialist agent to invoke (from the 61 agency-agents)
- **Pre-Check:** What must exist before starting this phase
- **GSD Command:** The GSD slash command to run
- **Prompt:** The exact prompt to paste into Claude Code
- **Expected Output:** What you should see when the phase completes
- **Verification:** How to confirm success

Phases are sequential. Do not skip ahead. GSD enforces this, but the guide makes it explicit.

---

## Phase 0: Project Initialization

**Objective:** Set up the project in GSD, confirm all tools are accessible, and establish the working directory.

**Agency Agent Role:** None (GSD solo)

**Pre-Check:** Claude Code is open in the `vision-gridai-platform/` directory. GSD is installed. Agency Agents are accessible at `~/.claude/agents/`.

**GSD Command:**
```
/gsd:new-milestone
```

**Prompt:**
```
New milestone: "Topic Intelligence Engine v1.0"

This is a research module that adds a Research tab to the Vision GridAI dashboard.
It scrapes 5 data sources (Reddit, YouTube Comments, TikTok, Google Trends + PAA, Quora),
collects the top 10 most-engaged discussions per source from the last 7 days,
stores everything in Supabase, runs AI categorization to cluster results into
ranked topic groups, and displays it all on a dashboard tab.

Read AGENT.md for the full architecture, Supabase schema, pipeline phases,
and engagement scoring logic. Read GUIDE.md for phase-by-phase execution prompts.
Read skills.md for the skills reference. Run skills.sh to validate the environment.

This milestone has 10 phases. Plan Phase 1 first.
```

**Expected Output:** GSD creates `.planning/` state files and presents the Phase 1 plan.

---

## Phase 1: Environment Setup

**Objective:** Install all dependencies, configure API credentials, create Supabase tables, register Apify actors, and verify connectivity to all 5 data sources.

**Agency Agent Role:** `@devops-engineer`
> You are the DevOps Automator agent. Your expertise is infrastructure setup, dependency management, Docker configuration, and environment validation. You ensure every service is reachable and every credential is properly stored before any workflow is built.

**Pre-Check:** Phase 0 complete. GSD has planned Phase 1.

**GSD Command:**
```
/gsd:execute-phase 1
```

**Prompt:**
```
Use @devops-engineer to execute Phase 1: Environment Setup.

Read AGENT.md Section 3 (The 5 Data Sources) and Section 4 (Supabase Schema).

Tasks:
1. Create the Supabase migration file at supabase/migrations/xxx_research_tables.sql
   with all three tables (research_runs, research_results, research_categories)
   exactly as specified in AGENT.md Section 4. Include RLS policies.
   Apply the migration to the live Supabase instance via n8n MCP or direct connection.

2. Verify Reddit access:
   - If using PRAW: Confirm Reddit API credentials exist in n8n credentials store.
     Test with a simple subreddit fetch (r/test, last 7 days, 5 posts).
   - If using Apify: Confirm the Reddit Scraper actor is accessible.
     Test with a sample run (r/personalfinance, last 7 days, 5 posts).

3. Verify YouTube Data API v3:
   - Confirm the API key exists in n8n credentials store.
   - Test with a search query ("credit cards tips 2026", last 7 days, 5 results)
     followed by a commentThreads fetch on the top result.

4. Verify TikTok via Apify:
   - Confirm the TikTok Scraper actor is accessible and Apify API token is in n8n credentials.
   - Test with a sample run ("credit cards", last 7 days, 5 results).

5. Verify Google Trends:
   - If using pytrends: Test a trending query for "credit cards" geo=US.
   - If using SerpAPI: Confirm API key exists, test a "People Also Ask" query.

6. Verify Quora via Apify:
   - Confirm the Quora Scraper actor is accessible.
   - Test with a sample run ("how to improve credit score", 5 results).

7. Run skills.sh to validate the full environment.

Do NOT proceed to Phase 2 until all 5 sources return test data successfully.
Log any failures to AGENT.md Section 10 error handling patterns.
```

**Expected Output:**
- `supabase/migrations/xxx_research_tables.sql` created and applied
- All 5 data sources return test data
- `skills.sh` passes all checks
- Any issues logged and resolved

**Verification:**
```
Run skills.sh and confirm all checks pass. Then manually verify each Supabase table
exists by running: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
AND table_name LIKE 'research_%';
```

---

## Phase 2: Reddit Scraper Workflow

**Objective:** Build the n8n workflow that scrapes Reddit for the top 10 posts in a given niche from the last 7 days, ranked by engagement.

**Agency Agent Role:** `@api-developer`
> You are the API Developer agent. Your expertise is integrating external APIs, handling authentication, pagination, rate limits, and data transformation. You build reliable data pipelines that fail gracefully.

**Pre-Check:** Phase 1 complete. Supabase tables exist. Reddit API access verified.

**GSD Command:**
```
/gsd:execute-phase 2
```

**Prompt:**
```
Use @api-developer to build the Reddit Scraper n8n workflow.

Read AGENT.md Section 3 (Reddit source spec) and Section 8 (Engagement Score Normalization).
Read directives/02_reddit_scraper.md if it exists; if not, use AGENT.md as the source of truth.

Build an n8n workflow that:
1. Accepts input parameters: niche_keywords (string array), run_id (uuid), project_id (uuid)
2. Determines relevant subreddits for the niche. For the initial build, accept a
   subreddit_list parameter. Later phases can add AI-powered subreddit discovery.
3. For each subreddit, fetch posts from the last 7 days sorted by engagement (hot/top).
4. For each post, extract: title, body text (first 500 chars), subreddit name,
   upvotes, comment count, post URL, posted timestamp.
5. Calculate engagement_score using AGENT.md formula: upvotes + (comments * 2).
6. Rank all posts across all subreddits by engagement_score descending.
7. Take the top 10.
8. Write each result to Supabase research_results table with:
   - source = 'reddit'
   - raw_text = post title + " | " + body text snippet
   - source_url = full Reddit post URL
   - engagement_score = calculated score
   - upvotes = post upvotes
   - comments = post comment count
   - shares = 0 (Reddit crosspost count if available, else 0)
   - posted_at = post creation timestamp
   - metadata = { subreddit: name, post_id: id, flair: flair_text }
9. Handle errors: if Reddit API returns 429 (rate limit), wait and retry.
   If a subreddit doesn't exist, skip it and log the error.
10. On completion, return { source: 'reddit', results_count: N, status: 'complete' }.

Use n8n MCP to create the workflow. Store the workflow JSON in workflows/reddit_scraper.json.
Test with niche_keywords = ["credit cards", "credit score"] and subreddits =
["personalfinance", "CreditCards", "churning"].
```

**Expected Output:**
- `workflows/reddit_scraper.json` created
- n8n workflow deployed and tested
- 10 results written to `research_results` table
- Error handling tested (invalid subreddit, rate limit simulation)

**Verification:**
```
Query Supabase: SELECT source, raw_text, engagement_score, source_url
FROM research_results WHERE run_id = '{test_run_id}' AND source = 'reddit'
ORDER BY engagement_score DESC;
Confirm 10 rows returned, all with valid URLs and engagement scores > 0.
```

---

## Phase 3: YouTube Comments Scraper Workflow

**Objective:** Build the n8n workflow that finds top niche videos from the last 7 days and extracts the most-engaged comments.

**Agency Agent Role:** `@api-developer`
> Same role as Phase 2. Specializing in YouTube Data API v3 quota management and pagination.

**Pre-Check:** Phase 2 complete. YouTube API access verified.

**GSD Command:**
```
/gsd:execute-phase 3
```

**Prompt:**
```
Use @api-developer to build the YouTube Comments Scraper n8n workflow.

Read AGENT.md Section 3 (YouTube source spec) and Section 8 (Engagement Score Normalization).

Build an n8n workflow that:
1. Accepts input parameters: niche_keywords (string array), run_id (uuid), project_id (uuid)
2. Uses YouTube Data API v3 search.list to find the top 20 videos matching
   niche_keywords, published in the last 7 days, ordered by viewCount.
   Quota cost: 100 units per search.
3. For each of the top 10 videos, fetch commentThreads.list sorted by relevance.
   Quota cost: 1 unit per commentThreads call. Fetch top 20 comments per video.
4. For each comment, extract: comment text (first 500 chars), like count,
   reply count, video URL, comment publish timestamp, video title.
5. Calculate engagement_score using AGENT.md formula: likes + (replies * 3).
6. Pool all comments from all videos, rank by engagement_score descending.
7. Take the top 10.
8. Write to Supabase research_results with:
   - source = 'youtube'
   - raw_text = comment text
   - source_url = video URL + comment timestamp anchor if available
   - engagement_score = calculated score
   - upvotes = comment like count
   - comments = reply count
   - shares = 0
   - posted_at = comment publish timestamp
   - metadata = { video_id: id, video_title: title, channel_name: name }
9. Track API quota usage. If approaching 10,000 daily limit, stop and log warning.
10. On completion, return { source: 'youtube', results_count: N, status: 'complete' }.

Test with niche_keywords = ["best credit cards 2026"].
Monitor quota usage during test — log total units consumed.
```

**Expected Output:**
- `workflows/youtube_scraper.json` created
- n8n workflow deployed and tested
- 10 results written to `research_results` table
- Quota usage logged (should be under 300 units for a standard run)

**Verification:**
```
Query Supabase: SELECT raw_text, engagement_score, metadata->>'video_title' as video
FROM research_results WHERE run_id = '{test_run_id}' AND source = 'youtube'
ORDER BY engagement_score DESC;
Confirm 10 rows with valid comment text and video references.
```

---

## Phase 4: TikTok Scraper Workflow

**Objective:** Build the n8n workflow that scrapes TikTok for trending niche content via Apify.

**Agency Agent Role:** `@api-developer`
> Same role. Specializing in Apify actor orchestration and TikTok data extraction.

**Pre-Check:** Phase 3 complete. Apify TikTok actor access verified.

**GSD Command:**
```
/gsd:execute-phase 4
```

**Prompt:**
```
Use @api-developer to build the TikTok Scraper n8n workflow.

Read AGENT.md Section 3 (TikTok source spec) and Section 8 (Engagement Score Normalization).

Build an n8n workflow that:
1. Accepts input parameters: niche_keywords (string array), run_id (uuid), project_id (uuid)
2. Calls the Apify TikTok Scraper actor with:
   - Search query: niche_keywords joined with spaces
   - Time filter: last 7 days
   - Result limit: 30 (we'll take top 10 by engagement)
   - Language filter: English
3. For each result, extract: video caption/description, hashtags (as array),
   like count, comment count, share count, video URL, posted timestamp.
4. Calculate engagement_score: likes + (comments * 2) + (shares * 3).
5. Rank by engagement_score descending, take top 10.
6. Write to Supabase research_results with:
   - source = 'tiktok'
   - raw_text = video caption
   - source_url = TikTok video URL
   - engagement_score = calculated score
   - upvotes = like count
   - comments = comment count
   - shares = share count
   - posted_at = video posted timestamp
   - metadata = { hashtags: [...], video_id: id, author: username }
7. Handle Apify-specific errors: actor timeout (increase timeout to 120s),
   empty results (try broader keywords), rate limits (wait and retry).
8. On completion, return { source: 'tiktok', results_count: N, status: 'complete' }.

Test with niche_keywords = ["credit card rewards", "credit score tips"].
```

**Expected Output:**
- `workflows/tiktok_scraper.json` created
- n8n workflow deployed and tested
- 10 results written to `research_results` table
- Apify costs logged (~$0.05 for 30 results)

**Verification:**
```
SELECT raw_text, engagement_score, shares, metadata->>'hashtags' as tags
FROM research_results WHERE run_id = '{test_run_id}' AND source = 'tiktok'
ORDER BY engagement_score DESC;
Confirm 10 rows with valid captions, URLs, and non-zero engagement.
```

---

## Phase 5: Google Trends + PAA Workflow

**Objective:** Build the n8n workflow that extracts trending search queries and "People Also Ask" questions.

**Agency Agent Role:** `@api-developer` + `@data-scientist`
> @api-developer handles the API integration. @data-scientist helps interpret trend data and normalize the interest index into a comparable engagement score.

**Pre-Check:** Phase 4 complete. pytrends or SerpAPI access verified.

**GSD Command:**
```
/gsd:execute-phase 5
```

**Prompt:**
```
Use @api-developer and @data-scientist to build the Google Trends + PAA workflow.

Read AGENT.md Section 3 (Google Trends source spec) and Section 8 (Engagement Normalization).

Build an n8n workflow that:
1. Accepts input parameters: niche_keywords (string array), run_id (uuid), project_id (uuid)
2. Google Trends component (pytrends or SerpAPI):
   - Query interest over time for each niche_keyword, geo='US', timeframe='now 7-d'
   - Extract related queries (rising and top) for each keyword
   - Extract breakout topics (queries with >5000% growth)
3. People Also Ask component (SerpAPI):
   - For each niche_keyword, fetch the PAA box from Google Search results
   - Extract the question text and brief answer snippet
4. Combine all results (trending queries + related queries + PAA questions).
5. Calculate engagement_score: search_interest_index * 10 for trends,
   PAA questions get a base score of 500 (they represent proven search intent).
   Breakout topics get a 2x multiplier.
6. Rank by engagement_score descending, take top 10.
7. Write to Supabase research_results with:
   - source = 'google_trends'
   - raw_text = the query or question text
   - source_url = Google Trends URL for the query or Google search URL for PAA
   - engagement_score = calculated score
   - upvotes = raw interest index (0-100 for trends, 0 for PAA)
   - comments = 0
   - shares = 0
   - posted_at = current timestamp (trends don't have individual post dates)
   - metadata = { type: 'trending'|'related'|'breakout'|'paa', interest_index: N, answer_snippet: text }
8. On completion, return { source: 'google_trends', results_count: N, status: 'complete' }.

Test with niche_keywords = ["credit cards", "credit score", "rewards points"].
```

**Expected Output:**
- `workflows/google_trends_scraper.json` created
- Mix of trending queries, related queries, and PAA questions in results
- Breakout topics (if any) ranked highest due to 2x multiplier

**Verification:**
```
SELECT raw_text, engagement_score, metadata->>'type' as query_type
FROM research_results WHERE run_id = '{test_run_id}' AND source = 'google_trends'
ORDER BY engagement_score DESC;
Confirm 10 rows with a mix of query types.
```

---

## Phase 6: Quora Scraper Workflow

**Objective:** Build the n8n workflow that scrapes Quora for the most-followed questions in the niche.

**Agency Agent Role:** `@api-developer`

**Pre-Check:** Phase 5 complete. Apify Quora actor access verified.

**GSD Command:**
```
/gsd:execute-phase 6
```

**Prompt:**
```
Use @api-developer to build the Quora Scraper n8n workflow.

Read AGENT.md Section 3 (Quora source spec) and Section 8 (Engagement Normalization).

Build an n8n workflow that:
1. Accepts input parameters: niche_keywords (string array), run_id (uuid), project_id (uuid)
2. Calls the Apify Quora Scraper actor with:
   - Search queries: each niche_keyword individually
   - Result limit: 20 per keyword (we'll deduplicate and take top 10)
3. For each question, extract: question title, answer count, follower count,
   question URL, first answer snippet (first 300 chars), last activity date.
4. Deduplicate by question URL.
5. Calculate engagement_score: follows + (answers * 2).
6. Rank by engagement_score descending, take top 10.
7. Write to Supabase research_results with:
   - source = 'quora'
   - raw_text = question title
   - source_url = Quora question URL
   - engagement_score = calculated score
   - upvotes = follower count
   - comments = answer count
   - shares = 0
   - posted_at = last activity date or current timestamp if unavailable
   - metadata = { answer_snippet: text, topic_tags: [...] if available }
8. On completion, return { source: 'quora', results_count: N, status: 'complete' }.

Test with niche_keywords = ["credit cards", "credit score improvement", "best rewards cards"].
```

**Expected Output:**
- `workflows/quora_scraper.json` created
- 10 questions stored, mostly high-follow-count questions
- Questions are near-ready video titles (Quora questions translate directly)

**Verification:**
```
SELECT raw_text, engagement_score, upvotes as followers, comments as answers
FROM research_results WHERE run_id = '{test_run_id}' AND source = 'quora'
ORDER BY engagement_score DESC;
Confirm 10 rows with question-formatted text.
```

---

## Phase 7: Orchestrator Workflow

**Objective:** Build the master n8n workflow that coordinates all 5 scrapers, tracks progress, and handles partial failures.

**Agency Agent Role:** `@api-developer` + `@backend-architect`
> @backend-architect designs the coordination logic, error recovery, and state management. @api-developer implements the n8n workflow nodes.

**Pre-Check:** Phases 2-6 complete. All 5 scraper workflows exist and are individually tested.

**GSD Command:**
```
/gsd:execute-phase 7
```

**Prompt:**
```
Use @backend-architect and @api-developer to build the Research Orchestrator workflow.

Read AGENT.md Section 2 (System Overview), Section 4 (research_runs table), and Section 10 (Error Handling).

Build a master n8n workflow that:
1. Accepts input: project_id (uuid), niche_keywords (string array from project config)
2. Creates a new row in research_runs with status = 'scraping', sources_completed = 0
3. Triggers all 5 scraper sub-workflows IN PARALLEL using n8n's Execute Workflow node:
   - reddit_scraper (pass run_id, project_id, niche_keywords)
   - youtube_scraper (same params)
   - tiktok_scraper (same params)
   - google_trends_scraper (same params)
   - quora_scraper (same params)
4. As each sub-workflow completes, increment research_runs.sources_completed
5. If a sub-workflow fails:
   - Log the error to research_runs.error_log (append to JSONB array)
   - Do NOT abort the entire run. Continue with remaining sources.
   - Mark the source as failed in error_log with { source: 'xxx', error: 'message', timestamp: now }
6. Once all 5 have completed (or failed):
   - Count total results in research_results for this run_id
   - Update research_runs.total_results
   - If total_results >= 10 (at least 2 sources succeeded):
     Update status to 'categorizing' and trigger the AI Categorization workflow (Phase 8)
   - If total_results < 10:
     Update status to 'failed' with error "insufficient data"
7. Expose a webhook endpoint that the dashboard can call to trigger a new research run.
   Webhook payload: { project_id: uuid }
   The workflow reads niche_keywords from the projects table in Supabase.

Test end-to-end: trigger the webhook, confirm all 5 scrapers run,
confirm research_runs row updates in real time (watch sources_completed increment).
Then test failure recovery: temporarily break one scraper and confirm the other 4 still complete.
```

**Expected Output:**
- `workflows/research_orchestrator.json` created
- Webhook endpoint active
- Parallel execution confirmed (all 5 start within seconds of each other)
- Failure recovery tested (4/5 sources complete successfully when 1 breaks)

**Verification:**
```
SELECT status, sources_completed, total_results, error_log
FROM research_runs WHERE id = '{test_run_id}';
Confirm sources_completed = 5 (or 4 if testing failure), total_results = 50 (or 40),
and status = 'categorizing'.
```

---

## Phase 8: AI Categorization Workflow

**Objective:** Build the n8n workflow that sends all collected results to Claude Haiku for organic clustering, ranking, and video title generation.

**Agency Agent Role:** `@prompt-engineer` + `@api-developer`
> @prompt-engineer crafts and iterates on the categorization prompt. @api-developer builds the n8n workflow and handles the OpenRouter API integration.

**Pre-Check:** Phase 7 complete. At least one full research run exists with 50 results.

**GSD Command:**
```
/gsd:execute-phase 8
```

**Prompt:**
```
Use @prompt-engineer and @api-developer to build the AI Categorization workflow.

Read AGENT.md Section 9 (AI Categorization Prompt Structure) and Section 4 (research_categories table).

Build an n8n workflow that:
1. Triggers after the orchestrator sets research_runs.status = 'categorizing'
2. Fetches all research_results for this run_id from Supabase
3. Constructs the prompt from AGENT.md Section 9, injecting:
   - niche_description (from projects table)
   - JSON array of all results (id, source, raw_text, engagement_score, source_url)
4. Sends the prompt to Claude Haiku via OpenRouter API:
   - model: anthropic/claude-3.5-haiku
   - max_tokens: 4000
   - temperature: 0.3 (low for consistent categorization)
5. Parses the JSON response. Expected structure:
   {
     "categories": [
       {
         "label": "string",
         "summary": "string",
         "top_video_title": "string",
         "result_ids": ["uuid", "uuid", ...]
       }
     ]
   }
6. For each category:
   - Create a row in research_categories with label, summary, top_video_title
   - Calculate total_engagement by summing engagement_score of all result_ids
   - Set result_count
   - Rank categories by total_engagement descending (rank 1 = highest)
7. Update each research_result's category_id based on the mapping
8. Generate an ai_video_title for each result individually:
   - Send a second batch prompt to Claude Haiku:
     "For each topic below, generate a compelling YouTube video title (under 60 chars).
      Niche: {niche}. Topics: {array of raw_text + source}"
   - Update research_results.ai_video_title for each row
9. Update research_runs: status = 'complete', total_categories = N, completed_at = now()

Handle malformed JSON: if Claude returns invalid JSON, strip markdown fences,
attempt re-parse. If still invalid, retry with stricter prompt (add explicit
"No markdown, no backticks, just raw JSON"). If retry fails, set status = 'complete'
but leave categories empty — dashboard shows raw results without clustering.

Test with the existing 50 results from Phase 7 testing.
Log the OpenRouter API cost (should be ~$0.02).
```

**Expected Output:**
- `workflows/ai_categorization.json` created
- 4-8 organic categories generated with labels and summaries
- Each of the 50 results assigned to a category
- Each result has an `ai_video_title`
- Categories ranked by total engagement

**Verification:**
```
SELECT rank, label, summary, total_engagement, result_count, top_video_title
FROM research_categories WHERE run_id = '{test_run_id}'
ORDER BY rank ASC;
Confirm categories are meaningful (not generic like "Miscellaneous"),
ranked correctly, and summaries explain the cluster clearly.

SELECT source, raw_text, ai_video_title, rc.label as category
FROM research_results rr
JOIN research_categories rc ON rr.category_id = rc.id
WHERE rr.run_id = '{test_run_id}'
ORDER BY rr.engagement_score DESC LIMIT 20;
Confirm ai_video_title is a real video title (not a description or summary).
```

---

## Phase 9: Dashboard — Research Tab

**Objective:** Build the Research tab in the Vision GridAI React dashboard with real-time progress tracking and full results display.

**Agency Agent Role:** `@frontend-developer`
> You are the Frontend Developer agent. Your expertise is React components, Tailwind CSS, data visualization, and real-time UI updates. You build interfaces that are clean, functional, and fast. Read the Vision GridAI design system at design-system/MASTER.md before building any component.

**Pre-Check:** Phase 8 complete. Full dataset exists in Supabase (research_runs, research_results, research_categories).

**GSD Command:**
```
/gsd:execute-phase 9
```

**Prompt:**
```
Use @frontend-developer to build the Research tab.

Read AGENT.md Section 2 (System Overview), Section 4 (Supabase Schema), and
Section 8 (Engagement Scoring). Read design-system/MASTER.md for styling rules.

Build dashboard/src/pages/Research.jsx with these components:

1. HEADER SECTION:
   - Page title: "Topic Research"
   - "Run Research" button (triggers the orchestrator webhook)
   - Displays last run timestamp and status
   - Niche context indicator (shows which project/niche is selected)

2. PROGRESS SECTION (visible only during active runs):
   - Progress bar showing sources_completed / 5
   - Individual source status pills: Reddit [done], YouTube [running], TikTok [pending]...
   - Subscribe to Supabase Realtime on research_runs table for live updates
   - Auto-transitions to results view when status changes to 'complete'

3. RANKED CATEGORIES SECTION:
   - Cards for each category, ordered by rank (highest engagement first)
   - Each card shows:
     - Rank badge (#1, #2, #3...)
     - Category label (large text)
     - Summary text (2-3 sentences)
     - Top video title (highlighted, this is the primary actionable output)
     - Total engagement score
     - Result count ("12 of 50 topics")
     - Expand/collapse to see all results in this category
   - The top video title has a "Use This Topic" button that copies it
     to clipboard (future: feeds into script generation)

4. SOURCE-BY-SOURCE BREAKDOWN SECTION:
   - Tab navigation: Reddit | YouTube | TikTok | Google Trends | Quora
   - Each tab shows a table with:
     - Rank (1-10)
     - Raw text (truncated to 100 chars, expandable)
     - AI Video Title
     - Engagement Score (with breakdown tooltip: X upvotes, Y comments, Z shares)
     - Source URL (clickable, opens in new tab)
     - Posted date (relative: "3 days ago")
     - Category label (color-coded badge matching the category card)
   - Sort by engagement score (default) or by date

5. SUMMARY BAR:
   - Total results collected
   - Number of categories
   - Top category label
   - Run duration
   - Cost estimate for this run

Styling:
- Follow the Vision GridAI dark cinema design system
- Category rank badges: gold for #1, silver for #2, bronze for #3, neutral for rest
- Source pills use brand colors: Reddit (orange), YouTube (red),
  TikTok (black/cyan), Google (blue/green/yellow/red), Quora (red)
- Engagement scores use a heat gradient (green = high, yellow = medium, gray = low)
- Mobile responsive: cards stack vertically, table becomes scrollable

State management:
- Use React useState + useEffect for data fetching
- Subscribe to Supabase Realtime for live progress during active runs
- Cache the last run's results locally so the page loads instantly on revisit
```

**Expected Output:**
- `dashboard/src/pages/Research.jsx` created
- Research tab visible in the dashboard navigation
- Full results from Phase 8 test data displayed correctly
- Real-time progress tracking works during a live run
- All source tabs functional with sorting

**Verification:**
```
1. Load the dashboard, navigate to the Research tab
2. Confirm last test run results display (categories + source breakdown)
3. Click "Run Research" and watch progress update in real time
4. Verify each source tab shows 10 results sorted by engagement
5. Verify category cards are ranked correctly
6. Verify "Use This Topic" copies to clipboard
7. Test on mobile viewport (375px width)
```

---

## Phase 10: End-to-End Testing

**Objective:** Run a complete research cycle from button click to results display, verify data integrity, test error recovery, and benchmark performance.

**Agency Agent Role:** `@qa-engineer`
> You are the QA Engineer agent. Your expertise is test planning, edge case identification, data integrity verification, and performance benchmarking. You break things before users do.

**Pre-Check:** Phase 9 complete. All workflows deployed. Dashboard functional.

**GSD Command:**
```
/gsd:execute-phase 10
```

**Prompt:**
```
Use @qa-engineer to run comprehensive end-to-end testing.

Test Plan:

TEST 1 — Happy Path (CardMath niche):
- Set active project to "CardMath" with niche_keywords = ["credit cards", "credit score", "rewards points"]
- Click "Run Research" on the dashboard
- Time the full run (target: under 3 minutes)
- Verify: 50 results in research_results, 4-8 categories in research_categories,
  all engagement scores calculated, all URLs valid, all category labels meaningful
- Screenshot the dashboard results

TEST 2 — Different Niche (validate niche-agnostic):
- Create a test project with niche = "stoic philosophy"
  and keywords = ["stoicism", "Marcus Aurelius", "stoic quotes"]
- Run research. Verify results are relevant to stoicism, not credit cards.
- Verify categories are different from Test 1.

TEST 3 — Partial Failure Recovery:
- Temporarily disable the TikTok scraper workflow in n8n
- Run research
- Verify: 4 sources complete, TikTok shows as failed, error_log has the TikTok error,
  dashboard shows results for 4/5 sources with a warning indicator,
  categorization still runs on the 40 results

TEST 4 — Empty Niche (edge case):
- Create a test project with obscure keywords = ["xyzzy12345nonexistent"]
- Run research
- Verify: sources return 0 or near-0 results, run status = 'failed' with
  "insufficient data" error, dashboard shows meaningful error state

TEST 5 — Data Integrity:
- For the Test 1 run, manually spot-check 5 source URLs (1 per source)
- Click each URL and verify the content matches the raw_text stored in Supabase
- Verify engagement_score math is correct for each

TEST 6 — Performance:
- Log execution time per source
- Log total run time
- Log Apify costs
- Log OpenRouter API cost
- Compare against AGENT.md estimates

Report format: create a test report with pass/fail for each test,
screenshots where relevant, and a list of bugs found.
Fix any bugs before marking Phase 10 complete.
```

**Expected Output:**
- All 6 tests executed
- Test report generated
- Bugs fixed
- Performance benchmarks recorded
- Total cost per run validated

---

## Prompt Sequence Summary (Quick Reference)

For copy-pasting into Claude Code in order:

| Step | GSD Command | Agent | One-line Description |
|------|------------|-------|---------------------|
| 0 | `/gsd:new-milestone` | — | Initialize project in GSD |
| 1 | `/gsd:execute-phase 1` | `@devops-engineer` | Environment setup + Supabase tables |
| 2 | `/gsd:execute-phase 2` | `@api-developer` | Reddit scraper workflow |
| 3 | `/gsd:execute-phase 3` | `@api-developer` | YouTube comments scraper workflow |
| 4 | `/gsd:execute-phase 4` | `@api-developer` | TikTok scraper workflow |
| 5 | `/gsd:execute-phase 5` | `@api-developer` + `@data-scientist` | Google Trends + PAA workflow |
| 6 | `/gsd:execute-phase 6` | `@api-developer` | Quora scraper workflow |
| 7 | `/gsd:execute-phase 7` | `@api-developer` + `@backend-architect` | Orchestrator (parallel + error handling) |
| 8 | `/gsd:execute-phase 8` | `@prompt-engineer` + `@api-developer` | AI categorization + ranking |
| 9 | `/gsd:execute-phase 9` | `@frontend-developer` | Dashboard Research tab |
| 10 | `/gsd:execute-phase 10` | `@qa-engineer` | E2E testing + bug fixes |
