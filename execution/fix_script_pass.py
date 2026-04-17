#!/usr/bin/env python3
"""Fix WF_SCRIPT_PASS to include intelligence_block in the Claude prompt."""
import json, sys

wf = json.load(sys.stdin)

for n in wf['nodes']:
    if 'Generate' in n['name']:
        code = n['parameters']['jsCode']

        if 'intelligence_block' not in code:
            code = code.replace(
                "const RESEARCH_PREFIX = (research_brief && research_brief.length > 50)",
                "const intelligence_block = v.intelligence_block || '';\n\nconst RESEARCH_PREFIX = (research_brief && research_brief.length > 50)"
            )

            code = code.replace(
                "const pt = await cc(sp, RESEARCH_PREFIX + WC_PREFIX + up, 64000);",
                "const INTEL_PREFIX = intelligence_block ? intelligence_block + '\\n\\n' : '';\n  const pt = await cc(sp, INTEL_PREFIX + RESEARCH_PREFIX + WC_PREFIX + up, 64000);"
            )

            n['parameters']['jsCode'] = code
            print('Injected intelligence_block into Generate With Retry', file=sys.stderr)
        break

clean = {'name': wf['name'], 'nodes': wf['nodes'], 'connections': wf['connections']}
s = {}
for k in ['executionOrder', 'callerPolicy', 'executionTimeout']:
    if k in wf.get('settings', {}):
        s[k] = wf['settings'][k]
if s:
    clean['settings'] = s

json.dump(clean, sys.stdout)
