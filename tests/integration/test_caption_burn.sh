#!/bin/bash
# Caption Burn Service Integration Tests
# Run on VPS: bash tests/integration/test_caption_burn.sh
# Requires: SSH access to VPS, caption-burn.service running on port 9998

PASS=0
FAIL=0
SERVICE_URL="http://localhost:9998"

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc (expected=$expected actual=$actual)"
    FAIL=$((FAIL+1))
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc (expected to contain '$needle')"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Caption Burn Service Integration Tests ==="
echo ""

echo "1. Service process check"
PID=$(pgrep -f caption_burn_service.py)
assert_eq "caption_burn_service.py is running" "1" "$([ -n "$PID" ] && echo 1 || echo 0)"

echo "2. Port 9998 is listening"
LISTENING=$(ss -tlnp | grep -c 9998)
assert_eq "port 9998 has listeners" "1" "$LISTENING"

echo "3. Systemd service status"
STATUS=$(systemctl is-active caption-burn.service 2>/dev/null)
assert_eq "caption-burn.service is active" "active" "$STATUS"

echo "4. GET /health returns 200"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health")
assert_eq "health endpoint HTTP status" "200" "$HTTP_CODE"

echo "5. Health response is valid JSON with correct fields"
HEALTH=$(curl -s "$SERVICE_URL/health")
assert_contains "has status=ok" '"status": "ok"' "$HEALTH"
assert_contains "has service=caption-burn" '"service": "caption-burn"' "$HEALTH"
assert_contains "has port=9998" '"port": 9998' "$HEALTH"

echo "6. Unknown path returns 404"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/nonexistent")
assert_eq "unknown path returns 404" "404" "$HTTP_CODE"

echo "7. POST /burn with empty body returns 400"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVICE_URL/burn" \
  -H "Content-Type: application/json" -d '{}')
assert_eq "empty burn request returns 400" "400" "$HTTP_CODE"

echo "8. POST /burn accepts valid payload asynchronously"
RESP=$(curl -s -X POST "$SERVICE_URL/burn" \
  -H "Content-Type: application/json" \
  -d '{"topic_id": "test-nonexistent", "srt_filename": "test.srt", "video_filename": "test.mp4", "drive_folder_id": "fakefolder"}')
assert_contains "burn returns accepted status" '"status": "accepted"' "$RESP"

echo "9. FFmpeg available in n8n container"
FFMPEG_OK=$(docker exec n8n-n8n-1 ffmpeg -version 2>&1 | head -1 | grep -c "ffmpeg version")
assert_eq "ffmpeg exists in container" "1" "$FFMPEG_OK"

echo "10. FFprobe available in n8n container"
FFPROBE_OK=$(docker exec n8n-n8n-1 ffprobe -version 2>&1 | head -1 | grep -c "ffprobe version")
assert_eq "ffprobe exists in container" "1" "$FFPROBE_OK"

echo "11. Systemd restart policy is configured"
RESTART=$(systemctl show caption-burn.service -p Restart 2>/dev/null | cut -d= -f2)
assert_eq "restart policy is on-failure or always" "1" "$(echo "$RESTART" | grep -cE 'on-failure|always')"

echo "12. Service timeout >= 3 hours (10800s)"
TIMEOUT=$(grep -oP 'timeout\s*=\s*(\d+)' /opt/caption-burn/caption_burn_service.py 2>/dev/null | grep -oP '\d+' | sort -rn | head -1)
if [ -z "$TIMEOUT" ]; then TIMEOUT=0; fi
assert_eq "timeout >= 10800s" "1" "$([ "$TIMEOUT" -ge 10800 ] && echo 1 || echo 0)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
