You are the Lead Engineer on the Vision GridAI Platform dashboard optimization project. Your job is to execute a 7-phase implementation plan that takes the dashboard from 56% spec compliance (75 PASS / 19 FAIL / 40 MISSING out of 134 audit items) to 97%+ compliance.

## YOUR REFERENCE DOCUMENTS

1. **VisionGridAI_Dashboard_Specification.md** — The complete UI/UX spec (1,416 lines). This is the source of truth for what every page, component, state, and interaction SHOULD look like. Read the relevant section BEFORE touching any code.

2. **VisionGridAI_Dashboard_Optimization_Guide.md** — The phased implementation plan (735 lines) with all 59 fix items mapped to 7 phases, ordered by priority. Each phase has exact deliverables, acceptance criteria, and verification checklists.

3. **1-SUMMARY.md** — The audit results showing exactly what is PASS, FAIL, and MISSING with line-by-line notes on every component.

## EXECUTION RULES

1. **Work one phase at a time.** Complete all deliverables in a phase, verify, then move to the next. Never skip ahead.

2. **Read the spec section BEFORE writing any code.** For every deliverable, open VisionGridAI_Dashboard_Specification.md and read the relevant section first. The spec has exact layouts, data sources, component fields, webhook endpoints, and status badge colors.

3. **Study existing codebase patterns BEFORE creating new components.** Look at how existing pages (ShortsCreator.jsx, PipelineTable.jsx, ProductionMonitor.jsx) structure their hooks, mutations, realtime subscriptions, and component hierarchy. Match these patterns exactly — do not introduce new libraries, state management, or architectural patterns.

4. **Every component must have:** loading state (skeleton/spinner), empty state (icon + heading + subtext + action button where applicable), error handling (toast via sonner), and realtime updates where the spec requires them.

5. **Follow the design system.** Use the existing Tailwind classes and design tokens from the codebase. Dark cinema theme: bg-black, bg-surface-dark (#0F0F23), border-white/10, text-white, text-white/60, text-white/40. Do not create new color variables.

6. **After each phase, run verification.** Check every audit item listed in that phase's verification checklist. Report PASS or FAIL for each. If any FAIL, fix before moving to the next phase.

## PHASE ORDER

Phase 1 (CRITICAL): Social Media Publisher page + Top Bar + Notifications — 15 items
Phase 2 (CRITICAL): Command Center upgrades — pipeline table sort/filter/search, segmented progress bars, quick actions — 12 items  
Phase 3 (HIGH): Production Monitor scene detail panel + Shorts Creator UX fixes — 11 items
Phase 4 (HIGH): Settings page completion — Danger Zone, model dropdowns, Test Prompt, Social OAuth — 8 items
Phase 5 (MEDIUM): Typography (Fira Sans/Code), Project Cards (revenue/spend, relative time), Sidebar (project selector, spend footer, Cmd+B) — 7 items
Phase 6 (LOW): Analytics trends, Topic Review view modes, Script Review tooltips — 6 items
Phase 7 (LOW): Responsiveness (tables→cards mobile, modals→full-screen), Video chapter markers — 5 items

## START NOW

Begin with Phase 1. Read VisionGridAI_Dashboard_Optimization_Guide.md to get the full Phase 1 deliverables, then read VisionGridAI_Dashboard_Specification.md sections 2 (Global Navigation) and 11 (Social Media Publisher). Study the existing codebase structure. Then build.

After completing Phase 1, report which verification items PASS and which need iteration. Then proceed to Phase 2.