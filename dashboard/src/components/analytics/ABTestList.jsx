import { useMemo, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useABTests,
  useRotateABTest,
  usePauseABTest,
  useResumeABTest,
  useStopABTest,
  useApplyWinner,
} from '../../hooks/useABTests';
import ABTestCard from './ABTestCard';
import EmptyState from '../shared/EmptyState';
import { cn } from '@/lib/utils';

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
];

export default function ABTestList({ projectId }) {
  const [filter, setFilter] = useState('all');

  const { data: allTests = [], isLoading } = useABTests(projectId, {
    filter: 'all',
  });

  const rotateMut = useRotateABTest(projectId);
  const pauseMut = usePauseABTest(projectId);
  const resumeMut = useResumeABTest(projectId);
  const stopMut = useStopABTest(projectId);
  const applyWinnerMut = useApplyWinner(projectId);

  const counts = useMemo(() => {
    const c = { running: 0, completed: 0, paused: 0, aborted: 0, pending: 0 };
    for (const t of allTests) {
      if (c[t.status] != null) c[t.status] += 1;
    }
    return c;
  }, [allTests]);

  const filteredTests = useMemo(() => {
    if (filter === 'all') return allTests;
    return allTests.filter((t) => t.status === filter);
  }, [allTests, filter]);

  const handleRotate = async (vars) => {
    try {
      const res = await rotateMut.mutateAsync(vars);
      if (res?.success === false) toast.error(res.error || 'Rotation failed');
      else toast.success('Rotation queued');
    } catch (err) {
      toast.error(err?.message || 'Rotation failed');
    }
  };

  const handlePause = async (vars) => {
    try {
      await pauseMut.mutateAsync(vars);
      toast.success('Test paused');
    } catch (err) {
      toast.error(err?.message || 'Failed to pause');
    }
  };

  const handleResume = async (vars) => {
    try {
      await resumeMut.mutateAsync(vars);
      toast.success('Test resumed');
    } catch (err) {
      toast.error(err?.message || 'Failed to resume');
    }
  };

  const handleStop = async (vars) => {
    try {
      await stopMut.mutateAsync(vars);
      toast.success('Test stopped');
    } catch (err) {
      toast.error(err?.message || 'Failed to stop');
    }
  };

  return (
    <div className="mt-8 mb-8" data-testid="ab-test-list">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-accent" />
            A/B Tests
          </h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {counts.running} running {'\u00b7'} {counts.completed} completed
            {counts.paused > 0 ? ` \u00b7 ${counts.paused} paused` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {FILTER_TABS.map((t) => {
            const count =
              t.value === 'all' ? allTests.length : counts[t.value] || 0;
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer tabular-nums',
                  filter === t.value
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                data-testid={`ab-filter-${t.value}`}
              >
                {t.label} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-8 flex items-center justify-center bg-card border border-border rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allTests.length === 0 && (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={FlaskConical}
            title="No A/B tests yet"
            description="Start an A/B test from any published video's review page to rotate title or thumbnail variants and find the winner."
          />
        </div>
      )}

      {/* Filtered empty state */}
      {!isLoading && allTests.length > 0 && filteredTests.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No {filter} tests.
          </p>
        </div>
      )}

      {/* Tests */}
      {!isLoading && filteredTests.length > 0 && (
        <div className="space-y-4">
          {filteredTests.map((test, i) => (
            <ABTestCard
              key={test.id}
              test={test}
              projectId={projectId}
              index={i}
              onRotate={handleRotate}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onApplyWinner={(vars) => applyWinnerMut.mutateAsync(vars)}
              isRotating={rotateMut.isPending && rotateMut.variables?.abTestId === test.id}
              isPausing={pauseMut.isPending && pauseMut.variables?.abTestId === test.id}
              isResuming={resumeMut.isPending && resumeMut.variables?.abTestId === test.id}
              isStopping={stopMut.isPending && stopMut.variables?.abTestId === test.id}
              isApplying={applyWinnerMut.isPending && applyWinnerMut.variables?.abTest?.id === test.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
