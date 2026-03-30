import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { TITLE_STYLE, SUBLABEL_STYLE, BODY_STYLE } from './shared/Typography';

/**
 * TimelineGraphic — Chronological events along a connecting line.
 *
 * data props:
 *   title?     — heading text
 *   events     — [{ date, label, description?, highlight? }]
 *   direction? — 'horizontal' | 'vertical' (defaults by format)
 */
export function TimelineGraphic({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';
  const dir = data.direction || (isLong ? 'horizontal' : 'vertical');
  const events = (data.events || []).slice(0, 10);

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
            marginBottom: isLong ? 60 : 40,
            maxWidth: '90%',
          }}
        >
          {data.title}
        </div>
      )}

      {dir === 'horizontal' ? (
        <HorizontalTimeline events={events} theme={theme} format={format} isLong={isLong} />
      ) : (
        <VerticalTimeline events={events} theme={theme} format={format} isLong={isLong} />
      )}
    </AbsoluteFill>
  );
}

function HorizontalTimeline({ events, theme, format, isLong }) {
  const lineWidth = isLong ? 1600 : 900;

  return (
    <div
      style={{
        position: 'relative',
        width: lineWidth,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Connecting line */}
      <div
        style={{
          position: 'absolute',
          top: isLong ? 80 : 60,
          left: 0,
          width: '100%',
          height: 2,
          background: `linear-gradient(90deg, ${theme.muted}, ${theme.accent})`,
        }}
      />

      {/* Events */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          position: 'relative',
        }}
      >
        {events.map((event, i) => {
          const dotSize = event.highlight ? 20 : 12;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              }}
            >
              {/* Date above dot */}
              <div
                style={{
                  ...SUBLABEL_STYLE(format),
                  color: theme.muted,
                  marginBottom: isLong ? 16 : 10,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {event.date}
              </div>

              {/* Dot */}
              <div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: event.highlight ? theme.accent : theme.muted,
                  boxShadow: event.highlight
                    ? `0 0 16px ${theme.accent}80, 0 0 32px ${theme.accent}40`
                    : 'none',
                  flexShrink: 0,
                  zIndex: 1,
                }}
              />

              {/* Label below dot */}
              <div
                style={{
                  ...BODY_STYLE(format),
                  color: theme.text,
                  marginTop: isLong ? 16 : 10,
                  textAlign: 'center',
                  maxWidth: isLong ? 180 : 120,
                }}
              >
                {event.label}
              </div>

              {/* Description */}
              {event.description && (
                <div
                  style={{
                    ...SUBLABEL_STYLE(format),
                    color: theme.muted,
                    marginTop: 6,
                    textAlign: 'center',
                    maxWidth: isLong ? 160 : 110,
                  }}
                >
                  {event.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerticalTimeline({ events, theme, format, isLong }) {
  const gapY = isLong ? 80 : 56;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: gapY,
        paddingLeft: isLong ? 60 : 40,
      }}
    >
      {/* Vertical connecting line */}
      <div
        style={{
          position: 'absolute',
          left: isLong ? 54 : 34,
          top: 0,
          bottom: 0,
          width: 2,
          background: `linear-gradient(180deg, ${theme.muted}, ${theme.accent})`,
        }}
      />

      {events.map((event, i) => {
        const dotSize = event.highlight ? 20 : 12;
        const dotOffset = (20 - dotSize) / 2; // center dots relative to largest

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: isLong ? 28 : 20,
              position: 'relative',
            }}
          >
            {/* Dot */}
            <div
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: event.highlight ? theme.accent : theme.muted,
                boxShadow: event.highlight
                  ? `0 0 16px ${theme.accent}80, 0 0 32px ${theme.accent}40`
                  : 'none',
                flexShrink: 0,
                marginTop: dotOffset + 4,
                zIndex: 1,
              }}
            />

            {/* Text block */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  ...SUBLABEL_STYLE(format),
                  color: theme.muted,
                  marginBottom: 4,
                }}
              >
                {event.date}
              </div>
              <div
                style={{
                  ...BODY_STYLE(format),
                  color: theme.text,
                }}
              >
                {event.label}
              </div>
              {event.description && (
                <div
                  style={{
                    ...SUBLABEL_STYLE(format),
                    color: theme.muted,
                    marginTop: 4,
                    maxWidth: isLong ? 600 : 400,
                  }}
                >
                  {event.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
