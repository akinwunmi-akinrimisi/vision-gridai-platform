-- 043 fixup: the original migration's pattern '\(4\) requires_text_rendering:'
-- didn't match because the actual register prompts have "(4) requires_text_rendering: boolean"
-- (with " boolean" suffix). The original regex matched the literal "(4) requires_text_rendering:"
-- across multiple registers but jsonb_set returned the same string when no match was found
-- on any specific row. This corrective uses the full "(4) requires_text_rendering: boolean" anchor.

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      '\(4\) requires_text_rendering: boolean',
      E'(4) key_visual_anchor: 1-6 word string naming the concrete subject of the image_prompt (the prop, person, or scene that grounds it in the chunk''s narration). (5) requires_text_rendering: boolean',
      'g'
    )
  ),
  true
)
WHERE config->>'metadata_prompt' NOT LIKE '%key_visual_anchor: 1-6 word string%';

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM production_registers
  WHERE config->>'metadata_prompt' NOT LIKE '%key_visual_anchor: 1-6 word string%';
  IF c > 0 THEN
    RAISE EXCEPTION '043 fixup failed: % register(s) still missing anchor instruction', c;
  END IF;
END $$;
