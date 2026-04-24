# Prompt templates (Style DNA, composition, negative)

The three prompt fragments that get **assembled into every image
prompt** at runtime: a Style DNA suffix (locked per project), a
composition prefix (chosen per scene), and a universal negative prompt
(constant across the platform).

For the source-of-truth on assembly, see
[where prompts live](where-they-live.md). Per-register variants live in
`image_creation_guidelines_prompts/REGISTER_*_IMAGE_PROMPTS.md`.

---

## 1. Style DNA templates

Generated once at project creation by `WF_STYLE_DNA` (Phase A) and
stored in `projects.style_dna`. **Locked for the lifetime of the
project** — appended verbatim to every image prompt so all 172 scenes
share a coherent visual identity.

The 4 base templates below are the starting points; the
register-aware files (`REGISTER_01..05_IMAGE_PROMPTS.md`) define
per-register overrides that the register seeder writes into
`production_registers`.

### Historical / Period Drama

```text
cinematic still frame, {ERA} period accuracy, dramatic chiaroscuro lighting, 35mm film grain texture, desaturated muted color palette, deep shadows, documentary photorealism, volumetric fog, depth of field bokeh, 8K detail
```

`{ERA}` is filled by `WF_STYLE_DNA` from the niche research output
(e.g. "Renaissance Florence", "1920s Wall Street").

### Modern Finance / Premium

```text
modern commercial photography, clean minimalist composition, premium luxury aesthetic, soft directional studio lighting, subtle depth of field, neutral background tones, crisp 4K sharpness, contemporary color palette, professional product photography feel
```

### Tech / Futuristic

```text
futuristic cinematic still, cool blue-purple ambient lighting, clean glass and steel surfaces, subtle neon accents, high contrast shadows, modern tech aesthetic, volumetric light rays, ultra-sharp detail, dark background with rim lighting
```

### Warm Human / Inspirational

```text
warm golden hour photography, natural soft lighting, rich earth tones, gentle lens flare, human-centered composition, emotional depth, 35mm film warmth, intimate documentary feel, subtle grain, shallow focus on subject
```

### Per-register variants

The 5 production registers (Economist, Tabloid, Cinematic, Investigative,
Inspirational — see [Production Registers](../subsystems/registers.md))
override pieces of the Style DNA depending on the register selected at
the Cost Calculator gate. The full per-register text lives in:

| Register | Source file |
|---|---|
| Register 01 — Economist | `image_creation_guidelines_prompts/REGISTER_01_IMAGE_PROMPTS.md` |
| Register 02 — Tabloid | `image_creation_guidelines_prompts/REGISTER_02_IMAGE_PROMPTS.md` |
| Register 03 — Cinematic | `image_creation_guidelines_prompts/REGISTER_03_IMAGE_PROMPTS.md` |
| Register 04 — Investigative | `image_creation_guidelines_prompts/REGISTER_04_IMAGE_PROMPTS.md` |
| Register 05 — Inspirational | `image_creation_guidelines_prompts/REGISTER_05_IMAGE_PROMPTS.md` |

**Never modify Style DNA mid-video.** Re-rolling Style DNA between
scenes produces visible drift; the rule is enforced by `WF_IMAGE_GENERATION`
reading `projects.style_dna` once per topic at the start of the run.

---

## 2. Composition prefix library

Stored in `prompt_templates` (`template_type='composition'`). Claude
selects one per scene during script generation by writing
`scenes.composition_prefix`. `WF_IMAGE_GENERATION` looks up the prefix
text and prepends it to the scene's image prompt before sending to
Fal.ai.

| `composition_prefix` | Exact prompt prefix | Best for |
|---|---|---|
| `wide_establishing` | `wide angle establishing shot, full scene visible, environmental context,` | Opening hooks, location reveals — set the stage |
| `medium_closeup` | `medium close-up shot, subject fills center frame, shoulders and above,` | Character focus, emotional beats |
| `over_shoulder` | `over the shoulder perspective, looking outward from behind subject,` | Immersive moments — viewer rides along with the subject |
| `extreme_closeup` | `extreme close-up, tight crop on detail, shallow depth of field,` | B-roll, product shots, detail emphasis |
| `high_angle` | `high angle shot looking down, bird's eye perspective, subject below,` | Power dynamics, vulnerability |
| `low_angle` | `low angle shot looking up, subject towering above, dramatic perspective,` | Authority, grandeur — make the subject loom |
| `symmetrical` | `perfectly symmetrical composition, centered subject, architectural framing,` | Formal scenes, dramatic reveals |
| `leading_lines` | `composition using strong leading lines converging to subject,` | Pathways, corridors, perspective depth |

The 8 prefixes are deliberately small — Claude's selection space is
constrained to this set so output stays coherent. Adding a new prefix
means seeding `prompt_templates` and updating the Visual Director
prompt in `prompt_configs`.

---

## 3. Universal negative prompt

Hardcoded in `WF_IMAGE_GENERATION` (Fire All Scenes node) and sent on
every Fal.ai image call as the `negative_prompt` field:

```text
text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI
```

Three tiers of intent in this list:

- **Brand-safety:** `text, watermark, signature, logo, UI elements` —
  Seedream sometimes hallucinates fake brand marks or generates UI
  chrome over the image. The negative prompt suppresses both.
- **Anatomy regressions:** `distorted faces, extra fingers, mutated
  hands, bad anatomy, deformed, disfigured` — common diffusion-model
  failure modes for human subjects.
- **Style drift:** `cartoon, anime, painting, illustration, 3D render,
  CGI` — Vision GridAI is photorealistic-only; this list keeps Fal.ai
  from drifting toward illustrated styles when prompts are ambiguous.

Editing this is a platform-level change (affects every project, every
scene). It lives in the workflow JSON for now; a future migration may
move it to `prompt_templates` to make it dashboard-editable.

---

## How the three combine

For a single image generation request, the prompt that hits Fal.ai is:

```text
[composition_prefix]   <- from prompt_templates row keyed by scenes.composition_prefix
[scene.image_prompt]   <- from scenes.image_prompt (40-80 word narrative subject)
[project.style_dna]    <- from projects.style_dna (locked)
```

…with the **universal negative prompt** sent as a separate
`negative_prompt` field on the Fal.ai payload (not concatenated to the
positive prompt).

A worked example for a Historical project, scene with `composition_prefix='low_angle'`:

```text
low angle shot looking up, subject towering above, dramatic perspective,
A lone figure in 1920s wool coat stands at the base of the New York Stock Exchange columns, dawn light cutting through brass railings, breath fogging in the cold air, the building's facade looming above against a bruised purple sky.
cinematic still frame, 1920s period accuracy, dramatic chiaroscuro lighting, 35mm film grain texture, desaturated muted color palette, deep shadows, documentary photorealism, volumetric fog, depth of field bokeh, 8K detail
```

Three sources of authorship in one prompt: the platform (composition),
the per-scene script (subject), and the project (style DNA). That's the
contract.
