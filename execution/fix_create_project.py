#!/usr/bin/env python3
"""Fix WF_CREATE_PROJECT_FROM_ANALYSIS to inject ALL data into projects table."""
import json, sys

wf = json.load(sys.stdin)

# 1. Fix Fetch Data to also query niche_viability_reports
for n in wf['nodes']:
    if n['name'] == 'Fetch Data':
        code = n['parameters']['jsCode']
        if 'niche_viability_reports' not in code:
            code = code.replace(
                'return [{ json: {',
                """// Also fetch niche viability report
  let viabilityReport = null;
  try {
    const vResp = await fetch(
      supabaseUrl + '/rest/v1/niche_viability_reports?analysis_group_id=eq.' + groupId + '&select=*&order=created_at.desc&limit=1',
      { headers: sbHeaders }
    );
    const vRows = await vResp.json();
    viabilityReport = Array.isArray(vRows) && vRows[0] ? vRows[0] : null;
  } catch (e) { /* ignore */ }

  return [{ json: {"""
            )
            code = code.replace(
                'comparison_report: report,',
                'comparison_report: report,\n    viability_report: viabilityReport,'
            )
            n['parameters']['jsCode'] = code
            print('Fixed Fetch Data: now queries niche_viability_reports', file=sys.stderr)
        break

# 2. Rewrite Create Project node
CREATE_CODE = """const data = $input.first().json;
if (data.failed || !data.success) return [{ json: data }];

const analyses = data.analyses || [];
const report = data.comparison_report;
const viability = data.viability_report;

const supabaseUrl = $env.SUPABASE_URL;
const sbHeaders = {
  'apikey': $env.SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + $env.SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json'
};

// Aggregate ALL comment insights across channels
const allContentGaps = [];
const allPainPoints = [];
const allRequestedTopics = [];
const allTopQuestions = [];
const allCompetitorMentions = [];
for (const a of analyses) {
  const ci = a.comment_insights;
  if (ci) {
    if (ci.content_gaps) allContentGaps.push(...ci.content_gaps);
    if (ci.pain_points) allPainPoints.push(...ci.pain_points);
    if (ci.requested_topics) allRequestedTopics.push(...ci.requested_topics);
    if (ci.top_questions) allTopQuestions.push(...ci.top_questions);
    if (ci.competitor_mentions) allCompetitorMentions.push(...ci.competitor_mentions);
  }
}

const channelAnalysisContext = {
  blue_ocean_gaps: report?.combined_blue_ocean_gaps || (viability?.blue_ocean_opportunities || []),
  differentiation_strategy: report?.differentiation_strategy || (viability?.differentiation_strategy || ''),
  content_pillars: report?.recommended_content_pillars || (viability?.recommended_content_pillars || []),
  topic_landscape: report?.combined_topic_landscape || {},
  saturation_map: report?.combined_saturation_map || (viability?.saturated_topics || []),
  overall_verdict: report?.overall_verdict || (viability?.viability_verdict || null),
  overall_verdict_score: report?.overall_verdict_score || (viability?.viability_score || null),
  channel_count: analyses.length,
  monetization_score: viability?.monetization_score || null,
  audience_demand_score: viability?.audience_demand_score || null,
  competition_gap_score: viability?.competition_gap_score || null,
  entry_difficulty_score: viability?.entry_difficulty_score || null,
  estimated_rpm: { low: viability?.estimated_rpm_low, mid: viability?.estimated_rpm_mid, high: viability?.estimated_rpm_high },
  sponsorship_potential: viability?.sponsorship_potential || null,
  moat_indicators: viability?.moat_indicators || null,
  posting_frequency_benchmark: viability?.posting_frequency_benchmark || null,
  audience_size_estimate: viability?.audience_size_estimate || null,
  engagement_benchmarks: viability?.engagement_benchmarks || null,
  comment_content_gaps: [...new Set(allContentGaps)],
  comment_pain_points: [...new Set(allPainPoints)],
  comment_requested_topics: [...new Set(allRequestedTopics)],
  comment_top_questions: [...new Set(allTopQuestions)],
  comment_competitor_mentions: [...new Set(allCompetitorMentions)],
};

const scriptReferenceData = {
  per_channel: analyses.map(a => ({
    channel_name: a.channel_name || 'Unknown',
    scripting_depth: a.scripting_depth || {},
    content_style: a.content_style || null,
    target_audience: a.target_audience_description || null,
    strengths: a.strengths || [],
    weaknesses: a.weaknesses || [],
    posting_schedule: a.posting_schedule || null,
  })),
  targets: viability?.script_depth_targets || null,
};

const nicheDesc = data.niche_description || report?.recommended_niche_description || '';

const projectRow = {
  name: data.niche_name,
  niche: data.niche_name,
  niche_description: nicheDesc.slice(0, 10000),
  channel_analysis_context: channelAnalysisContext,
  script_reference_data: scriptReferenceData,
  analysis_group_id: data.analysis_group_id,
  niche_viability_score: viability?.viability_score || null,
  niche_viability_verdict: viability?.viability_verdict || null,
  topics_to_avoid: viability?.topics_to_avoid || [],
  recommended_topics: viability?.recommended_topics || [],
  recommended_angle: viability?.recommended_angle || null,
  revenue_projections: viability?.revenue_projections || null,
  script_depth_targets: viability?.script_depth_targets || null,
  title_dna_patterns: viability?.title_dna_patterns || null,
  thumbnail_dna_patterns: viability?.thumbnail_dna_patterns || null,
  status: 'created'
};

try {
  const res = await fetch(supabaseUrl + '/rest/v1/projects', {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify(projectRow)
  });
  if (!res.ok) {
    const errText = await res.text();
    return [{ json: { ...data, success: false, error: 'HTTP ' + res.status + ': ' + errText.slice(0, 200) } }];
  }
  const inserted = await res.json();
  const project = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;
  if (!project || !project.id) {
    return [{ json: { ...data, success: false, error: 'Empty insert' } }];
  }
  return [{ json: { ...data, project_id: project.id, failed: false } }];
} catch (e) {
  return [{ json: { ...data, success: false, error: e.message } }];
}"""

for n in wf['nodes']:
    if n['name'] == 'Create Project':
        n['parameters']['jsCode'] = CREATE_CODE
        print('Rewrote Create Project with full data injection', file=sys.stderr)
        break

# Output clean workflow
clean = {'name': wf['name'], 'nodes': wf['nodes'], 'connections': wf['connections']}
s = {}
for k in ['executionOrder', 'callerPolicy', 'executionTimeout']:
    if k in wf.get('settings', {}):
        s[k] = wf['settings'][k]
if s:
    clean['settings'] = s

json.dump(clean, sys.stdout)
