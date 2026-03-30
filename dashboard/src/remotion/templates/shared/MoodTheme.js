// 7 color mood themes matching FFmpeg color science from the video pipeline
export const MOOD_THEMES = {
  cold_desat:      { bg: '#0A0F1A', text: '#C8D6E5', accent: '#5B9BD5', muted: '#4A5568', gradient: 'linear-gradient(135deg, #0A0F1A 0%, #1A2332 100%)' },
  cool_neutral:    { bg: '#0F172A', text: '#E2E8F0', accent: '#60A5FA', muted: '#64748B', gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' },
  dark_mono:       { bg: '#0A0A0A', text: '#A0AEC0', accent: '#90CDF4', muted: '#4A5568', gradient: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 100%)' },
  warm_sepia:      { bg: '#1A130D', text: '#F5E6D3', accent: '#D4A574', muted: '#8B7355', gradient: 'linear-gradient(135deg, #1A130D 0%, #2D1F14 100%)' },
  warm_gold:       { bg: '#1A1508', text: '#FFF8E7', accent: '#F5A623', muted: '#B8860B', gradient: 'linear-gradient(135deg, #1A1508 0%, #2D2510 100%)' },
  full_natural:    { bg: '#0F1419', text: '#F7FAFC', accent: '#48BB78', muted: '#718096', gradient: 'linear-gradient(135deg, #0F1419 0%, #1A2332 100%)' },
  muted_selective: { bg: '#0D1117', text: '#CBD5E0', accent: '#9F7AEA', muted: '#4C566A', gradient: 'linear-gradient(135deg, #0D1117 0%, #161B22 100%)' },
};

export function getMoodTheme(colorMood) {
  return MOOD_THEMES[colorMood] || MOOD_THEMES.cool_neutral;
}
