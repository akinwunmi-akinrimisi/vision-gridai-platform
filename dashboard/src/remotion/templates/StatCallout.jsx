import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { VALUE_STYLE, LABEL_STYLE, SUBLABEL_STYLE } from './shared/Typography';
import { AnimatedNumber } from './shared/AnimatedNumber';
import { TrendArrow } from './shared/TrendArrow';

/**
 * StatCallout — Single massive statistic with label and optional trend.
 *
 * data props:
 *   primary_value  — the big number/text (e.g. "$4.2T", "97%", "1 in 3")
 *   label          — descriptor below the value (e.g. "GLOBAL CREDIT CARD DEBT")
 *   sublabel?      — secondary context line
 *   trend?         — 'up' | 'down' | 'neutral'
 *   source?        — attribution text (bottom-right corner)
 */
export function StatCallout({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';

  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Radial glow behind value */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isLong ? 900 : 700,
          height: isLong ? 600 : 500,
          background: `radial-gradient(circle, ${theme.accent}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Value row — number + optional trend arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isLong ? 24 : 16,
          position: 'relative',
        }}
      >
        <AnimatedNumber
          value={data.primary_value}
          style={VALUE_STYLE(format)}
          color={theme.text}
        />
        {data.trend && (
          <TrendArrow
            direction={data.trend}
            size={isLong ? 56 : 40}
          />
        )}
      </div>

      {/* Label */}
      <div
        style={{
          ...LABEL_STYLE(format),
          color: theme.accent,
          marginTop: isLong ? 24 : 16,
          textAlign: 'center',
          maxWidth: '80%',
        }}
      >
        {data.label}
      </div>

      {/* Sublabel */}
      {data.sublabel && (
        <div
          style={{
            ...SUBLABEL_STYLE(format),
            color: theme.muted,
            marginTop: isLong ? 12 : 8,
            textAlign: 'center',
            maxWidth: '70%',
          }}
        >
          {data.sublabel}
        </div>
      )}

      {/* Source attribution — bottom right */}
      {data.source && (
        <div
          style={{
            position: 'absolute',
            bottom: isLong ? 40 : 32,
            right: isLong ? 48 : 36,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: isLong ? 16 : 14,
            color: theme.muted,
            opacity: 0.5,
          }}
        >
          {data.source}
        </div>
      )}
    </AbsoluteFill>
  );
}
