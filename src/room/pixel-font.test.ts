import { describe, expect, it } from 'vitest';
import { GLYPHS, pixTextPixels, pixTextWidth } from './pixel-font';

describe('pixel font', () => {
  it('has every letter of the frame titles, five rows each', () => {
    for (const word of ['РЕЗЮМЕ', 'ДИПЛОМ', 'RESUME', 'DIPLOMA'])
      for (const ch of word) {
        expect(GLYPHS[ch], ch).toBeDefined();
        expect(GLYPHS[ch]?.length).toBe(5);
      }
  });
  it('measures glyphs with one pixel between them', () => {
    expect(pixTextWidth('I')).toBe(3);
    expect(pixTextWidth('II')).toBe(7);
    expect(pixTextWidth('RESUME')).toBe(4 + 4 + 4 + 4 + 5 + 4 + 5);
  });
  it('centres the text and lights the glyph pixels', () => {
    const px = pixTextPixels('I', 20, 3);
    // I is 3 wide: x from 19 to 21; top row ### and a middle column
    expect(px).toContainEqual([19, 3]);
    expect(px).toContainEqual([21, 3]);
    expect(px).toContainEqual([20, 5]);
    expect(px).not.toContainEqual([19, 5]);
    expect(px.length).toBe(3 + 1 + 1 + 1 + 3);
  });
});
