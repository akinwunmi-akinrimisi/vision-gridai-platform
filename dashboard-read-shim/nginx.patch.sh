#!/usr/bin/env bash
# Inject a `location = /webhook/dashboard/read` block BEFORE `location /webhook/`
# so the shim service catches that one path while everything else still proxies
# to n8n. Idempotent: skips if already patched.

set -e
CONF=/opt/nginx-conf/dashboard.conf

if grep -q '# === FIX-B-DASHBOARD-READ-SHIM ===' "$CONF"; then
  echo "  already patched, skipping"
  exit 0
fi

# Find the line of `location /webhook/ {` (with leading whitespace)
LINE=$(grep -n '^    location /webhook/ {' "$CONF" | head -1 | cut -d: -f1)
if [ -z "$LINE" ]; then
  echo "  ERROR: could not find /webhook/ location"
  exit 1
fi

# The new block, copied from the /webhook/ block but with proxy_pass swapped.
# Keeps CSRF, CORS, error rewrite — all the same security guarantees.
read -r -d '' NEW_BLOCK <<'NGINX' || true
    # === FIX-B-DASHBOARD-READ-SHIM ===
    # Sub-second drop-in for /webhook/dashboard/read. Routes that one path
    # to the dashboard-read container instead of paying n8n's 1-2s overhead.
    # All other /webhook/* still go to n8n via the location block below.
    location = /webhook/dashboard/read {
        # Same CSRF lockdown as /webhook/.
        set $csrf_allow 0;
        if ($request_method = OPTIONS)                           { set $csrf_allow 1; }
        if ($http_origin = "")                                   { set $csrf_allow 1; }
        if ($http_origin = "https://dashboard.operscale.cloud")  { set $csrf_allow 1; }
        if ($csrf_allow = 0) {
            return 403;
        }

        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Allow-Credentials;
        proxy_hide_header Access-Control-Expose-Headers;
        proxy_hide_header Access-Control-Max-Age;

        if ($http_origin = "https://dashboard.operscale.cloud") {
            add_header Access-Control-Allow-Origin "https://dashboard.operscale.cloud" always;
            add_header Access-Control-Allow-Methods "POST, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
            add_header Access-Control-Max-Age "300" always;
            add_header Vary "Origin" always;
        }

        if ($request_method = OPTIONS) {
            return 204;
        }

        # Same generic error envelope as the /webhook/ block.
        proxy_intercept_errors on;
        error_page 500 502 503 504 = @webhook_internal_error;

        proxy_pass http://dashboard-read:3030/dispatch;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Request-Id $request_id;
        # Same Bearer token nginx already injects for /webhook/. The shim
        # validates this exact token; on mismatch returns 403.
        # Token must match what's in /docker/dashboard-read/.env (DASHBOARD_API_TOKEN).
        # Source-of-truth on VPS: /root/keys_new.env (root-only, chmod 600).
        # Replace __INJECT_DASHBOARD_API_TOKEN__ with the live token before applying.
        proxy_set_header Authorization "Bearer __INJECT_DASHBOARD_API_TOKEN__";
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

NGINX

# Insert NEW_BLOCK at line $LINE (before the existing /webhook/ block)
HEAD=$((LINE - 1))
{
  head -n "$HEAD" "$CONF"
  echo "$NEW_BLOCK"
  tail -n "+$LINE" "$CONF"
} > "$CONF.new"

mv "$CONF.new" "$CONF"
echo "  patched ($CONF)"
