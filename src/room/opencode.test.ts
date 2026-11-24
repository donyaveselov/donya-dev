import { describe, expect, it } from 'vitest';
import { CodeSession } from './opencode';

describe('CodeSession', () => {
  it('is deterministic for a seed', () => {
    const a = new CodeSession();
    const b = new CodeSession();
    a.step(60);
    for (let i = 0; i < 600; i++) b.step(0.1);
    expect(a.lines.map((l) => l.join('|'))).toEqual(b.lines.map((l) => l.join('|')));
  });
  it('starts with the first ask and keeps at most 40 lines', () => {
    const s = new CodeSession();
    s.step(6);
    expect(s.lines[0]).toEqual(['u', 'отцентруй див']);
    s.step(600);
    expect(s.lines.length).toBe(40);
    expect(s.n).toBeGreaterThan(9);
  });
  it('types prose and lands tool lines whole', () => {
    const s = new CodeSession();
    s.step(0.5);
    expect(s.cur?.[0]).toBe('u');
    expect(s.asking).toBe(true);
    expect(Math.floor(s.shown)).toBe(8); // the owner types 16 characters a second
  });
});
