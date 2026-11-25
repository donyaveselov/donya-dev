import { describe, expect, it } from 'vitest';
import { nextPhase } from './handoff-phase';
import type { Phase, PhaseEvent } from './handoff-phase';

describe('the hand-off phases', () => {
  it('goes room → in → seated → out → room', () => {
    const events: PhaseEvent[] = ['sit', 'arrived', 'stand', 'back'];
    const seen: Phase[] = [];
    let phase: Phase = 'room';
    for (const e of events) {
      phase = nextPhase(phase, e) ?? phase;
      seen.push(phase);
    }
    expect(seen).toEqual(['in', 'seated', 'out', 'room']);
  });
  it('ignores a second sit-down while flying in or seated', () => {
    expect(nextPhase('in', 'sit')).toBeNull();
    expect(nextPhase('seated', 'sit')).toBeNull();
    expect(nextPhase('out', 'sit')).toBeNull();
  });
  it('stands up only from the desktop, and only once', () => {
    expect(nextPhase('room', 'stand')).toBeNull();
    expect(nextPhase('in', 'stand')).toBeNull();
    expect(nextPhase('seated', 'stand')).toBe('out');
    expect(nextPhase('out', 'stand')).toBeNull();
  });
  it('lets only a flight end itself', () => {
    expect(nextPhase('room', 'arrived')).toBeNull();
    expect(nextPhase('seated', 'back')).toBeNull();
  });
});
