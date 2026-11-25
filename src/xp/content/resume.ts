// The public resume the desktop's DocPad shows (the skills come from the stack).
import type { Bilingual } from '../../shared/types';
import { byArea, stackLine } from './stack';
import { HEADLINE } from './profile';
import { d } from './text';
import { EXPERIENCE } from '../../shared/experience';

/** A month as [year, month 1-12]. */
export type YearMonth = readonly [number, number];

export interface Job {
  org: Bilingual;
  role: Bilingual;
  /** A site, without the protocol. */
  link?: string;
  from: YearMonth;
  /** null: to the present. */
  to: YearMonth | null;
  stack?: string;
  items: Bilingual[];
}

export interface Resume {
  title: Bilingual;
  lead: Bilingual;
  /** The most recent first (see jobOrder). */
  jobs: Job[];
  /** [area, its technologies] */
  skills: [Bilingual, Bilingual][];
  /** [school, years] */
  edu: [Bilingual, string][];
}

const MONTHS_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "июль 2025 — сентябрь 2026" / "Jul 2025 — Sep 2026"; an open job ends with "наст. время" / "present". */
export function jobPeriod(job: Pick<Job, 'from' | 'to'>): Bilingual {
  const at = ([y, m]: YearMonth, names: readonly string[]): string => `${names[m - 1] ?? ''} ${String(y)}`;
  return d(
    `${at(job.from, MONTHS_RU)} — ${job.to ? at(job.to, MONTHS_RU) : 'наст. время'}`,
    `${at(job.from, MONTHS_EN)} — ${job.to ? at(job.to, MONTHS_EN) : 'present'}`,
  );
}

/** Sorts jobs the way a resume lists them: the latest end first (an open job before any other), then the latest start. */
export function jobOrder(a: Pick<Job, 'from' | 'to'>, b: Pick<Job, 'from' | 'to'>): number {
  // an open job ends later than any month
  const key = (ym: YearMonth | null): number => (ym ? ym[0] * 12 + ym[1] : Number.MAX_SAFE_INTEGER);
  return key(b.to) - key(a.to) || key(b.from) - key(a.from);
}

export const RESUME: Resume = {
  title: d(`Fullstack-разработчик · ${HEADLINE.join(' · ')}`, `Fullstack developer · ${HEADLINE.join(' · ')}`),
  lead: d(
    `${EXPERIENCE.ru} в разработке: frontend на Vue 3 с 2022 года, с 2025-го — fullstack (Django, Node.js). Живу на Пхукете, работаю удалённо.`,
    `${EXPERIENCE.en} in development: frontend on Vue 3 since 2022, fullstack since 2025 (Django, Node.js). Based in Phuket, working remotely.`,
  ),
  jobs: [
    {
      // the employer is under NDA: the desktop never names it or its repositories (see nda.test.ts)
      org: d('Проект под NDA', 'NDA project'),
      role: d('Frontend-разработчик · частичная занятость', 'Frontend developer · part-time'),
      from: [2023, 1],
      to: null,
      stack: 'Vue 3, Pinia, Vue Router, PrimeVue, Vite, Axios, Chart.js, Leaflet, Telegram Mini Apps',
      items: [
        d(
          'Расширил Pinia собственной опцией defineStore: CRUD, пагинация и фильтры для любого стора',
          'Extended Pinia with its own defineStore option: CRUD, pagination and filters for any store',
        ),
        d(
          'Спроектировал API-слой: прозрачное обновление токена с повтором запроса, отмена запросов',
          'Designed the API layer: transparent token refresh with request retry, request cancellation',
        ),
        d(
          'Разработал SPA-дашборд с собственным UI-китом и графиками на чистом SVG',
          'Built an SPA dashboard with its own UI kit and charts in plain SVG',
        ),
        d(
          'Сделал Telegram Mini App: авторизация по initData + JWT, оплата в Telegram Stars, моки из OpenAPI',
          'Built a Telegram Mini App: initData + JWT auth, Telegram Stars payments, mocks from OpenAPI',
        ),
      ],
    },
    {
      org: d('Верификат', 'Verifikat'),
      role: d('Fullstack-разработчик · проектная работа', 'Fullstack developer · project work'),
      link: 'verifikat.ru',
      from: [2025, 7],
      to: [2026, 9],
      stack: 'Python, Django, DRF, Channels, Celery, Redis, PostgreSQL, S3, Vue 3, Pinia, Vite, Docker, GitLab CI',
      items: [
        d(
          'Разработал REST API на Django/DRF с JWT-авторизацией для двух клиентских контуров',
          'Built a REST API on Django/DRF with JWT auth for two separate client areas',
        ),
        d(
          'Реализовал генерацию партий кодов на Celery с прогрессом по WebSocket, отменой и перезапуском',
          'Implemented batch code generation on Celery with WebSocket progress, cancel and restart',
        ),
        d(
          'Сделал экспорт QR-кодов в PDF и ZIP для партий до ~800 тыс. кодов',
          'Built QR export to PDF and ZIP for batches of up to ~800k codes',
        ),
        d(
          'Вынес общую UI-библиотеку на Vue 3 для трёх SPA с публикацией в GitLab Package Registry',
          'Extracted a shared Vue 3 UI library for three SPAs, published to the GitLab Package Registry',
        ),
        d(
          'Перенёс инфраструктуру с Yandex Serverless на Docker Compose + Caddy, собрал CI/CD в GitLab',
          'Moved the infrastructure from Yandex Serverless to Docker Compose + Caddy, set up CI/CD in GitLab',
        ),
      ],
    },
    {
      org: d('Крипто-финтех стартап', 'Crypto fintech startup'),
      role: d('Frontend-разработчик', 'Frontend developer'),
      from: [2024, 1],
      to: [2025, 6],
      stack: 'Vue 3, Pinia, Vue Router, Vite, Axios, vue-i18n, vee-validate, ApexCharts, Docker, GitLab CI',
      items: [
        d(
          'С нуля написал фронтенд: мультиролевое модульное SPA и приложение платёжной страницы',
          'Wrote the frontend from scratch: a multi-role modular SPA and a payment page app',
        ),
        d(
          'Разработал собственную UI-библиотеку вместо готового фреймворка: datatable, select, stepper',
          'Built an in-house UI library instead of an off-the-shelf framework: datatable, select, stepper',
        ),
        d(
          'Написал Pinia-плагины для CRUD и пагинации с отменой устаревших запросов; кэш справочников с TTL',
          'Wrote Pinia plugins for CRUD and pagination with cancellation of stale requests; a TTL cache for reference data',
        ),
        d(
          'Реализовал silent refresh JWT без гонок при параллельных 401; 2FA (TOTP), SSO, RBAC',
          'Implemented race-free silent JWT refresh on parallel 401s; 2FA (TOTP), SSO, RBAC',
        ),
        d(
          'Сделал редактор тем: вся палитра генерируется из одного цвета; white-label сборки под бренды',
          'Built a theme editor that derives the whole palette from one colour; white-label builds for brands',
        ),
      ],
    },
    {
      org: d('Whai Thai', 'Whai Thai'),
      role: d('Frontend-разработчик', 'Frontend developer'),
      from: [2022, 10],
      to: [2023, 1],
      items: [
        d(
          'Разработал CRM: шахматка бронирований с drag-and-drop, ролевой доступ (Vue 3, TypeScript)',
          'Built a CRM: a drag-and-drop booking grid with role-based access (Vue 3, TypeScript)',
        ),
      ],
    },
    {
      org: d('RANKS LLC', 'RANKS LLC'),
      role: d('Junior Frontend-разработчик', 'Junior frontend developer'),
      from: [2022, 2],
      to: [2022, 10],
      items: [
        d(
          'Разработал интернет-магазин с оплатой и генерацией PDF-отчётов с графиками (Vue 2, Vuex, Chart.js)',
          'Built an online store with payments and PDF reports with charts (Vue 2, Vuex, Chart.js)',
        ),
      ],
    },
  ],
  skills: byArea().map((g): [Bilingual, Bilingual] => [g.title, d(stackLine(g.id, 'ru'), stackLine(g.id, 'en'))]),
  edu: [
    [
      d(
        'Университет «Синергия», Москва — бизнес-информатика, бакалавр',
        'Synergy University, Moscow — Business Informatics, BSc',
      ),
      '2022–2026',
    ],
    [
      d(
        'РГУ им. А. Н. Косыгина, Москва — информатика и вычислительная техника (перевод)',
        'Kosygin Russian State University, Moscow — Computer Science (transferred)',
      ),
      '2020–2022',
    ],
  ],
};
