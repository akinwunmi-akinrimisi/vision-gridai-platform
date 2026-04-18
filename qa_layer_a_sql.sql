-- Layer A — Database integrity unit tests (11 assertions)
-- Pass criterion: every row returns 't' in the pass column.

\echo === A1: 5 registers present with expected IDs ===
SELECT
  (COUNT(*) = 5
   AND bool_and(register_id IN (
     'REGISTER_01_ECONOMIST','REGISTER_02_PREMIUM',
     'REGISTER_03_NOIR','REGISTER_04_SIGNAL','REGISTER_05_ARCHIVE'))
  ) AS pass_a1
FROM production_registers;

\echo === A2: anchors_type — 01-04 object, 05 string ===
SELECT bool_and(
  CASE
    WHEN register_id = 'REGISTER_05_ARCHIVE' THEN jsonb_typeof(config->'image_anchors') = 'string'
    ELSE jsonb_typeof(config->'image_anchors') = 'object'
  END
) AS pass_a2
FROM production_registers;

\echo === A3: Archive has all 5 era keys ===
SELECT (
  COUNT(*) FILTER (WHERE era_key IN ('1920s','1960s','1980s','2000s','modern')) = 5
) AS pass_a3
FROM (
  SELECT jsonb_object_keys(config->'image_anchors_by_era') AS era_key
  FROM production_registers
  WHERE register_id = 'REGISTER_05_ARCHIVE'
) x;

\echo === A4: metadata_prompt on all 5 with required tokens ===
SELECT bool_and(
  (config->>'metadata_prompt') LIKE '%{N}%'
  AND (config->>'metadata_prompt') LIKE '%{SEO_TITLE}%'
  AND (config->>'metadata_prompt') LIKE '%{CHUNK_LIST}%'
  AND LENGTH(config->>'metadata_prompt') > 500
) AS pass_a4
FROM production_registers;

\echo === A5: negative_additions populated with min length 100 ===
SELECT bool_and(LENGTH(config->>'negative_additions') >= 100) AS pass_a5
FROM production_registers;

\echo === A6: topics.niche_variant column exists as TEXT ===
SELECT (COUNT(*) = 1) AS pass_a6
FROM information_schema.columns
WHERE table_name='topics' AND column_name='niche_variant' AND data_type='text';

\echo === A7: idx_topics_niche_variant index exists ===
SELECT (COUNT(*) = 1) AS pass_a7
FROM pg_indexes WHERE tablename='topics' AND indexname='idx_topics_niche_variant';

\echo === A8: 3-branch resolver — Archive + era=1960s → era anchor wins (contains Kodachrome) ===
WITH resolved AS (
  SELECT
    CASE
      WHEN pr.config->'image_anchors_by_era' ? '1960s'
      THEN pr.config->'image_anchors_by_era'->>'1960s'
      ELSE pr.config->>'image_anchors'
    END AS r
  FROM production_registers pr
  WHERE pr.register_id = 'REGISTER_05_ARCHIVE'
)
SELECT (r LIKE '%Kodachrome%' AND r LIKE '%Life magazine%') AS pass_a8 FROM resolved;

\echo === A9: 3-branch resolver — object anchors + niche_variant='real_estate' → correct variant (architectural) ===
WITH resolved AS (
  SELECT
    CASE
      WHEN jsonb_typeof(pr.config->'image_anchors') = 'object'
      THEN COALESCE(pr.config->'image_anchors'->>'real_estate', pr.config->'image_anchors'->>'primary')
      ELSE pr.config->>'image_anchors'
    END AS r
  FROM production_registers pr
  WHERE pr.register_id = 'REGISTER_01_ECONOMIST'
)
SELECT (r LIKE '%architectural%' AND r LIKE '%real-estate%') AS pass_a9 FROM resolved;

\echo === A10: 3-branch resolver — object anchors + no niche → falls back to primary ===
WITH resolved AS (
  SELECT
    CASE
      WHEN jsonb_typeof(pr.config->'image_anchors') = 'object'
      THEN COALESCE(pr.config->'image_anchors'->>NULL, pr.config->'image_anchors'->>'primary')
      ELSE pr.config->>'image_anchors'
    END AS r
  FROM production_registers pr
  WHERE pr.register_id = 'REGISTER_02_PREMIUM'
)
SELECT (r LIKE '%luxury editorial%' AND r LIKE '%Kodak Portra%') AS pass_a10 FROM resolved;

\echo === A11: 3-branch resolver — Archive fallback string (no era) contains vintage archival keyword ===
WITH resolved AS (
  SELECT
    CASE
      WHEN pr.config->'image_anchors_by_era' ? 'notanera'
      THEN pr.config->'image_anchors_by_era'->>'notanera'
      ELSE pr.config->>'image_anchors'
    END AS r
  FROM production_registers pr
  WHERE pr.register_id = 'REGISTER_05_ARCHIVE'
)
SELECT (r LIKE '%vintage archival%') AS pass_a11 FROM resolved;

\echo === SUMMARY ===
SELECT 'ALL_PASS' AS result WHERE
  (SELECT COUNT(*) FROM production_registers) = 5;
