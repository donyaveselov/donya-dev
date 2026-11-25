import { describe, expect, it } from 'vitest';
import { parseRoute } from './routes';
import type { Route } from './routes';

const PLAIN: Route = {
  preview: null,
  forced: null,
  game: null,
  resume: false,
  sit: null,
  ps1: true,
  camera: 'southeast',
  holdLoader: false,
};

describe('hash routes', () => {
  it('is the plain room for no hash or an unknown one', () => {
    expect(parseRoute('')).toEqual(PLAIN);
    expect(parseRoute('nonsense')).toEqual(PLAIN);
    expect(parseRoute('debug')).toEqual(PLAIN); // debug mode is not a route
    expect(parseRoute('toString')).toEqual(PLAIN); // nor is anything an object happens to have
  });
  it('previews a time of day', () => {
    expect(parseRoute('day')).toEqual({ ...PLAIN, preview: 13 });
    expect(parseRoute('sunset')).toEqual({ ...PLAIN, preview: 18.2 });
    expect(parseRoute('night')).toEqual({ ...PLAIN, preview: 1.5 });
  });
  it('previews a status at the real hour', () => {
    for (const status of ['work', 'play', 'sleep', 'outside'] as const)
      expect(parseRoute(status)).toEqual({ ...PLAIN, forced: status });
  });
  it('shows a game being played', () => {
    expect(parseRoute('dota')).toEqual({ ...PLAIN, forced: 'play', game: { kind: 'dota', name: 'Dota 2' } });
    expect(parseRoute('cs')).toEqual({ ...PLAIN, forced: 'play', game: { kind: 'cs', name: 'Counter-Strike 2' } });
  });
  it('keeps the loading screen up', () => {
    expect(parseRoute('loader')).toEqual({ ...PLAIN, holdLoader: true });
  });
  it('opens the resume sheet', () => {
    expect(parseRoute('resume')).toEqual({ ...PLAIN, resume: true });
  });
  it('sits down at the PC', () => {
    expect(parseRoute('pc')).toEqual({ ...PLAIN, sit: 'desktop' });
    expect(parseRoute('projects')).toEqual({ ...PLAIN, sit: 'projects' });
    expect(parseRoute('pcdota')).toEqual({
      ...PLAIN,
      sit: 'desktop',
      forced: 'play',
      game: { kind: 'dota', name: 'Dota 2' },
    });
  });
  it('turns the PS1 look off', () => {
    expect(parseRoute('nops1')).toEqual({ ...PLAIN, ps1: false });
  });
  it('starts the camera somewhere else', () => {
    expect(parseRoute('southwest').camera).toBe('southwest');
    expect(parseRoute('northeast').camera).toBe('northeast');
    expect(parseRoute('low').camera).toBe('low');
  });
});
