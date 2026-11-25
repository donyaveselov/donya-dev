// Timed sequences (boot, shutdown, the game hand-off) written as async functions: `await wait(ms, signal)` between the
// steps, and aborting the signal (the desktop was unmounted) ends the sequence at its current wait, so no step runs on
// a desktop that is gone (unit-tested in seq.test.ts).

const abortError = (): DOMException => new DOMException('The desktop was unmounted', 'AbortError');
const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

/** A timer as a promise: `finish` ends it early (resolving), an abort of the signal rejects it. */
function sleep(ms: number, signal: AbortSignal): { done: Promise<void>; finish: () => void } {
  let finish = (): void => undefined;
  const done = new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const settle = (): void => {
      clearTimeout(t);
      signal.removeEventListener('abort', onAbort);
    };
    const onAbort = (): void => {
      settle();
      reject(abortError());
    };
    const t = setTimeout(() => {
      settle();
      resolve();
    }, ms);
    finish = () => {
      settle();
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
  return { done, finish };
}

/** Resolves after `ms`; rejects with an AbortError as soon as the signal aborts. */
export const wait = (ms: number, signal: AbortSignal): Promise<void> => sleep(ms, signal).done;

/** Throws the AbortError when the signal aborted while the sequence awaited something other than a wait. */
export function checkAlive(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

/** setTimeout that never fires after the signal aborted. */
export function after(ms: number, signal: AbortSignal, fn: () => void): void {
  if (signal.aborted) return;
  const onAbort = (): void => {
    clearTimeout(t);
  };
  const t = setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    fn();
  }, ms);
  signal.addEventListener('abort', onAbort, { once: true });
}

/** Runs a sequence to its end, or quietly up to the wait at which the signal aborted; other errors are reported. */
export async function run(signal: AbortSignal, steps: (signal: AbortSignal) => Promise<void>): Promise<void> {
  try {
    await steps(signal);
  } catch (e) {
    if (!isAbort(e)) console.error(e);
  }
}

export interface Skippable {
  wait(ms: number): Promise<void>;
  /** Finishes the pending wait and every later one at once. */
  skip(): void;
  readonly skipped: boolean;
}

/** A sequence of waits that one "skip" (a key, a click) finishes at once; aborting the signal still cancels them. */
export function skippable(signal: AbortSignal): Skippable {
  let skipped = false;
  const pending = new Set<() => void>();
  return {
    wait(ms) {
      const { done, finish } = sleep(skipped ? 0 : ms, signal);
      if (skipped) finish();
      else pending.add(finish);
      return done.finally(() => pending.delete(finish));
    },
    skip() {
      skipped = true;
      for (const finish of pending) finish();
    },
    get skipped() {
      return skipped;
    },
  };
}
