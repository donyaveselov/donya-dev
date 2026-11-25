// The tracks: notes for the chip synthesizer (chip.ts). Original music; the mood follows the room's.
import { midi } from './chip';
import type { Note, Section, Track } from './chip';

const STEPS = 16;

/** Notes from [name, step, len, vel?] within one bar, moved to bar `bar`. */
function bar(b: number, notes: readonly (readonly [string, number, number, number?])[]): Note[] {
  return notes.map(([n, step, len, vel = 1]) => ({ midi: midi(n), step: b * STEPS + step, len, vel }));
}

/** A plucked arpeggio: eight eighth notes per bar. */
function arp(b: number, tones: readonly string[], vel = 1): Note[] {
  return tones.map((n, i) => ({ midi: midi(n), step: b * STEPS + i * 2, len: 2, vel: vel * (i % 2 ? 0.8 : 1) }));
}

/** Drum hits on steps within one bar, all on the same "pitch". */
function hits(b: number, steps: readonly number[], vel = 1, len = 1): Note[] {
  return steps.map((s) => ({ midi: 0, step: b * STEPS + s, len, vel }));
}

/** Repeats a bar builder over n bars. */
function bars(n: number, f: (b: number) => Note[]): Note[] {
  return Array.from({ length: n }, (_, b) => f(b)).flat();
}

/* ---------- "4 утра" (4 AM): Em – Cmaj7 – G/B – Dsus2, about 75 BPM half-time ---------- */

const CHORDS: readonly (readonly string[])[] = [
  ['E3', 'B3', 'E4', 'G4', 'B4', 'G4', 'E4', 'B3'], // Em
  ['C3', 'G3', 'C4', 'E4', 'B4', 'E4', 'C4', 'G3'], // Cmaj7
  ['B2', 'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G3'], // G/B
  ['D3', 'A3', 'D4', 'E4', 'A4', 'E4', 'D4', 'A3'], // Dsus2
];
const ROOTS = ['E1', 'C2', 'G1', 'D2'];

const guitar = (n: number, vel = 1): Note[] => bars(n, (b) => arp(b, CHORDS[b % 4] ?? [], vel));

/** The 808: on one, late on two, and a pickup into the next bar. */
const bass = (n: number): Note[] =>
  bars(n, (b) => {
    const r = ROOTS[b % 4] ?? 'E1';
    const last = b % 4 === 3;
    return bar(b, [
      [r, 0, 6],
      [r, 7, 3, 0.8],
      [last ? 'B1' : r, 10, last ? 6 : 5],
    ]);
  });

const kick = (n: number): Note[] => bars(n, (b) => hits(b, b % 4 === 3 ? [0, 7, 10, 14] : [0, 7, 10]));
const snare = (n: number): Note[] => bars(n, (b) => hits(b, [8]));

/** Eighth-note hats with a triplet roll at the end of every other bar. */
const hat = (n: number): Note[] =>
  bars(n, (b) => {
    const base = hits(b, [0, 2, 4, 6, 8, 10, 12], 1);
    const roll = b % 2 === 1;
    const tail: Note[] = roll
      ? [14, 14 + 2 / 3, 14 + 4 / 3].map((s, i) => ({ midi: 0, step: b * STEPS + s, len: 1, vel: 0.6 + i * 0.2 }))
      : hits(b, [14]);
    return [...base, ...tail];
  });

/** The lead: two phrases over the four chords. */
const lead: Note[] = [
  ...bar(0, [
    ['B4', 0, 4],
    ['A4', 4, 2],
    ['G4', 6, 2],
    ['E4', 8, 6],
  ]),
  ...bar(1, [
    ['G4', 0, 3],
    ['E4', 3, 3],
    ['G4', 6, 2],
    ['B4', 8, 8],
  ]),
  ...bar(2, [
    ['D5', 0, 4],
    ['B4', 4, 2],
    ['A4', 6, 2],
    ['G4', 8, 4],
    ['B4', 12, 4],
  ]),
  ...bar(3, [
    ['A4', 0, 6],
    ['E4', 6, 2],
    ['D4', 8, 8],
  ]),
  ...bar(4, [
    ['B4', 0, 2],
    ['B4', 2, 2],
    ['A4', 4, 2],
    ['G4', 6, 2],
    ['A4', 8, 4],
    ['G4', 12, 4],
  ]),
  ...bar(5, [
    ['E4', 0, 8],
    ['G4', 8, 4],
    ['A4', 12, 4],
  ]),
  ...bar(6, [
    ['B4', 0, 4],
    ['D5', 4, 4],
    ['E5', 8, 6],
    ['D5', 14, 2],
  ]),
  ...bar(7, [
    ['B4', 0, 4],
    ['A4', 4, 4],
    ['E4', 8, 8],
  ]),
];

const sections: Section[] = [
  { name: 'intro', bars: 4, parts: { guitar: guitar(4, 0.85) } },
  {
    name: 'beat',
    bars: 8,
    parts: { guitar: guitar(8), bass: bass(8), kick: kick(8), snare: snare(8), hat: hat(8) },
  },
  {
    name: 'melody',
    bars: 8,
    parts: { guitar: guitar(8, 0.8), bass: bass(8), kick: kick(8), snare: snare(8), hat: hat(8), lead },
  },
  { name: 'outro', bars: 4, parts: { guitar: guitar(4, 0.7), bass: bass(1) } },
];

export const FOUR_AM: Track = { title: '4 утра', artist: 'donya', bpm: 75, steps: STEPS, sections };

export const TRACKS: readonly Track[] = [FOUR_AM];
