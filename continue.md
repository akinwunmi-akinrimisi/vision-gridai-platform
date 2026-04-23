 I'm continuing work on Vision GridAI at branch main (commit 4643b27 or                                                                                            
  later — Sprint S0 of the Intelligence Layer is already landed).
  
  Start Sprint S1: Intelligence Foundation (CF01 Outlier + CF02 SEO + CF03 RPM).

  Read first, in this order:
    1. memory/project_intelligence_layer.md  — current state + decisions
    2. docs/INTELLIGENCE_LAYER_IMPLEMENTATION.md  — master reconciliation
    3. docs/intelligence/VisionGridAI_MASTER_Implementation_Guide.md  — sprint prompts
    4. docs/intelligence/features_intelligence.md  — F01/F02/F03 specs
    5. docs/intelligence/agent_intelligence.md  — OutlierIntelligenceAgent + SEOScoringAgent definitions
    6. docs/intelligence/integrations_intelligence.md  — YouTube API endpoints + quota
    7. docs/intelligence/prompts/outlier_intelligence.md + topic_scorer.md  — production prompts
    8. supabase/migrations/010_intelligence_foundation.sql  — empty stub to fill

  Non-negotiable invariants from the 6 locked decisions:
    - All Claude API calls use claude-opus-4-6 (no Sonnet)
    - CF18 is OUT — do NOT build a cost optimizer
    - Extend /project/:id/analytics, don't create /analytics
    - Extend ProjectsHome, don't create /niches
    - Competitor monitor extends WF_YOUTUBE_DISCOVERY (leave that for S2)
    - All new docs live at docs/intelligence/

  Build order for S1:
    1. Fill migration 010_intelligence_foundation.sql (ALTER topics,
       ALTER projects, CREATE rpm_benchmarks with seed, CREATE keywords +
       topic_keywords). Apply to live Supabase.
    2. Build WF_OUTLIER_SCORE (n8n). Fires after WF_TOPIC_GENERATE. Uses
       docs/intelligence/prompts/outlier_intelligence.md.
    3. Build WF_SEO_SCORE (n8n). Runs parallel. Uses topic_scorer.md.
    4. Build WF_KEYWORD_SCAN (n8n). Populates keywords table.
    5. Extend WF_NICHE_RESEARCH with RPM classification step (CF03).
    6. Build Keywords dashboard page at /project/:id/keywords (use
       frontend-design skill; read design-system/MASTER.md; use
       @frontend-developer agent; respect existing metric-card /
       glass-card / btn-* / card-elevated / progress-bar classes).
    7. Extend Gate 1 Topic Review: add outlier + SEO badges, combined
       score, Recommended badge on top 5, dual-axis scatter, sort/filter.
    8. Add "Keywords" sidebar nav entry.

  Quality gates:
    - gstack /careful for the migration
    - gstack /qa after each n8n workflow
    - Frontend Developer agent for all UI
    - gstack /review before marking S1 complete

  When done, commit as "feat(intelligence): Sprint S1 — foundation layer
  (CF01 + CF02 + CF03)" and update memory/project_intelligence_layer.md
  with Sprint S1 completion notes. Then ask whether to proceed to Sprint S2.

  Memory now records: architectural baseline (refactor complete at aa94932), Intelligence Layer project with S0 state + 6 decisions + continuation prompt. Close    
  this window when ready.