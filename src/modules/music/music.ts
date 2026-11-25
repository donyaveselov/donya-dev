// Background music: one lofi loop ("Lofi Hip Hop Loop" by omfgdude, CC0: public/music/CREDITS.txt), on by default.
// The speaker button flips the page's one sound switch (src/store/sound.ts), which the desktop's tray Mute flips
// too; the music follows the switch. The tray's volume slider turns it down; a hidden tab pauses it.
//
// Browsers start audio only from a gesture, so it begins on the visitor's first click, tap or key and fades in. It is
// streamed (an <audio> element routed through Web Audio for the fades): it plays as soon as the first kilobytes are
// in, instead of after the whole file is downloaded and decoded. MP3 for every browser: Chrome does not start an Ogg
// until it has also fetched the file's end (Ogg keeps no duration up front), which on this host is seconds after the
// click; a CBR MP3 starts after one request. Nothing is fetched before that first gesture.
import { isMuted, onMutedChange, setMuted } from '../../store/sound';

const LEVEL = 0.5;
const FADE_IN = 2;
/** the gestures that let a page start audio: a mouse press, the end of a touch, a key */
const GESTURES = ['pointerdown', 'pointerup', 'keydown'] as const;

export class Music {
  /** the desktop tray's volume, 0..1 */
  private volume = 1;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private el: HTMLAudioElement | null = null;
  /** a gesture started the music (until then every gesture tries) */
  private started = false;

  constructor(private readonly button: HTMLButtonElement) {
    button.addEventListener('click', () => {
      setMuted(!isMuted());
    });
    onMutedChange(() => {
      this.changed();
    });
    this.paint();
    const tryStart = (): void => {
      if (!isMuted()) this.start();
    };
    for (const g of GESTURES) window.addEventListener(g, tryStart, true);
    this.stopListening = () => {
      for (const g of GESTURES) window.removeEventListener(g, tryStart, true);
    };
    document.addEventListener('visibilitychange', () => {
      if (!this.el) return;
      if (document.hidden) this.el.pause();
      else if (this.audible) void this.el.play().catch(() => undefined);
    });
  }

  private stopListening: () => void = () => undefined;

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
    if (!this.audible) {
      this.level(0.2);
      return;
    }
    if (this.el) {
      void this.ctx?.resume();
      void this.el.play().catch(() => undefined);
      this.level(0.2);
    } else this.start(); // the switch's own click is a gesture
  }

  private paint(): void {
    this.button.setAttribute('aria-pressed', String(this.audible));
    this.button.classList.toggle('music--off', !this.audible);
  }

  /** Moves the volume to where the button and the tray put it (and pauses the stream once a mute has faded). */
  private level(time: number): void {
    const c = this.ctx;
    const g = this.gain;
    if (!c || !g) return;
    const to = this.audible ? LEVEL * this.volume : 0;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setTargetAtTime(to, c.currentTime, time / 3);
    if (to === 0) {
      const el = this.el;
      setTimeout(() => {
        if (!this.audible) el?.pause();
      }, time * 1000);
    }
  }

  /** Called from inside a gesture: sets up the stream once, and plays. */
  private start(): void {
    if (this.started) return;
    if (!this.el) {
      const el = new Audio();
      el.loop = true;
      el.preload = 'auto';
      el.src = '/music/lofi-loop.mp3';
      const c = new AudioContext();
      const g = c.createGain();
      g.gain.value = 0;
      c.createMediaElementSource(el).connect(g).connect(c.destination);
      this.el = el;
      this.ctx = c;
      this.gain = g;
    }
    const el = this.el;
    void this.ctx?.resume();
    this.started = true;
    el.play().then(
      () => {
        this.stopListening();
        this.level(FADE_IN);
        if (document.hidden) el.pause();
      },
      (e: unknown) => {
        // not a gesture the browser accepts (a touch's start), or the file failed: the next gesture tries again
        this.started = false;
        if (!(e instanceof DOMException && e.name === 'NotAllowedError')) console.warn(e);
      },
    );
  }
}
