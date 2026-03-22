import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch actionable notification counts across all projects.
 * Counts pending gates, failed topics, and pending shorts review.
 * Subscribes to Supabase Realtime for live updates.
 */
export function useNotifications() {
  useRealtimeSubscription('topics', null, [['notifications']]);
  useRealtimeSubscription('shorts', null, [['notifications']]);

  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Fetch topics with actionable states
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, project_id, seo_title, review_status, script_review_status, video_review_status, status, updated_at, projects!inner(name)')
        .or('review_status.eq.pending,script_review_status.eq.pending,video_review_status.eq.pending,status.eq.failed');

      if (topicsError) throw topicsError;

      // Fetch shorts with pending review
      const { data: shorts, error: shortsError } = await supabase
        .from('shorts')
        .select('id, topic_id, clip_title, review_status, updated_at, topics!inner(seo_title, project_id, projects!inner(name))')
        .eq('review_status', 'pending');

      if (shortsError) throw shortsError;

      const items = [];

      // Group topic review pending (Gate 1) by project
      const topicsPending = (topics || []).filter((t) => t.review_status === 'pending');
      if (topicsPending.length > 0) {
        const byProject = groupBy(topicsPending, (t) => t.project_id);
        for (const [projectId, group] of Object.entries(byProject)) {
          const projectName = group[0]?.projects?.name || 'Unknown';
          items.push({
            type: 'topics',
            title: 'Topics Pending Review',
            description: `${group.length} topic${group.length > 1 ? 's' : ''} in ${projectName}`,
            path: `/project/${projectId}/topics`,
            count: group.length,
            icon: 'ListChecks',
            updatedAt: mostRecent(group),
          });
        }
      }

      // Group script review pending (Gate 2) by project
      const scriptsPending = (topics || []).filter((t) => t.script_review_status === 'pending' && t.review_status === 'approved');
      if (scriptsPending.length > 0) {
        const byProject = groupBy(scriptsPending, (t) => t.project_id);
        for (const [projectId, group] of Object.entries(byProject)) {
          const projectName = group[0]?.projects?.name || 'Unknown';
          // Link to first pending script
          const firstTopic = group[0];
          items.push({
            type: 'scripts',
            title: 'Scripts Pending Review',
            description: `${group.length} script${group.length > 1 ? 's' : ''} in ${projectName}`,
            path: `/project/${projectId}/topics/${firstTopic.id}/script`,
            count: group.length,
            icon: 'FileText',
            updatedAt: mostRecent(group),
          });
        }
      }

      // Group video review pending (Gate 3) by project
      const videosPending = (topics || []).filter((t) => t.video_review_status === 'pending' && t.status === 'assembled');
      if (videosPending.length > 0) {
        const byProject = groupBy(videosPending, (t) => t.project_id);
        for (const [projectId, group] of Object.entries(byProject)) {
          const projectName = group[0]?.projects?.name || 'Unknown';
          const firstTopic = group[0];
          items.push({
            type: 'videos',
            title: 'Videos Ready for Review',
            description: `${group.length} video${group.length > 1 ? 's' : ''} in ${projectName}`,
            path: `/project/${projectId}/topics/${firstTopic.id}/review`,
            count: group.length,
            icon: 'Film',
            updatedAt: mostRecent(group),
          });
        }
      }

      // Shorts pending review (Gate 4)
      const shortsPending = shorts || [];
      if (shortsPending.length > 0) {
        items.push({
          type: 'shorts',
          title: 'Shorts Pending Review',
          description: `${shortsPending.length} clip${shortsPending.length > 1 ? 's' : ''} awaiting approval`,
          path: '/shorts',
          count: shortsPending.length,
          icon: 'Clapperboard',
          updatedAt: mostRecent(shortsPending),
        });
      }

      // Failed topics
      const failed = (topics || []).filter((t) => t.status === 'failed');
      if (failed.length > 0) {
        const byProject = groupBy(failed, (t) => t.project_id);
        for (const [projectId, group] of Object.entries(byProject)) {
          const projectName = group[0]?.projects?.name || 'Unknown';
          items.push({
            type: 'errors',
            title: 'Production Failed',
            description: `${group.length} topic${group.length > 1 ? 's' : ''} failed in ${projectName}`,
            path: `/project/${projectId}/production`,
            count: group.length,
            icon: 'AlertTriangle',
            updatedAt: mostRecent(group),
          });
        }
      }

      // Sort by most recent first
      items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      const totalCount = items.reduce((sum, item) => sum + item.count, 0);

      return { items, totalCount };
    },
    refetchInterval: 60_000, // Fallback poll every 60s
  });
}

// ── Helpers ──────────────────────────────────────────

function groupBy(arr, keyFn) {
  const result = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

function mostRecent(items) {
  let latest = null;
  for (const item of items) {
    const d = item.updated_at || item.created_at;
    if (!latest || (d && new Date(d) > new Date(latest))) {
      latest = d;
    }
  }
  return latest || new Date().toISOString();
}
