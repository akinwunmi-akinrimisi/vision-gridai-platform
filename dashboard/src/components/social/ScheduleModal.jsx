import { useState, useMemo } from 'react';
import { Clock, Calendar, Link2, Send, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';

// ── Platform config ──────────────────────────────────

const PLATFORMS = [
  {
    key: 'tiktok',
    label: 'TikTok',
    color: 'text-pink-500 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-500/[0.12]',
    maxCaption: 2200,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: 'text-fuchsia-500 dark:text-fuchsia-400',
    bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-500/[0.12]',
    maxCaption: 2200,
  },
  {
    key: 'youtube_shorts',
    label: 'YouTube Shorts',
    color: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-500/[0.12]',
    maxCaption: 5000,
  },
];

function defaultDateTime(offsetHours = 0) {
  const d = new Date();
  d.setHours(d.getHours() + offsetHours);
  // Round to next hour
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toTimeString().slice(0, 5),
  };
}

export default function ScheduleModal({ isOpen, onClose, clip, onSubmit, isSubmitting }) {
  const defaultCaption = useMemo(() => {
    if (!clip) return '';
    const hashtags = (clip.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
    return `${clip.caption || clip.clip_title || ''}${hashtags ? `\n\n${hashtags}` : ''}`;
  }, [clip]);

  const [platformState, setPlatformState] = useState(() => {
    const todayDefault = defaultDateTime(0);
    const tomorrowDefault = defaultDateTime(24);
    return {
      tiktok: {
        enabled: true,
        date: todayDefault.date,
        time: '18:00',
        caption: clip?.tiktok_caption || defaultCaption,
      },
      instagram: {
        enabled: true,
        date: tomorrowDefault.date,
        time: '18:00',
        caption: clip?.instagram_caption || defaultCaption,
      },
      youtube_shorts: {
        enabled: true,
        date: todayDefault.date,
        time: '18:00',
        caption: defaultCaption,
      },
    };
  });

  const [stagger, setStagger] = useState(true);
  const [mode, setMode] = useState('schedule'); // 'schedule' | 'now'

  // When stagger is toggled, auto-offset Instagram by 24h from TikTok
  function handleStaggerChange(checked) {
    setStagger(checked);
    if (checked && platformState.tiktok.enabled) {
      const tikDate = new Date(`${platformState.tiktok.date}T${platformState.tiktok.time}`);
      const igDate = new Date(tikDate.getTime() + 24 * 60 * 60 * 1000);
      setPlatformState((prev) => ({
        ...prev,
        instagram: {
          ...prev.instagram,
          date: igDate.toISOString().slice(0, 10),
          time: igDate.toTimeString().slice(0, 5),
        },
      }));
    }
  }

  function updatePlatform(key, field, value) {
    setPlatformState((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handleSubmit() {
    const platforms = {};
    for (const p of PLATFORMS) {
      if (platformState[p.key].enabled) {
        const state = platformState[p.key];
        platforms[p.key] = {
          schedule_at: mode === 'schedule'
            ? new Date(`${state.date}T${state.time}`).toISOString()
            : null,
          caption: state.caption,
        };
      }
    }

    onSubmit({
      short_id: clip?.id,
      platforms,
      schedule_at: mode === 'schedule' ? platforms : null,
      captions: Object.fromEntries(
        Object.entries(platforms).map(([k, v]) => [k, v.caption])
      ),
    });
  }

  const enabledCount = PLATFORMS.filter((p) => platformState[p.key].enabled).length;

  if (!clip) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Post" maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
          <button
            onClick={() => setMode('schedule')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
              ${mode === 'schedule'
                ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
            `}
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
          <button
            onClick={() => setMode('now')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
              ${mode === 'now'
                ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
            `}
          >
            <Send className="w-4 h-4" />
            Post Now
          </button>
        </div>

        {/* Platform rows */}
        {PLATFORMS.map((platform) => {
          const state = platformState[platform.key];
          return (
            <div
              key={platform.key}
              className={`
                rounded-xl border transition-all duration-200
                ${state.enabled
                  ? 'border-slate-200/60 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]'
                  : 'border-slate-100 dark:border-white/[0.03] bg-slate-50/50 dark:bg-white/[0.01] opacity-60'}
              `}
            >
              {/* Platform header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.enabled}
                    onChange={(e) => updatePlatform(platform.key, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/30 cursor-pointer"
                  />
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${platform.bgColor}`}>
                    <span className={`text-xs font-bold ${platform.color}`}>
                      {platform.label[0]}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {platform.label}
                  </span>
                </label>
              </div>

              {/* Schedule controls */}
              {state.enabled && (
                <div className="px-4 pb-4 space-y-3">
                  {mode === 'schedule' && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="date"
                          value={state.date}
                          onChange={(e) => updatePlatform(platform.key, 'date', e.target.value)}
                          className="input text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="time"
                          value={state.time}
                          onChange={(e) => updatePlatform(platform.key, 'time', e.target.value)}
                          className="input text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Caption */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Caption
                      </label>
                      <span className={`text-2xs tabular-nums ${
                        (state.caption || '').length > platform.maxCaption
                          ? 'text-red-500'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {(state.caption || '').length}/{platform.maxCaption}
                      </span>
                    </div>
                    <textarea
                      value={state.caption || ''}
                      onChange={(e) => updatePlatform(platform.key, 'caption', e.target.value)}
                      rows={3}
                      className="input text-xs resize-none"
                      placeholder={`Caption for ${platform.label}...`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Stagger toggle */}
        {mode === 'schedule' && (
          <label className="flex items-center gap-3 px-1 cursor-pointer">
            <input
              type="checkbox"
              checked={stagger}
              onChange={(e) => handleStaggerChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/30 cursor-pointer"
            />
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Cross-platform stagger
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Instagram auto-offsets 24h from TikTok
              </p>
            </div>
          </label>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
          <button onClick={onClose} className="btn-ghost btn-sm" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary btn-sm"
            disabled={enabledCount === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Posting...
              </>
            ) : mode === 'schedule' ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                Schedule {enabledCount} platform{enabledCount !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Post Now to {enabledCount}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
