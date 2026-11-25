/* The isometric room: one full-screen three.js scene floating in a sky whose colours follow Phuket time, the owner's
   status and the real weather; the Windows XD desktop opens inside either monitor.
   This module is the page's composition root. startRoom() makes the app (the DOM chrome, the music, the talkie tour
   and, once the model arrives, the 3D room and the way into its monitors) and wires the parts to each other:
     state.ts          what the room is showing: language, Phuket time, status, game, weather
     routes.ts         the routes (/resume, /night, ...)
     scene.ts          the 3D room: built from the model, lit, animated
     handoff.ts        sitting down at a monitor and standing up
     flat-desktop.ts   the desktop alone, when there is no 3D
     pointer.ts, pin.ts   the pointer over the room, the Projects button
     panels.ts, tour.ts, music.ts   the top bar and the resume sheet, the talkie, the music */
import { Vector3, WebGLRenderer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { debugWanted } from '../../utils/debug';
import { getDesktop } from '../../services/desktop-registry';
import type { RoomDesktop, RoomMountOptions } from '../../services/desktop-registry';
import { SAVER_SCREEN } from '../../enums/saver';
import type { GameKind, Lang, Status } from '../../types';
import type { RoomDebugHandle } from './debug/debug-handle';
import type { DebugHost } from './debug/debug-panel';
import { loadDesktop } from '../../services/desktop.service';
import { FlatDesktop } from './handoff/flat-desktop';
import { HandOff } from './handoff/handoff';
import { BACKDROP } from './scene/lighting';
import { loadRoom } from '../../services/room-model.service';
import { Music } from '../music/music';
import { Panels } from './components/panels';
import { ProjectsPin } from './components/pin';
import { watchPointer } from './scene/pointer';
import type { Pointer } from './scene/pointer';
import { GAME_NAMES, pollPresence } from '../../services/presence.service';
import { render, setBackdrop } from './scene/psx';
import { currentRoute, onRouteChange, tidyAddress } from '../../services/router.service';
import type { Route } from './routes';
import { animateScene, buildScene, fitScene, lightScene, tourSights } from './scene/scene';
import type { RoomScene } from './scene/scene';
import { REDUCED_MOTION, live, readClock, saveLang, status } from './store/state';
import type { TagView } from './components/tags';
import { Tour } from './tour/tour';
import { byId, must } from '../../utils/dom';
import { nextTask } from '../../utils/tasks';
import { fetchWeather, restoreWeather } from '../../services/weather.service';

/** The Phuket clock is read this often (s); the room is relit when its minute changes. */
const CLOCK_EVERY_S = 5;
const WEATHER_EVERY_MS = 15 * 60e3;
/** A frame never counts for more than this (s): a tab that was in the background does not jump on its return. */
const MAX_FRAME_S = 0.05;
/** The visitor sees the room for a moment before the talkie speaks, or before a /pc link flies to the monitor. */
const GREET_AFTER_MS = 900;
const SIT_AFTER_MS = 700;

/** Runs `f` when the page is idle (within 3 s), or soon where requestIdleCallback is missing (Safari). */
function whenIdle(f: () => void): void {
  if ('requestIdleCallback' in window) window.requestIdleCallback(f, { timeout: 3000 });
  else setTimeout(f, 1200);
}

function createRenderer(): WebGLRenderer | null {
  try {
    return new WebGLRenderer({ antialias: false, alpha: true, stencil: true });
  } catch {
    return null; // no WebGL: the page keeps its chrome and opens the desktop without the room
  }
}

/** The 3D room once the model is in, with the ways the visitor acts on it. */
interface Room extends RoomScene {
  handoff: HandOff;
  pointer: Pointer;
  /** what the labels are laid out against, updated every frame */
  view: TagView;
}

class RoomApp {
  private readonly stage = byId('stage');
  private readonly note = byId('note');
  private readonly loading = byId('loading');
  private readonly panels = new Panels();
  private readonly music = new Music(byId('music', HTMLButtonElement));
  private readonly pin = new ProjectsPin(byId('pin'));
  private readonly tour: Tour;
  private readonly flat: FlatDesktop;
  /** null while the model loads, and for good without WebGL */
  private room: Room | null = null;
  /** the stage's size in CSS px, measured by layout() */
  private readonly size = { w: 0, h: 0 };
  /** the debug panel's hour, which a status choice keeps */
  private debugHour: number | null = null;
  /** the talkie has said hello */
  private greeted = false;
  private lastFrame = performance.now();
  private sinceClock = 0;
  private readonly anchorAt = new Vector3();

  constructor() {
    this.tour = new Tour(
      {
        lang: () => live.lang,
        reducedMotion: REDUCED_MOTION,
        now: () => ({ h: live.time.h, m: live.time.m, status: status(), gameName: live.game.name }),
        current: () => ({ forced: live.forced, hour: live.preview, game: { ...live.game } }),
        preview: (p) => {
          if (p) this.showGame(p.game);
          this.preview(p?.forced ?? null, p?.hour ?? null);
        },
        rig: () => must(this.room),
        canDrift: () => !this.room?.handoff.atPC,
        hideHint: () => {
          this.note.style.opacity = '0';
        },
      },
      () => tourSights(must(this.room)),
    );
    this.flat = new FlatDesktop({
      lang: () => live.lang,
      mountOptions: (onExit) => this.mountOptions(onExit),
      chrome: (open) => {
        document.body.classList.toggle('at-pc', open); // the top bar steps aside, the resume sheet opens above
        this.pin.el.hidden = open;
        this.note.style.opacity = open ? '0' : '1';
      },
      failed: () => {
        this.pin.el.hidden = false;
        this.say('noDesktop');
      },
    });
  }

  start(): void {
    this.layout();
    // the top bar's language switch, and the resume sheet's own (the sheet covers the bar)
    for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-lang]'))
      b.addEventListener('click', () => {
        if (b.dataset.lang === 'ru' || b.dataset.lang === 'en') this.setLang(b.dataset.lang);
      });
    this.pin.el.addEventListener('click', () => {
      if (this.room) this.room.handoff.sitDown('L');
      else if (document.body.classList.contains('no-3d')) this.flat.open();
    });
    window.addEventListener('resize', this.layout);
    // Back or Forward (the resume sheet opened or closed); the boot handles the address the page was loaded with
    onRouteChange((route) => {
      this.applyRoute(route);
      if (route.sit === 'projects') this.openProjects();
    });
    // the debug panel is a chunk of its own: visitors never download it
    if (debugWanted()) void import('./debug/debug-panel').then((m) => m.makeDebugPanel(this.debugHost()));

    this.watchWeather();
    this.applyLang();
    readClock();
    this.applyTime();
    const gl = createRenderer();
    if (gl)
      loadRoom()
        .then((gltf) => this.enterRoom(gl, gltf))
        .catch((e: unknown) => {
          console.error(e);
          this.openWithoutRoom();
        });
    else this.openWithoutRoom();
    this.applyRoute();
    this.watchPresence();
    requestAnimationFrame(this.frame);
  }

  /* ---------- the hour, the status, the language ---------- */

  private renderTime(): void {
    this.panels.renderTime(live.lang, live.time.h, live.time.m, status(), live.game.name);
  }

  /** Shows what `live` holds: the page's backdrop and time chip, and the room's light. */
  private readonly applyTime = (): void => {
    // the page behind the room follows the state, not the clock: one gradient per state, shared by the CSS and the post
    const [top, bottom] = BACKDROP[status()];
    document.documentElement.style.setProperty('--sky-top', top);
    document.documentElement.style.setProperty('--sky-bottom', bottom);
    setBackdrop(top, bottom);
    this.renderTime();
    if (this.room) lightScene(this.room);
  };

  private applyLang(): void {
    this.panels.applyLang(live.lang);
    this.pin.measure();
    this.renderTime();
    if (this.room) {
      for (const f of this.room.frames) f.draw(live.lang);
      this.room.tags.refresh(live.lang);
    }
    this.tour.relang();
  }

  private setLang(next: Lang): void {
    saveLang(next);
    this.applyLang();
    this.room?.handoff.setLang(next);
  }

  private showGame(game: { kind: GameKind; name: string | null }): void {
    live.game.kind = game.kind;
    live.game.name = game.name;
  }

  /** Previews (or stops previewing) a status and hour, then re-reads the clock and relights. */
  private preview(forced: Status | null, hour: number | null): void {
    live.forced = forced;
    live.preview = hour;
    readClock();
    this.applyTime();
  }

  /** Shows what the address asks for (a preview, the resume sheet) and returns the route. */
  private applyRoute(route: Route = currentRoute()): void {
    if (route.game) this.showGame({ kind: route.game, name: GAME_NAMES[route.game] });
    this.panels.showResume(route.resume);
    this.preview(route.forced, route.preview);
  }

  private watchWeather(): void {
    const refresh = (): void => {
      void fetchWeather(live.wx, this.applyTime);
    };
    // the weather goes first, in parallel with the room; the last answer is remembered for a repeat visit
    restoreWeather(live.wx, Date.now());
    refresh();
    setInterval(() => {
      if (!document.hidden) refresh(); // a hidden tab catches up when it is shown again
    }, WEATHER_EVERY_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - live.wx.at > WEATHER_EVERY_MS) refresh();
    });
  }

  private watchPresence(): void {
    pollPresence((p) => {
      const was = live.presence?.playing ? live.presence.game : null;
      live.presence = p;
      if (p?.playing && !live.forced) this.showGame({ kind: p.kind, name: p.game });
      // re-light only when the game changes; a failed reading mid-game counts (the room must not stay in the game)
      if (was !== (p?.playing ? p.game : null)) this.applyTime();
    });
  }

  /* ---------- the room ---------- */

  /** The model is in: builds the room, shows it, and follows a route that sits down (or says hello). */
  private async enterRoom(gl: WebGLRenderer, gltf: GLTF): Promise<void> {
    const route = currentRoute();
    // three tasks, not one: build the scene, compile its shaders, then show it. three r128 compiles every shader
    // program synchronously on the first frame (a few hundred ms on a phone), so it gets a task of its own here, and
    // the frame loop only sees the room once it is compiled.
    const scene = buildScene(gl, gltf, this.stage);
    await nextTask();
    gl.compile(scene.scene, scene.camera);
    await nextTask();
    const handoff = this.makeHandOff(scene);
    const pointer = watchPointer(scene, {
      free: () => !handoff.atPC,
      lang: () => live.lang,
      sitDown: (side) => {
        handoff.sitDown(side);
      },
      openResume: () => {
        this.panels.openResume();
      },
    });
    const view: TagView = {
      camera: scene.camera,
      width: this.size.w,
      height: this.size.h,
      room: true,
      isOn: (k) => this.tour.isOn(k),
      wallK: (w) => scene.walls.k(w),
      pin: null,
    };
    const room: Room = { ...scene, handoff, pointer, view };
    this.room = room;
    if (debugWanted()) window.__psx = this.debugHandle(room);
    this.layout();
    this.applyTime();
    this.hideLoader();
    this.pin.el.hidden = false;
    this.pin.measure();
    void document.fonts.ready.then(() => {
      this.pin.measure();
    });
    // a route that sits down goes to the monitor; otherwise the talkie says hello (after such a route it does so
    // when the visitor is back in the room)
    if (route.sit) {
      const projects = route.sit === 'projects';
      setTimeout(() => {
        if (projects) this.openProjects();
        else handoff.sitDown('L');
      }, SIT_AFTER_MS);
    } else {
      setTimeout(
        () => {
          this.greet();
        },
        REDUCED_MOTION ? 0 : GREET_AFTER_MS,
      );
    }
    // the desktop module, then its shell (invisible), when the page is idle: a click on a monitor then starts the
    // flight at once
    whenIdle(() => {
      void loadDesktop().then((ok) => {
        if (ok)
          whenIdle(() => {
            if (!handoff.atPC) handoff.ensureDesktop();
          });
      });
    });
  }

  private makeHandOff(scene: RoomScene): HandOff {
    return new HandOff(
      {
        camera: scene.camera,
        controls: scene.controls,
        root: scene.root,
        monitors: scene.monitors,
        reducedMotion: REDUCED_MOTION,
        status,
        game: () => live.game,
        atDesk: () => scene.figure.atDesk(),
        screenPicture: (i) => scene.screens.forMonitor(i, status(), live.game.kind),
        readableCode: () => scene.screens.readableCode(this.size.w, this.size.h),
        mountOptions: () =>
          this.mountOptions(
            (how) => {
              this.room?.handoff.standUp(how);
            },
            // the desktop's saver starts exactly where the monitor's is this frame
            { saverPos: () => scene.screens.saverPosNow(), saverBase: SAVER_SCREEN.w },
          ),
        lang: () => live.lang,
        chrome: (stage) => {
          if (stage === 'pc') {
            this.pin.el.style.opacity = '0';
            this.note.style.opacity = '0';
            document.body.classList.add('at-pc');
          } else if (stage === 'leaving') document.body.classList.remove('at-pc');
          else {
            this.pin.el.style.opacity = '1';
            this.layout(); // the window may have changed while at the PC (a phone turned): fit the monitors again
            this.greet();
          }
        },
        relight: this.applyTime,
        fallback: () => {
          this.say('noDesktop');
          this.greet();
        },
        loadDesktop,
      },
      getDesktop,
    );
  }

  /** What the desktop gets from the page wherever it is mounted: in a monitor or, without 3D, on the whole page. */
  private mountOptions(
    onExit: RoomMountOptions['onExit'],
    saver?: Pick<RoomMountOptions, 'saverPos' | 'saverBase'>,
  ): RoomMountOptions {
    return {
      lang: live.lang,
      phuketTime: () => ({ h: live.time.h, m: live.time.m }),
      status,
      onExit,
      onOpenResume: () => {
        this.panels.openResume();
      },
      // the desktop's language switch moves the whole page too
      onLangChange: (lang) => {
        if (lang !== live.lang) this.setLang(lang);
      },
      // the tray's volume slider turns the room's music down too (mute is the shared switch: src/store/sound.ts)
      onVolumeChange: (volume) => {
        this.music.follow(volume);
      },
      ...saver,
    };
  }

  /** The talkie says hello: once, and only to a visitor who is in the room (not at the PC or on the way there). */
  private greet(): void {
    if (this.greeted || this.room?.handoff.atPC) return;
    this.greeted = true;
    this.tour.start(false);
  }

  /** /projects (and Back or Forward to it): the desktop with My Projects open. */
  private openProjects(): void {
    const show = (desk: RoomDesktop): void => {
      desk.openApp('projects');
    };
    const room = this.room;
    if (room) {
      if (!room.handoff.atPC) room.handoff.sitDown('L', show);
      else {
        const desk = getDesktop();
        if (desk) show(desk);
      }
    } else if (document.body.classList.contains('no-3d')) this.flat.open(show);
    // still loading: the boot follows the route once the room is built (or fails)
  }

  /** Measures the stage and fits the room to it. */
  private readonly layout = (): void => {
    this.size.w = this.stage.clientWidth || window.innerWidth;
    this.size.h = this.stage.clientHeight || window.innerHeight;
    if (this.room) fitScene(this.room, this.size.w, this.size.h, this.room.handoff.atPC);
  };

  /* ---------- the loop ---------- */

  private readonly frame = (now: number): void => {
    const dt = Math.min((now - this.lastFrame) / 1000, MAX_FRAME_S);
    this.lastFrame = now;
    this.sinceClock += dt;
    if (this.sinceClock > CLOCK_EVERY_S) {
      this.sinceClock = 0;
      if (readClock()) this.applyTime();
    }
    const room = this.room;
    if (room) {
      const atPC = room.handoff.atPC;
      const sheetOpen = this.panels.sheetOpen;
      // the (opaque) resume sheet hides the monitors, except at the PC: the desktop mirrors their live canvases
      animateScene(room, { now, dt, atPC, hovering: room.pointer.hovering, screensSeen: atPC || !sheetOpen });
      // nothing to draw while the desktop or the resume sheet covers the whole window
      if (!room.handoff.covered && !sheetOpen) this.draw(room, dt, atPC);
    }
    requestAnimationFrame(this.frame);
  };

  /** Renders the room and puts the DOM that follows it (the Projects button, the labels) where it now is. */
  private draw(room: Room, dt: number, atPC: boolean): void {
    render(room.renderer, room.scene, room.camera);
    room.anchor.getWorldPosition(this.anchorAt).project(room.camera);
    this.pin.placeOver(this.anchorAt.x, this.anchorAt.y, this.size);
    const pinOn = this.tour.isOn('projects') && !this.pin.el.hidden;
    this.pin.el.style.visibility = pinOn ? 'visible' : 'hidden';
    const view = room.view;
    view.width = this.size.w;
    view.height = this.size.h;
    view.room = !atPC;
    view.pin = pinOn && !atPC ? this.pin.box : null; // labels give way to the Projects button
    room.tags.place(view);
    this.tour.drift(dt);
  }

  /* ---------- without the room ---------- */

  /** A line at the bottom of the page (no 3D, no desktop), which stays. */
  private say(key: 'no3d' | 'noDesktop'): void {
    this.note.firstElementChild?.setAttribute('data-room-t', key);
    this.panels.applyLang(live.lang);
    this.note.style.opacity = '1';
  }

  /** No room (no WebGL, or the model failed): the desktop opens straight away, full-screen; leaving it shows the
   *  Projects button in the middle of the page, which opens it again. */
  private openWithoutRoom(): void {
    this.hideLoader();
    document.body.classList.add('no-3d');
    this.say('no3d');
    const pin = this.pin.el;
    pin.hidden = false; // measured while shown...
    this.pin.measure();
    this.pin.placeAt(window.innerWidth / 2, window.innerHeight / 2);
    pin.hidden = true; // ...but the desktop opens at once, and leaving it shows the button
    pin.style.visibility = 'visible';
    pin.style.opacity = '1';
    this.flat.open(currentRoute().sit === 'projects' ? (desk) => desk.openApp('projects') : undefined);
  }

  /** The loader fades out and the page underneath (hidden while booting, see index.html) shows. */
  private hideLoader(): void {
    this.loading.style.opacity = '0';
    document.body.classList.remove('booting');
  }

  /* ---------- debug mode ---------- */

  private debugHost(): DebugHost {
    return {
      setWeather: (kind) => {
        live.wx.forced = kind;
        this.applyTime();
      },
      setState: (state, game) => {
        if (game) this.showGame({ kind: game, name: GAME_NAMES[game] });
        const now = live.presence;
        if (!state && now?.playing) this.showGame({ kind: now.kind, name: now.game });
        // the state and the hour are independent: the light follows the hour (asleep is night anyway)
        this.preview(state, this.debugHour);
      },
      setHour: (hour) => {
        this.debugHour = hour;
        this.preview(live.forced, hour);
      },
    };
  }

  private debugHandle(room: Room): RoomDebugHandle {
    return {
      sitDown: (which) => {
        room.handoff.sitDown(which);
      },
      standUp: (how) => {
        room.handoff.standUp(how);
      },
      strike: () => {
        room.weather.strike();
      },
    };
  }
}

/** Starts the page; nothing is built before this call. */
export function startRoom(): void {
  tidyAddress(); // /resume/, an unknown path or a #fragment is tidied before anything reads the route
  new RoomApp().start();
}
