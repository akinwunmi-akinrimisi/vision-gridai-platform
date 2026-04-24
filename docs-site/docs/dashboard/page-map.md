# Dashboard page map

The dashboard is a React 18 SPA mounted at
[`https://dashboard.operscale.cloud`](https://dashboard.operscale.cloud) with
**22 routes** declared in
[`dashboard/src/App.jsx:49-70`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/App.jsx).
Every route is lazy-loaded (`React.lazy` + `Suspense`) so the initial bundle
only ships the layout, sidebar, and auth gate. Navigation happens through two
channels: the persistent **Sidebar**
([`dashboard/src/components/layout/Sidebar.jsx:55-76`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/components/layout/Sidebar.jsx))
and **in-page links** (clickable table rows, "Open script" / "Open video"
buttons inside cards).

## Route graph

```mermaid
graph LR
    %% Auth gate
    PIN[PinGate /<br/>auth] --> HOME

    %% Platform (global) routes
    HOME[/] --> PD[/project/:id/]
    HOME --> SHORTS[/shorts]
    HOME --> SOCIAL[/social]
    HOME --> RES[/research]
    HOME --> YTD[/youtube-discovery]
    HOME --> CA[/channel-analyzer]

    %% youtube-discovery branches
    YTD --> VA[/youtube-discovery/<br/>analysis/:analysisId]

    %% Per-project subgraph
    subgraph Project["Per-project routes (/project/:id/...)"]
        PD --> NR[/project/:id/research]
        PD --> TR[/project/:id/topics]
        PD --> KW[/project/:id/keywords]
        PD --> INT[/project/:id/intelligence]
        PD --> IDEAS[/project/:id/ideas]
        PD --> COACH[/project/:id/coach]
        PD --> PM[/project/:id/production]
        PD --> AN[/project/:id/analytics]
        PD --> CAL[/project/:id/calendar]
        PD --> ENG[/project/:id/engagement]
        PD --> SET[/project/:id/settings]
        TR --> TD[/project/:id/topics/:topicId]
        TD --> SR[/project/:id/topics/:topicId/script]
        TD --> VR[/project/:id/topics/:topicId/review]
        SR -->|approve| PM
        PM -->|done| VR
    end

    %% Cross-area flows
    RES -.->|topic feeds| HOME
    YTD -.->|reference channels| HOME
    CA -.->|niche viability| HOME
    PM -->|video done| SHORTS
    VR -->|published| SOCIAL

    classDef plat fill:#1e293b,stroke:#f59e0b,color:#fbbf24;
    classDef proj fill:#0f172a,stroke:#3b82f6,color:#93c5fd;
    classDef gate fill:#1e1b4b,stroke:#8b5cf6,color:#c4b5fd;
    class HOME,SHORTS,SOCIAL,RES,YTD,VA,CA plat;
    class PD,NR,TR,KW,INT,IDEAS,COACH,PM,AN,CAL,ENG,SET,TD,SR,VR proj;
    class PIN gate;
```

## Sidebar items

Two grouped sections rendered by `Sidebar.jsx`. Item icons come from
`lucide-react`. Source:
[`Sidebar.jsx:55-76`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/components/layout/Sidebar.jsx).

### Platform (always visible)

| Icon | Label | Path |
|------|-------|------|
| `Microscope` | Niche Research | `/youtube-discovery` |
| `Radar` | Channel Analyzer | `/channel-analyzer` |
| `LayoutDashboard` | Projects | `/` |
| `Clapperboard` | Shorts Creator | `/shorts` |
| `Share2` | Social Publisher | `/social` |

The global `/research` route (Topic Intelligence) is **not** in the Sidebar;
it is reached through the `CreateProjectModal` "From Research" link or
typed directly. ⚠ Needs verification — this may be intentional (research is
project-creation-time tooling) or an oversight. See
[`Sidebar.jsx:55-61`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/components/layout/Sidebar.jsx).

### Project (only visible inside `/project/:id/...`)

| Icon | Label | Path template |
|------|-------|--------------|
| `Monitor` | Dashboard | `/project/:id` |
| `Search` | Research | `/project/:id/research` |
| `ListChecks` | Topics | `/project/:id/topics` (badge: pending count) |
| `Hash` | Keywords | `/project/:id/keywords` |
| `Brain` | Intelligence | `/project/:id/intelligence` |
| `Lightbulb` | Daily Ideas | `/project/:id/ideas` |
| `MessageCircle` | AI Coach | `/project/:id/coach` |
| `Activity` | Production | `/project/:id/production` |
| `BarChart3` | Analytics | `/project/:id/analytics` |
| `CalendarDays` | Calendar | `/project/:id/calendar` |
| `MessageCircle` | Engagement | `/project/:id/engagement` |
| `Settings` | Settings | `/project/:id/settings` |

The Sidebar also embeds a **ProjectSelector** dropdown (visible inside any
project route) that swaps the current `:id` segment of the URL on selection,
plus footer chips for **upload quota** (`useQuotaStatus`) and **total spend**
(rolled-up across all projects from the `useProjects` cache).

## In-page navigation patterns

The sidebar covers most navigation, but several pages contain their own
links so the natural workflow doesn't require returning to the sidebar:

- **PipelineTable rows** on the Project Dashboard
  ([`components/dashboard/PipelineTable.jsx`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/components/dashboard/PipelineTable.jsx))
  navigate to `/project/:id/topics/:topicId` (TopicDetail) on row click.
- **TopicCard "Open script"** buttons on `/project/:id/topics` deep-link to
  `/project/:id/topics/:topicId/script`.
- **TopicDetail roadmap** has card links to Script Review and Video Review
  for the visible topic ([`pages/TopicDetail.jsx`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/pages/TopicDetail.jsx)).
- **ProductionMonitor "View video"** appears on the active topic card once
  `pipeline_stage = 'assembled'` and routes to `/project/:id/topics/:topicId/review`.
- **VideoReview "Create shorts"** routes to `/shorts` after publish. From there,
  the shorts page is project + topic scoped via internal state, not URL params
  ([`pages/ShortsCreator.jsx`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/pages/ShortsCreator.jsx)).
- **YouTubeDiscovery row** clicks navigate to the per-analysis page at
  `/youtube-discovery/analysis/:analysisId` (the only secondary platform-level
  route).
- **CreateProjectModal "From Research"** opens dropdowns sourced from
  the latest `research_runs` row and pre-fills the new project niche +
  description. See [Topic Intelligence](../subsystems/topic-intelligence.md).

## Authentication boundary

A single `PinGate` component sits in front of every route
([`App.jsx:40-42`](https://github.com/akinwunmi-akinrimisi/vision-gridai-platform/blob/main/dashboard/src/App.jsx)).
It reads `useAuth()` (a localStorage-backed PIN check) and short-circuits
rendering until the operator authenticates. There is no per-route role check
— once past PinGate, every route is accessible. Multi-user RBAC is tracked
in `docs/SECURITY_REMEDIATION_2026_04_21_STATUS.md` for a future batch.

## Why this architecture

The split between **platform routes** (operate across all projects: research,
shorts, social) and **per-project routes** (scoped to one niche/channel)
mirrors the data model: the `projects` table is the top-level entity, but
shorts, social posts, and discovery results are queryable across all projects
at once. The Sidebar's two-section layout makes this distinction visible —
when you're inside a project, the Project section appears; when you leave it,
only Platform items remain.
