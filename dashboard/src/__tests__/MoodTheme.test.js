import { describe, it, expect } from 'vitest';
import { getMoodTheme, MOOD_THEMES } from '../remotion/templates/shared/MoodTheme';

const REQUIRED_PROPERTIES = ['bg', 'text', 'accent', 'muted', 'gradient'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

describe('getMoodTheme -- Theme Selection', () => {
  it('returns correct theme for each of the 7 moods', () => {
    const moods = ['cold_desat', 'cool_neutral', 'dark_mono', 'warm_sepia', 'warm_gold', 'full_natural', 'muted_selective'];
    for (const mood of moods) {
      const theme = getMoodTheme(mood);
      expect(theme).toEqual(MOOD_THEMES[mood]);
    }
  });

  it('returns cool_neutral theme for null input', () => {
    const theme = getMoodTheme(null);
    expect(theme).toEqual(MOOD_THEMES.cool_neutral);
  });

  it('returns cool_neutral theme for undefined input', () => {
    const theme = getMoodTheme(undefined);
    expect(theme).toEqual(MOOD_THEMES.cool_neutral);
  });

  it('returns cool_neutral theme for unknown mood string', () => {
    const theme = getMoodTheme('nonexistent_mood');
    expect(theme).toEqual(MOOD_THEMES.cool_neutral);
  });
});

describe('getMoodTheme -- Theme Structure', () => {
  it('every theme has bg, text, accent, muted, and gradient properties', () => {
    for (const [moodKey, theme] of Object.entries(MOOD_THEMES)) {
      for (const prop of REQUIRED_PROPERTIES) {
        expect(theme).toHaveProperty(prop);
        expect(typeof theme[prop]).toBe('string');
      }
    }
  });

  it('all hex colors in bg, text, accent, muted are valid #XXXXXX format', () => {
    const colorProps = ['bg', 'text', 'accent', 'muted'];
    for (const [moodKey, theme] of Object.entries(MOOD_THEMES)) {
      for (const prop of colorProps) {
        expect(theme[prop]).toMatch(HEX_COLOR_REGEX);
      }
    }
  });

  it('all gradient values contain "linear-gradient"', () => {
    for (const [moodKey, theme] of Object.entries(MOOD_THEMES)) {
      expect(theme.gradient).toContain('linear-gradient');
    }
  });

  it('MOOD_THEMES has exactly 7 entries', () => {
    expect(Object.keys(MOOD_THEMES).length).toBe(7);
  });
});
