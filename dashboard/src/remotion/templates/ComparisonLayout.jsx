import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { TITLE_STYLE, SUBLABEL_STYLE, BODY_STYLE } from './shared/Typography';
import { GlassCard } from './shared/GlassCard';

/**
 * ComparisonLayout — Two-panel side-by-side (long) or stacked (short) comparison.
 *
 * data props:
 *   left    — { title, subtitle, features: [{ label, value, highlight? }] }
 *   right   — same shape
 *   winner? — 'left' | 'right' | 'tie'
 */
export function ComparisonLayout({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';

  const cardPadding = isLong ? 48 : 36;
  const gap = isLong ? 80 : 40;

  const renderPanel = (panel, side) => {
    const isWinner =
      data.winner === side || data.winner === 'tie';

    return (
      <GlassCard
        colorMood={colorMood}
        padding={cardPadding}
        borderRadius={20}
        style={{
          flex: 1,
          border: isWinner
            ? `2px solid ${theme.accent}`
            : `1px solid ${theme.accent}26`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Card title */}
        <div
          style={{
            ...TITLE_STYLE(format),
            color: theme.text,
            marginBottom: 4,
          }}
        >
          {panel.title}
        </div>

        {/* Subtitle */}
        {panel.subtitle && (
          <div
            style={{
              ...SUBLABEL_STYLE(format),
              color: theme.muted,
              marginBottom: isLong ? 32 : 24,
            }}
          >
            {panel.subtitle}
          </div>
        )}

        {/* Feature rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isLong ? 16 : 12 }}>
          {(panel.features || []).map((feat, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: isLong ? 12 : 8,
                borderBottom: `1px solid ${theme.muted}20`,
              }}
            >
              <span
                style={{
                  ...BODY_STYLE(format),
                  color: theme.muted,
                }}
              >
                {feat.label}
              </span>
              <span
                style={{
                  ...BODY_STYLE(format),
                  fontWeight: 600,
                  color: feat.highlight ? theme.accent : theme.text,
                }}
              >
                {feat.value}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: isLong ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isLong ? 80 : 60,
        gap,
      }}
    >
      {/* Left panel */}
      {renderPanel(data.left, 'left')}

      {/* VS divider */}
      <div
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 800,
          fontSize: isLong ? 72 : 48,
          color: theme.accent,
          opacity: 0.35,
          flexShrink: 0,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        VS
      </div>

      {/* Right panel */}
      {renderPanel(data.right, 'right')}
    </AbsoluteFill>
  );
}
