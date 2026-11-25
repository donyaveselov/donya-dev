// The projects on the desktop (the Projects folder, their documents, the terminal and the browser). Adding a project
// is adding one object here; each shot's kind names a picture in apps/mocks (an unknown kind gets a plain frame).
import type { Bilingual, Lang } from '../types';

export interface Shot {
  kind: string;
  title: Bilingual;
}

export interface Project {
  id: string;
  /** A key of the app icons. */
  icon: 'verifikat' | 'wax' | 'kompy';
  name: Bilingual;
  tagline: Bilingual;
  type: Bilingual;
  period: Bilingual;
  role: Bilingual;
  url: string;
  repo?: string;
  /** The desktop program that shows the live site in its own window; without one the site opens in Navigator. */
  site?: {
    app: string;
    /** The query parameter the site takes its language from. */
    langParam?: string;
  };
  summary: Bilingual;
  stack: string[];
  highlights: Bilingual[];
  shots: Shot[];
}

export const PROJECTS: readonly Project[] = [
  {
    id: 'verifikat',
    icon: 'verifikat',
    name: { ru: 'Верификат', en: 'Verifikat' },
    tagline: { ru: 'Проверка подлинности товаров по QR-коду', en: 'Product authenticity check by QR code' },
    type: { ru: 'Коммерческий проект', en: 'Commercial project' },
    period: { ru: 'июль 2025 — сентябрь 2026', en: 'Jul 2025 — Sep 2026' },
    role: { ru: 'Fullstack-разработчик, проектная работа', en: 'Fullstack developer, project work' },
    url: 'https://verifikat.ru',
    summary: {
      ru: 'B2B-платформа: производители проходят модерацию и получают партии уникальных кодов, печатают их как QR на упаковке, а покупатель сканирует код и видит, что товар настоящий. Я делал бэкенд, фоновую генерацию и экспорт кодов, общую UI-библиотеку для трёх фронтендов и переезд инфраструктуры.',
      en: 'A B2B platform: manufacturers pass moderation and receive batches of unique codes, print them as QR codes on packaging, and a buyer scans one to see that the product is genuine. I built the backend, background code generation and export, a shared UI library for three frontends, and moved the infrastructure.',
    },
    stack: [
      'Python',
      'Django',
      'DRF',
      'SimpleJWT',
      'Celery',
      'Redis',
      'Channels',
      'PostgreSQL',
      'S3',
      'Vue 3',
      'Pinia',
      'Vite',
      'Docker Compose',
      'Caddy',
      'GitLab CI',
    ],
    highlights: [
      {
        ru: 'REST API на Django/DRF с двумя контурами JWT-авторизации: сотрудники платформы и производители. Права в виде строк, общие для API и фронта, и журнал действий сотрудников.',
        en: 'REST API on Django/DRF with two JWT audiences: platform staff and manufacturers. String permissions shared by the API and the frontend, plus an audit log of staff actions.',
      },
      {
        ru: 'Генерация партий кодов на Celery: большие партии уходят в фон, прогресс приходит по WebSocket (Channels) с троттлингом, есть отмена и перезапуск.',
        en: 'Batch code generation on Celery: large batches go to the background, progress arrives over WebSocket (Channels) with throttling, and jobs can be cancelled and restarted.',
      },
      {
        ru: 'Экспорт QR в векторный PDF для печати на ленте и в ZIP для партий до ~800 тыс. кодов. Постраничный генератор вместо одного большого документа: память больше не растёт с размером партии.',
        en: 'QR export to vector PDF for print tape and to ZIP, for batches of up to ~800k codes. A page-by-page generator instead of one huge document keeps memory flat regardless of batch size.',
      },
      {
        ru: 'Модерация товаров и партий как конечный автомат плюс чат производителя с поддержкой в реальном времени.',
        en: 'Moderation of products and batches as a state machine, plus a real-time chat between manufacturers and support.',
      },
      {
        ru: 'Общая UI-библиотека на Vue 3 для трёх SPA (админка, кабинет производителя, публичный сайт), публикация в GitLab Package Registry из CI.',
        en: 'A shared Vue 3 UI library for three SPAs (admin panel, manufacturer dashboard, public site), published to the GitLab Package Registry from CI.',
      },
      {
        ru: 'Переезд с Yandex Serverless на Docker Compose + Caddy с автоматическим HTTPS, CI/CD в GitLab. Бэкенд покрыт тестами (600+).',
        en: 'Moved from Yandex Serverless to Docker Compose + Caddy with automatic HTTPS, CI/CD in GitLab. The backend is covered by 600+ tests.',
      },
    ],
    shots: [
      { kind: 'verify', title: { ru: 'Проверка кода покупателем', en: 'A buyer checks a code' } },
      { kind: 'batches', title: { ru: 'Портал производителя: партии кодов', en: 'Manufacturer portal: code batches' } },
      {
        kind: 'exports',
        title: { ru: 'Портал производителя: экспорт кодов в PDF', en: 'Manufacturer portal: exporting codes to PDF' },
      },
    ],
  },
  {
    id: 'wax',
    icon: 'wax',
    name: { ru: 'Wax', en: 'Wax' },
    tagline: {
      ru: 'Промоакция: спрятанные стаканчики с ваксом и QR-коды',
      en: 'A promo: hidden cups of skate wax with QR codes',
    },
    type: { ru: 'Свой проект, открытый код', en: 'Own project, open source' },
    period: { ru: '2026', en: '2026' },
    role: { ru: 'Автор: идея, 3D, фронтенд', en: 'Author: idea, 3D, frontend' },
    url: 'https://wax.donya.dev',
    repo: 'https://github.com/donyaveselov/wax',
    site: { app: 'wax', langParam: 'lang' },
    summary: {
      ru: 'Когда-то я продавал наждачки для скейтбордов и устроил акцию: прятал по городу стаканчики с ваксом, а на дне каждого был QR-код. Нашедший сканировал его и попадал на этот сайт: промокод из ссылки расшифровывается в цвет стаканчика, стаканчик появляется в 3D именно этого цвета, а говорилка поздравляет с подарком. Сейчас проект переписан на TypeScript и выложен в открытый доступ, есть демо без кода.',
      en: "I used to sell skateboard griptape and ran a promo: I hid cups of skate wax around the city with a QR code on the bottom of each. Whoever found one scanned it and landed on this site: the promo code in the link decodes into the cup's colour, the cup appears in 3D in exactly that colour, and a talking mouth congratulates you on the gift. The project is now rewritten in TypeScript and open source, with a demo that needs no code.",
    },
    stack: ['Vue 3', 'TypeScript', 'Vite', 'three.js', 'Vitest', 'ESLint', 'GitHub Actions'],
    highlights: [
      {
        ru: 'Промокод кодирует цвет: шифр Виженера плюс контрольная сумма CRC-8, случайная строка проходит примерно 1 раз из 12 000. Коды для любого цвета выдаёт CLI-генератор.',
        en: 'The promo code encodes a colour: a Vigenère cipher plus a CRC-8 checksum, so a random string passes about once in 12,000. A CLI generator issues codes for any colour.',
      },
      {
        ru: '3D-сцена на three.js: модель стаканчика, анимация раскрытия на одном таймлайне с плавными переходами, полная очистка WebGL при уходе со страницы.',
        en: 'A three.js scene: the cup model, a reveal animation on one eased timeline, and full WebGL cleanup when you leave the page.',
      },
      {
        ru: 'Говорилка с пиксельным ртом печатает реплики; русский и английский с автоопределением языка, название цвета склоняется («тебе попался розовый вакс»).',
        en: 'A talking pixel mouth types the lines; Russian and English with language detection, and the colour gets a proper name ("you found a pink wax").',
      },
      {
        ru: 'Строгий TypeScript, тесты кодека и таймлайна на Vitest, линтер и CI в GitHub Actions.',
        en: 'Strict TypeScript, Vitest tests for the codec and the timeline, linting and CI on GitHub Actions.',
      },
    ],
    shots: [
      {
        kind: 'wax-landing',
        title: { ru: 'Без кода: говорилка спрашивает промокод', en: 'No code: the mouth asks for a promo code' },
      },
      {
        kind: 'wax-reveal',
        title: { ru: 'Код принят: стаканчик нужного цвета', en: 'Code accepted: the cup in its colour' },
      },
    ],
  },
  {
    id: 'kompy',
    icon: 'kompy',
    name: { ru: 'Компи', en: 'Kompi' },
    tagline: {
      ru: 'Подбор страны и визового маршрута для переезда',
      en: 'Finds a country and a visa route for relocation',
    },
    type: { ru: 'Свой проект, в работе', en: 'Own project, in progress' },
    period: { ru: 'с сентября 2026', en: 'since Sep 2026' },
    role: {
      ru: 'Автор: продукт, бэкенд, фронтенд, бот, деплой',
      en: 'Author: product, backend, frontend, bot, deployment',
    },
    url: 'https://kompy.app',
    site: { app: 'kompy-app' },
    summary: {
      ru: 'Человек проходит квиз: гражданство, доход, сбережения, семья, цели, отношение к рискам. Движок прогоняет профиль по 21 стране и примерно 140 визовым маршрутам и отдаёт топ стран с объяснением, почему подходит каждая. Полный отчёт приходит PDF-файлом от Telegram-бота. Вокруг этого: гайды по странам на трёх языках, новостной канал и своя аналитика.',
      en: 'A person takes a quiz: citizenship, income, savings, family, goals, attitude to risk. The engine runs the profile through 21 countries and about 140 visa routes and returns the top countries with the reasons each one fits. The full report arrives as a PDF from a Telegram bot. Around it: country guides in three languages, a news channel and in-house analytics.',
    },
    stack: [
      'Vue 3',
      'TypeScript',
      'Pinia',
      'Vite',
      'vue-i18n',
      'Python',
      'Django 5',
      'django-ninja',
      'aiogram 3',
      'SQLite (WAL)',
      'WeasyPrint',
      'Playwright',
      'Docker Compose',
      'Traefik',
    ],
    highlights: [
      {
        ru: 'Движок рекомендаций в два шага: сначала отсев маршрутов, которые не проходят по жёстким условиям, потом ранжирование оставшихся. Результат детерминированный, и к каждой стране приложены причины.',
        en: 'A two-step recommendation engine: first it gates out routes that fail hard requirements, then ranks the rest. The result is deterministic and every country comes with its reasons.',
      },
      {
        ru: 'Адаптивный квиз: после базовых вопросов бэкенд считает трёх кандидатов и добавляет вопросы только про них.',
        en: 'An adaptive quiz: after the base questions the backend computes three candidates and adds questions only about them.',
      },
      {
        ru: 'Отчёт собирается в PDF из HTML и CSS (WeasyPrint) и уходит пользователю в Telegram. Бот на aiogram, вход на сайт через него же по одноразовой ссылке.',
        en: 'The report is built as a PDF from HTML and CSS (WeasyPrint) and sent to the user in Telegram. The bot runs on aiogram and also signs users in to the site with a one-time link.',
      },
      {
        ru: 'Публичные гайды по странам отдаёт Django на трёх языках (ru, en, es), квиз работает как SPA с пре-рендером. Один домен, маршруты делит Traefik.',
        en: 'Public country guides are served by Django in three languages (ru, en, es), while the quiz is a pre-rendered SPA. One domain, with Traefik splitting the routes.',
      },
      {
        ru: 'Новостной канал: посты по расписанию готовит AI-агент, а публикует человек кнопкой в боте.',
        en: 'A news channel: an AI agent drafts posts on a schedule, and a human publishes them with a button in the bot.',
      },
      {
        ru: "Своя аналитика без сторонних счётчиков, с определением страны по офлайн-базе. Четыре контейнера в Docker Compose, TLS от Let's Encrypt, e2e-тесты на Playwright без выхода в интернет.",
        en: "In-house analytics with no third-party counters and country lookup from an offline database. Four containers in Docker Compose, TLS from Let's Encrypt, Playwright e2e tests that never touch the internet.",
      },
    ],
    shots: [
      { kind: 'kompy-quiz', title: { ru: 'Квиз: первый шаг, гражданство', en: 'The quiz: step one, citizenship' } },
      {
        kind: 'kompy-report',
        title: { ru: 'Результат: страна, маршрут и причины', en: 'The result: the country, the route and the reasons' },
      },
      {
        kind: 'kompy-pdf',
        title: {
          ru: 'PDF-отчёт от бота: обложка и страница страны',
          en: 'The PDF report from the bot: cover and a country page',
        },
      },
    ],
  },
];

export function findProject(id: string): Project | null {
  return PROJECTS.find((p) => p.id === id) ?? null;
}

/** The app that shows a project's live site. */
export const siteApp = (p: Project): string => p.site?.app ?? 'browser';

/** The address a project's site opens at, in the language when the site takes one. */
export function siteUrl(p: Project, lang: Lang): string {
  const q = p.site?.langParam;
  return `${p.url}/${q ? `?${q}=${lang}` : ''}`;
}
