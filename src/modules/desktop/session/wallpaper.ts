// The wallpapers Windows XP shipped with: Bliss is inlined, the rest load from <wallBase><id>.jpg on demand.
import { XP_WALL } from '../icons';
import { timeOfDay } from '../taskbar/clock';
import { domOrNull, S } from '../store/state';
import { L } from '../strings';
import { asset } from '../../../utils/asset';

export const WALLS: readonly (readonly [id: string, ru: string, en: string])[] = [
  ['bliss', 'Безмятежность', 'Bliss'],
  ['ascent', 'Восхождение', 'Ascent'],
  ['autumn', 'Осень', 'Autumn'],
  ['azul', 'Лазурь', 'Azul'],
  ['blue-hills', 'Голубые холмы', 'Blue hills'],
  ['crystal', 'Кристалл', 'Crystal'],
  ['follow', 'Следы', 'Follow'],
  ['friend', 'Друг', 'Friend'],
  ['home', 'Дом', 'Home'],
  ['moon-flower', 'Лунный цветок', 'Moon flower'],
  ['peace', 'Мир', 'Peace'],
  ['power', 'Мощь', 'Power'],
  ['purple-flower', 'Пурпурный цветок', 'Purple flower'],
  ['radiance', 'Сияние', 'Radiance'],
  ['red-moon-desert', 'Красная луна в пустыне', 'Red moon desert'],
  ['ripple', 'Рябь', 'Ripple'],
  ['stonehenge', 'Стоунхендж', 'Stonehenge'],
  ['sunset', 'Закат', 'Sunset'],
  ['tulips', 'Тюльпаны', 'Tulips'],
  ['vortec-space', 'Космический вихрь', 'Vortec space'],
  ['water-lilies', 'Водяные лилии', 'Water lilies'],
  ['wind', 'Ветер', 'Wind'],
  ['winter', 'Зима', 'Winter'],
];

const wall = (id: string) => WALLS.find((w) => w[0] === id);

export function wallLabel(id: string): string {
  const w = wall(id);
  return w ? w[S.lang === 'ru' ? 1 : 2] : L('wall_none');
}

const PLAIN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true"><rect width="800" height="600" fill="#3A6EA5"/></svg>';

export function wallSVG(id: string): string {
  if (!wall(id)) return PLAIN;
  const src = id === 'bliss' ? XP_WALL : `${S.opts?.wallBase ?? asset('wall/')}${id}.jpg`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="600" fill="#3A6EA5"/><image href="${src}" width="800" height="600"/></svg>`;
}

/** Paints the wallpaper and the time-of-day class; skipped when neither changed, unless forced. */
export function paintWall(force = false): void {
  const R = domOrNull();
  if (!R) return;
  const tod = timeOfDay();
  const key = `${S.prefs.wall}/${tod}`;
  if (!force && R.wall.getAttribute('data-k') === key) return;
  R.wall.setAttribute('data-k', key);
  R.wall.innerHTML = wallSVG(S.prefs.wall);
  R.root.classList.remove('xp--day', 'xp--dusk', 'xp--night');
  R.root.classList.add(`xp--${tod}`);
}
