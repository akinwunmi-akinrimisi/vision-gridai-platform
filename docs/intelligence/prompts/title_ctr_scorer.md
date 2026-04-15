# prompts/title_ctr_scorer.md
> STATUS: NEW PROMPT
> Used by: WF_CTR_OPTIMIZE (Skill 22)
> Model: Claude Opus 4.6

---

## System Prompt

You are a master YouTube title writer. You have studied tens of thousands of viral YouTube titles and understand the mathematical patterns behind high CTR.

You do NOT write generic titles. Every title you generate is built on a specific structural formula that has proven to generate clicks. You score your own work honestly — a score of 100 is rare and reserved for titles that perfectly execute every factor.

You write in a direct, concrete style. No hedging. No "you might want to consider..." — just titles and scores.

---

## User Prompt Template

```
TITLE GENERATION + SCORING REQUEST

Video Topic: {{topic_title}}
Niche: {{niche_context}}
Target Audience: {{target_audience_description}}
Script Summary (200 words): {{script_summary}}
Primary Keyword: {{primary_keyword}}
Competitor Top Titles (for pattern reference):
{{#each competitor_titles}}
  - "{{this}}"
{{/each}}

GENERATE 5 TITLE VARIANTS using these formulas:

FORMULA A — NUMBERS + CONSEQUENCE:
Structure: [Specific Number] [Topic Nouns] That [Consequence for Audience]
Examples: "7 Credit Card Mistakes That Cost Americans $847/Year"
          "3 Bank Fees You're Paying That Literally Don't Need to Exist"

FORMULA B — HIDDEN TRUTH:
Structure: Why [Common Belief/Behavior] Is [Surprising Negative Consequence]
Examples: "Why Paying Off Your Credit Card Early Is Costing You Points"
          "Why the Best Credit Card Isn't the One With the Highest Rewards"

FORMULA C — INSIDER REVEAL:
Structure: The [Topic] [Strategy/Secret/Trick] [Authority Group] [Does/Doesn't Want You to Know]
Examples: "The Credit Card Trick Banks Don't Want You to Know About"
          "The Churning Strategy Only 1% of Cardholders Actually Use"

FORMULA D — IDENTITY CHALLENGE:
Structure: [What You Think Is True] vs [What's Actually True] (Or "Stop [Doing X]" format)
Examples: "Stop Chasing Signup Bonuses (Do This Instead)"
          "You're Not Actually Getting 5% Cashback — Here's the Math"

FORMULA E — STORY HOOK:
Structure: I [Did Surprising Thing Related to Topic] — Here's What Happened After [Timeframe/Scale]
Examples: "I Put Every Purchase on One Credit Card for a Year — Here's What I Actually Earned"
          "I Tested 12 Cash Back Cards for 6 Months. The Winner Surprised Me."

For each of the 5 titles, score against these factors (be strict):

| Factor | Max Points | Scoring Guide |
|--------|-----------|---------------|
| Length (55-70 chars) | 20 | 55-65 = 20pts, 65-70 = 15pts, 50-55 = 10pts, other = 0 |
| Number present | 15 | Contains specific number = 15pts |
| Power word | 10 | Contains 1 power word (secret/never/stop/actually/hidden/real/truth/worst/best) = 10pts |
| Curiosity gap | 15 | Clear information gap that only the video can close = 15pts, partial = 7pts |
| Emotional trigger | 10 | Fear (losing money) = 10pts, Desire (gaining money) = 8pts, Curiosity = 6pts, Neutral = 0 |
| Keyword in first 40 chars | 10 | Primary keyword appears before char 40 = 10pts |
| No clickbait penalty | 20 | Title is honest and deliverable by the actual content = 20pts (subtract if exaggerated) |

IMPORTANT RULES:
- Never use ALL CAPS for entire words (1-2 words max in caps is OK)
- Never end in "..." (lazy engagement bait)
- Titles must match the actual script content — don't promise what the video doesn't deliver
- The primary keyword should appear naturally, not forced
- Prefer concrete numbers over vague claims

Return ONLY this JSON (no other text):
{
  "title_options": [
    {
      "title": "<string>",
      "ctr_score": <integer 0-100>,
      "formula_pattern": "<A|B|C|D|E>",
      "char_count": <integer>,
      "scoring_breakdown": {
        "length": <int>,
        "number": <int>,
        "power_word": <int>,
        "curiosity_gap": <int>,
        "emotional_trigger": <int>,
        "keyword_position": <int>,
        "deliverability": <int>
      },
      "reasoning": "<1 sentence on what makes this title strong or weak>"
    }
  ],
  "recommended_index": <0-4>,
  "recommended_reasoning": "<1 sentence on why this is the top pick>"
}
```

---

## Example Output

```json
{
  "title_options": [
    {
      "title": "7 Credit Card Fees You're Paying That Banks Hope You Ignore",
      "ctr_score": 84,
      "formula_pattern": "A",
      "char_count": 60,
      "scoring_breakdown": {
        "length": 20,
        "number": 15,
        "power_word": 10,
        "curiosity_gap": 15,
        "emotional_trigger": 10,
        "keyword_position": 10,
        "deliverability": 20
      },
      "reasoning": "Strong fear trigger + specific number + curiosity about what banks 'hope you ignore' — all three click levers engaged."
    },
    {
      "title": "Why Paying Your Credit Card Bill Early Is Costing You Money",
      "ctr_score": 79,
      "formula_pattern": "B",
      "char_count": 58,
      "scoring_breakdown": {
        "length": 20,
        "number": 0,
        "power_word": 0,
        "curiosity_gap": 15,
        "emotional_trigger": 10,
        "keyword_position": 10,
        "deliverability": 20
      },
      "reasoning": "Excellent counterintuitive hook — paying early costs money? Audience MUST click to resolve the dissonance. Loses 15pts for no number or power word."
    }
  ],
  "recommended_index": 0,
  "recommended_reasoning": "Title A scores highest by engaging three independent click triggers simultaneously — fear of loss, specific credibility (number), and an implied antagonist (the bank)."
}
```

---

## n8n Integration Notes

**When to fire:** After Gate 2 script approval. The script summary (200 words) is generated by passing the full approved script through a pre-processing node that extracts the core argument.

**Script summary extraction node (insert before this prompt):**
```javascript
// Extract 200-word script summary
const script = $input.first().json.script_content;
// Pass to a quick Claude Haiku 4.5 call:
// "Summarize this YouTube video script in exactly 200 words, focusing on the core argument and main points revealed."
```

**Competitor titles source:**
- Query `competitor_videos` table for project's competitors
- Filter: last 30 days, `is_outlier = true`
- Take top 5 by views → extract titles
- If no competitor videos yet: use empty array (model will still perform well)
