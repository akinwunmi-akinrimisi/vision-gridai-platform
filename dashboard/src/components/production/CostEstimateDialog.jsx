import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

/**
 * Cost estimate confirmation dialog before starting production.
 * Shows topics to be queued with per-stage cost breakdown.
 */
export default function CostEstimateDialog({
  isOpen,
  onClose,
  onConfirm,
  topics = [],
  projectConfig = {},
  loading = false,
}) {
  const sceneCount = projectConfig.target_scene_count || 172;
  const imagesCount = projectConfig.images_per_video || 100;
  const i2vCount = projectConfig.i2v_clips_per_video || 25;
  const t2vCount = projectConfig.t2v_clips_per_video || 72;

  const ttsCost = sceneCount * 0.002; // ~$0.30 per video
  const imagesCost = imagesCount * (projectConfig.image_cost || 0.032);
  const i2vCost = i2vCount * (projectConfig.i2v_cost || 0.050);
  const t2vCost = t2vCount * (projectConfig.t2v_cost || 0.050);
  const perTopicCost = ttsCost + imagesCost + i2vCost + t2vCost;
  const totalCost = perTopicCost * topics.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Production</DialogTitle>
          <DialogDescription>
            Review estimated costs before starting the production pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Topic list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Topics to produce ({topics.length})
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              {topics.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className="text-2xs font-bold text-muted-foreground tabular-nums">
                    #{t.topic_number}
                  </span>
                  <span className="text-foreground/80 truncate">
                    {t.seo_title || 'Untitled'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Estimated cost per topic
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">TTS Audio ({sceneCount} scenes)</span>
                <span className="tabular-nums font-medium">${ttsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Images ({imagesCount} x Seedream)</span>
                <span className="tabular-nums font-medium">${imagesCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">I2V ({i2vCount} x Wan 2.5)</span>
                <span className="tabular-nums font-medium">${i2vCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">T2V ({t2vCount} x Wan 2.5)</span>
                <span className="tabular-nums font-medium">${t2vCost.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between font-semibold">
                <span>Per topic</span>
                <span className="tabular-nums">${perTopicCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total estimated cost</p>
            <p className="text-2xl font-bold text-primary tabular-nums">
              ${totalCost.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              for {topics.length} topic{topics.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="gap-2">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start Production
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
