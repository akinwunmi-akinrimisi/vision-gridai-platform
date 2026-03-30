import React from 'react';

const COLORS = { up: '#48BB78', down: '#FC8181', neutral: '#A0AEC0' };

// SVG arrow component for up/down/neutral trends.
export function TrendArrow({ direction = 'neutral', size = 32 }) {
  const color = COLORS[direction] || COLORS.neutral;

  if (direction === 'up') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4L4 14h5v6h6v-6h5L12 4z" fill={color} />
      </svg>
    );
  }
  if (direction === 'down') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 20L20 10h-5V4H9v6H4l8 10z" fill={color} />
      </svg>
    );
  }
  // neutral — horizontal dash
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="4" rx="2" fill={color} />
    </svg>
  );
}
