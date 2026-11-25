// "A sequence owns the screen": boot, shutdown, the blue screen and the game hand-off hold the desktop busy while they
// run, and input handlers stand back. Each holder gets its own release, so one sequence cannot clear another's hold
// (unit-tested in busy.test.ts).

const holds = new Set<symbol>();

/** Holds the desktop busy until the returned release is called (calling it again does nothing). */
export function beginBusy(): () => void {
  const hold = Symbol('busy');
  holds.add(hold);
  return () => {
    holds.delete(hold);
  };
}

export const isBusy = (): boolean => holds.size > 0;

/** Unmount: every hold is void, and releases still held by cancelled sequences do nothing. */
export function resetBusy(): void {
  holds.clear();
}
