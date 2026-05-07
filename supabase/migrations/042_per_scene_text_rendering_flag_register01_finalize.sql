-- 042 register-01 finalize: REGISTER_01_ECONOMIST got the schema example
-- in the first 042 run but not the prose instruction (its source prompt
-- said "Return ONLY JSON array" without the leading 'a', so the narrower
-- pattern in 042 didn't match. The fixup migration handled the other 4
-- but excluded REGISTER_01 because its prompt already contained
-- "requires_text_rendering" — the schema example. This migration adds
-- the missing prose so Claude knows when to flip the flag, not just that
-- the field exists.

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb(
    regexp_replace(
      config->>'metadata_prompt',
      'Return ONLY (a |an )?JSON array',
      E'(4) requires_text_rendering: boolean. Set TRUE only when the scene''s meaning depends on the viewer reading words/numbers ON the rendered image — chart labels and axis values, document headlines, app/UI text, signage, headlines on a newspaper or magazine cover, billboard copy, screen contents, infographic numerics, monitor displays where the data is the point. Set FALSE when text would be incidental, blurred, or merely stylistic background.\n\nReturn ONLY a JSON array',
      'g'
    )
  ),
  true
)
WHERE register_id = 'REGISTER_01_ECONOMIST'
  AND config->>'metadata_prompt' NOT LIKE '%requires_text_rendering: boolean%';

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM production_registers
  WHERE config->>'metadata_prompt' NOT LIKE '%requires_text_rendering: boolean%'
     OR config->>'metadata_prompt' NOT LIKE '%"requires_text_rendering": false}]%';
  IF c > 0 THEN
    RAISE EXCEPTION 'Finalize 042 failed: % register(s) still missing fields', c;
  END IF;
END $$;
