import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { useProjects } from '../hooks/useProjects';
import { useAnalyzeForClips } from '../hooks/useShorts';

import PageHeader from '../components/shared/PageHeader';
import TopicBrowser from '../components/shorts/TopicBrowser';
import ClipReviewGrid from '../components/shorts/ClipReviewGrid';
import SkeletonCard from '../components/ui/SkeletonCard';

/**
 * Shorts Creator page -- the largest page, decomposed into sub-components.
 *
 * Level 1: TopicBrowser (all topics across all projects with filters)
 * Level 2: ClipReviewGrid (Gate 4 review for a selected topic)
 *
 * This page file handles only:
 * - Top-level view routing (browser vs review)
 * - Analysis trigger + auto-transition
 * - Shorts summary query for all topics
 */
export default function ShortsCreator() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [analyzingTopicId, setAnalyzingTopicId] = useState(null);

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const analyzeMutation = useAnalyzeForClips();

  // Query ALL shorts across ALL projects for summary counts
  const { data: shortsSummaryAll } = useQuery({
    queryKey: ['shorts-summary-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shorts')
        .select('id, topic_id, review_status, production_status');

      if (error) throw error;

      const byTopic = {};
      for (const s of (data || [])) {
        if (!byTopic[s.topic_id]) {
          byTopic[s.topic_id] = { total: 0, approved: 0, skipped: 0, produced: 0, pending: 0 };
        }
        const bucket = byTopic[s.topic_id];
        bucket.total++;
        if (s.review_status === 'approved') bucket.approved++;
        else if (s.review_status === 'skipped') bucket.skipped++;
        else bucket.pending++;
        if (s.production_status === 'complete' || s.production_status === 'uploaded') bucket.produced++;
      }
      return byTopic;
    },
  });

  // Subscribe to shorts table for live updates on the summary
  useRealtimeSubscription('shorts', null, [['shorts-summary-all']]);

  // On mount: detect if an analysis is already running
  useEffect(() => {
    async function detectRunningAnalysis() {
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: logs } = await supabase
          .from('production_log')
          .select('topic_id, action, details, created_at')
          .eq('stage', 'shorts_analysis')
          .gte('created_at', fiveMinAgo)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!logs || logs.length === 0) return;

        const topicIds = [...new Set(logs.map((l) => l.topic_id))];
        for (const tid of topicIds) {
          const latestLog = logs.find((l) => l.topic_id === tid);
          const isComplete = latestLog?.details?.step === 'inserting_shorts' && latestLog?.action === 'completed';
          if (isComplete) continue;

          const hasExisting = shortsSummaryAll?.[tid]?.total > 0;
          if (!hasExisting) {
            setAnalyzingTopicId(tid);
            break;
          }
        }
      } catch { /* ignore */ }
    }

    if (!analyzingTopicId) {
      detectRunningAnalysis();
    }
  }, []); // Run once on mount

  // When analysis completes (shorts rows appear), auto-transition to clip review
  useEffect(() => {
    if (analyzingTopicId && shortsSummaryAll?.[analyzingTopicId]?.total > 0) {
      const analyzedTopicId = analyzingTopicId;
      setAnalyzingTopicId(null);
      toast.success('Analysis complete! Showing clips for review.');

      if (projects) {
        for (const p of projects) {
          const t = (p.topics_summary || []).find((t) => t.id === analyzedTopicId);
          if (t) {
            setSelectedTopic({ ...t, project_name: p.name || p.niche, project_id: p.id });
            break;
          }
        }
      }
    }
  }, [analyzingTopicId, shortsSummaryAll, projects]);

  const handleAnalyze = useCallback(
    (topicId) => {
      setAnalyzingTopicId(topicId);
      analyzeMutation.mutate(
        { topic_id: topicId },
        {
          onSuccess: () => toast.success('Analysis started -- finding 20 viral clips (~2 minutes)...'),
          onError: (err) => {
            setAnalyzingTopicId(null);
            toast.error(err?.message || 'Analysis failed');
          },
        }
      );
    },
    [analyzeMutation]
  );

  const inClipReview = !!selectedTopic;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Shorts Creator"
        subtitle={
          inClipReview
            ? 'Review and approve viral clip candidates'
            : 'Browse all topics across projects -- filter by project and status'
        }
      />

      {/* Topic browser (default view) */}
      {!inClipReview && (
        <>
          {projectsLoading && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
          {!projectsLoading && (
            <TopicBrowser
              projects={projects}
              onSelectTopic={setSelectedTopic}
              onAnalyze={handleAnalyze}
              analyzeLoading={analyzeMutation.isPending}
              analyzingTopicId={analyzingTopicId}
              shortsSummaryAll={shortsSummaryAll}
            />
          )}
        </>
      )}

      {/* Clip review (when a topic is selected) */}
      {inClipReview && (
        <ClipReviewGrid
          topicId={selectedTopic.id}
          topic={selectedTopic}
          onBack={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
}
