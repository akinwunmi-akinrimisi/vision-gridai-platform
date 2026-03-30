import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { TITLE_STYLE, VALUE_STYLE, LABEL_STYLE } from './shared/Typography';
import { TrendArrow } from './shared/TrendArrow';
import { GlassCard } from './shared/GlassCard';

/**
 * MetricHighlight — Multiple key metrics displayed as glass cards.
 *
 * data props:
 *   title?   — heading text
 *   metrics  — [{ value, label, trend?, highlight? }]
 *   layout?  — 'row' | 'grid' (defaults by format/count)
 */
export function MetricHighlight({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';
  const metrics = (data.metrics || []).slice(0, 6);

  const useGrid =
    data.layout === 'grid' ||
    (!data.layout && (!isLong || metrics.length > 3));

  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isLong ? 80 : 60,
      }}
    >
      {/* Title */}
      {data.title && (
        <div
          style={{
            ...TITLE_STYLE(format),
            color: theme.text,
            textAlign: 'center',
            marginBottom: isLong ? 48 : 32,
            maxWidth: '90%',
          }}
        >
          {data.title}
        </div>
      )}

      {/* Metrics container */}
      <div
        style={{
          display: 'flex',
          flexWrap: useGrid ? 'wrap' : 'nowrap',
          gap: isLong ? 24 : 16,
          justifyContent: 'center',
          alignItems: 'stretch',
          maxWidth: isLong ? 1600 : 900,
          width: '100%',
        }}
      >
        {metrics.map((metric, i) => {
          // First highlighted metric gets a larger card
          const isFirstHighlight =
            metric.highlight &&
            metrics.findIndex((m) => m.highlight) === i;

          const cardWidth = useGrid
            ? isLong
              ? 'calc(50% - 12px)'
              : 'calc(50% - 8px)'
            : undefined;

          const valueFontSize = isFirstHighlight
            ? (isLong ? 72 : 56)
            : (isLong ? 56 : 44);

          return (
            <GlassCard
              key={i}
              colorMood={colorMood}
              padding={isLong ? 36 : 24}
              borderRadius={16}
              style={{
                flex: useGrid ? undefined : 1,
                width: cardWidth,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                border: isFirstHighlight
                  ? `2px solid ${theme.accent}`
                  : `1px solid ${theme.accent}26`,
                boxShadow: isFirstHighlight
                  ? `0 0 24px ${theme.accent}30`
                  : 'none',
              }}
            >
              {/* Value + Trend row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isLong ? 12 : 8,
                }}
              >
                <span
                  style={{
                    ...VALUE_STYLE(format),
                    fontSize: valueFontSize,
                    color: metric.highlight ? theme.accent : theme.text,
                  }}
                >
                  {metric.value}
                </span>
                {metric.trend && (
                  <TrendArrow
                    direction={metric.trend}
                    size={isLong ? 32 : 24}
                  />
                )}
              </div>

              {/* Label */}
              <div
                style={{
                  ...LABEL_STYLE(format),
                  color: theme.muted,
                  marginTop: isLong ? 12 : 8,
                }}
              >
                {metric.label}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
