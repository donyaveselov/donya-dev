/* What the two monitors show: the floating logo while the owner sleeps or is out, an opencode session while he works,
   a game and a video while he plays. */
import { CanvasTexture } from 'three';
import type { GameKind, Lang, Status } from '../shared/types';
import { desktopLogo } from '../shared/desktop';
import { SAVER_BG, SAVER_LOGO, SAVER_SCREEN } from '../shared/saver';
import { t as strings } from './i18n';
import { CodeSession, wrapText } from './opencode';
import { saverPos } from './saver';
import type { SaverPos } from './saver';
import type { LineKind } from './opencode';
import { canvas, ctx2d, screenCanvasTexture, screenFilter, screenTexture } from './textures';

/** The live canvases (the saver, the opencode session) are all the saver's size. */
const { w: LIVE_W, h: LIVE_H } = SAVER_SCREEN;

const INDENT: Record<LineKind, number> = { u: 14, a: 14, t: 30, '+': 46, '-': 46, o: 30, ' ': 0 };
const MONO = 'Menlo, Consolas, monospace';
const SPINNER = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

/** One row on screen: kind, text, whether the typing cursor follows it, whether it continues a wrapped line. */
type Row = [LineKind, string, boolean, boolean];

/** The opencode TUI at k device pixels per CSS pixel; the session is in Russian, its footer in the page's language. */
function paintCode(c: HTMLCanvasElement, s: CodeSession, t: number, k: number, lang: Lang): void {
  const g = ctx2d(c);
  const W = c.width / k;
  const H = c.height / k;
  const narrow = W < 520;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.fillStyle = '#0a0a0a';
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';
  const pad = narrow ? 12 : 18;
  // header
  g.font = 'bold 15px ' + MONO;
  g.fillStyle = '#e8e8e8';
  g.fillText('open', pad, 20);
  g.fillStyle = '#808080';
  g.fillText('code', pad + g.measureText('open').width, 20);
  g.font = '12px ' + MONO;
  g.fillStyle = '#5c5c5c';
  if (!narrow) g.fillText('~/Projects/landing', 110, 21);
  g.textAlign = 'right';
  g.fillText('v1.3.0', W - pad, 21);
  g.textAlign = 'left';
  // transcript: finished lines plus the one being typed, each wrapped to the width, the tail kept in view
  const lh = 19;
  const rows: Row[] = [];
  g.font = '13px ' + MONO;
  const measure = (x: string): number => g.measureText(x).width;
  const addRows = (kind: LineKind, text: string, typing: boolean): void => {
    const parts = wrapText(measure, text, W - pad * 2 - INDENT[kind] - 10);
    parts.forEach((tx, j) => rows.push([kind, tx, typing && j === parts.length - 1, j > 0]));
  };
  for (const [kind, text] of s.lines) addRows(kind, text, false);
  if (s.cur) addRows(s.cur[0], s.cur[1].slice(0, Math.floor(s.shown)), true);
  const maxRows = Math.floor((H - 40 - 74) / lh);
  let y = 46;
  for (let i = Math.max(0, rows.length - maxRows); i < rows.length; i++, y += lh) {
    const row = rows[i];
    if (!row) continue;
    const [kd, tx, cursor, cont] = row;
    let x = pad;
    if (kd === 'u') {
      g.fillStyle = '#141414';
      g.fillRect(pad, y - lh / 2, W - pad * 2, lh);
      g.fillStyle = '#fab283';
      g.fillRect(pad, y - lh / 2, 3, lh);
      g.fillStyle = '#eeeeee';
      x = pad + 14;
    } else if (kd === 'a') {
      g.fillStyle = '#d0d0d0';
      x = pad + 14;
    } else if (kd === 't') {
      if (!cont) {
        g.fillStyle = '#5c9cf5';
        g.fillText('∗', pad + 14, y);
      }
      g.fillStyle = '#9d9d9d';
      x = pad + 30;
    } else if (kd === '+' || kd === '-') {
      const [bg, fg] = kd === '+' ? ['#12261a', '#7fd88f'] : ['#2a1416', '#e06c75'];
      g.fillStyle = bg;
      g.fillRect(pad + 30, y - lh / 2, W - pad * 2 - 30, lh);
      g.fillStyle = fg;
      if (!cont) g.fillText(kd, pad + 34, y);
      x = pad + 46;
    } else if (kd === 'o') {
      g.fillStyle = tx.includes('✓') ? '#7fd88f' : tx.includes('✗') ? '#e06c75' : '#6f6f6f';
      x = pad + 30;
    }
    g.fillText(tx, x, y);
    if (cursor && Math.floor(t * 3) % 2) {
      g.fillStyle = '#fab283';
      g.fillRect(x + g.measureText(tx).width + 2, y - 7, 7, 14);
    }
  }
  // prompt box and footer
  const by = H - 66;
  const asking = s.asking;
  g.fillStyle = '#141414';
  g.fillRect(pad, by, W - pad * 2, 34);
  g.fillStyle = '#fab283';
  g.fillRect(pad, by, 3, 34);
  if (Math.floor(t * 2) % 2) {
    g.fillStyle = '#eeeeee';
    g.fillRect(pad + 14, by + 10, 8, 14);
  }
  g.font = '12px ' + MONO;
  g.fillStyle = '#5c9cf5';
  g.fillText('Build', pad, H - 16);
  g.fillStyle = '#5c5c5c';
  const spin = SPINNER.charAt(Math.floor(t * 10) % 10);
  const hint = narrow
    ? asking
      ? ''
      : spin + ' working'
    : asking
      ? 'tab switch agent   ctrl+p commands'
      : spin + ' working   esc interrupt';
  g.fillText(hint, pad + 52, H - 16);
  g.textAlign = 'right';
  g.fillText(strings(lang).attempt + String(Math.max(1, s.n)), W - pad, H - 16);
  g.textAlign = 'left';
  g.setTransform(1, 0, 0, 1, 0, 0);
}

type ScreenTexKey = 'saver' | 'code' | 'editor' | 'terminal' | 'other' | 'dota' | 'cs' | 'youtube';

export class LiveScreens {
  readonly tex: Record<ScreenTexKey, CanvasTexture>;
  private readonly saverC = canvas(LIVE_W, LIVE_H);
  private readonly codeC = canvas(LIVE_W, LIVE_H);
  /** a page-sized copy of the session for the desktop window, once the hand-off asks for one */
  private readable: { c: HTMLCanvasElement; dpr: number } | null = null;
  private readonly session = new CodeSession();
  private logo: HTMLImageElement | null = null;
  private lastFrame = -1;
  private lastStatus: Status | null = null;
  /** the time the saver was last drawn for: the desktop's saver starts from the same place */
  private saverT = 0;
  private readonly saverUV: SaverPos = { u: 0, v: 0 };

  constructor(
    private readonly reducedMotion: boolean,
    private readonly lang: () => Lang,
  ) {
    const live = (c: HTMLCanvasElement): CanvasTexture => screenFilter(screenCanvasTexture(c));
    this.tex = {
      saver: live(this.saverC),
      code: live(this.codeC),
      editor: screenTexture('editor'),
      terminal: screenTexture('terminal'),
      other: screenTexture('game'),
      dota: screenTexture('dota'),
      cs: screenTexture('cs'),
      youtube: screenTexture('youtube'),
    };
    // the owner's own splash screens for Dota and CS replace the drawn placeholders once they load (kept if they fail)
    for (const k of ['dota', 'cs'] as const) {
      const im = new Image();
      im.onload = () => {
        const tex = this.tex[k];
        const c = tex.image as HTMLCanvasElement;
        c.width = 1280;
        c.height = 720;
        const r = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight);
        const w = im.naturalWidth * r;
        const h = im.naturalHeight * r;
        ctx2d(c).drawImage(im, (c.width - w) / 2, (c.height - h) / 2, w, h);
        tex.needsUpdate = true;
      };
      im.src = 'games/' + k + '.jpg';
    }
  }

  /** What monitor i shows for a status (0 = left, 1 = right). */
  forMonitor(i: number, status: Status, game: GameKind): CanvasTexture {
    if (status === 'play') return i ? this.tex.youtube : this.tex[game];
    if (status === 'sleep' || status === 'outside') return this.tex.saver;
    return i ? this.tex.editor : this.tex.code;
  }

  /** The saver's position this frame, for the desktop's own saver to take over from. */
  saverPosNow(): SaverPos {
    return saverPos(this.saverT, { u: 0, v: 0 });
  }

  /**
   * A second, page-sized canvas for the opencode window on the desktop: the monitor's own picture is right for
   * the hand-off frame, but on a narrow phone it is either cropped or unreadably small. This one has the window's own
   * shape, the same session, and lines wrapped to its width.
   */
  readableCode(w: number, h: number): HTMLCanvasElement {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = this.readable?.c ?? document.createElement('canvas');
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    this.readable = { c, dpr };
    return c;
  }

  /** Keeps the readable copy the size of the page. */
  resize(w: number, h: number): void {
    if (this.readable) this.readableCode(w, h);
  }

  private drawSaver(t: number): void {
    const c = this.saverC;
    const g = ctx2d(c);
    const W = c.width;
    const H = c.height;
    const { w: bw, h: bh } = SAVER_LOGO;
    if (!this.logo) {
      const src = desktopLogo();
      if (src) {
        this.logo = new Image();
        this.logo.src = src;
      }
    }
    g.fillStyle = SAVER_BG;
    g.fillRect(0, 0, W, H);
    const uv = saverPos(t, this.saverUV);
    const x = uv.u * (W - bw);
    const y = uv.v * (H - bh);
    const im = this.logo;
    if (im?.complete && im.naturalWidth) g.drawImage(im, x, y + 4, 70, (70 * im.naturalHeight) / im.naturalWidth);
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#fff';
    g.font = 'italic bold 34px "Trebuchet MS", Tahoma, sans-serif';
    g.fillText('Windows', x + 80, y + 54);
    const w = g.measureText('Windows').width;
    g.fillStyle = '#F7941D';
    g.font = 'italic bold 20px "Trebuchet MS", Tahoma, sans-serif';
    g.fillText('XD', x + 82 + w, y + 38);
  }

  private drawCode(t: number, atPC: boolean): void {
    const s = this.session;
    // starts a few lines in, never from an empty screen
    s.step(s.last ? Math.min(Math.max(t - s.last, 0), 0.25) : this.reducedMotion ? 40 : 6);
    s.last = t;
    const lang = this.lang();
    paintCode(this.codeC, s, t, 1, lang);
    if (this.readable && atPC) paintCode(this.readable.c, s, t, this.readable.dpr, lang);
  }

  /** Redraws the live picture for the status: the terminal at 12 fps, the logo every frame. */
  tick(t: number, status: Status, atPC: boolean): void {
    const f = Math.floor(t * (status === 'work' ? 12 : 30));
    if (status === 'work') {
      if (f !== this.lastFrame || this.lastStatus !== status) {
        this.drawCode(t, atPC);
        this.tex.code.needsUpdate = true;
      }
    } else if (status === 'sleep' || status === 'outside') {
      this.saverT = this.reducedMotion ? 3 : t;
      this.drawSaver(this.saverT);
      this.tex.saver.needsUpdate = true;
    }
    this.lastFrame = f;
    this.lastStatus = status;
  }
}
