# Project Research Summary

**Project:** Vision GridAI Platform v1.1 -- Backend & E2E
**Domain:** Multi-niche AI video production platform (n8n orchestration, Claude AI agents, Supabase, single VPS)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

Vision GridAI v1.1 is primarily a **deployment, hardening, and gap-filling milestone** -- not a greenfield build. The most important discovery across all four research files is that the three core AI agent workflows (WF_PROJECT_CREATE, WF_TOPICS_GENERATE, WF_TOPICS_ACTION) already exist as complete implementations in the `workflows/` directory. The work ahead is fixing known anti-patterns in these workflows (system prompt substring hack, incomplete error handler connections, missing idempotency guards), deploying them to the production n8n instance with correct credential mappings, tuning the 16GB VPS infrastructure (Docker memory limits, PostgreSQL configuration), and validating the end-to-end flow from dashboard through niche research to topic generation.

The recommended approach is a 4-wave deployment: (1) infrastructure hardening first (Docker memory, PostgreSQL tuning, n8n env vars), (2) credential setup and stub workflow deactivation, (3) workflow fixes and import, (4) end-to-end validation with the US Credit Cards niche. This order is critical because deploying workflows before fixing infrastructure leads to silent failures -- Claude API calls timing out at 30s defaults, PostgreSQL running with 128MB shared_buffers, and n8n containers competing for RAM without limits.

The key risks are: webhook path collisions between v1.0 stubs and v1.1 full implementations (two workflows on the same path, only one fires), credential reference mismatches after JSON import (workflows import successfully but fail silently on first execution), and Claude web search timeout/cost issues (research calls can take 60-120s and accumulate tokens quadratically across multi-turn conversations). All three are preventable with the deployment checklist documented in ARCHITECTURE.md.

## Key Findings

### Recommended Stack

The stack is mature and validated. v1.1 adds only three capabilities to the existing stack: Anthropic web search tool (`web_search_20250305`) for niche research, n8n REST API for workflow import, and infrastructure tuning for the 16GB VPS. No new frameworks, no new dependencies.

**Core additions:**
- **Anthropic web_search_20250305**: Server-side web search for Claude -- $10/1K searches, GA (no beta header), uses same HTTP Request pattern as existing workflows. HIGH confidence.
- **n8n REST API (POST /api/v1/workflows)**: Programmatic workflow import with credential remapping. MEDIUM confidence -- credential matching by name is the known friction point.
- **Docker + PostgreSQL tuning**: 4GB containers for n8n and PostgreSQL, 1GB shared_buffers, 2GB shm_size, NVMe-optimized query planner settings. HIGH confidence.

**Explicitly rejected:**
- Anthropic Python/Node SDK (HTTP Request pattern is better for n8n)
- OpenRouter proxy (CLAUDE.md forbids it)
- Separate job queue like Redis/BullMQ (n8n self-chaining suffices at this scale)
- n8n native Supabase node (HTTP Request gives more control)

### Expected Features

**Must have (table stakes):**
- Structured JSON output parsing from Claude (filter by `type === 'text'`, handle markdown fences)
- Web search integration producing actionable niche research (competitors, pain points, keywords, blue-ocean)
- Dynamic prompt generation (7 types per niche stored in prompt_configs)
- Topic generation (exactly 25 topics + 25 avatars with all required fields)
- Refinement with 24-topic context awareness (prevents overlap)
- Idempotency guards on topic generation (prevent duplicates on re-trigger)
- Error state handling with meaningful status updates to Supabase

**Should have (differentiators):**
- pause_turn handling for long research sessions (Claude may pause mid-research)
- Quality benchmark enforcement (2 AM Test, Share Test) validated in prompt generation
- Niche-adaptive expertise profiles (domain-specific Claude personas)

**Defer (v2+):**
- Multi-model support (Opus for complex niches, Haiku for simple)
- Research refresh for existing projects
- Prompt A/B testing
- Cross-niche prompt transfer

### Architecture Approach

The architecture follows an established respond-then-continue pattern: webhook receives request, responds immediately with 200, then continues async processing with status breadcrumbs written to Supabase. The dashboard reads state from Supabase (including Realtime subscriptions) and never waits on webhook responses for long-running work. AI agent workflows do NOT self-chain to each other -- human approval gates between phases are deliberate. Self-chaining only applies to the deterministic production pipeline (TTS -> Images -> Video -> Assembly).

**Major components:**
1. **Dashboard (React SPA)** -- triggers actions via webhook, displays state from Supabase Realtime. Already built.
2. **n8n Webhook/Worker Workflows** -- receive requests, validate, execute AI calls, write results to Supabase. Three core workflows already built, need fixes and deployment.
3. **Supabase** -- source of truth for all state, emits Realtime events. Schema exists.
4. **Claude API (Anthropic)** -- niche research with web search, topic generation, refinement, prompt generation. Called via HTTP Request nodes.

### Critical Pitfalls

1. **Webhook path collision** -- v1.0 stub workflows and v1.1 full implementations register on the same paths. Only one fires. Deactivate stubs before importing full implementations.
2. **Credential reference mismatch on import** -- Workflow JSONs reference credential IDs/names that must match the production n8n instance exactly. Create credentials with exact names BEFORE importing.
3. **Claude API timeout** -- Default 30s HTTP timeout is too short for web search calls (30-90s per turn). Set to 300s on all Claude HTTP Request nodes.
4. **Docker memory starvation** -- Without explicit limits, n8n and PostgreSQL compete for RAM. Set 4GB limits on each, tune shared_buffers to 1GB, set shm_size to 2GB.
5. **n8n binary data disk fill** -- Filesystem binary mode writes accumulate without cleanup. Enable execution pruning, set EXECUTIONS_DATA_SAVE_ON_SUCCESS=none.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Infrastructure Hardening
**Rationale:** Must be done first -- deploying workflows onto a misconfigured VPS leads to silent failures (OOM kills, timeouts, disk fill). Every subsequent phase depends on a stable runtime.
**Delivers:** Docker memory limits, PostgreSQL tuning, n8n environment variables, execution pruning, timeout configuration.
**Addresses:** Pitfalls 4, 12, 13, 15 (timeouts, memory starvation, disk fill)
**Avoids:** Debugging infrastructure issues while also debugging workflow logic

### Phase 2: Credential Setup + Stub Deactivation
**Rationale:** Credentials must exist before workflows can be imported (name matching). Stubs must be deactivated before full implementations can activate on the same webhook paths.
**Delivers:** Production credentials in n8n (Supabase Service Role, Anthropic API Key), environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, DASHBOARD_API_TOKEN), deactivated stub workflows.
**Addresses:** Pitfalls 11, 16 (credential mismatch, webhook collision)
**Avoids:** Silent import failures

### Phase 3: Workflow Fixes + Deployment
**Rationale:** Fix the three known anti-patterns before deploying: system prompt substring in WF_TOPICS_GENERATE, incomplete error handler connections in WF_PROJECT_CREATE, missing error handling in WF_TOPICS_ACTION refine branch. Then import and activate.
**Delivers:** Fixed and deployed WF_PROJECT_CREATE, WF_TOPICS_GENERATE, WF_TOPICS_ACTION. Idempotency guards on topic generation. Production log entries for AI workflow milestones.
**Addresses:** Table stakes features (JSON parsing, web search, prompt generation, topic generation, refinement)
**Avoids:** Pitfalls 9, 10 (runaway web search, silent parsing failures)

### Phase 4: End-to-End Validation
**Rationale:** Validate the full flow with US Credit Cards niche before considering the milestone complete. This catches integration issues that unit testing misses.
**Delivers:** Verified niche research, prompt generation, topic generation, topic actions (approve/reject/refine/edit), dashboard state reflection via Supabase Realtime.
**Addresses:** All table stakes features validated end-to-end
**Avoids:** Shipping untested integrations

### Phase Ordering Rationale

- Infrastructure before workflows: a workflow that times out at 30s looks like a code bug but is actually a config problem. Fix the environment first.
- Credentials before import: n8n matches credentials by name during import. If names don't match, the workflow imports but every node fails. This is the most common deployment failure.
- Fixes before deployment: deploying broken workflows to production creates noise in execution logs and Supabase state. Fix locally, then deploy clean.
- Validation last: only meaningful after everything is deployed and configured.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Workflow Fixes):** The pause_turn handling for long research is NOT currently implemented and has HIGH complexity. May need a dedicated research spike during planning to design the n8n agentic loop pattern.
- **Phase 3 (Idempotency):** Need to decide the idempotency strategy -- check-before-insert vs. upsert vs. database constraint. Needs brief research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure):** Well-documented Docker/PostgreSQL tuning. STACK.md provides exact values.
- **Phase 2 (Credentials):** Straightforward n8n admin task. ARCHITECTURE.md provides exact steps.
- **Phase 4 (Validation):** Manual testing against a known niche. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Anthropic API docs verified directly, PostgreSQL tuning from official wiki + PGTune, n8n env vars from official docs |
| Features | HIGH | Existing workflow JSONs analyzed node-by-node, gaps identified from code review not speculation |
| Architecture | HIGH | Architecture derived from actual codebase analysis (18 workflow files), not theoretical design |
| Pitfalls | HIGH | 16 pitfalls documented with specific warning signs, most verified via official docs and community reports |

**Overall confidence:** HIGH

### Gaps to Address

- **pause_turn handling:** Not implemented, HIGH complexity. The current workflows treat every Claude response as final. If research triggers a pause_turn, the response is incomplete. Decide during Phase 3 planning whether to implement the multi-turn loop or accept the risk (most research completes in one turn).
- **Idempotency guards:** Not implemented. Running "Generate Topics" twice creates 50 topics. Simple fix (check if topics exist before inserting) but needs to be designed into the workflow.
- **Production log entries:** AI agent workflows do not write to production_log table. Dashboard monitoring and supervisor agent depend on these entries. Add INSERT production_log nodes at key milestones.
- **Topic count validation:** Claude might return 24 or 26 topics instead of 25. No validation in the parse node. Add a count check with retry or warning.
- **Avatar insertion ordering:** Avatar INSERT depends on topic INSERT returning IDs in the same order as the input array. If Supabase reorders the response, avatars get linked to wrong topics. Validate by matching on topic_number, not array position.

## Sources

### Primary (HIGH confidence)
- [Anthropic Web Search Tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) -- tool type, pricing, response format
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Sonnet 4.6 at $3/$15 MTok
- [n8n Environment Variables docs](https://docs.n8n.io/hosting/configuration/environment-variables/) -- timeout, memory, binary data config
- [n8n Execution Timeout docs](https://docs.n8n.io/hosting/configuration/configuration-examples/execution-timeout/) -- EXECUTIONS_TIMEOUT settings
- [PostgreSQL Tuning wiki](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server) -- shared_buffers, work_mem, effective_cache_size
- [PGTune calculator](https://pgtune.leopard.in.ua/) -- PostgreSQL settings for 4GB dedicated DB
- Existing workflow JSON files (WF_PROJECT_CREATE, WF_TOPICS_GENERATE, WF_TOPICS_ACTION) -- codebase analysis

### Secondary (MEDIUM confidence)
- [n8n REST API docs](https://docs.n8n.io/api/) -- POST /api/v1/workflows for import
- [n8n Community: workflow import](https://community.n8n.io/t/create-a-workflow-by-n8n-public-rest-api/143898) -- credential remapping guidance
- [n8n production config guide](https://www.andreffs.com/blog/n8n-customizations-for-production/) -- payload size, execution data settings

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
