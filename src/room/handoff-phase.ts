// Where the visitor is between the room and the desktop. The two flights are not interruptible: a request that does
// not fit the phase (a second click mid-flight, "stand up" twice) is ignored.

/** In the room, flying in to a monitor, at the desktop, flying back out. */
export type Phase = 'room' | 'in' | 'seated' | 'out';

export type PhaseEvent = 'sit' | 'arrived' | 'stand' | 'back';

const NEXT: Record<Phase, Partial<Record<PhaseEvent, Phase>>> = {
  room: { sit: 'in' },
  in: { arrived: 'seated' },
  seated: { stand: 'out' },
  out: { back: 'room' },
};

/** The phase after an event, or null when the event does not apply to the phase (the caller then does nothing). */
export function nextPhase(phase: Phase, event: PhaseEvent): Phase | null {
  return NEXT[phase][event] ?? null;
}
