import { beforeEach, describe, expect, it } from 'vitest';
import { beginBusy, isBusy, resetBusy } from './busy';

beforeEach(resetBusy);

describe('the busy hold', () => {
  it('lasts until its own release', () => {
    expect(isBusy()).toBe(false);
    const release = beginBusy();
    expect(isBusy()).toBe(true);
    release();
    expect(isBusy()).toBe(false);
  });

  it("is not cleared by another sequence's release", () => {
    const boot = beginBusy();
    const game = beginBusy();
    game();
    expect(isBusy()).toBe(true);
    boot();
    expect(isBusy()).toBe(false);
  });

  it('is released once: a second call does not take a hold from anyone', () => {
    const first = beginBusy();
    first();
    const second = beginBusy();
    first();
    expect(isBusy()).toBe(true);
    second();
    expect(isBusy()).toBe(false);
  });

  it('is void after a reset (unmount), and stale releases do nothing', () => {
    const stale = beginBusy();
    resetBusy();
    expect(isBusy()).toBe(false);
    const fresh = beginBusy();
    stale();
    expect(isBusy()).toBe(true);
    fresh();
  });
});
