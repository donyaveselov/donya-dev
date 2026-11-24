import { describe, expect, it } from 'vitest';
import { fromLanyard, gameId } from './steam';

describe('game status from Discord (Lanyard)', () => {
  it('recognises Dota and CS by part of the name', () => {
    expect(gameId('Dota 2')).toBe(570);
    for (const n of ['Counter-Strike 2', 'Counter-Strike: Global Offensive', 'CS2', 'Counterstrike 2'])
      expect(gameId(n)).toBe(730);
    expect(gameId('Valorant')).toBe(0);
  });
  it('takes only "Playing" activities', () => {
    expect(
      fromLanyard({
        data: {
          discord_status: 'online',
          activities: [
            { type: 2, name: 'Spotify' },
            { type: 0, name: 'Dota 2' },
          ],
        },
      }),
    ).toEqual({
      state: 'in-game',
      game: 'Dota 2',
      appid: 570,
    });
    expect(fromLanyard({ data: { discord_status: 'idle', activities: [{ type: 4, name: 'Custom Status' }] } })).toEqual(
      { state: 'idle' },
    );
    expect(fromLanyard({})).toEqual({ state: 'offline' });
  });
});
