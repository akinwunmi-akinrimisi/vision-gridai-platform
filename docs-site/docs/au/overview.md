# Australia overlay — overview

Vision GridAI ships an **Australia country overlay** that adds compliance,
calendar, and sub-niche awareness to the existing General platform without
forking the production pipeline.

The seam is `projects.country_target`. General projects (`'GENERAL'`,
default) behave exactly as before. AU projects (`'AU'`) inherit all
existing intelligence (9 source tables via the Migration 029 renderer)
**plus** 3 new country-specific intelligence sources, **plus** 4 new prompt
slot variables that get filled at runtime with AU-specific content.

For the architectural rationale, see the executable plan:
[`docs/superpowers/plans/2026-04-25-au-overlay.md`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/docs/superpowers/plans/2026-04-25-au-overlay.md).

## What changes for AU projects

| Layer | Behaviour |
|---|---|
| Pre-production prompts | The 5 General master prompts (`script_pass1/2/3`, `script_evaluator`, `topic_generator_master`) get 4 country slot variables that fill with AU compliance + terminology + calendar + demonetization context. Same prompts, more context. |
| New AU-specific prompts | 14 net-new prompts seeded by migration 032 (`topic_discover_au`, `gap_score_au`, `demon_audit_au`, `swot_channel_au`, `swot_subniche_au`, `retention_analyze_au`, `coach_monthly_au`, SEO + thumbnail variants). |
| New AU workflows | 4 country-aware workflows: `WF_TOPIC_INTELLIGENCE` (daily cron), `WF_DEMONETIZATION_AUDIT` (Gate-3 hook), `WF_COACH_REPORT` (monthly cron), `WF_COMPETITOR_ANALYZER` (weekly cron). Plus `WF_COUNTRY_ROUTER` sub-workflow for prompt-key resolution. |
| Production pipeline | **Unchanged.** `WF_TTS_AUDIO`, `WF_IMAGE_GENERATION`, `WF_KEN_BURNS`, `WF_CAPTIONS_ASSEMBLY`, `WF_VIDEO_METADATA`, `WF_THUMBNAIL_GENERATE`, `WF_QA_CHECK` all read country-aware data from existing rows but no fork in the chain. |
| Dashboard | New General/Australia tab toggle in the Sidebar. Filter ProjectsHome by tab. AU-only nav items: AU Compliance Inbox, AU Calendar, AU SWOT, AU Coach Reports. CreateProjectModal grows AU configuration block when AU tab is active. |

## Why this is the right architecture

- **Production layer untouched.** All ~38 sessions of pipeline hardening (assembly truncation, FFmpeg `-map`, caption burn host service, intelligence renderer v2, lint rules CRED-01/CHAIN-01/AUTH-01) keep working for AU projects with zero re-validation cost.
- **Intelligence accumulates, never drops.** AU projects get all 9 General intelligence sources PLUS 3 AU-specific ones (calendar / disclaimers / compliance rules). 12 sources flow into AU script generation vs 9 for General — AU production is structurally **richer**, not poorer.
- **Future-proof for other markets.** The country overlay pattern works for UK, US, Canada without re-architecture — just seed `niche_variants`, `country_calendar_events`, `country_compliance_rules` for the new country, and the 4 prompt slots populate from the same RPC.

## The 5 AU sub-niches (P0 → P2)

Per Strategy Plan §2 and seeded by migration 032 into the `niche_variants` table:

| Sub-niche | CPM band (USD) | Q4 peak | Demonetization risk | Priority |
|---|---|---|---|---|
| `credit_cards_au` | $28–$42 | $45–$65 | Medium | **P0** |
| `super_au` | $22–$32 | $25–$35 | Medium-high | **P0** |
| `property_mortgage_au` | $25–$38 | $28–$42 | Medium-high | P1 |
| `tax_au` | $18–$28 | $20–$32 | Low | P1 |
| `etf_investing_au` | $20–$30 | $22–$33 | Medium | P2 |

## The 4 AU disclaimers

Stored in `prompt_templates` rows keyed by `template_type='disclaimer'` and
`template_key='AU:AD-XX'`. Three are flagged `requires_compliance_role=true`,
which causes the dashboard PromptCard UI to require a "Type CONFIRM"
modal before saving edits.

| ID | Purpose | Compliance gate |
|---|---|---|
| `AU:AD-01` | General advice warning (ASIC RG 244) | ✅ |
| `AU:AD-02` | Past performance | ✅ |
| `AU:AD-03` | Affiliate disclosure | — |
| `AU:AD-04` | Credit card comparison rate (NCCP, with `{{rate}}` substitution) | ✅ |

## The AU financial calendar

Seeded by migration 032 into `country_calendar_events`:

- **EOFY** (June 30) — affects super, tax, property
- **New FY** (July 1)
- **Federal Budget** (mid-May, 19:30 AEST speech) — 4-hour publish window
- **HECS indexation** (June 1) — 4-hour publish window
- **Q4 CPM window opens** (October 1)
- **Black Friday** (late November)

RBA cash-rate dates (8 per year) are seeded by cron after migration —
those move yearly.

## Hub + spoke architecture

Strategy §10 prescribes a hub + 3 spokes (CardMath, CardMath Super, CardMath Property, CardMath Tax). For **v1 launch**, only the **hub plus one priority spoke** (`super_au`) ships. The remaining spokes launch when the hub's traffic data confirms per-sub-niche audience demand.

The `parent_project_id` FK on `projects` carries the hub→spoke link. Spokes
inherit `prompt_configs` and `style_dna` by default; can override per spoke.

## Compliance gating

Every AU project runs `WF_DEMONETIZATION_AUDIT` at Gate 3 pre-publish.
The audit returns one of:

- `clear` → publishes (subject to existing Gate 3 review)
- `manual_review_required` → flips `topics.compliance_review_status='pending'`; topic appears in **AU Compliance Inbox** (`/au/compliance`)
- `block` → flips `compliance_review_status='rejected'`; publish blocked

For General projects, the audit returns `clear` immediately with `skipped: true` — no enforcement.

## See also

- [Pipeline phases](../pipeline/phase-a-project-creation.md) — shared production stages
- [Workflow reference](../workflows/reference.md) — all workflows including the 4 new AU ones
- [Prompts → System prompts](../prompts/system-prompts.md) — General masters that grow the 4 country slots
- [Operations → Cost economics](../operations/cost-economics.md) — AU per-video cost target $6–$8
- [Operations → Debugging recipes](../operations/debugging-recipes.md) — AU-specific failure modes
