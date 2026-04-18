# Vision GridAI — Channel Analyzer Feature

## Claude Code Prompt

Paste this into Claude Code to build the feature:

---

```
Read /mnt/skills/public/frontend-design/SKILL.md before creating any React component.
Use Superpowers /new-feature flow. Use gstack /careful for Supabase migrations. Use gstack /qa after each deliverable.
Model for all Claude API calls: claude-opus-4-6

---

## CONTEXT — What You Are Building

You are building a **Channel Analyzer** — a standalone tool that lets the user paste any YouTube channel URL, run a deep analysis of that channel, and optionally create a new Vision GridAI project from the research. Users can analyze multiple channels, compare their combined landscape, identify blue-ocean gaps, and then launch a project with all that intelligence pre-loaded into the downstream pipeline.

### How It Relates to Existing Features

- **Does NOT replace** WF_NICHE_RESEARCH. The existing niche research takes a niche description and does broad web research. Channel Analyzer takes a specific channel URL and does deep channel-level analysis.
- When a project IS created from channel analysis, WF_NICHE_RESEARCH still runs ON TOP of the channel data to enrich it further.
- Users can still create projects without any channel analysis (current flow unchanged).
- Channel analysis is an OPTIONAL upstream input — a foundation that niche research enriches.

### Downstream Data Flow (Critical)

When the user clicks "Create Project from This Research", all analysis data flows downstream:

1. **Competitor Channels (CF04):** All analyzed channels auto-added to `tracked_channels` for the new project.
2. **Topic Generation (WF_TOPIC_GENERATE):** Blue-ocean gaps and underserved topics injected into the topic generation prompt as "high-opportunity topics to explore" and "topics to AVOID (already saturated by competitors)."
3. **CTR Title Optimization (CF05):** Competitor title patterns (structural formulas) fed into the title variant generation prompt.
4. **Style DNA (CF14):** Thumbnail visual analysis results stored in `style_profiles` and available for reference during thumbnail generation.
5. **Outlier Scoring (CF01):** Top-performing video data pre-populates outlier context for the niche.
6. **Script Generation:** Transcript depth analysis informs script quality targets (average word count, vocabulary level, explanation depth of top performers).

---

## DELIVERABLE 1: Supabase Schema

File: supabase/migrations/010_channel_analyzer.sql

```sql
-- Channel Analysis (standalone, not project-specific until linked)
CREATE TABLE channel_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Channel identity
  youtube_channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_description TEXT,
  channel_avatar_url TEXT,
  channel_banner_url TEXT,
  country TEXT,
  custom_url TEXT, -- @handle
  
  -- Channel metrics (snapshot at analysis time)
  subscriber_count INTEGER,
  total_view_count BIGINT,
  video_count INTEGER,
  channel_created_at TIMESTAMPTZ,
  
  -- Calculated metrics
  avg_views_per_video INTEGER,
  median_views_per_video INTEGER,
  upload_frequency_days NUMERIC(5,1), -- average days between uploads
  avg_video_duration_seconds INTEGER,
  estimated_monthly_views BIGINT,
  growth_trajectory TEXT CHECK (growth_trajectory IN ('accelerating', 'stable', 'decelerating', 'dormant')),
  
  -- Content analysis (Claude Opus 4.6 outputs)
  primary_topics TEXT[], -- top 5-10 topic clusters identified
  content_style TEXT, -- 'educational', 'entertainment', 'news', 'documentary', 'tutorial', etc.
  target_audience_description TEXT, -- Claude's assessment of who watches this channel
  title_patterns JSONB, -- structural formulas extracted from titles
  thumbnail_patterns JSONB, -- visual patterns extracted from thumbnails
  scripting_depth JSONB, -- { avg_word_count, vocabulary_level, explanation_style }
  posting_schedule TEXT, -- "3x/week, typically Mon/Wed/Fri" etc.
  
  -- Top videos
  top_videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array of: { video_id, title, views, likes, comments, published_at, 
  --             duration_seconds, tags[], description_snippet, thumbnail_url,
  --             outlier_score, transcript_summary }
  
  -- Blue-ocean analysis (Claude Opus 4.6)
  strengths TEXT[], -- what this channel does well
  weaknesses TEXT[], -- gaps, blind spots, underserved angles
  blue_ocean_opportunities JSONB, -- [{ topic, reasoning, estimated_demand, saturation_level }]
  content_saturation_map JSONB, -- { topic_cluster: 'saturated'|'moderate'|'underserved' }
  
  -- Verdict
  verdict TEXT CHECK (verdict IN ('strong_opportunity', 'moderate_opportunity', 'weak_opportunity', 'avoid')),
  verdict_reasoning TEXT, -- 2-3 sentence explanation
  verdict_score INTEGER CHECK (verdict_score BETWEEN 0 AND 100),
  
  -- Linking
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- set when project created
  analysis_group_id UUID, -- groups multiple analyses done together (for multi-channel comparison)
  
  -- Metadata
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analysis_duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'analyzing', 'completed', 'failed'))
);

CREATE INDEX idx_channel_analyses_status ON channel_analyses(status);
CREATE INDEX idx_channel_analyses_group ON channel_analyses(analysis_group_id);
CREATE INDEX idx_channel_analyses_project ON channel_analyses(project_id);

-- Multi-channel comparison results
CREATE TABLE channel_comparison_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_group_id UUID NOT NULL,
  
  -- Compared channel IDs
  channel_analysis_ids UUID[] NOT NULL,
  
  -- Combined analysis (Claude Opus 4.6)
  combined_topic_landscape JSONB, -- merged topic map across all channels
  combined_blue_ocean_gaps JSONB, -- gaps that NO analyzed channel covers
  combined_saturation_map JSONB, -- per-topic saturation across all channels
  differentiation_strategy TEXT, -- Claude's recommended unique angle
  recommended_niche_description TEXT, -- suggested niche description for project creation
  recommended_content_pillars TEXT[], -- 3-5 content pillars
  
  -- Verdict
  overall_verdict TEXT CHECK (overall_verdict IN ('strong_opportunity', 'moderate_opportunity', 'weak_opportunity', 'avoid')),
  overall_verdict_reasoning TEXT,
  overall_verdict_score INTEGER CHECK (overall_verdict_score BETWEEN 0 AND 100),
  
  -- Project link
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## DELIVERABLE 2: n8n Workflow — WF_CHANNEL_ANALYZE

Trigger: POST /webhook/channel-analyze with { channel_url, analysis_group_id? }

### Steps

**Step 1: Resolve channel URL → channel ID**

YouTube channel URLs come in multiple formats:
- `youtube.com/channel/UCxxxxxx` → channel ID directly
- `youtube.com/@handle` → need to resolve via YouTube API
- `youtube.com/c/ChannelName` → need to resolve via YouTube API

Use YouTube Data API: `channels.list?forHandle=@handle` or `search.list?q=channel_name&type=channel`

**Step 2: Fetch channel metadata**

```
GET youtube.com/youtube/v3/channels
  ?part=snippet,statistics,contentDetails,brandingSettings
  &id={{channel_id}}
```

Extract: subscriber_count, total_view_count, video_count, description, avatar, banner, country, custom_url, created_at.

**Step 3: Fetch last 50 videos**

```
GET youtube.com/youtube/v3/playlistItems
  ?part=snippet,contentDetails
  &playlistId={{uploads_playlist_id}}
  &maxResults=50
```

Then for all 50 video IDs:
```
GET youtube.com/youtube/v3/videos
  ?part=statistics,snippet,contentDetails
  &id={{comma_separated_ids}}
```

Extract per video: title, views, likes, comments, duration, published_at, tags, description, thumbnail_url.

**Step 4: Rank top 20 videos by views**

Sort all 50 by view_count descending. Take top 20.
Calculate outlier_score for each: video_views / median_views_of_all_50.

**Step 5: Fetch transcripts for top 10 videos**

For each of the top 10 videos by views:
```
GET youtube.com/youtube/v3/captions
  ?part=snippet
  &videoId={{video_id}}
```

If auto-generated captions exist, fetch the transcript text. If not available, skip and note "transcript unavailable."

Store transcript_summary (Claude summarizes each transcript to ~200 words in next step).

**Step 6: Calculate channel metrics**

- avg_views_per_video = mean(views of all 50)
- median_views_per_video = median(views of all 50)
- upload_frequency_days = average gap between publish dates
- avg_video_duration_seconds = mean(duration of all 50)
- estimated_monthly_views = avg_views_per_video × (30 / upload_frequency_days)
- growth_trajectory: compare avg views of last 10 videos vs previous 10. If ratio > 1.3 = accelerating, 0.7-1.3 = stable, < 0.7 = decelerating. If last upload > 60 days ago = dormant.

**Step 7: Claude Opus 4.6 deep analysis (the core)**

System prompt:
```
You are an elite YouTube channel strategist and competitive intelligence analyst. You analyze channels with the precision of a hedge fund analyst evaluating a company — looking for structural advantages, hidden weaknesses, market gaps, and untapped opportunities.

You produce actionable intelligence, not generic observations. Every insight must be specific enough to inform video topic selection, title writing, and content strategy for a NEW channel entering this space.

You think in terms of blue-ocean strategy: where can a new entrant create content that this channel is NOT making, that the audience clearly wants (evidenced by high-performing outlier topics or comment patterns)?
```

User prompt:
```
DEEP CHANNEL ANALYSIS

CHANNEL: {{channel_name}} ({{subscriber_count}} subscribers)
URL: {{channel_url}}
DESCRIPTION: "{{channel_description}}"
COUNTRY: {{country}}
CREATED: {{channel_created_at}}
TOTAL VIEWS: {{total_view_count}}
VIDEO COUNT: {{video_count}}
UPLOAD FREQUENCY: every {{upload_frequency_days}} days
GROWTH: {{growth_trajectory}}

TOP 20 VIDEOS (by views):
{{#each top_videos}}
{{@index+1}}. "{{this.title}}" | {{this.views}} views | {{this.likes}} likes | {{this.comments}} comments | {{this.duration_seconds}}s | Published: {{this.published_at}} | Outlier: {{this.outlier_score}}x
   Tags: {{this.tags}}
   Description: "{{this.description_snippet}}"
{{/each}}

TRANSCRIPTS OF TOP 10 VIDEOS:
{{#each top_transcripts}}
Video: "{{this.title}}"
Transcript (excerpt, first 1000 words):
{{this.transcript_text}}
---
{{/each}}

ALL 50 VIDEO TITLES (for pattern analysis):
{{#each all_titles}}
{{@index+1}}. "{{this.title}}" ({{this.views}} views)
{{/each}}

ANALYZE THIS CHANNEL AND RESPOND IN JSON:

{
  "primary_topics": ["topic1", "topic2", ...], // 5-10 topic clusters
  "content_style": "<educational|entertainment|news|documentary|tutorial|listicle|review|hybrid>",
  "target_audience_description": "<2 sentences describing who watches this>",
  
  "title_patterns": {
    "dominant_formulas": [
      { "pattern": "[Number] + [Noun] + [Curiosity Gap]", "frequency": "40%", "avg_performance": "above_average" },
      ...
    ],
    "avg_title_length": <number>,
    "common_power_words": ["word1", "word2", ...],
    "common_opening_words": ["Why", "How", "The", ...]
  },
  
  "thumbnail_patterns": {
    "dominant_style": "<text-heavy|face-focused|object-focused|minimal|collage>",
    "text_usage": "<always|sometimes|never>",
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "face_presence": "<always|sometimes|never>",
    "visual_formula": "<1 sentence describing the repeating visual pattern>"
  },
  
  "scripting_depth": {
    "avg_word_count_estimate": <from transcript lengths>,
    "vocabulary_level": "<basic|intermediate|advanced|technical>",
    "explanation_style": "<surface-level|moderate-depth|deep-dive|expert-level>",
    "narrative_structure": "<listicle|problem-solution|story-arc|tutorial-steps|investigation>",
    "hook_style": "<question|statistic|controversy|story|direct-statement>"
  },
  
  "posting_schedule": "<e.g., '2x/week, typically Tue/Thu'>",
  
  "strengths": [
    "<specific strength 1 with evidence>",
    "<specific strength 2>",
    ...
  ],
  
  "weaknesses": [
    "<specific weakness/gap 1 with evidence>",
    "<specific weakness/gap 2>",
    ...
  ],
  
  "blue_ocean_opportunities": [
    {
      "topic": "<specific underserved topic>",
      "reasoning": "<why this is an opportunity — what evidence from the data supports it>",
      "estimated_demand": "<high|medium|low>",
      "saturation_level": "<unsaturated|low|moderate|saturated>",
      "suggested_angle": "<how a new channel should approach this differently>"
    },
    ... // at least 5 opportunities
  ],
  
  "content_saturation_map": {
    "<topic_cluster>": "<saturated|moderate|underserved>",
    ...
  },
  
  "verdict": "<strong_opportunity|moderate_opportunity|weak_opportunity|avoid>",
  "verdict_score": <0-100>,
  "verdict_reasoning": "<2-3 sentences explaining the verdict>"
}
```

**Step 8: Thumbnail visual analysis**

For the top 10 thumbnails, use Claude Opus 4.6 with vision:

```
[IMAGE: thumbnail_1] [IMAGE: thumbnail_2] ... [IMAGE: thumbnail_10]

Analyze these 10 thumbnails from the YouTube channel "{{channel_name}}". 
Extract the visual DNA — the repeating patterns that define this channel's thumbnail style.

Respond in JSON:
{
  "dominant_style": "<text-heavy|face-focused|object-focused|minimal|collage>",
  "text_usage": "<always|sometimes|never>",
  "text_position": "<top|bottom|center|left|right>",
  "text_style": "<bold-caps|handwritten|clean-sans|outlined>",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "background_style": "<gradient|solid|photo|blur|split>",
  "face_presence": "<always|sometimes|never>",
  "face_emotion": "<excited|serious|shocked|neutral>",
  "recurring_elements": ["<element1>", "<element2>", ...],
  "visual_formula": "<1 sentence describing what every thumbnail has in common>",
  "what_makes_it_click": "<1 sentence on the psychological trigger>"
}
```

**Step 9: Write results**

UPDATE channel_analyses with all Claude outputs. SET status = 'completed'.

**Step 10: If analysis_group_id provided and this is not the first analysis in the group:**

Check if other completed analyses exist for this group. If 2+ are completed, auto-trigger WF_CHANNEL_COMPARE.

---

## DELIVERABLE 3: n8n Workflow — WF_CHANNEL_COMPARE

Trigger: POST /webhook/channel-compare with { analysis_group_id }
Runs when 2+ channel analyses in the same group are completed.

### Steps

1. **Fetch all completed analyses in the group:**
   - Query channel_analyses WHERE analysis_group_id AND status = 'completed'

2. **Claude Opus 4.6 comparison:**

```
MULTI-CHANNEL COMPETITIVE LANDSCAPE ANALYSIS

You are analyzing {{count}} YouTube channels to find the combined blue-ocean opportunity for a NEW channel entering this space.

{{#each analyses}}
CHANNEL {{@index+1}}: {{this.channel_name}} ({{this.subscriber_count}} subs)
- Topics: {{this.primary_topics}}
- Strengths: {{this.strengths}}
- Weaknesses: {{this.weaknesses}}
- Blue-ocean gaps (per channel): {{this.blue_ocean_opportunities}}
- Saturation map: {{this.content_saturation_map}}
{{/each}}

ANALYZE THE COMBINED LANDSCAPE:

1. What topics are ALL channels covering? (saturated — avoid these)
2. What topics does ONLY ONE channel cover? (moderate — can compete with differentiation)
3. What topics does NO channel cover well? (blue ocean — highest opportunity)
4. What STYLE/FORMAT gap exists? (e.g., all do listicles, nobody does deep investigations)
5. What AUDIENCE SEGMENT is underserved? (e.g., all target beginners, nobody serves intermediates)

RESPOND IN JSON:
{
  "combined_topic_landscape": {
    "<topic>": { "covered_by": ["channel1", ...], "saturation": "saturated|moderate|underserved" },
    ...
  },
  "combined_blue_ocean_gaps": [
    {
      "topic": "<specific topic NO ONE covers>",
      "reasoning": "<evidence from all channels>",
      "estimated_demand": "<high|medium|low>",
      "suggested_angle": "<how to approach this>"
    },
    ... // at least 5
  ],
  "combined_saturation_map": { ... },
  "differentiation_strategy": "<2-3 sentences: how should a new channel differentiate itself from ALL these competitors?>",
  "recommended_niche_description": "<suggested niche description to use when creating a project>",
  "recommended_content_pillars": ["<pillar1>", "<pillar2>", "<pillar3>", "<pillar4>", "<pillar5>"],
  "overall_verdict": "<strong_opportunity|moderate_opportunity|weak_opportunity|avoid>",
  "overall_verdict_score": <0-100>,
  "overall_verdict_reasoning": "<2-3 sentences>"
}
```

3. **Write results:**
   - INSERT into channel_comparison_reports

---

## DELIVERABLE 4: n8n Workflow — WF_CREATE_PROJECT_FROM_ANALYSIS

Trigger: POST /webhook/project/create-from-analysis with { analysis_group_id, niche_name?, niche_description? }

### Steps

1. **Fetch analysis data:**
   - Query channel_analyses WHERE analysis_group_id AND status = 'completed'
   - Query channel_comparison_reports WHERE analysis_group_id (if exists)

2. **Create project:**
   - INSERT into projects with niche_name and niche_description
   - If user provided custom niche_name/description → use those
   - If not → use recommended_niche_description from comparison report
   - Store analysis_group_id on the project for reference

3. **Seed competitor channels:**
   - For each analyzed channel: INSERT into tracked_channels with project_id, channel data, folder = 'Analyzed Competitors'

4. **Seed Style DNA:**
   - For each analyzed channel: INSERT into style_profiles with thumbnail_patterns and title_patterns

5. **Prepare topic generation context:**
   - Store the combined blue-ocean gaps, content pillars, and differentiation strategy as a JSONB field on the project: `projects.channel_analysis_context`
   - This field is injected into WF_TOPIC_GENERATE prompt (see Deliverable 6)

6. **Prepare script generation context:**
   - Store scripting_depth analysis (avg word count, vocabulary level, explanation style, narrative structure) as `projects.script_reference_data`
   - This field is injected into WF_SCRIPT_GENERATE Pass 1 prompt (see Deliverable 6)

7. **Trigger WF_NICHE_RESEARCH:**
   - Fire the normal niche research workflow ON TOP of the channel analysis
   - WF_NICHE_RESEARCH enriches with broad web search, pain points, etc.
   - The niche research prompt now INCLUDES the channel analysis context so it builds on it rather than starting from scratch

8. **Update channel_analyses:**
   - SET project_id on all analyses in the group
   - SET project_id on comparison report

---

## DELIVERABLE 5: Dashboard — Channel Analyzer Page

Location: Main sidebar (NOT inside a project). Accessible without a project existing.
Route: /channel-analyzer
Sidebar entry: icon = Search + BarChart (or Telescope from lucide-react), label = "Channel Analyzer"

### Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔬 Channel Analyzer                                                        │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Paste a YouTube channel URL:                                           │ │
│ │ [ https://youtube.com/@ChannelName                          ] [Analyze]│ │
│ │                                                                         │ │
│ │ Analysis group: [New Analysis ▼] (or select existing group)            │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ── Analyzed Channels (3) ──────────────────────────────────────────────── │
│                                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│ │ [Avatar]        │ │ [Avatar]        │ │ [Avatar]        │               │
│ │ CreditShifu    │ │ PromoGuy       │ │ CardMath (ours) │               │
│ │ 245K subs      │ │ 89K subs       │ │ 0 subs         │               │
│ │ 📊 Stable      │ │ 🚀 Accelerating │ │ — N/A —        │               │
│ │ Verdict: 🟢 72 │ │ Verdict: 🟡 58 │ │                 │               │
│ │ [View Details]  │ │ [View Details]  │ │ [+ Analyze]    │               │
│ │ [Remove]        │ │ [Remove]        │ │                 │               │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                                                                             │
│ ── Combined Intelligence ──────────────────────────────────────────────── │
│ (appears when 2+ channels analyzed)                                        │
│                                                                             │
│ Overall Verdict: 🟢 STRONG OPPORTUNITY (78/100)                            │
│ "The credit card niche has saturated coverage of annual fee comparisons    │
│  and basic rewards explainers, but deep mathematical ROI analysis,         │
│  category spending optimization, and issuer business model exposés are     │
│  wide open. A data-first investigative approach would differentiate."      │
│                                                                             │
│ Blue-Ocean Gaps:                                                            │
│ • Mathematical ROI per spending category (demand: HIGH, saturation: LOW)   │
│ • Credit card issuer profit model exposés (demand: MED, saturation: NONE) │
│ • Churning strategy deep-dives with real math (demand: HIGH, sat: LOW)    │
│ • Business credit vs personal credit arbitrage (demand: MED, sat: LOW)    │
│ • International card comparison for travelers (demand: HIGH, sat: MOD)    │
│                                                                             │
│ Recommended Content Pillars:                                                │
│ [DATA-DRIVEN ROI] [INDUSTRY EXPOSÉS] [REWARDS STRATEGY]                   │
│ [SPENDING OPTIMIZATION] [ISSUER DEEP DIVES]                                │
│                                                                             │
│ [🚀 Create Project from This Research]                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Channel Detail View (on "View Details" click)

Expands to full-page or modal with tabs:

**Tab 1: Overview**
- Channel banner + avatar + stats (subs, views, videos, upload frequency, growth)
- Content style badge + target audience description
- Posting schedule
- Verdict card with score and reasoning

**Tab 2: Top Videos (20)**
- Table: Rank | Thumbnail | Title | Views | Outlier Score | Published | Duration
- Click any row → shows video description, tags, and transcript summary
- Highlight outlier videos (5x+) with flame badge

**Tab 3: Content Analysis**
- Topic clusters as a tag cloud or category cards with saturation indicators
- Content saturation map (visual: green = underserved, yellow = moderate, red = saturated)

**Tab 4: Title & Thumbnail DNA**
- Title patterns: list of structural formulas with frequency and performance
- Common opening words, power words, avg title length
- Thumbnail grid: top 10 thumbnails displayed with visual DNA summary
- Color palette swatches extracted from thumbnails

**Tab 5: Blue-Ocean Opportunities**
- Cards for each opportunity with: topic, demand level, saturation level, suggested angle
- Each card has a "Use in Topic Generation" action

**Tab 6: Scripting Depth**
- Avg word count, vocabulary level, explanation style, narrative structure, hook style
- Comparison bar: "Their scripts average ~5,200 words. For our 3-pass system targeting 18K words, this means we go 3.5x deeper."

### "Create Project" Flow

When user clicks "Create Project from This Research":

1. Modal appears:
   - Pre-filled niche name (from recommended_niche_description or editable)
   - Pre-filled niche description (editable)
   - Checkboxes: which analyzed channels to include as competitors (all checked by default)
   - "Include blue-ocean gaps in topic generation" toggle (on by default)
   - "Include style DNA for thumbnails" toggle (on by default)
   - "Include scripting depth targets" toggle (on by default)

2. On confirm: fires WF_CREATE_PROJECT_FROM_ANALYSIS
3. Redirects to the new project dashboard after niche research completes

---

## DELIVERABLE 6: Downstream Prompt Injection

### Topic Generation (WF_TOPIC_GENERATE) — Modify existing prompt

Add a conditional block at the TOP of the topic generation prompt when `projects.channel_analysis_context` exists:

```
{{#if channel_analysis_context}}
COMPETITIVE INTELLIGENCE (from Channel Analyzer):

Blue-ocean opportunities identified across {{analyzed_channel_count}} competitors:
{{#each blue_ocean_opportunities}}
- {{this.topic}} (demand: {{this.estimated_demand}}, saturation: {{this.saturation_level}})
  Suggested angle: {{this.suggested_angle}}
{{/each}}

SATURATED TOPICS TO AVOID (competitors already dominate these):
{{#each saturated_topics}}
- {{this.topic}} (covered by: {{this.covered_by}})
{{/each}}

Differentiation strategy: {{differentiation_strategy}}
Content pillars: {{content_pillars}}

IMPORTANT: At least 40% of the 25 generated topics MUST target the blue-ocean opportunities above.
The remaining 60% can explore related angles, but NONE should be on saturated topics.
{{/if}}
```

### Script Generation (WF_SCRIPT_GENERATE Pass 1) — Modify existing prompt

Add a conditional block when `projects.script_reference_data` exists:

```
{{#if script_reference_data}}
COMPETITIVE SCRIPTING BENCHMARK:
- Top competitors average {{script_reference_data.avg_word_count_estimate}} words per video
- Their vocabulary level: {{script_reference_data.vocabulary_level}}
- Their explanation style: {{script_reference_data.explanation_style}}
- Their narrative structure: {{script_reference_data.narrative_structure}}
- Their hook style: {{script_reference_data.hook_style}}

YOUR TARGET: Our 3-pass system produces 18-20K word scripts. We go significantly deeper
than competitors. Use this as an advantage — cover angles they skip, provide data they omit,
explain mechanisms they oversimplify. Reference the depth gap as a content differentiator.
{{/if}}
```

### Thumbnail Generation — Reference style_profiles

When generating thumbnails for a project that has Style DNA from channel analysis, include the competitor thumbnail patterns as NEGATIVE references (what NOT to copy) and the blue-ocean visual gaps as POSITIVE direction.

---

## DELIVERABLE 7: API Quota Management

YouTube API quota impact for channel analysis:

| API Call | Quota Cost | Per Analysis |
|----------|-----------|-------------|
| channels.list | 1 unit | 1 call |
| playlistItems.list | 1 unit | 1 call |
| videos.list (50 videos) | 1 unit | 1 call |
| captions.list (10 videos) | 50 units | 10 calls |
| Total per channel analysis | ~53 units | |

At 10,000 units/day quota: can analyze ~188 channels/day. In practice, 3-5 analyses per session is typical.

Add to the n8n workflow:
- Before each API call: check remaining daily quota
- If quota < 200: pause and display "YouTube API quota low. Try again tomorrow." in dashboard
- Never let channel analysis consume more than 500 units in a single session

---

## VERIFICATION CHECKLIST (gstack /qa)

After building, verify:
- [ ] Pasting a YouTube channel URL (any format: /channel/, /@handle, /c/) resolves correctly
- [ ] Channel stats display accurately (subscriber count, views, video count)
- [ ] Top 20 videos are correctly ranked by view count with outlier scores
- [ ] Transcripts are fetched for top 10 videos (or gracefully skipped if unavailable)
- [ ] Claude analysis produces valid JSON with all required fields
- [ ] Thumbnail visual analysis runs on top 10 thumbnails
- [ ] Multiple channels can be analyzed in the same group
- [ ] Combined comparison report generates when 2+ channels are in a group
- [ ] "Create Project" flow seeds: competitor_channels, style_profiles, topic context, script context
- [ ] WF_NICHE_RESEARCH fires AFTER project creation and builds ON TOP of channel data
- [ ] Topic generation prompt includes blue-ocean gaps when channel analysis exists
- [ ] Script generation prompt includes scripting depth benchmark when available
- [ ] Channel Analyzer page is accessible from main sidebar (not inside a project)
- [ ] Analysis status shows progress (pending → analyzing → completed)
- [ ] Failed analyses show error message and allow retry
- [ ] All Claude API calls use model: claude-opus-4-6
- [ ] No hardcoded API keys — use n8n credential store
- [ ] YouTube API quota tracking prevents overuse
```

---
