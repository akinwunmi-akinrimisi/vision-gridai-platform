#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Vision GridAI Platform — Environment Setup + Skill Installer
# Run once on fresh Claude Code session: bash skills.sh
# ═══════════════════════════════════════════════════════════════

set -e
echo "══════════════════════════════════════════════════"
echo "  Vision GridAI Platform — Setup"
echo "══════════════════════════════════════════════════"

# ─── 1. VERIFY ENVIRONMENT ─────────────────────────────────

echo ""
echo "▶ Checking environment..."

# Check Docker
if command -v docker &> /dev/null; then
  echo "  ✅ Docker: $(docker --version | cut -d' ' -f3)"
else
  echo "  ❌ Docker not found"
fi

# Check n8n
if docker ps --format '{{.Names}}' | grep -q n8n; then
  echo "  ✅ n8n: running"
else
  echo "  ⚠️  n8n container not running"
fi

# Check FFmpeg
if docker exec n8n-n8n-1 ffmpeg -version &> /dev/null 2>&1; then
  echo "  ✅ FFmpeg: available in container"
elif command -v ffmpeg &> /dev/null; then
  echo "  ✅ FFmpeg: $(ffmpeg -version 2>&1 | head -1)"
else
  echo "  ❌ FFmpeg not found"
fi

# Check FFprobe
if docker exec n8n-n8n-1 ffprobe -version &> /dev/null 2>&1; then
  echo "  ✅ FFprobe: available in container"
elif command -v ffprobe &> /dev/null; then
  echo "  ✅ FFprobe: available"
else
  echo "  ❌ FFprobe not found"
fi

# Check Node.js
if command -v node &> /dev/null; then
  echo "  ✅ Node.js: $(node --version)"
else
  echo "  ❌ Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
  echo "  ✅ npm: $(npm --version)"
else
  echo "  ❌ npm not found"
fi

# Check Supabase
echo ""
echo "▶ Checking Supabase..."
SUPABASE_URL="${SUPABASE_URL:-https://supabase.operscale.cloud}"
SUPABASE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_ANON_KEY:-none}" 2>/dev/null || echo "000")
if [ "$SUPABASE_STATUS" = "200" ] || [ "$SUPABASE_STATUS" = "401" ]; then
  echo "  ✅ Supabase: reachable at ${SUPABASE_URL}"
else
  echo "  ⚠️  Supabase: not reachable (HTTP ${SUPABASE_STATUS}). Check SUPABASE_URL in .env"
fi

# Check Nginx
if command -v nginx &> /dev/null || systemctl is-active --quiet nginx 2>/dev/null; then
  echo "  ✅ Nginx: installed"
else
  echo "  ⚠️  Nginx not found — needed for dashboard hosting"
fi

# Check Superpowers
echo ""
echo "▶ Checking build methodology tools..."
if [ -d "docs/superpowers" ]; then
    SPEC_COUNT=$(find docs/superpowers/specs -name "*.md" 2>/dev/null | wc -l)
    PLAN_COUNT=$(find docs/superpowers/plans -name "*.md" 2>/dev/null | wc -l)
    echo "  ✅ Superpowers: $SPEC_COUNT specs, $PLAN_COUNT plans"
else
    echo "  ⚠️  Superpowers docs directory not found. Run setup."
fi

# Check frontend-design
if [ -d ".claude/skills/frontend-design" ]; then
    echo "  ✅ frontend-design skill: installed"
else
    echo "  ⚠️  frontend-design skill not installed"
fi

# Check gstack
if [ -d ".claude/skills/gstack" ]; then
    echo "  ✅ gstack skill: installed (selective use only)"
else
    echo "  ⚠️  gstack skill not installed"
fi

# Check FFmpeg capabilities for cinematic pipeline
echo ""
echo "▶ Checking FFmpeg cinematic capabilities..."
if docker exec n8n-n8n-1 ffmpeg -filters 2>/dev/null | grep -q zoompan; then
    echo "  ✅ FFmpeg zoompan filter (Ken Burns)"
else
    echo "  ⚠️  zoompan filter not found in FFmpeg"
fi
if docker exec n8n-n8n-1 ffmpeg -filters 2>/dev/null | grep -q xfade; then
    echo "  ✅ FFmpeg xfade filter (transitions)"
else
    echo "  ⚠️  xfade filter not found (requires FFmpeg 4.3+)"
fi
if docker exec n8n-n8n-1 ffmpeg -filters 2>/dev/null | grep -q colorbalance; then
    echo "  ✅ FFmpeg colorbalance filter (color grading)"
else
    echo "  ⚠️  colorbalance filter not found"
fi

# ─── 2. VERIFY n8n CREDENTIALS ─────────────────────────────

echo ""
echo "▶ Checking n8n credentials..."
N8N_URL="${N8N_URL:-https://n8n.srv1297445.hstgr.cloud}"
echo "  n8n URL: ${N8N_URL}"
echo "  Required credentials:"
echo "    - Anthropic API Key (httpHeaderAuth)"
echo "    - Google Cloud account (OAuth2 or Service Account)"
echo "    - Fal API Key (httpHeaderAuth, Key prefix)"
echo "    - Google Drive account (OAuth2)"
echo "    - YouTube account (OAuth2)"
echo "    - Supabase API Key (httpHeaderAuth)"
echo "    - TikTok account (OAuth2) — for shorts social posting"
echo "    - Instagram account (OAuth2 via Facebook) — for shorts social posting"
echo "    - Apify API Token (httpHeaderAuth) — for TikTok + Quora scraping"
echo "    - SerpAPI Key (httpHeaderAuth) — for People Also Ask extraction"
echo "    - Anthropic API Key (httpHeaderAuth) — for AI categorization via Haiku (direct, no proxy)"
echo "    - Reddit API credentials (client_id + secret) — for PRAW"
echo "  Verify all exist in n8n → Settings → Credentials"

# ─── 3. INSTALL LOBEHUB SKILLS ──────────────────────────────

echo ""
echo "▶ Installing LobeHub marketplace skills..."
echo "  (These provide Claude Code with reference docs for each technology)"

# Skills are installed via claude code skill marketplace
# The following is the manifest for Claude Code to reference

SKILLS=(
  # n8n
  "n8n-workflow-design"
  "n8n-hub"
  "n8n-expression-syntax"
  "n8n-custom-node-builder"
  
  # Google
  "google-drive"
  "google-sheets-cli"
  "google-workspace-cli-gog"
  
  # FFmpeg
  "ffmpeg-core"
  "ffmpeg-video-toolkit"
  "ffmpeg-reference"
  "video-processor"
  
  # YouTube
  "youtube-uploader"
  "youtube-data-api-v3"
  
  # AI & Automation
  "google-gemini-media"
  "api-credentials-manager"
  "automation-workflows"
  
  # Database & Frontend (NEW)
  "supabase-integration"
  "react-dashboard"
)

echo "  Skills manifest (${#SKILLS[@]} skills):"
for skill in "${SKILLS[@]}"; do
  echo "    - ${skill}"
done

echo ""
echo "  To install: Open Claude Code → Settings → Skills → Marketplace"
echo "  Search and install each skill listed above."
echo "  (Or use: claude skill install <name> for each)"

# ─── 4. CREATE DIRECTORY STRUCTURE ──────────────────────────

echo ""
echo "▶ Creating project directory structure..."

DIRS=(
  "directives"
  "directives/topic-intelligence"
  "execution"
  "dashboard/src/pages"
  "dashboard/src/components"
  "dashboard/src/hooks"
  "dashboard/src/lib"
  "dashboard/public"
  "supabase/migrations"
  "data"
  "workflows"
)

for dir in "${DIRS[@]}"; do
  mkdir -p "$dir"
  echo "  📁 ${dir}/"
done

# ─── 4b. INSTALL GSD (GET SHIT DONE) ────────────────────────

echo ""
echo "▶ Installing GSD (Get Shit Done) — structured build workflow..."

if command -v npx &> /dev/null; then
  if [ -d "$HOME/.claude/commands/gsd" ]; then
    echo "  ⏭️  GSD already installed globally at ~/.claude/commands/gsd/"
    echo "  To update: npx get-shit-done-cc@latest"
  else
    echo "  Installing GSD globally..."
    echo "  Run manually: npx get-shit-done-cc@latest"
    echo "  (Choose: Claude Code → Global)"
    echo ""
    echo "  After install, available commands:"
    echo "    /gsd:new-project      — Initialize project with questions + research + roadmap"
    echo "    /gsd:discuss-phase N  — Define implementation preferences before planning"
    echo "    /gsd:plan-phase N     — Research + create atomic task plans"
    echo "    /gsd:execute-phase N  — Build with parallel agents + fresh context per task"
    echo "    /gsd:verify-work N    — Manual acceptance testing of deliverables"
    echo "    /gsd:quick            — Ad-hoc tasks without full planning"
    echo "    /gsd:progress         — Check current state"
  fi
else
  echo "  ⚠️  npx not found — install Node.js first, then: npx get-shit-done-cc@latest"
fi

# ─── 4c. INSTALL UI UX PRO MAX ──────────────────────────────

echo ""
echo "▶ Installing UI UX Pro Max — design intelligence for dashboard..."

if command -v npm &> /dev/null; then
  if [ -d ".claude/skills/ui-ux-pro-max" ]; then
    echo "  ⏭️  UI UX Pro Max already installed at .claude/skills/ui-ux-pro-max/"
    echo "  To update: uipro update"
  else
    echo "  Installing uipro CLI globally..."
    npm install -g uipro-cli 2>/dev/null && echo "  ✅ uipro-cli installed" || echo "  ⚠️  npm install failed — run manually: npm install -g uipro-cli"
    
    echo "  Installing skill into project..."
    if command -v uipro &> /dev/null; then
      uipro init --ai claude 2>/dev/null && echo "  ✅ UI UX Pro Max skill installed" || echo "  ⚠️  uipro init failed — run manually: uipro init --ai claude"
    else
      echo "  Run manually after npm install: uipro init --ai claude"
    fi
  fi
  
  echo ""
  echo "  After install, generate the dashboard design system:"
  echo '    python3 .claude/skills/ui-ux-pro-max/scripts/search.py "AI video production dashboard" --design-system --persist -p "Vision GridAI"'
  echo ""
  echo "  Then for each page (optional, for page-specific overrides):"
  echo '    python3 .claude/skills/ui-ux-pro-max/scripts/search.py "real-time monitoring" --design-system --persist -p "Vision GridAI" --page "production-monitor"'
  echo '    python3 .claude/skills/ui-ux-pro-max/scripts/search.py "analytics revenue dashboard" --design-system --persist -p "Vision GridAI" --page "analytics"'
  echo '    python3 .claude/skills/ui-ux-pro-max/scripts/search.py "topic review approval cards" --design-system --persist -p "Vision GridAI" --page "topic-review"'
else
  echo "  ⚠️  npm not found — install Node.js first"
fi

# ─── 4d. INSTALL N8N AGENT COMMANDS (CHERRY-PICKED) ─────────

echo ""
echo "▶ Setting up n8n-specific Claude Code commands..."

N8N_COMMANDS_DIR=".claude/commands/n8n"
if [ ! -d "$N8N_COMMANDS_DIR" ]; then
  mkdir -p "$N8N_COMMANDS_DIR"
  
  # Create a minimal n8n workflow analysis command
  cat > "$N8N_COMMANDS_DIR/workflow-audit.md" << 'CMDEOF'
Analyze the n8n workflow at the given URL or JSON file. For each node:
1. Check if credentials are properly referenced (no hardcoded keys)
2. Verify error handling (continueOnFail or error outputs)
3. Check HTTP Request nodes use correct Supabase REST API patterns
4. Verify self-chaining: does the workflow fire the next workflow on completion?
5. Check progress tracking: does it write status updates to Supabase after each operation?
6. Verify checkpoint/resume: can this workflow resume from where it left off?

Report issues by priority (P0 = breaks pipeline, P1 = data loss risk, P2 = optimization).
CMDEOF

  cat > "$N8N_COMMANDS_DIR/supabase-query.md" << 'CMDEOF'
Generate the correct n8n HTTP Request node configuration for a Supabase query.
Input: describe what data you need (e.g., "all scenes for topic X where audio_status is pending")
Output: Complete HTTP Request node config with URL, headers, query parameters, and body.

Rules:
- Use PostgREST filter syntax: eq., neq., gt., lt., in., is., like.
- Always include apikey and Authorization headers
- For INSERT: use Prefer: return=representation to get the created row back
- For UPDATE: use PATCH, not PUT. Filter with ?id=eq.{{id}}
- For bulk reads: add &order=scene_number.asc and &limit=1000
CMDEOF

  echo "  ✅ Created n8n commands at $N8N_COMMANDS_DIR/"
  echo "    - /n8n:workflow-audit — Audit an n8n workflow for issues"
  echo "    - /n8n:supabase-query — Generate Supabase query for n8n"
else
  echo "  ⏭️  n8n commands already exist at $N8N_COMMANDS_DIR/"
fi

# ─── 4e. INSTALL AGENCY AGENTS (61 SPECIALISTS) ─────────────

echo ""
echo "▶ Installing Agency Agents (61 AI specialists)..."

AGENTS_DIR="$HOME/.claude/agents"
if [ -d "$AGENTS_DIR" ] && [ "$(ls -1 $AGENTS_DIR/*.md 2>/dev/null | wc -l)" -gt 50 ]; then
  echo "  ⏭️  Agency Agents already installed at $AGENTS_DIR/ ($(ls -1 $AGENTS_DIR/*.md | wc -l) agents)"
else
  if command -v git &> /dev/null; then
    echo "  Cloning agency-agents repo..."
    git clone --depth 1 https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents 2>/dev/null

    if [ -d "/tmp/agency-agents" ]; then
      mkdir -p "$AGENTS_DIR"
      
      # Copy all 61 agents from all 9 divisions
      for division in engineering design marketing product project-management testing support spatial-computing specialized; do
        if [ -d "/tmp/agency-agents/$division" ]; then
          cp /tmp/agency-agents/$division/*.md "$AGENTS_DIR/" 2>/dev/null
        fi
      done
      
      AGENT_COUNT=$(ls -1 "$AGENTS_DIR"/*.md 2>/dev/null | wc -l)
      echo "  ✅ Installed $AGENT_COUNT agents to $AGENTS_DIR/"
      echo ""
      echo "  Key agents for this project:"
      echo "    Engineering: Frontend Developer, Backend Architect, DevOps Automator, Security Engineer"
      echo "    Design: Image Prompt Engineer, UI Designer"
      echo "    Marketing: TikTok Strategist, Instagram Curator, Content Creator"
      echo "    Testing: API Tester, Workflow Optimizer, Performance Benchmarker"
      echo "    Specialized: Agents Orchestrator"
      echo ""
      echo "  All 61 agents auto-activate by context. No manual invocation needed."
      
      rm -rf /tmp/agency-agents
    else
      echo "  ⚠️  Git clone failed. Install manually:"
      echo "     git clone https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents"
      echo "     mkdir -p ~/.claude/agents && cp /tmp/agency-agents/*/*.md ~/.claude/agents/"
    fi
  else
    echo "  ⚠️  git not found. Install manually:"
    echo "     git clone https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents"
    echo "     mkdir -p ~/.claude/agents && cp /tmp/agency-agents/*/*.md ~/.claude/agents/"
  fi
fi

# ─── 4g. INSTALL SUPERPOWERS (PRIMARY BUILD METHODOLOGY) ─────
echo ""
echo "▶ Installing Superpowers (obra/superpowers) — primary build methodology..."

if [ -d ".claude/plugins/superpowers" ] || [ -f ".claude/plugins/superpowers/plugin.json" ]; then
    echo "  ⏭️  Superpowers already installed"
else
    echo "  Installing Superpowers plugin..."
    if command -v claude &> /dev/null; then
        echo "  Run in Claude Code: /plugin marketplace add obra/superpowers"
        echo "  Superpowers replaces GSD for all new work."
        echo "  Specs go to: docs/superpowers/specs/"
        echo "  Plans go to: docs/superpowers/plans/"
    else
        echo "  ⚠️  Claude Code CLI not found. Install Superpowers manually:"
        echo "  /plugin marketplace add obra/superpowers"
    fi
fi

mkdir -p docs/superpowers/specs docs/superpowers/plans
echo "  📁 docs/superpowers/specs/"
echo "  📁 docs/superpowers/plans/"

# ─── 4h. INSTALL FRONTEND-DESIGN SKILL ──────────────────────
echo ""
echo "▶ Installing Anthropic frontend-design skill..."

if [ -d ".claude/skills/frontend-design" ]; then
    echo "  ⏭️  frontend-design skill already installed"
else
    echo "  Installing frontend-design skill..."
    if command -v npx &> /dev/null; then
        npx skills add https://github.com/anthropics/skills --skill frontend-design 2>/dev/null && \
            echo "  ✅ frontend-design installed" || \
            echo "  ⚠️  Install failed. Run manually: npx skills add https://github.com/anthropics/skills --skill frontend-design"
    else
        echo "  ⚠️  npx not found. Run manually after Node.js install."
    fi
fi

# ─── 4i. INSTALL GSTACK (SELECTIVE COMMANDS) ─────────────────
echo ""
echo "▶ Installing gstack (garrytan/gstack) — selective quality commands..."

if [ -d ".claude/skills/gstack" ]; then
    echo "  ⏭️  gstack already installed"
else
    echo "  Installing gstack skill..."
    if command -v npx &> /dev/null; then
        npx skills add https://github.com/garrytan/gstack --skill gstack 2>/dev/null && \
            echo "  ✅ gstack installed" || \
            echo "  ⚠️  Install failed. Run manually: npx skills add https://github.com/garrytan/gstack --skill gstack"
    else
        echo "  ⚠️  npx not found. Run manually after Node.js install."
    fi
fi

echo ""
echo "  ⚠️  IMPORTANT: Only use these 5 gstack commands:"
echo "    /qa       — Quality assurance after completing a deliverable"
echo "    /browse   — Research Apify actors, API docs, third-party libs"
echo "    /careful  — Precision mode for scoring logic and AI prompts"
echo "    /freeze   — Lock state before merging into main codebase"
echo "    /review   — Full code review before marking phase complete"
echo "  DO NOT use gstack planning commands (/plan, /architect, /design)."
echo "  Superpowers handles all planning."

# ─── 5. CREATE .ENV TEMPLATE ────────────────────────────────

echo ""
echo "▶ Creating .env template..."

if [ ! -f .env ]; then
  cat > .env << 'EOF'
# ═══════════════════════════════════════════════════
# Vision GridAI Platform — Environment Variables
# NEVER commit this file to version control
# ═══════════════════════════════════════════════════

# n8n
N8N_URL=https://n8n.srv1297445.hstgr.cloud

# Supabase
SUPABASE_URL=https://supabase.operscale.cloud
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Dashboard
DASHBOARD_URL=https://dashboard.operscale.cloud
DASHBOARD_API_TOKEN=generate-a-random-token-here

# n8n Webhook Base
N8N_WEBHOOK_BASE=https://n8n.srv1297445.hstgr.cloud/webhook

# Google Cloud
GCP_PROJECT=vision-gridai
GCP_REGION=us-east5

# Note: API keys for Anthropic, Fal.ai, Google, YouTube, TikTok, and Instagram
# are stored in n8n's credential manager — NOT here.
# This file is for service URLs and tokens only.
EOF
  echo "  ✅ Created .env (edit with actual keys)"
else
  echo "  ⏭️  .env already exists, skipping"
fi

# ─── 6. SUPABASE MIGRATION TEMPLATE ─────────────────────────

echo ""
echo "▶ Creating Supabase migration template..."

if [ ! -f supabase/migrations/001_initial_schema.sql ]; then
  cat > supabase/migrations/001_initial_schema.sql << 'EOSQL'
-- ═══════════════════════════════════════════════════
-- Vision GridAI Platform — Initial Schema
-- Run: psql -h localhost -p 54321 -U postgres -f 001_initial_schema.sql
-- Or via Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

-- See Agent.md Section 3 for full schema documentation.
-- This file is generated from Agent.md and should be kept in sync.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  niche_description TEXT,
  channel_style TEXT DEFAULT '2hr_documentary',
  target_video_count INTEGER DEFAULT 25,
  niche_system_prompt TEXT,
  niche_expertise_profile TEXT,
  niche_red_ocean_topics TEXT[],
  niche_competitor_channels TEXT[],
  niche_pain_point_sources TEXT,
  niche_blue_ocean_strategy TEXT,
  playlist1_name TEXT,
  playlist1_theme TEXT,
  playlist2_name TEXT,
  playlist2_theme TEXT,
  playlist3_name TEXT,
  playlist3_theme TEXT,
  youtube_channel_id TEXT,
  youtube_playlist1_id TEXT,
  youtube_playlist2_id TEXT,
  youtube_playlist3_id TEXT,
  drive_root_folder_id TEXT,
  drive_assets_folder_id TEXT,
  script_approach TEXT DEFAULT '3_pass',
  images_per_video INTEGER DEFAULT 100,
  i2v_clips_per_video INTEGER DEFAULT 25,
  t2v_clips_per_video INTEGER DEFAULT 72,
  target_word_count INTEGER DEFAULT 19000,
  target_scene_count INTEGER DEFAULT 172,
  image_model TEXT DEFAULT 'fal-ai/bytedance/seedream/v4/text-to-image',
  image_cost DECIMAL(6,4) DEFAULT 0.030,
  i2v_model TEXT DEFAULT 'fal-ai/wan-25-preview/image-to-video',
  i2v_cost DECIMAL(6,4) DEFAULT 0.050,
  t2v_model TEXT DEFAULT 'fal-ai/wan-25-preview/text-to-video',
  t2v_cost DECIMAL(6,4) DEFAULT 0.050,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Niche Profiles
CREATE TABLE IF NOT EXISTS niche_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  competitor_analysis JSONB,
  audience_pain_points JSONB,
  keyword_research JSONB,
  blue_ocean_opportunities JSONB,
  search_queries_used TEXT[],
  search_results_raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prompt Configs
CREATE TABLE IF NOT EXISTS prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Topics
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  topic_number INTEGER NOT NULL,
  playlist_group INTEGER,
  playlist_angle TEXT,
  original_title TEXT,
  seo_title TEXT,
  narrative_hook TEXT,
  key_segments TEXT,
  estimated_cpm TEXT,
  viral_potential TEXT,
  review_status TEXT DEFAULT 'pending',
  review_feedback TEXT,
  refinement_history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  last_status_change TIMESTAMPTZ DEFAULT now(),
  error_log TEXT,
  script_json JSONB,
  script_metadata JSONB,
  word_count INTEGER,
  scene_count INTEGER,
  script_attempts INTEGER DEFAULT 0,
  script_force_passed BOOLEAN DEFAULT false,
  script_quality_score DECIMAL(3,1),
  script_evaluation JSONB,
  script_pass_scores JSONB,
  script_review_status TEXT DEFAULT 'pending',
  script_review_feedback TEXT,
  audio_progress TEXT DEFAULT 'pending',
  images_progress TEXT DEFAULT 'pending',
  i2v_progress TEXT DEFAULT 'pending',
  t2v_progress TEXT DEFAULT 'pending',
  assembly_status TEXT DEFAULT 'pending',
  drive_folder_id TEXT,
  drive_subfolder_ids JSONB,
  drive_video_url TEXT,
  youtube_url TEXT,
  youtube_video_id TEXT,
  youtube_caption_id TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  video_review_status TEXT DEFAULT 'pending',
  video_review_feedback TEXT,
  total_cost DECIMAL(8,2),
  cost_breakdown JSONB,
  yt_views INTEGER DEFAULT 0,
  yt_watch_hours DECIMAL(8,2) DEFAULT 0,
  yt_avg_view_duration TEXT,
  yt_avg_view_pct DECIMAL(5,2),
  yt_ctr DECIMAL(5,2),
  yt_impressions INTEGER DEFAULT 0,
  yt_likes INTEGER DEFAULT 0,
  yt_comments INTEGER DEFAULT 0,
  yt_subscribers_gained INTEGER DEFAULT 0,
  yt_estimated_revenue DECIMAL(8,2) DEFAULT 0,
  yt_actual_cpm DECIMAL(6,2),
  yt_last_updated TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  supervisor_alerted BOOLEAN DEFAULT false,
  force_regenerate BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Avatars
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  video_title_short TEXT,
  avatar_name_age TEXT,
  occupation_income TEXT,
  life_stage TEXT,
  pain_point TEXT,
  spending_profile TEXT,
  knowledge_level TEXT,
  emotional_driver TEXT,
  online_hangouts TEXT,
  objection TEXT,
  dream_outcome TEXT,
  review_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scenes
CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  scene_id TEXT NOT NULL,
  narration_text TEXT,
  image_prompt TEXT,
  visual_type TEXT,
  emotional_beat TEXT,
  chapter TEXT,
  audio_duration_ms INTEGER,
  audio_file_drive_id TEXT,
  audio_file_url TEXT,
  start_time_ms BIGINT,
  end_time_ms BIGINT,
  image_url TEXT,
  image_drive_id TEXT,
  video_url TEXT,
  video_drive_id TEXT,
  audio_status TEXT DEFAULT 'pending',
  image_status TEXT DEFAULT 'pending',
  video_status TEXT DEFAULT 'pending',
  clip_status TEXT DEFAULT 'pending',
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scenes_topic ON scenes(topic_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON scenes(topic_id, audio_status);
CREATE INDEX IF NOT EXISTS idx_scenes_visual ON scenes(topic_id, visual_type);

-- Production Log
CREATE TABLE IF NOT EXISTS production_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  topic_id UUID REFERENCES topics(id),
  stage TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_log_topic ON production_log(topic_id);
CREATE INDEX IF NOT EXISTS idx_log_created ON production_log(created_at);

-- Shorts (short-form clips for TikTok/Instagram/YouTube Shorts)
CREATE TABLE IF NOT EXISTS shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  clip_number INTEGER,
  start_scene INTEGER,
  end_scene INTEGER,
  estimated_duration_ms INTEGER,
  actual_duration_ms INTEGER,
  virality_score INTEGER,
  virality_reason TEXT,
  clip_title TEXT,
  hook_text TEXT,
  hashtags TEXT[],
  caption TEXT,
  rewritten_narration JSONB,
  rewritten_image_prompts JSONB,
  emphasis_word_map JSONB,
  short_form_style TEXT DEFAULT 'tiktok_bold',
  audio_scenes JSONB,
  visual_scenes JSONB,
  portrait_drive_id TEXT,
  portrait_drive_url TEXT,
  thumbnail_drive_id TEXT,
  thumbnail_url TEXT,
  srt_text TEXT,
  review_status TEXT DEFAULT 'pending',
  review_feedback TEXT,
  production_status TEXT DEFAULT 'pending',
  production_progress TEXT,
  tiktok_status TEXT DEFAULT 'pending',
  tiktok_post_id TEXT,
  tiktok_scheduled_at TIMESTAMPTZ,
  tiktok_published_at TIMESTAMPTZ,
  tiktok_caption TEXT,
  tiktok_views INTEGER DEFAULT 0,
  tiktok_likes INTEGER DEFAULT 0,
  tiktok_comments INTEGER DEFAULT 0,
  tiktok_shares INTEGER DEFAULT 0,
  instagram_status TEXT DEFAULT 'pending',
  instagram_post_id TEXT,
  instagram_scheduled_at TIMESTAMPTZ,
  instagram_published_at TIMESTAMPTZ,
  instagram_caption TEXT,
  instagram_views INTEGER DEFAULT 0,
  instagram_likes INTEGER DEFAULT 0,
  instagram_comments INTEGER DEFAULT 0,
  youtube_shorts_status TEXT DEFAULT 'pending',
  youtube_shorts_video_id TEXT,
  youtube_shorts_scheduled_at TIMESTAMPTZ,
  youtube_shorts_published_at TIMESTAMPTZ,
  youtube_shorts_views INTEGER DEFAULT 0,
  youtube_shorts_likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shorts_topic ON shorts(topic_id);
CREATE INDEX IF NOT EXISTS idx_shorts_posting ON shorts(tiktok_status, instagram_status, youtube_shorts_status);

-- Social Media Accounts (per project)
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_name TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for dashboard subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE topics;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE production_log;
ALTER PUBLICATION supabase_realtime ADD TABLE shorts;

-- Set REPLICA IDENTITY FULL for UPDATE events in Realtime
ALTER TABLE scenes REPLICA IDENTITY FULL;
ALTER TABLE topics REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;
ALTER TABLE shorts REPLICA IDENTITY FULL;

EOSQL
  echo "  ✅ Created supabase/migrations/001_initial_schema.sql"
else
  echo "  ⏭️  Migration file already exists, skipping creation"
fi

# Auto-run migration if Supabase container is reachable
echo ""
echo "▶ Running Supabase migration..."

# Try common container names
SUPABASE_CONTAINER=""
for name in supabase-db supabase_db supabase-postgres supabase_supabase-db_1; do
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "$name"; then
    SUPABASE_CONTAINER="$name"
    break
  fi
done

if [ -n "$SUPABASE_CONTAINER" ]; then
  echo "  Found Supabase container: $SUPABASE_CONTAINER"
  docker exec -i "$SUPABASE_CONTAINER" psql -U postgres < supabase/migrations/001_initial_schema.sql 2>&1 | tail -5
  if [ $? -eq 0 ]; then
    echo "  ✅ Migration complete — all tables created/verified"
  else
    echo "  ⚠️  Migration had errors. Check output above."
    echo "     Run manually: docker exec -i $SUPABASE_CONTAINER psql -U postgres < supabase/migrations/001_initial_schema.sql"
  fi
else
  echo "  ⚠️  No Supabase container found locally."
  echo "     If Supabase is on a remote server, SSH in and run:"
  echo "     docker exec -i supabase-db psql -U postgres < supabase/migrations/001_initial_schema.sql"
fi

# ─── 7. DASHBOARD PACKAGE.JSON TEMPLATE ─────────────────────

echo ""
echo "▶ Creating dashboard package.json..."

if [ ! -f dashboard/package.json ]; then
  cat > dashboard/package.json << 'EOF'
{
  "name": "vision-gridai-dashboard",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.39.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
EOF
  echo "  ✅ Created dashboard/package.json"
else
  echo "  ⏭️  dashboard/package.json already exists, skipping"
fi

# ─── 8. NGINX CONFIG TEMPLATE ───────────────────────────────

echo ""
echo "▶ Creating Nginx config template..."

if [ ! -f dashboard/nginx.conf ]; then
  cat > dashboard/nginx.conf << 'EOF'
# Vision GridAI Dashboard — Nginx Config
# Copy to /etc/nginx/sites-available/dashboard and symlink to sites-enabled

server {
    listen 80;
    server_name dashboard.operscale.cloud;

    # React SPA
    root /opt/dashboard;
    index index.html;

    # SPA routing — all non-file requests go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy n8n webhooks
    location /webhook/ {
        proxy_pass https://n8n.srv1297445.hstgr.cloud/webhook/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Reverse proxy Supabase (for Realtime WebSocket)
    location /supabase/ {
        proxy_pass https://supabase.operscale.cloud/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF
  echo "  ✅ Created dashboard/nginx.conf"
else
  echo "  ⏭️  nginx.conf already exists, skipping"
fi

# ─── 5. TOPIC INTELLIGENCE + CINEMATIC PIPELINE CHECKS ──────
echo ""
echo "▶ Topic Intelligence — data source connectivity..."

# Python packages for research
for pkg in praw pytrends requests; do
    python3 -c "import $pkg" 2>/dev/null && \
        echo "  ✅ $pkg importable" || \
        echo "  ⚠️  $pkg not installed (pip3 install --break-system-packages $pkg)"
done

# API keys
[ -n "${APIFY_TOKEN:-}" ] && echo "  ✅ APIFY_TOKEN set" || echo "  ⚠️  APIFY_TOKEN not set"
[ -n "${SERPAPI_KEY:-}" ] && echo "  ✅ SERPAPI_KEY set" || echo "  ⚠️  SERPAPI_KEY not set"
# Note: OpenRouter is NOT used. All AI calls go direct to Anthropic API.
[ -n "${ANTHROPIC_API_KEY:-}" ] && echo "  ✅ ANTHROPIC_API_KEY set" || echo "  ⚠️  ANTHROPIC_API_KEY not set"

# Research + cinematic tables
echo ""
echo "▶ Checking Supabase tables (research + cinematic + calendar + engagement)..."
for table in research_runs research_results research_categories scheduled_posts platform_metadata comments music_library renders production_logs; do
    RESP=$(curl -s -o /dev/null -w "%{http_code}" \
        "${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1" \
        -H "apikey: ${SUPABASE_ANON_KEY:-none}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-none}" 2>/dev/null || echo "000")
    if [ "$RESP" = "200" ]; then
        echo "  ✅ $table"
    else
        echo "  ❌ $table — HTTP ${RESP} (run migrations)"
    fi
done

# Cinematic fields on scenes table
echo ""
echo "▶ Checking cinematic fields on scenes table..."
SCENE_CHECK=$(curl -s "${SUPABASE_URL}/rest/v1/scenes?select=color_mood,zoom_direction&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY:-none}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-none}" 2>/dev/null || echo "error")
if echo "$SCENE_CHECK" | grep -q "color_mood"; then
    echo "  ✅ Cinematic fields present on scenes table"
else
    echo "  ❌ Cinematic fields missing — run migration 003"
fi

# ─── DONE ───────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Edit .env with your actual Supabase keys"
echo "  2. Run the Supabase migration (includes shorts + social_accounts tables):"
echo "     psql -h localhost -p 54321 -U postgres -f supabase/migrations/001_initial_schema.sql"
echo "  3. Install GSD globally:"
echo "     npx get-shit-done-cc@latest"
echo "  4. Generate dashboard design system:"
echo '     python3 .claude/skills/ui-ux-pro-max/scripts/search.py "AI video production dashboard" --design-system --persist -p "Vision GridAI"'
echo "  5. Verify Agency Agents installed:"
echo "     ls ~/.claude/agents/ | wc -l  (should show 61 agents)"
echo "  6. Create Fal.ai credential in n8n:"
echo "     n8n → Settings → Credentials → HTTP Header Auth → Name: 'Fal API Key'"
echo "     Header Name: Authorization, Header Value: Key YOUR_FAL_API_KEY"
echo "  7. Start building:"
echo "     /gsd:new-project  (in Claude Code)"
echo "  8. Read Agent.md before building anything"
echo "══════════════════════════════════════════════════"
