import { describe, expect, it } from 'vitest';
import { bresenham, flipHorizontal, floodFill, hexToRgb, invertColors, rgbToHex, shapeBox } from './paint-raster';

/** A W x H white image with black pixels at the given points. */
function image(W: number, H: number, black: [number, number][] = []): Uint8ClampedArray {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  for (const [x, y] of black) d.set([0, 0, 0, 255], (y * W + x) * 4);
  return d;
}
const px = (d: Uint8ClampedArray, W: number, x: number, y: number): number[] => [
  ...d.slice((y * W + x) * 4, (y * W + x) * 4 + 4),
];

describe('paint raster', () => {
  it('converts colours', () => {
    expect(hexToRgb('#ff8040')).toEqual([255, 128, 64]);
    expect(rgbToHex(255, 128, 4)).toBe('#ff8004');
  });

  it('draws a crisp 1 px line', () => {
    const pts: string[] = [];
    bresenham(0, 0, 4, 2, (x, y) => pts.push(`${String(x)},${String(y)}`));
    expect(pts).toEqual(['0,0', '1,1', '2,1', '3,2', '4,2']);
    const one: string[] = [];
    bresenham(3, 3, 3, 3, (x, y) => one.push(`${String(x)},${String(y)}`));
    expect(one).toEqual(['3,3']);
  });

  it('fills a closed region and stops at its border', () => {
    // a 5x5 image with a vertical wall at x = 2
    const W = 5;
    const d = image(
      W,
      5,
      [0, 1, 2, 3, 4].map((y) => [2, y] as [number, number]),
    );
    expect(floodFill(d, W, 5, 0, 0, '#ff0000')).toBe(true);
    expect(px(d, W, 1, 4)).toEqual([255, 0, 0, 255]);
    expect(px(d, W, 2, 2)).toEqual([0, 0, 0, 255]);
    expect(px(d, W, 3, 0)).toEqual([255, 255, 255, 255]);
    expect(floodFill(d, W, 5, 0, 0, '#ff0000')).toBe(false);
  });

  it('flips and inverts', () => {
    const W = 3;
    const d = image(W, 1, [[0, 0]]);
    const out = new Uint8ClampedArray(d.length);
    flipHorizontal(d, out, W, 1);
    expect(px(out, W, 2, 0)).toEqual([0, 0, 0, 255]);
    expect(px(out, W, 0, 0)).toEqual([255, 255, 255, 255]);
    invertColors(out);
    expect(px(out, W, 2, 0)).toEqual([255, 255, 255, 255]);
    expect(px(out, W, 0, 0)).toEqual([0, 0, 0, 255]);
  });

  it('boxes shapes, squaring them with Shift', () => {
    expect(shapeBox({ x: 10, y: 10 }, { x: 4, y: 30 }, false)).toEqual({ x: 4.5, y: 10.5, w: 6, h: 20 });
    expect(shapeBox({ x: 10, y: 10 }, { x: 4, y: 30 }, true)).toEqual({ x: -9.5, y: 10.5, w: 20, h: 20 });
  });
});
