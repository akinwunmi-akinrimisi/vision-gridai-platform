import { DollarSign } from 'lucide-react';

const STAGES = [
  { label: 'Script', key: 'script' },
  { label: 'TTS', key: 'tts' },
  { label: 'Images', key: 'images' },
  { label: 'I2V', key: 'i2v' },
  { label: 'T2V', key: 't2v' },
];

/**
 * CostBreakdown: Card showing running cost with itemized breakdown.
 */
export default function CostBreakdown({ cost = 0, breakdown = {} }) {
  const totalCost = typeof cost === 'number' ? cost : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="cost-breakdown">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Running Cost</h3>
      </div>

      <div className="text-2xl font-bold tabular-nums text-primary mb-3">
        ${totalCost.toFixed(2)}
      </div>

      <div className="space-y-1.5">
        {STAGES.map(({ label, key }) => {
          const stageCost = breakdown[key] || 0;
          return (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground/80 tabular-nums">
                ${Number(stageCost).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
