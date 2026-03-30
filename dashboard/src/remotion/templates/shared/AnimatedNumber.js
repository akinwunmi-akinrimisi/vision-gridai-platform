import React from 'react';

// Displays a styled number value.
// For still PNG rendering via Remotion's renderStill API — no animation needed.
export function AnimatedNumber({ value, style = {}, color = '#FFFFFF' }) {
  return (
    <span style={{ color, ...style }}>
      {value}
    </span>
  );
}
