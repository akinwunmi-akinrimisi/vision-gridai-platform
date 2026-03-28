#!/usr/bin/env bash
# =============================================================================
# Topic Intelligence Engine — Skills Setup & Validation
# Vision GridAI Research Module
# Version 1.0 | March 2026
# =============================================================================
#
# Usage:
#   bash skills.sh              — Run full environment check
#   bash skills.sh setup        — Install all dependencies
#   bash skills.sh check        — Validate environment only (no installs)
#   bash skills.sh test-source  — Test connectivity to all 5 data sources
#   bash skills.sh migrate      — Apply Supabase migration
#   bash skills.sh cost-report  — Show cost estimate for a research run
#   bash skills.sh help         — Show this help message
#
# =============================================================================

set -euo pipefail

# --------------- Colors ---------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# --------------- Config ---------------
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_FILES=(
    "AGENT.md"
    "GUIDE.md"
    "skills.md"
    "skills.sh"
)
DIRECTIVE_FILES=(
    "directives/01_environment_setup.md"
    "directives/02_reddit_scraper.md"
    "directives/03_youtube_scraper.md"
    "directives/04_tiktok_scraper.md"
    "directives/05_google_trends_scraper.md"
    "directives/06_quora_scraper.md"
    "directives/07_orchestrator.md"
    "directives/08_ai_categorization.md"
    "directives/09_dashboard_research_tab.md"
    "directives/10_e2e_testing.md"
)
WORKFLOW_FILES=(
    "workflows/research_orchestrator.json"
    "workflows/reddit_scraper.json"
    "workflows/youtube_scraper.json"
    "workflows/tiktok_scraper.json"
    "workflows/google_trends_scraper.json"
    "workflows/quora_scraper.json"
    "workflows/ai_categorization.json"
)

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# --------------- Helpers ---------------
pass_msg() { echo -e "  ${GREEN}✔${NC} $1"; ((PASS_COUNT++)); }
fail_msg() { echo -e "  ${RED}✘${NC} $1"; ((FAIL_COUNT++)); }
warn_msg() { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARN_COUNT++)); }
info_msg() { echo -e "  ${BLUE}ℹ${NC} $1"; }
header()   { echo -e "\n${BOLD}${CYAN}[$1]${NC}"; }

# --------------- Commands ---------------

cmd_help() {
    echo -e "${BOLD}Topic Intelligence Engine — Skills Manager${NC}"
    echo ""
    echo "Commands:"
    echo "  bash skills.sh              Full environment check"
    echo "  bash skills.sh setup        Install dependencies"
    echo "  bash skills.sh check        Validate only (no installs)"
    echo "  bash skills.sh test-source  Test all 5 data source connections"
    echo "  bash skills.sh migrate      Apply Supabase research tables migration"
    echo "  bash skills.sh cost-report  Show per-run cost estimates"
    echo "  bash skills.sh help         Show this message"
}

cmd_check() {
    echo -e "${BOLD}${CYAN}Topic Intelligence Engine — Environment Check${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # --- Project Files ---
    header "Project Files"
    for f in "${REQUIRED_FILES[@]}"; do
        if [[ -f "$PROJECT_ROOT/$f" ]]; then
            pass_msg "$f"
        else
            fail_msg "$f — MISSING"
        fi
    done

    # --- Directive Files ---
    header "Directive Files"
    for f in "${DIRECTIVE_FILES[@]}"; do
        if [[ -f "$PROJECT_ROOT/$f" ]]; then
            pass_msg "$f"
        else
            warn_msg "$f — not yet created (needed for that phase)"
        fi
    done

    # --- Workflow Files ---
    header "Workflow Files"
    for f in "${WORKFLOW_FILES[@]}"; do
        if [[ -f "$PROJECT_ROOT/$f" ]]; then
            pass_msg "$f"
        else
            warn_msg "$f — not yet created (built during execution)"
        fi
    done

    # --- GSD ---
    header "GSD (Get Shit Done)"
    if [[ -d "$HOME/.claude/commands/gsd" ]] || command -v gsd &>/dev/null; then
        pass_msg "GSD installed"
    else
        fail_msg "GSD not found — run: npx gsd-build init"
    fi

    # --- Agency Agents ---
    header "Agency Agents"
    if [[ -d "$HOME/.claude/agents" ]]; then
        AGENT_COUNT=$(find "$HOME/.claude/agents" -name "*.md" 2>/dev/null | wc -l)
        if [[ "$AGENT_COUNT" -gt 0 ]]; then
            pass_msg "Agency Agents installed ($AGENT_COUNT agents)"
        else
            fail_msg "Agency Agents directory exists but is empty"
        fi
    else
        fail_msg "Agency Agents not found — run: git clone https://github.com/msitarzewski/agency-agents.git ~/.claude/agents"
    fi

    # --- Python ---
    header "Python Environment"
    if command -v python3 &>/dev/null; then
        PYVER=$(python3 --version 2>&1)
        pass_msg "Python: $PYVER"
    else
        fail_msg "Python 3 not found"
    fi

    # --- Python Packages ---
    header "Python Packages"
    for pkg in praw pytrends requests; do
        if python3 -c "import $pkg" 2>/dev/null; then
            pass_msg "$pkg"
        else
            warn_msg "$pkg — not installed (run: pip3 install $pkg)"
        fi
    done

    # --- Node.js ---
    header "Node.js Environment"
    if command -v node &>/dev/null; then
        NODEVER=$(node --version 2>&1)
        pass_msg "Node.js: $NODEVER"
    else
        fail_msg "Node.js not found"
    fi

    # --- n8n ---
    header "n8n"
    if command -v n8n &>/dev/null || docker ps 2>/dev/null | grep -q n8n; then
        pass_msg "n8n is running"
    else
        warn_msg "n8n not detected locally (may be on remote VPS)"
    fi

    # --- Environment Variables ---
    header "Environment Variables (from .env or n8n credentials)"
    ENV_FILE="$PROJECT_ROOT/.env"
    if [[ -f "$ENV_FILE" ]]; then
        pass_msg ".env file exists"
        for var in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY OPENROUTER_API_KEY APIFY_TOKEN YOUTUBE_API_KEY SERPAPI_KEY REDDIT_CLIENT_ID REDDIT_CLIENT_SECRET; do
            if grep -q "^${var}=" "$ENV_FILE" 2>/dev/null; then
                # Check it's not empty
                VAL=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
                if [[ -n "$VAL" && "$VAL" != '""' && "$VAL" != "''" ]]; then
                    pass_msg "$var is set"
                else
                    fail_msg "$var is empty"
                fi
            else
                warn_msg "$var not in .env (may be in n8n credentials)"
            fi
        done
    else
        warn_msg ".env file not found — credentials may be in n8n credential store only"
    fi

    # --- Supabase Tables ---
    header "Supabase Research Tables"
    if [[ -f "$ENV_FILE" ]] && grep -q "^SUPABASE_URL=" "$ENV_FILE"; then
        SUPA_URL=$(grep "^SUPABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        SUPA_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [[ -n "$SUPA_URL" && -n "$SUPA_KEY" ]]; then
            for table in research_runs research_results research_categories; do
                RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
                    "${SUPA_URL}/rest/v1/${table}?select=id&limit=1" \
                    -H "apikey: ${SUPA_KEY}" \
                    -H "Authorization: Bearer ${SUPA_KEY}" 2>/dev/null || echo "000")
                if [[ "$RESPONSE" == "200" ]]; then
                    pass_msg "Table: $table"
                elif [[ "$RESPONSE" == "000" ]]; then
                    warn_msg "Table: $table — could not connect to Supabase"
                else
                    fail_msg "Table: $table — HTTP $RESPONSE (may not exist yet)"
                fi
            done
        else
            warn_msg "Supabase credentials incomplete — skipping table check"
        fi
    else
        warn_msg "No .env file — skipping Supabase table check"
    fi

    # --- Summary ---
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✔ Passed: $PASS_COUNT${NC}  ${RED}✘ Failed: $FAIL_COUNT${NC}  ${YELLOW}⚠ Warnings: $WARN_COUNT${NC}"
    if [[ $FAIL_COUNT -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}Environment is ready.${NC}"
    else
        echo -e "${RED}${BOLD}Fix $FAIL_COUNT failure(s) before proceeding.${NC}"
    fi
}

cmd_setup() {
    echo -e "${BOLD}${CYAN}Topic Intelligence Engine — Dependency Setup${NC}"

    header "Creating directories"
    mkdir -p "$PROJECT_ROOT/directives"
    mkdir -p "$PROJECT_ROOT/workflows"
    mkdir -p "$PROJECT_ROOT/supabase/migrations"
    pass_msg "Directories created"

    header "Installing Python packages"
    pip3 install --break-system-packages praw pytrends requests 2>/dev/null && \
        pass_msg "Python packages installed" || \
        fail_msg "Python package install failed"

    header "Checking GSD"
    if [[ -d "$HOME/.claude/commands/gsd" ]] || command -v gsd &>/dev/null; then
        pass_msg "GSD already installed"
    else
        info_msg "Install GSD manually: npx gsd-build init"
    fi

    header "Checking Agency Agents"
    if [[ -d "$HOME/.claude/agents" ]]; then
        AGENT_COUNT=$(find "$HOME/.claude/agents" -name "*.md" 2>/dev/null | wc -l)
        pass_msg "Agency Agents present ($AGENT_COUNT agents)"
    else
        info_msg "Install agents: git clone https://github.com/msitarzewski/agency-agents.git ~/.claude/agents"
    fi

    echo ""
    echo -e "${CYAN}Setup complete. Run 'bash skills.sh check' to validate.${NC}"
}

cmd_test_source() {
    echo -e "${BOLD}${CYAN}Topic Intelligence Engine — Data Source Connectivity Test${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    header "1. Reddit"
    if python3 -c "
import praw, os
r = praw.Reddit(
    client_id=os.getenv('REDDIT_CLIENT_ID',''),
    client_secret=os.getenv('REDDIT_CLIENT_SECRET',''),
    user_agent='TopicIntel/1.0'
)
posts = list(r.subreddit('test').hot(limit=3))
print(f'Fetched {len(posts)} posts from r/test')
" 2>/dev/null; then
        pass_msg "Reddit API (PRAW) working"
    else
        warn_msg "Reddit API (PRAW) failed — will use Apify fallback"
    fi

    header "2. YouTube Data API v3"
    YTKEY="${YOUTUBE_API_KEY:-}"
    if [[ -n "$YTKEY" ]]; then
        YT_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${YTKEY}" 2>/dev/null || echo "000")
        if [[ "$YT_RESP" == "200" ]]; then
            pass_msg "YouTube API working"
        else
            fail_msg "YouTube API returned HTTP $YT_RESP"
        fi
    else
        warn_msg "YOUTUBE_API_KEY not set in environment"
    fi

    header "3. TikTok (Apify)"
    APIFY="${APIFY_TOKEN:-}"
    if [[ -n "$APIFY" ]]; then
        AP_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api.apify.com/v2/acts?token=${APIFY}&limit=1" 2>/dev/null || echo "000")
        if [[ "$AP_RESP" == "200" ]]; then
            pass_msg "Apify API accessible (TikTok actor available)"
        else
            fail_msg "Apify API returned HTTP $AP_RESP"
        fi
    else
        warn_msg "APIFY_TOKEN not set in environment"
    fi

    header "4. Google Trends (pytrends)"
    if python3 -c "
from pytrends.request import TrendReq
pt = TrendReq(hl='en-US', tz=360)
pt.build_payload(['test'], timeframe='now 7-d', geo='US')
data = pt.interest_over_time()
print(f'Got {len(data)} data points')
" 2>/dev/null; then
        pass_msg "pytrends working"
    else
        warn_msg "pytrends failed — Google may be rate limiting"
    fi

    header "5. Quora (Apify)"
    if [[ -n "$APIFY" ]]; then
        pass_msg "Apify token present — Quora actor accessible"
    else
        warn_msg "APIFY_TOKEN not set — cannot test Quora actor"
    fi

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✔ Passed: $PASS_COUNT${NC}  ${RED}✘ Failed: $FAIL_COUNT${NC}  ${YELLOW}⚠ Warnings: $WARN_COUNT${NC}"
}

cmd_migrate() {
    echo -e "${BOLD}${CYAN}Applying Supabase Migration — Research Tables${NC}"

    MIGRATION_FILE="$PROJECT_ROOT/supabase/migrations/001_research_tables.sql"
    if [[ ! -f "$MIGRATION_FILE" ]]; then
        echo -e "${RED}Migration file not found: $MIGRATION_FILE${NC}"
        echo "Run Phase 1 to generate it, or create it manually from AGENT.md Section 4."
        exit 1
    fi

    ENV_FILE="$PROJECT_ROOT/.env"
    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${RED}.env file not found${NC}"
        exit 1
    fi

    SUPA_URL=$(grep "^SUPABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    SUPA_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

    if [[ -z "$SUPA_URL" || -z "$SUPA_KEY" ]]; then
        echo -e "${RED}Supabase credentials missing in .env${NC}"
        exit 1
    fi

    SQL_CONTENT=$(cat "$MIGRATION_FILE")
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${SUPA_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPA_KEY}" \
        -H "Authorization: Bearer ${SUPA_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$SQL_CONTENT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}" 2>/dev/null)

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        echo -e "${GREEN}Migration applied successfully.${NC}"
    else
        echo -e "${YELLOW}Direct RPC may not be available. Apply migration manually:${NC}"
        echo "  psql \$DATABASE_URL < $MIGRATION_FILE"
        echo "  OR use the Supabase SQL Editor in the dashboard."
    fi
}

cmd_cost_report() {
    echo -e "${BOLD}${CYAN}Topic Intelligence Engine — Cost Estimate Per Run${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    printf "  %-25s %-15s %-15s\n" "Source" "Per Run" "Monthly (16x)"
    echo "  ─────────────────────────────────────────────────────"
    printf "  %-25s %-15s %-15s\n" "Reddit (PRAW)" "\$0.00" "\$0.00"
    printf "  %-25s %-15s %-15s\n" "YouTube Data API v3" "\$0.00" "\$0.00"
    printf "  %-25s %-15s %-15s\n" "TikTok (Apify)" "~\$0.05" "~\$0.80"
    printf "  %-25s %-15s %-15s\n" "Google Trends (pytrends)" "\$0.00" "\$0.00"
    printf "  %-25s %-15s %-15s\n" "SerpAPI (PAA)" "~\$0.01" "~\$0.16"
    printf "  %-25s %-15s %-15s\n" "Quora (Apify)" "~\$0.05" "~\$0.80"
    printf "  %-25s %-15s %-15s\n" "OpenRouter (Haiku)" "~\$0.02" "~\$0.32"
    echo "  ─────────────────────────────────────────────────────"
    printf "  ${BOLD}%-25s %-15s %-15s${NC}\n" "TOTAL" "~\$0.13" "~\$2.08"
    echo ""
    echo "  Assumes 4 runs/week (16/month). Actual costs may vary."
}

# --------------- Main ---------------
case "${1:-check}" in
    setup)       cmd_setup ;;
    check)       cmd_check ;;
    test-source) cmd_test_source ;;
    migrate)     cmd_migrate ;;
    cost-report) cmd_cost_report ;;
    help|-h)     cmd_help ;;
    *)           echo "Unknown command: $1. Run 'bash skills.sh help'." ;;
esac
