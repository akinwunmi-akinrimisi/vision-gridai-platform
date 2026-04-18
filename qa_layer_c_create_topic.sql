-- Create a throwaway test topic for Layer C webhook integration tests.
-- Uses an existing project (US Credit Cards) to avoid foreign-key gymnastics.
-- Marked review_status='qa_test' to make cleanup trivial.

INSERT INTO topics (
  id,
  project_id,
  topic_number,
  playlist_group,
  playlist_angle,
  original_title,
  seo_title,
  narrative_hook,
  key_segments,
  scene_count,
  review_status,
  status,
  primary_problem_trigger,
  target_audience_segment,
  psychographics
) VALUES (
  gen_random_uuid(),
  '75eb2712-ef3e-47b7-b8db-5be3740233ff',  -- US Credit Cards project
  99901,
  1,
  'QA Test',
  'QA-TEST: The Rise and Fall of 1960s American Kitchen Culture',
  'QA-TEST: The Rise and Fall of 1960s American Kitchen Culture',
  'In 1962, the American kitchen became a stage for a quiet revolution. Housewives across suburbia watched their gleaming new Frigidaires while Walter Cronkite delivered the evening news on the black-and-white Philco. The Formica countertop, the chrome appliances, the Kodachrome memories — this is the story of how a decade of cultural upheaval played out in 30 million living rooms.',
  'Chapter 1: The Suburban Dream (20 min) / Chapter 2: The Kitchen Revolution (25 min) / Chapter 3: Cultural Tension (30 min)',
  0,
  'qa_test',
  'qa_test',
  'Sentimental reflection on mid-century domestic life, longing for a perceived simpler era, curiosity about how ordinary objects mirrored social change',
  'Adults 45-70 with nostalgic interest in American post-war culture, history enthusiasts, documentary viewers',
  'Reflective, reverent toward the past, appreciates archival storytelling, prefers slow documentary pacing, watches Ken Burns style content'
) RETURNING id AS qa_topic_id;
