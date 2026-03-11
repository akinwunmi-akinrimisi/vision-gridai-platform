import ConfirmDialog from '../ui/ConfirmDialog';

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
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Start Production"
      confirmText="Start Production"
      confirmVariant="primary"
      loading={loading}
    >
      <div className="space-y-4">
        {/* Topic list */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Topics to produce ({topics.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {topics.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <span className="badge badge-primary text-[9px] px-1.5 py-0.5">
                  #{t.topic_number}
                </span>
                <span className="text-slate-700 dark:text-slate-300 truncate">
                  {t.seo_title || 'Untitled'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Estimated cost per topic
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">TTS Audio ({sceneCount} scenes)</span>
              <span className="tabular-nums font-medium">${ttsCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Images ({imagesCount} x Seedream)</span>
              <span className="tabular-nums font-medium">${imagesCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">I2V ({i2vCount} x Wan 2.5)</span>
              <span className="tabular-nums font-medium">${i2vCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">T2V ({t2vCount} x Wan 2.5)</span>
              <span className="tabular-nums font-medium">${t2vCost.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-white/[0.06] my-1" />
            <div className="flex justify-between font-semibold">
              <span>Per topic</span>
              <span className="tabular-nums">${perTopicCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total estimated cost</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            ${totalCost.toFixed(2)}
          </p>
          <p className="text-[10px] text-text-muted dark:text-text-muted-dark">
            for {topics.length} topic{topics.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
