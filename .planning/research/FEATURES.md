# Feature Research

**Domain:** n8n AI Agent Workflows for Niche Research, Topic Generation, and Dynamic Prompt Generation
**Researched:** 2026-03-09
**Confidence:** HIGH (Anthropic API docs verified directly, existing workflow JSONs analyzed, n8n patterns confirmed via web search)

## Scope

This research covers ONLY the AI agent workflow features that need to be built or hardened for v1.1. The dashboard, webhook stubs, and production pipeline workflows already exist. This focuses on:

1. Niche research with Claude + web search tool
2. Topic generation with blue-ocean methodology
3. Avatar generation (10-data-point customer profiles)
4. Dynamic prompt generation (7 prompt types per niche)
5. Topic refinement with 24-topic context awareness

## Feature Landscape

### Table Stakes (Users Expect These)

Features that the AI agent workflows MUST deliver correctly or the entire pipeline fails downstream.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Structured JSON output from Claude | Every downstream node (parse, insert, update) depends on valid JSON. If Claude returns prose or malformed JSON, the workflow crashes. | MEDIUM | Existing workflows use regex extraction (`indexOf('[')` / `lastIndexOf(']')`). This is fragile. Must handle Claude wrapping JSON in markdown fences, adding preamble text, or splitting across multiple text blocks. |
| Web search integration for niche research | The differentiator. Without real web search, "research" is just Claude hallucinating competitor data from training. | HIGH | Anthropic web search tool (`web_search_20250305` or `web_search_20260209`) is a server-side tool -- Claude decides when to search, API executes it. No beta header needed anymore. Tool definition goes in `tools` array. $10/1000 searches. Current workflow already implements this correctly. |
| Niche research producing actionable outputs | Research must produce: competitor list, audience pain points, keyword gaps, blue-ocean angles, positioning statement. These feed directly into prompt generation. | HIGH | The quality of ALL downstream content (topics, scripts, videos) depends on research quality. Garbage research = garbage prompts = garbage topics. This is the foundation. |
| Dynamic prompt generation (7 types) | Each niche needs 7 prompt templates stored in `prompt_configs`: topic_generator, script_pass1/2/3, evaluator, visual_director, scene_segmenter. Without these, topic and script generation have no niche-specific intelligence. | HIGH | Current workflow generates all 7 in a single Claude call. Validation checks for quality benchmarks (2 AM Test, Share Test, Rewatch Test) in topic_generator prompt. |
| Topic generation (25 topics + avatars) | Must produce exactly 25 topics with all required fields: seo_title, narrative_hook, key_segments, estimated_cpm, viral_potential, playlist_group (1-3), plus nested avatar with 10 fields. | HIGH | Current workflow loads prompt from `prompt_configs`, injects project variables, calls Claude, parses JSON array. Missing or malformed topics break the Topic Review page. |
| Avatar generation (10 data points each) | Each topic needs a customer avatar: name/age, occupation/income, life stage, pain point, spending profile, knowledge level, emotional driver, online hangouts, objection, dream outcome. | MEDIUM | Currently generated inline with topics (nested in JSON response). Extracted and inserted into `avatars` table after topics are inserted. Topic IDs from Supabase response used as foreign keys. |
| Refinement with 24-topic context | When user refines a single topic, Claude must see all 24 other topics to avoid overlap. Without this, refined topics often duplicate existing ones. | MEDIUM | Current workflow reads all topics for the project, passes other 24 as context. Adds to `refinement_history` JSONB. Cost: ~$0.15 per refinement due to context size. |
| Error state handling with status updates | Every workflow step that can fail must write a meaningful status to Supabase (e.g., `research_failed`, `topic_generation_failed`). Dashboard polls status to show progress. | LOW | Current workflows have `onError: "continueRegularOutput"` and error handler nodes. Must ensure error messages are user-readable, not raw API errors. |
| Idempotent workflow execution | If a workflow is accidentally triggered twice, it should not create duplicate projects/topics. Or if it must re-run, it should detect existing data. | MEDIUM | Currently NO idempotency checking. Running "Generate Topics" twice for the same project creates 50 topics. Need to check if topics already exist for project before inserting. |

### Differentiators (Competitive Advantage)

Features that make Vision GridAI's AI workflows superior to competitors (VidIQ, TubeBuddy, manual research).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-search niche research (10+ web searches per project) | Claude autonomously decides how many searches to run and what queries to use. Current `max_uses: 10` allows thorough research across YouTube, Reddit, Quora, forums. No manual query formulation needed. | LOW (already implemented) | The `web_search_20250305` tool with `max_uses: 10` lets Claude search up to 10 times per API call. Claude formulates queries based on the niche, not the user. |
| Dynamic filtering with web_search_20260209 | Latest tool version lets Claude write code to filter search results before loading into context. Reduces irrelevant content, lower token cost, more accurate analysis. | LOW (config change) | Upgrade from `web_search_20250305` to `web_search_20260209` in the HTTP Request body. Requires code execution tool to also be enabled (Anthropic handles this server-side). Available on Claude Sonnet 4.6 and Opus 4.6. |
| Quality benchmark enforcement in prompts | Topic generator prompt is validated to include 2 AM Test, Share Test, and Rewatch Test benchmarks. TOPC-02 compliance check in "Parse Prompts" node rejects prompts missing these. | LOW (already implemented) | Code node throws error if topic_generator prompt_text is missing quality benchmark keywords. This prevents Claude from generating a generic topic prompt that skips quality gates. |
| Niche-adaptive expertise profiles | Each niche gets a unique expertise persona (e.g., "Senior Credit Card Analyst" vs "Classical Philosophy Scholar"). Scripts written by a domain expert persona are more authoritative. | LOW (already implemented) | Generated during prompt generation step. Stored in `projects.niche_expertise_profile`. Injected into script generation prompts via `{{expertise_profile}}` placeholder. |
| Playlist angle auto-generation | Claude generates 3 creative playlist angles per niche (e.g., "The Mathematician", "Your Exact Life", "The Investigator" for credit cards). Topics are distributed across angles for content variety. | LOW (already implemented) | Generated during niche research. Stored in `projects.playlist1_name/theme` etc. Topic generator uses these to ensure even distribution (8-9 topics per angle). |
| Positioning statement for blue-ocean strategy | Claude writes a channel positioning statement that defines how this channel differs from all competitors. This statement guides topic generation and script tone. | LOW (already implemented) | Stored in `projects.niche_blue_ocean_strategy`. Fed into topic generator and script prompts. |
| pause_turn handling for long research | Anthropic API may return `stop_reason: "pause_turn"` for long-running web search turns. Proper handling lets Claude continue its research across multiple API calls. | HIGH | NOT currently implemented. If research requires many searches, the API may pause mid-turn. The current workflow treats any response as final. Need a loop that detects pause_turn and re-sends the conversation to let Claude continue. |
| Prompt caching for multi-turn research | Anthropic's prompt caching automatically caches content up to the last `web_search_tool_result` block. For multi-turn research, this reduces token costs on subsequent turns. | MEDIUM | NOT currently implemented. Would matter if implementing pause_turn loop. Add `cache_control` breakpoint on or after last search result block. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in the AI agent workflow context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| User-specified search queries for niche research | "Let me tell Claude what to search for." | Defeats the purpose of agentic research. Claude's value is formulating better queries than a human would. User-specified queries lead to confirmation bias. | User provides niche name + optional description. Claude decides what to search. User reviews results after. |
| Real-time streaming of Claude's research process | "Show me what Claude is thinking/searching as it researches." | Streaming web search responses requires SSE/WebSocket from n8n to dashboard. n8n webhook nodes don't natively support streaming. Massive complexity for marginal UX improvement. | Update project status at key milestones (researching_competitors -> researching_prompts -> ready_for_topics). Dashboard shows which step is active. |
| Retry loop for failed JSON parsing | "If JSON is malformed, just retry the Claude call." | Silent retries hide prompt engineering problems. A prompt that regularly produces unparseable JSON needs to be fixed, not retried. Retries also double API costs. | Fail fast with clear error message. Log the raw response for debugging. Fix the prompt if it happens repeatedly. Consider Anthropic's JSON mode if available. |
| Configurable number of web searches per research | "Let me set max_uses to 20 for deeper research." | More searches = more token context = higher chance of hitting context window limits. 10 searches typically returns 50-100K tokens of content. 20 could approach the 200K context limit. Also costs $0.20 vs $0.10. | Keep max_uses at 10 (default). If research quality is insufficient for a specific niche, user can regenerate with a more specific description, not more searches. |
| Separate Claude calls per research category | "Run one search for competitors, another for pain points, another for keywords." | Each call starts from zero context. Claude can't cross-reference competitor gaps with audience pain points if they're in separate calls. Integrated research is more insightful. | Single research call with all categories. Claude naturally cross-references findings (e.g., discovers a competitor gap that aligns with an audience pain point = blue ocean opportunity). |
| GPT-4o as fallback model | "Use GPT-4o if Claude fails." | Different models produce different JSON structures, different writing styles, different evaluation scores. Mixing models creates inconsistency. Also requires OpenAI API key management. | Stick with Claude Sonnet 4.6 for all AI calls. If a call fails, retry with the same model. Consistency > redundancy. |
| Automatic topic regeneration on low quality | "If topics don't pass quality checks, auto-regenerate." | Quality is subjective. The whole point of Gate 1 is human review. Auto-regeneration might loop indefinitely on "boring" niches. Also wastes API budget. | Generate topics once. Present to user at Gate 1. User decides to approve, reject, refine, or regenerate all. Human judgment is the quality gate. |

## Feature Dependencies

```
[Project Creation (WF_PROJECT_CREATE)]
    |-- creates --> [Project record in Supabase]
    |-- triggers --> [Niche Research (Claude + web search)]
                        |-- produces --> [niche_profiles record]
                        |-- produces --> [Project updates (expertise, playlists, red-ocean)]
                        |-- triggers --> [Dynamic Prompt Generation (Claude)]
                                            |-- produces --> [7 prompt_configs records]
                                            |-- sets --> [Project status = ready_for_topics]

[Topic Generation (WF_TOPICS_GENERATE)]
    |-- requires --> [prompt_configs.topic_generator exists]
    |-- requires --> [Project status = ready_for_topics]
    |-- produces --> [25 topic records]
    |-- produces --> [25 avatar records]
    |-- sets --> [Project status = topics_pending_review]

[Topic Actions (WF_TOPICS_ACTION)]
    |-- requires --> [Topics exist for project]
    |-- approve --> [Sets review_status = approved]
    |-- reject --> [Sets review_status = rejected]
    |-- refine --> [Reads ALL topics, calls Claude with 24-topic context]
    |-- edit --> [Direct field update on topic record]

[Topic Approval (Gate 1)]
    |-- required by --> [Script Generation (Phase C)]

[Dynamic Prompt Generation]
    |-- requires --> [Niche research completed]
    |-- required by --> [Topic Generation]
    |-- required by --> [Script Generation (uses script_pass1/2/3 prompts)]
    |-- required by --> [Scene Segmentation (uses scene_segmenter prompt)]
    |-- required by --> [Visual Direction (uses visual_director prompt)]
    |-- required by --> [Script Evaluation (uses evaluator prompt)]
```

### Dependency Notes

- **Niche Research requires Project Creation:** Cannot research without a project record and niche name.
- **Dynamic Prompts require Niche Research:** Prompts are generated FROM research outputs (expertise profile, playlist angles, red-ocean list, blue-ocean strategy).
- **Topic Generation requires prompt_configs:** The topic_generator prompt is loaded from the database, not hardcoded. If prompt_configs is empty, the workflow falls back to a generic prompt (implemented in Build Prompt node), but quality suffers.
- **Topic Refinement requires ALL topics:** Cannot refine one topic without reading all 24 others for overlap prevention. This creates a read dependency on the topics table.
- **Script Generation (Phase C) requires both topics AND prompt_configs:** Script pass1/2/3 prompts are loaded from prompt_configs and injected with topic/avatar data. Both must exist.

## MVP Definition

### Launch With (v1.1 -- this milestone)

These features must work end-to-end for the US Credit Cards niche.

- [x] Project creation with Supabase insert (WF_PROJECT_CREATE) -- already implemented
- [x] Niche research with Claude web search tool (web_search_20250305) -- already implemented
- [x] Research output parsing and storage (niche_profiles + project updates) -- already implemented
- [x] Dynamic prompt generation (7 types) with TOPC-02 quality benchmark validation -- already implemented
- [x] Topic generation loading prompt from prompt_configs (WF_TOPICS_GENERATE) -- already implemented
- [x] Topic + avatar parsing and Supabase insertion -- already implemented
- [x] Topic approve/reject/refine/edit actions (WF_TOPICS_ACTION) -- already implemented
- [x] Refinement with 24-topic context awareness -- already implemented
- [ ] Idempotency guards (prevent duplicate topics on re-trigger) -- NOT implemented
- [ ] pause_turn handling for long research sessions -- NOT implemented
- [ ] Production log entries for research/generation milestones -- NOT implemented
- [ ] Timeout hardening (120s may not be enough for 10-search research) -- NEEDS validation
- [ ] Error recovery: if prompt generation fails, research is not lost -- PARTIALLY implemented

### Add After Validation (v1.x)

Features to add once the first niche is successfully researched and topics are generated.

- [ ] Upgrade to web_search_20260209 with dynamic filtering -- reduces token cost, improves accuracy
- [ ] Prompt caching for multi-turn research -- reduces cost if pause_turn loop is implemented
- [ ] Research quality scoring (auto-evaluate niche profile completeness) -- flag thin research
- [ ] Prompt versioning UI (edit/rollback prompts from Settings page) -- already have version column
- [ ] Bulk topic regeneration with rejection feedback -- regenerate all rejected topics in one call
- [ ] Avatar refinement independent of topic refinement -- currently avatars are regenerated only with full topic regen

### Future Consideration (v2+)

- [ ] Multi-model support (Claude Opus for complex niches, Haiku for simple ones) -- cost optimization
- [ ] Research refresh (re-run niche research for existing project with new web data) -- content stays current
- [ ] Prompt A/B testing (run two topic_generator variants, compare quality scores) -- optimization
- [ ] Cross-niche prompt transfer (use successful prompt patterns from one niche to seed another) -- scaling efficiency

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Idempotency guards on topic generation | HIGH | LOW | P1 |
| pause_turn handling for research | MEDIUM | MEDIUM | P1 |
| Timeout hardening (increase to 180-300s) | HIGH | LOW | P1 |
| Production log entries for AI steps | MEDIUM | LOW | P1 |
| Error recovery (research persists on prompt failure) | HIGH | LOW | P1 |
| Upgrade to web_search_20260209 | MEDIUM | LOW | P2 |
| Prompt caching | LOW | MEDIUM | P2 |
| Research quality scoring | LOW | MEDIUM | P2 |
| Bulk rejected topic regeneration | MEDIUM | MEDIUM | P2 |
| Avatar independent refinement | LOW | LOW | P3 |
| Research refresh for existing projects | MEDIUM | MEDIUM | P3 |
| Prompt A/B testing | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch (this milestone)
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Anthropic Web Search Tool -- Implementation Reference

This section documents the exact API contract for n8n HTTP Request nodes.

### Tool Definition (in tools array)

```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 10,
  "allowed_domains": [],
  "blocked_domains": []
}
```

Or the newer version with dynamic filtering (recommended upgrade):

```json
{
  "type": "web_search_20260209",
  "name": "web_search"
}
```

### Request Format (n8n HTTP Request body)

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 16384,
  "tools": [
    { "type": "web_search_20250305", "name": "web_search", "max_uses": 10 }
  ],
  "messages": [
    { "role": "user", "content": "Research the niche..." }
  ]
}
```

**Headers required:**
- `x-api-key`: (via httpHeaderAuth credential)
- `anthropic-version`: `2023-06-01`
- `content-type`: `application/json`

**No beta header needed.** The web search tool is GA (no longer requires `anthropic-beta` header).

### Response Format

Response `content` array contains a mix of block types:

1. `text` -- Claude's reasoning/decision text
2. `server_tool_use` -- Claude's search query (type: `server_tool_use`, name: `web_search`)
3. `web_search_tool_result` -- Search results with encrypted content
4. `text` with `citations` -- Claude's final answer with source citations

**Key fields in usage:**
```json
{
  "usage": {
    "input_tokens": 6039,
    "output_tokens": 931,
    "server_tool_use": {
      "web_search_requests": 1
    }
  }
}
```

### Parsing Response in n8n Code Node

The existing parse pattern extracts text blocks and finds JSON:
```javascript
const textBlocks = (response.content || []).filter(c => c.type === 'text');
const rawText = textBlocks.map(c => c.text).join('');
```

This is correct -- `server_tool_use` and `web_search_tool_result` blocks are not text and should be filtered out. Only Claude's final text output contains the JSON research results.

### Edge Cases to Handle

| Edge Case | What Happens | How to Handle |
|-----------|-------------|---------------|
| `stop_reason: "pause_turn"` | API paused a long-running turn mid-research | Re-send full response as assistant message, add empty user message, continue |
| `web_search_tool_result_error` with `too_many_requests` | Rate limit hit on Brave Search | Wait and retry after 30-60 seconds |
| `web_search_tool_result_error` with `max_uses_exceeded` | Claude tried more searches than allowed | Claude should still produce output from searches already completed |
| Response >100K tokens | Lots of web content loaded into context | Current `max_tokens: 16384` for output is fine; input tokens scale with search results |
| `encrypted_content` in multi-turn | Must pass back in subsequent turns for citation continuity | Not relevant for single-turn research (current implementation) |
| Claude returns no JSON (only analysis text) | Prompt asked for JSON but Claude wrote prose | Parse node throws error. Consider adding "Return ONLY valid JSON" reinforcement in prompt |
| Timeout at 120 seconds | Research with 10 searches may take 30-90 seconds on average, but can spike | Increase timeout to 300 seconds (5 minutes) for research calls |

### Pricing (for cost tracking)

| Component | Cost |
|-----------|------|
| Web search | $10 per 1,000 searches ($0.01 per search) |
| Input tokens (search results) | Standard Claude pricing ($3/M for Sonnet) |
| Output tokens (research JSON) | Standard Claude pricing ($15/M for Sonnet) |
| Estimated total for 10-search research | ~$0.30-0.60 per niche |

## Existing Workflow Analysis

### WF_PROJECT_CREATE (Already Built)

**Status:** Fully implemented with 14 nodes.
**Flow:** Webhook -> Validate -> INSERT Project -> Extract ID -> (Respond + Start Research) -> Claude Research (web search) -> Parse Research -> (INSERT Niche Profile + UPDATE Project) -> Claude Generate Prompts -> Parse Prompts (with TOPC-02 check) -> INSERT Prompt Configs -> Status Ready
**Gaps identified:**
1. No pause_turn handling
2. 120s timeout may be too short for research
3. No production_log entries
4. If prompt generation fails, research results are already saved (good), but project status is not rolled back (partial gap)
5. No retry logic on transient API errors

### WF_TOPICS_GENERATE (Already Built)

**Status:** Fully implemented with 12 nodes.
**Flow:** Webhook -> Validate -> (Read Project + Read Prompt Config) -> Build Prompt -> (Respond + Status Generating) -> Claude Generate Topics -> Parse Topics -> INSERT Topics -> Map Avatars -> INSERT Avatars -> Status Topics Pending
**Gaps identified:**
1. No idempotency check (will create duplicate topics if triggered twice)
2. No production_log entries
3. Falls back to generic prompt if prompt_configs is empty (may produce lower quality)
4. Topic count not validated (Claude might return 24 or 26 instead of 25)
5. Avatar insertion depends on topic INSERT returning IDs in order (fragile if Supabase reorders)

### WF_TOPICS_ACTION (Already Built)

**Status:** Fully implemented with 12 nodes.
**Flow:** Webhook -> Parse Request -> Switch (approve/reject/refine/edit) -> respective handlers
**Gaps identified:**
1. Refine action does not update the avatar (only topic fields)
2. No production_log entries for topic actions
3. Refinement timeout is 60s (should be sufficient for single-topic refinement)
4. No bulk refine action (must refine topics one at a time)

## Sources

- [Anthropic Web Search Tool Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) -- verified 2026-03-09, HIGH confidence
- [Anthropic Blog: Introducing Web Search on API](https://claude.com/blog/web-search-api) -- official announcement
- [Anthropic Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use) -- agentic loop patterns
- [Anthropic Context Windows Documentation](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- 200K token limit
- [n8n Claude Integration](https://n8n.io/integrations/claude/) -- HTTP Request node patterns
- [n8n Anthropic AI Agent Template](https://n8n.io/workflows/4399-anthropic-ai-agent-claude-sonnet-4-and-opus-4-with-think-and-web-search-tool/) -- community workflow with web search
- [Strapi: How to Build AI Agents with n8n 2026](https://strapi.io/blog/build-ai-agents-n8n) -- n8n AI agent architecture
- [TubeLab Niche Analyzer](https://tubelab.net/niche-analyzer) -- competitor feature reference
- [BlueOcean AI](https://www.blueocean.ai/) -- agentic competitive analysis patterns

---
*Feature research for: n8n AI Agent Workflows (Niche Research, Topic Generation, Dynamic Prompt Generation)*
*Researched: 2026-03-09*
