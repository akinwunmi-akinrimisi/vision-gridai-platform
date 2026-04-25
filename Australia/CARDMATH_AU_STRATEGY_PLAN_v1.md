# CardMath × Vision GridAI — Australia Finance Strategy Plan (v1)

**Target market:** Australia 🇦🇺
**Primary niche:** Personal Finance
**Language:** English (Australian variant in keywords and examples; US-neutral voiceover acceptable)
**Production pipeline:** Vision GridAI (Claude Sonnet scripts + Seedream 4.5 + Seedance 2.0 + Google Cloud TTS Chirp 3 HD + FFmpeg)
**Target cost ceiling:** $6–$8/video
**Target CPM band:** $25–$45 long-form, Q4 peaks into $40–$60 on credit card content

This document is both a human-readable strategy plan and a platform-configuration input. Sections 4, 6, 9, and 11 contain JSON and SQL blocks that feed directly into your Supabase schema (`projects`, `topics`, `production_registers`) and into the channel-analyzer/SWOT feature.

---

## 1. Executive Summary

Australia is the single highest-CPM country on YouTube ($36.21 average vs US $32.75) against a creator density of roughly one-tenth the US field. The advertiser competition is fierce — big four banks (CBA, Westpac, ANZ, NAB), fintechs (Up, Wise, Stake), super funds with $100M+ marketing budgets (AustralianSuper, Aware Super, HESTA), mortgage aggregators (Aussie Home Loans, Lendi, Mortgage Choice), tax prep (H&R Block Australia, TaxLeopard), and comparison platforms (Canstar, Finder, RateCity) all bid aggressively for the same 26M-person audience. The creator supply is thin because the AU finance YouTube scene is dominated by a handful of established players (Aussie Wealth Creation, Rask Finance, Ben Nash, Point Hacks, SuperGuy) who collectively cover less than 20% of the actual long-tail search demand.

The play is not to compete head-on with these established creators. The play is to flood the long-tail — the hundreds of specific product comparisons, state-specific rule explanations, and time-sensitive tax/RBA responses that no individual human creator can cover at scale. Vision GridAI's 6-uploads-per-day ceiling combined with the 5-register cinematic system gives you production capacity an order of magnitude above any existing AU finance creator, and that capacity is the moat.

The top 5 sub-niches below are ranked by (CPM × unserved search volume) ÷ (existing creator density), not by raw search volume. A sub-niche with massive search demand but 10 dominant incumbents ranks lower than a sub-niche with moderate search demand and near-zero existing coverage. You want the second column, not the first.

---

## 2. Top 5 Sub-Niches — Ranked

| Rank | Sub-Niche | CPM Band (Q1) | Q4 Peak | Creator Density | Search Demand | Strategic Priority |
|------|-----------|---------------|---------|-----------------|----------------|---------------------|
| 1 | Australian Credit Cards & Points Hacking | $28–$42 | $45–$65 | Low (~30 channels) | High | **Primary** — CardMath brand-aligned |
| 2 | Superannuation Optimization | $22–$32 | $25–$35 | Low-Moderate (~20 channels) | Very High | **Primary** — annual recurring spikes |
| 3 | Property & Mortgages | $25–$38 | $28–$42 | Moderate (~50 channels) | Very High | **Secondary** — mortgage RBA cycle |
| 4 | Australian Tax Strategy | $18–$28 | $20–$32 | Low (~15 channels dedicated) | High | **Secondary** — EOFY super-cycle |
| 5 | ETF & Share Investing Australia | $20–$30 | $22–$33 | Moderate (~40 channels) | High | **Tertiary** — saturated but high-margin |

**Key observation:** The three smallest creator fields (credit cards, super, tax) carry the highest "revenue per unit of effort" scores. The larger, more saturated fields (ETF investing) still offer strong CPMs but require more aggressive differentiation to break through.

**Strategic stance:** Primary channels for the top 3 sub-niches; secondary channels (or sub-series on the main CardMath channel) for the bottom 2. See Section 10 for the single-channel vs multi-channel decision.

---

## 3. Sub-Niche #1 — Australian Credit Cards & Points Hacking

### 3.1 Definition & Scope

Content covering the Australian credit card ecosystem: card product reviews, points-earning strategy, transfer partner optimization, airline loyalty programs (Qantas Frequent Flyer, Velocity Frequent Flyer), travel redemption strategy, status tier analysis, annual fee justification math, and sign-up bonus tracking.

This is the direct extension of the CardMath brand and should be the anchor sub-niche for the main channel.

### 3.2 Why Australia-Specific

Australian credit card products operate on a **fundamentally different points economy** from the US, meaning US-focused creators physically cannot serve this audience. Key structural differences:

- **Qantas Frequent Flyer and Velocity Frequent Flyer** are the two dominant loyalty programs, not Chase Ultimate Rewards or Amex Membership Rewards.
- **Transfer ratios are different** (QFF to Emirates 1:1, Velocity to Singapore Airlines 1.35:1 for status members).
- **ASIC regulations on credit card advertising** require specific comparison rate disclosures and fair-trading language that US content doesn't include.
- **The 3-cards-in-18-months ANZ/NAB rule** is distinct from the Chase 5/24 rule US creators discuss.
- **Card issuer landscape** is concentrated (Amex, the Big Four, Citi/NAB, Bankwest, Macquarie) with distinct product lines vs the US multi-issuer sprawl.

### 3.3 Competitor Landscape (SWOT-feature input)

**Tier 1 — Dominant incumbents to learn from but not imitate:**

| Channel | Subs (approx) | Strength | Weakness / Gap |
|---------|---------------|----------|----------------|
| Point Hacks (YouTube + website) | 40K+ | Authority, detailed written guides | Slow video cadence; text-first mindset |
| Frequent Flyer Solutions | ~15K | Loyalty program depth | Single-presenter format limits volume |
| Daniel Sciberras | ~20K | Travel hacking narrative | Personal-lifestyle positioning limits breadth |
| Ashlynne Eaton | ~30K | Travel + points blend | Lifestyle tilt, not card-math focus |

**Tier 2 — Adjacent channels that touch the niche but don't own it:**

| Channel | Coverage | Gap |
|---------|----------|-----|
| Canstar | Comparison site with thin YouTube | No personality, low engagement |
| Finder.com.au | Comparison + reviews | Content is SEO-first, not viewer-first |
| Mozo | Product-focused | Low production value |

**Moat opportunities (what to configure in SWOT feature):**

1. **Speed on sign-up bonus changes.** When Amex, CBA, or Qantas Money changes a sign-up bonus, incumbent creators take 2–7 days to publish. You can publish within 4 hours at production quality equal to or better than theirs.
2. **Long-tail product coverage.** Point Hacks covers the top 15 cards thoroughly. There are ~60 active AU rewards credit cards. The bottom 45 have near-zero dedicated YouTube coverage.
3. **Mathematical rigor.** Name alignment — "CardMath" — justifies a hard analytical angle (points-per-dollar-per-year, effective cashback equivalent, break-even spend calculation) that no incumbent owns.
4. **Cross-product comparison at scale.** "Amex Platinum vs Qantas Premier Titanium vs CBA Diamond for [specific spend profile]" in 30+ permutations — one video per permutation, impossible for humans, trivial for Vision GridAI.
5. **Multi-register coverage.** Product reviews in Register 02 (Premium Authority), market/fee analysis in Register 01 (Economist), bank-practice investigations in Register 03 (Noir). Incumbents use one visual style; you use five.

### 3.4 Keyword Clusters

**Primary keywords (highest priority):**

- `best qantas credit card 2026`, `best velocity credit card 2026`
- `amex platinum australia review`, `qantas premier titanium review`
- `qantas points vs velocity points`
- `qantas transfer partners`, `velocity transfer partners`
- `credit card churning australia rules`
- `best rewards credit card australia`
- `cba diamond awards vs westpac altitude black`

**Secondary keywords (long-tail, high intent):**

- `[card name] annual fee worth it`
- `how many qantas points for [destination] business class`
- `amex platinum statement credits australia 2026`
- `qantas premier titanium complimentary flights`
- `velocity platinum status fast track`
- `fly pay later installment`

**Hyper long-tail (near-zero competition, high conversion):**

- `[bank] credit card to [airline] transfer bonus 2026`
- `is [card] still worth it after the changes`
- `[specific card] vs [specific card] for [spend profile — groceries / dining / travel]`

### 3.5 Content Pillars (recurring series formats)

1. **"The Math Behind" series** — one card per episode, CardMath signature format. Effective cashback calculation, break-even spend, true annual cost including insurance and statement credits. 10–14 min Register 01 (Economist).

2. **"Points to [Destination]" series** — one aspirational destination per episode, mapped across all feasible AU programs. Business class to Tokyo, first class to London, Business to NYC. 12–18 min Register 02 (Premium Authority).

3. **"Sign-Up Bonus Tracker"** — weekly or fortnightly news episode. Short format (4–6 min) Register 01.

4. **"Card Comparison Matrix"** — head-to-head X vs Y episodes. 8–10 min Register 01.

5. **"Status Tier Breakdown"** — QFF Platinum/Velocity Platinum/Amex Platinum Charge tier analysis, requalification strategy. 10–12 min Register 02.

6. **"Transfer Partner Deep Dive"** — Emirates Skywards, Singapore KrisFlyer, Cathay Asia Miles redemption sweet spots. 14–18 min Register 02.

7. **"Controversy" series (Register 03 Noir)** — bank account closures, unjust denials, points devaluations, BNPL debt stories. 10–14 min Register 03. Demonetization risk flagged.

### 3.6 Monetization Stack Beyond AdSense

- **Credit card affiliate referrals** via ReferRider, Point Hacks' partner program, direct issuer affiliate programs (Amex has direct referral; most AU issuers use third-party aggregators). Typical payout: $50–$250 per approved application.
- **Aggregator partnerships** (Canstar, Finder, Mozo, RateCity). Revenue share on leads.
- **Booking.com / Agoda affiliate** for travel redemption tutorials. 4–8% commission.
- **Course upsell** — "CardMath Points Masterclass" one-off product at $79–$149, pitched organically at end of high-intent videos.

### 3.7 Register Mapping

| Register | Use Case | Expected Share of Sub-Niche Output |
|----------|----------|------------------------------------|
| Register 01 — Economist | Math, comparisons, analytics, sign-up bonus tracking | 50% |
| Register 02 — Premium Authority | Redemption tutorials, destination series, status tier analysis | 35% |
| Register 03 — Investigative Noir | Bank controversies, devaluation stories, BNPL investigations | 10% |
| Register 05 — Archive | "History of Qantas Frequent Flyer," biographical pieces on founders | 5% |

### 3.8 Demonetization Risk Flags

- **MEDIUM:** Any video positioning a card as "best for X demographic" should include AFSL-style disclaimers in the description and an on-screen "general information only" title card in the first 10 seconds. ASIC enforcement on YouTube creators has increased markedly since 2024.
- **LOW:** Points strategy content (non-product-specific).
- **HIGH:** Any BNPL (Afterpay, Zip, Humm) comparison content is demonetization-risky under YouTube's own advertiser-unfriendly guidelines even though the product is legal in AU.

---

## 4. Sub-Niche #2 — Superannuation Optimization

### 4.1 Definition & Scope

Content covering Australia's mandatory retirement savings system: employer super guarantee, fund selection and consolidation, MySuper vs Choice investment options, SMSF setup and compliance, contribution cap optimization (concessional, non-concessional, bring-forward), Division 293 tax, Transition to Retirement pensions, spouse contribution splitting, and the First Home Super Saver Scheme (FHSS).

### 4.2 Why This Sub-Niche Is Underserved

Superannuation is Australia's single largest personal finance asset class — $3.9 trillion under management as of early 2026, larger than the ASX market capitalization. Every working Australian has a super account from age 15. The system is mandatory, complex, and fiddly, which means enormous search demand, but the content is dominated by fund-produced PR videos (AustralianSuper's in-house channel, Aware Super's educational content) rather than independent creator analysis.

The independent creator field is very thin:
- Chris Strano (SuperGuy) dominates SMSF content
- A handful of financial advisors run small channels
- The big accounting firm channels (HLB Mann Judd, Heffron) produce B2B-targeted content that doesn't serve individual consumers

This is one of the most exploitable content gaps in Australian YouTube finance.

### 4.3 Competitor Landscape

**Tier 1 — Incumbent educators:**

| Channel | Strength | Weakness / Gap |
|---------|----------|----------------|
| SuperGuy (Chris Strano) | Deep SMSF expertise, trust authority | Dry visual style; single presenter; slow cadence |
| Aware Super official | Corporate polish | Obvious marketing bias toward own products |
| AustralianSuper official | Same | Same |
| Industry Super Australia | Policy advocacy | Political positioning limits objectivity |

**Tier 2 — Adjacent accountants/planners:**

| Channel | Coverage | Gap |
|---------|----------|-----|
| Various CPA Australia affiliates | Technical accuracy | B2B tone, not consumer-friendly |
| Heffron SMSF | Elite SMSF advice | Paywalled and advisor-targeted |

**Moat opportunities:**

1. **Fund-neutral analysis** — unlike fund-produced content, your coverage can compare AustralianSuper vs Aware vs UniSuper vs Hostplus on hard metrics (10-year returns, fees, insurance defaults) without promotional bias.
2. **Volume on policy changes** — super rules change every federal budget (May) and every EOFY (July). Being first to publish detailed breakdowns of contribution cap changes, TBC movements, transfer balance cap updates is a recurring annual moat.
3. **Life-stage content matrix** — "Super at 25," "Super at 35," "Super at 45," "Super at 55," "Super at 60 (access phase)" — 5 evergreen videos that refresh annually with one swap of the contribution cap numbers.
4. **Life-situation content matrix** — "Super for freelancers," "Super for teachers (UniSuper)," "Super for healthcare (HESTA)," "Super for tradies (Cbus)," "Super for government (CSS/PSS)." Each of these is underserved and ranks for niche search.

### 4.4 Keyword Clusters

**Primary:**

- `best super fund 2026`, `australian super vs aware super`
- `super contribution caps 2026`
- `how to consolidate super`
- `smsf setup australia cost`
- `first home super saver scheme`
- `transition to retirement pension`

**Secondary:**

- `division 293 tax explained`
- `salary sacrifice super worth it`
- `unused concessional cap carry forward`
- `super splitting spouse`
- `[fund name] vs [fund name] returns`

**Hyper long-tail:**

- `super for freelancers australia`
- `how much super should I have at [age]`
- `smsf vs retail fund [specific scenario]`
- `[fund] MySuper vs Balanced vs High Growth`

### 4.5 Content Pillars

1. **"Super at [age]" evergreen series** — how much you should have, what you should be doing, what to fix. 5 episodes refreshed annually. 10–14 min Register 01.
2. **"Fund vs Fund" matrix** — top 20 AU super funds compared head-to-head in rotating pairings. 8–10 min Register 01.
3. **"Budget Night Response"** — live-ish episodes published within 48 hours of federal budget covering super changes. 6–10 min Register 01 or 04 (Signal — for policy/tech angle).
4. **"EOFY Super Checklist"** — annual recurring piece published each May. 12–16 min Register 01.
5. **"SMSF Deep Dive" series** — setup, running costs, investment strategy, wind-up. 14–20 min Register 01. Niche but high-CPM audience.
6. **"Life Situation" series** — freelancer, teacher, nurse, tradie, public servant super situations. 10–12 min Register 01 with niche variant.

### 4.6 Monetization Stack

- **Industry super fund referrals** — some funds (not all) have creator partnership programs.
- **SMSF administrator affiliate** — Heffron, Esuperfund, SelfWealth SMSF, Stake Super. $50–$300 per referral.
- **Insurance (inside super) affiliates** — NobleOak, TAL. Moderate commissions.
- **Life insurance broker partnerships** — significant potential given super's role in TPD/life cover.
- **Financial advisor lead gen** — partnership with advice networks like AdviceRevolution or AdviserVoice for qualified leads, typically $100–$400 per lead.

### 4.7 Register Mapping

| Register | Use Case | Share |
|----------|----------|-------|
| Register 01 — Economist | Policy analysis, fund comparisons, math-heavy retirement planning | 70% |
| Register 05 — Archive | "History of Australian super (1992 to today)," founder stories | 15% |
| Register 04 — Signal | Tech-forward angle on super tech (mobile apps, SMSF platforms, roboadvice) | 10% |
| Register 02 — Premium Authority | Retirement lifestyle aspirational content | 5% |

### 4.8 Demonetization Risk Flags

- **MEDIUM-HIGH:** Super is technically a financial product. ASIC's "general advice warning" is legally required in some content formats. Safe approach: every video opens with a short general-advice disclaimer title card, and every description includes the full AFSL-style disclaimer text.
- **LOW:** Policy explainers (budget breakdowns, contribution cap changes) — these are journalism, not advice.
- **HIGH:** Any video directly recommending an SMSF for a specific demographic without a licensed advisor's involvement could attract regulatory scrutiny. Frame all SMSF content as educational and always caveat with "see a licensed advisor."

---

## 5. Sub-Niche #3 — Property & Mortgages

### 5.1 Definition & Scope

Content covering the Australian residential property market: mortgage product selection (variable, fixed, split), offset accounts, first home buyer schemes, investment property strategy, negative gearing, capital gains tax on property, state-by-state stamp duty and land tax, Home Guarantee Scheme (5% deposit), mortgage broker vs bank, refinance strategy, and rentvesting.

### 5.2 Why It Ranks #3 Not Higher

The creator field in AU property is more crowded than super or tax — roughly 40–60 dedicated channels, including some large players (Michael Yardney, Stuart Wemyss, Chris Bates, PK Gupta, Simon Arcus, Aus Property Podcast). The sub-niche also carries higher demonetization risk because property investment content is adjacent to get-rich-quick advertising categories that YouTube is cautious about.

Still, the CPM is high enough and the search demand deep enough that this belongs in the top 5 — just as a secondary priority, not primary.

### 5.3 Competitor Landscape

**Tier 1 — Dominant incumbents:**

| Channel | Strength | Weakness / Gap |
|---------|----------|----------------|
| Michael Yardney | Brand authority, book | Older demographic, slow video cadence, high self-promotion |
| Aus Property Podcast (Bryce Holdaway / Ben Kingsley) | Analytical depth, established audience | Podcast-format video, not YouTube-native |
| PK Gupta | Data-driven property investing | Single-investor lens, Sydney-centric |
| Chris Bates | Buyer's agent expertise | Service business drives content priorities |

**Tier 2:**

| Channel | Coverage | Gap |
|---------|----------|-----|
| Domain.com.au | Market reports | Corporate tone |
| CoreLogic AU | Data research | B2B positioning |
| Mortgage Choice / Aussie | Product marketing | Obvious advertising |

**Moat opportunities:**

1. **State-by-state rigor.** Most creators are Sydney- or Melbourne-centric. Perth, Brisbane, Adelaide, Hobart, Darwin, Canberra markets each have distinct land-tax regimes, stamp duty rates, and growth dynamics. 8 capital cities × 5 topics each = 40 videos with near-zero competition.
2. **RBA response speed.** When the RBA changes the cash rate (now 8 times per year), property content creators take 24–72 hours to publish detailed analysis. You can publish within 2–4 hours.
3. **First-home buyer scheme navigation.** FHSS, Home Guarantee Scheme, state FHOG grants, stamp duty concessions — each state has different rules that change annually. One video per state per scheme × ongoing updates = high volume, near-zero competition.
4. **Mortgage math.** Offset account optimization, LMI break-even, refinance break-even, fixed-vs-variable scenario modeling. Name-aligned analytical angle ("CardMath" brand → "MortgageMath" sub-series) owns this space.

### 5.4 Keyword Clusters

**Primary:**

- `first home buyer australia 2026`
- `home guarantee scheme 5% deposit`
- `offset account explained`
- `fixed vs variable mortgage 2026`
- `negative gearing explained`
- `stamp duty calculator [state]`
- `mortgage broker vs bank`

**Secondary:**

- `rentvesting strategy`
- `LMI break even point`
- `refinance mortgage australia`
- `investment property tax deductions`
- `[state] land tax thresholds`
- `RBA cash rate decision response`

**Hyper long-tail:**

- `first home super saver vs [state] scheme`
- `offset account vs extra repayments math`
- `subdivide property cgt australia`
- `granny flat tax implications`
- `[specific suburb] property market analysis`

### 5.5 Content Pillars

1. **"RBA Response" cadence** — within 4 hours of every RBA announcement, a 6–10 min breakdown of cash rate decision and mortgage/property implications. Register 01.
2. **"State by State" matrix** — 8 capital cities × 5 recurring topics (market outlook, stamp duty, land tax, grants, growth corridors). 40 videos baseline. Register 01.
3. **"Buy or Rent" life-stage series** — for early career, mid-career, pre-retirement, retired. Register 01.
4. **"Investment Property Math" series** — yield calculations, negative gearing scenarios, capital growth forecasts. Register 01.
5. **"Market Crash Analysis" series (Register 03 Noir)** — historical Australian property crashes (1989, 1990–91, 2008, 2018), lessons learned. 14–20 min Register 03. Careful demonetization handling.
6. **"Luxury Real Estate Tour" series (Register 02 Premium Authority)** — aspirational property content, Sydney harbourside, Melbourne Toorak, Perth Dalkeith, Gold Coast. 10–14 min Register 02.

### 5.6 Monetization Stack

- **Mortgage broker referrals** — Lendi, Aussie Home Loans, Finspo, Joust. $200–$800 per settled loan (variable).
- **Home loan comparison affiliate** — Canstar, Finder, RateCity.
- **Conveyancer partnerships** — state-specific conveyancing affiliates.
- **Buyer's agent referrals** — significant partnership potential, $500–$3000+ per referred client (but low conversion).
- **Property investment course affiliates** — careful, high demonetization risk if pitched aggressively.

### 5.7 Register Mapping

| Register | Use Case | Share |
|----------|----------|-------|
| Register 01 — Economist | Analytical content, state-by-state, RBA response | 60% |
| Register 02 — Premium Authority | Luxury real estate, aspirational property | 20% |
| Register 03 — Investigative Noir | Market crash analysis, dodgy developer stories | 10% |
| Register 05 — Archive | History of AU property, biographical pieces | 10% |

### 5.8 Demonetization Risk Flags

- **MEDIUM-HIGH overall.** Property investment content attracts scrutiny both from YouTube (advertiser-unfriendly "get rich quick" flag risk) and from ASIC (property is currently unregulated as financial advice but legislation is under review).
- **LOW:** First home buyer educational content, RBA explainers.
- **HIGH:** Anything pitching property as "guaranteed returns" or "passive income" or "replace your salary in 3 years." Strict editorial rules: never promise returns, always caveat with historical volatility, avoid the "financial freedom" verbiage that triggers both viewer skepticism and YouTube's ad filters.

---

## 6. Sub-Niche #4 — Australian Tax Strategy

### 6.1 Definition & Scope

Content covering the Australian Tax Office (ATO) regime: individual tax returns, work-related deductions (car, home office, self-education, uniforms, tools), franking credits and dividend imputation, capital gains tax discount, HECS/HELP debt indexation strategy, salary sacrificing, novated leases (particularly EV FBT exemption), Medicare levy surcharge, private health insurance tax implications, negative gearing tax treatment, and the Stage 3 tax cuts (implemented July 2024, relevant to all FY2025+ content).

### 6.2 Why This Sub-Niche Is a Sleeper

Tax content is boring, which is why almost no individual AU YouTuber owns it. The field is:

- A handful of chartered accountant practice channels (thin audiences, B2B tone)
- Almost no consumer-focused dedicated tax YouTubers
- The ATO's own educational content (official but low engagement)
- A smattering of accountants' quick TikToks that don't translate to long-form

Yet every working Australian files a tax return annually, and the EOFY (June 30) creates a massive annual search spike starting in early May and running through October. CPMs are solid ($18–$28) because tax software (MyTax, Etax, TaxTim), accountants (H&R Block, ITP), and novated lease providers (Maxxia, RemServ, SG Fleet) bid aggressively for this high-intent audience.

The "Australian Tax Strategy" label also encompasses tangential topics that command even higher CPMs individually — novated leases for EVs (Tesla, BYD, Polestar dealer partnerships) sit at $25–$40 CPM because the car dealers bid hard.

### 6.3 Competitor Landscape

**Tier 1:**

| Channel | Strength | Weakness / Gap |
|---------|----------|----------------|
| H&R Block Australia | Brand recognition | Overt promotional tilt |
| Various CPA firms | Technical accuracy | B2B tone, low production |
| ATOtv (official) | Authority | Dry; compliance-focused not strategy-focused |

**Tier 2:**

| Channel | Coverage | Gap |
|---------|----------|-----|
| Individual accountant channels (~10 small) | Personal expertise | Low production, low cadence |
| Etax, TaxTim | Software tutorials | Software-focused not strategy-focused |

**Moat opportunities:**

1. **Near-zero dominant creator in the consumer tax strategy space.** This is the most exploitable gap of all five sub-niches — high CPM, high search demand, near-zero incumbent quality.
2. **Deduction-specific video per category.** 30+ work-related deduction categories, each a separate video. "Teacher deductions," "Tradie deductions," "IT worker deductions," "Medical professional deductions," "Healthcare worker deductions," "Uber driver deductions," etc.
3. **EV novated lease content** — Tesla Model Y, Tesla Model 3, BYD Atto 3, Polestar 2, each with fully worked FBT-exempt novated lease math. Extremely high-CPM audience (car dealers + lease providers bid aggressively).
4. **HECS/HELP indexation response** — indexation rate is announced each June 1 and applied June 1. Breaking-news video on day of announcement, every year.
5. **Franking credits explainer matrix** — franking is uniquely Australian and poorly understood. "What are franking credits," "How franking affects your refund," "SMSF franking credits," "Franking credits in pension phase" — each its own video.

### 6.4 Keyword Clusters

**Primary:**

- `tax return australia 2026`
- `work from home deduction ato`
- `franking credits explained`
- `novated lease tesla model y`
- `hecs help indexation 2026`
- `salary sacrifice explained`

**Secondary:**

- `[profession] tax deductions`
- `car expense deduction methods`
- `medicare levy surcharge thresholds`
- `private health insurance tax rebate`
- `stage 3 tax cuts calculator`

**Hyper long-tail:**

- `novated lease [specific EV model] full cost breakdown`
- `[profession] home office deduction 67c vs actual`
- `capital gains tax main residence exemption [scenario]`
- `crypto tax ato [specific scenario]`

### 6.5 Content Pillars

1. **"EOFY Series"** — 10-video series published annually from mid-May through end of June covering deduction maximization, super contributions, CGT strategies, prepayment opportunities. Register 01.
2. **"Profession-Specific Deductions"** — 30+ evergreen videos, one per occupation. Register 01.
3. **"Novated Lease Explained" matrix** — top 10 EVs fully modeled. Register 01 with niche_variant for EV/tech crossover.
4. **"Franking Credits" series** — 6-8 videos covering every angle. Register 01.
5. **"Tax Office Updates" cadence** — whenever ATO issues a ruling, practice note, or enforcement announcement. Register 01 or Register 03 (for enforcement/crackdown stories).
6. **"Tax Scam Investigation" series (Register 03 Noir)** — MyGov impersonation scams, fake refund calls, tax agent misconduct cases. 12–16 min Register 03.

### 6.6 Monetization Stack

- **Tax software affiliates** — Etax, TaxTim, TaxBuddy. Modest per-signup fees.
- **Novated lease provider partnerships** — Maxxia, RemServ, SG Fleet, Toyota Fleet, Tesla direct. These are the most lucrative partnerships in the entire AU finance YouTube space — $500–$2,500+ per signed lease.
- **Accountant referrals** — network of AU accounting firms. Significant per-client value.
- **Financial planner lead gen** — as in super.

### 6.7 Register Mapping

| Register | Use Case | Share |
|----------|----------|-------|
| Register 01 — Economist | Most tax strategy, deduction content, ATO policy | 80% |
| Register 03 — Investigative Noir | Scams, enforcement, tax agent misconduct | 12% |
| Register 04 — Signal | EV novated lease (tech-forward framing), crypto tax | 8% |

### 6.8 Demonetization Risk Flags

- **LOW overall.** Tax is one of the safer finance sub-niches because it's education, not advice.
- **LOW:** Deduction tutorials, policy explainers, EOFY guides.
- **MEDIUM:** Crypto tax content (crypto is demonetization-adjacent).
- **MEDIUM-HIGH:** Aggressive tax minimization strategies that skirt the line between avoidance and evasion should be framed as "here's what the ATO allows" rather than "here's how to minimize tax."

---

## 7. Sub-Niche #5 — ETF & Share Investing Australia

### 7.1 Definition & Scope

Content covering Australian share market investing: ASX-listed ETFs (VAS, VGS, VDHG, A200, IVV, NDQ, etc.), broker platform comparisons (CommSec, Stake, SelfWealth, Pearler, CMC, moomoo, Sharesies), franked dividends and dividend reinvestment plans (DRP), Barefoot Investor methodology, micro-investing apps (Raiz, Spaceship), LICs vs ETFs, thematic and sector ETFs, and international exposure via ASX-listed vehicles.

### 7.2 Why It Ranks Last in the Top 5

This is the most saturated AU finance sub-niche. Rask Finance, Aussie Wealth Creation, Captain FI, Equity Mates, Ben Nash, Hack Your Wealth — all established. However, the long-tail is still exploitable because:

- New ETF launches happen constantly (BetaShares, Vanguard, Global X all launching dozens per year)
- Broker platform changes (fee drops, feature rollouts) create recurring content opportunities
- Tax-time ETF content is a guaranteed annual spike
- The "which broker" question has no single correct answer, which means permutation-based content (for traders vs buy-and-hold, for small portfolios vs large, for international vs domestic) can be produced at volume

### 7.3 Competitor Landscape

**Tier 1:**

| Channel | Strength | Weakness / Gap |
|---------|----------|----------------|
| Rask Finance | Podcast + YouTube, deep analysis | Slow visual production; single-host format |
| Aussie Wealth Creation | Consistent output, educational tone | Personality-led, limits scaling |
| Captain FI | FIRE movement credibility | Niche within niche |
| Equity Mates | Podcast strength | YouTube is secondary |

**Tier 2:**

| Channel | Coverage | Gap |
|---------|----------|-----|
| Ben Nash | Financial advisor | Ad-heavy content |
| Betashares official | ETF education | Obvious self-promotion |
| Vanguard Australia | Same | Same |

**Moat opportunities:**

1. **ETF launch response.** When a new ETF launches on the ASX, most creators take 1–2 weeks. You can publish a full analytical breakdown within 24 hours.
2. **Permutation content.** "Best broker for [specific scenario]" across 20+ scenarios. Each a separate video.
3. **"VDHG vs DIY portfolio" matrix** — at various portfolio sizes, various rebalancing frequencies, various tax situations.
4. **Franked dividend + ETF interaction** — poorly covered. Tax implications of ETF distributions with franking credits is an under-served sub-topic.
5. **International allocation via ASX** — IVV vs VGS vs IOO vs NDQ vs BGBL, each with different fee, currency hedging, and tax treatment. Matrix content.

### 7.4 Keyword Clusters

**Primary:**

- `best etf australia 2026`
- `vas vs vgs`, `vdhg review`
- `best broker australia`
- `commsec vs stake vs selfwealth`
- `raiz vs spaceship`
- `franked dividends explained`

**Secondary:**

- `[ETF ticker] review`
- `asx dividend etf`
- `how to invest $[amount] australia`
- `dollar cost averaging asx`
- `dividend reinvestment plan tax`

**Hyper long-tail:**

- `vdhg vs 3-fund portfolio`
- `[ETF A] vs [ETF B] after tax return`
- `chess sponsored vs custodian broker`
- `international etf currency hedged vs unhedged`
- `best lic australia 2026`

### 7.5 Content Pillars

1. **"ETF Launch Response"** — cadence whenever a new ETF lists on ASX. Register 01.
2. **"Broker Comparison Matrix"** — 20+ scenario-specific videos. Register 01.
3. **"Core Portfolio" series** — for $1k, $10k, $50k, $100k, $500k portfolio sizes. Register 01.
4. **"Franking Credit Deep Dive"** (overlap with tax sub-niche). Register 01.
5. **"FIRE in Australia"** series — FIRE movement adapted to AU tax system. Register 01.
6. **"Tech and Fintech ETF" series (Register 04 Signal)** — thematic ETFs covering AI, robotics, cybersecurity via ASX vehicles. Register 04.

### 7.6 Monetization Stack

- **Broker affiliate programs** — Stake, SelfWealth, Pearler, CMC have affiliate programs. $20–$75 per funded signup.
- **Micro-investing app affiliates** — Raiz, Sharesies. Modest fees.
- **Course upsell** — FIRE-related or portfolio-construction courses.
- **Book affiliate** (Barefoot Investor, Equity Mates book).

### 7.7 Register Mapping

| Register | Use Case | Share |
|----------|----------|-------|
| Register 01 — Economist | Majority of content | 75% |
| Register 04 — Signal | Thematic ETFs, fintech, AI/crypto | 15% |
| Register 05 — Archive | "History of the ASX," historical market events | 10% |

### 7.8 Demonetization Risk Flags

- **MEDIUM:** Specific stock recommendations carry general-advice-warning requirements. Frame all content as "here's the data, here's how it works" not "here's what to buy."
- **LOW:** ETF explainers, broker comparisons.
- **HIGH:** Any "how I made $X from this trade" content — both ASIC-risky and YouTube-ad-risky. Avoid.

---

## 8. Cross-Sub-Niche Moat & SWOT Framework

This section defines the inputs your platform's channel-analyzer / SWOT feature should ingest and the logic it should apply.

### 8.1 Channel Analysis Input Schema

For each competitor channel identified in Sections 3.3, 4.3, 5.3, 6.3, and 7.3, the analyzer should ingest:

```json
{
  "channel_handle": "string",
  "channel_id": "string",
  "sub_niche": "enum: credit_cards | super | property | tax | etf_investing",
  "tier": "enum: tier_1_incumbent | tier_2_adjacent",
  "subscriber_count": "integer",
  "avg_upload_cadence_days": "integer",
  "last_upload_at": "timestamp",
  "top_10_videos": [
    {
      "video_id": "string",
      "title": "string",
      "published_at": "timestamp",
      "view_count": "integer",
      "duration_seconds": "integer",
      "primary_keywords": ["string"]
    }
  ],
  "content_pillars_observed": ["string"],
  "production_style_notes": "string",
  "known_strengths": ["string"],
  "known_weaknesses_and_gaps": ["string"],
  "competitive_threat_score": "integer 1-10",
  "avoidance_topics": "string — topics already covered so well by this channel that we should not directly compete",
  "gap_topics": "string — topics this channel has NOT covered well that we should target"
}
```

### 8.2 SWOT Output Schema

The platform should produce per-sub-niche SWOT outputs in this shape:

```json
{
  "sub_niche": "enum",
  "analysis_date": "timestamp",
  "strengths": {
    "production_volume": "6 videos/day vs incumbent avg 2/week",
    "cinematic_register_diversity": "5 distinct registers vs incumbents' single style",
    "response_speed_to_news": "4 hours vs incumbent 2-7 days",
    "cross_sub_niche_synthesis": "can produce parallel tax + super + property videos on same policy change"
  },
  "weaknesses": {
    "trust_deficit": "no established personality, no AFSL",
    "no_local_presence": "content produced from Nigeria, may show in research/idioms",
    "regulatory_distance": "cannot provide personal financial advice"
  },
  "opportunities": [
    "array of specific content gap topics surfaced from competitor analysis"
  ],
  "threats": [
    "incumbent channel X just launched similar series",
    "ASIC regulation changes on finance content",
    "YouTube demonetization policy updates"
  ],
  "moat_actions": [
    "array of concrete steps to build defensibility"
  ]
}
```

### 8.3 Gap Scoring Algorithm

For any proposed topic at Gate 1, the platform should score it on:

```
gap_score = (search_volume × cpm_band) / (incumbent_coverage_depth × incumbent_authority)

where:
- search_volume = monthly AU searches for the topic's primary keyword
- cpm_band = midpoint of the sub-niche's CPM band
- incumbent_coverage_depth = count of Tier-1 videos on this exact topic published in last 24 months
- incumbent_authority = sum(subscriber_counts of top-3 ranking channels for this keyword)
```

Topics scoring above a threshold (to be tuned empirically after first 50 videos) pass Gate 1. Topics below the threshold fall to a "refine or discard" bucket.

### 8.4 Moat-Action Priority Matrix

Actions the platform should prioritize encoding into topic selection and script generation:

1. **Speed moat:** Any topic where the incumbent response time exceeds 24 hours gets a +20% gap_score boost when published within 4 hours.
2. **Matrix moat:** Any topic that extends an existing matrix series (e.g., "Super at 35" when "Super at 25, 45, 55, 60" already exist) gets a +15% boost.
3. **State-specific moat:** Any AU property or tax topic specific to a non-Sydney/Melbourne state gets a +10% boost.
4. **Long-tail precision moat:** Any topic with a primary keyword search volume between 500–5000 (too small for incumbents to bother with) gets a +25% boost.
5. **Cross-niche synthesis moat:** Any topic that combines 2+ sub-niches in one video (e.g., "EV novated lease through SMSF") gets a +10% boost and unique uncontested positioning.

---

## 9. Australian Financial Calendar — Seasonal Content Engine

The AU financial year runs **July 1 to June 30**, not January to December. This creates a fundamentally different content calendar from the US market. The platform should schedule evergreen content refreshes and seasonal spike content around this calendar.

### 9.1 Monthly Calendar

| Month | Events | Content Priority | Target Sub-Niche |
|-------|--------|------------------|------------------|
| **January** | New calendar year, ATO begins processing late returns | Goal-setting, financial resolutions, general evergreen | All (light volume) |
| **February** | RBA first meeting of year; Super fund mid-year reports | RBA response; super mid-year review | Property, Super |
| **March** | RBA; dividend reporting season begins | Franking credits, ETF distributions | ETF, Tax |
| **April** | RBA; insurance renewal cycle | Health insurance tax, novated lease | Tax |
| **May** | **Federal Budget (second Tuesday)**; RBA; EOFY approach begins | **Budget response**; EOFY preparation | All — huge spike |
| **June** | **EOFY June 30**; HECS indexation announced June 1; RBA | **EOFY deductions, super contributions, CGT harvesting** | **Tax, Super — peak** |
| **July** | New FY begins; tax return season opens | Tax return walkthroughs; new FY caps | Tax |
| **August** | Tax return peak; super fund annual returns released | Tax return strategy; fund performance | Tax, Super |
| **September** | ASX reporting season; RBA | Share investing, dividend-focused | ETF |
| **October** | Tax lodgement deadline (end of Oct for self-lodgers); RBA | Last-minute tax; Q4 CPM ramp begins | Tax |
| **November** | Black Friday / Cyber Monday; RBA; Melbourne Cup | **Credit card Q4 peak; spending strategy** | **Credit Cards — peak** |
| **December** | Christmas spend; RBA Dec meeting | **Credit card holiday strategy; EOCY review** | **Credit Cards — peak** |

### 9.2 Annual Recurring Content Schedule

The platform should auto-schedule these recurring topics each year:

```yaml
annual_recurring_schedule:
  - topic: "Federal Budget response — super changes"
    sub_niche: super
    publish_within_hours_of: "federal_budget_speech"
    register: REGISTER_01_ECONOMIST
    priority: P0

  - topic: "Federal Budget response — tax changes"
    sub_niche: tax
    publish_within_hours_of: "federal_budget_speech"
    register: REGISTER_01_ECONOMIST
    priority: P0

  - topic: "Federal Budget response — property impact"
    sub_niche: property
    publish_within_hours_of: "federal_budget_speech"
    register: REGISTER_01_ECONOMIST
    priority: P0

  - topic: "HECS/HELP indexation announcement response"
    sub_niche: tax
    publish_within_hours_of: "hecs_indexation_announcement"
    register: REGISTER_01_ECONOMIST
    priority: P0

  - topic: "RBA cash rate decision response"
    sub_niche: property
    publish_within_hours_of: "rba_announcement"
    register: REGISTER_01_ECONOMIST
    priority: P1
    cadence: every_rba_meeting

  - topic: "EOFY Super Contribution Checklist"
    sub_niche: super
    publish_date: "annually_june_1"
    register: REGISTER_01_ECONOMIST
    priority: P0

  - topic: "EOFY Tax Deduction Checklist"
    sub_niche: tax
    publish_date: "annually_may_15"
    register: REGISTER_01_ECONOMIST
    priority: P0

  - topic: "New Financial Year: What's Changed"
    sub_niche: all
    publish_date: "annually_july_1"
    register: REGISTER_01_ECONOMIST
    priority: P0

  - topic: "Black Friday Credit Card Strategy"
    sub_niche: credit_cards
    publish_date: "annually_november_1"
    register: REGISTER_02_PREMIUM
    priority: P0

  - topic: "Christmas Spend Maximization"
    sub_niche: credit_cards
    publish_date: "annually_december_1"
    register: REGISTER_02_PREMIUM
    priority: P0
```

### 9.3 Q4 CPM Spike Strategy

AU Q4 CPMs run 40–75% above annual average. The platform should:

1. **Batch-produce** in August and September. Build a 40-video buffer before October 1.
2. **Publish most aggressively** between October 15 and December 20 (peak advertiser spend window).
3. **Prioritize credit card sub-niche** during this window (highest Q4 uplift).
4. **Avoid publishing major evergreen content in January**, when CPMs drop 30–50% post-holiday.

---

## 10. Channel Architecture — Single vs Multi-Channel Decision

### 10.1 Recommendation: Hub-and-Spoke

**Hub channel — CardMath.** Covers credit cards (primary), general money strategy, top-tier content from all other sub-niches. Highest production quality, broadest audience.

**Spoke channels (optional, Phase 2+):**
- **CardMath Super** — dedicated super fund coverage
- **CardMath Property** — dedicated property/mortgage coverage
- **CardMath Tax** — dedicated tax strategy coverage

**Why hub-and-spoke over single-channel:**
- Audience segmentation is cleaner (a viewer seeking super content doesn't want to wade through credit card content).
- Each spoke builds its own authority and subscriber base.
- YouTube's algorithm favors channel-level topic consistency; a mixed-topic channel can underperform vs focused channels.
- Risk distribution — a demonetization hit on one spoke doesn't affect the others.

**Why not start with multiple channels:**
- Splits your production volume across channels when volume is your moat.
- Each new channel needs its own branding, subscriber base, monetization threshold (1,000 subs + 4,000 watch hours).
- Adds operational complexity at Gate 1 and Gate 4.

**Phase sequence:**
1. **Phase 1 (months 0–6):** CardMath hub only. All 5 sub-niches flow through one channel. Target 1,000 subs and monetization within first 90 days.
2. **Phase 2 (months 6–12):** Launch CardMath Super as the first spoke (highest CPM uplift potential among spokes). Continue hub.
3. **Phase 3 (months 12–18):** Launch CardMath Property and CardMath Tax in sequence based on which sub-niche is performing strongest on the hub.

### 10.2 Cross-Linking Strategy

- End-card cross-promotes from hub → spokes (when spokes exist).
- Pinned comment on spoke videos links to the hub.
- End-of-video "Want more on [sub-niche]? Check out CardMath Super" CTA (scripted into Register 01 templates).
- Community-tab cross-posts (once each channel hits eligibility).

---

## 11. Platform Configuration Blocks

This section provides the concrete Supabase SQL and JSON config that your platform should ingest to activate Australia-targeted production.

### 11.1 Projects Table — CardMath AU Project

```sql
INSERT INTO projects (
  name,
  country_target,
  language,
  style_dna,
  primary_niche,
  channel_type,
  cost_ceiling_usd,
  created_at
) VALUES (
  'CardMath_AU_Hub',
  'AU',
  'en-AU',
  'Modern Finance / Premium — dark navy (#0A0E1A) base, blue accent (#4A9EFF), gold chip details (#D4AF37), clean sans-serif typography (Inter/Inter Tight), editorial photography emphasis, generous negative space, cinematic 35mm grain, documentary photorealism',
  'personal_finance',
  'hub',
  8.00,
  NOW()
);
```

### 11.2 Sub-Niche Registration (topics.niche_variant values)

The platform's `topics.niche_variant` column should accept these values for CardMath AU:

```json
{
  "niche_variants": [
    {
      "value": "credit_cards_au",
      "display_name": "Australian Credit Cards & Points",
      "default_register": "REGISTER_02_PREMIUM",
      "fallback_register": "REGISTER_01_ECONOMIST",
      "cpm_band_usd": [28, 45],
      "q4_peak_usd": [45, 65],
      "demonetization_risk": "medium",
      "priority": "P0"
    },
    {
      "value": "super_au",
      "display_name": "Australian Superannuation",
      "default_register": "REGISTER_01_ECONOMIST",
      "fallback_register": "REGISTER_01_ECONOMIST",
      "cpm_band_usd": [22, 32],
      "q4_peak_usd": [25, 35],
      "demonetization_risk": "medium-high",
      "priority": "P0",
      "required_disclaimers": ["general_advice_warning_au"]
    },
    {
      "value": "property_mortgage_au",
      "display_name": "Australian Property & Mortgages",
      "default_register": "REGISTER_01_ECONOMIST",
      "fallback_register": "REGISTER_02_PREMIUM",
      "cpm_band_usd": [25, 38],
      "q4_peak_usd": [28, 42],
      "demonetization_risk": "medium-high",
      "priority": "P1",
      "required_disclaimers": ["past_performance_au", "general_advice_warning_au"]
    },
    {
      "value": "tax_au",
      "display_name": "Australian Tax Strategy",
      "default_register": "REGISTER_01_ECONOMIST",
      "fallback_register": "REGISTER_01_ECONOMIST",
      "cpm_band_usd": [18, 28],
      "q4_peak_usd": [20, 32],
      "demonetization_risk": "low",
      "priority": "P1"
    },
    {
      "value": "etf_investing_au",
      "display_name": "Australian ETF & Share Investing",
      "default_register": "REGISTER_01_ECONOMIST",
      "fallback_register": "REGISTER_04_SIGNAL",
      "cpm_band_usd": [20, 30],
      "q4_peak_usd": [22, 33],
      "demonetization_risk": "medium",
      "priority": "P2",
      "required_disclaimers": ["general_advice_warning_au"]
    }
  ]
}
```

### 11.3 Register Config — AU-Specific Anchor Strings

Following the v2 implementation guide (object-shaped `image_anchors` with niche variants), add these entries to `production_registers.config.image_anchors`:

```sql
-- REGISTER 01 — ECONOMIST — add credit_cards_au, super_au, property_mortgage_au, tax_au, etf_investing_au variants
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  (config->'image_anchors') ||
  jsonb_build_object(
    'credit_cards_au', 'editorial documentary photography featuring Australian financial subjects (card products on dark marble or leather surfaces, QFF or Velocity branded materials suggested but not reproduced, Sydney Harbour or Melbourne skyline context where relevant), natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth palette with selective amber on gold card chip details, subtle 35mm film grain, rule-of-thirds composition preserving negative space for overlay typography, analytical editorial grading, documentary photorealism, hands holding cards or figures from behind only',

    'super_au', 'editorial documentary photography featuring Australian retirement and workplace contexts (office settings, mature professionals in silhouette, Australian currency, retirement imagery in golden hour), natural cinematic lighting with warm directional key, medium-shallow depth of field, muted neutral palette with earth-tone bias, subtle 35mm film grain, horizontal composition with generous negative space, institutional editorial grading, documentary photorealism, subjects as silhouettes or hands only',

    'property_mortgage_au', 'editorial architectural photography featuring Australian residential property (federation terraces, modern apartments, suburban family homes, Australian suburban streetscapes, Sydney or Melbourne or Brisbane context), natural golden-hour daylight with warm directional rake, medium depth of field preserving architectural detail, warm earth-tone and blue-sky palette, subtle 35mm grain, horizontal sky-ground composition, professional real-estate editorial grading, documentary photorealism',

    'tax_au', 'editorial documentary photography featuring Australian administrative and professional contexts (ATO-evocative but never reproducing logos, tax documents, calculators, mid-career professionals in silhouette, Canberra or corporate settings), cool-neutral institutional lighting, medium depth of field, muted desaturated palette with blue-gray bias, subtle 35mm grain, formal rule-of-thirds composition, institutional editorial grading, documentary photorealism',

    'etf_investing_au', 'editorial documentary photography featuring Australian market and trading contexts (ASX-evocative trading floor imagery, stock ticker displays, laptops with chart overlays, mature investors in silhouette), natural studio lighting with cool-neutral key, medium-shallow depth of field, muted controlled-warmth palette with selective blue accent on data-adjacent elements, subtle 35mm grain, architectural composition, analytical editorial grading, documentary photorealism'
  )
),
updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

-- REGISTER 02 — PREMIUM — add credit_cards_au, property_mortgage_au variants (the two top-CPM AU sub-niches that warrant luxury treatment)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  (config->'image_anchors') ||
  jsonb_build_object(
    'credit_cards_au', 'luxury editorial photography featuring Australian travel and premium card contexts (metal credit card against dark marble, Qantas Chairman lounge-evocative interiors, business class airline seats, first class lounges, Sydney Harbour or Uluru or Great Barrier Reef destinations), cinematic natural lighting with strong directional warm key, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, 85mm lens Leica M aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, aspirational cinematic atmosphere',

    'property_mortgage_au', 'luxury architectural photography featuring premium Australian residential contexts (waterfront Sydney harbour properties, Toorak mansions, Gold Coast penthouses, modern architectural homes), natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail, rich earth-tone and warm-neutral palette, 35-85mm lens, Kodak Portra 400 palette, subtle film grain, aspirational real-estate editorial aesthetic'
  )
),
updated_at = NOW()
WHERE register_id = 'REGISTER_02_PREMIUM';

-- REGISTER 04 — SIGNAL — add etf_investing_au variant (for fintech/thematic-ETF crossover content)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  (config->'image_anchors') ||
  jsonb_build_object(
    'etf_investing_au', 'clean modern fintech photography featuring Australian trading and platform contexts (macro shots of broker app interfaces evocative but not reproducing specific branding, ASX ticker-style displays, modern open-plan professional settings), cool blue-dominant lighting with selective warm amber accent rim, deep blue-black atmospheric shadows, extreme shallow depth of field, tack-sharp focus with subtle bloom, minimalist composition, Apple keynote aesthetic with Blade Runner 2049 sensibility, futuristic cinematic still'
  )
),
updated_at = NOW()
WHERE register_id = 'REGISTER_04_SIGNAL';
```

### 11.4 WF_REGISTER_ANALYZE — AU Classifier Extension

When the platform's topic-stage register classifier runs, append this Australia-specific decision logic to the existing `WF_REGISTER_ANALYZE` Claude prompt:

```
AUSTRALIAN FINANCE SUB-NICHE CLASSIFIER:

If the topic is identified as an Australian finance topic, additionally classify its sub-niche:

1. credit_cards_au — Any topic mentioning Australian credit card products, Qantas Frequent Flyer, Velocity Frequent Flyer, Amex Platinum Australia, points hacking AU, or AU-specific card comparisons.

2. super_au — Any topic mentioning Australian superannuation, Super Guarantee, SMSF, contribution caps, Division 293, Transition to Retirement, or specific AU super funds (AustralianSuper, Aware Super, Hostplus, HESTA, UniSuper, etc.).

3. property_mortgage_au — Any topic mentioning Australian property, AU mortgages, offset accounts, negative gearing, stamp duty, First Home Super Saver, Home Guarantee Scheme, or state-specific AU property rules.

4. tax_au — Any topic mentioning ATO, Australian tax returns, HECS/HELP, franking credits, novated leases AU, Medicare levy, stage 3 tax cuts, or AU-specific tax deductions.

5. etf_investing_au — Any topic mentioning ASX-listed ETFs, Australian brokers (CommSec, Stake, SelfWealth, Pearler, etc.), Australian share investing, LICs, Raiz, Sharesies.

Return: { "niche_variant": "credit_cards_au" | "super_au" | "property_mortgage_au" | "tax_au" | "etf_investing_au" | "primary" }

Default to 'primary' if the topic does not clearly fit one of the AU sub-niches above.
```

### 11.5 Demonetization Audit — AU-Specific Rules

Your platform's pre-Gate 3 Demonetisation Audit Layer should include these AU-specific checks:

```json
{
  "au_demonetization_rules": [
    {
      "rule_id": "au_asic_general_advice",
      "trigger": "topic.niche_variant IN (super_au, property_mortgage_au, etf_investing_au)",
      "required_elements": [
        "general_advice_warning_title_card_in_first_10s",
        "full_afsl_disclaimer_in_description",
        "no_personal_financial_advice_language"
      ],
      "blocked_phrases": [
        "you should buy",
        "I recommend",
        "guaranteed returns",
        "risk-free",
        "this will make you money"
      ]
    },
    {
      "rule_id": "au_credit_nccp",
      "trigger": "topic.niche_variant = credit_cards_au",
      "required_elements": [
        "comparison_rate_disclosure_when_mentioning_rates",
        "target_market_determination_awareness"
      ],
      "blocked_phrases": [
        "guaranteed approval",
        "no credit check"
      ]
    },
    {
      "rule_id": "au_property_promotion",
      "trigger": "topic.niche_variant = property_mortgage_au",
      "required_elements": [
        "historical_volatility_acknowledgment",
        "not_personal_advice_framing"
      ],
      "blocked_phrases": [
        "passive income",
        "financial freedom",
        "replace your salary",
        "guaranteed capital growth"
      ]
    },
    {
      "rule_id": "au_bnpl_avoidance",
      "trigger": "topic.primary_keyword MATCHES (afterpay|zip|klarna|humm|bnpl|buy now pay later)",
      "action": "flag_for_manual_review",
      "reason": "BNPL content is both ASIC-scrutinized and YouTube-ad-policy-risky"
    }
  ]
}
```

### 11.6 SEO Metadata Auto-Generator — AU Geotagging

For AU-targeted content, the platform's SEO Metadata Auto-Generator (Feature N2 from your roadmap) should:

1. **Append `"Australia"` or `"AU"` or `"[state]"` tokens** to titles where relevant. "Best credit card" → "Best Qantas Credit Card Australia 2026".
2. **Add AU geographic tags**: `australia`, `sydney`, `melbourne`, `brisbane`, `perth`, `adelaide`, `au`, `ozzie` (colloquial).
3. **Include AU-specific entities** in the description: ATO, ASIC, RBA, ASX, Qantas, Velocity, CBA, Westpac, ANZ, NAB, etc.
4. **Set `default_audience = AU`** in YouTube's made-for-kids and regional targeting settings.
5. **Schedule publish time in AEST/AEDT** (UTC+10/+11) optimizing for 5:30pm–8:30pm local weeknight viewing.

---

## 12. KPIs & Success Metrics

### 12.1 Phase 1 Targets (Months 0–3)

| Metric | Target | Stretch |
|--------|--------|---------|
| Videos published | 60 | 120 |
| Sub-niche coverage | All 5 | All 5 + 2 sub-sub-niches |
| Subscribers | 1,000 | 5,000 |
| Total watch hours | 4,000 | 15,000 |
| YPP monetization | Enabled | Enabled + first payout |
| Average CPM (after monetization) | $15 | $25 |
| Per-video cost | ≤$8 | ≤$6 |
| Demonetization rate | <5% | <2% |

### 12.2 Phase 2 Targets (Months 3–6)

| Metric | Target | Stretch |
|--------|--------|---------|
| Videos published (cumulative) | 180 | 360 |
| Subscribers | 10,000 | 30,000 |
| Monthly watch hours | 50,000 | 150,000 |
| Average RPM | $6 | $12 |
| Affiliate revenue / month | $500 | $3,000 |
| AdSense revenue / month | $300 | $1,800 |
| Q4 CPM uplift captured | 40% | 60% |

### 12.3 Phase 3 Targets (Months 6–12)

| Metric | Target | Stretch |
|--------|--------|---------|
| Videos published (cumulative) | 500+ | 1,000+ |
| Subscribers | 50,000 | 150,000 |
| Monthly revenue (AdSense + affiliate) | $5,000 | $25,000 |
| Sub-niche spoke channels launched | 1 | 3 |

---

## 13. Risks & Mitigations

1. **Algorithm risk — AU audience doesn't click.** *Mitigation:* A/B test thumbnails aggressively (Feature N4 roadmap). Test AU-specific imagery (Opera House, currency, Qantas tail) vs neutral finance imagery.

2. **Regulatory risk — ASIC action on creator financial advice.** *Mitigation:* Section 11.5 demonetization audit rules enforce disclaimers. No personal advice language. All content framed as education.

3. **Incumbent retaliation — Point Hacks or SuperGuy launches competing volume strategy.** *Mitigation:* Moat is the production pipeline, not any single video. Even if one incumbent tries to scale, they cannot match 6/day × 5 registers without building Vision GridAI themselves. Keep shipping.

4. **Platform risk — YouTube changes monetization rules for AI content.** *Mitigation:* The cinematic register system produces content visually indistinguishable from human editorial work. Claude-generated scripts are edited by Claude-based QA gates. Generation pipeline is defensible under current YouTube AI disclosure rules.

5. **Accuracy risk — tax/super rules change and old videos become misleading.** *Mitigation:* Annual recurring schedule (Section 9.2) refreshes evergreen content each EOFY. Title format "2026" makes it obvious when a video is time-bound. Automated flag on videos >24 months old for refresh decision.

---

## 14. Next Actions (For Platform Execution)

1. **Run the Supabase SQL blocks in Sections 11.1–11.3** to register the CardMath AU project and extend the 5 registers with AU niche variants. Estimated 15 min.

2. **Add the Section 11.4 classifier extension** to `WF_REGISTER_ANALYZE`. Estimated 30 min.

3. **Add the Section 11.5 demonetization rules** to the pre-Gate 3 audit layer. Estimated 1 hour.

4. **Seed the competitor analysis database** with the 20+ channels listed in Sections 3.3, 4.3, 5.3, 6.3, 7.3 using the Section 8.1 schema. Estimated 2 hours.

5. **Configure the Section 9.2 annual recurring schedule** in the platform's content calendar. Estimated 30 min.

6. **Produce the first 10 topics across the top 3 sub-niches** (credit cards, super, tax) using Register 01 and Register 02 to establish baseline quality and measure real CPM. Budget: $80.

7. **After first 10 videos, review performance** and adjust gap_score threshold (Section 8.3) based on actual AU traffic patterns.

---

**Document version:** v1
**Prepared for:** Akinwunmi / CardMath / Vision GridAI Platform
**Date:** April 2026
**Supersedes:** None
**Dependencies:** `REGISTER_PROMPT_IMPLEMENTATION_GUIDE_v2.md`, `top_5_countries_to_target.md`, `REGISTER_0[1-5]_*.md` playbooks
