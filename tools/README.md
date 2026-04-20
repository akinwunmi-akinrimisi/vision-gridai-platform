# tools/

Scripts that enforce structural guarantees across the codebase. Run these
before deploying or as part of CI to catch classes of bugs that have
silently recurred across sessions.

## Tool index

| Tool | What it guards | Runtime |
|---|---|---|
| `verify_prompt_sync.py` | Drift between local Grand Master prompts (`.md`) and DB rows in `system_prompts` + `prompt_configs` | Python stdlib |
| `lint_n8n_workflows.py` | Wrong webhook credential (CRED-01), executeWorkflow receiving empty payload (CHAIN-01), un-authenticated sensitive webhooks (AUTH-01) | Python stdlib + SSH |

## Quick usage

```bash
# Intelligence renderer drift detector
python tools/verify_prompt_sync.py           # verify, exit 1 on drift
python tools/verify_prompt_sync.py update    # accept current state

# n8n workflow linter — scans live n8n via SSH + sqlite
SSH_KEY=~/.ssh/id_ed25519_antigravity python tools/lint_n8n_workflows.py

# Lint a specific exported JSON
python tools/lint_n8n_workflows.py --file workflows/WF_OUTLIER_SCORE.json

# Machine-readable output for CI
python tools/lint_n8n_workflows.py --format json > lint-report.json

# Enforce only specific rules
python tools/lint_n8n_workflows.py --rules CRED-01,CHAIN-01
```

## CI integration

Recommended GitHub Actions snippet (`.github/workflows/lint.yml`):

```yaml
name: n8n workflow lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Set up SSH
        env:
          SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan srv1297445.hstgr.cloud >> ~/.ssh/known_hosts
      - name: Lint n8n workflows
        env:
          SSH_KEY: ~/.ssh/id_ed25519
        run: python tools/lint_n8n_workflows.py
      - name: Verify prompt sync
        env:
          SUPABASE_URL: https://supabase.operscale.cloud
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: python tools/verify_prompt_sync.py
```

## Local pre-commit hook

Add to `.git/hooks/pre-commit` (make executable with `chmod +x`):

```bash
#!/usr/bin/env bash
# Skip on shallow / rebase / amend-in-progress
if [ -n "${SKIP_LINT:-}" ]; then exit 0; fi

echo "Linting n8n workflows..."
python tools/lint_n8n_workflows.py || {
  echo ""
  echo "Commit blocked by workflow lint errors above."
  echo "To bypass (not recommended): SKIP_LINT=1 git commit ..."
  exit 1
}
```

## Rules reference

### CRED-01 — Wrong webhook credential
**Severity: ERROR**
Detects webhook nodes using credential id `5JokeQj3U9W4Ys7p`
(`DASHBOARD_API_TOKEN`). That credential doesn't match the
`Authorization: Bearer <token>` header that nginx injects for dashboard
proxy calls. Result: `403 "Authorization data is wrong!"` from the
dashboard, every time.

**Fix**: Swap credential to id `KtMyWD7uJJBZYLjt` (`Authorization`).

### CHAIN-01 — executeWorkflow drops payload
**Severity: ERROR**
Detects an `executeWorkflow` node that is directly downstream of an
HTTP Request node using `Prefer: return=minimal`, AND has no
explicit `workflowInputs` mapping. Because `return=minimal` emits
an empty item, the child workflow receives no payload and throws
`requires { project_id }`-class errors.

**Fix options**:
- Upgrade `executeWorkflow` to typeVersion 1.2+ and add `workflowInputs`
  with explicit expressions pulling from upstream named nodes
- OR insert a Set/Code node between them that restores the needed
  identifier from an upstream named node

### AUTH-01 — Un-authenticated sensitive webhook
**Severity: WARN** (advisory — won't fail CI)
Detects webhook nodes with no authentication whose path contains
sensitive verbs (score, generate, approve, publish, delete, etc.).
If accessible via the public n8n URL, they could be invoked by anyone.

**Fix**: Set `authentication: headerAuth` with credential id `KtMyWD7uJJBZYLjt`.
Allowlist legitimate internal-only webhooks via `tools/lint_allowlist.txt`.

## Allowlisting findings

Add one line per finding to `tools/lint_allowlist.txt`:

```
# Format: RULE|workflow_id|node_name
AUTH-01|SsdE4siQ8EbO76ye|Webhook Trigger
```

Commit the allowlist so the decision is auditable. Include a comment
above the line explaining WHY the finding is acceptable.
