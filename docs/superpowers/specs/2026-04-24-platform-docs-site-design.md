# Platform Docs Site — Design Spec

**Date:** 2026-04-24
**Status:** Brainstormed, awaiting plan
**Author:** Akinwunmi (with Claude)
**Related:** N/A (new initiative)

---

## 1. Context

Vision GridAI has grown into a non-trivial system: ~50 n8n workflows, 31 migrations, a 9-page React dashboard, 4 approval gates, 9 pipeline stages, 5 production registers, plus Topic Intelligence, Shorts, and an Analytics layer. Architectural truth currently lives spread across `CLAUDE.md`, `MEMORY.md`, `directives/`, migrations, workflow JSONs, and the dashboard source.

There is no single artefact that pictorially explains how the platform actually works. Re-deriving "how does X flow end-to-end" from raw repo state is slow and error-prone — both for the operator at 2 AM and for an AI agent asked to reason about the platform.

## 2. Audience

Two consumers, both equal priority:

1. **Akinwunmi** — operator-style reference. Browse + Ctrl-F. Comes back to remember how a piece works.
2. **An AI agent** — ingests the entire site for platform analysis. Needs clean semantic HTML and text-readable diagrams.

No third audience. No marketing surface. No investor narrative.

## 3. Goals

- One browsable site that explains the entire platform end-to-end with diagrams.
- ~40 pages, predictable templates, hosted on GitHub Pages, auto-deployed.
- Every page traceable to a verifiable source in the repo (or marked "needs verification" if not).
- AI-ingestible: semantic HTML + Mermaid diagrams that render to text-labelled SVG.
- Tier-B depth: core flows + reference appendix (per-workflow / per-table / per-page cards). Not exhaustive node-by-node.

## 4. Non-Goals (YAGNI)

- Not a marketing site. No hero animations, no testimonials, no business narrative.
- Not auto-generated from workflow JSON or live DB state. Hand-written from authoritative sources.
- No comments, no analytics, no auth — public-readable static site.
- No search beyond MkDocs Material's built-in.
- No exhaustive coverage. If a workflow is utility/internal, one line in the reference table is enough.
- No per-component dashboard documentation (cards per page, not per component).
- No mobile-first design polish. Operator references are read on a desktop.

## 5. Decisions Locked During Brainstorm

| # | Decision | Rationale |
|---|---|---|
| D1 | Audience: operator + AI agent only | Per user; eliminates marketing/investor scope |
| D2 | Depth: Tier B (core + reference cards) | Tier A too shallow as personal reference; Tier C requires generator and rebuilds |
| D3 | Tech: MkDocs Material | Free, professional default theme, search built-in, Mermaid native, edits = markdown |
| D4 | Hosting: GitHub Pages | Free, integrated, auto-published from `gh-pages` branch |
| D5 | Deploy: Auto via GitHub Action on push to `main` | Zero friction; removes "remember to deploy" failure mode |
| D6 | Site lives in new top-level `docs-site/` | Keeps planning artefacts in existing `docs/` untouched |

## 6. Source-of-Truth Precedence

When sources disagree, this order is authoritative:

| Rank | Source | Why |
|---|---|---|
| 1 | `memory/` (MEMORY.md + topic files) | Most recent operational truth (sessions through 2026-04-23) |
| 2 | `supabase/migrations/001–031` | Schema is authoritative — applied to live DB |
| 3 | `docs/SECURITY_REMEDIATION_2026_04_21_STATUS.md` + recent `main` commits | Latest auth/security state post-rotation |
| 4 | `directives/00–10 + topic-intelligence/` | Confirmed actively-used SOPs |
| 5 | `dashboard/src/` | Dashboard source = truth (deployed `/opt/dashboard/` is built from this) |
| 6 | `execution/*.{py,sh}` | Source of truth for shell/Python services |
| 7 | `workflows/*.json` | Treated as **snapshots** — may have drifted from live n8n. Flag accordingly, cross-reference MEMORY workflow-ID table |
| 8 | `CLAUDE.md` / `VisionGridAI_Platform_Agent.md` / `Dashboard_Implementation_Plan.md` / `GUIDE.md` | Design docs — used for narrative + intent, cross-checked against ranks 1–3 before stating as fact |

**Flagged drift in source files (must reconcile when writing):**
- `CLAUDE.md` references `@Agent.md` — the actual file is `VisionGridAI_Platform_Agent.md`.
- Three competing `007_*.sql` migrations exist (`007_grand_master_integration`, `007_seed_system_prompts`, `007_seo_metadata_columns`).
- `workflows/deprecated/WF_I2V_GENERATION.json` and `WF_T2V_GENERATION.json` — locally moved to `deprecated/` but MEMORY.md lists both as still active on n8n VPS.

Pages that cannot be fully resolved from rank 1–6 carry a `⚠ Needs verification` footer naming what to check against live state.

## 7. Site Structure

```
Home (Overview)
│
├── Concepts
│   ├── Why this platform exists
│   ├── The 4 approval gates (Topics → Script → Video → Shorts)
│   ├── Pipeline economics (cost per video breakdown)
│   └── Glossary
│
├── End-to-End Pipeline
│   ├── Phase A · Project Creation + Niche Research
│   ├── Phase B · Topic Generation (Gate 1)
│   ├── Phase C · 3-Pass Script Generation (Gate 2)
│   ├── Phase D · Production (TTS → Images → Ken Burns → Captions → Music → Assembly)
│   ├── Phase E · Video Review (Gate 3) + Publish
│   ├── Phase F · Analytics
│   ├── Phase G · Shorts (Gate 4)
│   └── Phase H · Social Posting
│
├── Subsystems
│   ├── Topic Intelligence (5-source research)
│   ├── Production Registers (5 visual styles)
│   ├── Style DNA + Composition System
│   ├── Caption Burn Service
│   ├── Background Music (Lyria + ducking)
│   └── Resume / Retry Architecture
│
├── Dashboard
│   ├── Page map (visual nav graph)
│   ├── Page reference
│   └── Realtime data patterns
│
├── Database
│   ├── Schema overview (ER diagram)
│   ├── Table reference
│   └── Migration history (timeline)
│
├── n8n Workflows
│   ├── Workflow architecture (self-chaining + retry pattern)
│   ├── Workflow reference (~50 cards)
│   └── Per-workflow status (active vs deprecated)
│
├── Prompts
│   ├── Where prompts live (DB vs files vs inline)
│   ├── System prompt reference (snapshots from migration 007)
│   └── Prompt template system (Style DNA, composition, negative)
│
├── Infrastructure
│   ├── VPS layout (containers, ports, volumes)
│   ├── Service mesh diagram
│   └── Auth + secrets architecture (post-rotation)
│
└── Operations
    ├── Cost economics (per video, per month)
    ├── Common debugging recipes
    └── Incident log (pointer into MEMORY sessions 32–38)
```

≈ 40 pages total.

## 8. Page Templates

### Template 1 — Pipeline Phase Pages (8)
```
# Phase X · [Name]
> One-line purpose · cost · duration estimate

## Goal
## Sequence diagram (Mermaid)
## Inputs (read from)
## Outputs (writes to)
## Gate behavior (if applicable)
## Workflows involved
## Failure modes + recovery
## Code references (file:line)
```

### Template 2 — Workflow Reference Cards (~50)
```
### WF_NAME
**ID:** xxxx · **Active:** ✅/❌ · **Trigger:** webhook | cron | sub-workflow
- **Purpose:** one sentence
- **Reads:** table.col
- **Writes:** table.col
- **Calls:** [external APIs]
- **Fires next:** WF_NEXT
- **Notes:** non-obvious behavior
```
Grouped onto 3–4 pages by category (Production / Research / Analytics / Social-Utility).

### Template 3 — Database Table Pages
```
## Table: name
**Purpose:** paragraph
**Realtime enabled:** yes/no · **RLS:** locked-down/public-read
| Column | Type | Notes |
**Written by:** WF_X, page Y
**Read by:** WF_A, page B
**Migration history:** 003 (created), 015 (added cols X/Y)
```

### Template 4 — Subsystem Deep-Dives (6) AND free-form pages
Free-form 800–1500 words each. Multiple Mermaid diagrams. Where you go for "I forgot how Topic Intelligence orchestrates 5 sources." **Also used for** Concepts (4 pages), Prompts overview (1 page), Infrastructure pages (3), Operations pages (3) — anything not card-shaped.

### Template 5 — Dashboard Page Cards (~9)
```
### /route/path
- **Component:** dashboard/src/pages/Name.jsx
- **Hooks:** useFoo, useBar
- **Reads tables:** table.col (via Realtime / via REST)
- **Calls webhooks:** /webhook/X
```

## 9. Diagram Inventory (Mermaid)

| Diagram | Page | Type |
|---|---|---|
| Master pipeline with 4 gates | Home | flowchart |
| Per-phase actor sequence | each Pipeline phase page | sequenceDiagram |
| ER diagram (core tables) | Database / Schema overview | erDiagram |
| Service mesh (containers + arrows) | Infrastructure / Service mesh | flowchart |
| Self-chaining workflow pattern | Workflows / Architecture | flowchart |
| Topic Intelligence parallel fetch | Subsystems / Topic Intelligence | flowchart |
| Shorts production swimlane | Subsystems / Shorts / Phase G | sequenceDiagram |
| Dashboard nav graph | Dashboard / Page map | graph |
| Auth flow (post-rotation) | Infrastructure / Auth | sequenceDiagram |
| Caption burn service flow | Subsystems / Caption Burn | sequenceDiagram |

All Mermaid renders to inline SVG via `mkdocs-mermaid2-plugin` — text-labelled, AI-readable.

## 10. File Layout

```
docs-site/
├── mkdocs.yml
├── docs/
│   ├── index.md
│   ├── concepts/                       (4 pages)
│   ├── pipeline/                       (8 pages)
│   ├── subsystems/                     (6 pages)
│   ├── dashboard/                      (3 pages)
│   ├── database/                       (3 pages)
│   ├── workflows/                      (3 pages)
│   ├── prompts/                        (3 pages)
│   ├── infrastructure/                 (3 pages)
│   ├── operations/                     (3 pages)
│   └── assets/                         (images / static)
└── overrides/                          (theme overrides — empty for now)

.github/workflows/
└── deploy-docs.yml
```

Site URL: `https://akinwunmi-akinrimisi.github.io/vision-gridai-platform/`

## 11. `mkdocs.yml` Highlights

- Theme: `material`, dark/light toggle (auto-detect system preference)
- Plugins: `search`, `mermaid2`
- Markdown extensions: `admonition`, `pymdownx.superfences`, `pymdownx.tabbed`, `pymdownx.highlight`, `attr_list`, `tables`, `toc` (with permalinks)
- Edit-this-page link → `main` branch in repo

## 12. GitHub Action (`deploy-docs.yml`)

- Trigger: `push` to `main` when paths in `docs-site/**` change
- Steps: checkout → install Python 3.11 + `mkdocs-material` + `mkdocs-mermaid2-plugin` → `mkdocs gh-deploy --force`
- Pushes built site to `gh-pages` branch
- ~90 seconds end-to-end

## 13. Open Questions (awaiting confirmation before implementation)

1. **GitHub Pages enabled?** Akinwunmi to confirm Settings → Pages → Source: `gh-pages` branch is set (or will be). Not blocking spec; first deploy will fail visibly if not.
2. **Live-prompt fetch — opt in or skip?** Default is **skip** — prompt pages reflect migration-007 seed text plus a "verify against live DB" note. Optional enhancement: a Python script in the GitHub Action that pulls from live `system_prompts` / `prompt_templates` tables given the rotated service-role key as a GitHub secret. Adds ~30 lines + one secret. Not in this spec; documented as a future increment.

## 14. Risks

| Risk | Mitigation |
|---|---|
| Workflow JSON exports drift from live n8n; site shows stale info | Workflow cards labelled "snapshot of `workflows/` exports" + cross-referenced against MEMORY's workflow-ID table |
| Prompt text drifts when prompts edited via dashboard PromptCard | Documented; future increment offers live-fetch (Open Question 2) |
| Site grows stale as platform evolves | Edit-this-page link in every page footer; auto-deploy means edit-and-push is the maintenance loop |
| Conflicting `007_*.sql` migrations cause confusion | Database / Migration history page explicitly explains the three-way split |
| `CLAUDE.md`'s `@Agent.md` reference is broken | Will be flagged on the docs site's "Source files" page; may also fix the reference in a separate small commit |

## 15. Success Criteria

- All ~40 pages exist and render without errors on GitHub Pages.
- Every page has at least one Mermaid diagram OR a structured reference table (no walls of pure prose).
- Every claim about "what something does" cites a source file path or carries a `⚠ Needs verification` flag.
- The site builds and deploys via the GitHub Action without manual intervention.
- Akinwunmi can find any "how does X work" answer in the platform within 30 seconds of opening the site.
- An AI agent fed the site URL (or the `gh-pages` branch contents) can produce an accurate end-to-end platform summary without external context.

## 16. Out of Scope (explicitly)

- Importing live Supabase content as part of this spec (see Open Question 2).
- Modifying any n8n workflow, dashboard, or Supabase row.
- Reconciling the three competing `007_*.sql` migrations or the `Agent.md` filename mismatch — these are documented but not fixed here.
- A backend or any dynamic functionality.
- Any change to the existing `dashboard/`, `workflows/`, or `supabase/` trees.
