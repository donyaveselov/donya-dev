// A 5-px-high pixel font for the two framed pictures: just the letters of РЕЗЮМЕ / ДИПЛОМ / RESUME / DIPLOMA.

type Glyph = readonly string[];

const CYR_E: Glyph = ['####', '#...', '###.', '#...', '####'];
const CYR_M: Glyph = ['#...#', '##.##', '#.#.#', '#...#', '#...#'];
const CYR_O: Glyph = ['.##.', '#..#', '#..#', '#..#', '.##.'];

export const GLYPHS: Readonly<Record<string, Glyph>> = {
  Р: ['###.', '#..#', '###.', '#...', '#...'],
  Е: CYR_E,
  З: ['###.', '...#', '.##.', '...#', '###.'],
  Ю: ['#.###', '#.#.#', '###.#', '#.#.#', '#.###'],
  М: CYR_M,
  Д: ['.###.', '.#.#.', '.#.#.', '#####', '#...#'],
  И: ['#..#', '#..#', '#.##', '##.#', '#..#'],
  П: ['####', '#..#', '#..#', '#..#', '#..#'],
  Л: ['.###', '.#.#', '.#.#', '.#.#', '##.#'],
  О: CYR_O,
  R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  S: ['.###', '#...', '.##.', '...#', '###.'],
  U: ['#..#', '#..#', '#..#', '#..#', '.##.'],
  D: ['###.', '#..#', '#..#', '#..#', '###.'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  P: ['###.', '#..#', '###.', '#...', '#...'],
  L: ['#...', '#...', '#...', '#...', '####'],
  A: ['.##.', '#..#', '####', '#..#', '#..#'],
  E: CYR_E,
  M: CYR_M,
  O: CYR_O,
};

const glyphWidth = (g: Glyph | undefined): number => (g ?? ['']).reduce((a, r) => Math.max(a, r.length), 0);

/** Width in pixels: glyphs with one pixel between them (an unknown character counts as an empty glyph). */
export function pixTextWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += glyphWidth(GLYPHS[ch]) + 1;
  return w - 1;
}

/** The lit pixels of a string centred on cx, top at y. */
export function pixTextPixels(s: string, cx: number, y: number): [number, number][] {
  const out: [number, number][] = [];
  let x = Math.round(cx - pixTextWidth(s) / 2);
  for (const ch of s) {
    const gl = GLYPHS[ch];
    if (!gl) {
      x += 3;
      continue;
    }
    gl.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') out.push([x + rx, y + ry]);
    });
    x += (gl[0] ?? '').length + 1;
  }
  return out;
}

export function pixText(g: CanvasRenderingContext2D, s: string, cx: number, y: number, color: string): void {
  g.fillStyle = color;
  for (const [x, py] of pixTextPixels(s, cx, y)) g.fillRect(x, py, 1, 1);
}
