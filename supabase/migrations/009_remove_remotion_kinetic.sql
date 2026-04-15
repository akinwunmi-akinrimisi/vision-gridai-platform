-- Migration 009: Remove Remotion hybrid rendering + Kinetic Typography
-- Applied: 2026-04-15
--
-- Supersedes migrations 005 (remotion_hybrid_rendering) + 006/008 (kinetic_typography).
-- Those migrations remain on disk as history; this migration removes the schema
-- artifacts they created, after removing the corresponding code from dashboard + n8n.
--
-- Preconditions verified before this migration:
--   1. 5 n8n workflows deleted (WF_SCENE_CLASSIFY, WF_REMOTION_RENDER,
--      WF_KINETIC_TRIGGER, WF_KINETIC_POLL, WF_KINETIC_COMPLETE)
--   2. 1 n8n workflow renamed (WF_KINETIC_DRIVE_UPLOAD -> WF_DRIVE_UPLOAD,
--      webhook path /kinetic/drive-upload -> /drive-upload)
--   3. All active workflows scanned: zero references to any dropped column/table
--   4. Dashboard rebuilt + deployed without kinetic/remotion code
--   5. VPS services kinetic-typo.service + Remotion :3100 stopped & removed
--   6. /opt/kinetic-typo-engine deleted (14 GB freed)
--   7. Kinetic project "AI Automation Explainers" deleted with cascade
--
-- Rollback: restore from /root/backups/vgai-pre-remotion-kinetic-removal-*.sql

BEGIN;

-- Drop 3 tables (CASCADE drops FK constraints automatically)
DROP TABLE IF EXISTS public.remotion_templates CASCADE;
DROP TABLE IF EXISTS public.kinetic_scenes CASCADE;
DROP TABLE IF EXISTS public.kinetic_jobs CASCADE;

-- Drop 5 columns from scenes (Remotion hybrid rendering artifacts)
ALTER TABLE public.scenes DROP COLUMN IF EXISTS render_method;
ALTER TABLE public.scenes DROP COLUMN IF EXISTS data_payload;
ALTER TABLE public.scenes DROP COLUMN IF EXISTS remotion_template;
ALTER TABLE public.scenes DROP COLUMN IF EXISTS classification_reasoning;
ALTER TABLE public.scenes DROP COLUMN IF EXISTS classification_status;

-- Drop 1 column from topics (classification artifact)
ALTER TABLE public.topics DROP COLUMN IF EXISTS classification_status;

-- Drop 1 column from projects (dual-production-style artifact)
ALTER TABLE public.projects DROP COLUMN IF EXISTS production_style;

COMMIT;
