import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { stepButtons, tourSteps, typeDelay } from './tour';

const sights = {
  desk: new Vector3(),
  hammock: new Vector3(1, 0, 0),
  bed: null,
  resume: new Vector3(0, 1, 0),
  diploma: new Vector3(0, 2, 0),
  place: null,
};

describe('the tour', () => {
  it('greets, shows every status, comes back to the real one, then the labels', () => {
    const steps = tourSteps(sights);
    expect(steps.map((s) => s.key)).toEqual([
      'hello',
      'work',
      'play',
      'outside',
      'sleep',
      'back',
      'projects',
      'resume',
      'diploma',
      'place',
      'end',
    ]);
    expect(steps.filter((s) => s.state).map((s) => [s.state, s.hour])).toEqual([
      ['work', 13],
      ['play', 21.5],
      ['outside', 19.3],
      ['sleep', 1.5],
    ]);
    expect(steps.find((s) => s.key === 'play')?.game).toBe('cs');
    expect(steps.flatMap((s) => s.show ?? [])).toEqual(['projects', 'resume', 'diploma', 'clock', 'window']);
    expect(steps.find((s) => s.key === 'sleep')?.look).toBeNull();
  });
  it('asks first, then offers skip / next, and only next at the end', () => {
    const [hello, work] = tourSteps(sights);
    expect(stepButtons(hello ?? { key: 'hello' }).map((b) => [b.label, b.action])).toEqual([
      ['no', 'end'],
      ['yes', 'next'],
    ]);
    expect(stepButtons(work ?? { key: 'work' }).map((b) => [b.label, b.ghost])).toEqual([
      ['skip', true],
      ['next', false],
    ]);
    expect(stepButtons({ key: 'end', end: true }).map((b) => [b.label, b.action])).toEqual([['next', 'end']]);
  });
  it('pauses after punctuation while typing', () => {
    expect(typeDelay('a')).toBe(34);
    expect(typeDelay(',')).toBe(160);
    expect(typeDelay('.')).toBe(160);
  });
});
