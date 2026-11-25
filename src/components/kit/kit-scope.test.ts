import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScope } from './kit-scope';

describe('kit scopes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a binding at once and on every refresh', () => {
    const s = createScope();
    const fn = vi.fn();
    s.bind(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    s.refresh();
    s.refresh();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not pile up the bindings of a part that is rebuilt', () => {
    const s = createScope();
    const part = s.child();
    const label = vi.fn();
    const rebuild = vi.fn(() => {
      part.dispose();
      part.bind(label);
      part.bind(label);
    });
    s.bind(rebuild);
    for (let i = 0; i < 5; i++) s.refresh();
    expect(s.count().bindings).toBe(3);
    // each rebuild runs its two labels once: not again as fresh bindings of the same pass
    expect(rebuild).toHaveBeenCalledTimes(6);
    expect(label).toHaveBeenCalledTimes(12);
  });

  it('refreshes a part that was built earlier and not rebuilt', () => {
    const s = createScope();
    const part = s.child();
    const label = vi.fn();
    part.bind(label);
    s.refresh();
    expect(label).toHaveBeenCalledTimes(2);
  });

  it('survives bindings that add bindings to the same scope while it refreshes', () => {
    const s = createScope();
    const inner = vi.fn();
    s.bind(() => {
      s.bind(inner);
    });
    s.refresh();
    // the binding made during the pass ran once when made; the earlier one ran again
    expect(inner).toHaveBeenCalledTimes(3);
    expect(s.count().bindings).toBe(3);
  });

  it('keeps going when a binding throws, and reports it', () => {
    const report = vi.fn();
    const s = createScope(report);
    const after = vi.fn();
    let fail = false;
    s.bind(() => {
      if (fail) throw new Error('boom');
    });
    s.bind(after);
    fail = true;
    s.refresh();
    expect(report).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(2);
  });

  it('forgets a timeout once it has fired', () => {
    const s = createScope();
    const fn = vi.fn();
    s.later(100, fn);
    expect(s.count().cleanups).toBe(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(s.count().cleanups).toBe(0);
  });

  it('cancels timers on dispose, in children too, and stays usable', () => {
    const s = createScope();
    const part = s.child();
    const late = vi.fn();
    const tick = vi.fn();
    const undo = vi.fn();
    part.later(100, late);
    part.every(10, tick);
    s.onCleanup(undo);
    vi.advanceTimersByTime(25);
    expect(tick).toHaveBeenCalledTimes(2);
    s.dispose();
    vi.advanceTimersByTime(500);
    expect(late).not.toHaveBeenCalled();
    expect(tick).toHaveBeenCalledTimes(2);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(s.count()).toEqual({ bindings: 0, cleanups: 0 });
    const again = vi.fn();
    part.later(10, again);
    vi.advanceTimersByTime(10);
    expect(again).toHaveBeenCalledTimes(1);
  });

  it('cancels one timer by its own handle', () => {
    const s = createScope();
    const fn = vi.fn();
    const cancel = s.later(100, fn);
    const stop = s.every(10, fn);
    cancel();
    stop();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
    expect(s.count().cleanups).toBe(0);
  });
});
