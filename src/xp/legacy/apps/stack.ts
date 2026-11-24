// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/stack.js. Replace module by module; do not edit in place.
/* The tech stack: the single source for every place on the desktop that plays with it
   (Device Manager in "My Computer", the resume's skills block, `skills` in the terminal).
   To add or rename a technology, edit it here only.

   XPApps.stack.devices  - hardware-style categories, each with an area and its items:
                           { area, cat: {ru,en}, glyph, items: [{ name: string|{ru,en}, note: {ru,en}|null }] }
   XPApps.stack.areas    - plain areas in display order: [{ id, title: {ru,en} }]
   XPApps.stack.byArea() - [{ id, title, items: [...] }] with the devices merged per area
   XPApps.stack.line(id, lang) - "Vue 3, Nuxt 3/4, ..." for one area */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;
  function d(ru, en) { return { ru: ru, en: en }; }
  function it(name, note) { return { name: name, note: note || null }; }

  var areas = [
    { id: 'frontend', title: d('Frontend', 'Frontend') },
    { id: 'backend', title: d('Backend', 'Backend') },
    { id: 'testing', title: d('Тестирование', 'Testing') },
    { id: 'devops', title: d('DevOps', 'DevOps') }
  ];

  var devices = [
    { area: 'frontend', cat: d('Видеоадаптеры (frontend)', 'Display adapters (frontend)'), glyph: 'views', items: [
      it('Vue 3', d('Основной драйвер с 2022 года. Composition API, свои UI-библиотеки.', 'Primary driver since 2022. Composition API, in-house UI libraries.')),
      it('Nuxt 3/4'),
      it('Pinia', d('Включая собственные плагины для CRUD и пагинации.', 'Including custom plugins for CRUD and pagination.')),
      it('Vue Router'), it('TypeScript'), it('Vite'), it('Tailwind CSS'),
      it('React, React Native', d('Совместимый драйвер. Работает, когда попросят.', 'Compatible driver. Works when asked.'))
    ] },
    { area: 'backend', cat: d('Контроллеры (backend)', 'Controllers (backend)'), glyph: 'props', items: [
      it('Python'),
      it('Django, DRF', d('REST API, два контура JWT, права и аудит.', 'REST APIs, two JWT contours, permissions and audit.')),
      it('Celery', d('Фоновые задачи с прогрессом, отменой и перезапуском.', 'Background jobs with progress, cancel and restart.')),
      it('Node.js (Bun, Hono, Drizzle)'), it('WebSocket')
    ] },
    { area: 'backend', cat: d('Запоминающие устройства', 'Storage devices'), glyph: 'folders', items: [
      it('PostgreSQL'), it('Redis'),
      it('S3', d('Presigned URL, приватные и публичные бакеты.', 'Presigned URLs, private and public buckets.'))
    ] },
    { area: 'devops', cat: d('Сетевые адаптеры', 'Network adapters'), glyph: 'link', items: [
      it('Caddy', d('Автоматический HTTPS из коробки.', 'Automatic HTTPS out of the box.')), it('Nginx'), it('Traefik')
    ] },
    { area: 'testing', cat: d('Устройства тестирования', 'Test devices'), glyph: 'search', items: [
      it('Vitest'), it('Playwright (e2e)'),
      it('Stryker', d('Мутационное тестирование: проверяет, что тесты что-то проверяют.', 'Mutation testing: checks that the tests actually test something.')),
      it('pytest'), it(d('Контрактные тесты по OpenAPI', 'OpenAPI contract tests'))
    ] },
    { area: 'devops', cat: d('Системные устройства (DevOps)', 'System devices (DevOps)'), glyph: 'computer', items: [
      it('Docker, Docker Compose'), it('GitLab CI/CD'), it('GitHub Actions'), it('Linux')
    ] }
  ];

  function name(item, lang) { return typeof item.name === 'string' ? item.name : (item.name[lang] || item.name.en); }
  function byArea() {
    // system devices before network adapters inside devops, as a resume would list them
    return areas.map(function (a) {
      var groups = devices.filter(function (g) { return g.area === a.id; });
      if (a.id === 'devops') groups.sort(function (p, q) { return (p.glyph === 'computer' ? 0 : 1) - (q.glyph === 'computer' ? 0 : 1); });
      var items = [];
      groups.forEach(function (g) { items = items.concat(g.items); });
      return { id: a.id, title: a.title, items: items };
    });
  }
  function line(id, lang) {
    var a = byArea().filter(function (x) { return x.id === id; })[0];
    return a ? a.items.map(function (i) { return name(i, lang); }).join(', ') : '';
  }

  X.stack = { areas: areas, devices: devices, byArea: byArea, line: line, name: name };
})();

export {};
