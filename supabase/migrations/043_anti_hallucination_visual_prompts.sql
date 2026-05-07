-- 043_anti_hallucination_visual_prompts.sql
-- Adds anti-hallucination guardrail to all 5 production_registers metadata_prompts.
-- Diagnosis (2026-05-07 topic 4 audit): Claude's Visual Assignment was inventing
-- imagery that didn't appear in the chunk's narration — e.g. scene 50 narration
-- about "multiple generations choosing immediate gratification" got an image of
-- "engineering professional torn between technical diagrams" (no engineer, no
-- diagrams in the chunk). Cause: chunks were sent as a batch with a thin system
-- prompt; Claude drifted toward general topic semantics ("Norway/oil/economics")
-- rather than staying anchored to the specific 110-word chunk in front of it.
--
-- Fix: prepend an anti-hallucination preamble with two requirements:
--   1. Extract a key_visual_anchor — a concrete noun, person, action, or object
--      that LITERALLY appears in the chunk's narration text.
--   2. Build image_prompt around that anchor; never invent imagery that isn't
--      grounded in something the chunk actually says.
-- And one ban:
--   - Forbid abstract-only prompts ("universal lighting", "democratic potential
--     mood", "strategic engagement availability"). When narration is genuinely
--     abstract (emotion, statistic, policy), depict a relevant ACTION or PROP
--     drawn from the words on the page — not an invented profession or scene.
--
-- Forward-only: topic 4 already shipped, no retroactive regen.

-- Append the guardrail BEFORE the existing image_prompt instructions in each
-- register prompt. We anchor on "image_prompt:" since every register prompt has
-- an "(1) image_prompt: ..." line.

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      'For EACH chunk, generate(:|: ONLY)?',
      E'For EACH chunk, FIRST identify the key_visual_anchor: a concrete noun, person, action, prop, or place that LITERALLY appears in that chunk''s narration text. Build the image around the anchor — do not invent imagery (people, professions, objects, settings) that the chunk does not mention.\n\nIf the chunk is genuinely abstract (emotion, statistic, policy decision, generational pattern), depict a relevant ACTION or PROP drawn from the words on the page — never a vague figure with abstract lighting. BANNED phrases that produced bad outputs: "universal lighting", "democratic potential mood", "strategic engagement availability", "missed opportunity mood" without a concrete subject, "internal tension" without a specific gesture or object. Every prompt must name at least one CONCRETE thing a viewer could point at on screen.\n\nFor EACH chunk, generate\\1',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' IS NOT NULL
  AND config->>'metadata_prompt' NOT LIKE '%key_visual_anchor%';

-- Extend the per-chunk schema to require the anchor field. Replace existing
-- "(4) requires_text_rendering" with "(4) key_visual_anchor: ... (5) requires_text_rendering: ...".
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      '\(4\) requires_text_rendering:',
      E'(4) key_visual_anchor: 1-6 word string naming the concrete subject of the image_prompt (the prop, person, or scene that grounds it in the chunk''s narration).\n\n(5) requires_text_rendering:',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' IS NOT NULL
  AND config->>'metadata_prompt' NOT LIKE '%key_visual_anchor: %';

-- Update the JSON schema example to include key_visual_anchor.
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      '"chapter": "\.\.\.", "requires_text_rendering": false\}',
      '"chapter": "...", "key_visual_anchor": "...", "requires_text_rendering": false}',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' IS NOT NULL
  AND config->>'metadata_prompt' NOT LIKE '%"key_visual_anchor": "..."%';

-- Verify
DO $$
DECLARE
  missing_anchor int;
  missing_schema int;
BEGIN
  SELECT count(*) INTO missing_anchor FROM production_registers
  WHERE config->>'metadata_prompt' IS NOT NULL
    AND config->>'metadata_prompt' NOT LIKE '%key_visual_anchor%';
  SELECT count(*) INTO missing_schema FROM production_registers
  WHERE config->>'metadata_prompt' IS NOT NULL
    AND config->>'metadata_prompt' NOT LIKE '%"key_visual_anchor": "..."%';
  IF missing_anchor > 0 OR missing_schema > 0 THEN
    RAISE EXCEPTION '043 failed: % missing anchor instruction, % missing schema example', missing_anchor, missing_schema;
  END IF;
END $$;

-- Add column on scenes for forensic logging
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS key_visual_anchor TEXT;
