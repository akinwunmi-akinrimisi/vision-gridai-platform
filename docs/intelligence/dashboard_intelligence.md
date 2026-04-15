# Vision GridAI Platform — Dashboard Specification
> STATUS: UPDATE TO EXISTING FILE (VisionGridAI_Dashboard_Specification.md)
> MERGE INSTRUCTION: The new pages below are ADDITIONS to the existing 9-page dashboard spec.
> DO NOT modify existing page specs. Add pages 10–14 to the existing SPA router.

---

## Existing Pages (DO NOT MODIFY)
> Reference: VisionGridAI_Dashboard_Specification.md for pages 1–9

---

## NEW PAGES: Growth Intelligence Layer

---

### Page 10: Intelligence Hub (`/intelligence`)

**Purpose:** Single pane of glass for all pre-production competitive and market intelligence.

**Layout:**
```
[Header] Intelligence Hub — Project: [dropdown]
[Alert Banner] — if competitor_alerts exist: "🔥 2 new outlier breakouts from competitors"

[Row 1 — 4 KPI Cards]
  [Niche Health: 78/100 ↑ STABLE]  [Top Topic PPS: 82 🟢]  [Competitor Alerts: 3 unread]  [RPM Range: $18-$45]

[Row 2 — Left Panel (60%): Competitor Feed]
  [Title: Competitor Activity]
  [Filter: All | Outliers Only | Topic Matches]
  [Channel avatar] [Channel Name] — "[Video Title]"
  Published 6h ago | 24K views | Outlier: 4.2x avg 🔥
  [View on YouTube] [Add to Topic Ideas] [Dismiss]
  
  [repeat for each competitor video]

[Row 2 — Right Panel (40%): Niche Health]
  [Niche Health Score: 78] [8-week trend line chart]
  [Classification badge: STABLE]
  [5 health factors: velocity ✅ entry rate ✅ freshness ⚠️ rpm ✅ competition ✅]
  [Actionable insight: "Topic freshness is weakening — 3 of your 5 current topics overlap with competitors' recent uploads."]

[Row 3 — Full Width: Topic Intelligence Scores]
  [Table: Topic | Outlier Score | SEO Score | Combined | Classification]
  [5 topics sorted by combined score, with filter and sort controls]
  [Button per row: "Add to Queue" | "View Details"]

[Row 4 — Style DNA Panel]
  [Title: Competitor Style DNA]
  [Button: + Analyze New Channel]
  [Cards: each analyzed channel with thumbnail DNA visual summary]
```

**Realtime:** Subscribe to `competitor_alerts` table → badge counter updates live.

**React route:** `/intelligence`
**Data sources:** `competitor_channels`, `competitor_videos`, `competitor_alerts`, `projects` (niche_health_score), `topics` (outlier_score, seo_score)

---

### Page 11: Analytics (`/analytics`)

**Purpose:** Post-publish performance intelligence with ROI loop closure.

**Layout:**
```
[Header] Analytics — Project: [dropdown] | Date Range: [picker]

[Row 1 — Channel KPIs]
  [Total Views (30d)]  [New Subscribers (30d)]  [Avg CTR (%)]  [Est. Revenue ($)]  [Avg AVD (mm:ss)]

[Row 2 — Left (55%): Performance vs Prediction Scatter]
  [Title: PPS Accuracy]
  [X-axis: Predicted Performance Score (0–100)]
  [Y-axis: Actual Views (30d)]
  [Each dot = one video, colored green/yellow/red by PPS accuracy]
  [Tooltip: hover shows video title, PPS, actual views, variance %]
  [Trendline + R² correlation score]
  
[Row 2 — Right (45%): Traffic Source Breakdown]
  [Donut chart: Homepage % | Search % | Suggested % | External %]
  [Insight text: "Your channel gets 67% of views from Homepage — algorithm healthy 🟢"]

[Row 3 — Video Performance Table]
  [Columns: # | Thumbnail | Title | Published | Views (7d / 30d) | CTR | AVD | Est Rev | PPS | Actual vs PPS]
  [Sortable all columns]
  [Row colors: green (actual > PPS prediction), yellow (within 20%), red (actual < PPS - 20%)]
  [Pagination: 20 per page]

[Row 4 — ROI Calculator]
  [Per video: Production Cost | Break-even Views | Est. Rev (30d) | ROI %]
  [Per project total: Total Cost | Total Revenue | Net ROI | ROAS]
  [Best performing video by ROI: highlighted card]
```

**Data sources:** `topics`, `analytics` (YouTube API data), `production_costs`
**React route:** `/analytics`
**API extensions needed:** Add `estimatedRevenue`, `impressionClickThroughRate`, `trafficSourceViews` to `WF_VIDEO_METADATA` YouTube Analytics pull.

---

### Page 12: Niche Manager (`/niches`)

**Purpose:** Multi-niche portfolio management and health tracking.

**Layout:**
```
[Header] Niche Portfolio

[Row 1 — Project Cards Grid (3 per row)]
  [Project Card]:
    [Niche Name]
    [Niche Health Score: 78 ↑ STABLE] [RPM: $18-$45]
    [Videos Published: 12] [Total Views: 240K] [Est. Revenue: $1,840]
    [8-week health sparkline]
    [Status badge: Active / Paused / Archived]
    [Button: Open Project]

[Row 2 — + New Project button]

[Selected Project Detail (below grid or modal)]:
  [Niche Health History: 12-week chart]
  [RPM Breakdown: Low / Mid / High estimate]
  [Revenue potential: "At 100K views/month: Est. $2,800–$4,500/mo"]
  [Competitor Channels: list with add/remove controls]
  [Alert History: last 10 niche health alerts]
```

**React route:** `/niches`
**Data sources:** `projects`, `niche_health_history`, `competitor_channels`

---

### Page 13: Enhanced Gate 1 — Topic Review (UPDATE)

**Purpose:** Update existing Gate 1 page to include intelligence scores.
> STATUS: UPDATE TO EXISTING PAGE (Gate 1 / Topic Review)

**New additions to existing Gate 1:**

1. **Topic Score Cards** — each topic card gains:
   - `Outlier Score: 73 🔥` (colored: ≥70 = green, 50–69 = yellow, <50 = red)
   - `SEO Score: 62 📈` (same color scale)
   - `Combined: 69` (weighted average)
   - `Classification badge`: Blue Ocean / Competitive / Red Ocean

2. **Sorting/Filtering Controls:**
   - Sort: Combined Score | Outlier | SEO | Default (generated order)
   - Filter: All | High Outlier (≥70) | Blue Ocean SEO | Recommended

3. **Recommended Topics Banner:**
   - Top 5 topics highlighted with ⭐ badge and "Recommended by Intelligence" label

4. **Dual-Axis Overview Chart:**
   - Small scatter plot above topic list
   - X = SEO Score, Y = Outlier Score, each topic as a dot
   - Quadrant labels: "Sweet Spot" (top-right), "Algorithm Push" (top-left), "Search Only" (bottom-right), "Weak" (bottom-left)

---

### Page 14: Enhanced Gate 3 — Video Review (UPDATE)

**Purpose:** Update existing Gate 3 to include PPS and title/thumbnail CTR scores.
> STATUS: UPDATE TO EXISTING PAGE (Gate 3 / Video Review)

**New additions to existing Gate 3:**

1. **Predicted Performance Score (PPS) Card:**
   ```
   [Predicted Performance Score]
   [Large badge: 82 🟢 GREEN LIGHT]
   [Breakdown bars:
     Outlier Score: 78 ████████░░
     SEO Score: 65  ███████░░░
     Script Quality: 89  █████████░
     Niche Health: 72  ████████░░
     Thumbnail CTR: 81  █████████░
     Title CTR: 77  ████████░░
   ]
   [Recommendation: "Strong publish candidate. Your outlier and script scores are excellent."]
   ```

2. **Title Picker:**
   - Replace existing single title display with 5-variant picker
   - Each variant shows: title text + CTR score + formula pattern
   - Selected variant highlighted with blue border
   - Pre-selected: highest-scoring variant
   - User can edit or select any variant

3. **Thumbnail CTR Score:**
   - Below thumbnail preview: "CTR Score: 78/100 ✅"
   - Breakdown tooltip: hover shows factor breakdown
   - "Regenerate thumbnail" button if user wants higher score

---

## Updated Route Table

| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard Home | Existing |
| `/projects` | Projects List | Existing |
| `/project/:id` | Project Overview | Existing |
| `/production/:topicId` | Production Monitor | Existing |
| `/gate1/:projectId` | Topic Review (Gate 1) | **UPDATED** |
| `/gate2/:topicId` | Script Review (Gate 2) | Existing |
| `/gate3/:topicId` | Video Review (Gate 3) | **UPDATED** |
| `/gate4/:topicId` | Shorts Review (Gate 4) | Existing |
| `/shorts` | Shorts Creator | Existing |
| `/social` | Social Publisher | Existing |
| `/intelligence` | Intelligence Hub | **NEW** |
| `/analytics` | Analytics | **NEW** |
| `/niches` | Niche Manager | **NEW** |
| `/settings` | Settings | Existing |

---

## Navigation Bar Updates

Add to existing nav (between Settings and Social Publisher):
```
[🧠 Intelligence]  ← badge with unread alert count
[📊 Analytics]
[🌿 Niches]
```
