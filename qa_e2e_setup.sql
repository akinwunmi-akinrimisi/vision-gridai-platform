-- E2E UI Test Setup — simulates data at every gate/pipeline stage.
-- Fixed UUIDs with 'e2e' prefix for traceability.
-- All marked with review_status='qa_e2e' where applicable for cleanup.

BEGIN;

-- 1) Create the E2E project
INSERT INTO projects (id, name, niche, niche_description, channel_style, target_video_count, status)
VALUES (
  'e2e00000-0000-0000-0000-000000000001',
  'QA E2E Test',
  'Personal Finance',
  'E2E smoke: full pipeline UI walkthrough across all gates',
  '2hr_documentary',
  5,
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Register recommendations payload (reused across topics)
-- Matches shape expected by TopicRegisterGate + RegisterSelector.

-- Topic A: PRE-GATE-1 — fresh, pending review, no register analysis yet
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook, key_segments,
  scene_count, review_status, status)
VALUES (
  'e2e00000-0000-0000-0000-00000000000a',
  'e2e00000-0000-0000-0000-000000000001',
  1, 1, 'The Mathematician',
  'E2E-A: Pre-Gate-1 baseline topic',
  'E2E-A: Why 80% of Americans Are Losing $12,000 Per Year on Credit Card Interest',
  'The invisible drain on American household wealth that nobody talks about because the industry profits from it.',
  'Chapter 1: The Scale / Chapter 2: The Math / Chapter 3: The Escape',
  0, 'pending', 'pending'
);

-- Topic B + C: GATE 1 ACTIVE — register_recommendations present, no register_selected_at
-- Banner should show 2 topics
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook, key_segments,
  scene_count, review_status, status,
  register_recommendations, production_register, register_era_detected, niche_variant, register_analyzed_at)
VALUES
(
  'e2e00000-0000-0000-0000-00000000000b',
  'e2e00000-0000-0000-0000-000000000001',
  2, 1, 'Premium Authority',
  'E2E-B: Gate 1 register-pending (Premium)',
  'E2E-B: The Amex Centurion Black Card Experience at a Private Italian Villa',
  'A week of private concierge service, Michelin dining, and Aegean yacht charters on the metal card.',
  'Chapter 1: The Invitation / Chapter 2: The Villa / Chapter 3: The Verdict',
  0, 'pending', 'pending',
  jsonb_build_object(
    'analyzed_at', (now() - interval '30 seconds')::text,
    'model', 'claude-haiku-4-5-20251001',
    'era_detected', null,
    'niche_variant', 'travel_lifestyle',
    'notes', 'E2E test payload — strong Premium signals (luxury product names, HNW lifestyle).',
    'top_2', jsonb_build_array(
      jsonb_build_object('register_id', 'REGISTER_02_PREMIUM', 'confidence', 0.93, 'reasoning', 'Luxury editorial register match. Centurion Black Card, private Italian villa, Michelin dining, yacht charters — canonical HNW cardholder positioning.', 'reference_channels', jsonb_build_array('Bloomberg Originals', 'Rolex brand films')),
      jsonb_build_object('register_id', 'REGISTER_01_ECONOMIST', 'confidence', 0.15, 'reasoning', 'Minor analytical framing in the review segment.', 'reference_channels', jsonb_build_array('Johnny Harris'))
    ),
    'all_5_ranked', jsonb_build_array(
      jsonb_build_object('register_id', 'REGISTER_02_PREMIUM', 'confidence', 0.93, 'reasoning', 'Luxury editorial dominant.'),
      jsonb_build_object('register_id', 'REGISTER_01_ECONOMIST', 'confidence', 0.15, 'reasoning', 'Minor analytical framing.'),
      jsonb_build_object('register_id', 'REGISTER_05_ARCHIVE', 'confidence', 0.08, 'reasoning', 'No historical framing.'),
      jsonb_build_object('register_id', 'REGISTER_04_SIGNAL', 'confidence', 0.04, 'reasoning', 'No tech.'),
      jsonb_build_object('register_id', 'REGISTER_03_NOIR', 'confidence', 0.02, 'reasoning', 'No investigation framing.')
    )
  ),
  'REGISTER_02_PREMIUM', null, 'travel_lifestyle', now() - interval '30 seconds'
),
(
  'e2e00000-0000-0000-0000-00000000000c',
  'e2e00000-0000-0000-0000-000000000001',
  3, 1, 'Investigative Noir',
  'E2E-C: Gate 1 register-pending (Noir)',
  'E2E-C: The $500 Million Credit Card Fraud That Regulators Ignored for 12 Years',
  'A predatory scheme targeting retirees, exposed by leaked internal memos and whistleblower testimony.',
  'Chapter 1: The Victims / Chapter 2: The Scheme / Chapter 3: The Coverup',
  0, 'pending', 'pending',
  jsonb_build_object(
    'analyzed_at', (now() - interval '20 seconds')::text,
    'model', 'claude-haiku-4-5-20251001',
    'era_detected', null,
    'niche_variant', 'financial_fraud',
    'notes', 'E2E test payload — strong Noir signals.',
    'top_2', jsonb_build_array(
      jsonb_build_object('register_id', 'REGISTER_03_NOIR', 'confidence', 0.96, 'reasoning', 'True-crime investigation match. Predatory scheme targeting retirees, whistleblower testimony, 12-year regulatory failure.', 'reference_channels', jsonb_build_array('LEMMiNO', 'Netflix Dirty Money')),
      jsonb_build_object('register_id', 'REGISTER_01_ECONOMIST', 'confidence', 0.22, 'reasoning', 'Numeric framing.', 'reference_channels', jsonb_build_array('Wendover'))
    ),
    'all_5_ranked', jsonb_build_array(
      jsonb_build_object('register_id', 'REGISTER_03_NOIR', 'confidence', 0.96, 'reasoning', 'Investigation dominant.'),
      jsonb_build_object('register_id', 'REGISTER_01_ECONOMIST', 'confidence', 0.22, 'reasoning', 'Numeric framing.'),
      jsonb_build_object('register_id', 'REGISTER_05_ARCHIVE', 'confidence', 0.10, 'reasoning', 'Past-tense retrospective.'),
      jsonb_build_object('register_id', 'REGISTER_02_PREMIUM', 'confidence', 0.03, 'reasoning', 'No luxury.'),
      jsonb_build_object('register_id', 'REGISTER_04_SIGNAL', 'confidence', 0.02, 'reasoning', 'No tech.')
    )
  ),
  'REGISTER_03_NOIR', null, 'financial_fraud', now() - interval '20 seconds'
);

-- Topic D: POST-GATE-1 — approved + register confirmed, script not yet generated
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook,
  scene_count, review_status, status,
  register_recommendations, production_register, niche_variant, register_selected_at, register_analyzed_at)
VALUES (
  'e2e00000-0000-0000-0000-00000000000d',
  'e2e00000-0000-0000-0000-000000000001',
  4, 2, 'Your Exact Life',
  'E2E-D: Approved, register confirmed, pre-script',
  'E2E-D: Approved + Register Confirmed, Awaiting Script Generation',
  'Post-Gate-1 state.',
  0, 'approved', 'approved',
  jsonb_build_object('top_2', jsonb_build_array(jsonb_build_object('register_id', 'REGISTER_01_ECONOMIST', 'confidence', 0.88))),
  'REGISTER_01_ECONOMIST', 'primary', now() - interval '5 minutes', now() - interval '6 minutes'
);

-- Topic E: GATE 2 ACTIVE — script generated, script_review_status=pending
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook,
  scene_count, review_status, status,
  production_register, niche_variant, register_selected_at,
  script_json, script_metadata, word_count, script_attempts, script_quality_score, script_evaluation, script_pass_scores,
  script_review_status)
VALUES (
  'e2e00000-0000-0000-0000-00000000000e',
  'e2e00000-0000-0000-0000-000000000001',
  5, 2, 'Your Exact Life',
  'E2E-E: Gate 2 pending script review',
  'E2E-E: The 3-Card Wallet Strategy That Pays for Your Vacation Every Year',
  'Meet Marcus. He is 34, a software engineer pulling in $145K. With the right 3-card wallet...',
  0, 'approved', 'scripted',
  'REGISTER_01_ECONOMIST', 'primary', now() - interval '30 minutes',
  jsonb_build_object(
    'combined_text', repeat('This is the simulated script text for E2E Gate 2 testing. The three-card wallet strategy rests on three pillars: sign-up bonus stacking, category multiplier optimization, and annual-fee justification via travel credits. ', 180),
    'pass_1', 'Pass 1 content...',
    'pass_2', 'Pass 2 content...',
    'pass_3', 'Pass 3 content...'
  ),
  jsonb_build_object('video_metadata', jsonb_build_object('title', 'E2E-E Test Title', 'tags', jsonb_build_array('credit cards','rewards','travel hacking'))),
  19200, 1, 7.8,
  jsonb_build_object(
    'persona_integration', 8, 'hook_strength', 9, 'pacing', 7, 'specificity', 8,
    'tts_readability', 7, 'visual_prompts', 8, 'anti_patterns', 7
  ),
  jsonb_build_object(
    'pass_1', jsonb_build_object('final_score', 7.6, 'attempts', 1, 'verdict', 'PASS'),
    'pass_2', jsonb_build_object('final_score', 8.0, 'attempts', 1, 'verdict', 'PASS'),
    'pass_3', jsonb_build_object('final_score', 7.8, 'attempts', 1, 'verdict', 'PASS')
  ),
  'pending'
);

-- Topic F: COST_SELECTION — script approved, waiting on cost calculator
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook,
  scene_count, review_status, status, script_review_status,
  production_register, niche_variant, register_selected_at, pipeline_stage, production_mode,
  script_json, word_count, script_quality_score, script_attempts)
VALUES (
  'e2e00000-0000-0000-0000-00000000000f',
  'e2e00000-0000-0000-0000-000000000001',
  6, 1, 'The Mathematician',
  'E2E-F: Cost calculator gate',
  'E2E-F: Pipeline stopped at cost_selection gate',
  'Awaiting cost/mode selection.',
  172, 'approved', 'segmented', 'approved',
  'REGISTER_01_ECONOMIST', 'primary', now() - interval '20 minutes',
  'cost_selection', null,
  jsonb_build_object('combined_text', 'Simulated'),
  18900, 7.9, 1
);

-- Topic G: REGISTER_SELECTION (legacy) — ProductionMonitor RegisterSelector gate
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook,
  scene_count, review_status, status, script_review_status,
  register_recommendations, register_era_detected, production_mode, pipeline_stage, register_analyzed_at,
  script_json, word_count, script_quality_score)
VALUES (
  'e2e00000-0000-0000-0000-000000000010',
  'e2e00000-0000-0000-0000-000000000001',
  7, 3, 'The Investigator',
  'E2E-G: Legacy register selection gate',
  'E2E-G: Pipeline stopped at legacy register_selection gate (ProductionMonitor)',
  'Awaiting user register confirmation via legacy path.',
  172, 'approved', 'segmented', 'approved',
  jsonb_build_object(
    'analyzed_at', (now() - interval '2 minutes')::text,
    'top_2', jsonb_build_array(
      jsonb_build_object('register_id', 'REGISTER_01_ECONOMIST', 'confidence', 0.87, 'reasoning', 'Documentary explainer match for credit-card analytical content.', 'reference_channels', jsonb_build_array('Johnny Harris')),
      jsonb_build_object('register_id', 'REGISTER_02_PREMIUM', 'confidence', 0.11, 'reasoning', 'Some premium product mentions.', 'reference_channels', jsonb_build_array('Bloomberg Originals'))
    ),
    'all_5_ranked', jsonb_build_array(
      jsonb_build_object('register_id', 'REGISTER_01_ECONOMIST', 'confidence', 0.87, 'reasoning', 'Analytical.'),
      jsonb_build_object('register_id', 'REGISTER_02_PREMIUM', 'confidence', 0.11, 'reasoning', 'Premium.'),
      jsonb_build_object('register_id', 'REGISTER_03_NOIR', 'confidence', 0.01, 'reasoning', 'None.'),
      jsonb_build_object('register_id', 'REGISTER_05_ARCHIVE', 'confidence', 0.01, 'reasoning', 'None.'),
      jsonb_build_object('register_id', 'REGISTER_04_SIGNAL', 'confidence', 0.00, 'reasoning', 'None.')
    ),
    'era_detected', null, 'notes', 'E2E test payload.'
  ),
  null, 'BALANCED', 'register_selection', now() - interval '2 minutes',
  jsonb_build_object('combined_text', 'Simulated'), 18500, 7.6
);

-- Topic H: PRODUCTION IN PROGRESS — scenes partly populated
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook,
  scene_count, review_status, status, script_review_status,
  production_register, niche_variant, register_selected_at, pipeline_stage,
  audio_progress, images_progress, i2v_progress, t2v_progress, assembly_status,
  script_json, word_count, script_quality_score)
VALUES (
  'e2e00000-0000-0000-0000-000000000011',
  'e2e00000-0000-0000-0000-000000000001',
  8, 1, 'The Mathematician',
  'E2E-H: Production in progress',
  'E2E-H: Mid-production — TTS 60%, Images 40%',
  'Simulated mid-flight production state.',
  30, 'approved', 'producing', 'approved',
  'REGISTER_01_ECONOMIST', 'primary', now() - interval '1 hour',
  'tts',
  'done:18/30', 'done:12/30', 'pending', 'pending', 'pending',
  jsonb_build_object('combined_text', 'Simulated'), 3400, 7.7
);

-- Fake scenes for Topic H (30 scenes, varying statuses)
INSERT INTO scenes (id, topic_id, project_id, scene_number, scene_id, narration_text, visual_type,
  audio_duration_ms, audio_status, image_status, clip_status)
SELECT
  gen_random_uuid(),
  'e2e00000-0000-0000-0000-000000000011',
  'e2e00000-0000-0000-0000-000000000001',
  n,
  'scene_' || LPAD(n::text, 3, '0'),
  'Simulated narration for scene ' || n || '.',
  'static_image',
  10000 + (n * 200),
  CASE WHEN n <= 18 THEN 'uploaded' WHEN n <= 22 THEN 'generated' ELSE 'pending' END,
  CASE WHEN n <= 12 THEN 'uploaded' WHEN n = 13 THEN 'failed' WHEN n <= 15 THEN 'generated' ELSE 'pending' END,
  CASE WHEN n <= 8 THEN 'uploaded' ELSE 'pending' END
FROM generate_series(1, 30) n;

-- Topic I: GATE 3 ACTIVE — assembled, pending video review
INSERT INTO topics (id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook,
  scene_count, review_status, status, script_review_status,
  production_register, niche_variant, register_selected_at,
  audio_progress, images_progress, i2v_progress, assembly_status,
  drive_video_url, thumbnail_url, total_cost, cost_breakdown,
  video_review_status, script_json, word_count, script_quality_score)
VALUES (
  'e2e00000-0000-0000-0000-000000000012',
  'e2e00000-0000-0000-0000-000000000001',
  9, 2, 'Your Exact Life',
  'E2E-I: Gate 3 video review',
  'E2E-I: Assembled MP4 awaiting Gate 3 review',
  'Complete, pending publish approval.',
  172, 'approved', 'assembled', 'approved',
  'REGISTER_01_ECONOMIST', 'primary', now() - interval '3 hours',
  'complete', 'complete', 'complete', 'uploaded',
  'https://drive.google.com/file/d/FAKE_E2E_I_VIDEO_ID/view',
  'https://drive.google.com/uc?id=FAKE_E2E_I_THUMB',
  13.76,
  jsonb_build_object('script', 1.8, 'tts', 0.3, 'images', 6.88, 'i2v', 0.0, 'ken_burns', 0, 'assembly', 0, 'thumbnail', 0.03, 'metadata', 0.05),
  'pending',
  jsonb_build_object('combined_text', 'Simulated'), 19200, 7.8
);

COMMIT;

SELECT 'Setup complete. 9 topics + 30 scenes inserted.' AS status;
SELECT topic_number, seo_title, status, pipeline_stage, review_status, script_review_status, video_review_status,
  register_selected_at IS NOT NULL AS reg_conf
FROM topics WHERE project_id='e2e00000-0000-0000-0000-000000000001' ORDER BY topic_number;
