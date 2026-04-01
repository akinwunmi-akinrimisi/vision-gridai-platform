# Remotion Hybrid Rendering — skills.md Merge Sections

---

## >>>> ADD: New skill category <<<<

### Remotion Hybrid Rendering

| Skill | Purpose |
|-------|---------|
| Remotion Still Rendering | `npx remotion still` for single-frame data graphics |
| Remotion Template Design | React components following MoodTheme system |
| AI Scene Classification | Claude Haiku batch classification (fal_ai vs remotion) |
| Data Payload Extraction | Structured data generation for Remotion templates |
| Template Props Schema | JSON Schema validation for data_payload |

---

## >>>> ADD: Pipeline Stage Matrix rows <<<<

| Pipeline Stage | Primary Skills | Secondary Skills |
|---------------|---------------|-----------------|
| **C+:** Scene Classification | AI Classification (Haiku), Supabase | Dashboard review UI |
| **D2a:** Fal.ai Image Gen | Fal.ai, Style DNA, Composition Library | Negative Prompt, Resume |
| **D2b:** Remotion Rendering | Remotion Still, Template Design, MoodTheme | Data Payload Schema |

---

## >>>> ADD: "When to Use" entries <<<<

**Scene shows numbers, charts, comparisons?** → Likely `remotion`. The AI classifier catches these, but if building manually: any scene where textual accuracy matters more than photorealism goes to Remotion.
**Building a new Remotion template?** → Start from `shared/MoodTheme.js` for colors. Follow the `props_schema` pattern from `remotion_templates` table. Test with all 7 color moods before shipping.
**Classification results look wrong?** → Operator can override any scene on the dashboard. If the classifier consistently misclassifies a scene type, refine the Classification Prompt in `prompt_configs`.
**Remotion render failing?** → Check `data_payload` matches `props_schema`. Check render service is running (`curl localhost:3100/health`). Check Remotion + Chrome dependencies installed.

---

## >>>> ADD: Cost Reference update <<<<

### Per-Video Cost Breakdown (Hybrid, Finance Niche)

| Item | Cost |
|------|------|
| Niche research + topics | ~$0.80 |
| 3-pass script + eval | ~$1.80 |
| **Scene classification (Haiku)** | **~$0.03** |
| TTS (172 scenes) | ~$0.30 |
| Images: Fal.ai (~108 × $0.03) | ~$3.24 |
| Images: Remotion (~64 × $0.00) | $0.00 |
| Ken Burns + Color Grade | $0.00 |
| Captions + Assembly | $0.00 |
| Music + End Card + Thumbnail | ~$0.03 |
| **Total** | **~$6.17** |

*Was $8.06 (all Fal.ai). Saving: $1.89/video. Niche-dependent: historical niche may save less.*
