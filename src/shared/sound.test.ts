import { describe, expect, it } from 'vitest';
import { isMuted, loadMuted, muteChosen, onMutedChange, setMuted } from './sound';

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

describe('the remembered switch', () => {
  const stored = (items: Record<string, string>) => (): Pick<Storage, 'getItem'> => ({
    getItem: (k) => items[k] ?? null,
  });

  it('reads the shared key', () => {
    expect(loadMuted(stored({ muted: '1' }))).toEqual({ muted: true, saved: true });
    expect(loadMuted(stored({ muted: '0' }))).toEqual({ muted: false, saved: true });
  });
  it("migrates the room's old 'music' key: 'off' meant muted", () => {
    expect(loadMuted(stored({ music: 'off' }))).toEqual({ muted: true, saved: true });
    expect(loadMuted(stored({ music: 'on' }))).toEqual({ muted: false, saved: false });
  });
  it('prefers the shared key over the old one', () => {
    expect(loadMuted(stored({ muted: '0', music: 'off' }))).toEqual({ muted: false, saved: true });
  });
  it('is unmuted and not chosen for a first visit or with storage blocked', () => {
    expect(loadMuted(stored({}))).toEqual({ muted: false, saved: false });
    expect(
      loadMuted(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
    ).toEqual({ muted: false, saved: false });
  });
});
