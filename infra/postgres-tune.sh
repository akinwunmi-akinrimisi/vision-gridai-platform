#!/bin/bash
# ================================================================
# PostgreSQL Tuning for Vision GridAI (Supabase self-hosted)
# ================================================================
# Apply: Run via psql or add to postgresql.conf in Supabase Docker volume
#
# Default max_connections = 100, which is not enough for:
#   - Supabase Realtime (holds persistent connections per subscription)
#   - n8n workflows (each HTTP Request node uses a connection)
#   - Dashboard direct queries via Supabase JS client
#   - Supabase PostgREST (connection pooling)
#   - Supabase Auth, Storage, and other internal services
#
# Target: 200 connections supports ~10 concurrent dashboard users
# + 50 n8n workflow executions + Realtime + internal services
# ================================================================

PSQL_CMD="psql -h localhost -p 54321 -U postgres"

echo "=== Vision GridAI PostgreSQL Tuning ==="
echo ""

# Show current settings
echo "Current settings:"
$PSQL_CMD -c "SHOW max_connections;"
$PSQL_CMD -c "SHOW shared_buffers;"
$PSQL_CMD -c "SHOW work_mem;"
$PSQL_CMD -c "SHOW effective_cache_size;"

echo ""
echo "Applying tuning via ALTER SYSTEM..."
echo "(Changes take effect after PostgreSQL restart)"
echo ""

# Increase max connections from default 100 to 200
$PSQL_CMD -c "ALTER SYSTEM SET max_connections = 200;"
echo "  max_connections = 200 (was likely 100)"

# Shared buffers: 256MB (25% of 1GB allocated to PostgreSQL)
# Adjust based on your VPS RAM allocation to the DB container
$PSQL_CMD -c "ALTER SYSTEM SET shared_buffers = '256MB';"
echo "  shared_buffers = 256MB"

# Work memory per query: 8MB
# Allows complex JOINs (topics + scenes + avatars) without disk spills
$PSQL_CMD -c "ALTER SYSTEM SET work_mem = '8MB';"
echo "  work_mem = 8MB"

# Effective cache size: how much memory PostgreSQL can expect from OS cache
# Set to 50-75% of container memory limit
$PSQL_CMD -c "ALTER SYSTEM SET effective_cache_size = '512MB';"
echo "  effective_cache_size = 512MB"

# Statement timeout: 30 seconds for regular queries
# Prevents runaway queries from locking the DB
$PSQL_CMD -c "ALTER SYSTEM SET statement_timeout = '30s';"
echo "  statement_timeout = 30s"

# Idle transaction timeout: kill connections idle in transaction for 5 min
$PSQL_CMD -c "ALTER SYSTEM SET idle_in_transaction_session_timeout = '300s';"
echo "  idle_in_transaction_session_timeout = 300s"

echo ""
echo "=== Manual steps ==="
echo "1. Restart PostgreSQL container: docker restart supabase-db"
echo "2. Verify: $PSQL_CMD -c \"SHOW max_connections;\""
echo ""
echo "Alternative: Use docker-compose.override.yml to pass these as"
echo "command-line flags (see infra/docker-compose.override.yml)"
