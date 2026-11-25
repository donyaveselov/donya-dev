import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { after, checkAlive, run, skippable, wait } from './seq';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Runs a three-step sequence and returns the steps it reached so far. */
function threeSteps(signal: AbortSignal): { steps: string[]; done: Promise<void> } {
  const steps: string[] = [];
  const done = run(signal, async (s) => {
    steps.push('a');
    await wait(100, s);
    steps.push('b');
    await wait(100, s);
    steps.push('c');
  });
  return { steps, done };
}

describe('a timed sequence', () => {
  it('starts at once and takes its pauses', async () => {
    const { steps, done } = threeSteps(new AbortController().signal);
    expect(steps).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(100);
    expect(steps).toEqual(['a', 'b']);
    await vi.advanceTimersByTimeAsync(100);
    await done;
    expect(steps).toEqual(['a', 'b', 'c']);
  });

  it('stops at its current pause when aborted, without an error', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const life = new AbortController();
    const { steps, done } = threeSteps(life.signal);
    await vi.advanceTimersByTimeAsync(150);
    life.abort();
    await done;
    await vi.advanceTimersByTimeAsync(1000);
    expect(steps).toEqual(['a', 'b']);
    expect(vi.getTimerCount()).toBe(0);
    expect(errors).not.toHaveBeenCalled();
  });

  it('does not start a pause on a signal that is already aborted', async () => {
    const life = new AbortController();
    life.abort();
    await expect(wait(100, life.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports an error that is not the abort', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const boom = new Error('boom');
    await run(new AbortController().signal, () => Promise.reject(boom));
    expect(errors).toHaveBeenCalledWith(boom);
  });

  it('checkAlive throws only after the abort', () => {
    const life = new AbortController();
    expect(() => {
      checkAlive(life.signal);
    }).not.toThrow();
    life.abort();
    expect(() => {
      checkAlive(life.signal);
    }).toThrow(expect.objectContaining({ name: 'AbortError' }));
  });
});

describe('after', () => {
  it('fires once the time is up', () => {
    const fn = vi.fn();
    after(50, new AbortController().signal, fn);
    vi.advanceTimersByTime(49);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('never fires after an abort', () => {
    const life = new AbortController();
    const fn = vi.fn();
    after(50, life.signal, fn);
    life.abort();
    after(50, life.signal, fn);
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('skippable pauses', () => {
  it('run their full time unless skipped', async () => {
    const pause = skippable(new AbortController().signal);
    const done = vi.fn();
    void pause.wait(300).then(done);
    await vi.advanceTimersByTimeAsync(299);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledOnce();
    expect(pause.skipped).toBe(false);
  });

  it('a skip ends the pending pause and every later one', async () => {
    const pause = skippable(new AbortController().signal);
    const first = pause.wait(1000);
    pause.skip();
    await first;
    expect(pause.skipped).toBe(true);
    await pause.wait(1000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('an abort cancels them, skipped or not', async () => {
    const life = new AbortController();
    const pause = skippable(life.signal);
    const pending = pause.wait(1000);
    life.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    pause.skip();
    await expect(pause.wait(1000)).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
