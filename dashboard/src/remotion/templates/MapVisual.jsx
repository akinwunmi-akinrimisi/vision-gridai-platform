import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { TITLE_STYLE, SUBLABEL_STYLE, BODY_STYLE } from './shared/Typography';

/**
 * MapVisual — Stylized hexagon/rectangle grid representing regions.
 * NOT a geographic map — an artistic grid layout.
 *
 * data props:
 *   title?    — heading text
 *   map_type? — 'us_states' | 'world' | 'custom' (cosmetic, does not change layout)
 *   regions   — [{ name, value?, highlight? }]
 */
export function MapVisual({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';
  const regions = data.regions || [];

  // Calculate grid columns based on count and format
  const perRow = isLong
    ? (regions.length <= 8 ? 4 : regions.length <= 15 ? 5 : 6)
    : (regions.length <= 6 ? 2 : regions.length <= 12 ? 3 : 4);

  // Break regions into rows
  const rows = [];
  for (let i = 0; i < regions.length; i += perRow) {
    rows.push(regions.slice(i, i + perRow));
  }

  const cellW = isLong ? 220 : 140;
  const cellH = isLong ? 100 : 80;
  const gap = isLong ? 12 : 8;

  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isLong ? 80 : 60,
      }}
    >
      {/* Title */}
      {data.title && (
        <div
          style={{
            ...TITLE_STYLE(format),
            color: theme.text,
            textAlign: 'center',
            marginBottom: isLong ? 48 : 32,
            maxWidth: '90%',
          }}
        >
          {data.title}
        </div>
      )}

      {/* Hex grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap,
        }}
      >
        {rows.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: 'flex',
              gap,
              // Offset odd rows for hex feel
              marginLeft: ri % 2 === 1 ? cellW / 2 + gap / 2 : 0,
            }}
          >
            {row.map((region, ci) => {
              const isHighlight = region.highlight;
              return (
                <div
                  key={ci}
                  style={{
                    width: cellW,
                    height: cellH,
                    borderRadius: 12,
                    background: isHighlight
                      ? theme.accent
                      : `${theme.muted}26`, // 15% opacity
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    border: isHighlight
                      ? `1px solid ${theme.accent}`
                      : `1px solid ${theme.muted}1A`,
                    boxShadow: isHighlight
                      ? `0 0 20px ${theme.accent}40`
                      : 'none',
                  }}
                >
                  {/* Region name */}
                  <div
                    style={{
                      ...SUBLABEL_STYLE(format),
                      color: isHighlight ? '#FFFFFF' : theme.text,
                      textAlign: 'center',
                      opacity: 1,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      maxWidth: '100%',
                    }}
                  >
                    {region.name}
                  </div>

                  {/* Region value */}
                  {region.value != null && (
                    <div
                      style={{
                        ...BODY_STYLE(format),
                        color: isHighlight ? '#FFFFFF' : theme.accent,
                        marginTop: 4,
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      {region.value}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
