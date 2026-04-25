# AU sub-niches

Five sub-niches per CardMath AU strategy. Each has a default register, a
CPM band, a demonetization risk profile, and required disclaimers. The
classifier (`register_classify_au_addendum`) tags each AU topic with one
of these values; production then routes via `niche_variant`.

## `credit_cards_au` — Australian Credit Cards & Points

**Default register:** REGISTER_02_PREMIUM (luxury aesthetic for product/destination content)
**Fallback register:** REGISTER_01_ECONOMIST (for math/comparison videos)
**CPM:** $28–$42 (Q4: $45–$65) — highest-CPM AU sub-niche
**Demonetization risk:** medium
**Priority:** P0
**Required disclaimer:** `AU:AD-04` (NCCP comparison rate)

### Why this is the anchor sub-niche

Brand-aligned with CardMath. Short tier-1 incumbent list (~30 channels: Point Hacks, Frequent Flyer Solutions, Daniel Sciberras, Ashlynne Eaton). Long-tail product coverage (~60 active AU rewards cards, only top 15 covered well by humans). Moats: speed on sign-up bonus changes (4-hour vs 2–7 days), mathematical rigor (CardMath brand alignment), cross-product comparison at scale.

### Content pillars

1. "The Math Behind" — one card per episode, Register 01
2. "Points to [Destination]" — aspirational, Register 02
3. "Sign-Up Bonus Tracker" — fortnightly news, Register 01
4. "Card Comparison Matrix" — head-to-head, Register 01
5. "Status Tier Breakdown" — Register 02
6. "Transfer Partner Deep Dive" — Register 02
7. "Controversy" series — Register 03 Noir (demonetization risk flagged)

### Monetization stack

Credit-card affiliate referrals ($50-$250/approved app), aggregator partnerships (Canstar, Finder, Mozo, RateCity), Booking.com/Agoda travel affiliates, course upsell ($79-$149).

---

## `super_au` — Australian Superannuation

**Default register:** REGISTER_01_ECONOMIST (analytical, policy-heavy)
**CPM:** $22–$32 (Q4: $25–$35)
**Demonetization risk:** medium-high (financial product — ASIC scrutiny)
**Priority:** P0
**Required disclaimer:** `AU:AD-01` (general advice warning)

### Why this is the most exploitable gap

$3.9 trillion AUM (larger than ASX). Mandatory + complex + fiddly. Search demand massive but content dominated by fund-produced PR (AustralianSuper, Aware Super) rather than independent creator analysis. Independent field very thin (Chris Strano / SuperGuy dominates SMSF; rest is sparse).

### Content pillars

1. "Super at [age]" — 5 evergreen videos refreshed annually
2. "Fund vs Fund" — top 20 funds head-to-head
3. "Budget Night Response" — within 48h of federal budget
4. "EOFY Super Checklist" — annual May
5. "SMSF Deep Dive" — niche but high-CPM
6. "Life Situation" series — freelancer/teacher/nurse/tradie/public servant variants

### Monetization stack

Industry super fund referrals, SMSF administrator affiliates (Heffron, Esuperfund — $50-$300/referral), insurance affiliates (NobleOak, TAL), financial advisor lead-gen ($100-$400/lead).

---

## `property_mortgage_au` — Australian Property & Mortgages

**Default register:** REGISTER_01_ECONOMIST
**Fallback register:** REGISTER_02_PREMIUM (for luxury real-estate aspirational content)
**CPM:** $25–$38 (Q4: $28–$42)
**Demonetization risk:** medium-high (property promotion compliance)
**Priority:** P1
**Required disclaimers:** `AU:AD-01` + `AU:AD-02`

### Why P1 not P0

More crowded incumbent field (~50 dedicated channels including Michael Yardney, Aus Property Podcast, PK Gupta, Chris Bates). Higher demonetization risk — property investment content adjacent to YouTube's get-rich-quick advertiser concerns.

### Content pillars

1. "RBA Response" — within 4h of cash rate decision (8x/year)
2. "State by State" — 8 capital cities × 5 topics = 40 baseline videos
3. "Buy or Rent" life-stage series
4. "Investment Property Math"
5. "Market Crash Analysis" — Register 03 Noir (careful demonetization handling)
6. "Luxury Real Estate Tour" — Register 02

### Blocked phrases (`au_property_promotion` rule)

`passive income`, `financial freedom`, `replace your salary`, `guaranteed capital growth` — any occurrence triggers Gate-3 block.

---

## `tax_au` — Australian Tax Strategy

**Default register:** REGISTER_01_ECONOMIST
**CPM:** $18–$28 (Q4: $20–$32)
**Demonetization risk:** low (education, not advice)
**Priority:** P1

### Why this is a sleeper

Tax content is boring → almost no individual AU YouTubers own it. Field: H&R Block (promotional), CPA firm channels (B2B tone), ATO official (low engagement), ATOtv. Yet every working Australian files a return annually → massive annual EOFY spike (May → October). Solid CPMs ($18-$28) because tax software (MyTax, Etax), accountants (H&R Block), and novated lease providers bid aggressively.

EV novated lease content sits at $25-$40 CPM — Tesla/BYD/Polestar dealers bid hard. **Most lucrative partnerships in AU finance YouTube:** $500-$2,500 per signed lease.

### Content pillars

1. "EOFY Series" — 10-video series May–June annually
2. "Profession-Specific Deductions" — 30+ evergreen (teacher, tradie, IT worker, etc.)
3. "Novated Lease Explained" — top 10 EVs fully modeled
4. "Franking Credits" — 6-8 videos
5. "Tax Office Updates" — when ATO issues rulings/practice notes
6. "Tax Scam Investigation" — Register 03 Noir

---

## `etf_investing_au` — Australian ETF & Share Investing

**Default register:** REGISTER_01_ECONOMIST
**Fallback register:** REGISTER_04_SIGNAL (for thematic/fintech ETFs)
**CPM:** $20–$30 (Q4: $22–$33)
**Demonetization risk:** medium
**Priority:** P2 (most saturated AU finance sub-niche)
**Required disclaimers:** `AU:AD-01` + `AU:AD-02`

### Why P2

Most saturated. Established players: Rask Finance, Aussie Wealth Creation, Captain FI, Equity Mates, Ben Nash, Hack Your Wealth. Long-tail still exploitable: ETF launches are continuous (BetaShares, Vanguard, Global X), broker platform changes recur, tax-time ETF spike.

Higher gap-score threshold for `pass`: **gap_score ≥ 50** (vs ≥ 40 default; vs ≥ 30 for tax).

### Content pillars

1. "ETF Launch Response" — 24h response when new ASX ETF lists
2. "Broker Comparison Matrix" — 20+ scenario-specific
3. "Core Portfolio" — for $1k/$10k/$50k/$100k/$500k portfolios
4. "Franking Credit Deep Dive" (overlap with tax_au)
5. "FIRE in Australia" — adapted to AU tax system
6. "Tech and Fintech ETF" — Register 04 Signal

---

## Where these are stored

```sql
SELECT country_target, value, display_name, default_register, cpm_band_usd, priority
FROM niche_variants
WHERE country_target = 'AU'
ORDER BY priority, value;
```

Seeded by migration 032 §E. Editable via dashboard Settings (when AU tab active) → AU sub-niche table.
