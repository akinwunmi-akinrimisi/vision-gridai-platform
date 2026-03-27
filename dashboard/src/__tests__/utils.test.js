import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('resolves tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles empty call', () => {
    expect(cn()).toBe('');
  });

  it('passes through duplicate non-tailwind classes', () => {
    // twMerge only deduplicates tailwind utility classes, not arbitrary ones
    expect(cn('foo', 'foo')).toBe('foo foo');
  });

  it('resolves tailwind color conflicts', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('preserves non-conflicting classes', () => {
    expect(cn('bg-red-500', 'text-blue-500', 'p-4')).toBe('bg-red-500 text-blue-500 p-4');
  });
});
