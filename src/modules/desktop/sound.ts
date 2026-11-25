// The desktop's sounds: original motifs synthesised with WebAudio, nothing is downloaded.
import { isMuted } from '../../store/sound';
import { now } from './dom';
import { S } from './store/state';

export type SoundName =
  | 'click'
  | 'tick'
  | 'open'
  | 'close'
  | 'minimize'
  | 'maximize'
  | 'error'
  | 'notify'
  | 'start'
  | 'shutdown'
  | 'recycle'
  | 'crtOn';

interface OscOpts {
  glide?: number;
  glideT?: number;
  detune?: number;
  lp?: number;
  lpTo?: number;
  pan?: number;
  delay?: boolean;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let delayBus: DelayNode | null = null;
let unlocked = false;
let voices = 0;
let noiseBuf: AudioBuffer | null = null;
const last = new Map<string, number>();

const level = (): number => (isMuted() ? 0 : (0.22 * S.prefs.volume) / 0.8);

function init(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = level();
  master.connect(comp);
  comp.connect(ctx.destination);
  // a simple feedback delay for the long motifs
  const dl = ctx.createDelay(1);
  const fb = ctx.createGain();
  const wet = ctx.createGain();
  dl.delayTime.value = 0.26;
  fb.gain.value = 0.28;
  wet.gain.value = 0.2;
  dl.connect(fb);
  fb.connect(dl);
  dl.connect(wet);
  wet.connect(master);
  delayBus = dl;
  return ctx;
}

/** Called on the first user gesture: browsers only start audio from one. */
export function unlockSound(): void {
  const c = init();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  unlocked = true;
}

export function setSoundLevel(): void {
  S.opts?.onVolumeChange?.(S.prefs.volume); // the host's music follows the tray's slider (mute is a shared switch)
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(level(), ctx.currentTime, 0.01);
}

/** The voices below only run once init() has made the context, the master bus and the delay. */
function bus(): { c: AudioContext; m: GainNode; dl: DelayNode } {
  if (!ctx || !master || !delayBus) throw new Error('audio not ready');
  return { c: ctx, m: master, dl: delayBus };
}

function env(g: GainNode, t: number, a: number, peak: number, dec: number): void {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

function out(node: AudioNode, pan?: number, toDelay?: boolean): void {
  const { c, m, dl } = bus();
  if (pan) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    node.connect(p);
    p.connect(m);
    if (toDelay) p.connect(dl);
    return;
  }
  node.connect(m);
  if (toDelay) node.connect(dl);
}

function osc(
  type: OscillatorType,
  f: number,
  t: number,
  a: number,
  peak: number,
  dec: number,
  opt: OscOpts = {},
): void {
  const { c } = bus();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (opt.glide) o.frequency.exponentialRampToValueAtTime(opt.glide, t + (opt.glideT ?? dec));
  if (opt.detune) o.detune.value = opt.detune;
  env(g, t, a, peak, dec);
  let node: AudioNode = g;
  o.connect(g);
  if (opt.lp) {
    const f2 = c.createBiquadFilter();
    f2.type = 'lowpass';
    f2.frequency.setValueAtTime(opt.lp, t);
    if (opt.lpTo) f2.frequency.exponentialRampToValueAtTime(opt.lpTo, t + a + dec);
    g.connect(f2);
    node = f2;
  }
  out(node, opt.pan, opt.delay);
  o.start(t);
  o.stop(t + a + dec + 0.05);
  voices++;
  o.onended = () => {
    voices--;
  };
}

function bell(f: number, t: number, peak: number, dec: number, opt: OscOpts = {}): void {
  osc('sine', f, t, 0.004, peak, dec, opt);
  osc('sine', f * 2.01, t, 0.004, peak * 0.35, dec * 0.7, opt);
  osc('sine', f * 3, t, 0.004, peak * 0.12, dec * 0.5, opt);
}

function pad(fs: number[], t: number, attack: number, hold: number, rel: number, peak: number, sweep?: number): void {
  const { c } = bus();
  for (const f of fs) {
    for (const dt of [-6, 6]) {
      const o = c.createOscillator();
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = dt;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1800, t);
      if (sweep) lp.frequency.exponentialRampToValueAtTime(sweep, t + attack + hold + rel);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak / fs.length, t + attack);
      g.gain.setValueAtTime(peak / fs.length, t + attack + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + rel);
      o.connect(lp);
      lp.connect(g);
      out(g, 0, true);
      o.start(t);
      o.stop(t + attack + hold + rel + 0.1);
    }
  }
}

function noise(t: number, dur: number, peak: number, type: BiquadFilterType, f: number, q: number, fTo?: number): void {
  const { c } = bus();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  const bp = c.createBiquadFilter();
  const g = c.createGain();
  s.buffer = noiseBuf;
  bp.type = type;
  bp.frequency.setValueAtTime(f, t);
  if (fTo) bp.frequency.exponentialRampToValueAtTime(fTo, t + dur);
  bp.Q.value = q;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + Math.min(0.004, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp);
  bp.connect(g);
  out(g);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

const SOUNDS: Record<SoundName, (t: number) => void> = {
  click: (t) => {
    osc('sine', 1250, t, 0.002, 0.35, 0.026, { glide: 800 });
    noise(t, 0.006, 0.08, 'bandpass', 3500, 1.2);
  },
  tick: (t) => {
    noise(t, 0.004, 0.04, 'highpass', 4000, 0.7);
  },
  open: (t) => {
    bell(880, t, 0.28, 0.095);
    bell(1174.7, t + 0.055, 0.32, 0.095);
  },
  close: (t) => {
    bell(1174.7, t, 0.28, 0.095);
    bell(880, t + 0.055, 0.24, 0.095, { lp: 2500 });
  },
  minimize: (t) => {
    osc('triangle', 700, t, 0.005, 0.26, 0.185, { glide: 330, glideT: 0.17 });
    osc('sine', 1400, t, 0.005, 0.06, 0.185, { glide: 660, glideT: 0.17 });
  },
  maximize: (t) => {
    osc('triangle', 330, t, 0.005, 0.26, 0.185, { glide: 740, glideT: 0.17 });
    bell(1174.7, t + 0.17, 0.12, 0.03);
  },
  error: (t) => {
    for (const dt of [0, 0.14]) {
      osc('square', 246.9, t + dt, 0.003, 0.22, 0.12, { lp: 900 });
      osc('square', 349.2, t + dt, 0.003, 0.22, 0.12, { lp: 900 });
    }
    osc('sine', 123.5, t, 0.005, 0.18, 0.2);
  },
  notify: (t) => {
    bell(740, t, 0.25, 0.18, { pan: -0.3 });
    bell(987.8, t + 0.11, 0.3, 0.3, { pan: 0.3 });
  },
  start: (t) => {
    pad([146.8, 220, 370], t, 0.6, 1.1, 0.9, 0.16);
    for (const [f, dt, peak] of [
      [587.3, 0.1, 0.22],
      [880, 0.34, 0.24],
      [1318.5, 0.58, 0.26],
      [1480, 0.86, 0.28],
    ] as const)
      bell(f, t + dt, peak, 0.55, { delay: true });
    bell(1760, t + 1.2, 0.3, 1.2, { delay: true });
    noise(t, 1, 0.02, 'bandpass', 5000, 0.8);
  },
  shutdown: (t) => {
    pad([123.5, 185, 293.7], t, 0.3, 0.6, 0.9, 0.16, 400);
    const notes = [
      [1480, 0, 0.28],
      [1318.5, 0.22, 0.25],
      [880, 0.46, 0.22],
      [587.3, 0.74, 0.2],
    ] as const;
    notes.forEach(([f, dt, peak], i) => {
      bell(f, t + dt, peak, i === 3 ? 1 : 0.45, { delay: true });
    });
  },
  recycle: (t) => {
    for (let i = 0; i < 5; i++)
      noise(
        t + i * 0.06 + Math.random() * 0.02,
        0.02 + Math.random() * 0.025,
        0.05 + Math.random() * 0.25,
        'bandpass',
        2200 - i * 300,
        0.9,
      );
    osc('sine', 150, t + 0.3, 0.005, 0.3, 0.09, { glide: 70 });
  },
  crtOn: (t) => {
    osc('sine', 60, t, 0.02, 0.08, 0.3);
    osc('sine', 12000, t, 0.01, 0.015, 0.3, { glide: 200 });
  },
};

/** Plays a sound; a muted desktop or audio not yet unlocked play nothing. */
export function sound(name: SoundName): void {
  if (!unlocked || !ctx || isMuted()) return;
  const n = now();
  const prev = last.get(name);
  if (prev && n - prev < 60) return;
  last.set(name, n);
  if (voices > 40) return;
  if (ctx.state === 'suspended') void ctx.resume();
  try {
    SOUNDS[name](ctx.currentTime + 0.01);
  } catch (e) {
    console.debug(`XP sound "${name}" failed to schedule`, e);
  }
}

const isSound = (n: string): n is SoundName => Object.hasOwn(SOUNDS, n);

/** The apps' and the host's entry (XPAppApi.sound, XPDesktop.sound): names come as strings, unknown ones are silent. */
export function soundByName(name: string): void {
  if (isSound(name)) sound(name);
}
