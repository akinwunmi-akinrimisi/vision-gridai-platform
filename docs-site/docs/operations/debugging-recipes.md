# Debugging recipes

The recurring failure modes in Vision GridAI, with concrete diagnosis
+ fix steps. Each recipe ends with the **prevention** mechanism (lint
rule, schema constraint, workflow guardrail) that catches the same
class of bug at the source.

For incident-by-incident timelines, see [Incident Log](incident-log.md).

---

## Assembly truncation: final video shorter than expected

**Symptom.** `WF_CAPTIONS_ASSEMBLY` finishes successfully. The output
on Drive is shorter than the sum of the per-scene clips (e.g. expected
2:12, actual 2:01).

**Diagnosis.**

```bash
# Inside n8n container, check each scene clip's specs:
docker exec n8n-n8n-1 ffprobe -v error -show_entries \
  stream=codec_name,r_frame_rate,sample_rate -of csv=p=0 \
  /data/n8n-production/<topic>/clips/scene_*.mp4 | sort -u
```

If you see mixed `30/1 vs 25/1` (frame rate) or `24000 vs 48000`
(sample rate), the concat truncated silently.

**Root cause.** FFmpeg `concat -c copy` requires every input to have
**identical** codec, fps, and sample rate. Mismatch → concat picks the
shortest run of compatible streams, drops the rest. Output passes
ffprobe but is shorter than expected.

**Fix.**

1. Identify the outliers (the scenes whose clips don't match the
   majority).
2. Re-encode them: `ffmpeg -i <clip> -c:v libx264 -r 30 -c:a aac
   -ar 24000 -ac 1 -b:a 128k <clip>.fixed.mp4`.
3. Re-concat.
4. Re-burn captions via the host-side caption-burn service `:9998`.

**Prevention.** `WF_CAPTIONS_ASSEMBLY` now has 3-layer guardrail
(Session 35):

- "Build Scene Clip" verifies each clip's fps + sample rate after
  generation; auto-re-encodes mismatches.
- "Concat Video" pre-scans all clips and fixes outliers before concat.
- Post-concat duration check: output must be >95% of expected, and
  video/audio drift <5s. Mismatch logs `WARNING` for the downstream
  If-node to catch.

---

## JWT 401s after a Supabase rotation

**Symptom.** Workflows that worked yesterday return `401 jwt invalid`
or `JWSError JWSInvalidSignature` from Supabase REST. Realtime
disconnects with `{ event: 'phx_error', payload: { reason: 'jwt invalid' } }`.

**Diagnosis.** Check whether all the propagation locations agree. From
SSH:

```bash
# 1. The .env source-of-truth
grep JWT_SECRET /docker/supabase/.env | head -c 60

# 2. Kong consumers
docker exec supabase-kong-1 cat /etc/kong/kong.yml | grep -A 1 service_role

# 3. Realtime tenants (BOTH must match)
docker exec supabase-db-1 psql -U postgres -c \
  "SELECT name, length(jwt_secret) FROM _realtime.tenants;"

# 4. n8n env
docker exec n8n-n8n-1 sh -c 'echo $SUPABASE_SERVICE_ROLE_KEY | head -c 30'

# 5. Dashboard
curl -s https://dashboard.operscale.cloud/index.html | grep -o 'VITE_SUPABASE_ANON_KEY[^"]\{0,30\}'
```

If any of those don't match the new secret, you found the gap.

**Root cause.** Rotation procedure missed a step. The most-missed
steps (per Session 38 audit):

- Realtime `_realtime.tenants.jwt_secret` rows (there are **two** —
  `realtime` and `realtime-dev`).
- Kong `kong reload` after editing `kong.yml`.
- The 17+ stale n8n credentials (`httpHeaderAuth`, `supabaseApi`)
  that store JWTs by literal value rather than referencing the env.

**Fix.** Run the [rotation checklist](../infrastructure/auth-secrets.md#after-rotation-checklist)
top to bottom; don't skip credential exports.

**Prevention.** `tools/lint_n8n_workflows.py` rule `CRED-01` blocks
PRs that bind external HTTP nodes to inline `Authorization` headers
instead of stored credentials. After every rotation, run the script
in `MEMORY.md` "Rotation checklist going forward" to enumerate every
credential needing patching.

---

## n8n MCP corrupting Code nodes

**Symptom.** Code node loses its `mode` parameter after a workflow
update via the n8n MCP server (`synta-mcp` `n8n_update_partial_workflow`
or similar). On next execution, the node throws
`Error: Cannot find module '...'` or runs in the wrong mode.

**Root cause.** The MCP tool serializes Code-node JSON in a way that
strips the `mode` field. Re-importing the corrupted JSON locks the
broken state in.

**Fix.** Don't use MCP for Code-node edits. Instead, edit via raw REST
inside the container:

```bash
# Export the workflow
docker exec n8n-n8n-1 sh -c \
  'curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
   http://localhost:5678/api/v1/workflows/<ID> > /tmp/wf.json'

# Edit /tmp/wf.json (jq or manual)

# Re-import
docker exec -i n8n-n8n-1 sh -c \
  'curl -X PUT -H "X-N8N-API-KEY: $N8N_API_KEY" \
   -H "Content-Type: application/json" \
   --data-binary @/dev/stdin \
   http://localhost:5678/api/v1/workflows/<ID>' < /tmp/wf.json
```

**Prevention.** `MEMORY.md` "n8n MCP tool corrupts Code nodes" — flag
any MCP-driven Code-node edit; default to REST.

---

## Caption burn timeout

**Symptom.** `WF_CAPTIONS_ASSEMBLY` returns
`POST http://172.18.0.1:9998/burn 504 Gateway Timeout`. The host-side
service's systemd log shows `signal: killed`.

**Root cause.** Long videos (2hr) with hundreds of caption events take
>60 minutes to burn through libass. The default Python http.server
client timeout was 60min.

**Fix.** Service timeout is now 3 hours
(`/opt/caption-burn/caption_burn_service.py`). If you hit it:

1. Confirm via `journalctl -u caption-burn.service --since '1 hour ago'`.
2. Restart the service:
   `systemctl restart caption-burn.service`.
3. Re-fire `WF_CAPTIONS_ASSEMBLY` for the topic; resume logic skips
   already-burned scenes.

**Prevention.** Timeout bumped to 3 hours in code. Monitor service
health with `systemctl status caption-burn`.

---

## Realtime not updating

**Symptom.** Dashboard subscribes to a table successfully (`SUBSCRIBED`
status) but never receives `UPDATE` events when n8n writes rows.

**Diagnosis.**

```sql
-- Inside Postgres:
SELECT relname, relreplident
FROM pg_class
WHERE relname IN ('scenes', 'topics', 'projects', 'shorts', 'production_log');
-- relreplident must be 'f' (FULL); 'd' (default) means UPDATE events lack columns
```

**Root cause.** The table needs `REPLICA IDENTITY FULL` for Realtime
UPDATE events to include changed columns. Migration 001 sets this for
the core tables; new tables added later may not.

**Fix.**

```sql
ALTER TABLE <table> REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE <table>;
```

**Prevention.** New tables that need Realtime must include the two
statements in their migration. The schema overview lists every
Realtime-enabled table.

---

## Supabase `Prefer: return=minimal` returning `{}`

**Symptom.** A `PATCH /rest/v1/topics?id=eq.X` with
`Prefer: return=minimal` returns `{}` even when the WHERE clause
matched zero rows. n8n workflow can't tell whether the update happened.

**Root cause.** `return=minimal` always returns `{}` on success
**and** on no-match. There's no count.

**Fix.** Use `Prefer: return=representation` when you need to detect
whether the row existed:

```http
PATCH /rest/v1/topics?id=eq.<UUID>
Prefer: return=representation
```

The response is the row(s) that were updated; empty array means no
match.

**Prevention.** Direct affected. Workflows that update + then fire the
next chain stage should always use `return=representation` — the
"Prep Scoring Input" Set node pattern in `WF_TOPICS_GENERATE`
(Session 38 part 7) is the canonical example.

---

## FFmpeg concat with `-c copy` truncating

**Symptom.** Concat output is shorter than sum of inputs. ffprobe
reports the expected duration but playback ends early.

**Root cause.** Same family as
[assembly truncation](#assembly-truncation-final-video-shorter-than-expected).
Mixed audio specs (24kHz mono TTS vs 44.1kHz stereo AI) cause
non-monotonic DTS that stream copy can't reconcile.

**Fix.** Don't `-c copy` audio. Re-encode to a uniform spec at concat
time:

```bash
ffmpeg -f concat -safe 0 -i list.txt \
  -c:v copy -c:a aac -ar 48000 -ac 1 -b:a 128k \
  out.mp4
```

**Prevention.** `WF_CAPTIONS_ASSEMBLY` "Concat Video" node now uses
`-c:v copy -c:a aac -ar 48000 -ac 1 -b:a 128k`, not `-c copy`.
"Normalize Audio" node sets the same explicit audio params.

---

## n8n Docker `localhost` resolves to `::1`

**Symptom.** Workflow Code node calling `http://localhost:9998` (caption
burn) gets `ECONNREFUSED`. Same call from the host works.

**Root cause.** Inside the n8n container, Node resolves `localhost` to
the IPv6 loopback `::1`, which doesn't reach the host. Even
`127.0.0.1` is the *container's* loopback, not the host's.

**Fix.** Use the Docker bridge gateway: `172.18.0.1`. From inside any
container on the default bridge, that address is the host.

```js
// in an n8n Code node
const url = 'http://172.18.0.1:9998/burn';
```

**Prevention.** `MEMORY.md` "n8n Docker localhost IPv6" — first thing
to check when a Code node fails to reach a host service.

---

## Topics not getting scored (credential type mismatch)

**Symptom.** `WF_TOPICS_GENERATE` finishes; topics appear in the
dashboard. But `topics.outlier_score` and `topics.seo_score` stay
NULL. `WF_OUTLIER_SCORE` / `WF_SEO_SCORE` never fire.

**Diagnosis.** Check the trigger node's credential binding:

```bash
docker exec n8n-n8n-1 sh -c \
  'sqlite3 /home/node/.n8n/database.sqlite \
   "SELECT id, name, type FROM credentials_entity WHERE name LIKE \"%DASHBOARD%\""'
```

If the workflow's "Trigger WF_OUTLIER_SCORE" node binds a credential
typed `httpHeaderAuth` named `DASHBOARD_API_TOKEN` but the receiving
workflow's webhook node expects `Authorization`, nginx injects the
Bearer header but the receiving end gets two `Authorization` headers
(or worse, none).

**Root cause.** Two patterns of failure (both in Session 38):

1. **Credential type mismatch:** producer used a custom-named
   `httpHeaderAuth` credential, receiver expected the standard
   `Authorization` header. Fix: swap producer credential to
   `Authorization`.
2. **Empty-payload chain:** "Log Completed" node returned
   `Prefer: return=minimal` (= `{}`), so the next "Trigger
   WF_OUTLIER_SCORE" node had no `project_id`. Fix: insert a `Prep
   Scoring Input` Set node that re-attaches `project_id` from an
   earlier node.

**Fix.** Both are documented in `MEMORY.md` Session 38 part 7. The
credential swap is a one-line edit; the Set node insertion is
slightly bigger but a one-time fix.

**Prevention.** Lint rules `CRED-01` (credential mismatch) and
`CHAIN-01` (HTTP → Execute Workflow drop) block both classes at PR
review. As of 2026-04-20: 0 errors across 146 workflows.

---

## When the recipe doesn't fit

If the symptom isn't on this list, the playbook is:

1. **`production_logs` first.** Filter by `topic_id` + `stage` for the
   last 30 minutes. Errors with full stack are there.
2. **`topics.pipeline_stage` for resume point.** Tells you exactly
   which workflow last ran.
3. **Per-scene status fields.** `audio_status`, `image_status`,
   `clip_status` — the row level shows which scenes are stuck.
4. **n8n execution log.** UI → Executions → filter by workflow + time.
5. **n8n container logs.** `docker logs n8n-n8n-1 --tail 100`.

If after that you still don't have a hypothesis, document the new
failure shape in `MEMORY.md` and add a recipe here once you've found
the fix.
