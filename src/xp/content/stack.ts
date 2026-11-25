// The tech stack: the single source for every place on the desktop that plays with it (Device Manager in "My
// Computer", the resume's skills block, `skills` in the terminal). To add or rename a technology, edit it here only.
import type { Bilingual, Lang } from '../../shared/types';
import { d } from './text';

export type Area = 'frontend' | 'backend' | 'testing' | 'devops';

export interface StackItem {
  name: string | Bilingual;
  note: Bilingual | null;
}

/** A hardware-style category of Device Manager. */
export interface DeviceGroup {
  area: Area;
  cat: Bilingual;
  /** A toolbar glyph name. */
  glyph: string;
  items: StackItem[];
}

const it = (name: string | Bilingual, note: Bilingual | null = null): StackItem => ({ name, note });

/** The plain areas, in display order. */
export const AREAS: readonly { id: Area; title: Bilingual }[] = [
  { id: 'frontend', title: d('Frontend', 'Frontend') },
  { id: 'backend', title: d('Backend', 'Backend') },
  { id: 'testing', title: d('Тестирование', 'Testing') },
  { id: 'devops', title: d('DevOps', 'DevOps') },
];

export const DEVICES: readonly DeviceGroup[] = [
  {
    area: 'frontend',
    cat: d('Видеоадаптеры (frontend)', 'Display adapters (frontend)'),
    glyph: 'views',
    items: [
      it(
        'Vue 3',
        d(
          'Основной драйвер с 2022 года. Composition API, свои UI-библиотеки.',
          'Primary driver since 2022. Composition API, in-house UI libraries.',
        ),
      ),
      it('Nuxt 3/4'),
      it(
        'Pinia',
        d('Включая собственные плагины для CRUD и пагинации.', 'Including custom plugins for CRUD and pagination.'),
      ),
      it('Vue Router'),
      it('TypeScript'),
      it('Vite'),
      it('Tailwind CSS'),
      it(
        'React, React Native',
        d('Совместимый драйвер. Работает, когда попросят.', 'Compatible driver. Works when asked.'),
      ),
    ],
  },
  {
    area: 'backend',
    cat: d('Контроллеры (backend)', 'Controllers (backend)'),
    glyph: 'props',
    items: [
      it('Python'),
      it(
        'Django, DRF',
        d('REST API, два контура JWT, права и аудит.', 'REST APIs, two JWT audiences, permissions and audit.'),
      ),
      it(
        'Celery',
        d('Фоновые задачи с прогрессом, отменой и перезапуском.', 'Background jobs with progress, cancel and restart.'),
      ),
      it('Node.js (Bun, Hono, Drizzle)'),
      it('WebSocket'),
    ],
  },
  {
    area: 'backend',
    cat: d('Запоминающие устройства', 'Storage devices'),
    glyph: 'folders',
    items: [
      it('PostgreSQL'),
      it('Redis'),
      it('S3', d('Presigned URL, приватные и публичные бакеты.', 'Presigned URLs, private and public buckets.')),
    ],
  },
  {
    area: 'devops',
    cat: d('Сетевые адаптеры', 'Network adapters'),
    glyph: 'link',
    items: [
      it('Caddy', d('Автоматический HTTPS из коробки.', 'Automatic HTTPS out of the box.')),
      it('Nginx'),
      it('Traefik'),
    ],
  },
  {
    area: 'testing',
    cat: d('Устройства тестирования', 'Test devices'),
    glyph: 'search',
    items: [
      it('Vitest'),
      it('Playwright (e2e)'),
      it(
        'Stryker',
        d(
          'Мутационное тестирование: проверяет, что тесты что-то проверяют.',
          'Mutation testing: checks that the tests actually test something.',
        ),
      ),
      it('pytest'),
      it(d('Контрактные тесты по OpenAPI', 'OpenAPI contract tests')),
    ],
  },
  {
    area: 'devops',
    cat: d('Системные устройства (DevOps)', 'System devices (DevOps)'),
    glyph: 'computer',
    items: [it('Docker, Docker Compose'), it('GitLab CI/CD'), it('GitHub Actions'), it('Linux')],
  },
];

export const itemName = (item: StackItem, lang: Lang): string =>
  typeof item.name === 'string' ? item.name : item.name[lang];

/** The devices merged per area. */
export function byArea(): { id: Area; title: Bilingual; items: StackItem[] }[] {
  return AREAS.map((a) => {
    const groups = DEVICES.filter((g) => g.area === a.id);
    // system devices before network adapters inside devops, as a resume would list them
    if (a.id === 'devops') groups.sort((p, q) => (p.glyph === 'computer' ? 0 : 1) - (q.glyph === 'computer' ? 0 : 1));
    return { id: a.id, title: a.title, items: groups.flatMap((g) => g.items) };
  });
}

/** "Vue 3, Nuxt 3/4, ..." for one area. */
export function stackLine(id: Area, lang: Lang): string {
  const a = byArea().find((x) => x.id === id);
  return a ? a.items.map((i) => itemName(i, lang)).join(', ') : '';
}
