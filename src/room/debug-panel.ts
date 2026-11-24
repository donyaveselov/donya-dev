// The debug panel (temporary): pick what I am doing, the time of day, the weather, the fly-in speed, the PS1 look.
// The regression harness finds its rows by their Russian labels and its buttons by their text.
import type { GameKind, Status } from '../shared/types';
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

/** One row: a label and buttons, the pressed one marked; a click presses it and passes its value on. */
function row<T>(
  box: HTMLElement,
  label: string,
  options: readonly (readonly [string, T])[],
  initial: T,
  pick: (v: T) => void,
): void {
  const line = document.createElement('div');
  const lab = document.createElement('b');
  lab.textContent = label;
  line.appendChild(lab);
  for (const [text, value] of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
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
    'debug',
    [
      ['auto', null],
      ['работаю', ['work', null]],
      ['Dota', ['play', 'dota']],
      ['CS', ['play', 'cs']],
      ['другая игра', ['play', 'other']],
      ['сплю', ['sleep', null]],
      ['на улице', ['outside', null]],
    ],
    null,
    (v) => {
      host.setState(v ? v[0] : null, v ? v[1] : null);
    },
  );
  row<number | null>(
    box,
    'время',
    [
      ['auto', null],
      ['день', 13],
      ['закат', 18.2],
      ['ночь', 1.5],
    ],
    null,
    (v) => {
      host.setHour(v);
    },
  );
  row<WeatherKind | null>(
    box,
    'погода',
    [
      ['auto', null],
      ['ясно', 'clear'],
      ['облачно', 'cloud'],
      ['дождь', 'rain'],
      ['гроза', 'storm'],
    ],
    null,
    (v) => {
      host.setWeather(v);
    },
  );
  row(
    box,
    'полёт',
    [
      ['×20', 20],
      ['обычный', 1],
    ],
    host.slow,
    (v) => {
      host.setSlow(v);
    },
  );
  row(
    box,
    'ps1',
    [
      ['вкл', true],
      ['выкл', false],
    ],
    host.ps1,
    (v) => {
      host.setPs1(v);
    },
  );
  document.body.appendChild(box);
  return box;
}
