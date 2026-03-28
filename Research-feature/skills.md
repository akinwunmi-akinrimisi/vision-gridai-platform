# Skills Reference — Topic Intelligence Engine
## Vision GridAI Research Module

**Version 1.0 | March 2026**

---

## Overview

This document maps every technical skill required across all 10 phases of the Topic Intelligence Engine. Each skill includes the tool, version, purpose, and which phase needs it. Use this alongside `skills.sh` to validate your environment before starting any phase.

---

## Skill Categories

### 1. Data Scraping and Collection

| Skill | Tool/Library | Version | Used In | Purpose |
|-------|-------------|---------|---------|---------|
| Reddit API | PRAW (Python Reddit API Wrapper) | 7.x | Phase 2 | Fetch posts, comments, upvotes from subreddits |
| Reddit Scraper (fallback) | Apify: apify/reddit-scraper | Latest | Phase 2 | Alternative if PRAW rate limits are too restrictive |
| YouTube Data API v3 | Google API Client | v3 | Phase 3 | Search videos, fetch commentThreads, track quota |
| TikTok Scraper | Apify: clockworks/tiktok-scraper | Latest | Phase 4 | Search TikTok videos, extract captions and engagement |
| Google Trends | pytrends | 4.x | Phase 5 | Interest over time, related queries, breakout detection |
| People Also Ask | SerpAPI | REST API | Phase 5 | Extract PAA boxes from Google Search results |
| Quora Scraper | Apify: apify/quora-scraper | Latest | Phase 6 | Search questions, extract follow count and answers |

### 2. Data Storage and Querying

| Skill | Tool | Version | Used In | Purpose |
|-------|------|---------|---------|---------|
| PostgreSQL | Supabase (self-hosted) | 15.x | All phases | Primary data store for all research data |
| Supabase Realtime | Supabase JS Client | 2.x | Phase 9 | Live progress tracking on dashboard |
| SQL Migrations | Raw SQL | — | Phase 1 | Create research_runs, research_results, research_categories tables |
| Row Level Security | Supabase RLS | — | Phase 1 | Secure multi-project data access |
| JSONB Operations | PostgreSQL | — | Phases 7, 8 | Error log arrays, metadata storage, query filtering |

### 3. Workflow Orchestration

| Skill | Tool | Version | Used In | Purpose |
|-------|------|---------|---------|---------|
| n8n Workflows | n8n (self-hosted) | 1.x | Phases 2-8 | All scraping, orchestration, and categorization workflows |
| n8n Execute Workflow | n8n node | — | Phase 7 | Parallel sub-workflow execution |
| n8n Webhook | n8n node | — | Phase 7 | Dashboard trigger endpoint |
| n8n HTTP Request | n8n node | — | Phases 2-6, 8 | API calls to Apify, YouTube, OpenRouter |
| n8n Supabase | n8n node / HTTP | — | All phases | Read/write research data |
| n8n Error Handling | n8n Error Trigger | — | Phase 7 | Catch sub-workflow failures, continue execution |
| n8n MCP | MCP Server | — | All phases | Workflow creation and management from Claude Code |
| Synta MCP | MCP Server | — | As needed | External service orchestration and API discovery |

### 4. AI Processing

| Skill | Tool | Model | Used In | Purpose |
|-------|------|-------|---------|---------|
| Topic Categorization | OpenRouter API | anthropic/claude-3.5-haiku | Phase 8 | Cluster 50 results into organic categories |
| Video Title Generation | OpenRouter API | anthropic/claude-3.5-haiku | Phase 8 | Generate compelling YouTube titles from raw topics |
| Prompt Engineering | — | — | Phase 8 | Craft categorization and title generation prompts |

### 5. Frontend and Dashboard

| Skill | Tool | Version | Used In | Purpose |
|-------|------|---------|---------|---------|
| React | React | 18.x | Phase 9 | Dashboard page components |
| Tailwind CSS | Tailwind | 3.x | Phase 9 | Styling (following Vision GridAI design system) |
| Supabase JS Client | @supabase/supabase-js | 2.x | Phase 9 | Data fetching + Realtime subscriptions |
| Responsive Design | CSS / Tailwind | — | Phase 9 | Mobile-friendly layout |

### 6. Testing and Validation

| Skill | Tool | Used In | Purpose |
|-------|------|---------|---------|
| API Response Validation | Manual + scripts | Phase 10 | Verify source URLs resolve, data matches |
| Data Integrity Checks | SQL queries | Phase 10 | Engagement score math, foreign key consistency |
| Performance Benchmarking | Timing logs | Phase 10 | Track per-source and total execution time |
| Cost Tracking | Apify dashboard + OpenRouter logs | Phase 10 | Validate per-run cost against estimates |

### 7. Project Management

| Skill | Tool | Used In | Purpose |
|-------|------|---------|---------|
| GSD (Get Shit Done) | Claude Code skill | All phases | Phase planning, execution sequencing, verification |
| Agency Agents | 61 specialist agents | All phases | Domain expertise for each task type |
| DOE Framework | AGENT.md pattern | All phases | Directive-Observation-Experiment methodology |

---

## Skill-to-Phase Matrix

| Phase | Primary Skills | Secondary Skills |
|-------|---------------|-----------------|
| 0 — Init | GSD | — |
| 1 — Environment | PostgreSQL, Supabase, Apify setup, API key management | Docker, n8n config |
| 2 — Reddit | PRAW or Apify Reddit, n8n workflows, Supabase writes | Error handling |
| 3 — YouTube | YouTube Data API v3, quota management, n8n workflows | Pagination |
| 4 — TikTok | Apify TikTok actor, n8n workflows | Language filtering |
| 5 — Google Trends | pytrends, SerpAPI, n8n workflows | Data normalization |
| 6 — Quora | Apify Quora actor, n8n workflows | Deduplication |
| 7 — Orchestrator | n8n parallel execution, error handling, webhooks, Supabase Realtime | State management |
| 8 — AI Categorization | OpenRouter API, prompt engineering, JSON parsing | Retry logic |
| 9 — Dashboard | React, Tailwind, Supabase JS, Realtime subscriptions | Design system |
| 10 — Testing | SQL, API validation, performance profiling | Cost tracking |

---

## API Credential Checklist

All credentials must be stored in n8n's credential store. Never hardcode.

| Service | Credential Type | n8n Credential Name (suggested) | Required By |
|---------|----------------|--------------------------------|-------------|
| Reddit (PRAW) | OAuth client_id + client_secret | `reddit_api` | Phase 2 |
| Apify | API token | `apify_token` | Phases 2, 4, 6 |
| YouTube Data API v3 | API key | `youtube_api_key` | Phase 3 |
| Google (pytrends) | No auth needed | — | Phase 5 |
| SerpAPI | API key | `serpapi_key` | Phase 5 |
| OpenRouter | API key | `openrouter_api_key` | Phase 8 |
| Supabase | Service role key + URL | `supabase_service` | All phases |

---

## Cost Reference

| Service | Pricing Model | Estimated Cost Per Run | Monthly (4 runs/week) |
|---------|-------------- |----------------------|----------------------|
| Reddit (PRAW) | Free | $0.00 | $0.00 |
| YouTube Data API v3 | Free (10K units/day) | $0.00 | $0.00 |
| TikTok (Apify) | ~$5/1000 results | $0.05 | $0.80 |
| Google Trends (pytrends) | Free | $0.00 | $0.00 |
| SerpAPI | $50/mo for 5000 searches | $0.01 | $0.16 |
| Quora (Apify) | ~$5/1000 results | $0.05 | $0.80 |
| OpenRouter (Claude Haiku) | ~$0.25/M input, $1.25/M output | $0.02 | $0.32 |
| **Total** | | **~$0.13** | **~$2.08** |
