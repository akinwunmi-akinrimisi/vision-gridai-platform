import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { LABEL_STYLE, TITLE_STYLE, SUBLABEL_STYLE } from './shared/Typography';

/**
 * ChapterTitle — Full-bleed chapter interstitial with oversized watermark number.
 *
 * data props:
 *   chapter_number   — the chapter number (displayed as watermark + label)
 *   chapter_title    — main heading text
 *   subtitle?        — secondary line below divider
 *   total_chapters?  — if present, shows "X of Y" in corner
 */
export function ChapterTitle({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';

  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isLong ? 120 : 80,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Oversized watermark number — center-right */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: isLong ? '10%' : '5%',
          transform: 'translateY(-50%)',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 900,
          fontSize: isLong ? 400 : 280,
          color: theme.accent,
          opacity: 0.08,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {data.chapter_number}
      </div>

      {/* "CHAPTER" label */}
      <div
        style={{
          ...LABEL_STYLE(format),
          color: theme.accent,
          marginBottom: isLong ? 16 : 12,
        }}
      >
        CHAPTER
      </div>

      {/* Chapter title */}
      <div
        style={{
          ...TITLE_STYLE(format),
          fontSize: isLong ? 80 : 56,
          color: theme.text,
          maxWidth: isLong ? '70%' : '90%',
          lineHeight: 1.15,
        }}
      >
        {data.chapter_title}
      </div>

      {/* Accent divider line */}
      <div
        style={{
          width: 120,
          height: 2,
          background: theme.accent,
          marginTop: isLong ? 32 : 24,
          marginBottom: isLong ? 24 : 16,
        }}
      />

      {/* Subtitle */}
      {data.subtitle && (
        <div
          style={{
            ...SUBLABEL_STYLE(format),
            color: theme.muted,
            maxWidth: isLong ? '60%' : '85%',
          }}
        >
          {data.subtitle}
        </div>
      )}

      {/* "X of Y" counter — top-right corner */}
      {data.total_chapters && (
        <div
          style={{
            position: 'absolute',
            top: isLong ? 48 : 36,
            right: isLong ? 56 : 40,
            ...SUBLABEL_STYLE(format),
            color: theme.muted,
          }}
        >
          {data.chapter_number} of {data.total_chapters}
        </div>
      )}
    </AbsoluteFill>
  );
}
