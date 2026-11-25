// The floating Windows XD logo on the monitors while the owner sleeps or is out; the desktop's own saver picks up
// where it is (XPMountOptions.saverPos), so the logo never jumps when one takes over from the other.
import { SAVER_LOGO, SAVER_SCREEN } from '../../../enums/saver';

/** The logo's free travel: the screen minus the logo's own box. */
const SPAN_X = SAVER_SCREEN.w - SAVER_LOGO.w;
const SPAN_Y = SAVER_SCREEN.h - SAVER_LOGO.h;

/** Bounces x between 0 and span. */
export function bounce(x: number, span: number): number {
  const m = ((x % (2 * span)) + 2 * span) % (2 * span);
  return m < span ? m : 2 * span - m;
}

export interface SaverPos {
  u: number;
  v: number;
}

/**
 * Where the floating logo is at time t, as a 0..1 share of its free travel: the monitor in the room and the screen
 * saver inside the desktop both read this, so the logo is in the same place when one takes over from the other.
 */
export function saverPos(t: number, out: SaverPos = { u: 0, v: 0 }): SaverPos {
  out.u = bounce(40 + t * 46, SPAN_X) / SPAN_X;
  out.v = bounce(25 + t * 31, SPAN_Y) / SPAN_Y;
  return out;
}
