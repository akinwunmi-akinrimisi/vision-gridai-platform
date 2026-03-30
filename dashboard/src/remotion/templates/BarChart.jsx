import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { TITLE_STYLE, BODY_STYLE } from './shared/Typography';

/**
 * BarChart — Horizontal or vertical bars with proportional fills.
 *
 * data props:
 *   chart_title   — heading text
 *   bars          — [{ label, value, display_value?, highlight? }]
 *   orientation?  — 'horizontal' (default) | 'vertical'
 *   unit?         — appended after display_value (e.g. "%", "M")
 */
export function BarChart({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';
  const isVertical = data.orientation === 'vertical';
  const bars = data.bars || [];
  const maxVal = Math.max(...bars.map((b) => Number(b.value) || 0), 1);

  // Grid line percentages
  const gridLines = [0.25, 0.5, 0.75, 1.0];

  if (isVertical) {
    return (
      <AbsoluteFill
        style={{
          background: theme.gradient,
          display: 'flex',
          flexDirection: 'column',
          padding: isLong ? 80 : 60,
        }}
      >
        {/* Title */}
        <div style={{ ...TITLE_STYLE(format), color: theme.text, marginBottom: isLong ? 48 : 32 }}>
          {data.chart_title}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Grid lines */}
          {gridLines.map((pct) => (
            <div
              key={pct}
              style={{
                position: 'absolute',
                bottom: `${pct * 100}%`,
                left: 0,
                right: 0,
                height: 1,
                background: `${theme.muted}20`,
              }}
            />
          ))}

          {/* Bars container */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: isLong ? 32 : 20,
              position: 'relative',
            }}
          >
            {bars.map((bar, i) => {
              const ratio = (Number(bar.value) || 0) / maxVal;
              const displayVal = bar.display_value != null ? bar.display_value : bar.value;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    maxWidth: isLong ? 120 : 80,
                  }}
                >
                  {/* Value above bar */}
                  <div
                    style={{
                      ...BODY_STYLE(format),
                      color: bar.highlight ? theme.accent : theme.text,
                      fontWeight: 600,
                      marginBottom: 8,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayVal}{data.unit || ''}
                  </div>

                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: `${ratio * 100}%`,
                      minHeight: 4,
                      background: bar.highlight ? theme.accent : `${theme.muted}4D`,
                      borderRadius: '6px 6px 0 0',
                    }}
                  />

                  {/* Label below */}
                  <div
                    style={{
                      ...BODY_STYLE(format),
                      color: theme.muted,
                      fontSize: isLong ? 20 : 16,
                      marginTop: 12,
                      textAlign: 'center',
                      wordBreak: 'break-word',
                    }}
                  >
                    {bar.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // ─── Horizontal (default) ───────────────────────────────
  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
        padding: isLong ? 80 : 60,
        justifyContent: 'center',
      }}
    >
      {/* Title */}
      <div style={{ ...TITLE_STYLE(format), color: theme.text, marginBottom: isLong ? 48 : 32 }}>
        {data.chart_title}
      </div>

      {/* Chart area with grid lines */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Vertical grid lines */}
        {gridLines.map((pct) => (
          <div
            key={pct}
            style={{
              position: 'absolute',
              left: `${pct * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: `${theme.muted}20`,
            }}
          />
        ))}

        {/* Bar rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isLong ? 24 : 16 }}>
          {bars.map((bar, i) => {
            const ratio = (Number(bar.value) || 0) / maxVal;
            const displayVal = bar.display_value != null ? bar.display_value : bar.value;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: isLong ? 20 : 12 }}>
                {/* Label */}
                <div
                  style={{
                    ...BODY_STYLE(format),
                    color: theme.muted,
                    width: isLong ? 200 : 140,
                    flexShrink: 0,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {bar.label}
                </div>

                {/* Bar track */}
                <div style={{ flex: 1, position: 'relative', height: isLong ? 36 : 28 }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${Math.max(ratio * 100, 2)}%`,
                      background: bar.highlight ? theme.accent : `${theme.muted}4D`,
                      borderRadius: 6,
                    }}
                  />
                </div>

                {/* Value */}
                <div
                  style={{
                    ...BODY_STYLE(format),
                    color: bar.highlight ? theme.accent : theme.text,
                    fontWeight: 600,
                    width: isLong ? 120 : 80,
                    flexShrink: 0,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayVal}{data.unit || ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
