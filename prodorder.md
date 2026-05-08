# MYNEW — Production Order

Project: `19a714fd-7973-497e-bf71-993b74c3c7da` (MYNEW · AU · en-AU · 2hr_documentary)
Ranked: 2026-05-08
All 10 topics: `review_status = approved`. Fire script-gen in this sequence.

| Rank | T# | Topic ID | Title | SEO | Why |
|---|---|---|---|---|---|
| 1 | T1 | `ac60bc97-1f1a-4ab2-aca3-c8c8b5d74ddc` | Why Australia Can't Feed Itself — The Coles-Woolworths Stranglehold Exposed | A (76ch) | Blue Ocean #2 (food/duopoly). Render: demand=high, saturation=low, confidence=high. Universal Aussie relevance. |
| 2 | T2 | `89e2d058-ffca-44b9-9e11-46a046b37b78` | Australia's Healthcare Collapse — Why Emergency Rooms Have 12-Hour Waits | A (72ch) | Blue Ocean #1. Render: demand=high, saturation=none. Specific data, emotional pull. |
| 3 | T6 | `eb651da4-6c2b-4194-89bc-df7f0754d118` | Sydney's $2 Million Median — Who Actually Benefits From the Housing Crisis | A+ (74ch) | Blue Ocean #3 — "most obvious gap in entire niche." Aussie Explained format proven 100K-322K views. |
| 4 | T21 | `6438bd4d-954a-4329-80a6-8ea57a63e933` | The Lima Declaration Exposed — How One 1975 Agreement Destroyed Australian Manufacturing | B+ (88ch) | Render explicitly cites Lima Declaration as Old Australia's proven specificity-driven topic. ⚠️ 88ch — consider trimming to "The Lima Declaration — How a 1975 Agreement Destroyed Australian Manufacturing" (78ch). |
| 5 | T22 | `63f8a43f-79bd-4da9-b896-27efd5664535` | The Privatisation Playbook — How Your Power Bills Became Corporate Profits | A (75ch) | Universal hook ("your power bills"). Energy/utility privatisation flagged as moderate-saturation with high ceiling. Playlist 5. |
| 6 | T3 | `ab499c65-7bf0-4cc0-ac24-d63720b59d70` | The Water Wars Coming to Australia — Why the Next Drought Will Destroy Entire Towns | B (84ch) | Infrastructure pillar + Murray-Darling specificity. ⚠️ 84ch — consider "The Australian Water Wars — Why the Next Drought Will Destroy Entire Towns" (77ch). |
| 7 | T11 | `60442a45-2b7c-42b5-a861-77e6a09ace43` | The Australian Retirement Disaster — Why $1 Million in Super Won't Be Enough | A (76ch) | Playlist 3 anchor. Specific dollar amount drives CTR. Evergreen demand. |
| 8 | T23 | `1c9be252-3bc2-4999-b457-0852d9b97a30` | The Foreign Ownership Web — Who Actually Controls Australia's Economy | A+ (70ch) | Perfect length. Question hook + "Web" mystery framing. Playlist 5 political economy. |
| 9 | T13 | `3bc784bc-2b24-422d-9ee3-cb82f4049438` | Superannuation's Hidden Fees Are Destroying Your Retirement | A+ (60ch) | Perfect length. Power words. Solutions-led — the niche differentiator. |
| 10 | T7 | `d0dfe2cb-dee3-4a5b-a158-e61776071750` | Western Sydney's Infrastructure Trap — Why New Estates Are Economic Disasters | A (78ch) | Geographic breadth (non-Melbourne city). Diversifies Sydney-housing playlist. |

## SEO summary
- Power words in every title (Stranglehold, Collapse, Crisis, Exposed, Destroyed, Playbook, Wars, Trap, Hidden, Disaster, Web)
- Specificity in every title (Coles-Woolworths, 12-Hour, $2M, 1975, $1M)
- Question hooks in 6/10 ("Why...", "Who Actually...", "How...")
- Em-dash + subtitle pattern matches Old Australia / The Hidden Crown niche aesthetic
- 8/10 land under 80 chars; T21 (88) and T3 (84) will truncate on mobile feed

## Excluded but pending (revisit later)
- T4 — Australia vs Norway: already shipped
- T5 — Immigration 500k: ⚠️ partisan-immigration demonetization risk per render
- T8 — Chinese Investor Exodus: register=REGISTER_02_PREMIUM mismatch with sibling Sydney topics
- T9, T10, T12, T15, T16, T18 — perfect-fit but overlap heavily with top-10 picks (4 Sydney + 4 retirement would over-saturate)
- T14 — Pension Trap: ⚠️ `production_register` + `niche_variant` are NULL — set both before firing
- T17 — Prepper Survival Guide: tonal departure (investigator → survivalist), brand-safety risk
- T19 — Side Hustle Economy: variant=tax_au mismatch with content
- T20 — Profiting From Decline: investigator → opportunist tonal drift
- T24 — Central Bank Con: conspiratorial framing risk
- T25 — Climate Policy Wealth Transfer: climate-skeptic-adjacent demonetization risk

## Per-image segment duration (locked, no per-topic deviation)
Source: `WF_BUILD_SEGMENTS` (id `BYdbUw8xSA6YQEpA`), Code node L25-30.

| Emotional beat | Target | Notes |
|---|---|---|
| `data`, `revelation` | 5s | Data-dense — viewer needs visual changes to anchor specifics |
| `hook`, `tension`, `story` (default) | 8s | Wendover/Polymatter baseline narrative pacing |
| `resolution`, `transition` | 12s | Contemplative — let viewer sit with the frame |

Formula: `N = ceil(audio_duration_ms / (target_seconds × 1000))`, each segment = `audio_ms / N` (last absorbs remainder so segments sum exactly to scene audio). Audio is master clock.
