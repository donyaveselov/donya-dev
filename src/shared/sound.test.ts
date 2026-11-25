import { describe, expect, it } from 'vitest';
import { isMuted, muteChosen, onMutedChange, setMuted } from './sound';

describe('the one sound switch', () => {
  it('starts unmuted and tells every listener when it flips', () => {
    expect(isMuted()).toBe(false);
    expect(muteChosen()).toBe(false);
    const room: boolean[] = [];
    const desk: boolean[] = [];
    const off = onMutedChange((m) => room.push(m));
    onMutedChange((m) => desk.push(m));
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(muteChosen()).toBe(true);
    setMuted(true); // no change, no news
    setMuted(false);
    off();
    setMuted(true);
    expect(room).toEqual([true, false]);
    expect(desk).toEqual([true, false, true]);
  });
});
