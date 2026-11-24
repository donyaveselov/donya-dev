// Textures the room draws itself instead of downloading: the monitor pictures, the sea tile, light cards and halos.
import { CanvasTexture, NearestMipmapNearestFilter, RepeatWrapping, sRGBEncoding } from 'three';
import { nearest } from './psx';

export function canvas(w: number, h = w): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('no 2d canvas');
  return g;
}

/** A canvas texture in display colour, laid on glTF UVs (no flip). */
export function screenCanvasTexture(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.encoding = sRGBEncoding;
  t.flipY = false;
  return t;
}

// Screens in the room are minified (~18:1), at the end of the flight to a monitor magnified. Nearest-mipmap-nearest
// gives hard PS1 texels that still carry the code lines (plain nearest at 18:1 drops the thin text and the screen reads
// black); the magnification filter, the only one the hand-off frame uses, stays linear.
export function screenFilter(t: CanvasTexture): CanvasTexture {
  t.minFilter = NearestMipmapNearestFilter;
  t.generateMipmaps = true;
  t.anisotropy = 1;
  return t;
}

const circle = (g: CanvasRenderingContext2D, x: number, y: number, r: number): void => {
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.fill();
};
const poly = (g: CanvasRenderingContext2D, pts: readonly number[]): void => {
  g.beginPath();
  g.moveTo(pts[0] ?? 0, pts[1] ?? 0);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
  g.fill();
};
const stroke = (g: CanvasRenderingContext2D, pts: readonly number[]): void => {
  g.beginPath();
  g.moveTo(pts[0] ?? 0, pts[1] ?? 0);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
  g.stroke();
};
const rect = (g: CanvasRenderingContext2D, fill: string, x: number, y: number, w: number, h: number): void => {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
};
const vertical = (g: CanvasRenderingContext2D, y0: number, y1: number, top: string, bottom: string): CanvasGradient => {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  return gr;
};

export type ScreenKind = 'editor' | 'terminal' | 'dota' | 'cs' | 'youtube' | 'game';

const PAINT: Record<ScreenKind, (g: CanvasRenderingContext2D) => void> = {
  editor(g) {
    rect(g, '#161f33', 0, 0, 512, 26);
    g.fillRect(0, 26, 96, 262);
    rect(g, '#58b8ff', 104, 6, 90, 14);
    for (let i = 0; i < 9; i++) rect(g, i === 2 ? '#58b8ff' : '#3a4763', 12, 40 + i * 24, 40 + ((i * 23) % 36), 9);
    const cols = ['#ff7ab6', '#7ee0ff', '#c8d3f5', '#9ae6a0', '#ffd479'];
    for (let i = 0; i < 10; i++) {
      const y = 42 + i * 23;
      const x = 112 + ((i * 2) % 3) * 22;
      rect(g, cols[i % 5] ?? '', x, y, 54 + ((i * 37) % 60), 10);
      rect(g, cols[(i + 2) % 5] ?? '', x + 70 + ((i * 37) % 60), y, 40 + ((i * 53) % 110), 10);
      if (i % 3 === 0) rect(g, '#c8d3f5', x + 220 + ((i * 11) % 50), y, 60, 10);
    }
  },
  // top-down MOBA: map with a river and three lanes, two bases, minimap and ability bar
  dota(g) {
    rect(g, '#1d3b24', 0, 0, 512, 288);
    g.fillStyle = '#254a2c';
    for (let i = 0; i < 26; i++) g.fillRect((i * 97) % 500, (i * 53) % 230, 30 + ((i * 7) % 26), 18 + ((i * 5) % 14));
    g.strokeStyle = '#2f7fa8';
    g.lineWidth = 26;
    stroke(g, [-10, 40, 522, 200]);
    g.strokeStyle = '#8a7a4e';
    g.lineWidth = 9;
    g.lineCap = 'round';
    stroke(g, [40, 230, 470, 30]);
    stroke(g, [40, 230, 40, 30, 470, 30]);
    stroke(g, [40, 230, 470, 230, 470, 30]);
    rect(g, '#58d68d', 18, 204, 46, 46);
    rect(g, '#ff5c5c', 448, 10, 46, 46);
    const units: [number, number, string][] = [
      [150, 178, '#58d68d'],
      [176, 160, '#58d68d'],
      [250, 134, '#58d68d'],
      [282, 116, '#ff5c5c'],
      [320, 96, '#ff5c5c'],
      [40, 110, '#58d68d'],
      [300, 230, '#ff5c5c'],
    ];
    for (const [x, y, c] of units) {
      g.fillStyle = c;
      circle(g, x, y, 7);
    }
    g.fillStyle = '#ffd479';
    circle(g, 266, 126, 16);
    rect(g, 'rgba(8,12,20,.86)', 120, 244, 272, 44);
    g.fillRect(0, 222, 70, 66);
    ['#7ee0ff', '#ff7ab6', '#9ae6a0', '#ffd479', '#c8a8ff', '#ff9a5c'].forEach((c, i) => {
      rect(g, c, 132 + i * 42, 252, 32, 28);
    });
    rect(g, '#58d68d', 6, 228, 58, 54);
    rect(g, '#2f7fa8', 6, 248, 58, 8);
    rect(g, '#58d68d', 200, 6, 50, 10);
    rect(g, '#ff5c5c', 262, 6, 50, 10);
  },
  // first-person shooter: sand-coloured map, a doorway, crosshair, weapon and HUD numbers
  cs(g) {
    g.fillStyle = vertical(g, 0, 120, '#7fb6e6', '#d9ecf7');
    g.fillRect(0, 0, 512, 130);
    rect(g, '#c9a56a', 0, 130, 512, 158);
    g.fillStyle = '#b08a52';
    poly(g, [0, 30, 170, 100, 170, 190, 0, 288]);
    g.fillStyle = '#d7b77c';
    poly(g, [512, 20, 350, 100, 350, 190, 512, 288]);
    rect(g, '#a57f48', 170, 100, 180, 90);
    rect(g, '#3a2c1c', 232, 116, 54, 74);
    rect(g, '#8a6a3c', 96, 168, 46, 42);
    g.fillRect(372, 176, 40, 34);
    rect(g, '#e04a3a', 250, 136, 14, 30);
    circle(g, 257, 128, 8);
    g.strokeStyle = '#7dff8a';
    g.lineWidth = 3;
    g.lineCap = 'butt';
    for (const l of [
      [256, 124, 256, 136],
      [256, 152, 256, 164],
      [236, 144, 248, 144],
      [264, 144, 276, 144],
    ])
      stroke(g, l);
    g.fillStyle = '#1b1e24';
    poly(g, [330, 288, 372, 214, 402, 206, 420, 222, 512, 250, 512, 288]);
    rect(g, '#2c3038', 366, 200, 44, 12);
    rect(g, '#ffffff', 16, 258, 26, 18);
    g.fillRect(48, 258, 44, 18);
    g.fillRect(420, 14, 76, 12);
    rect(g, '#ffd479', 16, 14, 60, 12);
    rect(g, '#7ee0ff', 228, 8, 24, 14);
    rect(g, '#ff9a5c', 260, 8, 24, 14);
  },
  // the second monitor while gaming: a video page with a player, a red progress bar and a list of videos
  youtube(g) {
    rect(g, '#0f0f0f', 0, 0, 512, 288);
    rect(g, '#ff0033', 14, 10, 26, 18);
    g.fillStyle = '#ffffff';
    poly(g, [23, 14, 33, 19, 23, 24]);
    rect(g, '#2a2a2a', 150, 10, 190, 18);
    g.fillStyle = '#5a5a5a';
    circle(g, 486, 19, 9);
    const vid = g.createLinearGradient(14, 40, 340, 210);
    vid.addColorStop(0, '#24406e');
    vid.addColorStop(1, '#7a3b6e');
    g.fillStyle = vid;
    g.fillRect(14, 40, 326, 176);
    g.fillStyle = '#f2c14e';
    circle(g, 250, 100, 30);
    g.fillStyle = '#16233f';
    poly(g, [14, 216, 110, 130, 190, 190, 250, 150, 340, 216]);
    g.fillStyle = 'rgba(0,0,0,.55)';
    circle(g, 177, 128, 26);
    g.fillStyle = '#ffffff';
    poly(g, [168, 114, 192, 128, 168, 142]);
    rect(g, '#5a5a5a', 14, 210, 326, 5);
    rect(g, '#ff0033', 14, 210, 142, 5);
    circle(g, 156, 212, 6);
    rect(g, '#f1f1f1', 14, 228, 230, 12);
    rect(g, '#8a8a8a', 14, 248, 120, 9);
    g.fillStyle = '#5a5a5a';
    circle(g, 26, 272, 9);
    rect(g, '#f1f1f1', 42, 266, 90, 9);
    rect(g, '#ff0033', 270, 262, 70, 18);
    ['#3d6b4f', '#6b4a3d', '#3d4f6b', '#6b3d5e', '#5e6b3d'].forEach((c, i) => {
      const y = 40 + i * 49;
      rect(g, c, 354, y, 74, 42);
      rect(g, '#e8e8e8', 434, y + 4, 64, 8);
      rect(g, '#8a8a8a', 434, y + 18, 44, 7);
      g.fillRect(434, y + 30, 54, 6);
    });
  },
  // any other game: sky, sun, hills, a road and a HUD
  game(g) {
    g.fillStyle = vertical(g, 0, 190, '#3b2a7a', '#ff7ab6');
    g.fillRect(0, 0, 512, 190);
    g.fillStyle = '#ffd479';
    circle(g, 256, 150, 62);
    g.fillStyle = '#241a52';
    poly(g, [0, 190, 110, 110, 200, 190]);
    poly(g, [300, 190, 410, 96, 512, 170, 512, 190]);
    rect(g, '#141034', 0, 190, 512, 98);
    g.fillStyle = '#7ee0ff';
    poly(g, [236, 190, 276, 190, 380, 288, 132, 288]);
    rect(g, '#141034', 250, 200, 12, 18);
    g.fillRect(246, 236, 20, 30);
    rect(g, '#9ae6a0', 16, 14, 120, 12);
    rect(g, '#ffffff', 16, 32, 70, 8);
    g.fillRect(420, 14, 76, 12);
  },
  terminal(g) {
    rect(g, '#9ae6a0', 14, 16, 150, 10);
    for (let i = 0; i < 10; i++) {
      const c = i % 4 === 3 ? '#9ae6a0' : i % 4 === 1 ? '#7ee0ff' : '#8b97b8';
      rect(g, c, 14, 40 + i * 23, 120 + ((i * 71) % 300), 9);
    }
    rect(g, '#ffffff', 14, 270, 12, 12);
  },
};

/** What a monitor shows when nothing live runs on it: an editor, a terminal or a game, drawn as coloured shapes. */
export function screenTexture(kind: ScreenKind): CanvasTexture {
  const c = canvas(512, 288);
  const g = ctx2d(c);
  rect(g, '#0e1524', 0, 0, 512, 288);
  PAINT[kind](g);
  return screenFilter(screenCanvasTexture(c));
}

/** The sea: one 64 px closed-cell caustic net in four colours, tiling on all sides. */
export function seaTile(pal: readonly [number, number, number, number], seed: number): CanvasTexture {
  const N = 64;
  const c = canvas(N);
  const g = ctx2d(c);
  const img = g.createImageData(N, N);
  let s = seed;
  const rnd = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const pts: [number, number][] = [];
  for (let i = 0; i < 7; i++) pts.push([rnd() * N, rnd() * N]); // few, big cells: chunky Crash water
  const P = pal.map((h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255] as const);
  const ds = new Float64Array(pts.length);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      pts.forEach(([px, py], k) => {
        let best = 1e9;
        for (let ox = -1; ox <= 1; ox++)
          for (let oy = -1; oy <= 1; oy++) {
            const dx = x + 0.5 - px - ox * N;
            const dy = y + 0.5 - py - oy * N;
            best = Math.min(best, dx * dx + dy * dy);
          }
        ds[k] = Math.sqrt(best);
      });
      ds.sort();
      const d0 = ds[0] ?? 0;
      const e = (ds[1] ?? 0) - d0;
      const col = (e < 2.0 ? ((ds[2] ?? 0) - d0 < 4.5 ? P[3] : P[2]) : e < 4.5 ? P[1] : P[0]) ?? [0, 0, 0];
      const o = (y * N + x) * 4;
      img.data[o] = col[0];
      img.data[o + 1] = col[1];
      img.data[o + 2] = col[2];
      img.data[o + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = nearest(new CanvasTexture(c));
  t.wrapS = t.wrapT = RepeatWrapping;
  t.encoding = sRGBEncoding;
  return t;
}

/** White pixels at 0..1 opacity, nearest filtered: the PS1 way to draw a soft light (hard steps, no bloom). */
function stepTexture(N: number, alpha: (x: number, y: number) => number): CanvasTexture {
  const c = canvas(N);
  const g = ctx2d(c);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const a = alpha(x + 0.5, y + 0.5);
      if (a > 0) {
        g.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        g.fillRect(x, y, 1, 1);
      }
    }
  return nearest(new CanvasTexture(c));
}

/** A ring around a screen in four hard steps, empty over the glass so the picture is never tinted. */
export function haloTexture(): CanvasTexture {
  const N = 64;
  const m = N * 0.1;
  return stepTexture(N, (x, y) => {
    const ex = Math.max(m - x, 0, x - (N - m));
    const ey = Math.max(m - y, 0, y - (N - m));
    const r = Math.hypot(ex, ey) / m;
    const step = r > 0 ? Math.max(0, Math.ceil((1 - r) * 4)) / 4 : 0;
    return step * 0.9;
  });
}

/** A round light pool in four hard radial steps. */
export function poolTexture(): CanvasTexture {
  const N = 32;
  return stepTexture(N, (x, y) => {
    const r = Math.hypot((x / N) * 2 - 1, (y / N) * 2 - 1);
    return Math.max(0, Math.ceil((1 - r) * 4)) / 4;
  });
}

/** A small 1-bit picture (rows of '1' and '0'), white, nearest filtered. */
export function bitmapTexture(size: number, rows: readonly string[]): CanvasTexture {
  const c = canvas(size);
  const g = ctx2d(c);
  g.fillStyle = '#ffffff';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '1') g.fillRect(x, y, 1, 1);
  });
  return nearest(new CanvasTexture(c));
}
