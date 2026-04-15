# prompts/style_dna_extractor.md
> STATUS: NEW PROMPT
> Used by: WF_STYLE_DNA (Skill 26)
> Model: Claude Opus 4.6 + Vision

---

## System Prompt

You are a YouTube channel strategist and reverse-engineer. You analyze competitor channels the way a screenwriter studies box office hits — to understand the underlying structure and patterns that make them work.

You are precise, observant, and data-driven. Your job is not to recommend vague "strategies" but to extract the exact structural DNA of a channel — the patterns a creator can replicate systematically.

---

## User Prompt (Pass 1 — Title Analysis)

```
TITLE PATTERN ANALYSIS

Channel: {{channel_name}}
Last 20 Video Titles (ordered newest → oldest):
{{#each recent_titles}}
{{@index}}. "{{this.title}}" | Views: {{this.views}} | Published: {{this.days_ago}}d ago
{{/each}}

Analyze these titles and extract the dominant structural formulas this channel uses.

Look for:
1. Opening word patterns (Why / How / [Number] / I / The / etc.)
2. Length patterns (average chars, range)
3. Structural templates that recur (identify 3-5)
4. Emotional triggers used (fear / curiosity / desire / social proof)
5. Whether high-view titles differ structurally from low-view titles

Return ONLY this JSON:
{
  "title_formulas": [
    {
      "pattern_name": "<descriptive name for this formula>",
      "template": "<structural template with placeholders>",
      "example": "<one of their actual titles that fits>",
      "frequency_pct": <float 0-100>,
      "avg_views_when_used": <integer>,
      "emotional_trigger": "<fear|curiosity|desire|social_proof|mixed>"
    }
  ],
  "title_stats": {
    "avg_char_count": <integer>,
    "uses_numbers_pct": <float>,
    "starts_with_question_pct": <float>,
    "uses_parentheses_pct": <float>
  },
  "top_performing_formula": <index into title_formulas>,
  "title_pattern_summary": "<2-3 sentence description of their overall title strategy>"
}
```

---

## User Prompt (Pass 2 — Thumbnail Visual Analysis)

```
THUMBNAIL DNA ANALYSIS

I'm going to show you the thumbnails for {{channel_name}}'s recent videos. Analyze all of them together to identify consistent visual patterns.

[IMAGES: {{thumbnail_urls}}]

For the entire set, identify:
1. Dominant color palette (top 3 colors in hex)
2. Text positioning (where does text typically appear: left / center / right / bottom / top / none)
3. Face presence (what % of thumbnails show a human face?)
4. Dominant emotional expression in face thumbnails
5. Background type (solid color / gradient / busy scene / blurred / stock photo)
6. Text characteristics (font style: bold/thin, text case: upper/title/mixed, typical word count)
7. Visual "brand signature" — is there a consistent element across all thumbnails? (Arrow, circle, specific color, logo, etc.)

Return ONLY this JSON:
{
  "thumbnail_dna": {
    "dominant_colors": ["<hex>", "<hex>", "<hex>"],
    "text_position": "<left|center|right|bottom|none|varied>",
    "face_presence_pct": <float 0-100>,
    "dominant_emotion": "<shock|excitement|concern|curiosity|neutral|none>",
    "background_type": "<solid|gradient|scene|blurred|stock>",
    "text_style": "<bold-caps|bold-title|thin-title|mixed>",
    "typical_word_count_in_thumbnail": <integer>,
    "brand_signature": "<description or 'none'>",
    "visual_complexity": "<minimal|moderate|busy>"
  },
  "thumbnail_consistency_score": <integer 0-100>,
  "thumbnail_visual_summary": "<2-3 sentence description>"
}
```

---

## User Prompt (Pass 3 — Content Strategy Synthesis)

```
CONTENT PILLAR + CADENCE ANALYSIS

Channel: {{channel_name}}

Video titles and view counts (last 20):
{{#each recent_titles}}
- "{{this.title}}" → {{this.views}} views | {{this.duration_minutes}}min
{{/each}}

Upload dates: {{upload_dates}}
Subscriber count: {{subscriber_count}}

TASK:
1. Group these videos into 3-5 content pillars (recurring topic clusters)
2. Calculate upload cadence (frequency + preferred days)
3. Identify the relationship between video length and view performance
4. Summarize what makes this channel's content strategy distinctive

Return ONLY this JSON:
{
  "content_pillars": [
    {
      "pillar_name": "<topic cluster name>",
      "description": "<what this content covers>",
      "example_titles": ["<title>", "<title>"],
      "pct_of_uploads": <float>,
      "avg_views": <integer>
    }
  ],
  "upload_cadence": {
    "uploads_per_week": <float>,
    "preferred_days": ["<day>"],
    "avg_video_length_minutes": <float>,
    "length_performance_correlation": "<longer performs better|shorter performs better|no clear pattern>"
  },
  "content_strategy_summary": "<3-4 sentence description of what makes this channel's content approach distinctive and replicable>",
  "replication_difficulty": "<easy|medium|hard>",
  "replication_notes": "<what would be hardest to replicate and why>"
}
```

---

## Final Synthesis Node

After all 3 passes, a final Code node assembles the combined `style_profile` record:

```javascript
const titleDNA = $('Title Analysis').first().json;
const thumbnailDNA = $('Thumbnail Analysis').first().json;
const contentStrategy = $('Content Strategy').first().json;

const styleProfile = {
  channel_url: $('Input').first().json.channel_url,
  channel_name: $('Channel Data').first().json.channel_name,
  title_formulas: titleDNA.title_formulas,
  title_stats: titleDNA.title_stats,
  thumbnail_dna: thumbnailDNA.thumbnail_dna,
  content_pillars: contentStrategy.content_pillars,
  upload_cadence: contentStrategy.upload_cadence,
  style_summary: buildStyleSummary(titleDNA, thumbnailDNA, contentStrategy),
  analyzed_at: new Date().toISOString()
};

function buildStyleSummary(t, th, c) {
  const topFormula = t.title_formulas[t.top_performing_formula];
  const face = th.thumbnail_dna.face_presence_pct > 60 ? 'face-forward' : 'faceless';
  const pillar = c.content_pillars[0].pillar_name;
  return `${styleProfile.channel_name} is a ${face} channel with a ${c.upload_cadence.uploads_per_week.toFixed(1)}x/week cadence. ` +
    `Top-performing content cluster: "${pillar}". ` +
    `Dominant title formula: ${topFormula.pattern_name} (${topFormula.frequency_pct.toFixed(0)}% of uploads, ${topFormula.avg_views_when_used.toLocaleString()} avg views). ` +
    `${th.thumbnail_visual_summary}`;
}

return [{ json: styleProfile }];
```

---

## Apply DNA to Project (Optional Step)

If `project_id` is provided, inject style constraints into the project's `prompt_configs`:

```javascript
// Update prompt_configs to inject style DNA
const config = await supabase
  .from('prompt_configs')
  .select('*')
  .eq('project_id', projectId)
  .single();

const updatedConfig = {
  ...config,
  style_dna_title_formula: topFormula.template,
  style_dna_thumbnail_colors: thumbnailDNA.thumbnail_dna.dominant_colors,
  style_dna_text_position: thumbnailDNA.thumbnail_dna.text_position,
  style_dna_face_required: thumbnailDNA.thumbnail_dna.face_presence_pct > 60,
  style_dna_applied: true,
  style_dna_channel: channel_name
};
```
