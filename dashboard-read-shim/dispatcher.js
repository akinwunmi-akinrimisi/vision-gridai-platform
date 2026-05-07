// Dispatcher logic ported verbatim from WF_DASHBOARD_READ "Dispatch Query"
// Code node (n8n workflow ID E1rnqJAbejG63q5G). The n8n-isms ($env, $input,
// "return [{ json }]") are the only things that change — all SQL filtering,
// table allowlists, and validation are preserved exactly so the {query, params}
// contract the dashboard already speaks against /webhook/dashboard/read works
// unchanged.
//
// Contract: dispatch(query, params) -> { success, data, error, http_status }

const SUPABASE = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  // Failing loud at module-load is intentional — refuse to boot without keys.
  throw new Error('Missing required env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
}

const SB_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Accept-Profile': 'public',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sbGet(path) {
  const res = await fetch(`${SUPABASE}/rest/v1/${path}`, { method: 'GET', headers: SB_HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function sbDelete(path) {
  const res = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return true;
}

function err(msg, code) {
  return { success: false, data: null, error: msg, http_status: code || 400 };
}

function ok(data) {
  return { success: true, data, error: null, http_status: 200 };
}

// ────────────────────────────────────────────────────────────────
// 1. projects_list
// ────────────────────────────────────────────────────────────────
async function projectsList() {
  const projFields = [
    'id','name','niche','niche_description','status','channel_style',
    'target_video_count','created_at','updated_at',
    'auto_pilot_enabled','monthly_budget_usd','monthly_spend_usd',
    'niche_health_score','niche_rpm_category','estimated_rpm_mid',
    'youtube_channel_id','drive_root_folder_id',
    'country_target','language','channel_type','parent_project_id','cost_ceiling_usd',
    'reference_analyses',
  ].join(',');
  const projects = await sbGet(`projects?select=${projFields}&order=created_at.desc`);
  if (!projects || projects.length === 0) return [];

  const ids = projects.map((p) => `"${p.id}"`).join(',');
  const topicFields = [
    'id','project_id','topic_number','status','review_status',
    'script_review_status','video_review_status','seo_title',
    'audio_progress','images_progress','i2v_progress','t2v_progress',
    'assembly_status','total_cost','yt_estimated_revenue','updated_at',
  ].join(',');
  const topics = await sbGet(`topics?select=${topicFields}&project_id=in.(${ids})`);
  const byProject = {};
  for (const t of topics || []) {
    if (!byProject[t.project_id]) byProject[t.project_id] = [];
    byProject[t.project_id].push(t);
  }
  return projects.map((p) => ({ ...p, topics_summary: byProject[p.id] || [] }));
}

// ────────────────────────────────────────────────────────────────
// 2. topics_for_project(project_id)
// ────────────────────────────────────────────────────────────────
async function topicsForProject(project_id) {
  if (!project_id || !UUID_RE.test(project_id)) {
    throw new Error('project_id must be a UUID');
  }
  const path = `topics?select=*,avatars(*)&project_id=eq.${project_id}&order=topic_number.asc`;
  const rows = await sbGet(path);
  return rows || [];
}

// ────────────────────────────────────────────────────────────────
// 3. topic_detail(topic_id)
// ────────────────────────────────────────────────────────────────
async function topicDetail(topic_id) {
  if (!topic_id || !UUID_RE.test(topic_id)) {
    throw new Error('topic_id must be a UUID');
  }
  const topics = await sbGet(`topics?select=*,avatars(*)&id=eq.${topic_id}`);
  const topic = (topics && topics[0]) || null;
  if (!topic) return null;
  let project = null;
  try {
    const projFields = 'id,name,niche,niche_description,status,channel_style,style_dna,youtube_channel_id,drive_root_folder_id,estimated_rpm_mid,niche_health_score';
    const arr = await sbGet(`projects?select=${projFields}&id=eq.${topic.project_id}`);
    project = (arr && arr[0]) || null;
  } catch (_) { /* project header is best-effort */ }
  return { topic, project };
}

// ────────────────────────────────────────────────────────────────
// 4. analytics_summary(project_id, time_range)
// ────────────────────────────────────────────────────────────────
async function analyticsSummary(project_id, time_range) {
  if (!project_id || !UUID_RE.test(project_id)) {
    throw new Error('project_id must be a UUID');
  }
  const valid = new Set(['7d', '30d', '90d', 'all']);
  const range = valid.has(time_range) ? time_range : '30d';

  const analyticsFields = [
    'id','topic_number','seo_title','status','published_at','thumbnail_url',
    'youtube_url','youtube_video_id',
    'yt_views','yt_watch_hours','yt_ctr','yt_impressions',
    'yt_avg_view_duration','yt_avg_view_pct',
    'yt_likes','yt_comments','yt_subscribers_gained',
    'yt_estimated_revenue','yt_actual_cpm','yt_last_updated',
    'total_cost','cost_breakdown',
  ].join(',');

  let currentPath = `topics?select=${analyticsFields}&project_id=eq.${project_id}&status=eq.published&order=published_at.desc`;
  if (range !== 'all') {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    currentPath += `&published_at=gte.${cutoff}`;
  }
  const current = await sbGet(currentPath);

  let previous = [];
  if (range !== 'all') {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const end = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    try {
      previous = await sbGet(
        `topics?select=yt_views,yt_watch_hours,yt_ctr,yt_estimated_revenue&project_id=eq.${project_id}&status=eq.published&published_at=gte.${start.toISOString()}&published_at=lt.${end.toISOString()}`
      );
    } catch (_) { previous = []; }
  }

  return { current: current || [], previous: previous || [], time_range: range };
}

// ────────────────────────────────────────────────────────────────
// 5. scene_progress(topic_id)
// ────────────────────────────────────────────────────────────────
async function sceneProgress(topic_id) {
  if (!topic_id || !UUID_RE.test(topic_id)) {
    throw new Error('topic_id must be a UUID');
  }
  const fields = [
    'id','topic_id','scene_number','scene_id','chapter',
    'audio_status','image_status','video_status','clip_status',
    'audio_duration_ms','start_time_ms','end_time_ms',
    'visual_type','emotional_beat','color_mood','zoom_direction',
    'caption_highlight_word','transition_to_next',
    'narration_text','image_prompt',
    'image_url','video_url','video_clip_url','audio_file_url',
    'skipped','skip_reason','pipeline_stage','has_video',
    'video_placement_start_ms','video_placement_end_ms',
  ].join(',');
  const rows = await sbGet(`scenes?select=${fields}&topic_id=eq.${topic_id}&order=scene_number.asc`);
  return rows || [];
}

// ────────────────────────────────────────────────────────────────
// 6. delete_project(project_id)
// ────────────────────────────────────────────────────────────────
async function deleteProject(project_id) {
  if (!project_id || !UUID_RE.test(project_id)) {
    throw new Error('project_id must be a UUID');
  }
  const SAFE_STATUSES = new Set([
    'created','researching','researching_competitors','researching_pain_points',
    'researching_keywords','researching_blue_ocean','researching_prompts',
    'research_failed','failed','topics_pending_review',
  ]);
  const proj = await sbGet(`projects?select=id,status&id=eq.${project_id}`);
  if (!proj || proj.length === 0) throw new Error(`project ${project_id} not found`);
  if (!SAFE_STATUSES.has(proj[0].status)) {
    throw new Error(`refusing to delete project in status=${proj[0].status}; only early-stage projects are deletable`);
  }
  const tables = ['production_log', 'scenes', 'avatars', 'topics', 'prompt_configs', 'prompt_templates', 'niche_profiles'];
  for (const t of tables) {
    try { await sbDelete(`${t}?project_id=eq.${project_id}`); }
    catch (e) { throw new Error(`failed deleting ${t}: ${e.message}`); }
  }
  await sbDelete(`projects?id=eq.${project_id}`);
  return { deleted: project_id, tables_cascaded: tables };
}

// ────────────────────────────────────────────────────────────────
// 7. ab_tests_for_project(project_id, filter)
// ────────────────────────────────────────────────────────────────
async function abTestsForProject(project_id, filter) {
  if (!project_id || !UUID_RE.test(project_id)) throw new Error('project_id must be a UUID');
  const validFilters = new Set(['all', 'running', 'completed', 'paused']);
  const f = validFilters.has(filter) ? filter : 'all';
  const selectCols = [
    'id','topic_id','project_id','youtube_video_id','test_type','status',
    'min_impressions_per_variant','min_days_per_variant','rotation_interval_hours',
    'confidence_threshold','current_variant_id','last_rotated_at','started_at',
    'completed_at','winning_variant_id','winner_applied','test_notes','created_at',
  ];
  const nestedSelect = selectCols.join(',') +
    ',variants:ab_test_variants(*),' +
    'topics(id,topic_number,seo_title,original_title,selected_title,thumbnail_url)';
  let path = `ab_tests?select=${nestedSelect}&project_id=eq.${project_id}&order=started_at.desc.nullslast,created_at.desc`;
  if (f !== 'all') path += `&status=eq.${f}`;
  let rows;
  try { rows = await sbGet(path); }
  catch (_e) {
    const fallbackCols = selectCols.join(',');
    let path2 = `ab_tests?select=${fallbackCols}&project_id=eq.${project_id}&order=started_at.desc.nullslast,created_at.desc`;
    if (f !== 'all') path2 += `&status=eq.${f}`;
    const tests = await sbGet(path2);
    const ids = (tests || []).map((t) => `"${t.id}"`).join(',');
    const variants = ids ? await sbGet(`ab_test_variants?select=*&ab_test_id=in.(${ids})`) : [];
    rows = (tests || []).map((t) => ({
      ...t,
      variants: (variants || []).filter((v) => v.ab_test_id === t.id),
      topics: null,
    }));
  }
  return (rows || []).map((t) => ({
    ...t,
    variants: Array.isArray(t.variants)
      ? [...t.variants].sort((a, b) => (a.variant_order ?? 0) - (b.variant_order ?? 0))
      : [],
  }));
}

// ────────────────────────────────────────────────────────────────
// 8. update_ab_test_status(ab_test_id, status)
// ────────────────────────────────────────────────────────────────
async function updateABTestStatus(ab_test_id, status) {
  if (!ab_test_id || !UUID_RE.test(ab_test_id)) throw new Error('ab_test_id must be a UUID');
  const allowed = new Set(['paused', 'running', 'completed', 'aborted']);
  if (!allowed.has(status)) throw new Error(`status must be one of ${[...allowed].join(',')}`);
  const now = new Date().toISOString();
  const patch = { status, updated_at: now };
  if (status === 'completed' || status === 'aborted') patch.completed_at = now;
  const res = await fetch(`${SUPABASE}/rest/v1/ab_tests?id=eq.${ab_test_id}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const rows = await res.json();
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row) throw new Error(`ab_test ${ab_test_id} not found`);
  return row;
}

// ────────────────────────────────────────────────────────────────
// 9. apply_ab_test_winner(ab_test_id)
// ────────────────────────────────────────────────────────────────
async function applyABTestWinner(ab_test_id) {
  if (!ab_test_id || !UUID_RE.test(ab_test_id)) throw new Error('ab_test_id must be a UUID');
  const tests = await sbGet(`ab_tests?select=id,test_type,winning_variant_id,topic_id&id=eq.${ab_test_id}`);
  const test = (tests || [])[0];
  if (!test) throw new Error(`ab_test ${ab_test_id} not found`);
  const now = new Date().toISOString();
  const patchAb = await fetch(`${SUPABASE}/rest/v1/ab_tests?id=eq.${ab_test_id}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ winner_applied: true, updated_at: now }),
  });
  if (!patchAb.ok) throw new Error(`HTTP ${patchAb.status}: ${(await patchAb.text()).slice(0, 300)}`);

  let promoted = false;
  if (test.test_type !== 'thumbnail' && test.winning_variant_id && test.topic_id) {
    const variants = await sbGet(`ab_test_variants?select=id,title,predicted_ctr_score&id=eq.${test.winning_variant_id}`);
    const winner = (variants || [])[0];
    if (winner?.title) {
      const patchT = await fetch(`${SUPABASE}/rest/v1/topics?id=eq.${test.topic_id}`, {
        method: 'PATCH',
        headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          selected_title: winner.title,
          title_ctr_score: winner.predicted_ctr_score ?? null,
          title_selected_at: now,
        }),
      });
      if (!patchT.ok) throw new Error(`HTTP ${patchT.status}: ${(await patchT.text()).slice(0, 300)}`);
      promoted = true;
    }
  }
  return { ab_test_id, winner_applied: true, title_promoted: promoted };
}

// ────────────────────────────────────────────────────────────────
// 10. sb_query — generic PostgREST proxy with table allowlist
// ────────────────────────────────────────────────────────────────
const SB_READ_ALLOWLIST = new Set([
  'analysis_groups','audience_comments','audience_insights','avatars',
  'channel_analyses','channel_comparison_reports','coach_messages','coach_sessions',
  'comments','competitor_alerts','competitor_channels','competitor_intelligence',
  'competitor_videos','cost_calculator_snapshots','daily_ideas','discovered_channels',
  'keywords','music_library','niche_health_history','niche_profiles',
  'niche_viability_reports','platform_metadata','pps_calibration','pps_config',
  'production_log','production_logs','production_registers','projects','prompt_configs','prompt_templates',
  'renders','research_categories','research_results','research_runs',
  'revenue_attribution','rpm_benchmarks','scenes','scheduled_posts','shorts',
  'social_accounts','style_profiles','system_prompts','topic_keywords','topics',
  'yt_discovery_results','yt_discovery_runs','yt_video_analyses',
  'ab_tests','ab_test_variants','ab_test_impressions',
]);
const SB_OP_ALLOWLIST = new Set(['eq','neq','gt','gte','lt','lte','like','ilike','is','in','not.is']);
function _validName(s) { return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s); }
function _validSelect(s) { return typeof s === 'string' && s.length <= 4000 && /^[a-zA-Z0-9_,.:()*\s!\-"']+$/.test(s); }

async function sbQuery(p) {
  const table = p.table;
  if (!table || !SB_READ_ALLOWLIST.has(table)) {
    throw new Error(`table "${table}" not in sb_query allowlist`);
  }
  const action = p.action || 'select';
  const sel = p.select || '*';
  if (!_validSelect(sel)) throw new Error('select clause failed validation');
  const filters = Array.isArray(p.filters) ? p.filters : [];
  const orders = Array.isArray(p.orders) ? p.orders : [];

  const parts = [];
  if (action === 'select') parts.push(`select=${encodeURIComponent(sel)}`);

  for (const tuple of filters) {
    if (!Array.isArray(tuple) || tuple.length < 3) throw new Error('filter must be [col,op,val]');
    const [col, op, val] = tuple;
    if (!_validName(col)) throw new Error(`bad filter column: ${col}`);
    if (!SB_OP_ALLOWLIST.has(op)) throw new Error(`bad filter op: ${op}`);
    let v;
    if (op === 'in') {
      if (!Array.isArray(val)) throw new Error('"in" filter needs array value');
      v = `(${val.map((x) => `"${String(x).replace(/["()]/g, '')}"`).join(',')})`;
    } else if (val === null || val === undefined) {
      v = 'null';
    } else if (typeof val === 'boolean') {
      v = val ? 'true' : 'false';
    } else {
      v = String(val);
    }
    parts.push(`${col}=${op}.${encodeURIComponent(v)}`);
  }
  for (const ord of orders) {
    if (!ord || !_validName(ord.col)) throw new Error(`bad order column: ${ord && ord.col}`);
    const asc = ord.ascending !== false;
    const nulls = ord.nullsFirst ? '.nullsfirst' : (ord.nullsLast ? '.nullslast' : '');
    parts.push(`order=${ord.col}.${asc ? 'asc' : 'desc'}${nulls}`);
  }
  if (p.limit != null && Number.isFinite(+p.limit)) {
    parts.push(`limit=${Math.min(Math.max(1, +p.limit), 2000)}`);
  }
  if (p.offset != null && Number.isFinite(+p.offset)) {
    parts.push(`offset=${Math.max(0, +p.offset)}`);
  }
  const qs = parts.join('&');
  const url = `${SUPABASE}/rest/v1/${table}${qs ? '?' + qs : ''}`;

  if (action === 'select') {
    const headers = { ...SB_HEADERS };
    if (p.countOnly) headers['Prefer'] = 'count=exact';
    if (p.head) headers['Range'] = '0-0';
    const res = await fetch(url, { method: p.head ? 'HEAD' : 'GET', headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    let count = null;
    const cr = res.headers.get('content-range');
    if (cr && cr.includes('/')) count = parseInt(cr.split('/').pop(), 10) || 0;
    if (p.head) return { rows: [], count, head: true };
    const rows = await res.json();
    if (p.single || p.maybeSingle) return (Array.isArray(rows) && rows[0]) || null;
    return p.countOnly ? { rows, count } : rows;
  }

  if (action === 'insert') {
    const pref = p.preferReturn === 'minimal' ? 'return=minimal' : 'return=representation';
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': pref },
      body: JSON.stringify(p.insertPayload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    if (pref === 'return=minimal') return null;
    const body = await res.json();
    if (p.single) return (Array.isArray(body) && body[0]) || null;
    return body;
  }

  if (action === 'update') {
    if (!filters.length) throw new Error('update requires at least one filter');
    const pref = p.preferReturn === 'minimal' ? 'return=minimal' : 'return=representation';
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, 'Prefer': pref },
      body: JSON.stringify(p.updatePayload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    if (pref === 'return=minimal') return null;
    const body = await res.json();
    if (p.single) return (Array.isArray(body) && body[0]) || null;
    return body;
  }

  if (action === 'delete') {
    if (!filters.length) throw new Error('delete requires at least one filter');
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return null;
  }

  throw new Error(`unknown action: ${action}`);
}

async function dispatch(query, params) {
  if (!query || typeof query !== 'string') {
    return err('query is required', 400);
  }
  const p = params && typeof params === 'object' ? params : {};
  try {
    let data;
    switch (query) {
      case 'projects_list':            data = await projectsList();                              break;
      case 'topics_for_project':       data = await topicsForProject(p.project_id);              break;
      case 'topic_detail':             data = await topicDetail(p.topic_id);                     break;
      case 'analytics_summary':        data = await analyticsSummary(p.project_id, p.time_range);break;
      case 'scene_progress':           data = await sceneProgress(p.topic_id);                   break;
      case 'delete_project':           data = await deleteProject(p.project_id);                 break;
      case 'ab_tests_for_project':     data = await abTestsForProject(p.project_id, p.filter);   break;
      case 'update_ab_test_status':    data = await updateABTestStatus(p.ab_test_id, p.status);  break;
      case 'apply_ab_test_winner':     data = await applyABTestWinner(p.ab_test_id);             break;
      case 'sb_query':                 data = await sbQuery(p);                                  break;
      default:                         return err(`unknown query: ${query}`, 400);
    }
    return ok(data);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    const status = msg.startsWith('HTTP 4') ? 400
      : msg.includes('must be a UUID') ? 400
      : msg.includes('must be one of') ? 400
      : msg.includes('must be a') ? 400
      : msg.includes('refusing to delete') ? 409
      : msg.includes('not found') ? 404
      : 500;
    return err(msg, status);
  }
}

module.exports = { dispatch };
