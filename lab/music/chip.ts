// A small NES-flavoured synthesizer on Web Audio: pulse waves (12.5 / 25 / 50 % duty), the 4-bit stepped triangle
// and LFSR noise (long and short "metallic" mode), each built from the real stepped waveform so it sounds like the
// chip and not like clean oscillators. Tracks are notes (tracks.ts): a few kilobytes, synthesized live.
//
// Voices: lead (25 % pulse, vibrato), guitar (50 % pulse, plucked, with an echo), bass (an "808" on the triangle:
// a pitch drop and a long tail, a touch of drive so laptop speakers hear it), kick (a triangle sweep), snare (noise
// plus a triangle blip), hat (short-mode noise).

export type Voice = 'lead' | 'guitar' | 'bass' | 'kick' | 'snare' | 'hat';
export const VOICES: readonly Voice[] = ['lead', 'guitar', 'bass', 'kick', 'snare', 'hat'];

/** A note: where it starts and how long it lasts in steps (16ths), its pitch (MIDI) and loudness 0..1. */
export interface Note {
  step: number;
  len: number;
  midi: number;
  vel: number;
}

export interface Section {
  name: string;
  bars: number;
  parts: Partial<Record<Voice, Note[]>>;
}

export interface Track {
  title: string;
  artist: string;
  bpm: number;
  /** steps per bar (16: a step is a 16th note) */
  steps: number;
  sections: Section[];
}

const NOTE_NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'E4' → 64, 'F#2' → 42, 'Bb3' → 58. */
export function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const [, letter = 'C', acc = '', oct = '4'] = m;
  return (Number(oct) + 1) * 12 + (NOTE_NAMES[letter] ?? 0) + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
}

export const hz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** The Fourier series of one period of a sampled waveform, as a PeriodicWave. */
function waveOf(ctx: BaseAudioContext, samples: readonly number[]): PeriodicWave {
  const n = samples.length;
  const half = n / 2;
  const real = new Float32Array(half);
  const imag = new Float32Array(half);
  for (let k = 1; k < half; k++) {
    let re = 0;
    let im = 0;
    samples.forEach((x, i) => {
      re += x * Math.cos((2 * Math.PI * k * i) / n);
      im += x * Math.sin((2 * Math.PI * k * i) / n);
    });
    real[k] = (2 / n) * re;
    imag[k] = (2 / n) * im;
  }
  return ctx.createPeriodicWave(real, imag);
}

const PERIOD = 256;

/** A pulse with the NES duty (the share of the period that is high). */
function pulse(ctx: BaseAudioContext, duty: number): PeriodicWave {
  return waveOf(
    ctx,
    Array.from({ length: PERIOD }, (_, i) => (i < duty * PERIOD ? 1 : -1)),
  );
}

/** The NES triangle: 32 steps of a 4-bit counter, 15 down to 0 and back up. */
function steppedTriangle(ctx: BaseAudioContext): PeriodicWave {
  const seq = [...Array.from({ length: 16 }, (_, i) => 15 - i), ...Array.from({ length: 16 }, (_, i) => i)];
  return waveOf(
    ctx,
    Array.from({ length: PERIOD }, (_, i) => (seq[Math.floor((i / PERIOD) * 32)] ?? 0) / 7.5 - 1),
  );
}

/** One second of the NES noise channel: a 15-bit LFSR, long mode (tap 1) or short "metallic" mode (tap 6). */
function lfsrNoise(ctx: BaseAudioContext, short: boolean, rate: number): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let reg = 1;
  const hold = Math.max(1, Math.round(ctx.sampleRate / rate));
  let v = 0;
  for (let i = 0; i < data.length; i++) {
    if (i % hold === 0) {
      const bit = (reg ^ (reg >> (short ? 6 : 1))) & 1;
      reg = (reg >> 1) | (bit << 14);
      v = reg & 1 ? -1 : 1;
    }
    data[i] = v;
  }
  return buf;
}

/** A soft clip that adds harmonics: the 808 is heard on small speakers too. */
function drive(ctx: BaseAudioContext, amount: number): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  shaper.curve = curve;
  return shaper;
}

interface Scheduled {
  step: number;
  voice: Voice;
  note: Note;
}

/** Flattens a track into notes on absolute steps, and its length in steps. */
export function flatten(track: Track): {
  events: Scheduled[];
  length: number;
  marks: { step: number; name: string }[];
} {
  const events: Scheduled[] = [];
  const marks: { step: number; name: string }[] = [];
  let at = 0;
  for (const s of track.sections) {
    marks.push({ step: at, name: s.name });
    for (const v of VOICES) for (const note of s.parts[v] ?? []) events.push({ step: at + note.step, voice: v, note });
    at += s.bars * track.steps;
  }
  events.sort((a, b) => a.step - b.step);
  return { events, length: at, marks };
}

/** the master level before the compressor */
const MASTER = 0.32;

export class ChipPlayer {
  readonly ctx: BaseAudioContext;
  readonly analyser: AnalyserNode;
  private readonly master: GainNode;
  private readonly bus: Record<Voice, GainNode>;
  private readonly echo: GainNode;
  private readonly delay: DelayNode;
  private readonly waves: { p12: PeriodicWave; p25: PeriodicWave; p50: PeriodicWave; tri: PeriodicWave };
  private readonly noise: { long: AudioBuffer; short: AudioBuffer };
  private timer = 0;
  private track: ReturnType<typeof flatten> | null = null;
  private bpm = 75;
  private steps = 16;
  private next = 0; // the next event's index
  private step = 0; // the next step to schedule
  private t0 = 0; // when step 0 of the current loop plays
  /** the section and step now playing, for the UI */
  onStep: ((step: number) => void) | null = null;

  /** A live player, or (with an OfflineAudioContext) a renderer: see render(). */
  constructor(ctx?: BaseAudioContext) {
    this.ctx = ctx ?? new AudioContext();
    const c = this.ctx;
    this.waves = { p12: pulse(c, 0.125), p25: pulse(c, 0.25), p50: pulse(c, 0.5), tri: steppedTriangle(c) };
    this.noise = { long: lfsrNoise(c, false, 22000), short: lfsrNoise(c, true, 18000) };
    const comp = c.createDynamicsCompressor();
    // background music on a web page: peaks under -1 dBFS, loudness around -16 (pulse waves are loud for their peak)
    comp.threshold.value = -20;
    comp.knee.value = 6;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    this.master = c.createGain();
    this.master.gain.value = MASTER;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 1024;
    this.master.connect(comp).connect(this.analyser).connect(c.destination);
    const bus = (): GainNode => {
      const g = c.createGain();
      g.connect(this.master);
      return g;
    };
    this.bus = { lead: bus(), guitar: bus(), bass: bus(), kick: bus(), snare: bus(), hat: bus() };
    // the guitar's echo: a dotted eighth, darker on every repeat
    this.echo = c.createGain();
    this.echo.gain.value = 0.35;
    const delay = c.createDelay(2);
    const fb = c.createGain();
    fb.gain.value = 0.38;
    const tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1700;
    this.echo.connect(delay).connect(tone).connect(fb).connect(delay);
    tone.connect(this.bus.guitar);
    this.delay = delay;
  }

  get stepDur(): number {
    return 60 / this.bpm / 4;
  }

  get playing(): boolean {
    return this.timer !== 0;
  }

  mute(v: Voice, on: boolean): void {
    this.bus[v].gain.setTargetAtTime(on ? 0 : 1, this.ctx.currentTime, 0.01);
  }

  async play(track: Track): Promise<void> {
    this.stop();
    if (this.ctx instanceof AudioContext) await this.ctx.resume();
    this.track = flatten(track);
    this.bpm = track.bpm;
    this.steps = track.steps;
    this.delay.delayTime.value = this.stepDur * 3; // a dotted eighth
    this.next = 0;
    this.step = 0;
    this.t0 = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => {
      this.schedule();
    }, 25);
    this.schedule();
  }

  stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.setValueAtTime(MASTER, this.ctx.currentTime + 0.3); // cut what is ringing, then back for next time
  }

  /** Schedules everything that starts in the next 150 ms (a look-ahead scheduler: timers jitter, audio time does not). */
  private schedule(): void {
    const tr = this.track;
    if (!tr) return;
    const horizon = this.ctx.currentTime + 0.15;
    for (;;) {
      const at = this.t0 + this.step * this.stepDur;
      if (at > horizon) break;
      // everything that starts within this step, at its exact time (triplets start between steps)
      for (; this.next < tr.events.length && (tr.events[this.next]?.step ?? Infinity) < this.step + 1; this.next++) {
        const e = tr.events[this.next];
        if (e) this.voice(e.voice, e.note, this.t0 + e.step * this.stepDur);
      }
      const s = this.step;
      window.setTimeout(() => this.onStep?.(s), Math.max(0, (at - this.ctx.currentTime) * 1000));
      this.step++;
      if (this.step >= tr.length) {
        // loop
        this.t0 += tr.length * this.stepDur;
        this.step = 0;
        this.next = 0;
      }
    }
  }

  private osc(wave: PeriodicWave, f: number, at: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.setPeriodicWave(wave);
    o.frequency.setValueAtTime(f, at);
    return o;
  }

  private voice(v: Voice, n: Note, at: number): void {
    const c = this.ctx;
    const dur = n.len * this.stepDur;
    const g = c.createGain();
    g.connect(this.bus[v]);
    const env = g.gain;
    env.setValueAtTime(0, at);
    if (v === 'lead') {
      const o = this.osc(this.waves.p25, hz(n.midi), at);
      // a slow vibrato that comes in on long notes
      const lfo = c.createOscillator();
      lfo.frequency.value = 5.5;
      const depth = c.createGain();
      depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(0, at + 0.22);
      depth.gain.linearRampToValueAtTime(14, at + 0.6);
      lfo.connect(depth).connect(o.detune);
      env.linearRampToValueAtTime(0.11 * n.vel, at + 0.006);
      env.setValueAtTime(0.11 * n.vel, at + dur - 0.03);
      env.linearRampToValueAtTime(0.0001, at + dur + 0.08);
      o.connect(g);
      o.start(at);
      lfo.start(at);
      o.stop(at + dur + 0.1);
      lfo.stop(at + dur + 0.1);
    } else if (v === 'guitar') {
      const o = this.osc(this.waves.p50, hz(n.midi), at);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3200, at);
      lp.frequency.exponentialRampToValueAtTime(900, at + 0.6);
      const ring = Math.max(dur * 2.2, 0.5);
      env.linearRampToValueAtTime(0.085 * n.vel, at + 0.003);
      env.exponentialRampToValueAtTime(0.0001, at + ring);
      o.connect(lp).connect(g);
      const send = c.createGain();
      send.gain.value = 1;
      lp.connect(send).connect(this.echo);
      o.start(at);
      o.stop(at + ring + 0.05);
    } else if (v === 'bass') {
      const f = hz(n.midi);
      const o = this.osc(this.waves.tri, f * 2.2, at);
      o.frequency.exponentialRampToValueAtTime(f, at + 0.05);
      const d = drive(c, 2.2);
      const tail = Math.max(dur, 0.3);
      env.linearRampToValueAtTime(0.42 * n.vel, at + 0.004);
      env.setTargetAtTime(0.0001, at + tail * 0.6, tail * 0.35);
      o.connect(d).connect(g);
      o.start(at);
      o.stop(at + tail * 1.8);
    } else if (v === 'kick') {
      const o = this.osc(this.waves.tri, 160, at);
      o.frequency.exponentialRampToValueAtTime(42, at + 0.09);
      env.linearRampToValueAtTime(0.55 * n.vel, at + 0.002);
      env.exponentialRampToValueAtTime(0.0001, at + 0.2);
      o.connect(g);
      o.start(at);
      o.stop(at + 0.22);
    } else if (v === 'snare') {
      const s = c.createBufferSource();
      s.buffer = this.noise.long;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200;
      bp.Q.value = 0.6;
      env.linearRampToValueAtTime(0.32 * n.vel, at + 0.002);
      env.exponentialRampToValueAtTime(0.0001, at + 0.17);
      s.connect(bp).connect(g);
      s.start(at, Math.random() * 0.5);
      s.stop(at + 0.2);
      // the body: a short triangle blip
      const b = c.createGain();
      b.connect(this.bus.snare);
      const o = this.osc(this.waves.tri, 220, at);
      o.frequency.exponentialRampToValueAtTime(120, at + 0.05);
      b.gain.setValueAtTime(0.25 * n.vel, at);
      b.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
      o.connect(b);
      o.start(at);
      o.stop(at + 0.08);
    } else {
      const s = c.createBufferSource();
      s.buffer = this.noise.short;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const open = n.len >= 2;
      env.linearRampToValueAtTime(0.09 * n.vel, at + 0.001);
      env.exponentialRampToValueAtTime(0.0001, at + (open ? 0.12 : 0.035));
      s.connect(hp).connect(g);
      s.start(at, Math.random() * 0.5);
      s.stop(at + 0.15);
    }
  }

  /** Renders one pass of a track (plus its tail) to audio, faster than real time: for a WAV, or for checking levels. */
  static async render(track: Track, sampleRate = 44100): Promise<AudioBuffer> {
    const flat = flatten(track);
    const seconds = (flat.length * 60) / track.bpm / 4 + 3;
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
    const p = new ChipPlayer(ctx);
    p.bpm = track.bpm;
    p.steps = track.steps;
    p.delay.delayTime.value = p.stepDur * 3;
    for (const e of flat.events) p.voice(e.voice, e.note, 0.05 + e.step * p.stepDur);
    return ctx.startRendering();
  }

  /** Where the playhead is: the step within the loop. */
  get position(): number {
    if (!this.track || !this.timer) return 0;
    const s = Math.floor((this.ctx.currentTime - this.t0) / this.stepDur);
    return ((s % this.track.length) + this.track.length) % this.track.length;
  }
}
