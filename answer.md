(i) Inject AU-specific content via the 4 new variable slots above 

(i) Live in a post-Generator scoring node (P-GAP-SCORE-v1) that scores the 25 outputs and reranks 

 (i) Have an 8th optional dimension (regulatory_compliance) with weight=0 for General and weight=15% for AU 



  B1. AU disclaimers (AD-01..04): store in (i) prompt_templates rows with template_type='disclaimer' keyed by
  (country_target, disclaimer_id), 

  B2. Should we extend the intelligence renderer (migration 029) to pull from new AU sources — au_calendar_events,
  au_disclaimer_requirements, au_competitor_channels 


  - (i) Use the existing report with AU's 5 sub-niches feeding in (recommended)
 
  B4. competitor_channels table exists. AU plan's 20-channel seed (Sections 3.3 / 4.3 / 5.3 / 6.3 / 7.3) should populate   
  this directly.     run through the workflow so the analyses are fresh and WF_CHANNEL_ANALYZE populates channel_analyses
  consistently.

  C. Voice / brand decisions (product, not engineering)

 
  - (ii) AU voice per project (e.g. en-AU-Wavenet-D) — needs production_registers.config.tts_voice to grow a country-keyed 
  object, identical to the v3 image_anchors pattern. and must still sound human like what we've been using, zero robotic

  C2. Style DNA for AU is hardcoded in §11.1 ("Modern Finance / Premium — dark navy, blue accent, gold chip details…").    
  Currently Style DNA is generated dynamically per project at Phase A. For AU:
  - (ii) Have WF_STYLE_DNA produce something on-spec by feeding it the §11.1 spec as a constraint

  C3. Hub/spoke channel architecture (Strategy §10):

  - (iii) Full hub + 3 spokes 

  D. Workflow naming and routing

  D1. AU docs reference workflow names that don't exist (WF_TOPIC_INTELLIGENCE, WF_DEMONETIZATION_AUDIT, WF_COACH_REPORT,  
  WF_SEO_METADATA) and one that does (WF_REGISTER_ANALYZE at Miy5h5O7ncIIrnRg). Should we:

  - (ii) Generalize the names so they serve all countries (WF_TOPIC_INTELLIGENCE works for AU + future US daily-discovery +
   UK + Canada)

  D2. Where does the country-routing branch live?

  - (ii) In one shared WF_COUNTRY_ROUTER sub-workflow that resolves the prompt-key map for a given (workflow,
  country_target) and returns it.


  E. Failure modes / edge cases

  E1. What happens when a topic's country_target is AU but the AU sub-niche is null (operator entered free-form niche)?    
  Reject at Gate 1?

  E2. What happens when an AU project ships a video and the demonetization audit returns manual_review_required? Currently 
  no human-review queue exists. Is this:
  - (i) A new topics.compliance_review_status column + a dashboard inbox

  E3. Cost ceiling enforcement when cost_ceiling_usd is exceeded —  Soft warning? 

  F. Versioning + governance

  F1. When the General script_pass1 prompt is re-versioned (e.g., a future improvement): 
   auto-pickup with the lint-style check (_verify_script_template_vars) ensuring the country slots stay populated.

  F2. Who can edit AU disclaimers? The existing PromptCard UI is open to anyone with the dashboard. AU disclaimers are     
  legally sensitive (ASIC compliance). leave it open

  ---