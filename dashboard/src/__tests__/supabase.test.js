import { describe, it, expect } from 'vitest';
import { supabase } from '../lib/supabase';

describe('Supabase client', () => {
  it('exports a supabase client object', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase).toBe('object');
  });

  it('has a .from() method for querying tables', () => {
    expect(typeof supabase.from).toBe('function');
  });

  it('has a .channel() method for Realtime subscriptions', () => {
    expect(typeof supabase.channel).toBe('function');
  });

  it('has a .removeChannel() method for cleanup', () => {
    expect(typeof supabase.removeChannel).toBe('function');
  });
});
