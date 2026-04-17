#!/usr/bin/env python3
"""Fix WF_SCRIPT_GENERATE Prep & Read Avatar to build intelligence_block from project data."""
import json, sys

wf = json.load(sys.stdin)

INTEL_BUILD = r"""
// === BUILD INTELLIGENCE BLOCK FROM PROJECT DATA ===
const ctx = project.channel_analysis_context || {};
const scriptTargets = project.script_depth_targets;
const topicsToAvoid = project.topics_to_avoid || [];
const recAngle = project.recommended_angle || '';

let intelligence_block = '';
if (Object.keys(ctx).length > 0 || topicsToAvoid.length > 0 || recAngle) {
  intelligence_block += '\n\n=== COMPETITIVE INTELLIGENCE FOR SCRIPTING ===\n';
  if (recAngle) {
    intelligence_block += '\nCHANNEL POSITIONING: ' + recAngle + '\nWrite from this angle.\n';
  }
  if (scriptTargets) {
    intelligence_block += '\nSCRIPT DEPTH TARGETS: ' + JSON.stringify(scriptTargets) + '\nOur 3-pass system should EXCEED these.\n';
  }
  if (ctx.comment_pain_points && ctx.comment_pain_points.length > 0) {
    intelligence_block += '\nAUDIENCE PAIN POINTS TO ADDRESS:\n';
    ctx.comment_pain_points.forEach(p => { intelligence_block += '- ' + p + '\n'; });
  }
  if (ctx.comment_content_gaps && ctx.comment_content_gaps.length > 0) {
    intelligence_block += '\nCONTENT GAPS TO FILL:\n';
    ctx.comment_content_gaps.forEach(g => { intelligence_block += '- ' + g + '\n'; });
  }
  if (ctx.comment_top_questions && ctx.comment_top_questions.length > 0) {
    intelligence_block += '\nTOP VIEWER QUESTIONS TO ANSWER:\n';
    ctx.comment_top_questions.forEach(q => { intelligence_block += '- ' + q + '\n'; });
  }
  if (topicsToAvoid.length > 0) {
    intelligence_block += '\nANGLES TO AVOID (saturated):\n';
    topicsToAvoid.forEach(t => { intelligence_block += '- ' + t + '\n'; });
  }
  if (ctx.differentiation_strategy) {
    intelligence_block += '\nDIFFERENTIATION: ' + (typeof ctx.differentiation_strategy === 'string' ? ctx.differentiation_strategy : JSON.stringify(ctx.differentiation_strategy)) + '\n';
  }
}
// === END INTELLIGENCE BLOCK ===
"""

for n in wf['nodes']:
    if n['name'] == 'Prep & Read Avatar':
        code = n['parameters']['jsCode']
        if 'intelligence_block' not in code:
            # Insert before the return statement
            code = code.replace(
                "return [{json: {topic, project, avatar, pass_number: 1, research_brief: researchBrief}}];",
                INTEL_BUILD + "\nreturn [{json: {topic, project, avatar, pass_number: 1, research_brief: researchBrief, intelligence_block: intelligence_block}}];"
            )
            n['parameters']['jsCode'] = code
            print('Injected intelligence_block build into Prep & Read Avatar', file=sys.stderr)
        break

clean = {'name': wf['name'], 'nodes': wf['nodes'], 'connections': wf['connections']}
s = {}
for k in ['executionOrder', 'callerPolicy']:
    if k in wf.get('settings', {}):
        s[k] = wf['settings'][k]
if s:
    clean['settings'] = s

json.dump(clean, sys.stdout)
