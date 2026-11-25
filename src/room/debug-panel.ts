// The debug panel: pick what I am doing, the time of day, the weather, the fly-in speed, the PS1 look. It is loaded
// only in debug mode (src/shared/debug.ts), so visitors download neither this code nor its styles. Every button
// carries data-debug="row:choice" (time:sunset, state:dota, ...) for scripts; the visible labels are in Russian.
import type { GameKind, Status } from '../shared/types';
import { PREVIEW_HOURS } from './clock';
import type { WeatherKind } from './weather';
import './debug-panel.css';

export interface DebugHost {
  /** a status (with a game for play), or null for the schedule */
  setState(state: Status | null, game: GameKind | null): void;
  setHour(hour: number | null): void;
  setWeather(kind: WeatherKind | null): void;
  setSlow(k: number): void;
  setPs1(on: boolean): void;
  slow: number;
  ps1: boolean;
}

/** One choice of a row: its data-debug id, its label, the value a click passes on. */
type Option<T> = readonly [id: string, label: string, value: T];

/** One row: a label and buttons, the pressed one marked; a click presses it and passes its value on. */
function row<T>(
  box: HTMLElement,
  id: string,
  label: string,
  options: readonly Option<T>[],
  initial: T,
  pick: (v: T) => void,
): void {
  const line = document.createElement('div');
  const lab = document.createElement('b');
  lab.textContent = label;
  line.appendChild(lab);
  for (const [choice, text, value] of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.dataset.debug = `${id}:${choice}`;
    b.setAttribute('aria-pressed', String(value === initial));
    b.addEventListener('click', () => {
      line.querySelectorAll('button').forEach((x) => {
        x.setAttribute('aria-pressed', String(x === b));
      });
      pick(value);
    });
    line.appendChild(b);
  }
  box.appendChild(line);
}

type StateChoice = readonly [Status, GameKind | null] | null;

export function makeDebugPanel(host: DebugHost): HTMLElement {
  const box = document.createElement('div');
  box.className = 'dbg';
  row<StateChoice>(
    box,
    'state',
    'debug',
    [
      ['auto', 'auto', null],
      ['work', 'работаю', ['work', null]],
      ['dota', 'Dota', ['play', 'dota']],
      ['cs', 'CS', ['play', 'cs']],
      ['other', 'другая игра', ['play', 'other']],
      ['sleep', 'сплю', ['sleep', null]],
      ['outside', 'на улице', ['outside', null]],
    ],
    null,
    (v) => {
      host.setState(v ? v[0] : null, v ? v[1] : null);
    },
  );
  row<number | null>(
    box,
    'time',
    'время',
    [
      ['auto', 'auto', null],
      ['day', 'день', PREVIEW_HOURS.day],
      ['sunset', 'закат', PREVIEW_HOURS.sunset],
      ['night', 'ночь', PREVIEW_HOURS.night],
    ],
    null,
    (v) => {
      host.setHour(v);
    },
  );
  row<WeatherKind | null>(
    box,
    'weather',
    'погода',
    [
      ['auto', 'auto', null],
      ['clear', 'ясно', 'clear'],
      ['cloud', 'облачно', 'cloud'],
      ['rain', 'дождь', 'rain'],
      ['storm', 'гроза', 'storm'],
    ],
    null,
    (v) => {
      host.setWeather(v);
    },
  );
  row(
    box,
    'flight',
    'полёт',
    [
      ['slow', '×20', 20],
      ['normal', 'обычный', 1],
    ],
    host.slow,
    (v) => {
      host.setSlow(v);
    },
  );
  row(
    box,
    'ps1',
    'ps1',
    [
      ['on', 'вкл', true],
      ['off', 'выкл', false],
    ],
    host.ps1,
    (v) => {
      host.setPs1(v);
    },
  );
  document.body.appendChild(box);
  return box;
}
