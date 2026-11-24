import { describe, expect, it } from 'vitest';
import { Calculator } from './calculator';

const msgs = { divZero: 'Cannot divide by zero.', invalid: 'Invalid input.', ieee: 'IEEE 754' };
const calc = (): Calculator => new Calculator(() => msgs);
const run = (c: Calculator, keys: string): Calculator => {
  for (const k of keys.split(' ')) c.press(k);
  return c;
};

describe('calculator', () => {
  it('shows whole numbers with a trailing point', () => {
    expect(calc().display()).toBe('0.');
    expect(run(calc(), '1 2 . 5').display()).toBe('12.5');
  });
  it('chains operations left to right', () => {
    expect(run(calc(), '7 * 6 =').cur).toBe('42');
    expect(run(calc(), '2 + 3 * 4 =').cur).toBe('20');
    expect(run(calc(), '1 0 - 4 / 2 =').cur).toBe('3');
  });
  it('says the answer is 42', () => {
    const c = calc();
    run(c, '7 * 6');
    expect(c.press('=')).toBe(true);
  });
  it('explains floating point', () => {
    expect(run(calc(), '. 1 + . 2 =').hint).toBe('IEEE 754');
  });
  it('refuses to divide by zero and locks until C', () => {
    const c = run(calc(), '1 / 0 =');
    expect(c.err).toBe(true);
    expect(c.display()).toBe('Cannot divide by zero.');
    run(c, '5 +');
    expect(c.cur).toBe('Cannot divide by zero.');
    run(c, 'C 2');
    expect(c.display()).toBe('2.');
  });
  it('has the unary keys and memory', () => {
    expect(run(calc(), '9 sqrt').cur).toBe('3');
    expect(run(calc(), '9 +/- sqrt').cur).toBe('Invalid input.');
    expect(run(calc(), '4 1/x').cur).toBe('0.25');
    expect(run(calc(), '2 0 0 + 1 0 %').cur).toBe('20');
    expect(run(calc(), '5 MS C MR').cur).toBe('5');
    expect(run(calc(), '5 M+ CE 3 M+ C MR').cur).toBe('8');
    // M+ keeps the number open, as calc.exe did: the next digit is appended
    expect(run(calc(), '5 M+ 3').cur).toBe('53');
    expect(run(calc(), '1 2 3 BS BS BS').cur).toBe('0');
    expect(run(calc(), '5 +/- BS').cur).toBe('0');
  });
  it('limits input to 16 digits', () => {
    expect(run(calc(), Array(20).fill('9').join(' ')).cur).toHaveLength(16);
  });
});
