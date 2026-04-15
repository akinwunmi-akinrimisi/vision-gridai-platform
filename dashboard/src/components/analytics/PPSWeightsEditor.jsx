import { useEffect, useMemo, useState } from 'react';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  usePPSConfig,
  useUpdatePPSConfig,
  useRecalibratePPS,
} from '../../hooks/useAnalyticsIntelligence';

const DEFAULTS = {
  outlier_weight: 0.3,
  seo_weight: 0.2,
  script_quality_weight: 0.2,
  niche_health_weight: 0.15,
  thumbnail_ctr_weight: 0.1,
  title_ctr_weight: 0.05,
};

const FACTORS = [
  {
    key: 'outlier_weight',
    label: 'Outlier Score',
    desc: 'CF01 — competitor outliers signal',
  },
  {
    key: 'seo_weight',
    label: 'SEO Score',
    desc: 'CF02 — search opportunity',
  },
  {
    key: 'script_quality_weight',
    label: 'Script Quality',
    desc: '3-pass evaluation score',
  },
  {
    key: 'niche_health_weight',
    label: 'Niche Health',
    desc: 'CF11 — weekly niche momentum',
  },
  {
    key: 'thumbnail_ctr_weight',
    label: 'Thumbnail CTR',
    desc: 'AI-predicted thumbnail click-through',
  },
  {
    key: 'title_ctr_weight',
    label: 'Title CTR',
    desc: 'AI-predicted title click-through',
  },
];

function formatPct(v) {
  return `${(v * 100).toFixed(0)}%`;
}

export default function PPSWeightsEditor({ projectId }) {
  const [open, setOpen] = useState(false);
  const { data: config, isLoading } = usePPSConfig(projectId);
  const updateMut = useUpdatePPSConfig(projectId);
  const recalMut = useRecalibratePPS(projectId);

  const [weights, setWeights] = useState(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  // Sync when config loads / Realtime updates arrive
  useEffect(() => {
    if (!config) return;
    const next = {};
    for (const f of FACTORS) {
      next[f.key] = config[f.key] != null ? parseFloat(config[f.key]) : DEFAULTS[f.key];
    }
    setWeights(next);
    setDirty(false);
  }, [config]);

  const total = useMemo(
    () =>
      FACTORS.reduce((s, f) => s + (parseFloat(weights[f.key]) || 0), 0),
    [weights],
  );

  const isBalanced = Math.abs(total - 1.0) < 0.001;

  const handleChange = (key, rawValue) => {
    // Slider emits integers 0-100 (percent). Convert to float share.
    const v = Math.max(0, Math.min(1, parseInt(rawValue, 10) / 100));
    setWeights((prev) => ({ ...prev, [key]: v }));
    setDirty(true);
  };

  const handleReset = () => {
    setWeights(DEFAULTS);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!isBalanced) {
      toast.error(`Weights must sum to 100% (currently ${formatPct(total)})`);
      return;
    }
    try {
      await updateMut.mutateAsync(weights);
      toast.success('PPS weights saved');
      setDirty(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to save weights');
    }
  };

  const handleRecalibrate = async () => {
    try {
      const res = await recalMut.mutateAsync();
      if (res?.success === false) {
        toast.error(res.error || 'Calibration failed');
      } else {
        toast.success('Calibration queued');
      }
    } catch (err) {
      toast.error(err?.message || 'Calibration failed');
    }
  };

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden mb-8"
      data-testid="pps-weights-editor"
    >
      {/* Collapsed header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-card-hover transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Sliders className="w-4 h-4 text-accent" />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Advanced: PPS Weights
            </h3>
            <p className="text-2xs text-muted-foreground/80 mt-0.5">
              Tune the 6-factor predicted performance formula
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {config?.calibration_sample_count != null && (
            <span className="tabular-nums hidden sm:inline">
              n = {config.calibration_sample_count}
            </span>
          )}
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border">
          {isLoading && (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !config && (
            <p className="py-4 text-xs text-muted-foreground">
              No pps_config row found for this project. The default weights
              shown cannot be saved until the project is seeded.
            </p>
          )}

          {!isLoading && config && (
            <>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {FACTORS.map((f) => {
                  const v = weights[f.key] ?? 0;
                  return (
                    <div key={f.key} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {f.label}
                          </p>
                          <p className="text-2xs text-muted-foreground/70 truncate">
                            {f.desc}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-accent flex-shrink-0">
                          {formatPct(v)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(v * 100)}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Total / status */}
              <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Total:</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      isBalanced ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {formatPct(total)}
                  </span>
                  {!isBalanced && (
                    <span className="text-2xs text-danger">
                      (must equal 100%)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                  {config.calibration_sample_count != null && (
                    <span className="tabular-nums">
                      Samples: {config.calibration_sample_count}
                    </span>
                  )}
                  {config.last_calibrated_at && (
                    <span>
                      Calibrated:{' '}
                      {new Date(config.last_calibrated_at).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={!dirty || !isBalanced || updateMut.isPending}
                  className="gap-1.5"
                >
                  {updateMut.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to defaults
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalibrate}
                  disabled={recalMut.isPending}
                  className="gap-1.5 ml-auto"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${recalMut.isPending ? 'animate-spin' : ''}`}
                  />
                  Recalibrate now
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
