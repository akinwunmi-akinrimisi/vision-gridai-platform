# prompts/ab_test_variants.md
> STATUS: NEW PROMPT
> Used by: WF_AB_TEST_CREATE + WF_AB_TEST_ANALYZE
> Model: Claude Opus 4.6 (claude-opus-4-6)

---

## System Prompt

You are a YouTube CTR optimization specialist who designs A/B tests for titles and thumbnails. You understand statistical testing — you know that meaningful results require sufficient impressions (minimum 1,000 per variant) and that CTR differences below 0.5% are noise, not signal.

You generate VARIANTS, not guesses. Every variant you produce is structurally different from the control — different word order, different hook type, different emotional trigger. Variants that are trivially similar ("Is X worth it?" vs "Is X worth it in 2026?") are useless tests.

You score each variant honestly. A predicted CTR improvement of "+2%" means you genuinely believe this variant will outperform the control by 2 percentage points. You do not inflate predictions.

---

## User Prompt Template — Title Variant Generation

```
A/B TEST — TITLE VARIANT GENERATION

CURRENT TITLE (CONTROL):
"{{current_title}}"

VIDEO CONTEXT:
- Niche: {{niche_context}}
- Primary keyword: {{primary_keyword}}
- Video topic: {{topic_summary}}
- Current CTR: {{current_ctr}}% (from YouTube Analytics, or "unknown" if newly published)
- Channel average CTR: {{channel_avg_ctr}}%

COMPETITOR TITLES ON SAME TOPIC (for pattern reference):
{{#each competitor_titles}}
- "{{this.title}}" | Views: {{this.views}} | CTR: {{this.estimated_ctr}}%
{{/each}}

GENERATE exactly 3 title variants. Each variant MUST:
1. Be structurally different from the control (different opening word, different formula)
2. Contain the primary keyword (or a close semantic variant)
3. Be under 70 characters
4. Use a distinct psychological lever:
   - Variant A: Curiosity gap (open an unanswered question)
   - Variant B: Specificity + proof (use concrete numbers or data)
   - Variant C: Contrarian/unexpected angle (challenge assumptions)

For each variant, provide:
- title: the full title text
- formula: which structural formula it uses (e.g., "[Number] + [Noun] + [Curiosity Gap]")
- predicted_ctr_delta: estimated CTR change vs control (e.g., "+1.5%")
- reasoning: 1 sentence explaining why this should outperform
- risk: what could make this variant WORSE (1 sentence)

RESPOND IN JSON:
{
  "control": {
    "title": "{{current_title}}",
    "formula": "<identify the formula of the current title>",
    "estimated_ctr_baseline": <number>
  },
  "variants": [
    {
      "variant_id": "A",
      "title": "<title text>",
      "formula": "<formula used>",
      "predicted_ctr_delta": <number>,
      "reasoning": "<why this works>",
      "risk": "<what could go wrong>"
    },
    { ... },
    { ... }
  ],
  "recommended_test_order": ["A", "B", "C"],
  "minimum_impressions_per_variant": 1500,
  "estimated_test_duration_hours": <number based on channel size>
}
```

---

## User Prompt Template — Thumbnail Variant Brief

```
A/B TEST — THUMBNAIL VARIANT BRIEF

CURRENT THUMBNAIL: [IMAGE ATTACHED]
VIDEO TITLE: "{{selected_title}}"
NICHE: {{niche_context}}

Analyze the current thumbnail and generate 3 variant BRIEFS (not images — these briefs feed into the image generation pipeline).

Each brief must describe a structurally different thumbnail concept:
- Variant A: Different dominant color scheme
- Variant B: Different composition / layout
- Variant C: Different emotional expression or visual metaphor

For each variant:
- concept: 2-sentence description of the thumbnail
- image_prompt: Full Fal.ai Seedream 4.0 prompt to generate this thumbnail
- text_overlay: What text (if any) should be overlaid, with font/color/position
- predicted_ctr_delta: estimated CTR change vs control
- reasoning: why this visual approach should perform better

RESPOND IN JSON.
```

---

## User Prompt Template — Test Result Analysis

```
A/B TEST RESULTS ANALYSIS

TEST ID: {{test_id}}
VIDEO: "{{video_title}}"
TEST TYPE: {{test_type}} (title / thumbnail / both)
TEST DURATION: {{duration_hours}} hours

RESULTS:
{{#each variants}}
Variant {{this.variant_id}} ({{this.label}}):
- Title/Thumbnail: "{{this.value}}"
- Impressions: {{this.impressions}}
- Clicks: {{this.clicks}}
- CTR: {{this.ctr}}%
- Watch time per impression: {{this.watch_time_per_impression}}
{{/each}}

ANALYZE:
1. Is the sample size sufficient for statistical significance? (minimum 1,000 impressions per variant)
2. Which variant won? By how much?
3. Is the CTR difference statistically significant (p < 0.05)?
4. Did the winning variant also improve watch time per impression (not just clicks)?
5. What lesson should be applied to future titles/thumbnails?

RESPOND IN JSON:
{
  "winner": "<variant_id or 'control' or 'inconclusive'>",
  "statistical_significance": <true/false>,
  "confidence_level": <percentage>,
  "ctr_improvement": <percentage points>,
  "watch_time_impact": "<positive/neutral/negative>",
  "lesson": "<1-2 sentence takeaway for future content>",
  "recommendation": "<apply winner / extend test / retest with new variants>"
}
```

---

# Supabase Schema: ab_tests

```sql
-- A/B Testing System
-- Migration: supabase/migrations/007_ab_testing.sql

CREATE TYPE ab_test_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE ab_test_type AS ENUM ('title', 'thumbnail', 'both');

CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Test configuration
  test_type ab_test_type NOT NULL,
  status ab_test_status NOT NULL DEFAULT 'draft',
  rotation_hours INTEGER NOT NULL DEFAULT 24, -- hours per variant before rotation
  min_impressions_per_variant INTEGER NOT NULL DEFAULT 1500,
  
  -- Control (original)
  control_title TEXT,
  control_thumbnail_url TEXT,
  
  -- Variants (JSONB array of variant objects)
  -- Each: { variant_id, title, thumbnail_url, image_prompt, formula, predicted_ctr_delta, reasoning, risk }
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Current state
  current_variant_index INTEGER NOT NULL DEFAULT 0, -- 0 = control, 1-3 = variants
  current_variant_started_at TIMESTAMPTZ,
  rotations_completed INTEGER NOT NULL DEFAULT 0,
  
  -- Results per variant (JSONB array, updated by WF_AB_TEST_MEASURE)
  -- Each: { variant_id, impressions, clicks, ctr, watch_time_per_impression, measured_at }
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Analysis (populated when test completes)
  winner_variant_id TEXT, -- 'control', 'A', 'B', 'C', or NULL if inconclusive
  winner_applied BOOLEAN NOT NULL DEFAULT false, -- true when winning variant is permanently set
  analysis JSONB, -- Claude's full analysis output
  statistical_significance BOOLEAN,
  confidence_level NUMERIC(5,2),
  ctr_improvement NUMERIC(5,2), -- percentage points improvement
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Lesson learned (for future reference)
  lesson TEXT
);

-- Index for finding active tests
CREATE INDEX idx_ab_tests_active ON ab_tests(status) WHERE status = 'active';
CREATE INDEX idx_ab_tests_project ON ab_tests(project_id);

-- Enable Realtime for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE ab_tests;
```

---

# n8n Workflow Spec: WF_AB_TEST_CREATE

**Trigger:** POST /webhook/ab-test/create
**Payload:** `{ topic_id, test_type, rotation_hours? }`

**Steps:**

1. **Fetch topic data:**
   - Query topics WHERE id = topic_id → get current title, thumbnail_url, primary_keyword
   - Query projects WHERE id = topic.project_id → get niche_context, channel_avg_ctr

2. **Fetch competitor context:**
   - YouTube Search API: search.list?q={{primary_keyword}}&type=video&maxResults=10
   - videos.list → get titles and view counts of top 10 results

3. **Generate title variants (if test_type = 'title' or 'both'):**
   - POST to Anthropic API (claude-opus-4-6) with Title Variant Generation prompt
   - Parse JSON response → extract 3 variants

4. **Generate thumbnail variant briefs (if test_type = 'thumbnail' or 'both'):**
   - POST to Anthropic API (claude-opus-4-6) with Thumbnail Variant Brief prompt
   - For each brief: POST to Fal.ai Seedream 4.0 to generate thumbnail image
   - Upload thumbnails to Google Drive → get URLs

5. **Create test record:**
   - INSERT into ab_tests with control values, variants, status='draft'
   - Return test_id to dashboard

6. **Dashboard shows test in "Draft" state** — user reviews variants, clicks "Start Test"

---

# n8n Workflow Spec: WF_AB_TEST_ROTATE

**Trigger:** Cron every 2 hours
**Purpose:** Rotate active A/B tests to next variant when rotation_hours elapsed

**Steps:**

1. **Fetch active tests:**
   - Query ab_tests WHERE status = 'active'

2. **For each active test:**
   a. Check: has `rotation_hours` elapsed since `current_variant_started_at`?
   b. If no → skip
   c. If yes:
      - **Measure current variant performance:**
        - YouTube Analytics API: query impressions + clicks for the video over the current variant period
        - Calculate CTR = clicks / impressions × 100
        - Calculate watch_time_per_impression from YouTube Analytics
        - APPEND measurement to results JSONB array
      
      - **Rotate to next variant:**
        - Increment current_variant_index (wrap to 0 after all variants tested)
        - Apply the new variant via YouTube API:
          - If title test: `videos.update` with new title
          - If thumbnail test: `thumbnails.set` with new thumbnail
        - UPDATE current_variant_started_at = now()
        - INCREMENT rotations_completed
      
      - **Check if test is complete:**
        - All variants (including control) have been tested at least once
        - AND each variant has >= min_impressions_per_variant
        - If complete: trigger WF_AB_TEST_ANALYZE

3. **Error handling:**
   - If YouTube API fails (rate limit, auth): set test status = 'paused', log error
   - If video is deleted/private: set test status = 'cancelled'

---

# n8n Workflow Spec: WF_AB_TEST_ANALYZE

**Trigger:** Called by WF_AB_TEST_ROTATE when test completion criteria met
**Payload:** `{ test_id }`

**Steps:**

1. **Fetch test data:**
   - Query ab_tests WHERE id = test_id → get all results, variants, control

2. **Statistical analysis:**
   - POST to Claude Opus 4.6 with Test Result Analysis prompt
   - Parse JSON response

3. **Apply winner (if significant):**
   - If winner is not 'control' and winner is not 'inconclusive':
     - YouTube API: videos.update → set winning title/thumbnail permanently
     - UPDATE ab_tests SET winner_applied = true

4. **Update test record:**
   - UPDATE ab_tests SET status = 'completed', analysis = response, winner_variant_id, statistical_significance, confidence_level, ctr_improvement, lesson, completed_at = now()

5. **Notification:**
   - INSERT into production_log: "A/B Test complete: Variant {winner} won with +{improvement}% CTR"
   - Surfaces in Top Bar notification bell

---

# Dashboard: A/B Testing Panel

**Location:** Analytics page → new "A/B Tests" tab

**Components:**

1. **Active Tests** section:
   - Card per active test: video title, test type badge, current variant, progress bar (impressions collected / target), time remaining
   - [Pause] [Cancel] actions

2. **Completed Tests** section:
   - Table: Video | Test Type | Winner | CTR Improvement | Confidence | Lesson | Date
   - Click row → expand to show variant-by-variant comparison with CTR bars
   - Winner row highlighted in green

3. **Start New Test** button:
   - Only available on published videos (status = 'published')
   - Opens modal: select test type, review AI-generated variants, configure rotation hours, [Start Test]

4. **Insights Panel** (right sidebar):
   - "Aggregate learnings" from all completed tests
   - "Title formulas that win" — patterns from winning variants
   - "Average CTR improvement" across all tests
