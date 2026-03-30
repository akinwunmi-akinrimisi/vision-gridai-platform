import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { VALUE_STYLE, LABEL_STYLE } from './shared/Typography';

/**
 * BeforeAfter — Split-screen transformation comparison.
 *
 * data props:
 *   before                — { value, label, mood: 'negative'|'neutral' }
 *   after                 — { value, label, mood: 'positive'|'neutral' }
 *   transformation_label? — text shown on the center arrow
 */
export function BeforeAfter({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';

  const RED_OVERLAY = 'rgba(252, 129, 129, 0.20)';
  const GREEN_OVERLAY = 'rgba(72, 187, 120, 0.20)';
  const NEUTRAL_OVERLAY = `${theme.muted}1A`;

  const beforeBg = data.before.mood === 'negative' ? RED_OVERLAY : NEUTRAL_OVERLAY;
  const afterBg = data.after.mood === 'positive' ? GREEN_OVERLAY : NEUTRAL_OVERLAY;

  const valueFontSize = isLong ? 120 : 96;

  if (isLong) {
    // Horizontal split: left = before, right = after
    return (
      <AbsoluteFill
        style={{
          background: theme.gradient,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Before side */}
        <SidePanel
          sideData={data.before}
          overlay={beforeBg}
          sideLabel="BEFORE"
          theme={theme}
          format={format}
          valueFontSize={valueFontSize}
          style={{ flex: 1 }}
        />

        {/* Center arrow */}
        <CenterArrow
          label={data.transformation_label}
          theme={theme}
          format={format}
          direction="right"
        />

        {/* After side */}
        <SidePanel
          sideData={data.after}
          overlay={afterBg}
          sideLabel="AFTER"
          theme={theme}
          format={format}
          valueFontSize={valueFontSize}
          style={{ flex: 1 }}
        />
      </AbsoluteFill>
    );
  }

  // Vertical split: top = before, bottom = after
  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Before side */}
      <SidePanel
        sideData={data.before}
        overlay={beforeBg}
        sideLabel="BEFORE"
        theme={theme}
        format={format}
        valueFontSize={valueFontSize}
        style={{ flex: 1 }}
      />

      {/* Center arrow */}
      <CenterArrow
        label={data.transformation_label}
        theme={theme}
        format={format}
        direction="down"
      />

      {/* After side */}
      <SidePanel
        sideData={data.after}
        overlay={afterBg}
        sideLabel="AFTER"
        theme={theme}
        format={format}
        valueFontSize={valueFontSize}
        style={{ flex: 1 }}
      />
    </AbsoluteFill>
  );
}

function SidePanel({ sideData, overlay, sideLabel, theme, format, valueFontSize, style }) {
  const isLong = format === 'long';

  return (
    <div
      style={{
        ...style,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: overlay,
      }}
    >
      {/* BEFORE / AFTER label — top left */}
      <div
        style={{
          position: 'absolute',
          top: isLong ? 32 : 24,
          left: isLong ? 32 : 24,
          ...LABEL_STYLE(format),
          color: theme.muted,
          opacity: 0.7,
        }}
      >
        {sideLabel}
      </div>

      {/* Value */}
      <div
        style={{
          ...VALUE_STYLE(format),
          fontSize: valueFontSize,
          color: theme.text,
          textAlign: 'center',
          maxWidth: '80%',
          wordBreak: 'break-word',
        }}
      >
        {sideData.value}
      </div>

      {/* Label */}
      <div
        style={{
          ...LABEL_STYLE(format),
          color: theme.muted,
          marginTop: isLong ? 20 : 14,
          textAlign: 'center',
          maxWidth: '80%',
        }}
      >
        {sideData.label}
      </div>
    </div>
  );
}

function CenterArrow({ label, theme, format, direction }) {
  const isLong = format === 'long';
  const isHorizontal = direction === 'right';

  const arrowW = isHorizontal ? (isLong ? 120 : 80) : (isLong ? 200 : 160);
  const arrowH = isHorizontal ? (isLong ? 60 : 48) : (isLong ? 60 : 48);

  // Arrow SVG path
  const arrowSvg = isHorizontal ? (
    <svg width={40} height={24} viewBox="0 0 40 24" fill="none">
      <path d="M0 12H32M32 12L22 4M32 12L22 20" stroke={theme.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width={24} height={40} viewBox="0 0 24 40" fill="none">
      <path d="M12 0V32M12 32L4 22M12 32L20 22" stroke={theme.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: isHorizontal ? '0 8px' : '8px 0',
        zIndex: 2,
      }}
    >
      {label && (
        <div
          style={{
            background: theme.accent,
            borderRadius: 8,
            padding: `${isLong ? 10 : 8}px ${isLong ? 20 : 14}px`,
            ...LABEL_STYLE(format),
            fontSize: isLong ? 20 : 16,
            color: theme.text,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      )}
      {arrowSvg}
    </div>
  );
}
