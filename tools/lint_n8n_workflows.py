#!/usr/bin/env python3
"""
lint_n8n_workflows.py - Structural guarantee for n8n workflows

Detects the classes of bugs that silently broke the scoring pipeline in
session 38 and prevents them from re-appearing. Exit codes:

    0  — no issues
    1  — findings present (CI should fail on this)
    2  — environment error (can't reach n8n)

RULES ENFORCED (one-per-rule exit reason on stdout)

  CRED-01  Webhook node uses the wrong DASHBOARD_API_TOKEN credential
           (id '5JokeQj3U9W4Ys7p'). Nginx at dashboard.operscale.cloud injects
           'Authorization: Bearer <token>' which only matches credential id
           'KtMyWD7uJJBZYLjt' ("Authorization"). The wrong credential returns
           403 "Authorization data is wrong!" for every dashboard call.

  CHAIN-01 executeWorkflow node is directly downstream of an HTTP Request
           with 'Prefer: return=minimal' (or no body-preserving behavior),
           with no Set/Code/Function node between them. Empty HTTP response
           becomes empty child-workflow input -> child throws 'requires
           {project_id}'-class errors. Fix: insert a Set node that restores
           the identifier from an upstream named node.

  AUTH-01  Webhook node has authentication != 'headerAuth' AND path contains
           a sensitive verb pattern (score|generate|approve|publish|delete).
           Surfaces webhooks that could be invoked anonymously.

  MODE-01  Code node with typeVersion 2 is missing parameters.mode. n8n 2.8.4
           task runner requires mode='runOnceForAllItems' for jsCode to be
           executable. Silent no-op at runtime.

  AUTH-WRITE-01
           HTTP Request node performing a write (POST/PATCH/PUT/DELETE) against
           SUPABASE_URL or /rest/v1/* lacks an explicit `Authorization` header
           in headerParameters. After migration 030 RLS lockdown, anonymous
           writes are denied with `permission denied for table <X>`. The
           legacy `apikey: ANON_KEY` pattern silently runs as the anon role.
           Fix: add `Authorization: =Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`.

  AUTH-READ-01
           HTTP Request node performing a GET against SUPABASE_URL or
           /rest/v1/* lacks an explicit `Authorization` header. While reads
           generally succeed under permissive RLS, several internal tables
           (system_prompts, prompt_templates, audience_insights) are RLS-locked
           and return 0 rows under anon — the canonical 2026-04-28 failure
           where Read Prompt Config returned 0 chars and Claude generated topics
           without seeing the master prompt. Fix: add explicit Authorization.

USAGE
    # Default: scan live n8n via sqlite dump
    python tools/lint_n8n_workflows.py

    # Lint a specific exported workflow JSON file
    python tools/lint_n8n_workflows.py --file workflows/WF_X.json

    # Output machine-readable JSON for CI integration
    python tools/lint_n8n_workflows.py --format json

    # Allow specific findings to pass (e.g. known cosmetic issues)
    python tools/lint_n8n_workflows.py --allowlist tools/lint_allowlist.txt

ENV
    SSH_KEY       default: ~/.ssh/id_ed25519_antigravity
    SSH_HOST      default: root@srv1297445.hstgr.cloud
    N8N_CONTAINER default: n8n-n8n-1

Stdlib only. Safe to run from any machine with SSH access to the VPS.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import subprocess
import sys
import tempfile

# === Canonical credential IDs — update if n8n credentials are rotated/renamed ===
BAD_CRED_ID = "5JokeQj3U9W4Ys7p"          # DASHBOARD_API_TOKEN (doesn't match nginx-injected Bearer format)
GOOD_CRED_ID = "KtMyWD7uJJBZYLjt"         # Authorization (matches nginx injection)

# Webhook path substrings that make AUTH-01 enforce auth strictly
SENSITIVE_PATH_PATTERNS = (
    "score", "generate", "approve", "publish", "reject", "delete",
    "regenerate", "execute", "trigger", "retry", "production",
)

# Words in HTTP Request parameters that indicate "return=minimal" behaviour.
# When present and the node feeds an executeWorkflow, we raise CHAIN-01.
RETURN_MINIMAL_MARKERS = ("return=minimal",)

# URL substrings that indicate the request targets Supabase REST.
SUPABASE_URL_MARKERS = (
    "SUPABASE_URL",                  # n8n env expression
    "supabase.operscale.cloud",      # production host
    "/rest/v1/",                     # PostgREST path (catches non-env hardcoded URLs)
)

WRITE_METHODS = {"POST", "PATCH", "PUT", "DELETE"}


class Finding:
    __slots__ = ("rule", "severity", "workflow_id", "workflow_name", "node", "detail")

    def __init__(self, rule: str, severity: str, workflow_id: str, workflow_name: str, node: str, detail: str):
        self.rule = rule
        self.severity = severity
        self.workflow_id = workflow_id
        self.workflow_name = workflow_name
        self.node = node
        self.detail = detail

    def to_dict(self) -> dict:
        return {
            "rule": self.rule,
            "severity": self.severity,
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "node": self.node,
            "detail": self.detail,
        }

    def to_text(self) -> str:
        return (
            f"{self.severity:<6} {self.rule}  [{self.workflow_name}] "
            f"node='{self.node}'  {self.detail}"
        )


# ---------- Source loaders ----------

def load_from_sqlite_dump(tmp_dir: pathlib.Path) -> list[tuple[str, str, list, dict]]:
    """Copy n8n sqlite from the container via SSH, then parse every active workflow.

    Returns list of (id, name, nodes_array, connections_obj).
    """
    ssh_key = os.environ.get("SSH_KEY", os.path.expanduser("~/.ssh/id_ed25519_antigravity"))
    ssh_host = os.environ.get("SSH_HOST", "root@srv1297445.hstgr.cloud")
    container = os.environ.get("N8N_CONTAINER", "n8n-n8n-1")

    if not os.path.exists(ssh_key):
        raise RuntimeError(f"SSH key not found at {ssh_key}")

    # Copy fresh sqlite dump to /tmp on VPS, then export workflow rows as JSONL.
    # `workflow_entity.nodes` lags when a new version is pushed via the REST
    # API — it's a denormalised cache. The authoritative nodes for an active
    # workflow live at `workflow_history.nodes` where
    # `workflow_history.versionId = workflow_published_version.publishedVersionId`.
    # LEFT JOIN + COALESCE means older n8n versions (no workflow_history row)
    # still return their `workflow_entity.nodes` as a fallback.
    # Always remove the temp dump when we're done to avoid filling / on disk.
    remote_cmd = (
        f"docker cp {container}:/home/node/.n8n/database.sqlite /tmp/n8n_lint.sqlite && "
        f"sqlite3 /tmp/n8n_lint.sqlite -json "
        f"\"SELECT we.id AS id, we.name AS name, "
        f"COALESCE(wh.nodes, we.nodes) AS nodes, "
        f"COALESCE(wh.connections, we.connections) AS connections "
        f"FROM workflow_entity we "
        f"LEFT JOIN workflow_published_version wpv ON wpv.workflowId = we.id "
        f"LEFT JOIN workflow_history wh ON wh.versionId = wpv.publishedVersionId "
        f"WHERE we.active=1\" && "
        f"rm -f /tmp/n8n_lint.sqlite"
    )
    result = subprocess.run(
        ["ssh", "-i", ssh_key, "-o", "StrictHostKeyChecking=no", ssh_host, remote_cmd],
        capture_output=True, timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(f"SSH/sqlite failed: {result.stderr.decode('utf-8', errors='replace')[:500]}")

    stdout_text = result.stdout.decode("utf-8", errors="replace")
    rows = json.loads(stdout_text) if stdout_text.strip() else []
    loaded = []
    for row in rows:
        try:
            nodes = json.loads(row.get("nodes") or "[]")
            connections = json.loads(row.get("connections") or "{}")
            loaded.append((row["id"], row["name"], nodes, connections))
        except (json.JSONDecodeError, KeyError) as exc:
            sys.stderr.write(f"WARN: failed to parse workflow {row.get('id')}: {exc}\n")
    return loaded


def load_from_file(path: pathlib.Path) -> list[tuple[str, str, list, dict]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    # Handle both n8n export formats: single workflow and wrapped { "workflows": [...] }.
    workflows = data.get("workflows", [data]) if isinstance(data, dict) else data
    out = []
    for wf in workflows:
        wf_id = wf.get("id", path.stem)
        name = wf.get("name", path.stem)
        nodes = wf.get("nodes", [])
        connections = wf.get("connections", {})
        out.append((wf_id, name, nodes, connections))
    return out


# ---------- Rule implementations ----------

def rule_cred_01(wf_id: str, wf_name: str, nodes: list, conns: dict) -> list[Finding]:
    findings = []
    for node in nodes:
        if node.get("type") != "n8n-nodes-base.webhook":
            continue
        cred = (node.get("credentials") or {}).get("httpHeaderAuth") or {}
        if cred.get("id") == BAD_CRED_ID:
            findings.append(Finding(
                rule="CRED-01",
                severity="ERROR",
                workflow_id=wf_id,
                workflow_name=wf_name,
                node=node.get("name", "<unnamed>"),
                detail=(
                    f"Webhook credential id='{BAD_CRED_ID}' ('DASHBOARD_API_TOKEN') "
                    f"does not match nginx-injected Authorization: Bearer format. "
                    f"Swap to id='{GOOD_CRED_ID}' ('Authorization')."
                ),
            ))
    return findings


def rule_chain_01(wf_id: str, wf_name: str, nodes: list, conns: dict) -> list[Finding]:
    """Flag executeWorkflow directly after HTTP Request with return=minimal."""
    findings = []
    node_by_name = {n.get("name"): n for n in nodes if n.get("name")}

    for src_name, src_conns in conns.items():
        src = node_by_name.get(src_name)
        if not src or src.get("type") != "n8n-nodes-base.httpRequest":
            continue

        # Does this HTTP Request use return=minimal anywhere in its params?
        params_text = json.dumps(src.get("parameters") or {})
        if not any(marker in params_text for marker in RETURN_MINIMAL_MARKERS):
            continue

        # Inspect every outgoing main connection.
        main_conns = (src_conns.get("main") or [])
        for conn_list in main_conns:
            for conn in conn_list or []:
                target = node_by_name.get(conn.get("node"))
                if not target or target.get("type") != "n8n-nodes-base.executeWorkflow":
                    continue

                # typeVersion 1.2+ supports workflowInputs — explicit input mapping.
                # If the target has populated workflowInputs, the empty upstream
                # item doesn't matter — the child gets exactly what workflowInputs
                # specifies. This is the n8n-native fix and is a FALSE POSITIVE
                # of the drop pattern.
                target_params = target.get("parameters") or {}
                wf_inputs = (target_params.get("workflowInputs") or {}).get("values") or []
                if wf_inputs:
                    continue

                findings.append(Finding(
                    rule="CHAIN-01",
                    severity="ERROR",
                    workflow_id=wf_id,
                    workflow_name=wf_name,
                    node=src_name,
                    detail=(
                        f"HTTP Request with 'Prefer: return=minimal' feeds directly "
                        f"into executeWorkflow '{target.get('name')}' which has no "
                        f"explicit workflowInputs. Empty body will make the child "
                        f"workflow receive no payload. Fix: either (a) add workflowInputs "
                        f"with typeVersion >=1.2, or (b) insert a Set/Code node between "
                        f"them that restores the needed identifier from an upstream "
                        f"named node."
                    ),
                ))
    return findings


def rule_auth_01(wf_id: str, wf_name: str, nodes: list, conns: dict) -> list[Finding]:
    findings = []
    for node in nodes:
        if node.get("type") != "n8n-nodes-base.webhook":
            continue
        params = node.get("parameters") or {}
        path = (params.get("path") or "").lower()
        auth = params.get("authentication")
        if auth and auth != "none":
            continue  # authenticated — good
        if not any(marker in path for marker in SENSITIVE_PATH_PATTERNS):
            continue  # not sensitive — skip
        findings.append(Finding(
            rule="AUTH-01",
            severity="WARN",
            workflow_id=wf_id,
            workflow_name=wf_name,
            node=node.get("name", "<unnamed>"),
            detail=(
                f"Webhook at /webhook/{path} has no authentication "
                f"(authentication='{auth or 'not set'}') but path looks "
                f"sensitive. Add headerAuth with credential id='{GOOD_CRED_ID}'."
            ),
        ))
    return findings


def rule_mode_01(wf_id: str, wf_name: str, nodes: list, conns: dict) -> list[Finding]:
    """Flag Code node with EXPLICITLY WRONG mode.

    n8n omits `mode` from workflow JSON when it equals the default
    ('runOnceForAllItems'). Missing mode is fine at runtime. Only flag when
    mode is EXPLICITLY set to 'runOnceForEachItem' while `jsCode` (which
    belongs with the other mode) is still populated — that's a genuine
    mismatch that will no-op silently.
    """
    findings = []
    for node in nodes:
        if node.get("type") != "n8n-nodes-base.code":
            continue
        params = node.get("parameters") or {}
        mode = params.get("mode")
        if mode is None:
            continue  # default is runOnceForAllItems — fine
        has_jscode = bool(params.get("jsCode"))
        has_jscode_each = bool(params.get("jsCodeEachItem"))
        if mode == "runOnceForAllItems" and has_jscode:
            continue
        if mode == "runOnceForEachItem" and has_jscode_each:
            continue
        if has_jscode and mode != "runOnceForAllItems":
            findings.append(Finding(
                rule="MODE-01",
                severity="ERROR",
                workflow_id=wf_id,
                workflow_name=wf_name,
                node=node.get("name", "<unnamed>"),
                detail=(
                    f"Code node has mode='{mode}' but jsCode is set (belongs with "
                    f"runOnceForAllItems). Will no-op. Either change mode or move "
                    f"code to jsCodeEachItem."
                ),
            ))
    return findings


# MODE-01 was removed after false positives: n8n Code node uses the same
# `jsCode` field regardless of mode, so "jsCode set with mode=runOnceForEachItem"
# is a legitimate configuration. The only genuine mode mismatches would be
# caught at runtime with a clearer error than a linter can provide.

def _http_request_targets_supabase(node: dict) -> bool:
    if node.get("type") != "n8n-nodes-base.httpRequest":
        return False
    url = (node.get("parameters") or {}).get("url", "") or ""
    return any(marker in url for marker in SUPABASE_URL_MARKERS)


def _has_explicit_authorization_header(node: dict) -> bool:
    """True iff headerParameters.parameters has a name=='Authorization' entry."""
    params = node.get("parameters") or {}
    hp = (params.get("headerParameters") or {}).get("parameters") or []
    for h in hp:
        nm = (h.get("name") or "").strip().lower()
        if nm == "authorization":
            return True
    return False


def _http_method_of(node: dict) -> str:
    return ((node.get("parameters") or {}).get("method") or "GET").upper()


def rule_auth_write_01(wf_id: str, wf_name: str, nodes: list, conns: dict) -> list[Finding]:
    """ERROR: write to Supabase REST without explicit Authorization header.

    Background: post migration 030_lock_down_rls.sql, anonymous role cannot
    INSERT/UPDATE/DELETE on any table. n8n's apikey-only credential pattern
    runs as anon and fails silently from the workflow's perspective (HTTP 200
    on 0-row PATCH, or 4xx that gets swallowed by upstream If-nodes). 44 nodes
    were patched 2026-04-28 (see feedback_supabase_writes_need_authorization.md).
    """
    findings = []
    for node in nodes:
        if not _http_request_targets_supabase(node):
            continue
        method = _http_method_of(node)
        if method not in WRITE_METHODS:
            continue
        if _has_explicit_authorization_header(node):
            continue
        findings.append(Finding(
            rule="AUTH-WRITE-01",
            severity="ERROR",
            workflow_id=wf_id,
            workflow_name=wf_name,
            node=node.get("name", "<unnamed>"),
            detail=(
                f"HTTP {method} to SUPABASE_URL with no explicit Authorization "
                f"header. Under RLS lockdown (migration 030) this runs as anon "
                f"and the write will be denied. Add header 'Authorization' = "
                f"'=Bearer {{{{ $env.SUPABASE_SERVICE_ROLE_KEY }}}}' in "
                f"headerParameters.parameters."
            ),
        ))
    return findings


def rule_auth_read_01(wf_id: str, wf_name: str, nodes: list, conns: dict) -> list[Finding]:
    """ERROR: GET to Supabase REST without explicit Authorization header.

    Background: while many tables permit anon SELECT, RLS-locked internal
    tables (system_prompts, prompt_templates, audience_insights, etc.) silently
    return 0 rows under anon. The 2026-04-28 'topics generated without master
    prompt' incident was traced to a Read Prompt Config GET that returned 0
    chars under anon. Defensive rule: every Supabase GET must send Authorization.
    """
    findings = []
    for node in nodes:
        if not _http_request_targets_supabase(node):
            continue
        method = _http_method_of(node)
        if method != "GET":
            continue
        if _has_explicit_authorization_header(node):
            continue
        findings.append(Finding(
            rule="AUTH-READ-01",
            severity="ERROR",
            workflow_id=wf_id,
            workflow_name=wf_name,
            node=node.get("name", "<unnamed>"),
            detail=(
                f"HTTP GET to SUPABASE_URL with no explicit Authorization "
                f"header. RLS-locked tables return 0 rows under anon (silent "
                f"data loss). Add header 'Authorization' = "
                f"'=Bearer {{{{ $env.SUPABASE_SERVICE_ROLE_KEY }}}}' in "
                f"headerParameters.parameters."
            ),
        ))
    return findings


RULES = [rule_cred_01, rule_chain_01, rule_auth_01, rule_auth_write_01, rule_auth_read_01]


# ---------- Main ----------

def load_allowlist(path: pathlib.Path | None) -> set[str]:
    if not path or not path.exists():
        return set()
    allowed = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        allowed.add(line)
    return allowed


def is_allowed(f: Finding, allowlist: set[str]) -> bool:
    # allowlist entries are "RULE|workflow_id|node_name"
    key = f"{f.rule}|{f.workflow_id}|{f.node}"
    return key in allowlist


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", type=pathlib.Path, help="Lint a single workflow JSON file instead of live sqlite")
    parser.add_argument(
        "--files",
        nargs="+",
        type=pathlib.Path,
        help="Lint multiple workflow JSON files (use with pre-commit / CI). "
             "Files that don't parse as workflow JSON are skipped silently.",
    )
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--allowlist", type=pathlib.Path, default=pathlib.Path(__file__).parent / "lint_allowlist.txt")
    parser.add_argument("--rules", help="Comma-separated rule IDs to enforce (default all): CRED-01,CHAIN-01,AUTH-01,AUTH-WRITE-01,AUTH-READ-01,MODE-01")
    args = parser.parse_args()

    active_rules = set(args.rules.split(",")) if args.rules else None
    allowlist = load_allowlist(args.allowlist)

    try:
        if args.files:
            workflows = []
            for p in args.files:
                # Skip non-existent paths gracefully (pre-commit may pass deleted files)
                if not p.exists():
                    continue
                # Skip non-workflow JSON files (e.g. a JSON in workflows/ that
                # isn't a workflow export — like a config or schema).
                try:
                    data = json.loads(p.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    continue
                # An n8n workflow JSON has a 'nodes' array. Skip anything else.
                has_nodes = isinstance(data, dict) and isinstance(data.get("nodes"), list)
                has_wrapped = isinstance(data, dict) and isinstance(data.get("workflows"), list)
                if not (has_nodes or has_wrapped):
                    continue
                # Match sqlite-mode semantics: only lint workflows that are
                # active=true on live. Repo retains historical inactive snapshots
                # and pre-API legacy exports without an `active` field;
                # skipping both keeps the gate aligned with what production runs.
                if has_nodes:
                    if data.get("active") is not True:
                        continue
                workflows.extend(load_from_file(p))
        elif args.file:
            workflows = load_from_file(args.file)
        else:
            with tempfile.TemporaryDirectory() as tmp:
                workflows = load_from_sqlite_dump(pathlib.Path(tmp))
    except Exception as exc:
        sys.stderr.write(f"ERROR: {exc}\n")
        return 2

    all_findings: list[Finding] = []
    for wf_id, wf_name, nodes, conns in workflows:
        for rule_fn in RULES:
            rule_name = rule_fn.__name__.replace("rule_", "").replace("_", "-").upper()
            if active_rules and rule_name not in active_rules:
                continue
            all_findings.extend(rule_fn(wf_id, wf_name, nodes, conns))

    # Partition into enforced and allowlisted
    enforced = [f for f in all_findings if not is_allowed(f, allowlist)]
    allowed = [f for f in all_findings if is_allowed(f, allowlist)]

    # Split by severity — only ERRORs should fail the lint (WARNs are advisory).
    errors = [f for f in enforced if f.severity == "ERROR"]
    warnings = [f for f in enforced if f.severity == "WARN"]

    if args.format == "json":
        print(json.dumps({
            "total_workflows": len(workflows),
            "findings_total": len(all_findings),
            "findings_errors": len(errors),
            "findings_warnings": len(warnings),
            "findings_allowlisted": len(allowed),
            "errors": [f.to_dict() for f in errors],
            "warnings": [f.to_dict() for f in warnings],
            "allowlisted": [f.to_dict() for f in allowed],
        }, indent=2))
    else:
        print(f"Linted {len(workflows)} active workflows. "
              f"{len(errors)} errors, {len(warnings)} warnings, "
              f"{len(allowed)} allowlisted.\n")
        if errors:
            print("=== ERRORS (must fix) ===")
            for f in errors:
                print(f.to_text())
            print()
        if warnings:
            print("=== WARNINGS (review) ===")
            for f in warnings:
                print(f.to_text())
            print()
        if not errors and not warnings:
            print("OK: no issues.")
        elif not errors:
            print("OK: no errors. Warnings above are advisory — review and allowlist "
                  "if intentional (RULE|workflow_id|node_name in tools/lint_allowlist.txt).")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
