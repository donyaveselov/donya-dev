/* The talkie: a pixel mouth that shows the room.
   No labels on load. The talkie says hello and asks for a tour. "No": all labels appear and it folds into a corner
   button. "Yes": one line per step; the status steps switch the room to that state and hour, then the real one comes
   back; the labels appear one by one; the camera leans a little towards what is being talked about. */
import type { OrthographicCamera, Vector3 } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GameKind, Lang, Status } from '../../../types';
import { PREVIEW_HOURS } from '../store/clock';
import { t, tourLine } from '../i18n';
import type { TourKey } from '../i18n';
import { GAME_NAMES } from '../../../services/presence.service';
import type { TagKey } from '../components/tags';
import { SPEAKING, TALKIE_FRAMES } from './talkie-frames';
import type { MouthFrame } from './talkie-frames';
import { must } from '../../../utils/dom';

export interface TourStep {
  key: TourKey;
  /** the greeting: Yes / No instead of Skip / Next */
  ask?: boolean;
  /** shows this status at this hour (and CS as the game) for the step */
  state?: Status;
  hour?: number;
  game?: 'cs';
  /** back to the real status */
  real?: boolean;
  /** labels this step turns on */
  show?: readonly TagKey[];
  /** where the camera leans */
  look?: Vector3 | null;
  end?: boolean;
}

/** Where the tour looks, by what it talks about (null when the model lacks the object). */
export interface TourSights {
  desk: Vector3 | null;
  hammock: Vector3 | null;
  bed: Vector3 | null;
  resume: Vector3 | null;
  diploma: Vector3 | null;
  /** between the clock and the window */
  place: Vector3 | null;
}

export function tourSteps(s: TourSights): TourStep[] {
  return [
    { key: 'hello', ask: true },
    { key: 'work', state: 'work', hour: PREVIEW_HOURS.day, look: s.desk },
    { key: 'play', state: 'play', game: 'cs', hour: 21.5, look: s.desk },
    { key: 'outside', state: 'outside', hour: 19.3, look: s.hammock },
    { key: 'sleep', state: 'sleep', hour: PREVIEW_HOURS.night, look: s.bed },
    { key: 'back', real: true },
    { key: 'projects', show: ['projects'], look: s.desk },
    { key: 'resume', show: ['resume'], look: s.resume },
    { key: 'diploma', show: ['diploma'], look: s.diploma },
    { key: 'place', show: ['clock', 'window'], look: s.place },
    { key: 'end', end: true },
  ];
}

export interface TourButton {
  label: 'yes' | 'no' | 'next' | 'skip';
  ghost: boolean;
  /** what a click does */
  action: 'next' | 'end';
}

export function stepButtons(step: TourStep): TourButton[] {
  if (step.ask)
    return [
      { label: 'no', ghost: true, action: 'end' },
      { label: 'yes', ghost: false, action: 'next' },
    ];
  if (step.end) return [{ label: 'next', ghost: false, action: 'end' }];
  return [
    { label: 'skip', ghost: true, action: 'end' },
    { label: 'next', ghost: false, action: 'next' },
  ];
}

/** The mouth changes shape this often while it talks, ms. */
const FLAP_MS = 110;

/** The typewriter pauses after a comma or a full stop. */
export const typeDelay = (prev: string): number => (prev === ',' || prev === '.' ? 160 : 34);

/** What the tour needs from the room. */
export interface TourHost {
  lang(): Lang;
  reducedMotion: boolean;
  /** the greeting's facts */
  now(): { h: number; m: number; status: Status; gameName: string | null };
  /** the status shown (or null to stop showing one); the host re-reads the clock and relights the room */
  preview(
    p: { forced: Status | null; hour: number | null; game: { kind: GameKind; name: string | null } } | null,
  ): void;
  /** what is shown now, to come back to */
  current(): { forced: Status | null; hour: number | null; game: { kind: GameKind; name: string | null } };
  /** the room's camera and its orbit controls; asked for only while a tour runs (the room is built by then) */
  rig(): { camera: OrthographicCamera; controls: OrbitControls };
  /** false while at the PC: the camera belongs to the hand-off */
  canDrift(): boolean;
  hideHint(): void;
}

interface Drift {
  t: Vector3;
  z: number;
  /** returning to where the tour started; ends the drift on arrival */
  back?: boolean;
}

export class Tour {
  private el: HTMLElement | null = null;
  private bub: HTMLElement | null = null;
  private btns: HTMLElement | null = null;
  private mouth: HTMLImageElement | null = null;
  private btn: HTMLButtonElement | null = null;
  private readonly shown = new Set<TagKey>();
  private all = false;
  private steps: TourStep[] | null = null;
  private i = -1;
  private typing = false;
  private flap: ReturnType<typeof setInterval> | null = null;
  private full = '';
  private sayId = 0;
  private saved: ReturnType<TourHost['current']> | null = null;
  private cam: Drift | null = null;
  private base: { t: Vector3; z: number } | null = null;

  constructor(
    private readonly host: TourHost,
    private readonly sights: () => TourSights,
  ) {}

  /** Whether a label is on: after the tour (or a "no") all are, during it the ones it has shown. */
  isOn(key: TagKey): boolean {
    return this.all || this.shown.has(key);
  }

  private make(): void {
    const el = document.createElement('div');
    el.className = 'talkie';
    el.hidden = true;
    el.innerHTML =
      '<div class="talkie__say"><div class="tbub" role="status" aria-live="polite"></div><div class="tbtns"></div></div>' +
      // the corner button replays the tour; it only joins the tab order once the tour is over
      '<button class="talkie__btn" type="button" tabindex="-1"><img class="talkie__mouth" alt="" width="64" height="31"></button>';
    document.body.appendChild(el);
    this.el = el;
    const bub = must(el.querySelector<HTMLElement>('.tbub'));
    const mouth = must(el.querySelector<HTMLImageElement>('.talkie__mouth'));
    const btn = must(el.querySelector<HTMLButtonElement>('.talkie__btn'));
    this.bub = bub;
    this.btns = must(el.querySelector<HTMLElement>('.tbtns'));
    this.mouth = mouth;
    this.btn = btn;
    this.labelMouth(); // its name from the start (it joins the tab order only once the tour is over)
    mouth.src = TALKIE_FRAMES.idle;
    bub.addEventListener('click', () => {
      if (this.typing) this.finishLine();
      else if (this.steps && !this.step()?.ask) this.next();
    });
    const replay = (): void => {
      if (el.classList.contains('talkie--mini')) this.start(true);
    };
    btn.addEventListener('click', replay); // a button: Enter and Space click it too
    window.addEventListener('keydown', (e) => {
      this.onKey(e);
    });
  }

  private showMouth(f: MouthFrame): void {
    const mouth = this.mouth;
    if (!mouth || mouth.getAttribute('data-f') === f) return;
    mouth.src = TALKIE_FRAMES[f];
    mouth.setAttribute('data-f', f);
  }

  /** The lips flap while the text types (a timer that runs only then) and grin when it stops. */
  private setTyping(typing: boolean): void {
    this.typing = typing;
    if (typing) {
      this.flap ??= setInterval(() => {
        this.showMouth(SPEAKING[(Math.random() * SPEAKING.length) | 0] ?? 'idle');
      }, FLAP_MS);
    } else {
      if (this.flap !== null) clearInterval(this.flap);
      this.flap = null;
      this.showMouth('idle');
    }
  }

  private step(): TourStep | undefined {
    return this.steps?.[this.i];
  }

  private say(text: string): void {
    const bub = must(this.bub);
    this.full = text;
    if (this.host.reducedMotion) {
      this.setTyping(false);
      bub.textContent = text;
      this.renderButtons();
      return;
    }
    bub.textContent = '';
    this.setTyping(true);
    this.renderButtons();
    let n = 0;
    const id = ++this.sayId;
    const type = (): void => {
      if (id !== this.sayId) return;
      n += 1;
      bub.textContent = text.slice(0, n);
      if (n < text.length) setTimeout(type, typeDelay(text.charAt(n - 1)));
      else {
        this.setTyping(false);
        this.renderButtons();
      }
    };
    type();
  }

  private finishLine(): void {
    this.sayId++;
    this.setTyping(false);
    must(this.bub).textContent = this.full;
    this.renderButtons();
  }

  /**
   * The bubble from the keyboard while the tour talks: Enter is "Next" (or "Yes"), even while a line is still typing;
   * Escape is "No" / "Skip". Keys typed into a field, or with the desktop or the resume sheet in front, are left alone.
   */
  private onKey(e: KeyboardEvent): void {
    const el = this.el;
    // the bubble is up (a fixed element has no offsetParent, so that cannot tell) and the room is in front
    if (!this.steps || !el || el.hidden || document.body.classList.contains('at-pc')) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (target?.closest('input, textarea, select, [contenteditable="true"], #sheet, #xp-root')) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.buttons()
        .find((b) => !b.classList.contains('tbtn--ghost'))
        ?.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.end();
    }
  }

  private buttons(): HTMLButtonElement[] {
    return [...must(this.btns).querySelectorAll<HTMLButtonElement>('.tbtn')];
  }

  private renderButtons(): void {
    const b = must(this.btns);
    b.textContent = '';
    const st = this.step();
    if (!st) return;
    const T = t(this.host.lang()).tour;
    for (const spec of stepButtons(st)) {
      const x = document.createElement('button');
      x.type = 'button';
      // the main button (Yes, Next: what Enter presses) is white, the secondary one (No, Skip) black
      x.className = 'tbtn' + (spec.ghost ? ' tbtn--ghost' : ' tbtn--on');
      x.textContent = T[spec.label];
      x.addEventListener('click', () => {
        if (spec.action === 'end') this.end();
        else this.next();
      });
      b.appendChild(x);
    }
  }

  private lookAt(p: Vector3 | null | undefined): void {
    if (this.host.reducedMotion || !p) {
      this.cam = null;
      return;
    }
    const { camera, controls } = this.host.rig();
    this.base ??= { t: controls.target.clone(), z: camera.zoom };
    this.cam = { t: this.base.t.clone().lerp(p, 0.35), z: Math.min(controls.maxZoom, this.base.z * 1.18) };
  }

  private goBack(): void {
    if (this.base) this.cam = { t: this.base.t.clone(), z: this.base.z, back: true };
  }

  /** The camera's eased drift towards the goal; OrbitControls stays in charge of the rest. */
  drift(dt: number): void {
    const cam = this.cam;
    if (!cam || !this.host.canDrift()) return;
    const { camera, controls } = this.host.rig();
    const k = 1 - Math.exp(-dt * 2.6);
    controls.target.lerp(cam.t, k);
    camera.zoom += (cam.z - camera.zoom) * k;
    camera.updateProjectionMatrix();
    if (cam.back && controls.target.distanceTo(cam.t) < 0.01) {
      this.cam = null;
      this.base = null;
    }
  }

  /** A status shown for the tour: its state, its hour, CS for the game; null brings back what was there. */
  private setState(st: TourStep | null): void {
    this.saved ??= this.host.current();
    if (st?.state) {
      const cur = this.host.current();
      this.host.preview({
        forced: st.state,
        hour: st.hour ?? null,
        game: st.game ? { kind: st.game, name: GAME_NAMES[st.game] } : cur.game,
      });
    } else {
      this.host.preview(this.saved);
      this.saved = null;
    }
  }

  private show(): void {
    const st = must(this.step());
    if (st.state) this.setState(st);
    else if (this.saved) this.setState(null);
    for (const k of st.show ?? []) this.shown.add(k);
    if (st.look) this.lookAt(st.look);
    else if (st.real || st.end) this.goBack();
    this.say(this.line(st.key));
  }

  private line(key: TourKey): string {
    return tourLine(this.host.lang(), key, this.host.now());
  }

  private next(): void {
    if (this.steps && this.i < this.steps.length - 1) {
      this.i++;
      this.show();
    } else this.end();
  }

  /** Starts the tour: from the greeting, or (again) straight from the first step. */
  start(again: boolean): void {
    if (!this.el) this.make();
    const el = must(this.el);
    this.steps = tourSteps(this.sights());
    this.i = again ? 1 : 0;
    el.hidden = false;
    el.classList.remove('talkie--mini');
    this.btn?.setAttribute('tabindex', '-1'); // while the tour talks the mouth does nothing
    this.host.hideHint();
    this.show();
  }

  private end(): void {
    this.sayId++;
    this.setTyping(false);
    if (this.saved) this.setState(null);
    this.goBack();
    this.all = true;
    this.steps = null;
    must(this.btns).textContent = '';
    must(this.el).classList.add('talkie--mini');
    this.labelMouth();
  }

  private labelMouth(): void {
    const btn = this.btn;
    if (!btn) return;
    const again = t(this.host.lang()).tour.again;
    btn.setAttribute('aria-label', again);
    btn.title = again;
    if (!this.steps) btn.setAttribute('tabindex', '0'); // after the tour (or before it starts)
  }

  /** The page language changed: say the current line again, or relabel the corner button. */
  relang(): void {
    const st = this.step();
    if (st) {
      this.sayId++;
      this.say(this.line(st.key));
    } else this.labelMouth();
  }
}
