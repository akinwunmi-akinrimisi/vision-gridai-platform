// Typography style functions for Remotion templates
// Two sizes: long-form (1920x1080) and short-form (1080x1920)

export function VALUE_STYLE(format = 'long') {
  return {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: format === 'long' ? 200 : 140,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  };
}

export function LABEL_STYLE(format = 'long') {
  return {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: format === 'long' ? 36 : 28,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  };
}

export function SUBLABEL_STYLE(format = 'long') {
  return {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: format === 'long' ? 24 : 20,
    lineHeight: 1.5,
    opacity: 0.7,
  };
}

export function TITLE_STYLE(format = 'long') {
  return {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: format === 'long' ? 64 : 48,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  };
}

export function BODY_STYLE(format = 'long') {
  return {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: format === 'long' ? 28 : 22,
    lineHeight: 1.6,
  };
}
