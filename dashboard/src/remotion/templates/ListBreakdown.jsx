import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { TITLE_STYLE, BODY_STYLE, SUBLABEL_STYLE } from './shared/Typography';

/**
 * ListBreakdown — Numbered, bulleted, or icon-prefixed vertical list.
 *
 * data props:
 *   title    — heading text
 *   items    — [{ text, subtext?, icon?, highlight? }]
 *   style?   — 'numbered' (default) | 'bulleted' | 'icon'
 */
export function ListBreakdown({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';
  const listStyle = data.style || 'numbered';
  const items = data.items || [];

  const circleSize = isLong ? 44 : 36;

  const renderMarker = (item, index) => {
    if (listStyle === 'icon' && item.icon) {
      return (
        <div
          style={{
            width: circleSize,
            height: circleSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isLong ? 24 : 20,
            flexShrink: 0,
          }}
        >
          {item.icon}
        </div>
      );
    }

    if (listStyle === 'bulleted') {
      return (
        <div
          style={{
            width: isLong ? 12 : 10,
            height: isLong ? 12 : 10,
            borderRadius: '50%',
            background: item.highlight ? theme.accent : `${theme.muted}80`,
            flexShrink: 0,
            marginTop: isLong ? 10 : 8,
          }}
        />
      );
    }

    // numbered (default)
    return (
      <div
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: '50%',
          background: item.highlight ? theme.accent : `${theme.muted}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700,
          fontSize: isLong ? 20 : 16,
          color: item.highlight ? theme.bg : theme.text,
        }}
      >
        {index + 1}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
        padding: isLong ? 80 : 60,
        justifyContent: 'center',
      }}
    >
      {/* Title */}
      <div
        style={{
          ...TITLE_STYLE(format),
          color: theme.text,
          marginBottom: isLong ? 48 : 36,
        }}
      >
        {data.title}
      </div>

      {/* Items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isLong ? 28 : 20,
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: listStyle === 'bulleted' ? 'flex-start' : 'center',
              gap: isLong ? 24 : 16,
            }}
          >
            {renderMarker(item, i)}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  ...BODY_STYLE(format),
                  fontSize: item.highlight
                    ? (isLong ? 32 : 26)
                    : (isLong ? 28 : 22),
                  fontWeight: item.highlight ? 600 : 400,
                  color: theme.text,
                  lineHeight: 1.5,
                }}
              >
                {item.text}
              </div>
              {item.subtext && (
                <div
                  style={{
                    ...SUBLABEL_STYLE(format),
                    color: theme.muted,
                    marginTop: 4,
                  }}
                >
                  {item.subtext}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
