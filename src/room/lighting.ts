// The light of the room and the sky in the window for an hour and a status (CRASH.md §3, §5). Pure colour maths: the
// scene side (lights, materials) is in light-rig.ts.
import { Color } from 'three';
import type { Status } from '../shared/types';

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
/** Smoothstep from a to b. */
export function smooth(a: number, b: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}
/** Linear 0..1 ramp from a to b. */
export const ramp = (a: number, b: number, x: number): number => Math.max(0, Math.min(1, (x - a) / (b - a)));

/** A colour given in sRGB hex, in the renderer's linear space. */
export const linear = (hex: number): Color => new Color(hex).convertSRGBToLinear();

const ca = new Color();
const cb = new Color();
/** Blends two sRGB hex colours the way three's Color does (getHex truncates, it does not round). */
export function mixHex(a: number, b: number, k: number): number {
  return ca.setHex(a).lerp(cb.setHex(b), k).getHex();
}

/** The page behind the room, per state (CRASH.md §1): top, bottom. White labels keep >= 4.5:1 on every one of them. */
export const BACKDROP: Record<Status, readonly [string, string]> = {
  work: ['#0B3B4A', '#1C7A78'],
  play: ['#241B52', '#8A3A4A'],
  sleep: ['#050B24', '#10245A'],
  outside: ['#0A4A6E', '#18807E'],
};

export interface SkyFactors {
  /** 0 night .. 1 day */
  day: number;
  /** 0 .. 1 around sunrise and sunset */
  dusk: number;
}

/** Daylight and dusk for an hour (0..24); asleep means night, whatever the clock says: no sun over a sleeping room. */
export function skyFactors(hour: number, asleep: boolean): SkyFactors {
  if (asleep) return { day: 0, dusk: 0 };
  return {
    day: smooth(5.6, 7.2, hour) * (1 - smooth(17.6, 19.2, hour)),
    dusk: Math.min(1, Math.max(0, 1 - Math.abs(hour - 18.3) / 1.3, 1 - Math.abs(hour - 6.3) / 1.0)),
  };
}

/** The evening lamps (0) .. daylight (1): the lamps are fully on by sunset, not only at night. */
export const lampsOff = (hour: number): number => smooth(6, 7.5, hour) * (1 - smooth(16.4, 17.7, hour));

/** The sky in the window: saturated blue by day, purple-to-orange at dusk, a readable blue night, grey when overcast. */
export function skyColours(sky: SkyFactors, overcast: number, top: Color, low: Color): void {
  top
    .setHex(0x0b1650)
    .lerp(cb.setHex(0x1e8fe8), sky.day)
    .lerp(cb.setHex(0x6a2fa0), sky.dusk * 0.7);
  low
    .setHex(0x27408f)
    .lerp(cb.setHex(0xa8e6ff), sky.day)
    .lerp(cb.setHex(0xff9a3c), sky.dusk * 0.9);
  top.lerp(ca.setHex(0x0a1028).lerp(cb.setHex(0x4e5d74), sky.day), overcast * 0.85);
  low.lerp(ca.setHex(0x1e2846).lerp(cb.setHex(0x8e9baa), sky.day), overcast * 0.85);
}

/** One light set: hex colours are sRGB, as the presets were tuned; intensities are three's. */
export interface LightPreset {
  sky: number;
  gnd: number;
  hemi: number;
  keyCol: number;
  key: number;
  lamps: readonly [number, number];
  lampCol: number;
  lampDist: number;
  glow: number;
  scr: number;
  win: number;
  /** null: the window fill takes the sky's low colour */
  winCol: number | null;
}

// Lambert gives albedo x (hemi + lights) in linear space, so the sums stay well under 1 or the walls clip to lemon and
// the plank tones vanish; the lights add hue. Work is golden and even, play two orange lamp pools in a violet-blue
// room, asleep saturated blue from the monitors.
const PLAY: LightPreset = {
  sky: 0x5a6af0,
  gnd: 0x4a2a7a,
  hemi: 0.42,
  keyCol: 0xb0a0ff,
  key: 0.1,
  lamps: [2.0, 1.8],
  lampCol: 0xff9a3c,
  lampDist: 3.5,
  glow: 1.6,
  scr: 0.9,
  win: 0,
  winCol: null,
};
const SLEEP: LightPreset = {
  sky: 0x2038ff,
  gnd: 0x0c1470,
  hemi: 0.45,
  keyCol: 0x6f8cff,
  key: 0.03,
  lamps: [0, 0],
  lampCol: 0xffb24a,
  lampDist: 4.5,
  glow: 0,
  scr: 6.0, // the screens are the only light: a blue pool on the floor
  win: 0.15,
  winCol: 0x3a66ff,
};

/**
 * The room's own light follows the clock, whatever the owner does: by day the even golden "work" light, in the
 * evening and at night the lamp-lit "play" look, blended through dusk and dawn. Asleep, the lights are off and only
 * the monitors glow.
 */
export function roomLight(status: Status, hour: number, day: number): LightPreset {
  if (status === 'sleep') return SLEEP;
  const k = lampsOff(hour);
  return {
    sky: mixHex(PLAY.sky, 0xfff4dc, k),
    gnd: mixHex(PLAY.gnd, 0xd9a070, k),
    hemi: lerp(PLAY.hemi, 0.66, k),
    keyCol: mixHex(PLAY.keyCol, 0xfff0d0, k),
    key: lerp(PLAY.key, 0.14, k),
    lamps: [lerp(PLAY.lamps[0], 0.55, k), lerp(PLAY.lamps[1], 0.5, k)],
    lampCol: mixHex(PLAY.lampCol, 0xffb24a, k),
    lampDist: lerp(PLAY.lampDist, 4.5, k),
    glow: lerp(PLAY.glow, 0.8, k),
    scr: lerp(PLAY.scr, 0.35, k),
    win: lerp(PLAY.win, 0.15 * day, k),
    winCol: null,
  };
}

/** What the screens throw into the room, tinted by what is on them (deep blue asleep: orange planks swallow a pale tint). */
export function screenTint(status: Status, game: 'dota' | 'cs' | 'other'): number {
  if (status === 'play') return { dota: 0x7dffa0, cs: 0xffd9a0, other: 0xff9ad0 }[game];
  return status === 'sleep' ? 0x4f7cff : 0xbfe0ff;
}
