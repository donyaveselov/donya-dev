// The debug panel: pick what I am doing, the time of day, the weather. It is loaded only in debug mode
// (src/utils/debug.ts), so visitors download neither this code nor its styles. The labels are in Russian, and
// scripts/regress.mjs finds the buttons by them.
import type { GameKind, Status } from '../../../types';
import { PREVIEW_HOURS } from '../store/clock';
import type { WeatherKind } from '../../../services/weather.service';
import './debug-panel.css';

export interface DebugHost {
  /** a status (with a game for play), or null for the schedule */
  setState(state: Status | null, game: GameKind | null): void;
  setHour(hour: number | null): void;
  setWeather(kind: WeatherKind | null): void;
}

/** One choice of a row: its label, the value a click passes on. */
type Option<T> = readonly [label: string, value: T];

/** One row: a label and buttons, the pressed one marked; a click presses it and passes its value on. */
function row<T>(
  box: HTMLElement,
  label: string,
  options: readonly Option<T>[],
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
      ['день', PREVIEW_HOURS.day],
      ['закат', PREVIEW_HOURS.sunset],
      ['ночь', PREVIEW_HOURS.night],
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
  document.body.appendChild(box);
  return box;
}
