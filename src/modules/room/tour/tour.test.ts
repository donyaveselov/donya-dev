import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STATUSES, statusAt } from '../store/clock';
import type { TagKey } from '../components/tags';
import { stepButtons, tourSteps } from './tour';
import type { TourStep } from './tour';

const sights = {
  desk: new Vector3(),
  hammock: new Vector3(1, 0, 0),
  bed: new Vector3(2, 0, 0),
  resume: new Vector3(0, 1, 0),
  diploma: new Vector3(0, 2, 0),
  place: new Vector3(0, 3, 0),
};
const steps = tourSteps(sights);
const indexOf = (find: (s: TourStep) => boolean | undefined): number => steps.findIndex((s) => !!find(s));

describe('the tour script', () => {
  it('opens with a question and closes with one end step', () => {
    expect(steps[0]?.ask).toBe(true);
    expect(steps.filter((s) => s.ask)).toHaveLength(1);
    expect(steps.at(-1)?.end).toBe(true);
    expect(steps.filter((s) => s.end)).toHaveLength(1);
  });
  it('shows every status once, at an hour when the schedule really gives it', () => {
    const shown = steps.filter((s) => s.state);
    expect(shown.map((s) => s.state).sort()).toEqual([...STATUSES].sort());
    for (const s of shown) {
      const hour = s.hour ?? NaN;
      const time = { h: Math.floor(hour), m: Math.round((hour % 1) * 60) };
      expect(statusAt(time, null, null), s.key).toBe(s.state);
    }
  });
  it('brings the real status back before it points at anything', () => {
    const lastStatus = steps.findLastIndex((s) => !!s.state);
    const real = indexOf((s) => s.real);
    const firstLabel = indexOf((s) => s.show && s.show.length > 0);
    expect(real).toBeGreaterThan(lastStatus);
    expect(firstLabel).toBeGreaterThan(real);
  });
  it('turns every label on exactly once', () => {
    const all: TagKey[] = ['clock', 'diploma', 'projects', 'resume', 'window'];
    expect(steps.flatMap((s) => s.show ?? []).sort()).toEqual(all);
  });
  it('leans the camera towards where the owner is in each status', () => {
    const look = (state: TourStep['state']): unknown => steps.find((s) => s.state === state)?.look;
    expect(look('work')).toBe(sights.desk);
    expect(look('play')).toBe(sights.desk);
    expect(look('outside')).toBe(sights.hammock);
    expect(look('sleep')).toBe(sights.bed);
  });
  it('still runs in full when the model lacks a sight: the camera just does not lean', () => {
    const bare = tourSteps({ desk: null, hammock: null, bed: null, resume: null, diploma: null, place: null });
    expect(bare.map((s) => s.key)).toEqual(steps.map((s) => s.key));
    expect(bare.every((s) => !s.look)).toBe(true);
  });
});

describe('the tour buttons', () => {
  it('makes the way forward the one loud button on every step', () => {
    for (const s of steps) {
      const loud = stepButtons(s).filter((b) => !b.ghost);
      expect(loud).toHaveLength(1);
      expect(loud[0]?.action, s.key).toBe(s.end ? 'end' : 'next');
    }
  });
});
