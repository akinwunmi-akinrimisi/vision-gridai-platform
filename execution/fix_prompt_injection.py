#!/usr/bin/env python3
"""Fix WF_TOPICS_GENERATE and WF_SCRIPT_GENERATE to inject ALL intelligence data into prompts."""
import json, sys

mode = sys.argv[1] if len(sys.argv) > 1 else ''
wf = json.load(sys.stdin)

if mode == 'topics':
    # Fix WF_TOPICS_GENERATE Build Prompt node
    for n in wf['nodes']:
        if n['name'] == 'Build Prompt':
            code = n['parameters']['jsCode']

            # Inject channel analysis intelligence before the return
            injection = """

// === CHANNEL ANALYSIS INTELLIGENCE INJECTION ===
// Inject all intelligence from Channel Analyzer into the topic generation prompt
const ctx = project.channel_analysis_context;
const topicsToAvoid = project.topics_to_avoid || [];
const recommendedTopics = project.recommended_topics || [];
const recommendedAngle = project.recommended_angle || '';
const titleDna = project.title_dna_patterns;
const revProjections = project.revenue_projections;

if (ctx || topicsToAvoid.length > 0 || recommendedTopics.length > 0) {
  prompt += '\\n\\n=== COMPETITIVE INTELLIGENCE (from Channel Analyzer) ===\\n';

  if (ctx) {
    if (ctx.blue_ocean_gaps && ctx.blue_ocean_gaps.length > 0) {
      prompt += '\\nBLUE-OCEAN OPPORTUNITIES (high priority — at least 40% of topics should target these):\\n';
      for (const gap of ctx.blue_ocean_gaps) {
        const g = typeof gap === 'string' ? gap : (gap.topic || gap.opportunity || JSON.stringify(gap));
        const angle = gap.suggested_angle ? ' | Angle: ' + gap.suggested_angle : '';
        const demand = gap.estimated_demand ? ' | Demand: ' + gap.estimated_demand : '';
        prompt += '- ' + g + demand + angle + '\\n';
      }
    }

    if (ctx.differentiation_strategy) {
      prompt += '\\nDIFFERENTIATION STRATEGY: ' + (typeof ctx.differentiation_strategy === 'string' ? ctx.differentiation_strategy : JSON.stringify(ctx.differentiation_strategy)) + '\\n';
    }

    if (ctx.content_pillars && ctx.content_pillars.length > 0) {
      prompt += '\\nCONTENT PILLARS (organize topics around these): ' + ctx.content_pillars.join(', ') + '\\n';
    }

    if (ctx.comment_content_gaps && ctx.comment_content_gaps.length > 0) {
      prompt += '\\nAUDIENCE CONTENT GAPS (from viewer comments — strong demand signals):\\n';
      for (const gap of ctx.comment_content_gaps) {
        prompt += '- ' + gap + '\\n';
      }
    }

    if (ctx.comment_requested_topics && ctx.comment_requested_topics.length > 0) {
      prompt += '\\nTOPICS VIEWERS ARE ACTIVELY REQUESTING:\\n';
      for (const t of ctx.comment_requested_topics) {
        prompt += '- ' + t + '\\n';
      }
    }

    if (ctx.comment_pain_points && ctx.comment_pain_points.length > 0) {
      prompt += '\\nAUDIENCE PAIN POINTS (address these in topics):\\n';
      for (const p of ctx.comment_pain_points) {
        prompt += '- ' + p + '\\n';
      }
    }

    if (ctx.comment_top_questions && ctx.comment_top_questions.length > 0) {
      prompt += '\\nTOP AUDIENCE QUESTIONS (each could be a video topic):\\n';
      for (const q of ctx.comment_top_questions) {
        prompt += '- ' + q + '\\n';
      }
    }

    if (ctx.moat_indicators) {
      prompt += '\\nMOAT OPPORTUNITIES (defensible advantages to build):\\n' + JSON.stringify(ctx.moat_indicators) + '\\n';
    }
  }

  if (topicsToAvoid.length > 0) {
    prompt += '\\nTOPICS TO AVOID (saturated — competitors already dominate these):\\n';
    for (const t of topicsToAvoid) {
      prompt += '- ' + t + '\\n';
    }
    prompt += 'NONE of the 25 generated topics should cover these saturated subjects.\\n';
  }

  if (recommendedTopics.length > 0) {
    prompt += '\\nRECOMMENDED TOPIC SEEDS (use as starting points, expand creatively):\\n';
    for (const t of recommendedTopics) {
      const title = typeof t === 'string' ? t : (t.topic || t.title || JSON.stringify(t));
      const angle = t.angle ? ' | Angle: ' + t.angle : '';
      const formula = t.suggested_title_formula ? ' | Formula: ' + t.suggested_title_formula : '';
      prompt += '- ' + title + angle + formula + '\\n';
    }
  }

  if (recommendedAngle) {
    prompt += '\\nRECOMMENDED CHANNEL ANGLE: ' + recommendedAngle + '\\n';
  }

  if (titleDna) {
    prompt += '\\nCOMPETITOR TITLE DNA (use these patterns for CTR optimization):\\n' + JSON.stringify(titleDna) + '\\n';
  }

  if (revProjections) {
    prompt += '\\nREVENUE CONTEXT: ' + JSON.stringify(revProjections) + '\\n';
  }
}
// === END INTELLIGENCE INJECTION ===
"""

            code = code.replace(
                "return [{ json: { project_id, niche: project.niche, prompt } }];",
                injection + "\nreturn [{ json: { project_id, niche: project.niche, prompt } }];"
            )
            n['parameters']['jsCode'] = code
            print('Injected full intelligence into Build Prompt', file=sys.stderr)
            break

elif mode == 'script':
    # Fix WF_SCRIPT_GENERATE Prep & Read Avatar node
    for n in wf['nodes']:
        if n['name'] == 'Prep & Read Avatar':
            code = n['parameters']['jsCode']

            if 'channel_analysis_context' not in code:
                # Find where it builds the research_brief or prompt context
                injection = """

// === CHANNEL ANALYSIS INTELLIGENCE FOR SCRIPT GENERATION ===
const ctx = project.channel_analysis_context;
const scriptTargets = project.script_depth_targets;
const scriptRef = project.script_reference_data;
const topicsToAvoid = project.topics_to_avoid || [];
const recommendedAngle = project.recommended_angle || '';

let intelligence_block = '';
if (ctx || scriptTargets || scriptRef) {
  intelligence_block += '\\n\\n=== COMPETITIVE INTELLIGENCE FOR SCRIPTING ===\\n';

  if (recommendedAngle) {
    intelligence_block += '\\nCHANNEL POSITIONING: ' + recommendedAngle + '\\n';
    intelligence_block += 'Write from this angle — this is what differentiates us from competitors.\\n';
  }

  if (scriptTargets) {
    intelligence_block += '\\nSCRIPT DEPTH TARGETS (based on competitor analysis):\\n';
    intelligence_block += JSON.stringify(scriptTargets) + '\\n';
    intelligence_block += 'Our scripts should EXCEED these benchmarks since our 3-pass system goes deeper.\\n';
  }

  if (scriptRef && scriptRef.targets) {
    intelligence_block += '\\nCOMPETITOR SCRIPTING BENCHMARK:\\n' + JSON.stringify(scriptRef.targets) + '\\n';
  }

  if (ctx && ctx.comment_pain_points && ctx.comment_pain_points.length > 0) {
    intelligence_block += '\\nAUDIENCE PAIN POINTS TO ADDRESS IN THIS SCRIPT:\\n';
    for (const p of ctx.comment_pain_points) {
      intelligence_block += '- ' + p + '\\n';
    }
  }

  if (ctx && ctx.comment_content_gaps && ctx.comment_content_gaps.length > 0) {
    intelligence_block += '\\nCONTENT GAPS TO FILL (viewers want these covered in depth):\\n';
    for (const g of ctx.comment_content_gaps) {
      intelligence_block += '- ' + g + '\\n';
    }
  }

  if (ctx && ctx.comment_top_questions && ctx.comment_top_questions.length > 0) {
    intelligence_block += '\\nTOP VIEWER QUESTIONS TO ANSWER IN THIS SCRIPT:\\n';
    for (const q of ctx.comment_top_questions) {
      intelligence_block += '- ' + q + '\\n';
    }
  }

  if (topicsToAvoid.length > 0) {
    intelligence_block += '\\nTOPICS/ANGLES TO AVOID (saturated by competitors):\\n';
    for (const t of topicsToAvoid) {
      intelligence_block += '- ' + t + '\\n';
    }
  }

  if (ctx && ctx.differentiation_strategy) {
    intelligence_block += '\\nDIFFERENTIATION: ' + (typeof ctx.differentiation_strategy === 'string' ? ctx.differentiation_strategy : JSON.stringify(ctx.differentiation_strategy)) + '\\n';
  }
}
// === END INTELLIGENCE ===
"""
                # Inject before the return statement
                if 'return [{ json:' in code:
                    # Add intelligence_block to the output data
                    code = code.replace(
                        'return [{ json:',
                        injection + '\nreturn [{ json:'
                    )
                    # Also pass intelligence_block in the output so WF_SCRIPT_PASS can use it
                    code = code.replace(
                        'research_brief:',
                        'intelligence_block: intelligence_block,\n    research_brief:'
                    )
                    if 'research_brief' not in code:
                        # If no research_brief field, add intelligence_block alongside existing fields
                        code = code.replace(
                            'project_id:',
                            'intelligence_block: intelligence_block,\n    project_id:'
                        )

                n['parameters']['jsCode'] = code
                print('Injected intelligence into Prep & Read Avatar', file=sys.stderr)
            break

    # Also update WF_SCRIPT_PASS to include intelligence_block in the prompt
    # But WF_SCRIPT_PASS is a separate workflow — we handle that separately

# Output clean workflow
clean = {'name': wf['name'], 'nodes': wf['nodes'], 'connections': wf['connections']}
s = {}
for k in ['executionOrder', 'callerPolicy', 'executionTimeout']:
    if k in wf.get('settings', {}):
        s[k] = wf['settings'][k]
if s:
    clean['settings'] = s

json.dump(clean, sys.stdout)
