import { describe, expect, it } from 'vitest';
import { flatten, hz, midi } from './chip';
import type { Track } from './chip';
import { TRACKS } from './tracks';

describe('midi', () => {
  it('reads note names', () => {
    expect(midi('A4')).toBe(69);
    expect(midi('C4')).toBe(60);
    expect(midi('E4')).toBe(64);
    expect(midi('C-1')).toBe(0);
  });

  it('applies sharps and flats', () => {
    expect(midi('F#2')).toBe(42);
    expect(midi('Bb3')).toBe(58);
    expect(midi('C#4')).toBe(midi('Db4'));
  });

  it('rejects anything that is not a note', () => {
    expect(() => midi('H4')).toThrow('bad note');
    expect(() => midi('e4')).toThrow('bad note');
    expect(() => midi('E')).toThrow('bad note');
  });
});

describe('hz', () => {
  it('tunes A4 to 440 Hz and doubles per octave', () => {
    expect(hz(69)).toBe(440);
    expect(hz(81)).toBeCloseTo(880, 9);
    expect(hz(57)).toBeCloseTo(220, 9);
  });
});

describe('flatten', () => {
  const track: Track = {
    title: 't',
    artist: 'a',
    bpm: 120,
    steps: 16,
    sections: [
      {
        name: 'intro',
        bars: 2,
        parts: {
          lead: [{ step: 20, len: 4, midi: 64, vel: 1 }],
          kick: [
            { step: 0, len: 1, midi: 0, vel: 1 },
            { step: 16, len: 1, midi: 0, vel: 1 },
          ],
        },
      },
      { name: 'verse', bars: 1, parts: { bass: [{ step: 3, len: 2, midi: 40, vel: 0.8 }] } },
    ],
  };

  it('adds the sections up into the length and marks where each starts', () => {
    const flat = flatten(track);
    expect(flat.length).toBe(48);
    expect(flat.marks).toEqual([
      { step: 0, name: 'intro' },
      { step: 32, name: 'verse' },
    ]);
  });

  it('moves notes to absolute steps, sorted, and keeps the note itself', () => {
    const { events } = flatten(track);
    expect(events.map((e) => [e.step, e.voice])).toEqual([
      [0, 'kick'],
      [16, 'kick'],
      [20, 'lead'],
      [35, 'bass'],
    ]);
    expect(events[3]?.note).toEqual({ step: 3, len: 2, midi: 40, vel: 0.8 });
  });

  it('gives an empty track no events', () => {
    expect(flatten({ ...track, sections: [] })).toEqual({ events: [], length: 0, marks: [] });
  });

  it('keeps every note of the real tracks inside the track', () => {
    for (const t of TRACKS) {
      const flat = flatten(t);
      expect(flat.events.length).toBeGreaterThan(0);
      for (const e of flat.events) {
        expect(e.step).toBeGreaterThanOrEqual(0);
        expect(e.step).toBeLessThan(flat.length);
      }
    }
  });
});
