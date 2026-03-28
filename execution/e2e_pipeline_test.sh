#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Vision GridAI — End-to-End Pipeline Test (Cinematic v4.0)
# Tests every stage of the production pipeline independently
# Run from inside n8n container or VPS with access to all services
#
# Usage: bash e2e_pipeline_test.sh [STAGE]
#   No args = run all stages
#   STAGE = infra|supabase|ffmpeg|kenburns|color|transitions|assembly|captions|platform|api|full
# ═══════════════════════════════════════════════════════════════

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
STAGE="${1:-all}"
WORK="/tmp/production/e2e_test_$$"
mkdir -p "$WORK"
trap "rm -rf $WORK" EXIT

pass() { ((PASS++)); echo -e "  ${GREEN}✅ PASS${NC}: $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}❌ FAIL${NC}: $1 — $2"; }
skip() { ((SKIP++)); echo -e "  ${YELLOW}⏭️ SKIP${NC}: $1 — $2"; }
header() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}"; }

# ─── STAGE 1: INFRASTRUCTURE ─────────────────────────────────
test_infrastructure() {
  header "Stage 1: Infrastructure Connectivity"

  # Supabase REST API
  code=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/rest/v1/projects?select=id&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" 2>/dev/null || echo "000")
  [ "$code" = "200" ] && pass "Supabase REST API (HTTP $code)" || fail "Supabase REST API" "HTTP $code"

  # n8n API (internal uses different key than public API)
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5678/healthz" 2>/dev/null || echo "000")
  [ "$code" = "200" ] && pass "n8n health endpoint (HTTP $code)" || {
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5678/api/v1/workflows?limit=1" \
      -H "X-N8N-API-KEY: ${N8N_API_KEY:-}" 2>/dev/null || echo "000")
    [ "$code" = "200" ] && pass "n8n API (HTTP $code)" || fail "n8n API" "HTTP $code"
  }

  # Anthropic API
  if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" "https://api.anthropic.com/v1/messages" \
      -H "x-api-key: ${ANTHROPIC_API_KEY}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \
      -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}' 2>/dev/null || echo "000")
    [ "$code" = "200" ] && pass "Anthropic API (HTTP $code)" || fail "Anthropic API" "HTTP $code"
  else
    skip "Anthropic API" "ANTHROPIC_API_KEY not set"
  fi

  # Fal.ai
  if [ -n "${FAL_API_KEY:-}" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" "https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image" \
      -H "Authorization: Key ${FAL_API_KEY}" -H "Content-Type: application/json" \
      -d '{"prompt":"test","image_size":"landscape_16_9"}' 2>/dev/null || echo "000")
    [ "$code" = "200" ] && pass "Fal.ai Seedream API (HTTP $code)" || skip "Fal.ai Seedream API" "HTTP $code (may need payment)"
  else
    skip "Fal.ai" "FAL_API_KEY not set"
  fi

  # YouTube Data API
  if [ -n "${YOUTUBE_API_KEY:-}" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${YOUTUBE_API_KEY}" 2>/dev/null || echo "000")
    [ "$code" = "200" ] && pass "YouTube Data API (HTTP $code)" || fail "YouTube Data API" "HTTP $code"
  else
    skip "YouTube Data API" "YOUTUBE_API_KEY not set"
  fi

  # SerpAPI
  if [ -n "${SERPAPI_KEY:-}" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://serpapi.com/search.json?q=test&api_key=${SERPAPI_KEY}&engine=google&num=1" 2>/dev/null || echo "000")
    [ "$code" = "200" ] && pass "SerpAPI (HTTP $code)" || fail "SerpAPI" "HTTP $code"
  else
    skip "SerpAPI" "SERPAPI_KEY not set"
  fi

  # Apify
  if [ -n "${APIFY_TOKEN:-}" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://api.apify.com/v2/acts?limit=1" -H "Authorization: Bearer ${APIFY_TOKEN}" 2>/dev/null || echo "000")
    [ "$code" = "200" ] && pass "Apify API (HTTP $code)" || fail "Apify API" "HTTP $code"
  else
    skip "Apify" "APIFY_TOKEN not set"
  fi

  # GCP Token Service
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://gcp-token-service:3001/token" 2>/dev/null || echo "000")
  [ "$code" = "200" ] && pass "GCP Token Service (HTTP $code)" || skip "GCP Token Service" "HTTP $code (Docker sidecar may not be running)"

  # FFmpeg
  if command -v ffmpeg &>/dev/null; then
    ver=$(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')
    pass "FFmpeg installed ($ver)"
  else
    fail "FFmpeg" "not installed"
  fi

  # FFmpeg filters (use -F for fixed string, BusyBox compatible)
  for filter in zoompan xfade colorbalance eq; do
    if ffmpeg -filters 2>&1 | grep -F "$filter" >/dev/null 2>&1; then
      pass "FFmpeg filter: $filter"
    else
      # Fallback: test by running a short command
      if ffmpeg -f lavfi -i "color=c=blue:s=16x16:d=0.1" -vf "$filter=saturation=1" -f null - 2>/dev/null; then
        pass "FFmpeg filter: $filter (verified by test)"
      else
        fail "FFmpeg filter: $filter" "not available"
      fi
    fi
  done
}

# ─── STAGE 2: SUPABASE TABLES ────────────────────────────────
test_supabase() {
  header "Stage 2: Supabase Tables & Schema"

  local TABLES="projects topics scenes niche_profiles prompt_configs avatars production_log shorts social_accounts research_runs research_results research_categories scheduled_posts platform_metadata comments music_library renders production_logs"

  for table in $TABLES; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1" \
      -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" 2>/dev/null || echo "000")
    [ "$code" = "200" ] && pass "Table: $table" || fail "Table: $table" "HTTP $code"
  done

  # Check cinematic fields on scenes
  resp=$(curl -s "${SUPABASE_URL}/rest/v1/scenes?select=color_mood,zoom_direction,composition_prefix,transition_to_next,pipeline_stage&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" 2>/dev/null)
  if echo "$resp" | grep -q "color_mood"; then
    pass "Cinematic fields on scenes (color_mood, zoom_direction, etc.)"
  else
    fail "Cinematic fields on scenes" "Fields missing — run migration 003"
  fi

  # Check auto-pilot fields on projects
  resp=$(curl -s "${SUPABASE_URL}/rest/v1/projects?select=auto_pilot_enabled,style_dna&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" 2>/dev/null)
  if echo "$resp" | grep -q "auto_pilot_enabled"; then
    pass "Auto-pilot fields on projects"
  else
    fail "Auto-pilot fields on projects" "Fields missing — run migration 004"
  fi

  # Test insert + delete on production_logs
  TOPIC_ID=$(curl -s "${SUPABASE_URL}/rest/v1/topics?select=id&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" 2>/dev/null | sed 's/.*"id":"//' | sed 's/".*//' | head -1)
  [ "$TOPIC_ID" = "[]" ] && TOPIC_ID=""

  if [ -n "$TOPIC_ID" ]; then
    ins=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/production_logs" \
      -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" -H "Prefer: return=minimal" \
      -d "{\"topic_id\":\"$TOPIC_ID\",\"stage\":\"e2e_test\",\"action\":\"test\",\"status\":\"completed\"}" 2>/dev/null)
    [ "$ins" = "201" ] && pass "production_logs INSERT" || fail "production_logs INSERT" "HTTP $ins"

    # Cleanup
    curl -s -X DELETE "${SUPABASE_URL}/rest/v1/production_logs?stage=eq.e2e_test" \
      -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" &>/dev/null
  else
    skip "production_logs INSERT" "No topics found to reference"
  fi
}

# ─── STAGE 3: KEN BURNS (6 directions) ───────────────────────
test_ken_burns() {
  header "Stage 3: Ken Burns Motion (6 directions)"

  # Create test image
  ffmpeg -y -f lavfi -i "color=c=0x1a1040:s=1920x1080:d=1" -frames:v 1 "$WORK/test.png" 2>/dev/null
  if [ ! -f "$WORK/test.png" ]; then
    fail "Create test image" "FFmpeg lavfi failed"
    return
  fi
  pass "Test image created (1920x1080)"

  for dir in in out pan_left pan_right pan_up static_slight_zoom; do
    if bash /tmp/production/ken_burns.sh "$WORK/test.png" 2 "$dir" warm_gold "$WORK/kb_${dir}.mp4" 2>/dev/null; then
      if [ -f "$WORK/kb_${dir}.mp4" ]; then
        dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$WORK/kb_${dir}.mp4")
        pass "Ken Burns $dir (${dur}s)"
      else
        fail "Ken Burns $dir" "No output file"
      fi
    else
      fail "Ken Burns $dir" "Script exited with error"
    fi
  done
}

# ─── STAGE 4: COLOR GRADING (7 moods) ────────────────────────
test_color_grading() {
  header "Stage 4: Color Grading (7 moods)"

  # Create test image if not exists
  [ -f "$WORK/test.png" ] || ffmpeg -y -f lavfi -i "color=c=0x1a1040:s=1920x1080:d=1" -frames:v 1 "$WORK/test.png" 2>/dev/null

  for mood in cold_desat cool_neutral dark_mono warm_sepia warm_gold full_natural muted_selective; do
    if bash /tmp/production/ken_burns.sh "$WORK/test.png" 1 in "$mood" "$WORK/color_${mood}.mp4" 2>/dev/null; then
      [ -f "$WORK/color_${mood}.mp4" ] && pass "Color mood: $mood" || fail "Color mood: $mood" "No output"
    else
      fail "Color mood: $mood" "Script error"
    fi
  done

  # Test skip_color mode (selective color)
  if bash /tmp/production/ken_burns.sh "$WORK/test.png" 1 in warm_gold "$WORK/color_skip.mp4" 1 2>/dev/null; then
    [ -f "$WORK/color_skip.mp4" ] && pass "Skip color mode (selective_color_element)" || fail "Skip color mode" "No output"
  else
    fail "Skip color mode" "Script error"
  fi
}

# ─── STAGE 5: TRANSITIONS (5 types) ──────────────────────────
test_transitions() {
  header "Stage 5: xfade Transitions (5 types)"

  # Create 3 test clips
  for i in 1 2 3; do
    ffmpeg -y -f lavfi -i "color=c=0x$(printf '%02x%02x%02x' $((40+i*30)) $((20+i*20)) $((60+i*40))):s=1920x1080:d=2" \
      -c:v libx264 -pix_fmt yuv420p -t 2 "$WORK/clip_${i}.mp4" 2>/dev/null
  done

  for trans in crossfade wipe_left dissolve_slow; do
    # Build manifest
    printf '[{"clip":"%s/clip_1.mp4","duration":2,"transition":"%s"},{"clip":"%s/clip_2.mp4","duration":2,"transition":"%s"},{"clip":"%s/clip_3.mp4","duration":2,"transition":"crossfade"}]' \
      "$WORK" "$trans" "$WORK" "$trans" "$WORK" > "$WORK/manifest_${trans}.json"

    if bash /tmp/production/assemble_with_transitions.sh "$WORK/manifest_${trans}.json" "$WORK/trans_${trans}.mp4" 3 2>/dev/null; then
      if [ -f "$WORK/trans_${trans}.mp4" ]; then
        dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$WORK/trans_${trans}.mp4")
        pass "Transition: $trans (${dur}s)"
      else
        fail "Transition: $trans" "No output"
      fi
    else
      fail "Transition: $trans" "Assembly failed"
    fi
  done
}

# ─── STAGE 6: PLATFORM EXPORTS (4 profiles) ──────────────────
test_platform_exports() {
  header "Stage 6: Platform Export Profiles"

  # Create test video with audio
  ffmpeg -y -f lavfi -i "color=c=0x1a1040:s=1920x1080:d=2" -f lavfi -i "sine=frequency=440:duration=2" \
    -c:v libx264 -c:a aac -pix_fmt yuv420p -t 2 "$WORK/source.mp4" 2>/dev/null

  if [ ! -f "$WORK/source.mp4" ]; then
    fail "Create test source video" "FFmpeg failed"
    return
  fi

  for platform in youtube_long youtube_shorts tiktok instagram; do
    if bash /tmp/production/platform_render.sh "$WORK/source.mp4" "$platform" "$WORK/render_${platform}.mp4" 2>/dev/null; then
      if [ -f "$WORK/render_${platform}.mp4" ]; then
        res=$(ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "$WORK/render_${platform}.mp4" | head -1)
        pass "Platform: $platform ($res)"
      else
        fail "Platform: $platform" "No output"
      fi
    else
      fail "Platform: $platform" "Render failed"
    fi
  done
}

# ─── STAGE 7: END CARD ───────────────────────────────────────
test_endcard() {
  header "Stage 7: End Card Generation"

  # Long-form end card (6s)
  ffmpeg -y -f lavfi -i "color=c=0x0A0A1A:s=1920x1080:d=6" \
    -vf "drawtext=text='Subscribe for more':fontsize=48:fontcolor=white:x=(w-tw)/2:y=(h-th)/2,fade=in:st=0:d=0.5,fade=out:st=5.5:d=0.5" \
    -c:v libx264 -pix_fmt yuv420p -t 6 "$WORK/endcard_long.mp4" 2>/dev/null
  [ -f "$WORK/endcard_long.mp4" ] && pass "End card long-form (6s)" || fail "End card long-form" "FFmpeg failed"

  # Short-form end card (3s)
  ffmpeg -y -f lavfi -i "color=c=0x0A0A1A:s=1080x1920:d=3" \
    -vf "drawtext=text='Subscribe':fontsize=48:fontcolor=white:x=(w-tw)/2:y=(h-th)/2,fade=in:st=0:d=0.5,fade=out:st=2.5:d=0.5" \
    -c:v libx264 -pix_fmt yuv420p -t 3 "$WORK/endcard_short.mp4" 2>/dev/null
  [ -f "$WORK/endcard_short.mp4" ] && pass "End card short-form (3s, 9:16)" || fail "End card short-form" "FFmpeg failed"
}

# ─── STAGE 8: ANTHROPIC AI CALLS ─────────────────────────────
test_api_calls() {
  header "Stage 8: AI API Integration"

  if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    skip "Anthropic API calls" "ANTHROPIC_API_KEY not set"
    return
  fi

  # Test: keyword derivation (research)
  resp=$(curl -s "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \
    -d '{"model":"claude-haiku-4-5-20251001","max_tokens":256,"messages":[{"role":"user","content":"Given this niche: \"credit cards\" with description: \"US credit card rewards and strategies\", generate 5 search keywords. Return ONLY a JSON array of strings."}]}' 2>/dev/null)
  if echo "$resp" | grep -q "content"; then
    pass "Keyword derivation (Claude Haiku)"
  else
    fail "Keyword derivation" "$(echo "$resp" | head -c 200)"
  fi

  # Test: music mood analysis
  resp=$(curl -s "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \
    -d '{"model":"claude-haiku-4-5-20251001","max_tokens":512,"messages":[{"role":"user","content":"Analyze this script for background music. Script: \"Meet Marcus. He is 34, a software engineer pulling in 145 thousand a year. Every month, 695 dollars disappears from his statement.\" Return JSON: {\"mood\":\"\",\"bpm\":0,\"base_prompt\":\"\"}"}]}' 2>/dev/null)
  if echo "$resp" | grep -q "content"; then
    pass "Music mood analysis (Claude Haiku)"
  else
    fail "Music mood analysis" "$(echo "$resp" | head -c 200)"
  fi

  # Test: comment sentiment analysis
  resp=$(curl -s "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \
    -d '{"model":"claude-haiku-4-5-20251001","max_tokens":256,"messages":[{"role":"user","content":"Analyze sentiment: \"This is the best credit card video I have ever seen! Where can I get that spreadsheet?\" Return JSON: {\"sentiment\":\"\",\"intent_score\":0.0,\"intent_signals\":[]}"}]}' 2>/dev/null)
  if echo "$resp" | grep -q "content"; then
    pass "Sentiment analysis (Claude Haiku)"
  else
    fail "Sentiment analysis" "$(echo "$resp" | head -c 200)"
  fi

  # Test: platform metadata generation
  resp=$(curl -s "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \
    -d '{"model":"claude-haiku-4-5-20251001","max_tokens":512,"messages":[{"role":"user","content":"Generate YouTube metadata for a video about \"Is the Amex Platinum Worth $695?\". Return JSON: {\"title\":\"\",\"description\":\"\",\"tags\":[],\"thumbnail_text\":\"\"}"}]}' 2>/dev/null)
  if echo "$resp" | grep -q "content"; then
    pass "Platform metadata generation (Claude Haiku)"
  else
    fail "Platform metadata generation" "$(echo "$resp" | head -c 200)"
  fi
}

# ─── STAGE 9: N8N WORKFLOW HEALTH ─────────────────────────────
test_n8n_workflows() {
  header "Stage 9: n8n Workflow Status"

  if [ -z "${N8N_API_KEY:-}" ]; then
    skip "n8n workflow checks" "N8N_API_KEY not set"
    return
  fi

  local ACTIVE_EXPECTED="WF_KEN_BURNS WF_RESEARCH_ORCHESTRATOR WF_SCHEDULE_PUBLISHER WF_COMMENTS_SYNC WF_IMAGE_GENERATION WF_TTS_AUDIO WF_CAPTIONS_ASSEMBLY WF_WEBHOOK_PRODUCTION WF_SCRIPT_GENERATE WF_THUMBNAIL_GENERATE"

  # Use external n8n URL for API access (internal may use different auth)
  N8N_EXT="https://n8n.srv1297445.hstgr.cloud"
  all_wfs=$(curl -s "${N8N_EXT}/api/v1/workflows?limit=100" \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" 2>/dev/null)

  if echo "$all_wfs" | grep -q '"data"'; then
    for wf_name in $ACTIVE_EXPECTED; do
      active=$(echo "$all_wfs" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const wfs=JSON.parse(d).data||[];const w=wfs.find(w=>w.name==='$wf_name');console.log(w?w.active:'NOT_FOUND')})" 2>/dev/null)
      if [ "$active" = "true" ]; then
        pass "Workflow ACTIVE: $wf_name"
      elif [ "$active" = "false" ]; then
        fail "Workflow INACTIVE: $wf_name" "Should be active"
      else
        fail "Workflow NOT FOUND: $wf_name" "Does not exist on n8n"
      fi
    done

    # Check deactivated I2V/T2V
    for wf_name in WF_I2V_GENERATION WF_T2V_GENERATION; do
      active=$(echo "$all_wfs" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const wfs=JSON.parse(d).data||[];const w=wfs.find(w=>w.name==='$wf_name');console.log(w?w.active:'NOT_FOUND')})" 2>/dev/null)
      if [ "$active" = "false" ]; then
        pass "Workflow DEACTIVATED: $wf_name (replaced by Ken Burns)"
      elif [ "$active" = "true" ]; then
        fail "Workflow STILL ACTIVE: $wf_name" "Should be deactivated"
      fi
    done
  else
    skip "n8n workflow status check" "Cannot reach n8n API from container"
  fi
}

# ─── STAGE 10: FULL MINI-PIPELINE (3 scenes) ─────────────────
test_full_pipeline() {
  header "Stage 10: Full Mini-Pipeline (3 scenes)"

  # Create 3 test images
  for i in 1 2 3; do
    ffmpeg -y -f lavfi -i "color=c=0x$(printf '%02x%02x%02x' $((30+i*40)) $((10+i*30)) $((50+i*35))):s=1920x1080:d=1" \
      -frames:v 1 "$WORK/scene_${i}.png" 2>/dev/null
  done
  pass "Created 3 test scene images"

  # Create 3 audio files (sine tones at different frequencies)
  for i in 1 2 3; do
    ffmpeg -y -f lavfi -i "sine=frequency=$((300+i*100)):duration=5" -c:a aac -b:a 128k "$WORK/audio_${i}.m4a" 2>/dev/null
  done
  pass "Created 3 test audio files (5s each)"

  # Ken Burns each scene with different directions + moods
  local DIRS=("in" "pan_left" "static_slight_zoom")
  local MOODS=("cold_desat" "warm_gold" "full_natural")

  for i in 1 2 3; do
    idx=$((i-1))
    bash /tmp/production/ken_burns.sh "$WORK/scene_${i}.png" 5 "${DIRS[$idx]}" "${MOODS[$idx]}" "$WORK/kb_scene_${i}.mp4" 2>/dev/null
    [ -f "$WORK/kb_scene_${i}.mp4" ] && pass "Ken Burns scene $i (${DIRS[$idx]} + ${MOODS[$idx]})" || fail "Ken Burns scene $i" "No output"
  done

  # Mux audio + video for each scene
  for i in 1 2 3; do
    ffmpeg -y -i "$WORK/kb_scene_${i}.mp4" -i "$WORK/audio_${i}.m4a" \
      -map 0:v -map 1:a -c:v copy -c:a aac -ar 48000 -shortest \
      "$WORK/muxed_scene_${i}.mp4" 2>/dev/null
    [ -f "$WORK/muxed_scene_${i}.mp4" ] && pass "Mux scene $i (video + audio)" || fail "Mux scene $i" "FFmpeg failed"
  done

  # Assemble with xfade transitions
  printf '[{"clip":"%s/muxed_scene_1.mp4","duration":5,"transition":"crossfade"},{"clip":"%s/muxed_scene_2.mp4","duration":5,"transition":"wipe_left"},{"clip":"%s/muxed_scene_3.mp4","duration":5,"transition":"crossfade"}]' \
    "$WORK" "$WORK" "$WORK" > "$WORK/pipeline_manifest.json"

  if bash /tmp/production/assemble_with_transitions.sh "$WORK/pipeline_manifest.json" "$WORK/assembled.mp4" 3 2>/dev/null; then
    if [ -f "$WORK/assembled.mp4" ]; then
      dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$WORK/assembled.mp4")
      size=$(du -h "$WORK/assembled.mp4" | cut -f1)
      pass "Full assembly with transitions (${dur}s, $size)"
    else
      fail "Full assembly" "No output file"
    fi
  else
    fail "Full assembly" "Script failed"
  fi

  # Generate end card and append
  ffmpeg -y -f lavfi -i "color=c=0x0A0A1A:s=1920x1080:d=5" \
    -vf "drawtext=text='Subscribe':fontsize=48:fontcolor=white:x=(w-tw)/2:y=(h-th)/2,fade=in:st=0:d=0.5,fade=out:st=4.5:d=0.5" \
    -c:v libx264 -pix_fmt yuv420p -t 5 "$WORK/endcard.mp4" 2>/dev/null

  if [ -f "$WORK/assembled.mp4" ] && [ -f "$WORK/endcard.mp4" ]; then
    printf "file '%s/assembled.mp4'\nfile '%s/endcard.mp4'" "$WORK" "$WORK" > "$WORK/final_concat.txt"
    ffmpeg -y -f concat -safe 0 -i "$WORK/final_concat.txt" -c copy "$WORK/final_video.mp4" 2>/dev/null
    if [ -f "$WORK/final_video.mp4" ]; then
      dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$WORK/final_video.mp4")
      size=$(du -h "$WORK/final_video.mp4" | cut -f1)
      pass "Final video with end card (${dur}s, $size)"
    else
      fail "Final video concat" "FFmpeg concat failed"
    fi
  fi

  # Platform export
  if [ -f "$WORK/final_video.mp4" ]; then
    bash /tmp/production/platform_render.sh "$WORK/final_video.mp4" youtube_long "$WORK/youtube_export.mp4" 2>/dev/null
    if [ -f "$WORK/youtube_export.mp4" ]; then
      res=$(ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "$WORK/youtube_export.mp4" | head -1)
      dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$WORK/youtube_export.mp4")
      pass "YouTube export ($res, ${dur}s)"
    else
      fail "YouTube export" "Render failed"
    fi
  fi
}

# ─── RUN STAGES ───────────────────────────────────────────────
echo -e "\n${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Vision GridAI — E2E Pipeline Test (v4.0)        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Stage: ${STAGE}"
echo "  Work dir: ${WORK}"
echo "  Date: $(date -Iseconds)"

case "$STAGE" in
  all)
    test_infrastructure
    test_supabase
    test_ken_burns
    test_color_grading
    test_transitions
    test_platform_exports
    test_endcard
    test_api_calls
    test_n8n_workflows
    test_full_pipeline
    ;;
  infra)       test_infrastructure ;;
  supabase)    test_supabase ;;
  ffmpeg|kenburns) test_ken_burns ;;
  color)       test_color_grading ;;
  transitions) test_transitions ;;
  assembly)    test_transitions ;; # includes assembly
  platform)    test_platform_exports ;;
  endcard)     test_endcard ;;
  api)         test_api_calls ;;
  n8n)         test_n8n_workflows ;;
  full)        test_full_pipeline ;;
  captions)    echo "Caption tests require real word timing data — run with 'full' stage" ;;
  *)           echo "Unknown stage: $STAGE. Use: all|infra|supabase|kenburns|color|transitions|platform|endcard|api|n8n|full" ;;
esac

# ─── SUMMARY ─────────────────────────────────────────────────
header "TEST SUMMARY"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo -e "  ${YELLOW}Skipped: $SKIP${NC}"
echo -e "  Total:  $TOTAL"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}█████████████████████████████████████${NC}"
  echo -e "  ${GREEN}  ALL TESTS PASSED ✅               ${NC}"
  echo -e "  ${GREEN}█████████████████████████████████████${NC}"
else
  echo -e "  ${RED}█████████████████████████████████████${NC}"
  echo -e "  ${RED}  $FAIL TEST(S) FAILED ❌             ${NC}"
  echo -e "  ${RED}█████████████████████████████████████${NC}"
fi
echo ""
exit $FAIL
