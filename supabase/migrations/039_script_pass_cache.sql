-- ─────────────────────────────────────────────────────────────────
--  039_script_pass_cache.sql
--  Cache per-pass script output so a Pass 2/3 fetch failure doesn't
--  force regeneration of the entire script (Pass 1 alone costs ~$0.30
--  in Claude Opus tokens; losing it 25 topics × 3 passes wastes real
--  money).
--
--  WF_SCRIPT_GENERATE will:
--    - At entry: read script_pass_cache; if pass_1 cached, emit it as
--      a synthetic Call Pass 1 result and skip the Claude call.
--    - After each successful Call Pass: PATCH script_pass_cache with
--      that pass's text + scores + completed_at.
--    - When Bulk Insert Scenes succeeds (full script committed):
--      clear the cache (no point holding 30KB JSONB after the script
--      is final).
--
--  Storage is bounded: 25 topics × ~30 KB max per pass × 3 passes
--  ≈ 2.25 MB worst case. Acceptable.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE topics ADD COLUMN IF NOT EXISTS script_pass_cache JSONB DEFAULT '{}'::jsonb;

-- Shape (documented; not enforced via CHECK):
-- {
--   "pass_1": {
--     "text": "...",                     -- Claude's raw pass output
--     "scores": { ... },                  -- evaluator output (composite_score, dimension scores, verdict)
--     "word_count": 8200,
--     "verdict": "PASS"|"FORCE_PASS"|"FAIL",
--     "attempt": 2,                       -- which retry attempt finally succeeded
--     "completed_at": "2026-04-29T09:30:12Z"
--   },
--   "pass_2": { ... },
--   "pass_3": { ... }
-- }

COMMENT ON COLUMN topics.script_pass_cache IS
  'Per-pass script output cache (pass_1/pass_2/pass_3). Cleared after Bulk Insert Scenes commits the final script.';
