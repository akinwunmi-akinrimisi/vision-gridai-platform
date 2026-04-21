# Dependency CVE Scan — 2026-04-21 (audit L-1)

Run as part of Batch 4 follow-up to `docs/SECURITY_AUDIT_2026_04_21.md`.

## Scope

| Component                  | Manifest                               | Tool               |
|----------------------------|----------------------------------------|--------------------|
| Dashboard (React SPA)      | `dashboard/package.json` + lock        | `npm audit`        |
| ffmpeg-api (VPS service)   | `/docker/ffmpeg-api/package.json`      | `npm audit`        |
| audio-merger (VPS service) | `/docker/audio-merger/requirements.txt`| `pip-audit`        |
| caption-burn (VPS service) | stdlib-only (no manifest)              | — N/A              |

## Results

| Component    | Info | Low | Moderate | High | Critical | Notes                            |
|--------------|-----:|----:|---------:|-----:|---------:|----------------------------------|
| dashboard    |    0 |   0 |        0 |    0 |        0 | `npm audit` — 0 vulnerabilities  |
| ffmpeg-api   |    0 |   0 |        0 |    0 |        0 | `npm audit` after `npm i --package-lock-only` |
| audio-merger |    0 |   0 |        0 |    0 |        0 | `pip-audit -r requirements.txt`  |
| caption-burn |    - |   - |        - |    - |        - | Python stdlib only (http.server, subprocess, json) |

## Evidence

```
$ cd dashboard && npm audit --json | jq '.metadata.vulnerabilities'
{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}

$ ssh vps 'cd /docker/ffmpeg-api && npm i --package-lock-only && npm audit'
found 0 vulnerabilities

$ ssh vps 'cd /docker/audio-merger && pip-audit -r requirements.txt'
No known vulnerabilities found
```

## Verdict

**L-1 closed**. All production dependencies are clean at the time of scan.

## Operational recurrence

Scan should be re-run monthly or before any deploy that bumps a dependency.
Suggested cron on the VPS:

```
# monthly deps CVE scan
0 6 1 * * cd /docker/ffmpeg-api && npm audit --audit-level=high --json >/var/log/deps-ffmpeg-api.json
0 6 1 * * cd /docker/audio-merger && pip-audit -r requirements.txt --format json >/var/log/deps-audio-merger.json
```

Wiring those into an alert channel is tracked in the Batch 4 queue as a
future "dep-scan-cron" task — low priority given current zero-findings
state.
