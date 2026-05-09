# Resume — T1 captioned video DONE on VPS, blocked on n8n Drive 403 (2026-05-08 ~22:00 UTC)

## TL;DR
T1 (Coles-Woolworths, topic_id `ac60bc97-1f1a-4ab2-aca3-c8c8b5d74ddc`) full pipeline succeeded EXCEPT the final Drive upload of the captioned mp4. The captioned 2.62 GB file sits ready on VPS at:

```
/data/n8n-production/ac60bc97-1f1a-4ab2-aca3-c8c8b5d74ddc/final/Why_Australia_Cant_Feed_Itself__The_Coles-Woolworths_Stranglehold_Exposed.mp4
```

**Captions are burned in** (Courier Prime / NOIR style, libx264 CRF 18, loudnorm audio). FFmpeg finalized at 21:42 UTC. Caption-burn service log says "Caption burn complete: 2502.7 MB".

## The recurring blocker
WF_DRIVE_UPLOAD (id `Pfu5DS1qqTl6wn9Q`) → `Upload to Drive` node returns **HTTP 403 from Google Drive API** on every attempt. User has re-authenticated `GoogleDriveAccount` credential (id `z0gigNHVnhcGz2pD`) and confirms **this is NOT an OAuth-expiry issue** — it has happened multiple sessions in a row, even immediately after re-auth, and even against folders that succeeded earlier the same day.

Failed exec ids today (all 403'd from Drive): `129708 129719 129745 129765`.

Don't burn time re-firing the workflow expecting different results. See [memory/feedback_n8n_drive_credential_recurring_403.md](../../.claude/projects/C--Users-DELL-Documents-Antigravity-vision-gridai-platform/memory/feedback_n8n_drive_credential_recurring_403.md) for hypotheses.

## Read first (don't skip)
1. `memory/MEMORY.md` top entry — current blocker context
2. `memory/feedback_n8n_drive_credential_recurring_403.md` — investigation hypotheses
3. `memory/feedback_n8n_helpers_httprequest_unavailable.md` — the helpers.httpRequest gotcha
4. Today's commits: `git log --oneline -10` — 8 commits all shipped

## Continuation runbook

### Step 1 — Investigate the credential before re-firing
Re-firing won't fix this. Pick ONE of:

**1a. Check the Google account behind the cred**
Open n8n UI → Settings → Credentials → `GoogleDriveAccount` → "Reconnect". The consent screen should show the email. Confirm:
- That email is the OWNER of folder `1QiRzua151F4p3ClYlxQtDImaJcpNIOEI` (where the uncaptioned upload SUCCEEDED at 20:09 UTC today)
- The granted scopes include `https://www.googleapis.com/auth/drive` (full Drive) NOT `drive.file` (limited to app-created files)

**1b. Hard-restart n8n to bust any cred cache**
```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud "docker restart n8n-n8n-1"
# Wait for healthy, then re-fire (Step 2)
```

**1c. Try a brand-new credential**
In n8n UI: create a new `googleDriveOAuth2Api` credential with a different name, OAuth a clean account. Then temporarily edit WF_DRIVE_UPLOAD's Upload to Drive node to use the new cred and re-fire.

### Step 2 — Re-fire upload (after 1a/1b/1c)
```bash
TID="ac60bc97-1f1a-4ab2-aca3-c8c8b5d74ddc"
DFOLDER="1QiRzua151F4p3ClYlxQtDImaJcpNIOEI"  # subfolder.final — same one uncaptioned landed in
TOKEN="$DASHBOARD_API_TOKEN"  # read from .env, never inline literal tokens in committed files

ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud "
curl -s -X POST 'https://n8n.srv1297445.hstgr.cloud/webhook/drive-upload' \
  -H \"Authorization: Bearer $TOKEN\" \
  -H 'Content-Type: application/json' \
  --max-time 600 \
  --data '{\"topic_id\":\"$TID\",\"file_url\":\"http://172.18.0.1:9999/$TID/final/Why_Australia_Cant_Feed_Itself__The_Coles-Woolworths_Stranglehold_Exposed.mp4\",\"file_name\":\"Why_Australia_Cant_Feed_Itself__The_Coles-Woolworths_Stranglehold_Exposed_CAPTIONED.mp4\",\"drive_folder_id\":\"$DFOLDER\"}' \
  -w '\\nHTTP %{http_code}\\n'
"

# Then check exec status:
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.srv1297445.hstgr.cloud/api/v1/executions?workflowId=Pfu5DS1qqTl6wn9Q&limit=2"
```

### Step 3 (if Step 2 still 403s) — Bypass n8n entirely
Two options:

**3a. SCP off VPS + manual Drive web upload**
```bash
scp -i ~/.ssh/id_ed25519_antigravity \
  root@srv1297445.hstgr.cloud:/data/n8n-production/ac60bc97-1f1a-4ab2-aca3-c8c8b5d74ddc/final/Why_Australia_Cant_Feed_Itself__The_Coles-Woolworths_Stranglehold_Exposed.mp4 \
  ~/Downloads/
# Then drag into Drive folder via web UI
```

**3b. Install gdrive CLI on VPS with a service account JSON**
Faster long-term fix for all future uploads. Service account auth doesn't have OAuth-token-expiry issues.

### Step 4 — After captioned mp4 is on Drive, finalize topic state
Once the upload succeeds, PATCH topics.drive_video_url with the captioned URL:
```bash
NEW_URL="<the new captioned drive url>"
curl -s -X PATCH "https://supabase.operscale.cloud/rest/v1/topics?id=eq.ac60bc97-1f1a-4ab2-aca3-c8c8b5d74ddc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"drive_video_url\":\"$NEW_URL\",\"status\":\"ready_review\"}" \
  -w 'HTTP %{http_code}\n'
```

Also trigger thumbnail generation (didn't run because Trigger Caption Burn errored before chain continued):
```bash
curl -s -X POST "https://dashboard.operscale.cloud/webhook/production/thumbnail" \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"topic_id\":\"ac60bc97-1f1a-4ab2-aca3-c8c8b5d74ddc\"}" \
  -w 'HTTP %{http_code}\n'
```

## What's safely shipped today (DO NOT roll back)
| Commit | What |
|---|---|
| `9ceca3d` | Patch G — Ken Burns Fire Assembly dedupe (was firing 134 times) |
| `8379a40` | Patch F2 — IMG_PROC scene rollup + live images_progress |
| `3feac0a` | Dashboard DotGrid segment-aware (X/956 not X/132) |
| `786a088` | Patches A2+B2 — dispatcher resume-safe |
| `3e59f4f` | Dashboard segment-aware progress (useProductionProgress) |
| `ea476ae` | 7 workflows fixed (this.helpers.httpRequest + execSync sleep) |
| `91b000d` | prodorder.md MYNEW top-10 |
| `1b8ed43` | Cost-calc segment projection |

## Open follow-ups (deferred, in priority order)
1. **DRIVE 403 root cause** — see runbook above. Until fixed, every long-form video will hit this same wall at the end.
2. Set up `gdrive` CLI with a service account on VPS as a fallback path for uploads (eliminates OAuth as a failure mode).
3. Audit other n8n Code nodes for `this.helpers.httpRequest` AND `execSync("sleep` patterns — only 7 fixed in `ea476ae`, but there are 154 active workflows.
4. WF_KEN_BURNS' Build Scene Clip pre-concat IIFE silently fails when `_xs(ls ...)` errors — should fail loudly. Today we manually concatenated the scene-level kb files via `concat_scenes.sh`; that worked but root cause of the silent failure not fixed.
5. WF_CAPTIONS_ASSEMBLY's "Fix Video MIME Type → Update Topic Assembled" branch is dead-end (no incoming connection) — that's why drive_video_url didn't auto-PATCH. We worked around it with manual PATCH. Permanent fix: wire it inline.
6. Dashboard's `useProductionProgress` Realtime tests are stale (failing pre-existing 2 of 25) — not blocking.
7. Mirror live WF_BUILD_SEGMENTS to repo (chunked Haiku version still uncommitted).

## Approved-but-waiting topics (don't fire until T1 ships)
T2, T3, T6, T7, T11, T13, T21, T22, T23 — all `review_status=approved` in MYNEW project. Production-order in `prodorder.md`.

## Cost so far for T1
- Image gen: $19.15 (438 Recraft + 517 Flux + 1 Ideogram fallback) over 956 segments
- Script gen: ~$0.30 (Pass 1 + Pass 2 cached)
- Audio (TTS): ~$3.31 across 132 scenes
- Ken Burns + assembly + caption burn: $0 (all FFmpeg)
- Drive storage: $0 (free tier)
- **Total ~$22.76** for a 2hr documentary
