#!/bin/bash
# Run Python unit tests for Vision GridAI execution scripts.
# Usage: bash tests/run_python_tests.sh
#
# Prerequisites: pip install pytest

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Vision GridAI — Python Unit Tests ==="
echo "Project root: $PROJECT_ROOT"
echo ""

cd "$PROJECT_ROOT"
python3 -m pytest tests/unit/python/ -v --tb=short "$@"
