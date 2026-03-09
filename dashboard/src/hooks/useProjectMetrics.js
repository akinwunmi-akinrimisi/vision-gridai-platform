import { useMemo } from 'react';
import { useTopics } from './useTopics';

const IN_PROGRESS_STATUSES = [
  'scripting',
  'audio',
  'images',
  'video',
  'assembly',
  'assembling',
  'producing',
  'queued',
];

/**
 * Compute aggregated project metrics from topics data.
 * Derives counts, spend, revenue, and CPM from the topics query.
 *
 * @param {string} projectId - Project UUID
 * @returns {{ metrics: object, isLoading: boolean }}
 */
export function useProjectMetrics(projectId) {
  const { data: topics, isLoading } = useTopics(projectId);

  const metrics = useMemo(() => {
    if (!topics || topics.length === 0) {
      return {
        totalTopics: 0,
        approved: 0,
        inProgress: 0,
        published: 0,
        failed: 0,
        totalSpend: 0,
        totalRevenue: 0,
        avgCpm: 0,
      };
    }

    const totalTopics = topics.length;
    const approved = topics.filter((t) => t.review_status === 'approved').length;
    const inProgress = topics.filter((t) => IN_PROGRESS_STATUSES.includes(t.status)).length;
    const published = topics.filter((t) => t.status === 'published').length;
    const failed = topics.filter((t) => t.status === 'failed').length;

    const totalSpend = topics.reduce(
      (sum, t) => sum + (parseFloat(t.total_cost) || 0),
      0
    );

    const totalRevenue = topics.reduce(
      (sum, t) => sum + (parseFloat(t.yt_estimated_revenue) || 0),
      0
    );

    // Average CPM across topics that have actual CPM data
    const topicsWithCpm = topics.filter((t) => t.yt_actual_cpm != null && t.yt_actual_cpm > 0);
    const avgCpm =
      topicsWithCpm.length > 0
        ? topicsWithCpm.reduce((sum, t) => sum + parseFloat(t.yt_actual_cpm), 0) /
          topicsWithCpm.length
        : 0;

    return {
      totalTopics,
      approved,
      inProgress,
      published,
      failed,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgCpm: Math.round(avgCpm * 100) / 100,
    };
  }, [topics]);

  return { metrics, isLoading };
}
