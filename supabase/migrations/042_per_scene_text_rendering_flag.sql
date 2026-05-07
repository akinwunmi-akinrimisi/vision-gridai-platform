-- 042_per_scene_text_rendering_flag.sql
-- Source-of-truth fix for the image-routing bug discovered 2026-05-07 on
-- topic 4 (Australia vs Norway). Script-gen now decides per-scene whether
-- the image needs legible text rendering (true → Recraft V3 in production,
-- false → Flux Schnell). Adds the same instruction to every production
-- register's metadata_prompt so the change is uniform across niches.
--
-- The Visual Assignment Claude call in WF_SCRIPT_GENERATE asks for the new
-- field; Build Scenes Array persists it; WF_SCENE_IMAGE_PROCESSOR routes
-- on it. See session_2026_05_07_topic4_halted_image_routing_bugs.md for
-- the bug autopsy and routing rationale.

-- Append the instruction to each register's metadata_prompt and update the
-- expected JSON schema example so Claude returns the field.
-- We splice the instructions BEFORE the existing "Return ONLY a JSON array"
-- line so the schema example reflects the new contract.

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      'Return ONLY a JSON array',
      E'(4) requires_text_rendering: boolean. Set TRUE only when the scene''s meaning depends on the viewer reading words/numbers ON the rendered image — chart labels and axis values, document headlines, app/UI text, signage, headlines on a newspaper or magazine cover, billboard copy, screen contents, infographic numerics, monitor displays where the data is the point. Set FALSE when text would be incidental, blurred, or merely stylistic background (e.g. "papers on a desk" without a readable headline).\n\nReturn ONLY a JSON array',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' IS NOT NULL
  AND config->>'metadata_prompt' NOT LIKE '%requires_text_rendering%';

-- Update each register's expected JSON schema example to include the new key.
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      '"chapter": "\.\.\."\}\]',
      '"chapter": "...", "requires_text_rendering": false}]',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' IS NOT NULL
  AND config->>'metadata_prompt' LIKE '%"chapter": "..."%'
  AND config->>'metadata_prompt' NOT LIKE '%"requires_text_rendering": false}]%';

-- Verify: every register's metadata_prompt should now mention requires_text_rendering.
DO $$
DECLARE
  missing_count int;
BEGIN
  SELECT count(*) INTO missing_count
  FROM production_registers
  WHERE config->>'metadata_prompt' IS NOT NULL
    AND config->>'metadata_prompt' NOT LIKE '%requires_text_rendering%';
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Migration 042 failed: % register(s) still missing requires_text_rendering instruction', missing_count;
  END IF;
END $$;
