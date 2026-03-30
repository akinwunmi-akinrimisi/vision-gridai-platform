import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getMoodTheme } from './shared/MoodTheme';
import { TITLE_STYLE, LABEL_STYLE, BODY_STYLE } from './shared/Typography';

/**
 * DataTable — Clean grid table with optional column/row highlighting.
 *
 * data props:
 *   title?            — heading text
 *   headers           — [string] column headers
 *   rows              — [[string]] data rows
 *   highlight_column? — column index (0-based) to accent
 *   highlight_row?    — row index (0-based) to accent
 */
export function DataTable({ data, colorMood, format = 'long' }) {
  const theme = getMoodTheme(colorMood);
  const isLong = format === 'long';

  const headers = (data.headers || []).slice(0, 4);
  const rows = (data.rows || []).slice(0, 5);
  const colCount = headers.length;

  const cellPadV = 16;
  const cellPadH = isLong ? 24 : 16;

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

      {/* Table container */}
      <div
        style={{
          width: isLong ? '85%' : '92%',
          overflow: 'hidden',
          borderRadius: 12,
          border: `1px solid ${theme.muted}1A`,
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            background: `${theme.accent}26`, // 15% opacity
          }}
        >
          {headers.map((header, ci) => (
            <div
              key={ci}
              style={{
                flex: 1,
                padding: `${cellPadV}px ${cellPadH}px`,
                ...LABEL_STYLE(format),
                color: theme.accent,
                textAlign: 'left',
                borderLeft:
                  data.highlight_column === ci
                    ? `2px solid ${theme.accent}`
                    : ci > 0
                      ? `1px solid ${theme.muted}1A`
                      : 'none',
                borderRight:
                  data.highlight_column === ci
                    ? `2px solid ${theme.accent}`
                    : 'none',
              }}
            >
              {header}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {rows.map((row, ri) => {
          const isHighlightRow = data.highlight_row === ri;
          const isEvenRow = ri % 2 === 1;
          let rowBg = 'transparent';
          if (isHighlightRow) {
            rowBg = `${theme.accent}1A`; // 10% opacity
          } else if (isEvenRow) {
            rowBg = `${theme.muted}0D`; // 5% opacity
          }

          return (
            <div
              key={ri}
              style={{
                display: 'flex',
                background: rowBg,
                borderTop: `1px solid ${theme.muted}1A`, // 10% opacity
              }}
            >
              {row.slice(0, colCount).map((cell, ci) => (
                <div
                  key={ci}
                  style={{
                    flex: 1,
                    padding: `${cellPadV}px ${cellPadH}px`,
                    ...BODY_STYLE(format),
                    color: theme.text,
                    textAlign: 'left',
                    borderLeft:
                      data.highlight_column === ci
                        ? `2px solid ${theme.accent}`
                        : ci > 0
                          ? `1px solid ${theme.muted}1A`
                          : 'none',
                    borderRight:
                      data.highlight_column === ci
                        ? `2px solid ${theme.accent}`
                        : 'none',
                  }}
                >
                  {cell}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
