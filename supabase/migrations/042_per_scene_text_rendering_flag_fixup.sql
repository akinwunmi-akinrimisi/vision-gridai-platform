-- 042 fixup: 4 of 5 registers don't use "Return ONLY a JSON array" — they say
-- "Return ONLY JSON array" (no leading 'a'). Re-run with both variants and a
-- generic-tail fallback so the instruction lands on every register prompt.

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      'Return ONLY (a |an )?JSON array',
      E'(4) requires_text_rendering: boolean. Set TRUE only when the scene''s meaning depends on the viewer reading words/numbers ON the rendered image — chart labels and axis values, document headlines, app/UI text, signage, headlines on a newspaper or magazine cover, billboard copy, screen contents, infographic numerics, monitor displays where the data is the point. Set FALSE when text would be incidental, blurred, or merely stylistic background (e.g. "papers on a desk" without a readable headline).\n\nReturn ONLY a JSON array',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' IS NOT NULL
  AND config->>'metadata_prompt' NOT LIKE '%requires_text_rendering%';

-- Add the schema example for any register whose prompt didn't have one
-- (i.e. it currently ends "...JSON array. {CHUNK_LIST}" with no example).
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      'Return ONLY (a |an )?JSON array\.( \{CHUNK_LIST\})?',
      E'Return ONLY a JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "...", "requires_text_rendering": false}]. Do NOT modify narration. \\2',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' IS NOT NULL
  AND config->>'metadata_prompt' NOT LIKE '%"requires_text_rendering": false}]%';

-- Verify all 5 now have the field
DO $$
DECLARE
  missing_count int;
  missing_schema int;
BEGIN
  SELECT count(*) INTO missing_count
  FROM production_registers
  WHERE config->>'metadata_prompt' IS NOT NULL
    AND config->>'metadata_prompt' NOT LIKE '%requires_text_rendering%';
  SELECT count(*) INTO missing_schema
  FROM production_registers
  WHERE config->>'metadata_prompt' IS NOT NULL
    AND config->>'metadata_prompt' NOT LIKE '%"requires_text_rendering": false}]%';
  IF missing_count > 0 OR missing_schema > 0 THEN
    RAISE EXCEPTION '042 fixup failed: % missing instruction, % missing schema', missing_count, missing_schema;
  END IF;
  RAISE NOTICE 'OK: all registers updated';
END $$;
