#!/usr/bin/env python3
"""
verify_prompt_sync.py - Drift detector for Grand Master prompts

The two sources of truth for the script + topic generator prompts must
stay in sync:

  Local design docs:   Grand_Master_Prompt_Topic_Generator_v3.md
                       Grand_Master_Prompt_Script_Generator_v1.md
  DB runtime prompts:  system_prompts  (script system + pass1/2/3 + evaluator + retry)
                       prompt_configs  (topic generator master prompt)

This script dumps the current DB state + local .md file SHA256s into a
canonical snapshot and diffs it against the committed expected snapshot.
Any mutation on either side surfaces as a drift failure.

USAGE
    python tools/verify_prompt_sync.py           # verify against expected, exit 1 on drift
    python tools/verify_prompt_sync.py update    # accept current state as the new expected

REQUIRED ENV
    SUPABASE_URL              default: https://supabase.operscale.cloud
    SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY

Stdlib only. Works anywhere Python 3.7+ runs.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

SNAPSHOT_PATH = REPO_ROOT / "tools" / "prompt_snapshot.expected.txt"
CURRENT_PATH = REPO_ROOT / "tools" / ".prompt_snapshot.current.txt"

DEFAULT_SUPABASE_URL = "https://supabase.operscale.cloud"

SCRIPT_PROMPT_TYPES = (
    "script_system_prompt",
    "script_pass1",
    "script_pass2",
    "script_pass3",
    "script_evaluator",
    "script_retry_template",
)

GRAND_MASTER_FILES = (
    "Grand_Master_Prompt_Topic_Generator_v3.md",
    "Grand_Master_Prompt_Script_Generator_v1.md",
)


def load_env_file(path: pathlib.Path) -> None:
    """Minimal .env loader — KEY=VALUE lines, no quoting support."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def require_env() -> tuple[str, str, str]:
    url = os.environ.get("SUPABASE_URL", DEFAULT_SUPABASE_URL)
    anon = os.environ.get("SUPABASE_ANON_KEY", "")
    srv = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not anon or not srv:
        load_env_file(REPO_ROOT / ".env")
        anon = os.environ.get("SUPABASE_ANON_KEY", anon)
        srv = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", srv)
    if not anon or not srv:
        sys.stderr.write(
            "ERROR: SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set "
            "(env vars or .env file).\n"
        )
        sys.exit(2)
    return url, anon, srv


def pg_get(url: str, anon: str, srv: str, endpoint: str) -> list[dict]:
    full = f"{url}{endpoint}"
    req = urllib.request.Request(
        full,
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {srv}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        sys.stderr.write(f"HTTP {exc.code} from {full}\n{exc.read().decode('utf-8', 'replace')}\n")
        sys.exit(3)
    except urllib.error.URLError as exc:
        sys.stderr.write(f"Network error fetching {full}: {exc}\n")
        sys.exit(3)
    return json.loads(body) if body else []


def sha256_hex(text: str) -> str:
    # Normalise line endings so CRLF/LF cosmetic diffs don't trigger drift.
    normalised = text.replace("\r\n", "\n").replace("\r", "\n")
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


def build_snapshot(url: str, anon: str, srv: str) -> str:
    lines: list[str] = []
    lines.append("# Prompt snapshot")
    lines.append("# Format per row: table | prompt_type | version | project_id | sha256(prompt_text)")
    lines.append("# Plus: sha256 of each Grand Master .md source file")
    lines.append("# Any change here = drift that requires explicit 'update' acceptance.")
    lines.append("")

    # system_prompts (script-related only — keep the manifest focused)
    lines.append("## system_prompts (active, script-related)")
    types_list = ",".join(SCRIPT_PROMPT_TYPES)
    rows = pg_get(
        url, anon, srv,
        f"/rest/v1/system_prompts?is_active=eq.true"
        f"&prompt_type=in.({types_list})"
        f"&select=prompt_type,version,prompt_text"
        f"&order=prompt_type.asc,version.desc",
    )
    for row in rows:
        ptype = row.get("prompt_type", "?")
        version = row.get("version", "?")
        text = row.get("prompt_text") or ""
        digest = sha256_hex(text)
        lines.append(f"system_prompts | {ptype} | v{version} | (null) | {digest}")

    lines.append("")
    lines.append("## prompt_configs (active, all prompt_types and projects)")
    rows = pg_get(
        url, anon, srv,
        "/rest/v1/prompt_configs?is_active=eq.true"
        "&select=prompt_type,version,project_id,prompt_text"
        "&order=prompt_type.asc,project_id.asc,version.desc",
    )
    for row in rows:
        ptype = row.get("prompt_type", "?")
        version = row.get("version", "?")
        pid = row.get("project_id") or "null"
        text = row.get("prompt_text") or ""
        digest = sha256_hex(text)
        lines.append(f"prompt_configs | {ptype} | v{version} | {pid} | {digest}")

    lines.append("")
    lines.append("## Grand Master source files (SHA256 of raw file content, LF-normalised)")
    for fname in GRAND_MASTER_FILES:
        fpath = REPO_ROOT / fname
        if not fpath.exists():
            lines.append(f"{fname} | MISSING")
            continue
        content = fpath.read_text(encoding="utf-8", errors="replace")
        lines.append(f"{fname} | {sha256_hex(content)}")

    return "\n".join(lines) + "\n"


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "verify"
    if mode not in ("verify", "update"):
        sys.stderr.write("Usage: verify_prompt_sync.py [verify|update]\n")
        return 2

    url, anon, srv = require_env()
    current = build_snapshot(url, anon, srv)

    if mode == "update":
        SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT_PATH.write_text(current, encoding="utf-8")
        print(f"Snapshot updated at {SNAPSHOT_PATH.relative_to(REPO_ROOT)}")
        print("Remember to commit:")
        print(f"  git add {SNAPSHOT_PATH.relative_to(REPO_ROOT)}")
        print("  git commit -m 'chore(prompts): sync prompt snapshot'")
        return 0

    # verify mode
    if not SNAPSHOT_PATH.exists():
        SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT_PATH.write_text(current, encoding="utf-8")
        print(f"No expected snapshot at {SNAPSHOT_PATH.relative_to(REPO_ROOT)}.")
        print("Bootstrapping from current state. Review and commit:")
        print(f"  git add {SNAPSHOT_PATH.relative_to(REPO_ROOT)}")
        print("  git commit -m 'chore(prompts): bootstrap prompt sync snapshot'")
        return 0

    expected = SNAPSHOT_PATH.read_text(encoding="utf-8")
    if expected == current:
        print("OK: prompts in sync with expected snapshot.")
        return 0

    # Drift — print unified diff.
    diff_lines = list(difflib.unified_diff(
        expected.splitlines(keepends=True),
        current.splitlines(keepends=True),
        fromfile=str(SNAPSHOT_PATH.relative_to(REPO_ROOT)),
        tofile="(current live state)",
        lineterm="",
    ))
    CURRENT_PATH.write_text(current, encoding="utf-8")
    print("DRIFT DETECTED")
    print("")
    print("Either the DB prompt rows or the Grand Master .md files have changed")
    print("since the snapshot was last accepted. Diff:")
    print("")
    sys.stdout.write("".join(diff_lines))
    print("")
    print("If these changes are intentional, accept them:")
    print("")
    print("  python tools/verify_prompt_sync.py update")
    print(f"  git add {SNAPSHOT_PATH.relative_to(REPO_ROOT)}")
    print("  git commit -m 'chore(prompts): sync prompt snapshot'")
    print("")
    return 1


if __name__ == "__main__":
    sys.exit(main())
