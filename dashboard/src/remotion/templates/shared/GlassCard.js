import React from 'react';
import { getMoodTheme } from './MoodTheme';

// Frosted glass card component with mood-tinted background.
export function GlassCard({ children, colorMood = 'cool_neutral', padding = 40, borderRadius = 16, style = {} }) {
  const theme = getMoodTheme(colorMood);

  return (
    <div
      style={{
        background: `${theme.accent}0D`,  // accent at 5% opacity
        border: `1px solid ${theme.accent}26`,  // accent at 15% opacity
        borderRadius,
        padding,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Subtle inner glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${theme.accent}40, transparent)`,
        }}
      />
      {children}
    </div>
  );
}
