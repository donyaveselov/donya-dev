import { describe, expect, it } from 'vitest';
import {
  arrangeRect,
  cascadePos,
  cellXY,
  centerIn,
  dragPos,
  fitSize,
  gridCols,
  gridRows,
  iconInDirection,
  keepReachable,
  menuPos,
  nearestFreeCell,
  nextByLetter,
  nextEnabled,
  placeIcons,
  placeRect,
  requestedRect,
  resizeRect,
} from './layout';

const desk = { w: 1280, h: 770 };

describe('window geometry', () => {
  it('fits a new window into the work area', () => {
    expect(fitSize(desk, 560, 400, false)).toEqual({ w: 560, h: 400 });
    expect(fitSize({ w: 500, h: 300 }, 560, 400, false)).toEqual({ w: 492, h: 292 });
    expect(fitSize({ w: 500, h: 300 }, 560, 400, true)).toEqual({ w: 476, h: 292 });
  });

  it('cascades new windows and wraps around', () => {
    expect(cascadePos(desk, 560, 400, 0, false)).toEqual({ x: 110, y: 24 });
    expect(cascadePos(desk, 560, 400, 2, false)).toEqual({ x: 154, y: 68 });
    // (770 - 400) / 22 = 16 steps fit, so the 17th window starts over
    expect(cascadePos(desk, 560, 400, 17, false)).toEqual({ x: 110, y: 24 });
    // narrow and short desktops start closer to the corner, with a smaller step when compact
    expect(cascadePos({ w: 600, h: 450 }, 300, 200, 1, true)).toEqual({ x: 26, y: 24 });
  });

  it('centres and keeps a window inside the work area', () => {
    expect(centerIn({ x: 100, y: 100, w: 400, h: 300 }, 200, 100)).toEqual({ x: 200, y: 200 });
    expect(placeRect(desk, -50, 900.6, 300, 200)).toEqual({ x: 0, y: 570, w: 300, h: 200 });
    expect(placeRect({ w: 200, h: 100 }, 50, 50, 300, 200)).toEqual({ x: 0, y: 0, w: 300, h: 200 });
  });

  it('drags by the title bar without losing the window', () => {
    expect(dragPos(desk, 400, 100.4, 50.6)).toEqual({ x: 100, y: 51 });
    expect(dragPos(desk, 400, -1000, -20)).toEqual({ x: -360, y: 0 });
    expect(dragPos(desk, 400, 5000, 5000)).toEqual({ x: 1240, y: 742 });
  });

  it('resizes from each edge and corner, not below the minimum', () => {
    const r0 = { x: 100, y: 100, w: 400, h: 300 };
    const min = { w: 200, h: 120 };
    expect(resizeRect(r0, 'e', 50, 0, min, desk)).toEqual({ x: 100, y: 100, w: 450, h: 300 });
    expect(resizeRect(r0, 's', 0, -500, min, desk)).toEqual({ x: 100, y: 100, w: 400, h: 120 });
    expect(resizeRect(r0, 'w', -30, 0, min, desk)).toEqual({ x: 70, y: 100, w: 430, h: 300 });
    expect(resizeRect(r0, 'nw', 300, 250, min, desk)).toEqual({ x: 300, y: 280, w: 200, h: 120 });
    expect(resizeRect(r0, 'n', 0, -500, min, desk)).toEqual({ x: 100, y: 0, w: 400, h: 400 });
    expect(resizeRect(r0, 'se', 10.6, 10.4, min, desk)).toEqual({ x: 100, y: 100, w: 411, h: 310 });
  });

  it('keeps windows reachable when the desktop shrinks', () => {
    expect(keepReachable({ x: 1200, y: 700, w: 900, h: 900 }, { w: 800, h: 600 })).toEqual({
      x: 760,
      y: 572,
      w: 800,
      h: 600,
    });
  });

  it('honours an app resize request inside the work area', () => {
    expect(requestedRect({ x: 1000, y: 600, w: 200, h: 100 }, 400, 300, { w: 200, h: 120 }, desk)).toEqual({
      x: 880,
      y: 470,
      w: 400,
      h: 300,
    });
    expect(requestedRect({ x: 0, y: 0, w: 200, h: 100 }, 50, 50, { w: 200, h: 120 }, desk)).toMatchObject({
      w: 200,
      h: 120,
    });
  });

  it('cascades and tiles from the taskbar menu', () => {
    const r = { x: 0, y: 0, w: 500, h: 400 };
    const min = { w: 200, h: 120 };
    expect(arrangeRect('cascade', 2, 3, r, min, desk)).toEqual({ x: 72, y: 72, w: 500, h: 400 });
    expect(arrangeRect('h', 1, 3, r, min, { w: 1200, h: 600 })).toEqual({ x: 0, y: 200, w: 1200, h: 200 });
    expect(arrangeRect('v', 2, 3, r, min, { w: 1200, h: 600 })).toEqual({ x: 800, y: 0, w: 400, h: 600 });
    expect(arrangeRect('h', 0, 10, r, min, { w: 1200, h: 600 })).toMatchObject({ h: 120 });
  });
});

describe('desktop icon grid', () => {
  it('measures the grid', () => {
    expect(gridRows(desk, false)).toBe(9);
    expect(gridCols(desk, false)).toBe(16);
    expect(gridRows({ w: 390, h: 760 }, true)).toBe(8);
    expect(cellXY([1, 2], false)).toEqual({ x: 81, y: 168 });
    expect(cellXY([0, 0], true)).toEqual({ x: 6, y: 4 });
  });

  it('places icons column by column, honouring saved cells that still fit', () => {
    const pos = placeIcons(['a', 'b', 'c', 'd'], { b: [0, 0], c: [3, 9], d: [0, 0] }, 2, 4);
    expect([...pos]).toEqual([
      ['b', [0, 0]],
      ['a', [0, 1]],
      ['c', [1, 0]],
      ['d', [1, 1]],
    ]);
    expect([...placeIcons(['a', 'b', 'c'], null, 2, 4).values()]).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
  });

  it('snaps a dropped icon to the nearest free cell', () => {
    const taken = new Set(['0,0', '1,0']);
    expect(nearestFreeCell(80, 10, taken, 9, 16, false)).toEqual([2, 0]); // a column is narrower than a row is tall
    expect(nearestFreeCell(400, 300, taken, 9, 16, false)).toEqual([5, 4]);
    expect(nearestFreeCell(0, 0, new Set(['0,0']), 1, 1, false)).toBeNull();
  });

  it('moves the focus between icons with the arrow keys', () => {
    const others = [
      ['b', [0, 1]],
      ['c', [1, 0]],
      ['d', [1, 3]],
    ] as const;
    expect(
      iconInDirection(
        [0, 0],
        [0, 1],
        others.map(([id, c]) => [id, [c[0], c[1]]]),
      ),
    ).toBe('b');
    expect(
      iconInDirection(
        [0, 0],
        [1, 0],
        others.map(([id, c]) => [id, [c[0], c[1]]]),
      ),
    ).toBe('c');
    expect(
      iconInDirection(
        [0, 0],
        [-1, 0],
        others.map(([id, c]) => [id, [c[0], c[1]]]),
      ),
    ).toBeNull();
  });
});

describe('menus', () => {
  it('opens where clicked, flipping at the edges', () => {
    expect(menuPos(desk, 200, 300, 100, 100, {})).toEqual({ x: 100, y: 100 });
    expect(menuPos(desk, 200, 300, 1200, 600, {})).toEqual({ x: 1000, y: 300 });
    expect(menuPos(desk, 200, 300, 100, 600, { up: true })).toEqual({ x: 100, y: 470 });
  });

  it('opens a submenu beside its row, or on the other side', () => {
    const anchor = { x: 100, y: 200, w: 180, h: 22 };
    expect(menuPos(desk, 200, 100, 0, 0, { anchor })).toEqual({ x: 277, y: 197 });
    expect(menuPos(desk, 200, 100, 0, 0, { anchor: { ...anchor, x: 1150 } })).toEqual({ x: 953, y: 197 });
    expect(menuPos(desk, 200, 100, 0, 0, { anchor, alignBottom: true })).toEqual({ x: 277, y: 125 });
  });

  it('steps over disabled rows and wraps', () => {
    expect(nextEnabled([true, false, true], -1, 1)).toBe(0);
    expect(nextEnabled([true, false, true], 0, 1)).toBe(2);
    expect(nextEnabled([true, false, true], 0, -1)).toBe(2);
    expect(nextEnabled([false, false], 0, 1)).toBe(-1);
  });

  it('jumps to the next row starting with a typed letter', () => {
    const labels = ['Open', null, 'Options', 'Close'];
    expect(nextByLetter(labels, -1, 'o')).toBe(0);
    expect(nextByLetter(labels, 0, 'o')).toBe(2);
    expect(nextByLetter(labels, 2, 'o')).toBe(0);
    expect(nextByLetter(labels, 0, 'x')).toBe(-1);
  });
});
