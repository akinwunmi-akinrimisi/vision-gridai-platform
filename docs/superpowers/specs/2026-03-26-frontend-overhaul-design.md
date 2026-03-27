# Vision GridAI — Frontend Overhaul Design Spec

**Date:** 2026-03-26
**Approach:** Evolutionary Rebuild (Vite + React Router + shadcn/ui)
**Visual Direction:** Neon Pipeline (deep violet-black, warm amber/orange accents)
**Layout:** Collapsible Sidebar (refined, two-tier nav)
**Scope:** Full rebuild of all 12 pages + app shell + design system

---

## 1. Goals

- Transform the dashboard from a developer tool into a sellable SaaS product
- Figma-inspired aesthetic: spacious, fluid, design-forward, professional
- Replace all hand-rolled components with shadcn/ui (accessible, keyboard-navigable)
- Consistent design system across all 12 pages
- Add power-user features (Cmd+K command palette)

## 2. Tech Stack

### Stays (no changes)
- **React 18** — component framework
- **Vite 5** — dev server and bundler
- **React Router 7** — client-side routing (all existing routes preserved)
- **React Query (TanStack Query 5)** — server state, caching, mutations
- **@supabase/supabase-js** — Realtime subscriptions + REST reads
- **Recharts** — chart library
- **Sonner** — toast notifications (shadcn/ui uses sonner natively)
- **Lucide React** — icon library

### Changes
| Current | New | Reason |
|---------|-----|--------|
| Hand-rolled Tailwind components | **shadcn/ui** components | Accessible, consistent, copy-paste owned |
| Tailwind CSS 3.4 | **Tailwind CSS 4** | Native CSS variables, faster builds. shadcn/ui `init` handles the migration. Config moves from `tailwind.config.js` to `@theme` in CSS. |
| Fira Sans / Fira Code fonts | **Inter** / system mono | Tighter tracking, modern SaaS standard |
| Custom `index.css` design system (500+ lines) | **Tailwind config tokens** + minimal CSS | Design tokens in config, not custom CSS |
| No search | **cmdk** (Command palette) | Cmd+K power-user navigation |

### New Dependencies
```
shadcn/ui components (copy-paste, not a package dependency):
  - Button, Dialog, DropdownMenu, Tabs, Table, Card, Badge
  - Tooltip, Sheet (mobile sidebar), Command (search palette)
  - Input, Textarea, Select, Switch, Separator, ScrollArea
  - Popover, Calendar (for scheduling)

npm packages:
  - cmdk (command palette — required by shadcn Command)
  - @radix-ui/* (headless primitives — installed per-component by shadcn)
  - class-variance-authority (component variants)
  - clsx + tailwind-merge (class composition utility)
```

### What Gets Deleted
- `dashboard/src/styles/index.css` — replaced by Tailwind config tokens + minimal globals
- All hand-rolled component classes (`.glass-card`, `.card-elevated`, `.card-interactive`, `.btn-primary`, `.badge-*`, `.metric-value`, etc.)
- `design-system/MASTER.md` — replaced by this spec + Tailwind config as source of truth

## 3. Design System — Neon Pipeline

### Color Tokens

```
Background:
  --background:        #0C0A1A    (deep violet-black — page bg)
  --card:              #110E2A    (slightly lighter — card surfaces)
  --card-hover:        #16123A    (card hover state)
  --popover:           #110E2A    (dropdowns, tooltips)
  --muted:             #1A1640    (disabled, subtle backgrounds)

Borders:
  --border:            rgba(255,255,255,0.06)   (default)
  --border-hover:      rgba(255,255,255,0.12)   (hover/focus)
  --border-accent:     rgba(251,191,36,0.15)    (active/selected items)

Text:
  --foreground:        #FAFAFA    (primary text — zinc-50)
  --muted-foreground:  #71717A    (secondary text — zinc-500)
  --accent-foreground: #FBBF24    (amber accent text)

Brand:
  --primary:           #F59E0B    (amber-500 — primary actions)
  --primary-hover:     #D97706    (amber-600)
  --primary-gradient:  linear-gradient(135deg, #F59E0B, #EA580C)
  --primary-glow:      0 0 20px rgba(245,158,11,0.2)

Semantic:
  --success:           #34D399    (emerald-400)
  --success-bg:        rgba(16,185,129,0.1)
  --warning:           #FBBF24    (amber-400)
  --warning-bg:        rgba(251,191,36,0.1)
  --danger:            #F87171    (red-400)
  --danger-bg:         rgba(239,68,68,0.08)
  --info:              #A78BFA    (violet-400)
  --info-bg:           rgba(139,92,246,0.1)
```

### Typography

```
Font Family:     Inter, system-ui, -apple-system, sans-serif
Mono:            ui-monospace, 'Cascadia Code', monospace

Headings:        letter-spacing: -0.03em, font-weight: 700
  page-title:    22px (1.375rem)
  section-title: 14px (0.875rem), font-weight: 600
  card-title:    14px, font-weight: 600, letter-spacing: -0.01em

Body:            14px, line-height: 1.6, color: foreground
Muted:           12-13px, color: muted-foreground
Labels:          9-10px, uppercase, letter-spacing: 0.05-0.08em, color: muted-foreground
Metrics:         22-28px, font-weight: 700, letter-spacing: -0.03em, tabular-nums
```

### Spacing & Layout

```
Page padding:        28px (desktop), 16px (mobile)
Max content width:   1440px (centered)
Card padding:        16-20px
Card border-radius:  12px (large), 8px (small/nested)
Input border-radius: 8px
Badge border-radius: 6px
Button border-radius: 8px
Gap (card grid):     12-16px
Gap (stat row):      10-12px
```

### Card Styles

```
Default Card:
  background: var(--card)
  border: 1px solid var(--border)
  border-radius: 12px

Hover Card:
  border-color: var(--border-hover)
  background: var(--card-hover)

Active/Selected Card:
  border-color: var(--border-accent)
  subtle amber glow: box-shadow: 0 0 20px rgba(245,158,11,0.08)

Hero Card (active production, top performer):
  border-color: rgba(251,191,36,0.12)
  background: rgba(251,191,36,0.04)
  top gradient bar: 2px linear-gradient(90deg, #F59E0B, #EF4444)
```

### Buttons

```
Primary:    background: var(--primary-gradient), color: white, glow shadow on hover
Secondary:  background: rgba(255,255,255,0.04), border: 1px solid var(--border), color: muted-foreground
Ghost:      background: transparent, hover: rgba(255,255,255,0.04)
Success:    background: var(--success-bg), border: 1px solid rgba(16,185,129,0.2), color: success
Danger:     background: var(--danger-bg), border: 1px solid rgba(239,68,68,0.15), color: danger
```

### Status Badges

```
Published:   bg: success-bg, text: success, border: success/20%
In Progress: bg: warning-bg, text: warning, border: warning/15%
Pending:     bg: muted, text: muted-foreground
Failed:      bg: danger-bg, text: danger, border: danger/15%
Review:      bg: info-bg, text: info, border: info/15%
```

### Animations

```
Page entrance:     fade-in + slide-up (0.3s, ease-out)
Card hover:        border-color transition (0.2s)
Stagger children:  50ms delay per item (max 8 items)
Glow pulse:        2s ease-in-out infinite (active production indicators only)
Reduced motion:    All animations disabled via prefers-reduced-motion
```

## 4. App Shell

### Sidebar (Collapsible)
- **Expanded:** 240px width with text labels
- **Collapsed:** 56px width, icon-only with tooltip labels
- **Toggle:** Chevron button at bottom of sidebar
- **Mobile:** Sheet overlay (shadcn Sheet component), triggered by hamburger in top bar

**Structure (top to bottom):**
1. **Logo + Project Switcher** — GridAI logo, active project name, dropdown chevron to switch projects
2. **Search** — Compact search bar showing "Search... ⌘K", clicking opens Command palette
3. **Platform Nav** (section label) — Projects, Shorts Creator, Social Publisher
4. **Project Nav** (section label, only visible when a project is selected) — Dashboard, Research, Topics, Scripts, Production, Analytics, Settings
5. **Nav badges** — Amber badge count on Topics (pending review count), Production (active count)
6. **User section** (bottom) — Avatar, name, connection status dot (green = Supabase connected), theme toggle, logout

**Active state:** Amber background (`rgba(251,191,36,0.1)`) with amber text and left accent border.

### Top Bar
- **Height:** 48px
- **Left:** Breadcrumb trail (e.g., "US Credit Cards / Topics / #1 Amex Platinum")
- **Right:** Theme toggle, connection status indicator
- **Mobile:** Hamburger menu (left) replaces breadcrumbs

### Command Palette (Cmd+K)
- shadcn Command component (built on cmdk)
- Search across: pages, topics (by title), projects, actions ("Start production", "Approve all")
- Recent items section
- Keyboard navigation

## 5. Pages — Detailed Specs

### Page 1: Projects Home (`/`)

**Header:** "Projects" title + subtitle + "New Project" primary gradient button
**Stats row:** 4-column grid — Total Projects, Videos Published, Total Revenue (amber gradient text), Avg ROI
**Project cards:** 2-column grid
  - Active projects: card with amber top-border gradient bar, emoji + name, topic/published counts, revenue/ROI/spend metrics, mini progress bar (published/total), status badge
  - Dashed "Create new project" placeholder card
**Create modal:** shadcn Dialog — niche name input, optional description textarea, target video count, "Start Research" primary button

### Page 2: Project Dashboard (`/project/:id`)

**Header:** Project name + "Start Production" primary button + "Export" secondary button
**KPI row:** 5-column grid — Topics (with approved sub-count), Published, In Progress, Revenue (amber gradient), Total Spend
**Pipeline table:** shadcn Table inside a card
  - Filter tabs: All / Active / Published / Failed
  - Columns: #, Title, Angle, Status (badge), Score (amber), Views, Revenue
  - Rows clickable → navigate to `/project/:id/topics/:topicId`
  - Hover: subtle background highlight

### Page 3: Niche Research (`/project/:id/research`)

**Blue Ocean Hero:** Full-width card with channel positioning statement, strategy summary
**2-column grid:**
  - Competitor cards: channel name, sub count, identified gaps (badges)
  - Pain Points: grouped by source (Reddit, Quora, forums), tag cloud
**Playlist Strategy:** 3 cards, one per playlist angle, with theme description
**Red Ocean List:** collapsible section showing topics to avoid
**Keyword Cloud:** visual keyword display with volume indicators

### Page 4: Topic Review (`/project/:id/topics`)

**Header:** "Topics" + counts summary + Filter dropdown + "Approve All Pending" success button
**Summary bar:** visual breakdown — approved (green) / pending (amber) / rejected (red)
**Topic cards:** expandable list
  - Expanded: topic number badge, triple metadata badges (angle, CPM, viral), title, hook text, inline avatar preview (4 key fields), right-aligned action buttons (Approve/Reject/Refine)
  - Collapsed (approved): compact single row with title + status badge
  - Refine: expands textarea below card for custom instructions
  - Edit: inline editing of title, hook, avatar fields
**Bulk actions:** Approve All, Approve by Playlist, Regenerate Rejected

### Page 5: Topic Detail (`/project/:id/topics/:topicId`)

**Pipeline roadmap:** Horizontal 14-step progress indicator with colored dots (green=complete, amber=active, gray=pending, red=failed)
**Asset cards:** Grid showing remaining counts per stage (audio, images, I2V, T2V, captions)
**Scene drill-down:** Expandable section with individual scene status, click to view assets

### Page 6: Script Review (`/project/:id/topics/:topicId/script`)

**Split panel layout:**
  - **Left panel (240px fixed):** Quality score (large amber gradient number), 7-dimension bar charts with scores, word/scene/visual stats, attempt counter, action buttons (Approve, Reject, Refine with Feedback)
  - **Right panel (flex):** Pass tabs (Pass 1 / 2 / 3), collapsible chapters, scene cards with scene_id (monospace), visual type badge (color-coded: green=static, violet=i2v, blue=t2v), emotional beat label, narration text
**Refine panel:** Slides out from bottom/right with textarea for feedback instructions
**Force pass banner:** Warning banner if script was force-passed below threshold

### Page 7: Video Review (`/project/:id/topics/:topicId/review`)

**Video player:** Embedded player (Google Drive URL or HTML5 video)
**Metadata panel:** Title, description, tags (editable), thumbnail preview
**Production summary:** Cost breakdown, duration, scene count
**Actions:** "Approve & Publish" primary button, "Approve & Schedule" with date picker (shadcn Calendar + Popover), "Reject" danger button, "Edit Metadata" secondary
**Upload progress:** Progress bar shown during YouTube upload

### Page 8: Production Monitor (`/project/:id/production`)

**Active production hero card:**
  - Amber-bordered, "Now Producing" label
  - Topic title, overall percentage, estimated time remaining
  - 6-stage horizontal progress: Audio → Images → I2V → T2V → Captions → Assembly (each with green/amber/gray bar + count)
  - 172-dot scene grid: green (complete), amber (active), red (failed), gray (pending) — with legend
**2-column grid below:**
  - Running cost card: itemized breakdown (Script, TTS, Images, I2V, T2V)
  - Queue card: ordered list with active/waiting/queued states
**Activity log:** Collapsible section with timestamped production events
**Failed scenes:** Expandable section listing failed scenes with error details + retry button
**Supervisor alert:** Toast/banner when supervisor agent detects issues

### Page 9: Analytics (`/project/:id/analytics`)

**Header:** "Analytics" + time range toggle (7D / 30D / 90D / All)
**KPI row:** 4-column — Total Views, Watch Hours, Revenue (amber gradient), Avg CTR — each with delta indicator (↑/↓ percentage, green/red)
**Charts (Recharts):**
  - Views & Revenue bar chart with amber gradient fills
  - Watch time line chart
  - CTR trend line
**Top Performer card:** Amber-bordered highlight with emoji trophy, video title, views, revenue
**Performance table:** All published videos, sortable by views/revenue/CTR/watch time

### Page 10: Shorts Creator (`/shorts`)

**Topic browser:** Filterable list of all topics across all projects
  - Only published topics are selectable
  - Shows shorts status per topic (not started / N approved / N ready)
**"Analyze for Viral Clips" button** — triggers n8n webhook
**Clip review grid (Gate 4):** Cards showing:
  - Virality score with fire emoji for 8+
  - Clip title (editable)
  - Original vs rewritten narration (side-by-side or toggle)
  - Emphasis words highlighted in narration
  - Hashtags (editable tag input)
  - Actions: Approve / Skip / Edit
**Bulk actions:** Approve All, Approve Top 10
**Production progress:** Per-clip stage indicators after approval
**Preview:** Embedded 9:16 player for finished clips

### Page 11: Social Publisher (`/social`)

**Ready to Post table:** shadcn Table
  - Columns: Clip title, TikTok status dot, Instagram status dot, YouTube Shorts status dot, Actions
  - Per-row actions: Post Now (platform selector), Schedule (date/time picker), Edit Caption, Preview
**Bulk actions bar:**
  - Auto-Schedule All (AI suggests peak hours)
  - Post All Now
  - Cross-platform stagger toggle (TikTok first → IG 24h later → YT same day)
**Posting history:** Table of all posted clips with platform, timestamp, views, likes, comments, shares — filterable and sortable
**Connected accounts:** Cards showing TikTok, Instagram, YouTube connection status

### Page 12: Settings (`/project/:id/settings`)

**Tab bar:** 5 tabs using shadcn Tabs — General, Models, YouTube, Social, Prompts
- **General:** Project name, niche, script approach toggle (3-pass / single-call), target word count, scene count
- **Models:** Image model selector, I2V/T2V model selectors, cost per unit fields
- **YouTube:** Channel ID, playlist IDs (3), upload quota display
- **Social:** TikTok account, Instagram account, connection status + OAuth buttons
- **Prompts:** Editable prompt templates (system prompt, topic generator, script passes, evaluator) with version history

## 6. Responsive Behavior

- **Desktop (1024px+):** Full sidebar + content area, max-width 1440px
- **Tablet (768-1023px):** Sidebar collapsed by default, expandable. Stat grids go from 4/5 columns to 2-3.
- **Mobile (<768px):** Sidebar becomes Sheet overlay. Stat grids stack to 2 columns. Tables become card lists. Split panels stack vertically.

## 7. Accessibility

- All interactive elements via shadcn/ui (Radix primitives) — built-in ARIA roles, keyboard navigation, focus management
- Color contrast: all text meets WCAG AA (4.5:1 minimum)
- Focus visible rings on all interactive elements
- Reduced motion: all animations disabled via `prefers-reduced-motion: reduce`
- Screen reader labels on icon-only buttons

## 8. File Structure

```
dashboard/src/
├── components/
│   ├── ui/              ← shadcn/ui components (Button, Dialog, Table, etc.)
│   ├── layout/          ← AppLayout, Sidebar, TopBar, CommandPalette
│   ├── projects/        ← ProjectCard, CreateProjectModal
│   ├── topics/          ← TopicCard, TopicBulkBar, EditPanel
│   ├── script/          ← ScorePanel, ChapterAccordion, SceneRow, PassTabs
│   ├── production/      ← SceneDotGrid, StageProgress, CostBreakdown, QueueList
│   ├── video/           ← VideoPlayer, MetadataPanel, PublishDialog
│   ├── analytics/       ← KPICard, ViewsChart, RevenueChart, TopPerformer
│   ├── shorts/          ← ClipCard, ViralityBadge, ClipPreview
│   ├── social/          ← PostTable, ScheduleDialog, AccountCard
│   └── research/        ← BlueOceanHero, CompetitorCard, PainPoints, PlaylistCard
├── hooks/               ← All existing hooks preserved (useProjects, useTopics, etc.)
├── lib/
│   ├── supabase.js      ← Unchanged
│   ├── queryClient.js   ← Unchanged
│   ├── analyticsApi.js  ← Unchanged
│   └── utils.js         ← cn() helper (clsx + tailwind-merge)
├── pages/               ← All 12 pages rebuilt
├── styles/
│   └── globals.css      ← Minimal: @tailwind directives, Inter font import, scrollbar, selection
└── main.jsx             ← Unchanged
```

## 9. Migration Strategy

This is a rebuild, not an incremental migration. The approach:

1. **Install shadcn/ui** — init with Tailwind v4, add all needed components
2. **Set up design tokens** — new `tailwind.config.js` with Neon Pipeline colors, new `globals.css`
3. **Build app shell** — Sidebar, TopBar, AppLayout, CommandPalette
4. **Rebuild pages one at a time** — replace existing page file contents, keeping the same filenames and routes
5. **Preserve all hooks and lib files** — no changes to data layer
6. **Delete old design system files** — `design-system/MASTER.md`, old `index.css` classes

Each page rebuild replaces the JSX and component imports but keeps the same React Query hooks, Supabase subscriptions, and n8n webhook calls.

## 10. Out of Scope

- No framework migration (staying on Vite + React Router)
- No backend changes (all n8n webhooks, Supabase schema unchanged)
- No new features (same 12 pages, same functionality)
- No authentication changes (PinGate stays)
- No light mode initially (dark-only for v1, light mode as future enhancement)
- No i18n
