import { useState, useMemo, useEffect } from 'react';
import { Loader2, Play, AlertCircle, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TEST_TYPES = [
  { value: 'title', label: 'Title' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'combined', label: 'Combined' },
];

const DEFAULTS = {
  min_impressions_per_variant: 1000,
  min_days_per_variant: 2,
  rotation_interval_hours: 48,
  confidence_threshold: 0.95,
};

export default function StartABTestModal({
  isOpen,
  onClose,
  topic,
  onStart,
  isPending,
}) {
  const [testType, setTestType] = useState('title');
  const [selectedTitleIndexes, setSelectedTitleIndexes] = useState([]);
  const [selectedThumbIndexes, setSelectedThumbIndexes] = useState([]);
  const [settings, setSettings] = useState({ ...DEFAULTS });
  const [error, setError] = useState(null);

  const titleOptions = useMemo(
    () => (Array.isArray(topic?.title_options) ? topic.title_options : []),
    [topic],
  );

  // Historical thumbnail pool = current + regen_history entries that have a url.
  const thumbnailPool = useMemo(() => {
    const pool = [];
    if (topic?.thumbnail_url) {
      pool.push({
        label: 'Current',
        url: topic.thumbnail_url,
        drive_id: topic.thumbnail_drive_id || null,
        score: topic?.thumbnail_ctr_score ?? null,
      });
    }
    const history = Array.isArray(topic?.thumbnail_regen_history)
      ? topic.thumbnail_regen_history
      : [];
    history.forEach((h, i) => {
      if (h?.thumbnail_url) {
        pool.push({
          label: `Regen #${h.attempt ?? i + 1}`,
          url: h.thumbnail_url,
          drive_id: h.thumbnail_drive_id || null,
          score: h.score ?? null,
        });
      }
    });
    return pool;
  }, [topic]);

  /* -- Initialize selections when modal opens or type changes -- */
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (testType === 'title' || testType === 'combined') {
      const recIdx = topic?.title_recommended_index;
      const selectedIdx = titleOptions.findIndex(
        (o) => o.title === topic?.selected_title,
      );
      const preselect = new Set();
      if (typeof recIdx === 'number' && recIdx >= 0) preselect.add(recIdx);
      if (selectedIdx >= 0) preselect.add(selectedIdx);
      if (preselect.size < 2 && titleOptions.length > 0) {
        for (let i = 0; i < titleOptions.length && preselect.size < 2; i++) {
          preselect.add(i);
        }
      }
      setSelectedTitleIndexes(Array.from(preselect).sort((a, b) => a - b));
    } else {
      setSelectedTitleIndexes([]);
    }

    if (testType === 'thumbnail' || testType === 'combined') {
      // Preselect current thumbnail (0) + first regen (1) if available.
      const preselect = [];
      if (thumbnailPool.length > 0) preselect.push(0);
      if (thumbnailPool.length > 1) preselect.push(1);
      setSelectedThumbIndexes(preselect);
    } else {
      setSelectedThumbIndexes([]);
    }
  }, [isOpen, testType, titleOptions, thumbnailPool, topic]);

  const toggleTitle = (idx) => {
    setSelectedTitleIndexes((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= 3) {
        toast.info('Max 3 variants per test');
        return prev;
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const toggleThumb = (idx) => {
    setSelectedThumbIndexes((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= 3) {
        toast.info('Max 3 variants per test');
        return prev;
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const updateSetting = (key, raw) => {
    const parsed = key === 'confidence_threshold' ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    setSettings((s) => ({ ...s, [key]: parsed }));
  };

  const buildVariants = () => {
    const titles = selectedTitleIndexes.map((i) => titleOptions[i]);
    const thumbs = selectedThumbIndexes.map((i) => thumbnailPool[i]);

    if (testType === 'title') {
      return titles.map((t) => ({
        title: t.title,
        predicted_ctr_score: t.ctr_score ?? null,
      }));
    }
    if (testType === 'thumbnail') {
      return thumbs.map((t) => ({
        thumbnail_url: t.url,
        thumbnail_drive_id: t.drive_id,
        predicted_ctr_score: t.score ?? null,
      }));
    }
    // combined — zip pair-wise; fill shorter list with the first item of the other.
    const count = Math.max(titles.length, thumbs.length);
    if (count === 0) return [];
    const variants = [];
    for (let i = 0; i < count; i++) {
      const title = titles[i] || titles[0];
      const thumb = thumbs[i] || thumbs[0];
      variants.push({
        title: title?.title,
        thumbnail_url: thumb?.url,
        thumbnail_drive_id: thumb?.drive_id,
        predicted_ctr_score: title?.ctr_score ?? thumb?.score ?? null,
      });
    }
    return variants;
  };

  const handleSubmit = async () => {
    setError(null);

    const variants = buildVariants();

    if (variants.length < 2) {
      setError('Pick at least 2 variants to run an A/B test.');
      return;
    }

    try {
      const res = await onStart({
        topic_id: topic.id,
        test_type: testType,
        variants,
        min_impressions_per_variant: settings.min_impressions_per_variant,
        min_days_per_variant: settings.min_days_per_variant,
        rotation_interval_hours: settings.rotation_interval_hours,
        confidence_threshold: settings.confidence_threshold,
      });
      if (res?.success === false) {
        setError(res.error || 'Failed to start A/B test');
        return;
      }
      toast.success('A/B test started');
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to start A/B test');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start A/B Test"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Test type */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Test Type
          </label>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-0.5 w-fit">
            {TEST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTestType(t.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  testType === t.value
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                data-testid={`ab-test-type-${t.value}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title selection */}
        {(testType === 'title' || testType === 'combined') && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Title Variants (pick 2-3)
            </label>
            {titleOptions.length === 0 ? (
              <div className="text-xs text-muted-foreground italic px-3 py-2 rounded-lg bg-muted border border-border">
                No title variants generated yet. Generate them on the review page first.
              </div>
            ) : (
              <div className="space-y-1.5">
                {titleOptions.map((opt, i) => {
                  const checked = selectedTitleIndexes.includes(i);
                  return (
                    <label
                      key={i}
                      className={cn(
                        'flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                        checked
                          ? 'bg-accent/10 border-accent/40'
                          : 'bg-muted border-border hover:bg-card-hover',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTitle(i)}
                        className="mt-1 rounded border-border flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground leading-snug">
                          {opt.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                          CTR {opt.ctr_score ?? '\u2014'}
                          {opt.char_count != null
                            ? ` \u00b7 ${opt.char_count} chars`
                            : ''}
                          {opt.formula_pattern ? ` \u00b7 ${opt.formula_pattern}` : ''}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Thumbnail selection */}
        {(testType === 'thumbnail' || testType === 'combined') && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Thumbnail Variants (pick 2-3)
            </label>
            {thumbnailPool.length === 0 ? (
              <div className="text-xs text-muted-foreground italic px-3 py-2 rounded-lg bg-muted border border-border">
                No thumbnails available. Generate + regenerate at least one alternate first.
              </div>
            ) : thumbnailPool.length === 1 ? (
              <div className="text-xs text-warning italic px-3 py-2 rounded-lg bg-warning-bg border border-warning-border flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Only 1 thumbnail available. Regenerate the thumbnail at least once to get a second variant.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {thumbnailPool.map((t, i) => {
                  const checked = selectedThumbIndexes.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleThumb(i)}
                      className={cn(
                        'relative rounded-lg border overflow-hidden text-left transition-all cursor-pointer',
                        checked
                          ? 'border-accent ring-2 ring-accent/40'
                          : 'border-border hover:border-border-hover',
                      )}
                    >
                      <div className="aspect-video bg-muted relative">
                        {t.url ? (
                          <img
                            src={t.url}
                            alt={t.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-6 h-6 opacity-40" />
                          </div>
                        )}
                        {checked && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow">
                            <span className="text-[10px] font-bold text-white">
                              {selectedThumbIndexes.indexOf(i) + 1}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium truncate">
                          {t.label}
                        </span>
                        {t.score != null && (
                          <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                            {t.score}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Test Settings
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                Min impressions per variant
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={settings.min_impressions_per_variant}
                onChange={(e) =>
                  updateSetting('min_impressions_per_variant', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                Min days per variant
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={settings.min_days_per_variant}
                onChange={(e) => updateSetting('min_days_per_variant', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                Rotation interval (hours)
              </label>
              <input
                type="number"
                min="6"
                step="6"
                value={settings.rotation_interval_hours}
                onChange={(e) =>
                  updateSetting('rotation_interval_hours', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                Confidence threshold
              </label>
              <input
                type="number"
                min="0.5"
                max="0.99"
                step="0.01"
                value={settings.confidence_threshold}
                onChange={(e) =>
                  updateSetting('confidence_threshold', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-danger-bg border border-danger-border text-xs text-danger flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending}
            data-testid="start-ab-test-submit"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Start Test
          </Button>
        </div>
      </div>
    </Modal>
  );
}
