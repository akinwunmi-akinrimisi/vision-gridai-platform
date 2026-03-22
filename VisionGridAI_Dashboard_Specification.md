# Vision GridAI Platform — Dashboard Technical Specification
## Complete UI/UX Specification, Component Inventory & Audit Checklist
### Version 3.0 | March 2026

**Purpose:** This document defines every page, component, interaction, state, and data flow in the Vision GridAI dashboard. Use it to:
1. **Audit** the current dashboard against the spec — identify missing features, broken states, and optimization gaps
2. **Build** new pages and components with precise requirements
3. **Review** pull requests against the spec to catch deviations

**Design System Reference:** `design-system/vision-gridai/MASTER.md`

---

## Table of Contents

1. [Global Design System](#1-global-design-system)
2. [Global Navigation & Layout](#2-global-navigation--layout)
3. [Page 1: Projects Home](#3-page-1-projects-home)
4. [Page 2: Project Dashboard](#4-page-2-project-dashboard)
5. [Page 3: Topic Review (Gate 1)](#5-page-3-topic-review-gate-1)
6. [Page 4: Script Review (Gate 2)](#6-page-4-script-review-gate-2)
7. [Page 5: Production Monitor](#7-page-5-production-monitor)
8. [Page 6: Video Review (Gate 3)](#8-page-6-video-review-gate-3)
9. [Page 7: Analytics & Revenue](#9-page-7-analytics--revenue)
10. [Page 8: Shorts Creator (Gate 4)](#10-page-8-shorts-creator-gate-4)
11. [Page 9: Social Media Publisher](#11-page-9-social-media-publisher)
12. [Page 10: Settings](#12-page-10-settings)
13. [Supabase Realtime Subscriptions](#13-supabase-realtime-subscriptions)
14. [n8n Webhook API Endpoints](#14-n8n-webhook-api-endpoints)
15. [Error States & Edge Cases](#15-error-states--edge-cases)
16. [Accessibility Requirements](#16-accessibility-requirements)
17. [Mobile Responsiveness](#17-mobile-responsiveness)

---

## 1. Global Design System

### Color Palette (Dark Cinema Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#000000` | Page background |
| `--bg-secondary` | `#0F0F23` | Card/panel backgrounds |
| `--bg-tertiary` | `#1A1A2E` | Elevated surfaces, modals |
| `--bg-hover` | `#16213E` | Hover state on cards/rows |
| `--text-primary` | `#F8FAFC` | Headings, primary content |
| `--text-secondary` | `#94A3B8` | Labels, descriptions, timestamps |
| `--text-muted` | `#64748B` | Disabled text, placeholders |
| `--accent-blue` | `#3B82F6` | Links, active states, primary actions |
| `--accent-red` | `#E11D48` | CTA buttons, alerts, destructive actions |
| `--accent-green` | `#22C55E` | Success states, published status |
| `--accent-amber` | `#F59E0B` | Warning states, in-progress |
| `--accent-purple` | `#8B5CF6` | Agentic stages indicator |
| `--border-default` | `#1E293B` | Card borders, dividers |
| `--border-hover` | `#334155` | Hovered element borders |

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Page title | Fira Sans | 28px | 700 | `--text-primary` |
| Section heading | Fira Sans | 20px | 600 | `--text-primary` |
| Card title | Fira Sans | 16px | 600 | `--text-primary` |
| Body text | Fira Sans | 14px | 400 | `--text-secondary` |
| Label | Fira Sans | 12px | 500 | `--text-muted` |
| Monospace/data | Fira Code | 13px | 400 | `--text-primary` |
| Badge/pill | Fira Sans | 11px | 600 | (varies by badge) |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Inside badges, between icon and text |
| `--space-sm` | 8px | Between related items |
| `--space-md` | 16px | Card padding, section spacing |
| `--space-lg` | 24px | Between sections |
| `--space-xl` | 32px | Page-level padding |
| `--space-2xl` | 48px | Between major page sections |

### Component Tokens

| Component | Border Radius | Shadow | Border |
|-----------|--------------|--------|--------|
| Card | 12px | none (flat design) | 1px solid `--border-default` |
| Button (primary) | 8px | none | none |
| Button (secondary) | 8px | none | 1px solid `--border-default` |
| Input/Select | 8px | none | 1px solid `--border-default` |
| Modal | 16px | 0 4px 32px rgba(0,0,0,0.5) | 1px solid `--border-default` |
| Badge/Pill | 9999px (full round) | none | none |
| Tooltip | 8px | 0 2px 8px rgba(0,0,0,0.3) | none |
| Progress bar | 4px | none | none |

### Status Badge System

Every status in the platform maps to a consistent badge style:

| Status | Background | Text Color | Label |
|--------|-----------|------------|-------|
| `pending` | `#1E293B` | `#94A3B8` | Pending |
| `researching` | `#1E1B4B` | `#8B5CF6` | Researching |
| `scripting` | `#1E1B4B` | `#8B5CF6` | Scripting |
| `audio` | `#172554` | `#3B82F6` | Audio |
| `images` | `#172554` | `#3B82F6` | Images |
| `video` | `#172554` | `#3B82F6` | Video |
| `assembly` | `#172554` | `#3B82F6` | Assembly |
| `review` | `#422006` | `#F59E0B` | Awaiting Review |
| `uploading` | `#172554` | `#3B82F6` | Uploading |
| `published` | `#052E16` | `#22C55E` | Published |
| `failed` | `#4C0519` | `#E11D48` | Failed |
| `approved` | `#052E16` | `#22C55E` | Approved |
| `rejected` | `#4C0519` | `#E11D48` | Rejected |
| `refined` | `#422006` | `#F59E0B` | Refined |
| `skipped` | `#1E293B` | `#64748B` | Skipped |

### Button Hierarchy

| Type | Background | Text | Border | Usage |
|------|-----------|------|--------|-------|
| Primary | `--accent-blue` | White | None | Main action per section (Approve, Generate, Publish) |
| Danger | `--accent-red` | White | None | Destructive actions (Reject, Delete) |
| Success | `--accent-green` | White | None | Positive confirmations (Approve All) |
| Secondary | Transparent | `--text-secondary` | 1px `--border-default` | Alternative actions (Edit, Refine, Schedule) |
| Ghost | Transparent | `--accent-blue` | None | Inline actions (View, Preview, Expand) |

### Loading States

Every component that fetches data must show a loading state:

| Component Type | Loading Pattern |
|---------------|----------------|
| Full page | Centered spinner + "Loading project..." text |
| Card grid | Skeleton cards (pulsing rectangles matching card layout) |
| Table rows | Skeleton rows (pulsing bars) |
| Single value/metric | Skeleton rectangle matching text size |
| Button (after click) | Spinner inside button, text changes to "Processing..." |
| Progress bar | Indeterminate animation (sliding gradient) |

### Empty States

Every list/grid that can be empty must show:

| Context | Icon | Heading | Subtext | Action |
|---------|------|---------|---------|--------|
| No projects | Folder icon | No projects yet | Create your first niche project to get started | [+ New Project] button |
| No topics | List icon | No topics generated | Generate 25 SEO topics for this niche | [Generate Topics] button |
| No scripts | Document icon | Script not generated | Start script generation for this topic | [Generate Script] button |
| No production | Clapboard icon | Production not started | Approve the script to begin production | — (disabled, shows "Approve script first") |
| No shorts | Scissors icon | No shorts created | Analyze the published video for viral clips | [Analyze for Viral Clips] button |
| No social posts | Share icon | No posts scheduled | Create shorts first, then schedule posts | — |
| No analytics | Chart icon | No data yet | Analytics appear after videos are published | — |

---

## 2. Global Navigation & Layout

### Sidebar Navigation

Fixed left sidebar, 260px wide, `--bg-secondary` background, full viewport height.

```
┌──────────────────────────┐
│ VISION GRIDAI            │ ← Logo/brand, 20px, bold, text-primary
│ ─────────────────────── │
│                          │
│ 📊 Projects              │ ← Active: bg-hover + left accent border
│                          │
│ ── ACTIVE PROJECT ──     │ ← Section label, 11px, text-muted, uppercase
│ 💳 Credit Cards          │ ← Project name, 14px
│                          │
│   📋 Dashboard           │ ← Indented project sub-pages
│   📝 Topics              │
│   📄 Scripts             │
│   ⚙️ Production          │
│   🎬 Video Review        │
│   📊 Analytics           │
│                          │
│ ── SHORTS ──             │ ← Section label
│   📱 Shorts Creator      │
│   📤 Social Publisher    │
│                          │
│ ── SYSTEM ──             │
│   ⚙️ Settings            │
│                          │
│ ─────────────────────── │
│ v3.0 · $1,247 spent     │ ← Footer: version + total spend
└──────────────────────────┘
```

**Audit checklist:**
- [ ] Sidebar is fixed on scroll (position: fixed)
- [ ] Active page has `--bg-hover` background + 3px left border in `--accent-blue`
- [ ] Project selector dropdown at top (switch between niches)
- [ ] Sidebar collapses to icons-only on screens < 1280px
- [ ] Total spend updates in real-time from Supabase
- [ ] Keyboard shortcut: `Cmd/Ctrl + B` toggles sidebar

### Top Bar

Fixed top bar, 64px height, spans full width minus sidebar.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Dashboard > Credit Cards > Topics          🔔 3   👤 Admin          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Components:**
- **Breadcrumb:** page path, clickable ancestors, `--text-secondary`, active page in `--text-primary`
- **Notification bell:** Badge with count of items requiring attention (pending reviews, failed workflows). Clicking opens dropdown with recent alerts.
- **User avatar:** Simple admin indicator (single-user system)

**Audit checklist:**
- [ ] Breadcrumb reflects current navigation path
- [ ] Notification badge count updates via Supabase Realtime
- [ ] Notification dropdown shows: pending topic reviews, pending script reviews, pending video reviews, failed workflows
- [ ] Each notification is clickable — navigates to the relevant review page

---

## 3. Page 1: Projects Home

**URL:** `/`
**Purpose:** Overview of all niche projects. Entry point for creating new projects.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Projects                                          [+ New Project] │
│                                                                    │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     │
│ │ 💳 Credit Cards  │ │ 🧠 Stoic Phil.   │ │ ➕               │     │
│ │                  │ │                  │ │  Create new     │     │
│ │ 25 topics        │ │ 25 topics        │ │  project        │     │
│ │ 12 published     │ │ 0 published      │ │                  │     │
│ │ 48 shorts        │ │ —                │ │                  │     │
│ │                  │ │                  │ │                  │     │
│ │ $348 spent       │ │ $0.90 spent      │ │                  │     │
│ │ $4,200 revenue   │ │ —                │ │                  │     │
│ │                  │ │                  │ │                  │     │
│ │ Status: Active   │ │ Status: Topics   │ │                  │     │
│ │                  │ │ Pending Review   │ │                  │     │
│ │ [Open Dashboard] │ │ [Open Dashboard] │ │                  │     │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### Project Card Component

| Field | Source | Display |
|-------|--------|---------|
| Project name | `projects.name` | 18px, font-weight 600, `--text-primary` |
| Niche | `projects.niche` | 13px, `--text-muted`, below name |
| Topics count | COUNT from `topics` table | "25 topics" |
| Published count | COUNT from `topics` WHERE status = 'published' | "12 published" |
| Shorts count | COUNT from `shorts` table | "48 shorts" |
| Total spent | SUM from `topics.total_cost` + SUM from `shorts` costs | "$348.00" in monospace |
| Total revenue | SUM from `topics.yt_estimated_revenue` | "$4,200" in green if > 0 |
| Status | `projects.status` | Status badge (see badge system) |
| Last activity | Most recent `topics.updated_at` | "2 hours ago" relative time |

**Card hover:** Border changes to `--border-hover`, subtle background shift to `--bg-hover`

**Card click:** Navigate to `/project/{id}`

**Audit checklist:**
- [ ] Cards are responsive grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- [ ] "Create new project" card is always last, with dashed border
- [ ] Cards show skeleton loading state while fetching
- [ ] Empty state shown when zero projects exist
- [ ] Revenue shows in green, spend shows in neutral color
- [ ] Relative time updates every minute without page reload

### New Project Modal

Triggered by [+ New Project] button. Modal overlay with `--bg-tertiary` background.

```
┌────────────────────────────────────────────────┐
│ Create New Project                        ✕    │
│                                                 │
│ Niche Name *                                   │
│ ┌─────────────────────────────────────────────┐│
│ │ e.g., US Credit Cards                       ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Niche Description                              │
│ ┌─────────────────────────────────────────────┐│
│ │ Optional: describe the channel angle,       ││
│ │ target audience, or specific focus area     ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Target Videos                                  │
│ ┌───────┐                                      │
│ │ 25    │ (number input, default 25)           │
│ └───────┘                                      │
│                                                 │
│ Video Style                                    │
│ ┌─────────────────────────────────────────────┐│
│ │ 2-Hour Documentary          ▼               ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│         [Cancel]  [Create & Start Research]     │
│                                                 │
└────────────────────────────────────────────────┘
```

**On submit:** POST to `/webhook/project/create` → creates project row, triggers niche research workflow. Modal closes, card appears with "Researching" status badge. Real-time update when research completes.

**Validation:**
- Niche name is required, 3-100 characters
- Target videos: 1-100, default 25
- Button shows spinner + "Creating..." after click, disabled until response

**Audit checklist:**
- [ ] Modal has backdrop overlay (click outside to close)
- [ ] ESC key closes modal
- [ ] Form validation with inline error messages
- [ ] Submit button is disabled while processing
- [ ] Success: modal closes, new card appears with skeleton then fills
- [ ] Error: toast notification with error message, modal stays open

---

## 4. Page 2: Project Dashboard (Command Center)

**URL:** `/project/{id}`
**Purpose:** Single-project command center. See everything at a glance, act on anything.

### Top Metrics Row

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ TOPICS   │ │ PUBLISHED│ │ IN PROG  │ │ FAILED   │ │ SPENT    │ │ REVENUE  │
│ 25       │ │ 12       │ │ 3        │ │ 1        │ │ $348.00  │ │ $4,200   │
│          │ │ ✅       │ │ ⏳       │ │ 🔴       │ │          │ │ ROI 12x  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

| Metric | Query | Display |
|--------|-------|---------|
| Topics | COUNT from topics WHERE project_id | Number, large font |
| Published | COUNT WHERE status = 'published' | Number + green accent |
| In Progress | COUNT WHERE status IN ('scripting','audio','images','video','assembly','uploading') | Number + amber accent |
| Failed | COUNT WHERE status = 'failed' | Number + red accent. Clickable → filters table to failed. |
| Total Spent | SUM of total_cost | Dollar amount, monospace |
| Revenue | SUM of yt_estimated_revenue | Dollar amount in green. Shows ROI (revenue/spent) below. |

**Audit checklist:**
- [ ] All 6 metrics cards present and populated
- [ ] Metrics update via Supabase Realtime (no page refresh needed)
- [ ] Failed count is clickable (filters topic table)
- [ ] ROI calculation shown below revenue
- [ ] Skeleton loading state for each metric card

### Pipeline Status Table

The core of the command center. Every topic in one table.

```
┌───┬──────────────────────────────┬───────────┬──────────┬──────────────────┬───────┬────────┬─────────┐
│ # │ Title                        │ Angle     │ Status   │ Progress         │ Score │ Views  │ Revenue │
├───┼──────────────────────────────┼───────────┼──────────┼──────────────────┼───────┼────────┼─────────┤
│ 1 │ Amex Platinum Worth $695?    │ Mathematic│ ✅ Pub   │ ████████████ 100%│ 7.8   │ 45,231 │ $1,575  │
│ 2 │ Perfect 3-Card Wallet        │ Mathematic│ ▶ Assemb │ ████████░░░░  75%│ 8.1   │ —      │ —       │
│ 3 │ CSR vs CSP: 365 Days         │ Mathematic│ ⏸ Script │ ████░░░░░░░░  30%│ 6.2   │ —      │ —       │
│ 4 │ Points Devaluation Timeline  │ Investigat│ 🔴 Failed│ ████████░░░░  60%│ —     │ —      │ —       │
│ 5 │ Q4 Strategy Playbook         │ Mathematic│ ⏳ Pendin│ ░░░░░░░░░░░░   0%│ —     │ —      │ —       │
└───┴──────────────────────────────┴───────────┴──────────┴──────────────────┴───────┴────────┴─────────┘
```

**Columns:**

| Column | Source | Width | Behavior |
|--------|--------|-------|----------|
| # | `topic_number` | 40px | Fixed |
| Title | `seo_title` | Flex (fill remaining) | Truncated with tooltip on hover. Click → navigate to topic detail. |
| Angle | `playlist_angle` | 100px | Badge style, color-coded by playlist group |
| Status | `status` | 100px | Status badge (see badge system) |
| Progress | Calculated from stage completion | 180px | Segmented progress bar (see below) |
| Score | `script_quality_score` | 60px | Number with color: green ≥ 7.0, amber 5.0-6.9, red < 5.0. "—" if not scored. |
| Views | `yt_views` | 80px | Formatted number (45,231). "—" if not published. |
| Revenue | `yt_estimated_revenue` | 80px | Dollar amount. "—" if not published. |

**Progress Bar (segmented):**

The progress bar has distinct colored segments representing each pipeline stage:

```
[Script][Audio][Images][I2V][T2V][Captions][Assembly]
 purple  blue   blue   blue blue  blue     blue
```

Each segment fills independently based on its sub-progress. Hover shows tooltip: "Audio: 47/172 scenes complete"

**Table features:**
- [ ] Sortable by any column (click header)
- [ ] Filterable by status (dropdown filter above table)
- [ ] Filterable by playlist angle
- [ ] Search by title (search input above table)
- [ ] Row click navigates to topic detail page
- [ ] Failed rows have subtle red left border
- [ ] Review-pending rows have subtle amber left border
- [ ] Rows update in real-time via Supabase Realtime subscription on `topics` table

**Row actions (right-click or action menu):**
- View Topic → Navigate to topic detail
- View Script → Navigate to script review
- View Production → Navigate to production monitor
- Retry (if failed) → POST to `/webhook/production/trigger`
- Force Regenerate → Sets `force_regenerate = true`, re-triggers pipeline

### Quick Actions Panel

Below the table, a row of action buttons:

```
[▶ Start Next Pending Topic] [▶▶ Start All Pending] [📊 Export CSV] [🔄 Refresh]
```

| Action | Webhook | Behavior |
|--------|---------|----------|
| Start Next Pending | POST `/webhook/production/trigger` with first pending topic_id | Starts production for the next approved topic |
| Start All Pending | POST `/webhook/production/trigger-all` with project_id | Starts all approved topics sequentially |
| Export CSV | Client-side generation from Supabase query | Downloads topics table as CSV |
| Refresh | Re-query Supabase | Manual refresh (Realtime should make this unnecessary) |

**Audit checklist for Page 2:**
- [ ] All 6 metric cards present, populated, real-time
- [ ] Pipeline table shows all topics with correct status badges
- [ ] Progress bars are segmented by stage
- [ ] Table is sortable, filterable, searchable
- [ ] Row click navigates correctly
- [ ] Quick actions panel present and functional
- [ ] Failed topics show error details on hover or in expandable row
- [ ] Real-time updates work (change a topic status in Supabase, see it update without refresh)

---

## 5. Page 3: Topic Review (Gate 1)

**URL:** `/project/{id}/topics`
**Purpose:** Review and approve 25 generated topics before production begins.

### Page Header

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Topic Review — Credit Cards                                                   │
│ 25 topics generated · 18 approved · 4 pending · 2 rejected · 1 refined      │
│                                                                               │
│ [✅ Approve All Pending] [Generate New Topics] [Export Topics]                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Topic Card (Expanded)

Each of the 25 topics is displayed as an expandable card:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ #1 │ The Mathematician                                      │ ⏳ Pending Review │
│────┼────────────────────────────────────────────────────────┼──────────────────│
│    │                                                        │                   │
│    │ Is the Amex Platinum Worth $695? I Did the Math for    │                   │
│    │ 7 Different Lifestyles (Honest ROI Breakdown)          │                   │
│    │                                                        │                   │
│    │ Narrative Hook:                                        │                   │
│    │ "Every YouTuber says get the Amex Platinum. I ran the  │                   │
│    │ actual numbers for 7 real people..."                   │                   │
│    │                                                        │                   │
│    │ Chapters: 5 segments (20+15+60+15+10 min)             │                   │
│    │ Est. CPM: $35-50+ │ Viral Potential: Very High         │                   │
│    │                                                        │                   │
│    │ ▼ Customer Avatar                                      │                   │
│    │ ┌────────────────────────────────────────────────────┐ │                   │
│    │ │ Marcus, 34 │ Software Engineer, $145K/yr           │ │                   │
│    │ │ Life Stage: Single, urban, high discretionary      │ │                   │
│    │ │ Pain Point: Paying $695/yr unsure of value         │ │                   │
│    │ │ Spending: $6,200/month across dining, travel, gas  │ │                   │
│    │ │ Knowledge: Intermediate — knows basics, overwhelmed│ │                   │
│    │ │ Emotional Driver: Validation anxiety               │ │                   │
│    │ │ Online: Reddit r/creditcards, TPG, YouTube         │ │                   │
│    │ │ Objection: "Affiliate-driven, not objective"       │ │                   │
│    │ │ Dream Outcome: Confident optimal card setup        │ │                   │
│    │ └────────────────────────────────────────────────────┘ │                   │
│    │                                                        │                   │
│    │ [✅ Approve] [❌ Reject] [🔄 Refine] [✏️ Edit]         │                   │
└────┴────────────────────────────────────────────────────────┴───────────────────┘
```

### Topic Card Fields

| Field | Source | Display | Editable? |
|-------|--------|---------|-----------|
| Topic number | `topics.topic_number` | Badge with # | No |
| Playlist angle | `topics.playlist_angle` | Colored badge | No |
| SEO title | `topics.seo_title` | 18px, bold, primary | ✏️ Yes (inline edit) |
| Narrative hook | `topics.narrative_hook` | 14px, secondary, italic | ✏️ Yes |
| Key segments | `topics.key_segments` | Chapter breakdown | ✏️ Yes |
| CPM estimate | `topics.estimated_cpm` | Inline text | ✏️ Yes |
| Viral potential | `topics.viral_potential` | Badge (High/Very High/Medium) | No |
| Review status | `topics.review_status` | Status badge | Via buttons |
| Avatar (10 fields) | `avatars.*` | Collapsible section | ✏️ Yes (all fields) |

### Action Buttons Per Topic

| Button | Webhook | Result |
|--------|---------|--------|
| ✅ Approve | PATCH `topics` SET review_status = 'approved' | Badge turns green, card moves to "Approved" section |
| ❌ Reject | PATCH `topics` SET review_status = 'rejected' | Badge turns red, card moves to "Rejected" section |
| 🔄 Refine | Opens Refine Modal (see below) | Claude regenerates topic with custom instructions |
| ✏️ Edit | Toggles inline editing on all fields | Save button appears, PATCH on save |

### Refine Modal

```
┌──────────────────────────────────────────────────────────────┐
│ Refine Topic #1                                         ✕   │
│                                                              │
│ Current title:                                               │
│ "Is the Amex Platinum Worth $695?..."                       │
│                                                              │
│ Your refinement instruction:                                 │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Make this more focused on the 2026 changes to Amex      ││
│ │ Platinum benefits. The narrative hook should reference   ││
│ │ the recent removal of the Walmart+ benefit.             ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ⚠️ Claude will see all 24 other topics to avoid overlap.    │
│ Cost: ~$0.15 per refinement.                                │
│                                                              │
│ Previous refinements:                                        │
│ (none)                                                       │
│                                                              │
│         [Cancel]  [🔄 Submit Refinement]                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**On submit:** POST to `/webhook/topics/refine` with `{ topic_id, instruction, all_other_topic_titles }`. Webhook triggers Claude to regenerate that topic considering all 24 others. Modal shows spinner. On completion, topic card updates with new content, refinement logged in `refinement_history`.

### Bulk Actions

| Action | Behavior |
|--------|----------|
| Approve All Pending | PATCH all topics WHERE review_status = 'pending' SET review_status = 'approved' |
| Approve Playlist N | PATCH all topics WHERE playlist_group = N AND review_status = 'pending' |
| Regenerate All Rejected | POST to `/webhook/topics/generate` with rejected topic IDs + feedback |

### View Modes

| Mode | Layout |
|------|--------|
| Card view (default) | Expandable cards in a single column |
| Table view | Compact table with inline status badges, click to expand |
| Grouped view | Topics grouped by playlist angle with sub-headings |

**Audit checklist for Page 3:**
- [ ] All 25 topics displayed with correct data
- [ ] Avatar data shown in collapsible section per topic
- [ ] Approve/Reject/Refine/Edit buttons all functional
- [ ] Refine modal opens, accepts input, triggers webhook, updates card
- [ ] Inline editing works for title, hook, CPM, avatar fields
- [ ] Bulk approve actions work
- [ ] Status badges update without page reload
- [ ] View mode toggle (card/table/grouped) works
- [ ] Approved topics show green accent, rejected show red
- [ ] Refinement history shown in modal for previously refined topics
- [ ] Topic count summary in header updates as approvals happen

---

## 6. Page 4: Script Review (Gate 2)

**URL:** `/project/{id}/topics/{tid}/script`
**Purpose:** Review generated script with quality scores, approve for production.

### Layout: Two-Panel

```
┌──────────────────────────────┬────────────────────────────────────────────┐
│ QUALITY SCORES               │ SCRIPT VIEWER                              │
│                              │                                            │
│ Overall: 7.8/10 ✅           │ Chapter 1: The Amex Platinum Myth          │
│                              │                                            │
│ Persona:     ████████░░ 8/10 │ Meet Marcus. He's thirty-four, a software  │
│ Hook:        █████████░ 9/10 │ engineer pulling in a hundred and forty-   │
│ Pacing:      ███████░░░ 7/10 │ five thousand a year in Austin. Every      │
│ Specificity: ████████░░ 8/10 │ month, six hundred and ninety-five dollars │
│ TTS:         ███████░░░ 7/10 │ disappears from his statement...          │
│ Visual:      ████████░░ 8/10 │                                            │
│ Anti-Pattern:███████░░░ 7/10 │ [Scene 001] [Scene 002] [Scene 003]       │
│                              │                                            │
│ ──── METADATA ────           │ ▼ Chapter 2: The 7 Personas               │
│                              │ ▼ Chapter 3: Persona-by-Persona ROI       │
│ Word Count:  18,742          │ ▼ Chapter 4: Hidden Costs Nobody Mentions  │
│ Scene Count: 172             │ ▼ Chapter 5: The Verdict                  │
│ Visual Split: 75/25/72       │                                            │
│ Attempts: 1 of 3            │                                            │
│ Force Passed: No             │                                            │
│                              │                                            │
│ ──── PER-PASS SCORES ────   │                                            │
│                              │                                            │
│ Pass 1 (Foundation): 7.5    │                                            │
│ Pass 2 (Depth): 8.1         │                                            │
│ Pass 3 (Resolution): 7.6    │                                            │
│                              │                                            │
│ ──── ACTIONS ────           │                                            │
│                              │                                            │
│ [✅ Approve Script]         │                                            │
│ [❌ Reject]                 │                                            │
│ [🔄 Refine with Feedback]  │                                            │
│                              │                                            │
└──────────────────────────────┴────────────────────────────────────────────┘
```

### Left Panel: Quality Scores

**Score bar component:**
- 200px wide horizontal bar
- Fill color: green (≥7), amber (5-6.9), red (<5)
- Number at right end
- Score label at left
- Tooltip on hover shows evaluator's feedback text for that dimension

**Per-pass scores:** Show Pass 1, Pass 2, Pass 3 scores separately. Click to expand evaluator feedback for each pass.

**Metadata section:** Word count, scene count, visual type distribution (static/i2v/t2v shown as mini bar chart), attempts used, force-pass warning (yellow alert if true).

### Right Panel: Script Viewer

**Chapter navigation:** Collapsible accordion. Each chapter heading shows word count + scene range.

**Scene markers:** Within the script text, clickable scene markers `[Scene 001]` appear between scenes. Clicking a scene marker shows a popover with:
- Scene ID, visual type badge, emotional beat
- Image prompt (truncated, click to expand)
- Estimated duration

**Text display:** Monospace font (Fira Code), 14px, line-height 1.8 for readability. Script text is read-only unless editing is enabled.

### Scene Editing (Optional)

Each scene within the script can be individually edited:

```
┌─ Scene 047 ──────────────────────────────────────────────────────┐
│ Visual: [static_image ▼]  Emotional Beat: [revelation ▼]        │
│                                                                   │
│ Narration:                                                        │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ Here's where the math gets brutal. If Marcus spends six     ││
│ │ thousand two hundred dollars a month, and sixty percent of   ││
│ │ that goes to dining and travel...                            ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                   │
│ Image Prompt:                                                     │
│ ┌───────────────────────────────────────────────────────────────┐│
│ │ Close-up of a calculator showing $4,464 annual rewards       ││
│ │ value, warm desk lamp lighting, photorealistic, cinematic    ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                   │
│ [Save Changes] [Revert]                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Refine Modal (Script-Specific)

Similar to topic refine, but targets specific passes:

```
┌──────────────────────────────────────────────────────────────┐
│ Refine Script                                          ✕    │
│                                                              │
│ Which part needs improvement?                               │
│ ○ Pass 1 (Foundation — hook, avatar, pattern)               │
│ ○ Pass 2 (Depth — evidence, mechanism, data)                │
│ ○ Pass 3 (Resolution — takeaways, CTA, ending)              │
│ ○ Specific scenes (enter scene numbers)                      │
│                                                              │
│ Your feedback:                                               │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ The hook is strong but Chapter 3 is too thin on data.   ││
│ │ Add specific APR calculations for each persona.         ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│         [Cancel]  [🔄 Regenerate Selected Pass]             │
└──────────────────────────────────────────────────────────────┘
```

**Audit checklist for Page 4:**
- [ ] Two-panel layout (scores left, script right)
- [ ] All 7 dimension scores displayed with correct bars
- [ ] Per-pass scores shown separately
- [ ] Score tooltips show evaluator feedback
- [ ] Script text renders correctly with chapter collapsing
- [ ] Scene markers are clickable with popovers
- [ ] Metadata section shows all fields
- [ ] Approve/Reject/Refine buttons work
- [ ] Refine modal allows targeting specific passes
- [ ] Force-passed scripts show yellow warning banner
- [ ] Word count displayed accurately
- [ ] Visual type distribution shown as mini chart

---

## 7. Page 5: Production Monitor

**URL:** `/project/{id}/production`
**Purpose:** Real-time view of all active production with scene-level granularity.

### Active Production Card

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▶ ACTIVE — Topic #2: The Perfect 3-Card Wallet                              │
│                                                                               │
│ Stage: Audio Generation (TTS)                  Elapsed: 12m 34s              │
│ Progress: ████████████░░░░░░░░ 98/172 scenes   Est. remaining: ~6 min       │
│ Current cost: $0.75 (script) + $0.18 (TTS so far) = $0.93                   │
│                                                                               │
│ Stage Progress:                                                               │
│ [Script ✅][Audio ▶████░ 57%][Images ⏳][I2V ⏳][T2V ⏳][Captions ⏳][Assembly ⏳]│
│                                                                               │
│ Scene-by-Scene:                                                               │
│ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●                          │
│ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●                        │
│ ○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○○                          │
│ ○○○○○○○○○○○○○○○○○○○○○○○○○○                                                  │
│                                                                               │
│ ● = Complete  ○ = Pending  🔴 = Failed  ⏭ = Skipped                          │
│                                                                               │
│ [Pause Pipeline] [View Error Log]                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Scene Grid Component

172 small dots arranged in rows. Each dot represents one scene.

| Dot State | Color | Meaning |
|-----------|-------|---------|
| Complete | `--accent-green` | Scene fully processed through current stage |
| In Progress | `--accent-amber` (pulsing) | Currently being processed |
| Pending | `--border-default` | Not yet started |
| Failed | `--accent-red` | Failed, needs retry or skip |
| Skipped | `--text-muted` (strikethrough) | Marked as skipped by supervisor |

**Dot hover:** Tooltip shows `Scene 047: audio complete (8.4s), image pending`
**Dot click:** Opens scene detail panel (see below)

### Scene Detail Panel (Slide-in from right)

```
┌─── Scene 047 ────────────────────────────────────┐
│                                                    │
│ Visual Type: [static_image]                       │
│ Chapter: "The 7 Personas"                         │
│ Emotional Beat: revelation                        │
│                                                    │
│ ── Audio ──                                       │
│ Status: ✅ Uploaded                               │
│ Duration: 8,432 ms                                │
│ Drive ID: 1abc...def                              │
│ [▶ Play Audio]                                    │
│                                                    │
│ ── Image ──                                       │
│ Status: ⏳ Pending                                │
│ Prompt: "Close-up of a calculator showing         │
│ $4,464 annual rewards value..."                   │
│                                                    │
│ ── Video Clip ──                                  │
│ Status: ⏳ Pending (static_image — no video)      │
│                                                    │
│ ── Timeline ──                                    │
│ Start: 00:42:15.000                               │
│ End:   00:42:23.432                               │
│                                                    │
│ [Retry Scene] [Skip Scene] [Close]                │
└───────────────────────────────────────────────────┘
```

### Production Queue

Below active production, show queued topics:

```
QUEUE
┌───┬───────────────────────────┬──────────┐
│ # │ Title                     │ Status   │
├───┼───────────────────────────┼──────────┤
│ 3 │ CSR vs CSP: 365 Days      │ Next up  │
│ 4 │ Points Devaluation         │ Queued   │
│ 5 │ Q4 Strategy Playbook       │ Queued   │
└───┴───────────────────────────┴──────────┘
```

### Realtime Requirements (CRITICAL)

This page depends heavily on Supabase Realtime:

| Subscription | Table | Filter | Updates |
|-------------|-------|--------|---------|
| Scene progress | `scenes` | `topic_id = active_topic_id` | Dot grid updates, progress bar fills |
| Topic status | `topics` | `project_id = current_project_id` | Stage label changes, queue updates |
| Production log | `production_log` | `topic_id = active_topic_id` | Activity feed (optional) |

**Audit checklist for Page 5:**
- [ ] Active production card shows current topic + stage + progress
- [ ] Scene grid renders 172 dots with correct states
- [ ] Dots update in REAL-TIME as scenes complete (no polling)
- [ ] Dot hover shows tooltip with scene info
- [ ] Dot click opens scene detail panel
- [ ] Stage progress bar shows all 7 stages with individual fill
- [ ] Elapsed time counter ticks every second
- [ ] Cost accumulates in real-time
- [ ] Queue section shows upcoming topics
- [ ] Scene detail panel shows all scene data
- [ ] Retry/Skip actions work from scene detail
- [ ] Error log accessible from action button

---

## 8. Page 6: Video Review (Gate 3)

**URL:** `/project/{id}/topics/{tid}/video`
**Purpose:** Preview assembled video, edit metadata, approve for YouTube upload.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Video Review — Topic #1: Amex Platinum Worth $695?                           │
│                                                                               │
│ ┌────────────────────────────────────────────┐ ┌──────────────────────────┐  │
│ │                                            │ │ METADATA                  │  │
│ │              VIDEO PLAYER                  │ │                          │  │
│ │         (embedded from Drive URL)          │ │ Title:                    │  │
│ │                                            │ │ ┌──────────────────────┐ │  │
│ │            16:9 aspect ratio               │ │ │ Is the Amex Plat...  │ │  │
│ │           with playback controls           │ │ └──────────────────────┘ │  │
│ │                                            │ │                          │  │
│ │                                            │ │ Description:             │  │
│ │                                            │ │ ┌──────────────────────┐ │  │
│ └────────────────────────────────────────────┘ │ │ (auto-generated with│ │  │
│                                                  │ │ chapters + hook)    │ │  │
│ ┌────────────────────────────────────────────┐ │ └──────────────────────┘ │  │
│ │ THUMBNAIL PREVIEW                          │ │                          │  │
│ │ ┌──────────┐                               │ │ Tags:                    │  │
│ │ │          │  "Amex Platinum ROI"          │ │ ┌──────────────────────┐ │  │
│ │ │  thumb   │  Question format,             │ │ │ credit cards, amex,  │ │  │
│ │ │  image   │  keyword emphasis             │ │ │ platinum, rewards... │ │  │
│ │ │          │                               │ │ └──────────────────────┘ │  │
│ │ └──────────┘  [Regenerate Thumbnail]       │ │                          │  │
│ └────────────────────────────────────────────┘ │ Category: Education ▼    │  │
│                                                  │ Privacy: Public ▼       │  │
│ PRODUCTION SUMMARY                              │ Playlist: Mathematician ▼│  │
│ Total Cost: $28.45                              │                          │  │
│ Duration: 2h 04m 12s                            │                          │  │
│ Scenes: 172 (3 skipped)                         │                          │  │
│ Quality Score: 7.8/10                           │                          │  │
│                                                  │                          │  │
│ [✅ Approve & Publish] [⏰ Schedule] [❌ Reject] │ [💾 Save Metadata]      │  │
└──────────────────────────────────────────────────┴──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Video Player

- Embeds Google Drive video URL in an `<iframe>` or `<video>` tag
- Standard playback controls (play/pause, seek, volume, fullscreen)
- Chapters shown as markers on the timeline (from `key_segments`)

### Metadata Editor

All YouTube metadata fields are editable:

| Field | Source | Default | Editable |
|-------|--------|---------|----------|
| Title | `topics.seo_title` | Generated from script | ✏️ Yes |
| Description | Generated from `narrative_hook` + chapter timestamps | Auto-generated | ✏️ Yes |
| Tags | Extracted from title + niche keywords | Auto-generated | ✏️ Yes (comma separated) |
| Category | Default: Education (27) | 27 | ✏️ Dropdown |
| Privacy | Default: Public | public | ✏️ Dropdown (public/private/unlisted) |
| Playlist | From `playlist_angle` → `youtube_playlist_id` | Auto-matched | ✏️ Dropdown |

### Actions

| Action | Webhook | Result |
|--------|---------|--------|
| Approve & Publish | POST `/webhook/video/approve` | Immediately uploads to YouTube |
| Schedule | POST `/webhook/video/schedule` with `publish_at` | Opens date/time picker, uploads as private, scheduled for public |
| Reject | POST `/webhook/video/reject` with feedback | Returns to production (can specify which stage to re-do) |
| Save Metadata | PATCH `topics` with edited fields | Saves without publishing |
| Regenerate Thumbnail | POST `/webhook/thumbnail/regenerate` | Creates new thumbnail |

**Audit checklist for Page 6:**
- [ ] Video player loads and plays from Drive URL
- [ ] Thumbnail preview shown
- [ ] All metadata fields editable with save
- [ ] Publish action triggers YouTube upload
- [ ] Schedule action shows date/time picker
- [ ] Reject action includes feedback input
- [ ] Production summary shows cost, duration, scene count, quality score
- [ ] Chapter markers shown on video timeline

---

## 9. Page 7: Analytics & Revenue

**URL:** `/project/{id}/analytics`
**Purpose:** YouTube performance metrics with trend visualization.

### Top Metrics

```
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ TOTAL     │ │ WATCH     │ │ AVG VIEW  │ │ CTR       │ │ ESTIMATED │
│ VIEWS     │ │ HOURS     │ │ DURATION  │ │           │ │ REVENUE   │
│ 234,567   │ │ 1,247     │ │ 42:15     │ │ 8.4%      │ │ $8,750    │
│ +12% ▲    │ │ +8% ▲     │ │ +5% ▲     │ │ -0.3% ▼   │ │ +15% ▲    │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

Each metric card shows: current value, trend arrow (vs previous period), percentage change.

### Charts Section

| Chart | Type | Data Source | Purpose |
|-------|------|------------|---------|
| Views over time | Line chart | `yt_views` by `published_at` | Trend visualization |
| Revenue by topic | Bar chart | `yt_estimated_revenue` per topic | Identify top earners |
| CTR by topic | Horizontal bar | `yt_ctr` per topic | Identify best thumbnails |
| Watch time distribution | Pie/donut | `yt_avg_view_pct` ranges | How much of videos are watched |
| CPM trend | Line chart | `yt_actual_cpm` over time | Monetization health |
| Views by playlist | Grouped bar | Views aggregated by `playlist_angle` | Which angle performs best |

### Per-Topic Table

```
┌───┬──────────────────────────┬────────┬───────────┬─────────┬────────┬─────────┐
│ # │ Title                    │ Views  │ Watch Hrs │ CTR     │ CPM    │ Revenue │
├───┼──────────────────────────┼────────┼───────────┼─────────┼────────┼─────────┤
│ 1 │ Amex Platinum Worth $695 │ 45,231 │ 312.5     │ 9.2%    │ $38.50 │ $1,575  │
│ 2 │ Perfect 3-Card Wallet    │ 38,102 │ 267.3     │ 7.8%    │ $35.20 │ $1,200  │
└───┴──────────────────────────┴────────┴───────────┴─────────┴────────┴─────────┘
```

Sortable by any column. Click row → see that topic's detailed analytics (views over time, audience retention curve).

### Cross-Niche Comparison (if multiple projects)

```
┌──────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Niche            │ Avg CPM  │ Avg CTR  │ Revenue  │ Cost/Rev │
├──────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Credit Cards     │ $34.50   │ 8.1%     │ $4,200   │ 12.1x   │
│ Stoic Philosophy │ $18.20   │ 6.3%     │ $890     │ 3.2x    │
└──────────────────┴──────────┴──────────┴──────────┴──────────┘
```

**Audit checklist for Page 7:**
- [ ] All 5 top metric cards present with trend indicators
- [ ] At least 4 charts rendering correctly with real data
- [ ] Per-topic table sortable and clickable
- [ ] Cross-niche comparison shown when multiple projects exist
- [ ] Date range selector (7d / 30d / 90d / All time)
- [ ] Charts use Recharts library (consistent with React stack)
- [ ] Empty state when no published videos exist
- [ ] Data refreshes from Supabase (populated by WF_YOUTUBE_ANALYTICS cron)

---

## 10. Page 8: Shorts Creator (Gate 4)

**URL:** `/shorts` (project list) → `/shorts/{projectId}/{topicId}` (clip creation)
**Purpose:** Create native 9:16 short-form clips from published long-form videos.

### Project List View

Shows all projects. Projects with zero published videos are greyed out and disabled.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📱 Shorts Creator                                                             │
│                                                                               │
│ ┌─────────────────────────┐ ┌─────────────────────────┐                     │
│ │ 💳 Credit Cards          │ │ 🧠 Stoic Philosophy      │                     │
│ │ 12/25 published          │ │ 0/25 published           │                     │
│ │ 48 shorts created        │ │ [Greyed out - disabled]  │                     │
│ │ [View Topics]            │ │ No published videos      │                     │
│ └─────────────────────────┘ └─────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Topic List View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📱 Shorts — Credit Cards                                                      │
│                                                                               │
│ ┌───┬──────────────────────────────┬──────────┬────────────────┬───────────┐ │
│ │ # │ Title                        │ YouTube  │ Shorts Status  │ Action    │ │
│ ├───┼──────────────────────────────┼──────────┼────────────────┼───────────┤ │
│ │ 1 │ Amex Platinum Worth $695?    │ ✅ Pub   │ 20 clips ready │ [View]    │ │
│ │ 2 │ Perfect 3-Card Wallet        │ ✅ Pub   │ 15 approved    │ [View]    │ │
│ │ 3 │ CSR vs CSP: 365 Days         │ ✅ Pub   │ Not started    │ [Analyze] │ │
│ │ 4 │ Points Devaluation           │ ▶ Prod   │ [Disabled]     │ —         │ │
│ └───┴──────────────────────────────┴──────────┴────────────────┴───────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Clip Creation View (Per Topic)

**Stage 1: Viral Analysis (before Gate 4)**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📱 Shorts — Amex Platinum Worth $695?                                         │
│                                                                               │
│ [🔍 Analyze for Viral Clips]     Status: Not started                         │
│                                                                               │
│ This will analyze the published script and identify 20 segments              │
│ with the highest viral potential for TikTok/Instagram/YouTube Shorts.         │
│ Each clip is ~5 minutes with rewritten narration and 9:16 visuals.           │
│ Estimated cost: ~$22 for 20 clips.                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Stage 2: Gate 4 — Viral Clip Review**

After analysis completes, 20 clips appear for review:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📱 Shorts — Amex Platinum Worth $695?                                         │
│ 20 clips identified · 0 approved · 0 generated                               │
│                                                                               │
│ [✅ Approve All] [✅ Approve Top 10] [Sort by Virality ▼]                    │
│                                                                               │
│ ┌────────────────────────────────────────────────────────────────────────┐   │
│ │ Clip #1 │ Virality: 9/10 🔥🔥🔥                    │ ⏳ Pending     │   │
│ │─────────┼───────────────────────────────────────────┼────────────────│   │
│ │         │                                           │                │   │
│ │         │ "Banks Quietly Removed $2.3 Billion       │                │   │
│ │         │  in Points Value"                         │                │   │
│ │         │                                           │                │   │
│ │         │ Duration: 5:12 │ Scenes: 31–37            │                │   │
│ │         │                                           │                │   │
│ │         │ ORIGINAL narration:                       │                │   │
│ │         │ "In 2023, the top five credit card        │                │   │
│ │         │ issuers began a coordinated campaign..."  │                │   │
│ │         │                                           │                │   │
│ │         │ REWRITTEN (short-form):                   │                │   │
│ │         │ "Two point three BILLION dollars.         │                │   │
│ │         │ That's how much credit card companies     │                │   │
│ │         │ stole from you last year alone."          │                │   │
│ │         │                                           │                │   │
│ │         │ Emphasis words: [BILLION] [stole] [you]   │                │   │
│ │         │                                           │                │   │
│ │         │ Hashtags:                                 │                │   │
│ │         │ #creditcards #pointsfraud #financetiktok  │                │   │
│ │         │ #moneytok #cardmath                       │                │   │
│ │         │                                           │                │   │
│ │         │ [✅ Approve] [⏭ Skip] [✏️ Edit]          │                │   │
│ └─────────┴───────────────────────────────────────────┴────────────────┘   │
│                                                                               │
│ ┌────────────────────────────────────────────────────────────────────────┐   │
│ │ Clip #2 │ Virality: 8/10 🔥🔥                      │ ⏳ Pending     │   │
│ │ ...                                                                    │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Clip card fields:**

| Field | Source | Editable |
|-------|--------|----------|
| Clip title | `shorts.clip_title` | ✏️ Yes |
| Virality score | `shorts.virality_score` | No |
| Duration | Calculated from scenes | No |
| Scene range | `shorts.start_scene` — `shorts.end_scene` | No |
| Original narration | From `topics.script_json` scenes | No (reference) |
| Rewritten narration | `shorts.rewritten_narration` | ✏️ Yes |
| Emphasis words | `shorts.emphasis_word_map` (highlighted in text) | ✏️ Yes (click word to toggle emphasis) |
| Hashtags | `shorts.hashtags` | ✏️ Yes |
| Caption | `shorts.caption` | ✏️ Yes |

**Stage 3: Production Monitor (inline per topic)**

After clips are approved, production begins. Show a mini production monitor inline:

```
┌────────────────────────────────────────────────────────────────────────┐
│ PRODUCTION — 8/20 clips complete                                       │
│                                                                        │
│ Clip  │ Audio │ Images │ I2V │ T2V │ Captions │ Assembly │ Status     │
│ #1    │  ✅   │  ✅    │ ✅  │ ✅  │   ✅     │   ✅     │ ✅ Ready   │
│ #2    │  ✅   │  ✅    │ ✅  │ ✅  │   ✅     │   ✅     │ ✅ Ready   │
│ #3    │  ✅   │  ✅    │ ✅  │ ▶   │   ⏳     │   ⏳     │ ⏳ Building │
│ #4    │  ✅   │  ▶    │ ⏳  │ ⏳  │   ⏳     │   ⏳     │ ⏳ Pending │
│ #5    │  ⏳   │  ⏳    │ ⏳  │ ⏳  │   ⏳     │   ⏳     │ ⏳ Pending │
│ ...                                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

**Audit checklist for Page 8:**
- [ ] Project list shows all projects with published video counts
- [ ] Unpublished projects are greyed out and disabled
- [ ] Topic list shows shorts status per topic
- [ ] "Analyze for Viral Clips" button triggers webhook
- [ ] 20 clip cards render with all fields after analysis
- [ ] Original vs rewritten narration shown side-by-side
- [ ] Emphasis words highlighted in rewritten text
- [ ] Click-to-toggle emphasis on individual words
- [ ] Hashtags editable
- [ ] Approve/Skip/Edit actions work per clip
- [ ] Bulk approve actions work
- [ ] Production monitor shows per-clip stage progress
- [ ] Completed clips show "Ready" with preview option
- [ ] Preview button plays 9:16 video in embedded player

---

## 11. Page 9: Social Media Publisher

**URL:** `/social`
**Purpose:** Post and schedule shorts to TikTok, Instagram Reels, and YouTube Shorts.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📤 Social Media Publisher                                                     │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐  │
│ │ READY TO POST (12 clips)                                                │  │
│ │                                                                         │  │
│ │ Clip    │ Title              │ TikTok    │ Instagram │ YT Shorts        │  │
│ │─────────┼────────────────────┼───────────┼───────────┼──────────────────│  │
│ │ CC-1-01 │ Banks Stole $2.3B  │ ⏰ 6PM    │ ⏰ Tmrw   │ ⏰ 6PM          │  │
│ │ CC-1-02 │ The $695 Math      │ 📤 Posted │ ⏰ 8PM    │ ⏰ 8PM          │  │
│ │ CC-1-03 │ Hidden Fee Trap    │ —         │ —         │ —               │  │
│ │                                                                         │  │
│ │ Per clip: [▶ Post Now] [⏰ Schedule] [✏️ Edit] [👁 Preview]            │  │
│ │ Bulk: [⏰ Auto-Schedule All] [▶ Post All Now] [📥 Export CSV]          │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐  │
│ │ POSTING HISTORY                                                         │  │
│ │                                                                         │  │
│ │ Clip    │ Platform  │ Posted      │ Views   │ Likes │ Comments │ Shares │  │
│ │─────────┼───────────┼─────────────┼─────────┼───────┼──────────┼────────│  │
│ │ CC-1-01 │ TikTok    │ 2h ago      │ 1,247   │ 89    │ 12       │ 34    │  │
│ │ CC-1-01 │ YT Shorts │ 2h ago      │ 342     │ 12    │ 3        │ —     │  │
│ │ CC-1-02 │ TikTok    │ 4h ago      │ 3,891   │ 245   │ 67       │ 123   │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Schedule Modal

```
┌──────────────────────────────────────────────────────┐
│ Schedule: "Banks Stole $2.3B"                   ✕   │
│                                                      │
│ Platform       │ Date        │ Time    │ Caption     │
│────────────────┼─────────────┼─────────┼─────────────│
│ ☑ TikTok      │ Mar 23 2026 │ 6:00 PM │ [Edit]      │
│ ☑ Instagram   │ Mar 24 2026 │ 6:00 PM │ [Edit]      │
│ ☑ YT Shorts   │ Mar 23 2026 │ 6:00 PM │ [Edit]      │
│                                                      │
│ ⓘ TikTok posts first, Instagram staggers 24h later  │
│                                                      │
│           [Cancel] [⏰ Schedule All]                 │
└──────────────────────────────────────────────────────┘
```

### Auto-Schedule Logic

When "Auto-Schedule All" is clicked:
1. Assigns clips to peak hours: TikTok 6PM, 8PM, 10PM EST
2. Max 3 clips per day per platform
3. Instagram staggers 24 hours behind TikTok
4. YouTube Shorts same day as TikTok
5. Shows preview of full schedule before confirming

**Audit checklist for Page 9:**
- [ ] Ready-to-post table shows all clips with portrait_drive_url
- [ ] Per-platform status columns (TikTok, Instagram, YT Shorts)
- [ ] Post Now action triggers immediate upload
- [ ] Schedule modal with date/time picker per platform
- [ ] Edit caption allows per-platform customization
- [ ] Preview plays 9:16 clip in modal
- [ ] Auto-schedule distributes across peak hours
- [ ] Posting history table with engagement metrics
- [ ] Metrics update from WF_SOCIAL_ANALYTICS cron
- [ ] Cross-platform stagger toggle works

---

## 12. Page 10: Settings

**URL:** `/project/{id}/settings`
**Purpose:** Per-project configuration and system settings.

### Sections

| Section | Fields | Purpose |
|---------|--------|---------|
| Project Info | Name, niche, description | Basic project identity |
| Production Config | Script approach (3-pass/single), target word count, target scene count, images/video counts | Pipeline parameters |
| Media Models | Image model (dropdown), I2V model, T2V model, costs per unit | Fal.ai model selection |
| YouTube | Channel ID, playlist IDs (3), default privacy, default category | YouTube publishing config |
| Google Drive | Root folder ID, assets folder ID | Storage config |
| Social Media | TikTok account connection, Instagram account connection | OAuth flows for social APIs |
| Prompts | View/edit all dynamic prompts (system prompt, topic generator, script passes, evaluator, visual director) | Prompt engineering per niche |
| Danger Zone | Delete project, reset all topics, clear production data | Destructive actions with confirmation |

### Prompt Editor

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PROMPT EDITOR — Credit Cards                                                  │
│                                                                               │
│ [System Prompt] [Topic Generator] [Script Pass 1] [Pass 2] [Pass 3]         │
│ [Evaluator] [Visual Director] [Shorts Analyzer]                               │
│                                                                               │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ You are a Senior Credit Card Analyst, Data Journalist, and Documentary  │ │
│ │ Narrator with deep expertise in:                                        │ │
│ │ - US credit card rewards programs, sign-up bonuses, and fee structures  │ │
│ │ - Consumer financial behavior and spending optimization                 │ │
│ │ - Data-driven analysis with specific dollar amounts and ROI calculations│ │
│ │ - Investigative journalism techniques for exposing industry practices   │ │
│ │ ...                                                                     │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│ [Save Changes] [Reset to Auto-Generated] [Test Prompt]                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Audit checklist for Page 10:**
- [ ] All configuration sections present
- [ ] Production config values are editable and persist to Supabase
- [ ] Media model dropdowns show available Fal.ai models
- [ ] YouTube channel/playlist IDs saveable
- [ ] Social media OAuth connection flows work
- [ ] Prompt editor shows all 8 prompt types
- [ ] Prompt editor is a full-height code editor (monospace, syntax highlighting)
- [ ] "Test Prompt" button sends prompt to Claude and shows response
- [ ] Danger zone actions require confirmation modal
- [ ] Changes save via PATCH to Supabase

---

## 13. Supabase Realtime Subscriptions

Every page that needs live updates must subscribe to the relevant tables:

| Page | Table | Filter | What Updates |
|------|-------|--------|-------------|
| Projects Home | `projects` | none (all) | Status badges, metrics |
| Project Dashboard | `topics` | `project_id = X` | Status, progress, scores, analytics |
| Topic Review | `topics` | `project_id = X` | Review status after approval actions |
| Script Review | `topics` | `id = topic_id` | Script scores, content |
| Production Monitor | `scenes` | `topic_id = X` | Individual scene completion dots |
| Production Monitor | `topics` | `project_id = X` | Stage transitions |
| Video Review | `topics` | `id = topic_id` | Video URL availability |
| Shorts Creator | `shorts` | `topic_id = X` | Clip production progress |
| Social Publisher | `shorts` | `project_id = X` | Posting status, engagement metrics |

**Implementation pattern:**
```javascript
useEffect(() => {
  const channel = supabase
    .channel(`page-${pageId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'scenes', filter: `topic_id=eq.${topicId}` },
      (payload) => handleSceneUpdate(payload)
    )
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [topicId]);
```

---

## 14. n8n Webhook API Endpoints

| Endpoint | Method | Payload | Response | Triggers |
|----------|--------|---------|----------|----------|
| `/webhook/project/create` | POST | `{ name, niche, description, target_video_count }` | `{ project_id, status }` | WF_NICHE_RESEARCH |
| `/webhook/topics/generate` | POST | `{ project_id }` | `{ status, topic_count }` | WF_TOPIC_GENERATE |
| `/webhook/topics/approve` | POST | `{ topic_ids[] }` | `{ updated_count }` | — (Supabase direct) |
| `/webhook/topics/reject` | POST | `{ topic_id, feedback }` | `{ status }` | — |
| `/webhook/topics/refine` | POST | `{ topic_id, instruction, other_titles[] }` | `{ status }` | WF_TOPIC_REFINE |
| `/webhook/production/trigger` | POST | `{ topic_id }` | `{ status }` | WF_MASTER |
| `/webhook/production/trigger-all` | POST | `{ project_id }` | `{ queued_count }` | WF_MASTER (batch) |
| `/webhook/script/approve` | POST | `{ topic_id }` | `{ status }` | Continues pipeline |
| `/webhook/script/reject` | POST | `{ topic_id, feedback }` | `{ status }` | — |
| `/webhook/script/refine` | POST | `{ topic_id, pass_number, feedback }` | `{ status }` | WF_SCRIPT_REFINE |
| `/webhook/video/approve` | POST | `{ topic_id, metadata }` | `{ youtube_url }` | WF_YOUTUBE_UPLOAD |
| `/webhook/video/schedule` | POST | `{ topic_id, publish_at, metadata }` | `{ status }` | WF_YOUTUBE_UPLOAD (scheduled) |
| `/webhook/video/reject` | POST | `{ topic_id, feedback, redo_stage }` | `{ status }` | Re-triggers specific stage |
| `/webhook/shorts/analyze` | POST | `{ topic_id }` | `{ clip_count }` | WF_SHORTS_ANALYZE |
| `/webhook/shorts/approve` | POST | `{ short_ids[] }` | `{ approved_count }` | — |
| `/webhook/shorts/produce` | POST | `{ topic_id }` | `{ status }` | WF_SHORTS_PRODUCE |
| `/webhook/social/post` | POST | `{ short_id, platforms[], schedule_at? }` | `{ post_ids }` | WF_SOCIAL_POST |
| `/webhook/social/auto-schedule` | POST | `{ project_id, clips[] }` | `{ schedule }` | WF_SOCIAL_POST (batch) |
| `/webhook/thumbnail/regenerate` | POST | `{ topic_id }` | `{ thumbnail_url }` | WF_THUMBNAIL_GENERATE |

---

## 15. Error States & Edge Cases

### Every Page Must Handle

| Error | Display | Action |
|-------|---------|--------|
| Supabase connection lost | Yellow banner: "Connection lost. Retrying..." | Auto-retry with exponential backoff |
| n8n webhook timeout | Toast: "Request timed out. Please try again." | Show retry button |
| n8n webhook error | Toast: "Workflow error: {message}" | Show "View Error Log" link |
| Empty data | Empty state illustration + action button | Guide user to next step |
| Permission denied | Toast: "Action not available" | — |
| Rate limit (YouTube/TikTok) | Toast: "Upload limit reached. Queued for tomorrow." | Auto-queue |

### Pipeline-Specific Edge Cases

| Scenario | Detection | Dashboard Response |
|----------|-----------|-------------------|
| Script quality < 5.0 | `script_quality_score < 5.0` | Red warning banner on Script Review page |
| Force-passed script | `script_force_passed = true` | Yellow warning: "Script passed with issues" |
| Scene skipped by supervisor | `scenes.skipped = true` | Strikethrough dot in scene grid, count shown |
| Topic stuck > 2 hours | `last_status_change` + `status` check | Amber warning on Production Monitor |
| All 3 script attempts failed | `script_attempts = 3 AND status = 'failed'` | Red card with "Manual intervention needed" |
| YouTube quota exceeded | Error from WF_YOUTUBE_UPLOAD | "Queued for tomorrow (quota limit)" |
| Fal.ai generation failure | `scenes.image_status = 'failed'` | Red dot in scene grid, retry button |

---

## 16. Accessibility Requirements

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Color contrast | WCAG AA (4.5:1 minimum) | All text on `--bg-secondary` must pass |
| Keyboard navigation | Full tab navigation | Every interactive element reachable via Tab |
| Focus indicators | Visible focus ring | 2px `--accent-blue` outline on focus |
| Screen reader | ARIA labels | All buttons, icons, status badges have aria-label |
| Reduced motion | `prefers-reduced-motion` | Disable progress bar animations, dot pulsing |
| Form labels | Associated labels | Every input has a visible or aria label |
| Error announcements | `aria-live="polite"` | Toast notifications announced to screen readers |

---

## 17. Mobile Responsiveness

| Breakpoint | Layout Changes |
|------------|---------------|
| ≥ 1280px | Full sidebar + content |
| 1024-1279px | Collapsed sidebar (icons only) + full content |
| 768-1023px | Hidden sidebar (hamburger menu) + full-width content. Two-panel pages stack vertically. |
| < 768px | Full mobile. Cards stack single column. Tables become card lists. Modals become full-screen sheets. |

### Mobile-Specific Components

| Desktop | Mobile |
|---------|--------|
| Pipeline table | Card list with swipe actions |
| Scene grid (172 dots) | Scrollable horizontal strip |
| Two-panel script review | Tabbed view (Scores tab / Script tab) |
| Schedule modal | Full-screen bottom sheet |

---

## Audit Checklist — Master Summary

Use this to audit the current dashboard:

### Global
- [ ] Design system colors match spec (dark cinema theme)
- [ ] Typography uses Fira Sans / Fira Code consistently
- [ ] Status badges use correct colors across all pages
- [ ] Loading states (spinners/skeletons) on every data-fetching component
- [ ] Empty states with actions on every list/grid
- [ ] Error handling with toast notifications
- [ ] Sidebar navigation with all 10 pages listed
- [ ] Breadcrumb in top bar
- [ ] Notification bell with pending action count

### Per Page
- [ ] Page 1: Projects Home — project cards, create modal
- [ ] Page 2: Project Dashboard — 6 metrics, pipeline table, quick actions
- [ ] Page 3: Topic Review — 25 topic cards, approve/reject/refine/edit, bulk actions
- [ ] Page 4: Script Review — quality scores panel, script viewer, scene editing
- [ ] Page 5: Production Monitor — scene grid (172 dots), real-time updates, scene detail
- [ ] Page 6: Video Review — video player, metadata editor, publish actions
- [ ] Page 7: Analytics — 5 metrics, 6 charts, per-topic table
- [ ] Page 8: Shorts Creator — project list, topic list, viral clip review, production monitor
- [ ] Page 9: Social Publisher — ready-to-post table, schedule modal, posting history
- [ ] Page 10: Settings — all config sections, prompt editor, danger zone

### Realtime
- [ ] Scene completion dots update without page refresh
- [ ] Topic status changes reflect immediately
- [ ] Metrics cards update in real-time
- [ ] Shorts production progress updates live

### Responsiveness
- [ ] All pages functional at 1280px, 1024px, 768px, 375px
- [ ] Sidebar collapses correctly
- [ ] Tables convert to card lists on mobile
- [ ] Modals become full-screen on mobile
