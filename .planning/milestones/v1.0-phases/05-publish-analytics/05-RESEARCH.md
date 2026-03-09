# Phase 5: Publish + Analytics - Research

**Researched:** 2026-03-09
**Domain:** YouTube Data API v3 (upload + analytics), Recharts data visualization, Google Drive video embedding, React dashboard pages (Video Review + Analytics)
**Confidence:** MEDIUM-HIGH

## Summary

Phase 5 covers three distinct streams: (1) a Video Review page with Gate 3 approval flow and metadata editing, (2) YouTube upload via resumable upload protocol in n8n, and (3) an Analytics page with Recharts charts and a daily YouTube Analytics cron. The dashboard work follows established patterns from Phases 3-4 (two-column sticky layout, TanStack Query + Realtime, webhook mutations). The n8n work introduces two new workflows: a multi-step YouTube upload workflow and a daily analytics cron.

The main technical risks are: (a) YouTube resumable uploads for 2-5GB files via n8n HTTP Request nodes (the native YouTube node has known issues with large files), (b) YouTube Analytics API requires separate OAuth scope (yt-analytics.readonly) and uses a different API endpoint than the Data API, and (c) the Gate 3 approval dialog has complex multi-option UX (Publish Now / Schedule / Approve Only) with upload progress tracking via Realtime.

The dashboard side is well-supported by existing patterns: the Video Review page reuses the ScriptReview two-column sticky layout, ConfirmDialog handles Gate 3, and Recharts (already installed at ^2.10.0) handles all chart types needed. Cost tracking reads pre-computed values from topics.cost_breakdown (already populated by Phase 4 production workflows).

**Primary recommendation:** Structure into 5-6 plans: (1) Wave 0 test scaffolding + publish API helpers, (2) Video Review page with metadata display + Gate 3 approval UI, (3) publish webhook endpoints + YouTube upload n8n workflow, (4) upload progress tracking + batch publish, (5) Analytics page with Recharts charts + data hooks, (6) analytics cron workflow + manual refresh. Each n8n workflow is a separate JSON file.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Video Review: Two-column layout matching Script Review pattern -- sticky left metadata panel + scrollable right content panel
- Left panel (sticky): Title, description (template preview + raw edit), tags (chip badges + input), chapters (editable timestamps), playlist assignment dropdown, action buttons (Approve, Reject, Edit Metadata)
- Right panel (scrollable): Google Drive embedded iframe video player, large 16:9 thumbnail preview below player, download video button, collapsible SRT caption preview, collapsible production summary (total cost with per-stage breakdown, scene count, production duration, skipped scenes)
- Full-width header bar: topic number, SEO title, playlist badge, status badge, prev/next topic arrows (cycle through assembled topics)
- Mobile: metadata panel collapses to compact top bar (same pattern as Script Review)
- Navigate to Video Review from Pipeline Table -- topics with status='assembled' show "Review Video" button
- Published videos remain accessible at same route in read-only mode -- green "Published" banner, YouTube embed replaces Drive player, analytics summary shown
- Toast notification + Pipeline Table amber "Ready for Review" badge when assembly completes
- Inline edit on left panel -- click "Edit Metadata" transforms display fields to editable inputs in-place, Save/Cancel buttons appear
- All fields editable: title, description, tags, chapters, playlist assignment, thumbnail prompt
- Tags shown as removable chip/pill badges with text input to add new tags (Enter to add)
- Chapters auto-generated from script chapter names + cumulative audio timestamps (start_time_ms), editable list
- Description auto-generated with template formatting: hook paragraph, chapter list with timestamps, hashtags, affiliate disclaimer, channel links
- Thumbnail regeneration: edit prompt text, click Regenerate, webhook to n8n, Kie.ai generates new thumbnail, Realtime update
- Gate 3 Approve opens ConfirmDialog with three options: Publish Now, Schedule (date/time picker), Approve Only
- Dialog shows: topic title, cost, scene count, YouTube quota usage ("4 uploads remaining today")
- Reject opens ConfirmDialog with feedback textarea + stage rollback radio options (Assembly only / Visuals + assembly / Full re-production) with estimated costs
- Upload progress: multi-step display (Uploading video %, Setting metadata, Uploading captions, Setting thumbnail, Assigning playlist) with checkmarks and spinner
- Upload failure: auto-retry 2x, then show error with "Retry Upload" button
- Resumable upload protocol (required for 2-5GB 2hr videos)
- "Publish Now" sets video as public immediately; "Schedule" uploads as private, transitions to public at scheduled time via analytics cron
- YouTube OAuth2 credential managed in n8n credential manager
- Quota: 10,000 units/day, 1,600 per upload = max 6 uploads/day
- Beyond quota: continue uploading as private, analytics cron transitions to public next day
- No end screens or cards in v1
- No re-upload or un-publish from dashboard
- Batch Publish: "Publish All Approved" button on Project Dashboard, dialog with checkboxes + quota check, sequential upload with progress list
- Quota indicator in sidebar footer near connection status
- Pipeline Status Badges: assembled=blue, ready-review=amber, video_approved=blue, publishing=amber animated, scheduled=purple, published=green with checkmark, upload_failed=red
- Analytics: Top metric summary cards (Views, Watch Hours, CTR, Revenue) + secondary metrics (Likes, Comments, Subscribers, Avg Duration)
- "Last updated" timestamp + "Refresh Now" manual trigger button
- Top performer highlight card: best video by views with thumbnail, title, key metrics
- Time range filter: dropdown with Last 7 days, Last 30 days (default), Last 90 days, All time
- Charts (Recharts): Views over time (area), Revenue over time (line), CTR + Avg Duration per video (bar), Cost distribution by stage (donut), Cost vs Revenue per video (grouped bar)
- Per-video performance table: sortable by any column, columns: #, Title, Views, Watch Hours, CTR, Avg Duration, Revenue, Cost, P/L, CPM, Published Date
- Default sort by published date descending
- Clicking video row navigates to Video Review (read-only) for published videos
- Analytics cron: daily at 6 AM UTC, pulls per-video YouTube metrics, handles private-to-public transitions for scheduled/over-quota videos
- Manual "Refresh Now" triggers same workflow via webhook
- Cost tracking: Project Dashboard financial metrics + Analytics cost section + Video Review production summary + Production Monitor live counter
- All cost data from pre-computed Supabase values (topics.cost_breakdown, topics.total_cost)

### Claude's Discretion
- Exact Google Drive iframe embed parameters and sizing
- Upload progress percentage tracking mechanism (Supabase field or webhook polling)
- Recharts color palette and chart styling
- Exact donut chart segment colors for cost stages
- Time range filter implementation details
- Caption preview formatting and scroll height
- Schedule date picker component choice
- Thumbnail regeneration loading state design
- Batch publish dialog checkbox UX details
- Error message formatting for upload failures

### Deferred Ideas (OUT OF SCOPE)
- YouTube end screens and cards -- v2 enhancement
- Re-upload or un-publish from dashboard -- manage on YouTube Studio
- Cross-niche portfolio analytics (compare CPM across niches) -- v2 (ANLY-05)
- Content calendar view with scheduling optimization -- v2 (ANLY-06)
- A/B testing video titles/thumbnails -- v2 (ANLY-07)
- Channel-level analytics (total subscribers, total views) -- v2
- Custom date range picker for analytics -- v2 if preset ranges prove insufficient
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PUBL-01 | Video preview page with embedded player (from Google Drive URL) | Google Drive iframe embed pattern documented; `/preview` URL path required |
| PUBL-02 | Generated YouTube metadata displayed (title, description, tags, chapters) | Auto-generation from script_metadata + scenes timestamps; chapters from cumulative start_time_ms |
| PUBL-03 | Thumbnail preview displayed | Thumbnail URL from topics.thumbnail_url; 16:9 aspect ratio display |
| PUBL-04 | User can approve and publish video (Gate 3) | Three-option ConfirmDialog (Publish Now / Schedule / Approve Only); reject with rollback options |
| PUBL-05 | User can edit metadata before publishing | Inline edit pattern with Save/Cancel; tags as chips; chapters as editable list |
| PUBL-06 | YouTube upload with resumable upload, captions, thumbnail, playlist assignment | n8n HTTP Request node with resumable upload protocol; 5-step upload workflow |
| PUBL-07 | YouTube API quota respected (max 6 uploads/day) | Track uploads_today counter; quota check before publish; over-quota uploads as private |
| ANLY-01 | Daily cron pulls YouTube analytics | YouTube Analytics API reports.query with dimensions=video; n8n Schedule Trigger |
| ANLY-02 | Analytics data written to yt_* columns on topics table | PATCH to topics table with all yt_* fields per video |
| ANLY-03 | Analytics page displays per-video performance metrics | Recharts charts + sortable table; time range filter on topic data |
| ANLY-04 | Per-video and per-project cost tracking displayed on dashboard | Read topics.cost_breakdown + total_cost; aggregate in useProjectMetrics |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.2.0 | UI framework | Already in use across all pages |
| react-router | ^7.1.0 | Routing | Established pattern, unified imports |
| @tanstack/react-query | ^5.62.0 | Data fetching + cache | Established pattern with Realtime invalidation |
| @supabase/supabase-js | ^2.39.0 | Database client + Realtime | Established pattern |
| recharts | ^2.10.0 | Charts | Already installed, not yet used |
| lucide-react | ^0.263.1 | Icons | Established pattern |
| sonner | ^2.0.0 | Toast notifications | Established pattern |
| tailwindcss | ^3.4.0 | Styling | Established pattern |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^2.1.0 | Testing | All unit tests |
| @testing-library/react | ^16.1.0 | Component testing | Component render tests |
| @testing-library/jest-dom | ^6.6.0 | DOM matchers | Test assertions |

### No New Dependencies Needed
All chart types (AreaChart, LineChart, BarChart, PieChart/donut) are available in Recharts ^2.10.0. No date picker library needed -- use native `<input type="datetime-local">` for the schedule date/time picker (it's a single field, not a complex calendar). No new npm packages required for Phase 5.

## Architecture Patterns

### Recommended New File Structure
```
dashboard/src/
  pages/
    VideoReview.jsx          # NEW - Gate 3 page (two-column layout)
    Analytics.jsx            # REWRITE - from scaffold to full implementation
  components/
    video/                   # NEW directory
      MetadataPanel.jsx      # Left sticky panel (title, desc, tags, chapters, actions)
      VideoPlayer.jsx        # Google Drive iframe / YouTube embed switcher
      ThumbnailPreview.jsx   # 16:9 thumbnail with regenerate button
      CaptionPreview.jsx     # Collapsible SRT caption viewer
      ProductionSummary.jsx  # Collapsible cost/scene summary
      UploadProgress.jsx     # Multi-step upload progress display
      PublishDialog.jsx      # Gate 3 approve dialog (3 options)
      RejectDialog.jsx       # Reject with rollback options
      BatchPublishDialog.jsx # Batch publish from Project Dashboard
    analytics/               # NEW directory
      MetricCards.jsx        # Reusable metric card grid (extends existing pattern)
      TopPerformerCard.jsx   # Best video highlight card
      ViewsChart.jsx         # Area chart - views over time
      RevenueChart.jsx       # Line chart - revenue over time
      PerformanceChart.jsx   # Bar chart - CTR + Avg Duration per video
      CostDonut.jsx          # Donut chart - cost by stage
      CostRevenueChart.jsx   # Grouped bar - cost vs revenue per video
      PerformanceTable.jsx   # Sortable per-video metrics table
      TimeRangeFilter.jsx    # Dropdown filter component
  hooks/
    useVideoReview.js        # NEW - fetch single topic + scenes for review
    usePublishMutations.js   # NEW - approve/reject/publish/schedule mutations
    useAnalytics.js          # NEW - fetch analytics data with time range filter
    useQuotaStatus.js        # NEW - daily upload quota tracking
  lib/
    publishApi.js            # NEW - publish webhook helpers
    analyticsApi.js          # NEW - analytics webhook helpers
    formatters.js            # NEW (or extend existing) - shared formatters for duration, currency, dates
workflows/
  WF_YOUTUBE_UPLOAD.json     # NEW - resumable upload + metadata + captions + thumbnail + playlist
  WF_ANALYTICS_CRON.json     # NEW - daily analytics pull + private-to-public transitions
  WF_WEBHOOK_PUBLISH.json    # NEW - publish action webhook endpoints
```

### Pattern 1: Two-Column Sticky Layout (Reuse from ScriptReview)
**What:** Left sticky metadata panel (lg:col-span-4 lg:sticky lg:top-4) + right scrollable content (lg:col-span-8)
**When to use:** Video Review page
**Example:**
```jsx
// Source: existing ScriptReview.jsx pattern (lines 273-332)
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
  {/* Mobile compact bar */}
  <div className="lg:hidden">
    <CompactMetadataBar topic={topic} />
  </div>

  {/* Left: Metadata Panel (sticky, desktop only) */}
  <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
    <MetadataPanel topic={topic} scenes={scenes} ... />
  </div>

  {/* Right: Video + Thumbnail + Captions + Summary */}
  <div className="lg:col-span-8">
    <VideoPlayer driveFileId={topic.drive_video_url} youtubeId={topic.youtube_video_id} />
    <ThumbnailPreview url={topic.thumbnail_url} />
    <CaptionPreview scenes={scenes} />
    <ProductionSummary topic={topic} />
  </div>
</div>
```

### Pattern 2: Inline Edit Toggle
**What:** Display mode shows formatted values; "Edit Metadata" button transforms to editable inputs in-place with Save/Cancel
**When to use:** Video Review metadata panel
**Example:**
```jsx
const [isEditing, setIsEditing] = useState(false);
const [editData, setEditData] = useState({});

// Toggle to edit mode copies current values to local state
const startEdit = () => {
  setEditData({ title: topic.seo_title, description: generated_desc, tags: [...tags] });
  setIsEditing(true);
};

// Save calls webhook, then exits edit mode
const saveEdit = async () => {
  await updateMetadata.mutateAsync({ topic_id: topicId, fields: editData });
  setIsEditing(false);
};
```

### Pattern 3: Recharts with CSS Variables for Dark Mode
**What:** Use Tailwind dark mode classes on wrapper, pass theme-aware colors to Recharts
**When to use:** All analytics charts
**Example:**
```jsx
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Use useTheme() hook (already exists) to get isDark
const chartColors = {
  primary: '#2563EB',
  green: '#10B981',
  amber: '#F59E0B',
  grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  text: isDark ? '#94A3B8' : '#64748B',
};

<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={viewsData}>
    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
    <XAxis dataKey="date" tick={{ fill: chartColors.text, fontSize: 12 }} />
    <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} />
    <Tooltip />
    <Area type="monotone" dataKey="views" stroke={chartColors.primary} fill={chartColors.primary} fillOpacity={0.15} />
  </AreaChart>
</ResponsiveContainer>
```

### Pattern 4: Webhook Mutation with Optimistic Update (Established)
**What:** TanStack useMutation with optimistic UI, webhook call, cache invalidation
**When to use:** All publish actions (approve, reject, publish, schedule)
**Example:**
```jsx
// Source: established pattern from useTopics.js
export function useApproveVideo(topicId, projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic_id, action, schedule_time }) =>
      webhookCall('video/approve', { topic_id, action, schedule_time }),
    onMutate: async ({ topic_id }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      // Optimistic update...
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });
}
```

### Pattern 5: Upload Progress via Supabase Realtime
**What:** Track upload progress in a topics column (e.g., `upload_step` text field), subscribe via Realtime for live updates
**When to use:** After clicking Publish Now, show multi-step progress
**Recommendation:** Add a `publish_progress` text column to topics table (values: 'uploading_video', 'setting_metadata', 'uploading_captions', 'setting_thumbnail', 'assigning_playlist', 'complete', 'failed'). The n8n upload workflow writes to this column after each step. Dashboard subscribes via existing Realtime hook and displays progress steps.

### Anti-Patterns to Avoid
- **Polling for upload progress:** Use Supabase Realtime subscription on topics table, not setInterval polling
- **Embedding Google Drive player without /preview path:** Must use `https://drive.google.com/file/d/{ID}/preview`, not `/view`
- **Using n8n native YouTube node for large files:** Known issues with files >1GB; use HTTP Request node with resumable upload protocol
- **Hardcoding chart colors:** Use theme-aware colors that work in both light and dark mode
- **Building custom date picker:** Use native `<input type="datetime-local">` for schedule; it provides timezone-aware datetime selection

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Charts | Custom SVG/Canvas charts | Recharts (already installed) | Responsive, composable, supports all needed chart types |
| Date/time picker | Custom calendar component | Native `<input type="datetime-local">` | Browser-native, timezone-aware, sufficient for schedule-once use case |
| Video player | Custom HTML5 video player | Google Drive iframe `/preview` / YouTube embed | Handles large files, adaptive streaming, no CORS issues |
| Upload progress | Custom WebSocket | Supabase Realtime on topics table | Already established pattern, no new infrastructure |
| Table sorting | Custom sort logic | Local state sort on pre-fetched data | Small dataset (max 25 topics), no need for server-side sorting |
| Tag input | Custom tag component | Simple chips + text input with Enter key handler | Standard HTML input with array state, no need for heavy tag library |

## Common Pitfalls

### Pitfall 1: YouTube Resumable Upload Memory Issues in n8n
**What goes wrong:** n8n tries to load entire 2-5GB video file into memory, causing OOM on Docker container
**Why it happens:** Default n8n HTTP Request node reads entire file into memory before sending
**How to avoid:** Use the resumable upload protocol via HTTP Request node with streaming. The n8n workflow should: (1) initiate resumable session with POST + metadata, (2) get upload URI from Location header, (3) upload file in chunks using PUT requests with Content-Range headers. For files stored on Google Drive, use Drive API to get direct download URL and pipe to YouTube upload (server-to-server, no local storage needed).
**Warning signs:** n8n container memory spikes during upload, or upload times out

### Pitfall 2: YouTube Analytics API vs Data API Scope Confusion
**What goes wrong:** Analytics API returns 403 because the wrong OAuth scope is used
**Why it happens:** YouTube Data API uses `youtube.upload` and `youtube.force-ssl` scopes, but YouTube Analytics API requires `yt-analytics.readonly` scope
**How to avoid:** The n8n OAuth2 credential for YouTube must include both sets of scopes. Analytics API endpoint is `https://youtubeanalytics.googleapis.com/v2/reports` (NOT the Data API v3 endpoint).
**Warning signs:** 403 "insufficientPermissions" on analytics calls despite working uploads

### Pitfall 3: Google Drive Iframe Embed Blocked by CSP
**What goes wrong:** Google Drive iframe shows blank or "Refused to display" error
**Why it happens:** Content Security Policy headers may block embedding from drive.google.com
**How to avoid:** Ensure Nginx config does not set restrictive frame-src CSP headers. The Drive file must have sharing set to "Anyone with the link can view" for the iframe to work. Use `allow="autoplay; encrypted-media"` on the iframe.
**Warning signs:** Iframe loads but shows Google sign-in page, or blank frame

### Pitfall 4: Recharts ResponsiveContainer Requires Fixed Height Parent
**What goes wrong:** Charts render with 0 height
**Why it happens:** ResponsiveContainer inherits height from parent, which has no explicit height set
**How to avoid:** Always wrap ResponsiveContainer in a div with explicit height (e.g., `h-64` or `h-80`). ResponsiveContainer uses 100% width by default but needs height from parent.
**Warning signs:** Chart container renders but no visible chart content

### Pitfall 5: YouTube Quota Tracking Across Multiple Videos
**What goes wrong:** Upload fails with 403 quota exceeded after 6th video in a day
**Why it happens:** videos.insert costs 1,600 quota units; daily limit is 10,000 units; other API calls also consume quota
**How to avoid:** Track `uploads_today` in a project-level counter or query production_log for today's upload count. Show "X uploads remaining today" in the publish dialog. For batch publish, stop after 6 and queue remaining. Quota resets at midnight Pacific Time (not UTC).
**Warning signs:** 403 quotaExceeded error; note quota resets at midnight PT, not midnight UTC

### Pitfall 6: Chapter Timestamps Must Be in HH:MM:SS Format
**What goes wrong:** YouTube ignores chapter markers in description
**Why it happens:** YouTube requires chapters in specific format: `00:00 Intro\n02:15 Chapter 1\n...`. First chapter must start at 00:00, minimum 10 seconds between chapters, minimum 3 chapters.
**How to avoid:** Convert start_time_ms from scenes to HH:MM:SS format. Ensure first chapter starts at 00:00. Group scenes by chapter field, use first scene's start_time_ms per chapter.
**Warning signs:** YouTube description shows timestamps as plain text, not clickable chapters

## Code Examples

### Google Drive Iframe Embed
```jsx
// Source: Google Drive embed documentation
function VideoPlayer({ driveFileId, youtubeVideoId, isPublished }) {
  if (isPublished && youtubeVideoId) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden glass-card">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeVideoId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden glass-card">
      <iframe
        src={`https://drive.google.com/file/d/${driveFileId}/preview`}
        className="w-full h-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}
```

### Chapter Generation from Scenes
```javascript
// Generate YouTube chapter list from scenes data
function generateChapters(scenes) {
  const chapters = [];
  let currentChapter = null;

  for (const scene of scenes) {
    if (scene.chapter && scene.chapter !== currentChapter) {
      currentChapter = scene.chapter;
      const ms = scene.start_time_ms || 0;
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const timestamp = hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${minutes}:${String(seconds).padStart(2, '0')}`;

      chapters.push({ timestamp, title: currentChapter });
    }
  }

  // Ensure first chapter starts at 0:00
  if (chapters.length > 0 && chapters[0].timestamp !== '0:00') {
    chapters.unshift({ timestamp: '0:00', title: 'Introduction' });
  }

  return chapters;
}
```

### YouTube Resumable Upload (n8n HTTP Request pattern)
```
Step 1: Initiate resumable session
  POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
  Headers:
    Authorization: Bearer {{$credentials.oAuth2Api.accessToken}}
    Content-Type: application/json; charset=UTF-8
    X-Upload-Content-Type: video/*
  Body:
    {
      "snippet": {
        "title": "{{topic.seo_title}}",
        "description": "{{generated_description}}",
        "tags": {{topic.script_metadata.tags}},
        "categoryId": "27"  // Education
      },
      "status": {
        "privacyStatus": "{{privacy_status}}",  // "public" or "private"
        "selfDeclaredMadeForKids": false,
        "publishAt": "{{schedule_time_or_empty}}"
      }
    }
  Response: 200 with Location header containing upload URI

Step 2: Upload video file
  PUT {{upload_uri}}
  Headers:
    Content-Type: video/*
  Body: binary file content (stream from Google Drive)
  Response: 200 with video resource JSON including video ID

Step 3: Upload captions
  POST https://www.googleapis.com/upload/youtube/v3/captions?uploadType=resumable&part=snippet
  Body (metadata): { "snippet": { "videoId": "{{video_id}}", "language": "en", "name": "English" } }
  Then PUT with SRT file content

Step 4: Set thumbnail
  POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={{video_id}}
  Body: thumbnail image binary

Step 5: Add to playlist
  POST https://www.googleapis.com/youtube/v3/playlistItems?part=snippet
  Body: { "snippet": { "playlistId": "{{playlist_id}}", "resourceId": { "kind": "youtube#video", "videoId": "{{video_id}}" } } }
```

### YouTube Analytics API Query (n8n HTTP Request)
```
GET https://youtubeanalytics.googleapis.com/v2/reports
  ?ids=channel==MINE
  &startDate=2026-01-01
  &endDate=2026-03-09
  &metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,subscribersGained,estimatedRevenue,cpm,impressions,annotationClickThroughRate
  &dimensions=video
  &filters=video=={{video_id1}},{{video_id2}},...
  &sort=-views

Headers:
  Authorization: Bearer {{$credentials.oAuth2Api.accessToken}}

Response contains:
  { "rows": [ ["videoId", views, watchMinutes, avgDuration, avgPct, likes, comments, subsGained, revenue, cpm, impressions, ctr], ... ] }
```

### Recharts Donut Chart for Cost Breakdown
```jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COST_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
const COST_LABELS = ['Script', 'TTS', 'Images', 'I2V', 'T2V'];

function CostDonut({ costBreakdown }) {
  const data = COST_LABELS.map((name, i) => ({
    name,
    value: costBreakdown?.[name.toLowerCase()] || 0,
  })).filter(d => d.value > 0);

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Cost Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
              {data.map((_, i) => <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| YouTube Data API v3 simple upload | Resumable upload protocol | Always for large files | Required for 2-5GB files; simple upload has 5MB limit |
| n8n native YouTube node | HTTP Request node for uploads | n8n community finding | Native node has memory issues with large files |
| YouTube Analytics v1 | YouTube Analytics v2 (youtubeanalytics.googleapis.com) | 2024+ | v1 deprecated; v2 uses different endpoint base URL |
| Polling for Realtime updates | Supabase Realtime postgres_changes | Established Phase 1 | Instant updates, no polling interval |

## Open Questions

1. **Server-to-server video transfer (Drive to YouTube)**
   - What we know: Video files are on Google Drive after assembly. YouTube needs the file for upload.
   - What's unclear: Whether n8n can stream from Drive directly to YouTube without downloading to local disk first. If files must download first, the n8n Docker container needs sufficient disk space (5GB+).
   - Recommendation: Use Google Drive API to get a direct download URL, then pass to YouTube resumable upload. If streaming isn't possible, download to /tmp in the n8n container, upload, then delete. Ensure Docker volume has space.

2. **YouTube Analytics API OAuth Scope**
   - What we know: Upload needs `youtube.upload` scope; Analytics needs `yt-analytics.readonly` scope
   - What's unclear: Whether a single n8n OAuth2 credential can hold both scopes
   - Recommendation: Create or update the YouTube OAuth2 credential in n8n to include both scopes. If n8n credential editor limits scope, use a separate credential for analytics.

3. **Upload Progress Granularity**
   - What we know: The 5-step progress (uploading, metadata, captions, thumbnail, playlist) is decided
   - What's unclear: Whether we can show upload percentage for the video file itself (step 1)
   - Recommendation: Use step-level granularity only (not byte-level percentage). The upload step shows a spinner, not a percentage bar. This avoids needing to track chunk-by-chunk progress in Supabase. Store `publish_progress` as a text enum in topics table.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.0 + @testing-library/react 16.1.0 |
| Config file | dashboard/vite.config.js (test block) |
| Quick run command | `cd dashboard && npx vitest run --reporter=verbose` |
| Full suite command | `cd dashboard && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUBL-01 | Video Review page renders with embedded player | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx -x` | No - Wave 0 |
| PUBL-02 | Metadata panel displays title, description, tags, chapters | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx -x` | No - Wave 0 |
| PUBL-03 | Thumbnail preview renders with correct image | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx -x` | No - Wave 0 |
| PUBL-04 | Gate 3 approve dialog shows three options | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx -x` | No - Wave 0 |
| PUBL-05 | Inline metadata edit mode toggles correctly | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx -x` | No - Wave 0 |
| PUBL-06 | publishApi helpers call correct webhook endpoints | unit | `cd dashboard && npx vitest run src/__tests__/publishApi.test.js -x` | No - Wave 0 |
| PUBL-07 | Quota display shows remaining uploads | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx -x` | No - Wave 0 |
| ANLY-01 | Analytics cron workflow | manual-only | n8n workflow test execution | N/A |
| ANLY-02 | Analytics data written to topics | manual-only | Verify Supabase rows after cron run | N/A |
| ANLY-03 | Analytics page renders charts with data | unit | `cd dashboard && npx vitest run src/__tests__/Analytics.test.jsx -x` | No - Wave 0 |
| ANLY-04 | Cost tracking displays on dashboard | unit | `cd dashboard && npx vitest run src/__tests__/Analytics.test.jsx -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd dashboard && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd dashboard && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/src/__tests__/VideoReview.test.jsx` -- covers PUBL-01 through PUBL-05, PUBL-07
- [ ] `dashboard/src/__tests__/publishApi.test.js` -- covers PUBL-06 (webhook endpoint calls)
- [ ] `dashboard/src/__tests__/Analytics.test.jsx` -- covers ANLY-03, ANLY-04 (chart rendering, table sorting, metric aggregation)
- [ ] `dashboard/src/__tests__/useQuotaStatus.test.js` -- covers PUBL-07 (quota tracking logic)

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: ScriptReview.jsx (two-column layout pattern), useTopics.js (mutation pattern), api.js (webhook pattern), PipelineTable.jsx (status badges), useRealtimeSubscription.js (Realtime pattern), ConfirmDialog.jsx (dialog pattern)
- [YouTube Data API videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert) - Upload endpoint, quota costs
- [YouTube Resumable Upload Protocol](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol) - Chunked upload steps
- [YouTube Analytics API reports.query](https://developers.google.com/youtube/analytics/reference/reports/query) - Per-video metrics retrieval
- [YouTube Analytics Metrics](https://developers.google.com/youtube/analytics/metrics) - Available metric names

### Secondary (MEDIUM confidence)
- [n8n Community: Large file YouTube Upload](https://community.n8n.io/t/large-file-youtube-upload/65854) - HTTP Request node recommended over native YouTube node for large files
- [Google Drive iframe embed](http://sangsoonam.github.io/2019/07/27/how-to-embed-a-google-drive-video.html) - /preview URL path requirement
- [Recharts documentation](https://recharts.github.io/en-US/api/) - Chart component APIs

### Tertiary (LOW confidence)
- YouTube quota reset timing (midnight Pacific Time) -- commonly referenced but not verified against official docs for 2026

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use; no new dependencies
- Architecture: HIGH - reuses established patterns from Phases 3-4 (two-column layout, mutations, Realtime)
- YouTube Upload: MEDIUM - resumable upload is well-documented but n8n streaming from Drive to YouTube is unverified
- YouTube Analytics: MEDIUM - API documented but OAuth scope combination with upload credential needs validation
- Recharts charts: HIGH - standard library usage, well-documented API
- Pitfalls: HIGH - identified from community reports and API documentation

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack, YouTube API changes are infrequent)
