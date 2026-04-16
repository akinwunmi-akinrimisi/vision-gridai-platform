import { useState } from 'react';
import { Image, Film, DollarSign, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCostCalculator, IMAGE_COST, VIDEO_COST } from '../../hooks/useCostCalculator';
import { cn } from '@/lib/utils';

/**
 * CostCalculator: Pipeline gate component shown after scene segmentation completes.
 * Displays 4 radio-selectable cost option cards for the image/video ratio.
 * Production pauses here until the user confirms a selection.
 *
 * @param {string} topicId - Topic UUID
 * @param {string} projectId - Project UUID
 * @param {number} [sceneCountProp] - Optional override; falls back to topic.scene_count
 */
export default function CostCalculator({ topicId, projectId, sceneCount: sceneCountProp }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const {
    topic,
    sceneCount: hookSceneCount,
    options,
    isLoading,
    confirmSelection,
    isConfirming,
  } = useCostCalculator(topicId, projectId);

  const sceneCount = sceneCountProp || hookSceneCount;

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!sceneCount || sceneCount === 0) {
    return (
      <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8 text-center">
        <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No scenes found for this topic. Complete script generation first.
        </p>
      </div>
    );
  }

  const handleConfirm = () => {
    if (selectedIndex === null) return;
    confirmSelection({ selectedIndex });
  };

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Select Media Cost Option</h3>
            <p className="text-2xs text-muted-foreground">
              {sceneCount} scenes detected
              {topic?.seo_title ? ` — ${topic.seo_title}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Option cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isAllImages = option.videoRatio === 0;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'relative text-left p-4 rounded-xl border transition-all duration-200',
                'bg-card/80 backdrop-blur hover:bg-card',
                isSelected
                  ? 'ring-2 ring-primary border-primary shadow-lg shadow-primary/10'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              {/* Radio indicator */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-foreground">
                  {option.label}
                </span>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  )}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </div>

              {/* Counts */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <Image className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Images:</span>
                  <span className="font-medium tabular-nums">{option.imageCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Film className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Video clips:</span>
                  <span className="font-medium tabular-nums">{option.videoCount}</span>
                </div>
              </div>

              {/* Costs */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Image cost</span>
                  <span className="tabular-nums font-medium">${option.imageCost.toFixed(2)}</span>
                </div>
                {!isAllImages && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Video cost</span>
                    <span className="tabular-nums font-medium">${option.videoCost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="h-px bg-border mb-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold">Total</span>
                <span className={cn(
                  'text-base font-bold tabular-nums',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}>
                  ${option.totalCost.toFixed(2)}
                </span>
              </div>

              {/* Cheapest badge */}
              {isAllImages && (
                <div className="absolute -top-2 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Cheapest
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Model info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Image className="w-3 h-3" />
          Seedream 4.5 (${IMAGE_COST.toFixed(2)}/img)
        </span>
        <span className="flex items-center gap-1">
          <Film className="w-3 h-3" />
          Seedance 2.0 Fast (${VIDEO_COST.toFixed(2)}/clip)
        </span>
      </div>

      {/* Warning + confirm */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Pipeline pauses here until you select an option.
          </p>
        </div>
        <Button
          onClick={handleConfirm}
          disabled={selectedIndex === null || isConfirming}
          className="gap-2 flex-shrink-0"
        >
          {isConfirming ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : selectedIndex !== null ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          Confirm & Start Production
        </Button>
      </div>
    </div>
  );
}
