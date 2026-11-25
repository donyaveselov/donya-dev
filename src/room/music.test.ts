import { describe, expect, it } from 'vitest';
import { audibleSpan } from './music';

describe('the music loop', () => {
  it('cuts an encoder silence off both ends', () => {
    const d = new Float32Array([0, 0, 0.0004, 0.2, -0.3, 0.1, 0, 0]);
    expect(audibleSpan(d)).toEqual([3, 6]);
  });
  it('keeps a loop that is sound from the first sample to the last', () => {
    const d = new Float32Array([0.013, 0.2, -0.1, 0.022]);
    expect(audibleSpan(d)).toEqual([0, 4]);
  });
});
