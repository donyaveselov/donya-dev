// The public resume the desktop's DocPad shows (the skills come from the stack).
import type { Bilingual } from '../../shared/types';
import { byArea, stackLine } from './stack';

const d = (ru: string, en: string): Bilingual => ({ ru, en });

export interface Job {
  org: Bilingual;
  role: Bilingual;
  /** A site, without the protocol. */
  link?: string;
  when: Bilingual;
  stack?: string;
  items: Bilingual[];
}

export interface Resume {
  title: Bilingual;
  lead: Bilingual;
  jobs: Job[];
  /** [area, its technologies] */
  skills: [Bilingual, Bilingual][];
  /** [school, years] */
  edu: [Bilingual, string][];
}

export const RESUME: Resume = {
  title: d(
    'Fullstack-разработчик · Vue 3 / Nuxt · Python / Django',
    'Fullstack developer · Vue 3 / Nuxt · Python / Django',
  ),
  lead: d(
    '4,5 года в разработке: frontend на Vue 3 с 2022 года, с 2025-го — fullstack (Django, Node.js). Живу на Пхукете, работаю удалённо.',
    '4.5 years in development: frontend on Vue 3 since 2022, fullstack since 2025 (Django, Node.js). Based in Phuket, working remotely.',
  ),
  jobs: [
    {
      org: d('Верификат', 'Verifikat'),
      role: d('Fullstack-разработчик · проектная работа', 'Fullstack developer · project work'),
      link: 'verifikat.ru',
      when: d('июль 2025 — сентябрь 2026', 'Jul 2025 — Sep 2026'),
      stack: 'Python, Django, DRF, Channels, Celery, Redis, PostgreSQL, S3, Vue 3, Pinia, Vite, Docker, GitLab CI',
      items: [
        d(
          'Разработал REST API на Django/DRF с JWT-авторизацией для двух клиентских контуров',
          'Built a REST API on Django/DRF with JWT auth for two client contours',
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
      when: d('январь 2024 — июнь 2025', 'Jan 2024 — Jun 2025'),
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
      when: d('октябрь 2022 — январь 2023', 'Oct 2022 — Jan 2023'),
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
      when: d('февраль 2022 — октябрь 2022', 'Feb 2022 — Oct 2022'),
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
