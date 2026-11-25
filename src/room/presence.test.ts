import { describe, expect, it } from 'vitest';
import { fromLanyard, gameKind } from './presence';

describe('my Discord presence (Lanyard)', () => {
  it('recognises Dota and CS by part of the name', () => {
    expect(gameKind('Dota 2')).toBe('dota');
    for (const n of ['Counter-Strike 2', 'Counter-Strike: Global Offensive', 'CS2', 'CS:GO', 'Counterstrike 2'])
      expect(gameKind(n), n).toBe('cs');
    expect(gameKind('Valorant')).toBe('other');
    expect(gameKind('Docs')).toBe('other'); // "cs" inside a word is not the game
  });
  it('takes only "Playing" activities', () => {
    const reply = {
      data: {
        discord_status: 'online',
        activities: [
          { type: 2, name: 'Spotify' },
          { type: 0, name: 'Dota 2' },
        ],
      },
    };
    expect(fromLanyard(reply)).toEqual({ playing: true, game: 'Dota 2', kind: 'dota' });
    expect(fromLanyard({ data: { discord_status: 'online', activities: [{ type: 0, name: 'Hades II' }] } })).toEqual({
      playing: true,
      game: 'Hades II',
      kind: 'other',
    });
  });
  it('is the Discord status when nothing is played', () => {
    expect(fromLanyard({ data: { discord_status: 'idle', activities: [{ type: 4, name: 'Custom Status' }] } })).toEqual(
      { playing: false, status: 'idle' },
    );
    expect(fromLanyard({ data: { discord_status: 'dnd', activities: [{ type: 0 }] } })).toEqual({
      playing: false,
      status: 'dnd',
    });
    expect(fromLanyard({})).toEqual({ playing: false, status: 'offline' });
  });
});
