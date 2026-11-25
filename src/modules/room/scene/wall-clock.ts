// The wall clock runs: hours and minutes from the Phuket clock (or the preview), the colon blinking with the seconds.
// Seven-segment digits drawn as blocks, PS1-chunky; unlit segments faintly visible, as on a real LED clock.
import { CanvasTexture, MeshBasicMaterial, sRGBEncoding } from 'three';
import type { Mesh } from 'three';
import type { PhuketTime } from '../../../types';
import { biasForward, nearest, ps1 } from './psx';
import { canvas, ctx2d } from './textures';

type Segment = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

/** The lit segments of each digit. */
export const SEGMENTS: readonly string[] = [
  'abcdef',
  'bc',
  'abged',
  'abgcd',
  'fgbc',
  'afgcd',
  'afgedc',
  'abc',
  'abcdefg',
  'abcdfg',
];

const ON = '#3CF0FF';
const OFF = 'rgba(60,240,255,0.10)';
const DW = 12;
const DH = 22;
const T = 3;

/** Segment rectangles of a digit whose left edge is at x. */
function segments(x: number): Record<Segment, [number, number, number, number]> {
  return {
    a: [x + T, 4, DW - 2 * T, T],
    b: [x + DW - T, 4 + T, T, DH / 2 - T],
    c: [x + DW - T, 4 + DH / 2 + 1, T, DH / 2 - T],
    d: [x + T, 4 + DH - T + 1, DW - 2 * T, T],
    e: [x, 4 + DH / 2 + 1, T, DH / 2 - T],
    f: [x, 4 + T, T, DH / 2 - T],
    g: [x + T, 4 + DH / 2 - 1, DW - 2 * T, T],
  };
}

export class WallClock {
  private readonly c = canvas(72, 32);
  private readonly tex: CanvasTexture;
  private key = -1;

  constructor(display: Mesh) {
    // the digital clock's face is a tiny canvas, nearest-filtered like every PS1 texture
    this.tex = nearest(new CanvasTexture(this.c));
    this.tex.encoding = sRGBEncoding;
    this.tex.flipY = false;
    const m = new MeshBasicMaterial({ map: this.tex });
    biasForward(m);
    display.material = ps1(m);
  }

  private digit(g: CanvasRenderingContext2D, x: number, n: number): void {
    const lit = SEGMENTS[n] ?? '';
    for (const [k, r] of Object.entries(segments(x))) {
      g.fillStyle = lit.includes(k) ? ON : OFF;
      g.fillRect(r[0], r[1], r[2], r[3]);
    }
  }

  /** Redraws when the minute or the blink changes. */
  tick(time: PhuketTime, nowMs: number): void {
    const odd = Math.floor(nowMs / 1000) % 2;
    const key = (time.h * 60 + time.m) * 2 + odd;
    if (key === this.key) return;
    this.key = key;
    const g = ctx2d(this.c);
    g.fillStyle = '#0A1022';
    g.fillRect(0, 0, this.c.width, this.c.height);
    const x0 = 6;
    this.digit(g, x0, Math.floor(time.h / 10));
    this.digit(g, x0 + 15, time.h % 10);
    g.fillStyle = odd ? ON : OFF; // the colon blinks every second
    g.fillRect(x0 + 30, 11, 3, 3);
    g.fillRect(x0 + 30, 19, 3, 3);
    this.digit(g, x0 + 36, Math.floor(time.m / 10));
    this.digit(g, x0 + 51, time.m % 10);
    this.tex.needsUpdate = true;
  }
}
