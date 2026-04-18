SELECT
  s.scene_number,
  s.composition_prefix,
  s.image_prompt AS scene_subject,
  t.register_era_detected,
  CASE
    WHEN t.production_register = 'REGISTER_05_ARCHIVE'
      AND t.register_era_detected IS NOT NULL
      AND pr.config->'image_anchors_by_era' ? t.register_era_detected
    THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
    ELSE pr.config->>'image_anchors'
  END AS resolved_register_anchors,
  p.style_dna,
  LENGTH(
    COALESCE(s.composition_prefix,'') || ' ' || COALESCE(s.image_prompt,'') || ' ' ||
    CASE
      WHEN t.production_register = 'REGISTER_05_ARCHIVE'
        AND t.register_era_detected IS NOT NULL
        AND pr.config->'image_anchors_by_era' ? t.register_era_detected
      THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
      ELSE pr.config->>'image_anchors'
    END || ' ' || COALESCE(p.style_dna,'')
  ) AS resolved_prompt_length_chars,
  (
    CASE
      WHEN t.production_register = 'REGISTER_05_ARCHIVE'
        AND t.register_era_detected IS NOT NULL
        AND pr.config->'image_anchors_by_era' ? t.register_era_detected
      THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
      ELSE pr.config->>'image_anchors'
    END
  ) LIKE '%Kodachrome%' AS contains_kodachrome,
  (
    CASE
      WHEN t.production_register = 'REGISTER_05_ARCHIVE'
        AND t.register_era_detected IS NOT NULL
        AND pr.config->'image_anchors_by_era' ? t.register_era_detected
      THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
      ELSE pr.config->>'image_anchors'
    END
  ) LIKE '%Life magazine%' AS contains_life_magazine
FROM scenes s
JOIN topics t ON t.id = s.topic_id
JOIN projects p ON p.id = s.project_id
JOIN production_registers pr ON pr.register_id = t.production_register
WHERE t.id = '2967980a-31b3-4fa0-978d-4e9aea011e73'
  AND s.scene_number IN (1, 50, 150)
ORDER BY s.scene_number;
