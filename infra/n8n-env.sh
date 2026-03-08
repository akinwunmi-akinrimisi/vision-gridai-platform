#!/bin/bash
# ================================================================
# n8n Timeout Configuration for Vision GridAI
# ================================================================
# Apply: Add these to your n8n Docker container's environment variables
# Either in docker-compose.yml environment section or via docker run -e flags
#
# Why: Script generation (3-pass) takes 2-5 minutes per topic.
# The default n8n timeout of 300s will kill these executions.
# Niche research with web search can also exceed 5 minutes.
# ================================================================

# Execution timeout: 600 seconds (10 min) -- script generation can take 2-5 min
# Default is 300s which is too short for 3-pass script generation
export EXECUTIONS_TIMEOUT=600
export EXECUTIONS_TIMEOUT_MAX=900

# Binary data mode: filesystem prevents memory bloat on large payloads
# Script JSON and scene manifests can be several MB
export N8N_DEFAULT_BINARY_DATA_MODE=filesystem

# Process timeout for individual nodes (in seconds)
# Matches EXECUTIONS_TIMEOUT to prevent node-level premature kills
export N8N_EXECUTIONS_PROCESS_TIMEOUT=600

# Keep execution data for debugging (last 7 days / 168 hours)
# Prune old data to prevent DB bloat
export EXECUTIONS_DATA_PRUNE=true
export EXECUTIONS_DATA_MAX_AGE=168

# Node.js heap size: 1GB for n8n process
# Prevents OOM on large workflow payloads (172 scenes x media URLs)
export NODE_OPTIONS="--max-old-space-size=1024"

echo "n8n environment variables configured."
echo "Add these to your docker-compose.yml environment section or .env file."
echo ""
echo "To verify after applying:"
echo "  docker exec n8n env | grep EXECUTIONS_TIMEOUT"
echo "  docker exec n8n env | grep N8N_DEFAULT_BINARY_DATA_MODE"
