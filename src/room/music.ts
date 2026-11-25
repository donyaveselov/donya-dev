// Background music: one lofi loop ("Lofi Hip Hop Loop" by omfgdude, CC0: public/music/CREDITS.txt), on by default.
// The speaker button in the top bar flips the page's one sound switch (src/shared/sound.ts), the same one the
// desktop's tray Mute flips, and the music follows that switch wherever it is flipped. Browsers start audio only from a gesture, so it begins on the
// visitor's first click, tap or key and fades in. The file is fetched while the page is idle (not at all while muted)
// and looped gaplessly with Web Audio; an MP3 copy serves browsers without Ogg Vorbis (older Safari), and the MP3
// encoder's silence at both ends is cut off the loop. A hidden tab pauses it. The tray's volume slider turns it down.
import { isMuted, onMutedChange, setMuted } from '../shared/sound';

const LEVEL = 0.5;
const FADE_IN = 2;

/** Where the sound really starts and ends in a decoded buffer (skips an encoder's leading and trailing silence). */
export function audibleSpan(data: Float32Array, threshold = 1e-3): [number, number] {
  let a = 0;
  while (a < data.length && Math.abs(data[a] ?? 0) < threshold) a++;
  let b = data.length - 1;
  while (b > a && Math.abs(data[b] ?? 0) < threshold) b--;
  return [a, b + 1];
}

export class Music {
  /** the desktop tray's volume, 0..1 */
  private volume = 1;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private file: Promise<ArrayBuffer> | null = null;
  private started = false;

  constructor(private readonly button: HTMLButtonElement) {
    button.addEventListener('click', () => {
      setMuted(!isMuted());
    });
    onMutedChange(() => {
      this.changed();
    });
    this.paint();
    // the first gesture anywhere starts it (the button's own click included: then it is a "turn on")
    const first = (): void => {
      window.removeEventListener('pointerdown', first, true);
      window.removeEventListener('keydown', first, true);
      if (!isMuted()) void this.start();
    };
    window.addEventListener('pointerdown', first, true);
    window.addEventListener('keydown', first, true);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else if (this.audible) void this.ctx.resume();
    });
  }

  /** The file, fetched once: Ogg Vorbis where the browser plays it, else the MP3. */
  prefetch(): void {
    if (isMuted() || this.file) return;
    const ogg = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';
    this.file = fetch(ogg ? 'music/lofi-loop.ogg' : 'music/lofi-loop.mp3').then((r) => {
      if (!r.ok) throw new Error(`music: HTTP ${String(r.status)}`);
      return r.arrayBuffer();
    });
    this.file.catch(() => {
      this.file = null; // a later start tries again
    });
  }

  /** The desktop tray's volume slider moved. */
  follow(volume: number): void {
    this.volume = volume;
    this.level(0.15);
  }

  private get audible(): boolean {
    return !isMuted();
  }

  /** The sound switch flipped (the button here or the desktop's tray). */
  private changed(): void {
    this.paint();
    if (this.audible && !this.started) void this.start();
    else this.level(0.2);
    if (this.audible) void this.ctx?.resume();
  }

  private paint(): void {
    this.button.setAttribute('aria-pressed', String(this.audible));
    this.button.classList.toggle('music--off', !this.audible);
  }

  /** Moves the volume to where the button and the tray put it. */
  private level(time: number): void {
    const c = this.ctx;
    const g = this.gain;
    if (!c || !g) return;
    const to = this.audible ? LEVEL * this.volume : 0;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setTargetAtTime(to, c.currentTime, time / 3);
  }

  private async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    let c: AudioContext | null = null;
    try {
      c = new AudioContext();
      this.ctx = c;
      void c.resume();
      this.prefetch();
      const file = await (this.file ?? Promise.reject(new Error('music: no file')));
      const buf = await c.decodeAudioData(file.slice(0));
      const [a, b] = audibleSpan(buf.getChannelData(0));
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = a / buf.sampleRate;
      src.loopEnd = b / buf.sampleRate;
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(g).connect(c.destination);
      this.gain = g;
      src.start(c.currentTime + 0.05, src.loopStart);
      this.level(FADE_IN);
      if (document.hidden) void c.suspend();
    } catch (e) {
      console.warn(e); // music is a nicety: no music, no fuss
      // the next start (the switch flipped again) makes a fresh context, so this one is closed: a browser allows only
      // a few open at once
      this.started = false;
      this.ctx = null;
      this.gain = null;
      void c?.close().catch(() => undefined);
    }
  }
}
