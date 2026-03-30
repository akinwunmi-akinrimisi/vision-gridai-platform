import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { VALUE_STYLE, LABEL_STYLE, SUBLABEL_STYLE } from './shared/Typography';

/**
 * PercentageRing — Large SVG circular progress ring with centered value.
 *
 * data props:
 *   percentage      — 0-100 number
 *   label           — text below the ring
 *   sublabel?       — secondary text below label
 *   color_override? — hex color to use instead of theme.accent
 */
export function PercentageRing({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';

  const diameter = isLong ? 400 : 300;
  const strokeWidth = 16;
  const radius = (diameter - strokeWidth) / 2;
  const center = diameter / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = Math.max(0, Math.min(100, data.percentage || 0));
  const offset = circumference - (pct / 100) * circumference;

  const fillColor = data.color_override || theme.accent;
  const valueFontSize = isLong ? 160 : 120;
  const pctSuffixSize = isLong ? 64 : 48;

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
      {/* Radial glow behind ring */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -55%)',
          width: diameter * 1.6,
          height: diameter * 1.6,
          background: `radial-gradient(circle, ${fillColor}1A 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Ring container */}
      <div style={{ position: 'relative', width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`${theme.muted}33`} // 20% opacity
            strokeWidth={strokeWidth}
          />

          {/* Fill circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>

        {/* Percentage number inside ring center */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              ...VALUE_STYLE(format),
              fontSize: valueFontSize,
              color: theme.text,
            }}
          >
            {Math.round(pct)}
          </span>
          <span
            style={{
              ...VALUE_STYLE(format),
              fontSize: pctSuffixSize,
              color: theme.text,
              opacity: 0.6,
              marginLeft: 4,
              alignSelf: 'flex-start',
              marginTop: isLong ? 30 : 20,
            }}
          >
            %
          </span>
        </div>
      </div>

      {/* Label */}
      <div
        style={{
          ...LABEL_STYLE(format),
          color: fillColor,
          marginTop: isLong ? 36 : 24,
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
    </AbsoluteFill>
  );
}
