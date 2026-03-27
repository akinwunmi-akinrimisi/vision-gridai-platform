import { useState, useMemo } from 'react';
import { Clock, Calendar, Link2, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// -- Platform config ----------------------------------------------------------

const PLATFORMS = [
  {
    key: 'tiktok',
    label: 'TikTok',
    initial: 'T',
    accentCls: 'text-[hsl(var(--chart-4))]',
    bgCls: 'bg-[hsl(var(--chart-4))]/10',
    maxCaption: 2200,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    initial: 'I',
    accentCls: 'text-[hsl(var(--chart-5))]',
    bgCls: 'bg-[hsl(var(--chart-5))]/10',
    maxCaption: 2200,
  },
  {
    key: 'youtube_shorts',
    label: 'YouTube Shorts',
    initial: 'Y',
    accentCls: 'text-danger',
    bgCls: 'bg-danger/10',
    maxCaption: 5000,
  },
];

function defaultDateTime(offsetHours = 0) {
  const d = new Date();
  d.setHours(d.getHours() + offsetHours);
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
  const [mode, setMode] = useState('schedule');

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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
          <DialogDescription>
            {clip.clip_title || `Clip #${clip.clip_number || '?'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Mode tabs */}
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="w-full">
              <TabsTrigger value="schedule" className="flex-1 gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="now" className="flex-1 gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Post Now
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Platform rows */}
          {PLATFORMS.map((platform) => {
            const state = platformState[platform.key];
            return (
              <div
                key={platform.key}
                className={`rounded-lg border transition-all ${
                  state.enabled
                    ? 'border-border bg-card'
                    : 'border-border/50 bg-muted/30 opacity-60'
                }`}
              >
                {/* Platform header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <Switch
                      checked={state.enabled}
                      onCheckedChange={(checked) => updatePlatform(platform.key, 'enabled', checked)}
                    />
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center ${platform.bgCls}`}>
                      <span className={`text-xs font-bold ${platform.accentCls}`}>
                        {platform.initial}
                      </span>
                    </span>
                    <span className="text-sm font-medium">{platform.label}</span>
                  </label>
                </div>

                {/* Schedule controls */}
                {state.enabled && (
                  <div className="px-4 pb-4 space-y-3">
                    {mode === 'schedule' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={state.date}
                          onChange={(e) => updatePlatform(platform.key, 'date', e.target.value)}
                          className="flex-1 h-9 text-xs"
                        />
                        <Input
                          type="time"
                          value={state.time}
                          onChange={(e) => updatePlatform(platform.key, 'time', e.target.value)}
                          className="flex-1 h-9 text-xs"
                        />
                      </div>
                    )}

                    {/* Caption */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Caption</label>
                        <span className={`text-[10px] tabular-nums ${
                          (state.caption || '').length > platform.maxCaption
                            ? 'text-danger'
                            : 'text-muted-foreground'
                        }`}>
                          {(state.caption || '').length}/{platform.maxCaption}
                        </span>
                      </div>
                      <Textarea
                        value={state.caption || ''}
                        onChange={(e) => updatePlatform(platform.key, 'caption', e.target.value)}
                        rows={3}
                        className="text-xs resize-none"
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
            <div className="flex items-center gap-3">
              <Switch
                checked={stagger}
                onCheckedChange={handleStaggerChange}
              />
              <div>
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Cross-platform stagger
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Instagram auto-offsets 24h from TikTok
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={enabledCount === 0 || isSubmitting}>
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
