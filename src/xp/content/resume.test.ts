import { describe, expect, it } from 'vitest';
import { jobOrder, jobPeriod, RESUME } from './resume';

describe('the resume', () => {
  it('lists the jobs from the most recent one', () => {
    expect(RESUME.jobs.length).toBeGreaterThan(1);
    expect([...RESUME.jobs].sort(jobOrder)).toEqual(RESUME.jobs);
    expect(RESUME.jobs[0]?.to).toBeNull();
  });
  it('orders an open job first, then by end and start', () => {
    const open = { from: [2023, 1], to: null } as const;
    const late = { from: [2025, 7], to: [2026, 9] } as const;
    const early = { from: [2024, 1], to: [2025, 6] } as const;
    const earlyShort = { from: [2025, 1], to: [2025, 6] } as const;
    expect([early, late, earlyShort, open].sort(jobOrder)).toEqual([open, late, earlyShort, early]);
  });
  it('writes a period in both languages', () => {
    expect(jobPeriod({ from: [2025, 7], to: [2026, 9] })).toEqual({
      ru: 'июль 2025 — сентябрь 2026',
      en: 'Jul 2025 — Sep 2026',
    });
    expect(jobPeriod({ from: [2023, 1], to: null })).toEqual({
      ru: 'январь 2023 — наст. время',
      en: 'Jan 2023 — present',
    });
  });
  it('has every job period inside the calendar', () => {
    for (const j of RESUME.jobs)
      for (const [, m] of [j.from, ...(j.to ? [j.to] : [])]) expect(m >= 1 && m <= 12).toBe(true);
  });
});
