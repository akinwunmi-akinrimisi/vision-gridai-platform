# Image Generation — Register-Specific Prompt Library

Register-tuned image-prompting files for each of the 5 Production Registers. These files extend (never replace) the base pipeline documented in `IMAGE_GENERATION_PROMPTS.md`.

---

## 1. Why This Library Exists

The base pipeline in `IMAGE_GENERATION_PROMPTS.md` defines four global pieces:

1. **The assembly formula** — `{COMPOSITION_PREFIX} {SCENE_SUBJECT} {STYLE_DNA}` built in `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node
2. **The 8-value composition_prefix library** — stored in `prompt_templates` table, one selected per scene
3. **4 Style DNA base templates** — one locked per project, stored in `projects.style_dna`
4. **A generic Claude metadata prompt** — in `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node, producing `scene.image_prompt`

Currently all 5 Production Registers are funneled through the same generic metadata prompt and must share one of only 4 Style DNA templates. The result: the Claude-generated `image_prompt` values look similar across registers, and the register's cinematic grammar never fully lands in the resolved Fal.ai payload.

This library fixes that by providing, per register:

- **Register-Specific Style DNA variants** — drop-in replacements for `projects.style_dna`
- **Register-Specific Negative Prompt Additions** — appended to the Universal Negative at runtime
- **composition_prefix preferences** — which of the 8 enum values the register favors
- **Register-Specific Metadata Prompt** — drop-in for `Prepare Metadata Prompt` node, produces the same JSON schema (`scene_number`, `image_prompt`, `emotional_beat`, `chapter`)
- **Per-emotional_beat scene_subject patterns** — one per enum value (`hook`, `tension`, `revelation`, `data`, `story`, `resolution`, `transition`)
- **Worked examples** — 10-15 per register showing fully-resolved prompts as they would be sent to Fal.ai

---

## 2. What This Library Does NOT Change

Everything below remains exactly as documented in `IMAGE_GENERATION_PROMPTS.md`. These files extend the data; they do not alter the mechanics.

| Element | Status |
|---|---|
| Formula `{COMPOSITION_PREFIX} {SCENE_SUBJECT} {STYLE_DNA}` | Unchanged |
| Workflow `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node JS | Unchanged |
| Workflow `WF_SCENE_IMAGE_PROCESSOR.json` → Fal.ai HTTP call | Unchanged |
| Workflow `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node (mechanics) | Unchanged; prompt text becomes register-specific (see below) |
| `scenes.composition_prefix` column | Unchanged |
| `scenes.image_prompt` column | Unchanged |
| `projects.style_dna` column | Unchanged; the value stored becomes a register-specific variant |
| `prompt_templates` table | Unchanged structure; new rows added for register-specific entries |
| Universal Negative Prompt | Unchanged; register-specific additions APPEND, never replace |
| Fal.ai endpoint `https://queue.fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image` | Unchanged |
| `image_size` values (`landscape_16_9`, `portrait_9_16`) | Unchanged |
| `emotional_beat` enum (`hook`, `tension`, `revelation`, `data`, `story`, `resolution`, `transition`) | Unchanged |
| composition_prefix enum (8 values) | Unchanged |

---

## 3. How Registers Compose With the Existing Schema

`projects.style_dna` is LOCKED per project. Production Register can change per video. This creates a composition question: how does a single-project Style DNA absorb 2+ different Registers across different videos in that project?

Three implementation paths, in order of simplicity:

### Path A — Register-Aligned Project Style DNA (simplest, zero schema change)

At project creation time, choose the Style DNA variant that matches the project's **primary** Register. Videos in that project that use the primary Register get perfect register alignment; videos in secondary Registers get the primary's Style DNA as a "base layer" and lean on the scene-level `image_prompt` to carry register-specific descriptors.

Example for CardMath (primary Register = 01 Economist):

```sql
UPDATE projects
SET style_dna = '<Register 01 Style DNA Variant A — see REGISTER_01_IMAGE_PROMPTS.md>'
WHERE id = 'cardmath';
```

For the 10% of CardMath videos that use Register 03 (fraud exposés), the Noir descriptors land in `scenes.image_prompt` via the register-specific metadata prompt, even though `projects.style_dna` still anchors on Economist. The tonal shift is carried by the scene_subject text and the register-specific negative additions.

### Path B — Extend `prompt_templates` with register-keyed Style DNA (recommended)

Add rows to the existing `prompt_templates` table keyed by register. No schema change, just new data.

```sql
INSERT INTO prompt_templates (template_key, template_type, template_body)
VALUES
  ('style_dna_register_01_primary', 'style_dna', '<Register 01 Variant A>'),
  ('style_dna_register_02_primary', 'style_dna', '<Register 02 Variant A>'),
  ('style_dna_register_03_primary', 'style_dna', '<Register 03 Variant A>'),
  ('style_dna_register_04_primary', 'style_dna', '<Register 04 Variant A>'),
  ('style_dna_register_05_primary', 'style_dna', '<Register 05 Variant A>'),
  -- alternates per niche (see each register file for full list)
  ('style_dna_register_02_real_estate', 'style_dna', '<Register 02 Real Estate Variant>');
```

Then extend `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node minimally:

```js
// Build 3-part cinematic prompt (unchanged formula)
const prefix   = scene.composition_prefix || '';
const subject  = scene.image_prompt || '';

// NEW: lookup register-specific style_dna, fall back to project-level style_dna
const registerKey = `style_dna_register_${scene.production_register}_${scene.niche_variant || 'primary'}`;
const styleDna    = lookupTemplate(registerKey) || project.style_dna;

const parts    = [prefix, subject, styleDna].filter(Boolean);
const fullPrompt = parts.join(' ');
```

The `filter(Boolean)` logic already in the node means if the lookup returns null, the formula collapses back to the original. Fully backward-compatible.

### Path C — Add a dedicated column `scenes.register_style_overlay` (cleanest but requires schema change)

```sql
ALTER TABLE scenes ADD COLUMN register_style_overlay TEXT;
```

Extend the formula to 4-part:

```js
const parts = [prefix, subject, registerOverlay, styleDna].filter(Boolean);
```

The register overlay is appended between the scene subject and the project Style DNA. Each register file provides the exact overlay text.

**Recommendation:** Start with Path A for the first video per register (fastest to ship), then migrate to Path B once you have 2+ Registers in regular use (avoids schema churn). Path C is the long-term cleanest shape.

Each register file below provides the Style DNA text in a format compatible with all three paths.

---

## 4. Register-Specific Metadata Prompt — How It Plugs In

The existing `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node constructs the Claude prompt inline as JS string concatenation. To make it register-aware, extend the JS to look up the register-specific prompt body from `prompt_templates`:

```js
// Existing code (unchanged mechanics)
const chunkList = chunks.map((c, i) => 'CHUNK ' + (i+1) + ': ' + c).join('\n\n');

// NEW: lookup register-specific prompt body, fall back to generic
const promptTemplateKey = `metadata_prompt_register_${topic.production_register || 'generic'}`;
const promptBody = lookupTemplate(promptTemplateKey) || GENERIC_METADATA_PROMPT_BODY;

// Assemble with the same interpolations
const metadataPrompt = promptBody
  .replace('{N}', chunks.length)
  .replace('{SEO_TITLE}', topic.seo_title || topic.original_title)
  .replace('{CHUNK_LIST}', chunkList);
```

Each register file provides the full body to paste as `metadata_prompt_register_XX` in `prompt_templates`.

**All register-specific metadata prompts return the exact same JSON schema** as the generic prompt: `[{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]`. The `emotional_beat` enum (`hook`, `tension`, `revelation`, `data`, `story`, `resolution`, `transition`) is preserved. Downstream workflows consuming this JSON do not change.

---

## 5. Register-Specific Negative Prompt Additions — Merge Strategy

The Universal Negative in `WF_IMAGE_GENERATION.json` (Fire All Scenes node) remains the base. Register-specific additions append to it at runtime.

**Current code:**

```js
negative_prompt: 'text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI'
```

**Extended code (preserving Universal Negative verbatim):**

```js
const UNIVERSAL_NEGATIVE = 'text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI';

// NEW: register-specific additions, fetched from prompt_templates
const registerKey = `negative_additions_register_${scene.production_register}`;
const registerAdditions = lookupTemplate(registerKey) || '';

const finalNegative = registerAdditions
  ? `${UNIVERSAL_NEGATIVE}, ${registerAdditions}`
  : UNIVERSAL_NEGATIVE;

// Passed to Fal.ai as negative_prompt
```

The resulting `negative_prompt` sent to Fal.ai is always the Universal Negative (verbatim) + register additions, comma-separated. If the register lookup returns null, the payload is identical to the current pipeline — full backward compatibility.

---

## 6. File Map

```
/image_prompts_by_register/
├── README.md                                     (this file)
├── REGISTER_01_IMAGE_PROMPTS.md                  (Economist — documentary explainer)
├── REGISTER_02_IMAGE_PROMPTS.md                  (Premium Authority — luxury editorial)
├── REGISTER_03_IMAGE_PROMPTS.md                  (Investigative Noir — crime, fraud, revenge)
├── REGISTER_04_IMAGE_PROMPTS.md                  (Signal — tech/fintech/SaaS)
└── REGISTER_05_IMAGE_PROMPTS.md                  (Archive — biographical, family drama)
```

Each register file follows the same 9-section structure:

1. When this register is active
2. Register-Specific Style DNA Variants (2-3 variants)
3. Register-Specific Negative Prompt Additions
4. composition_prefix Preferences (from the existing 8-value enum)
5. Register-Specific Metadata Prompt (full body to paste in `Prepare Metadata Prompt` node)
6. Per-emotional_beat scene_subject Patterns (7 patterns — one per enum value)
7. Worked Examples (10-15 per register, multi-niche)
8. QA Checklist
9. Source Files

---

## 7. Quickstart — First Video in Each Register

1. **Pick the register** for your video (from `README.md` in the registers playbook, or let the scene classifier emit it).
2. **Open the matching `REGISTER_XX_IMAGE_PROMPTS.md` file.**
3. **Copy the primary Style DNA variant** (Section 2) into `projects.style_dna` for this project (or use Path B/C from Section 3 above for multi-register projects).
4. **Paste the Register-Specific Metadata Prompt body** (Section 5) into `prompt_templates` keyed by `metadata_prompt_register_XX`.
5. **Paste the Register-Specific Negative Prompt Additions** (Section 3) into `prompt_templates` keyed by `negative_additions_register_XX`.
6. **Run `WF_SCRIPT_GENERATE.json`** as normal — the `Prepare Metadata Prompt` node now pulls register-specific instructions, Claude generates register-aligned `image_prompt` values per scene.
7. **Run `WF_IMAGE_GENERATION.json`** as normal — `Fire All Scenes` assembles the 3-part prompt with register-specific Style DNA and sends register-augmented Universal Negative to Fal.ai.

No changes to `WF_SCENE_IMAGE_PROCESSOR.json`. Fal.ai endpoint, `image_size`, and payload structure remain identical. Only the content of `prompt` and `negative_prompt` changes — and it changes by design, producing register-aligned images.

---

## 8. QA — System-Level Checklist

Before the first production run in any new register:

- [ ] Primary Style DNA variant installed in `projects.style_dna` OR register-keyed row in `prompt_templates`
- [ ] Register-Specific Negative Additions row in `prompt_templates` (keyed `negative_additions_register_XX`)
- [ ] Register-Specific Metadata Prompt body row in `prompt_templates` (keyed `metadata_prompt_register_XX`)
- [ ] `Prepare Metadata Prompt` node lookups pointed at the new template keys (if using Path B/C)
- [ ] `Fire All Scenes` node lookups pointed at new Style DNA keys (if using Path B/C)
- [ ] Test run on 3-scene micro-script: verify resolved prompt matches worked-example format in the register file
- [ ] Test Fal.ai payload capture: verify `negative_prompt` includes both Universal Negative (verbatim) and register additions
- [ ] Test output images: verify they match the register's visual character (see per-register QA checklist)

---

## Source Files (augmented, not replacing)

- `workflows/WF_IMAGE_GENERATION.json` — Fire All Scenes node (register-aware Style DNA lookup and negative prompt assembly — see Path B/C above)
- `workflows/WF_SCENE_IMAGE_PROCESSOR.json` — Fal.ai HTTP call (unchanged)
- `workflows/WF_SCRIPT_GENERATE.json` — Prepare Metadata Prompt node (register-aware metadata prompt lookup — see Section 4 above)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates (unchanged), Composition Library (unchanged), Universal Negative (unchanged)
- `directives/04-image-generation.md` — SOP reference (extend with register selection step before scene metadata pass)
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference (this library extends it)
- `vision_gridai_registers/REGISTER_XX_*.md` — Production Register playbooks (cinematic grammar specs that inform these image prompts)
