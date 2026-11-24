import { describe, expect, it } from 'vitest';
import { parseRoute } from './panels';

describe('hash routes', () => {
  it('previews a time of day', () => {
    expect(parseRoute('day')).toEqual({ preview: 13, forced: null, game: null });
    expect(parseRoute('sunset').preview).toBe(18.2);
    expect(parseRoute('night').preview).toBe(1.5);
  });
  it('previews a status at the real hour', () => {
    expect(parseRoute('sleep')).toEqual({ preview: null, forced: 'sleep', game: null });
    expect(parseRoute('play').forced).toBe('play');
  });
  it('shows a game', () => {
    expect(parseRoute('dota')).toEqual({ preview: null, forced: 'play', game: { kind: 'dota', name: 'Dota 2' } });
    expect(parseRoute('pcdota').game?.kind).toBe('dota');
    expect(parseRoute('cs').game?.name).toBe('Counter-Strike 2');
  });
  it('leaves everything else alone', () => {
    expect(parseRoute('')).toEqual({ preview: null, forced: null, game: null });
    expect(parseRoute('resume')).toEqual({ preview: null, forced: null, game: null });
  });
});
