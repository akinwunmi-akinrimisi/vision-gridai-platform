# Intelligence Renderer — Workflow Integration Guide

Migration `028_intelligence_renderer.sql` is live. This document explains how
to migrate the 3 remaining downstream workflows to consume the centralised RPC
`render_project_intelligence(project_id, stage)`.

## Why this exists

Prior to migration 028, every downstream workflow (`WF_TOPICS_GENERATE`,
`WF_SCRIPT_GENERATE` → `WF_SCRIPT_PASS`, `WF_VIDEO_METADATA`) hand-assembled an
"intelligence block" from cached project columns. Each assembly was imperative
("pick fields A, B, C by name"), so any new intelligence column added upstream
(viability score, DNA patterns, etc.) was silently dropped until someone
manually updated every consumer. We fixed this class of bug four times
(`0cb601a`, `7ef85e9`, `b6eae76`, `7d10bae`) and it kept returning.

Shape C solution: one PL/pgSQL function renders all intelligence into
stage-appropriate markdown. A coverage check in migration 028 fails the
deployment if any new column on `projects`, `channel_analyses`, or
`niche_viability_reports` isn't either referenced in the renderer or
explicitly whitelisted as operational-only.

## The contract

```
POST https://supabase.operscale.cloud/rest/v1/rpc/render_project_intelligence
Headers:
  apikey: $SUPABASE_ANON_KEY
  Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
  Content-Type: application/json
Body: {"p_project_id":"<uuid>","p_stage":"topics|script|metadata|all"}
Response: JSON-encoded string (markdown). Length ~25-45KB for a fully-loaded project.
```

Tested sizes for a loaded project (`4bdfbbe3-2a9c-4532-95e9-41a743e8c253`):
- `topics`: ~43KB
- `script`: ~40KB
- `metadata`: ~27KB

## Drop-in fetch snippet for n8n Code nodes

Every integration needs this exact block. Paste it near the top of the target
node (after `projectId` is resolved, before the Claude prompt is assembled):

```javascript
// CENTRAL INTELLIGENCE RENDERER (migration 028)
// Replaces all hand-assembled intelligence concatenation. Stage-specific.
let renderedIntelligence = '';
try {
  const intelRes = await fetch(`${$env.SUPABASE_URL}/rest/v1/rpc/render_project_intelligence`, {
    method: 'POST',
    headers: {
      apikey: $env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_project_id: projectId, p_stage: 'topics' /* or script|metadata */ })
  });
  if (intelRes.ok) {
    renderedIntelligence = await intelRes.json(); // PostgREST returns text-returning RPC as JSON string
  }
} catch (e) {
  // Fall through with empty string — workflow still runs, just with less context
  renderedIntelligence = '';
}
```

Then prepend to the Claude `user` content:

```javascript
const userPrompt = renderedIntelligence + '\n\n---\n\n' + existingUserPrompt;
```

## Workflow-specific integration

### 1. WF_TOPICS_GENERATE (id `J5NTvfweZRiKJ9fG`) — node `Build Prompt`

- Stage: `'topics'`
- The node already resolves `projectId` from `data.project_id` or similar —
  reuse that.
- **Safe migration:** prepend `renderedIntelligence` to the Claude prompt. The
  existing hand-written intelligence concat block can remain (harmless
  duplication); ideally delete it in a follow-up commit to prevent drift.
- **Aggressive migration:** delete everything between the "SCRIPT REFERENCE"
  heading and the end of the intelligence section. Let the RPC be the sole
  source.

### 2. WF_SCRIPT_PASS (id `CRC9USwaGgk7x6xN`) — node that calls Claude

- Stage: `'script'`
- **Critical:** this fixes the Pass 2/Pass 3 passthrough bug identified in
  the audit. Each pass fetches fresh intelligence from the renderer,
  eliminating the need to thread `intelligence_block` through n8n node
  outputs (which Pass 2/Pass 3 prep nodes silently dropped).
- After integration, delete the `intelligence_block` input dependency entirely
  from `WF_SCRIPT_PASS` and the corresponding assembly in
  `WF_SCRIPT_GENERATE.Prep & Read Avatar`.

### 3. WF_VIDEO_METADATA (id `k0F6KAtkn74PEIDl`) — node `Generate Metadata`

- Stage: `'metadata'`
- Today: selects 7 project columns, injects 4 into prompt — ~5% of available
  intelligence.
- After: prepend RPC output. Claude now sees title DNA, thumbnail DNA,
  recommended_angle, audience questions, revenue context, etc.

## Coverage test

Every deploy of `028_intelligence_renderer.sql` runs
`_intelligence_coverage_check()`. If someone adds a new column to any of the
3 source tables without referencing it in the renderer (or whitelisting as
operational-only), the migration FAILS. This is the regression guarantee.

## Verification procedure

After integrating each workflow:

1. Trigger a test execution against a known-good project:
   - `4bdfbbe3-2a9c-4532-95e9-41a743e8c253` (NotSoDistantFuture, 7 channels)
   - `50ca5270-5d66-4931-b1d6-93356385cda0` (Credit Card Strategist)
2. Inspect execution trace for the node you edited.
3. Confirm the `userPrompt` passed to Claude contains the markdown header
   `# CHANNEL INTELLIGENCE (stage=<stage>)` from the renderer.
4. Confirm Claude's output references fields that only the RPC could have
   injected (e.g., `audience_size_reasoning`, `sponsorship_reasoning`,
   `viability_reasoning`, per-channel `verdict_reasoning`, competitor
   comment mentions).

## What NOT to change

- `WF_CREATE_PROJECT_FROM_ANALYSIS` (id `jU9VEw5SaKEHjvUn`) — its job is to
  seed the `projects` row when a project is created from an analysis group.
  The renderer reads directly from the source tables
  (`channel_analyses` + `niche_viability_reports`), so the bridge already
  feeds it. Don't touch.

- The cached aggregate columns on `projects` (`channel_analysis_context`,
  `script_reference_data`, `niche_viability_score`, `niche_viability_verdict`)
  — intentionally whitelisted out of the renderer to avoid
  stale-cache bugs. Keep them for dashboard use only.
