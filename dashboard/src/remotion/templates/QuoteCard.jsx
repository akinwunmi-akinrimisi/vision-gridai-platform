import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { BODY_STYLE, LABEL_STYLE, SUBLABEL_STYLE } from './shared/Typography';

/**
 * QuoteCard — Large decorative quote with author attribution.
 *
 * data props:
 *   quote          — the quote text
 *   author         — attribution name
 *   role?          — author's title/role
 *   avatar_prompt? — (unused in render; for upstream image gen)
 */
export function QuoteCard({ data, colorMood, format = 'long' }) {
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
        padding: isLong ? 100 : 80,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Large decorative opening quote mark */}
      <div
        style={{
          position: 'absolute',
          top: isLong ? '12%' : '15%',
          left: isLong ? '12%' : '8%',
          fontFamily: 'Georgia, serif',
          fontSize: 300,
          color: theme.accent,
          opacity: 0.2,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {'\u201C'}
      </div>

      {/* Quote text */}
      <div
        style={{
          ...BODY_STYLE(format),
          fontStyle: 'italic',
          fontSize: isLong ? 40 : 32,
          color: theme.text,
          textAlign: 'center',
          maxWidth: '70%',
          lineHeight: 1.6,
          position: 'relative',
        }}
      >
        {data.quote}
      </div>

      {/* Divider line */}
      <div
        style={{
          width: 60,
          height: 2,
          background: theme.accent,
          marginTop: isLong ? 40 : 28,
          marginBottom: isLong ? 28 : 20,
        }}
      />

      {/* Author */}
      <div
        style={{
          ...LABEL_STYLE(format),
          color: theme.text,
        }}
      >
        {data.author}
      </div>

      {/* Role */}
      {data.role && (
        <div
          style={{
            ...SUBLABEL_STYLE(format),
            color: theme.muted,
            marginTop: 8,
          }}
        >
          {data.role}
        </div>
      )}
    </AbsoluteFill>
  );
}
