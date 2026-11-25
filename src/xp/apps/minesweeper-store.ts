// What Minesweeper keeps in localStorage, read back as the unknown data it is (unit-tested in minesweeper.test.ts).

export const LEVEL_IDS = ['beginner', 'intermediate', 'expert'] as const;
export type Level = (typeof LEVEL_IDS)[number];
export const isLevel = (v: unknown): v is Level => LEVEL_IDS.some((l) => l === v);

export interface Settings {
  level: Level;
  marks: boolean;
}
export type BestTimes = Partial<Record<Level, number>>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The saved level and "Marks (?)" switch; anything else in storage gives the defaults. */
export function parseSettings(v: unknown): Settings {
  const o = isRecord(v) ? v : {};
  return { level: isLevel(o.level) ? o.level : 'beginner', marks: o.marks !== false };
}

/** The saved best times, in seconds: only whole positive numbers of known levels are kept. */
export function parseBest(v: unknown): BestTimes {
  const out: BestTimes = {};
  if (!isRecord(v)) return out;
  for (const l of LEVEL_IDS) {
    const n = v[l];
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) out[l] = n;
  }
  return out;
}

/** JSON text as a value, or undefined when it is missing or broken. */
export function parseJson(text: string | null): unknown {
  if (text == null) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
