  ▎ Run /qa https://dashboard.operscale.cloud at Standard tier. Post-remediation validation of the 2026-04-21 security     
  ▎ audit fixes (migration 030 RLS, CSP/CSRF, JWT rotation, supabase-js shim). Most recent commit is 792c23b. PIN gate:    
  ▎ VITE_PIN_HASH in dashboard/.env is the SHA-256 of the plaintext PIN — the unhashed value isn't stored; you'll need to  
  ▎ ask the user for the PIN or inspect PinGate behavior. Test the full nav tree: ProjectsHome, ProjectDashboard, Research,
  ▎  NicheResearch, TopicReview, TopicDetail, ScriptReview, VideoReview, ProductionMonitor, Analytics, ChannelAnalyzer,    
  ▎ YouTubeDiscovery, IntelligenceHub, Keywords, DailyIdeas, AICoach, EngagementHub, ContentCalendar, ShortsCreator,       
  ▎ SocialPublisher, Settings. Flag anything where the new sb_query shim (dashboard/src/lib/supabase.js) returns empty or  
  ▎ errors, plus any lingering Realtime/WebSocket console noise. docs/SECURITY_REMEDIATION_2026_04_21_STATUS.md has the    
  ▎ full remediation context.