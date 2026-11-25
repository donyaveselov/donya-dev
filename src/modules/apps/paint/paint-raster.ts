// Paint's pixel algorithms, on plain RGBA buffers (unit-tested in paint.test.ts).

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** The pixels of a 1 px line from a to b (Bresenham), for the crisp pencil. */
export function bresenham(x0: number, y0: number, x1: number, y1: number, plot: (x: number, y: number) => void): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    plot(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Scanline flood fill of the region of (px, py)'s colour with an opaque colour, in place. Returns false when the
 * region already has that colour.
 */
export function floodFill(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  px: number,
  py: number,
  color: string,
): boolean {
  const i0 = (py * W + px) * 4;
  const tr = data[i0];
  const tg = data[i0 + 1];
  const tb = data[i0 + 2];
  const ta = data[i0 + 3];
  const [r, g, b] = hexToRgb(color);
  if (tr === r && tg === g && tb === b && ta === 255) return false;
  const match = (i: number): boolean =>
    data[i] === tr && data[i + 1] === tg && data[i + 2] === tb && data[i + 3] === ta;
  const stack: [number, number][] = [[px, py]];
  for (let q = stack.pop(); q; q = stack.pop()) {
    let [x] = q;
    const y = q[1];
    let i = (y * W + x) * 4;
    while (x >= 0 && match(i)) {
      x--;
      i -= 4;
    }
    x++;
    i += 4;
    let up = false;
    let dn = false;
    while (x < W && match(i)) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
      if (y > 0) {
        if (match(i - W * 4)) {
          if (!up) {
            stack.push([x, y - 1]);
            up = true;
          }
        } else up = false;
      }
      if (y < H - 1) {
        if (match(i + W * 4)) {
          if (!dn) {
            stack.push([x, y + 1]);
            dn = true;
          }
        } else dn = false;
      }
      x++;
      i += 4;
    }
  }
  return true;
}

/** Mirrors an RGBA buffer left to right into `out`. */
export function flipHorizontal(src: Uint8ClampedArray, out: Uint8ClampedArray, W: number, H: number): void {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const s = (y * W + x) * 4;
      const d = (y * W + (W - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) out[d + k] = src[s + k] ?? 0;
    }
}

/** Inverts the colours of an RGBA buffer in place (alpha stays). */
export function invertColors(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - (data[i] ?? 0);
    data[i + 1] = 255 - (data[i + 1] ?? 0);
    data[i + 2] = 255 - (data[i + 2] ?? 0);
  }
}

/** The box of a shape dragged from a to b (half-pixel aligned); with Shift, a square / circle. */
export function shapeBox(
  a: { x: number; y: number },
  b: { x: number; y: number },
  square: boolean,
): { x: number; y: number; w: number; h: number } {
  let x = Math.min(a.x, b.x) + 0.5;
  let y = Math.min(a.y, b.y) + 0.5;
  let w = Math.abs(b.x - a.x);
  let h = Math.abs(b.y - a.y);
  if (square) {
    const m = Math.max(w, h);
    w = h = m;
    if (b.x < a.x) x = a.x - m + 0.5;
    if (b.y < a.y) y = a.y - m + 0.5;
  }
  return { x, y, w, h };
}
