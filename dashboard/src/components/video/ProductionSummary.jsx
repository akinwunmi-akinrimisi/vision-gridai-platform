import { useState } from 'react';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

/**
 * Collapsible production summary - cost breakdown, scene count, duration, skipped scenes.
 */
export default function ProductionSummary({ topic, scenes = [] }) {
  const [expanded, setExpanded] = useState(false);

  const totalCost = topic?.total_cost ?? 0;
  const breakdown = topic?.cost_breakdown || {};
  const sceneCount = topic?.scene_count || scenes.length;
  const skippedCount = scenes.filter((s) => s.skipped).length;

  const lastScene = scenes.length > 0 ? scenes[scenes.length - 1] : null;
  const durationMs = lastScene?.end_time_ms || 0;

  const stages = [
    { label: 'Script', key: 'script' },
    { label: 'TTS', key: 'tts' },
    { label: 'Images', key: 'images' },
    { label: 'I2V', key: 'i2v' },
    { label: 'T2V', key: 't2v' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="production-summary">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-card-hover transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Production Summary
          </h3>
          <span className="text-xs font-bold text-primary tabular-nums">
            ${Number(totalCost).toFixed(2)}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            {stages.map(({ label, key }) => {
              const cost = breakdown[key] || 0;
              const pct = totalCost > 0 ? ((cost / totalCost) * 100).toFixed(0) : 0;
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground/80 tabular-nums">
                    ${Number(cost).toFixed(2)}
                    <span className="text-muted-foreground ml-1">({pct}%)</span>
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums">
                ${Number(totalCost).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-bold">{sceneCount}</div>
              <div className="text-[10px] text-muted-foreground">Scenes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {formatDuration(durationMs)}
              </div>
              <div className="text-[10px] text-muted-foreground">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{skippedCount}</div>
              <div className="text-[10px] text-muted-foreground">Skipped</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(ms) {
  if (!ms) return '0:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
