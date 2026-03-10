import { Layers, ArrowRight } from 'lucide-react';

const phaseInfo = {
  2: { name: 'Niche Research', desc: 'Project creation, niche analysis, topic generation & review' },
  3: { name: 'Script Engine', desc: '3-pass script generation, scoring, and review workflow' },
  4: { name: 'Production', desc: 'TTS audio, image generation, video clips, FFmpeg assembly' },
  5: { name: 'Publishing', desc: 'Video preview, YouTube upload, analytics tracking' },
  6: { name: 'Polish', desc: 'Cost tracker, settings panel, supervisor agent, mobile' },
};

export default function ComingSoon({ phase = 2 }) {
  const info = phaseInfo[phase] || { name: `Phase ${phase}`, desc: 'Coming soon' };

  return (
    <div className="flex items-center justify-center py-16 lg:py-24 animate-in">
      <div className="text-center max-w-md w-full">
        {/* Animated icon */}
        <div className="relative inline-flex mb-8">
          <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-3xl blur-xl scale-125" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-indigo-500/10 dark:from-primary/20 dark:to-indigo-500/20 border border-primary/10 dark:border-primary/20 flex items-center justify-center">
            <Layers className="w-9 h-9 text-primary dark:text-blue-400" strokeWidth={1.5} />
          </div>
        </div>

        <span className="badge badge-blue mb-4 inline-flex">
          Phase {phase}
        </span>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
          {info.name}
        </h2>

        <p className="text-text-muted dark:text-text-muted-dark text-sm leading-relaxed mb-8 max-w-xs mx-auto">
          {info.desc}
        </p>

        {/* Progress indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/80 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.06] text-sm">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((p) => (
              <div
                key={p}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  p < phase
                    ? 'bg-emerald-500'
                    : p === phase
                    ? 'bg-primary animate-pulse'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-text-muted dark:text-text-muted-dark font-medium ml-1">
            Up next
          </span>
          <ArrowRight className="w-3 h-3 text-text-muted dark:text-text-muted-dark" />
        </div>
      </div>
    </div>
  );
}
