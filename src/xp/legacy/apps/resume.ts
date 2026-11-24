// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/resume.js. Replace module by module; do not edit in place.
/* Resume: a WordPad-like document viewer with the public resume, bilingual. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;

  function d(ru, en) { return { ru: ru, en: en }; }

  var R = {
    title: d('Fullstack-разработчик · Vue 3 / Nuxt · Python / Django', 'Fullstack developer · Vue 3 / Nuxt · Python / Django'),
    lead: d('4,5 года в разработке: frontend на Vue 3 с 2022 года, с 2025-го — fullstack (Django, Node.js). Живу на Пхукете, работаю удалённо.',
      '4.5 years in development: frontend on Vue 3 since 2022, fullstack since 2025 (Django, Node.js). Based in Phuket, working remotely.'),
    jobs: [
      { org: d('Верификат', 'Verifikat'), role: d('Fullstack-разработчик · проектная работа', 'Fullstack developer · project work'), link: 'verifikat.ru', when: d('июль 2025 — сентябрь 2026', 'Jul 2025 — Sep 2026'),
        stack: 'Python, Django, DRF, Channels, Celery, Redis, PostgreSQL, S3, Vue 3, Pinia, Vite, Docker, GitLab CI',
        items: [
          d('Разработал REST API на Django/DRF с JWT-авторизацией для двух клиентских контуров', 'Built a REST API on Django/DRF with JWT auth for two client contours'),
          d('Реализовал генерацию партий кодов на Celery с прогрессом по WebSocket, отменой и перезапуском', 'Implemented batch code generation on Celery with WebSocket progress, cancel and restart'),
          d('Сделал экспорт QR-кодов в PDF и ZIP для партий до ~800 тыс. кодов', 'Built QR export to PDF and ZIP for batches of up to ~800k codes'),
          d('Вынес общую UI-библиотеку на Vue 3 для трёх SPA с публикацией в GitLab Package Registry', 'Extracted a shared Vue 3 UI library for three SPAs, published to the GitLab Package Registry'),
          d('Перенёс инфраструктуру с Yandex Serverless на Docker Compose + Caddy, собрал CI/CD в GitLab', 'Moved the infrastructure from Yandex Serverless to Docker Compose + Caddy, set up CI/CD in GitLab')
        ] },
      { org: d('Крипто-финтех стартап', 'Crypto fintech startup'), role: d('Frontend-разработчик', 'Frontend developer'), when: d('январь 2024 — июнь 2025', 'Jan 2024 — Jun 2025'),
        stack: 'Vue 3, Pinia, Vue Router, Vite, Axios, vue-i18n, vee-validate, ApexCharts, Docker, GitLab CI',
        items: [
          d('С нуля написал фронтенд: мультиролевое модульное SPA и приложение платёжной страницы', 'Wrote the frontend from scratch: a multi-role modular SPA and a payment page app'),
          d('Разработал собственную UI-библиотеку вместо готового фреймворка: datatable, select, stepper', 'Built an in-house UI library instead of an off-the-shelf framework: datatable, select, stepper'),
          d('Написал Pinia-плагины для CRUD и пагинации с отменой устаревших запросов; кэш справочников с TTL', 'Wrote Pinia plugins for CRUD and pagination with cancellation of stale requests; a TTL cache for reference data'),
          d('Реализовал silent refresh JWT без гонок при параллельных 401; 2FA (TOTP), SSO, RBAC', 'Implemented race-free silent JWT refresh on parallel 401s; 2FA (TOTP), SSO, RBAC'),
          d('Сделал редактор тем: вся палитра генерируется из одного цвета; white-label сборки под бренды', 'Built a theme editor that derives the whole palette from one colour; white-label builds for brands')
        ] },
      { org: d('Whai Thai', 'Whai Thai'), role: d('Frontend-разработчик', 'Frontend developer'), when: d('октябрь 2022 — январь 2023', 'Oct 2022 — Jan 2023'),
        items: [d('Разработал CRM: шахматка бронирований с drag-and-drop, ролевой доступ (Vue 3, TypeScript)', 'Built a CRM: a drag-and-drop booking grid with role-based access (Vue 3, TypeScript)')] },
      { org: d('RANKS LLC', 'RANKS LLC'), role: d('Junior Frontend-разработчик', 'Junior frontend developer'), when: d('февраль 2022 — октябрь 2022', 'Feb 2022 — Oct 2022'),
        items: [d('Разработал интернет-магазин с оплатой и генерацией PDF-отчётов с графиками (Vue 2, Vuex, Chart.js)', 'Built an online store with payments and PDF reports with charts (Vue 2, Vuex, Chart.js)')] }
    ],
    skills: X.stack.byArea().map(function (g) { return [g.title, d(X.stack.line(g.id, 'ru'), X.stack.line(g.id, 'en'))]; }),   // from stack.js
    edu: [
      [d('Университет «Синергия», Москва — бизнес-информатика, бакалавр', 'Synergy University, Moscow — Business Informatics, BSc'), '2022–2026'],
      [d('РГУ им. А. Н. Косыгина, Москва — информатика и вычислительная техника (перевод)', 'Kosygin Russian State University, Moscow — Computer Science (transferred)'), '2020–2022']
    ]
  };

  function contactsText(t) {
    return t(X.person.name) + ' — ' + t(X.person.role) + '\n' + X.contacts.map(function (c) { return t(c.label) + ': ' + c.value; }).join('\n');
  }

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-resume', 600);
    var zoom = 100, wrap = true, showRuler = true;
    var fmt = { b: false, i: false, u: false };

    function printJoke() {
      if (X.reduced()) { printDialog(); return; }
      var sheet = h('div.xpa-res-sheet', { 'aria-hidden': 'true' }, [h('i'), h('i'), h('i'), h('i')]);
      root.appendChild(sheet);
      U.later(1100, function () { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); printDialog(); });
    }
    function printDialog() {
      U.dialog({ title: { ru: 'Печать', en: 'Print' }, icon: 'warn',
        text: t({ ru: 'Принтер «HP LaserJet в комнате» не отвечает.\nПохоже, он снова печатает чей-то билет на самолёт.\n\nСовет: Файл → Копировать контакты работает всегда.', en: 'Printer "LaserJet in the room" is not responding.\nIt seems to be printing someone\'s boarding pass again.\n\nTip: File → Copy contacts always works.' }),
        buttons: [{ label: { ru: 'Копировать контакты', en: 'Copy contacts' }, primary: true, onClick: function () { X.copyText(contactsText(t)); } }, { label: { ru: 'Отмена', en: 'Cancel' } }] });
    }
    function setZoom(z) { zoom = Math.max(60, Math.min(160, z)); page.style.fontSize = (12 * zoom / 100) + 'px'; zoomSel.value = String(zoom); st.set(2, zoom + '%'); }

    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Печать…', en: 'Print…' }, key: 'Ctrl+P', action: printJoke },
        { label: { ru: 'Предварительный просмотр', en: 'Print Preview' }, action: function () { root.classList.toggle('preview'); } },
        { label: { ru: 'Копировать контакты', en: 'Copy contacts' }, action: function () { copyBtn.click(); } },
        { sep: true },
        { label: { ru: 'Выход', en: 'Exit' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Выделить всё', en: 'Select All' }, key: 'Ctrl+A', action: selectAll },
        { label: { ru: 'Копировать выделенное', en: 'Copy selection' }, key: 'Ctrl+C', action: function () { X.copyText(String(window.getSelection ? window.getSelection() : '')); } }
      ] },
      { label: { ru: 'Вид', en: 'View' }, items: [
        { label: { ru: 'Линейка', en: 'Ruler' }, checked: function () { return showRuler; }, action: function () { showRuler = !showRuler; ruler.style.display = showRuler ? '' : 'none'; } },
        { label: { ru: 'Перенос по ширине окна', en: 'Wrap to window' }, checked: function () { return wrap; }, action: function () { wrap = !wrap; root.classList.toggle('nowrap', !wrap); } },
        { sep: true },
        { label: { ru: 'Крупнее', en: 'Zoom in' }, key: 'Ctrl++', action: function () { setZoom(zoom + 10); } },
        { label: { ru: 'Мельче', en: 'Zoom out' }, key: 'Ctrl+-', action: function () { setZoom(zoom - 10); } }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About' }, action: function () { U.aboutDialog({ ru: 'ДокПад — просмотр резюме', en: 'DocPad — resume viewer' }, { ru: 'PDF-версия тоже существует, но эта красивее.', en: 'A PDF version exists too, but this one is prettier.' }); } }
      ] }
    ]);

    var copyBtn = U.copyButton(function () { return contactsText(t); }, { label: { ru: 'Копировать контакты', en: 'Copy contacts' }, onCopied: function (ok) { if (ok) { try { api.balloon({ title: { ru: 'Буфер обмена', en: 'Clipboard' }, text: { ru: 'Контакты скопированы. Жду сообщения!', en: 'Contacts copied. Looking forward to your message!' } }); } catch (e) { /* no balloon */ } } } });
    copyBtn.classList.add('xpa-res-copy');
    function fmtBtn(k, label, title) {
      var g = X.g16[{ b: 'bold', i: 'italic', u: 'underline' }[k]];   // WordPad's own B / I / U bitmaps when loaded
      var b = h('button.xpa-tb.xpa-fmt-' + k, { type: 'button', title: title, 'aria-pressed': 'false' }, g ? h('span.xpa-fmt-l.xpa-g16', { html: g }) : h('span.xpa-fmt-l', label));
      b.addEventListener('click', function () { fmt[k] = !fmt[k]; b.classList.toggle('on', fmt[k]); b.setAttribute('aria-pressed', String(fmt[k])); page.classList.toggle('f-' + k, fmt[k]); U.sound('click'); });
      return b;
    }
    var fontSel = h('select.xpa-field.xpa-res-font', { 'aria-label': { ru: 'Шрифт', en: 'Font' } }, [h('option', 'Tahoma'), h('option', 'Verdana'), h('option', 'Georgia'), h('option', 'Courier New')]);
    fontSel.addEventListener('change', function () { page.style.fontFamily = fontSel.value + ', sans-serif'; });
    var zoomSel = h('select.xpa-field.xpa-res-zoom', { 'aria-label': { ru: 'Масштаб', en: 'Zoom' } }, [80, 90, 100, 110, 125, 150].map(function (z) { return h('option', { value: String(z) }, z + '%'); }));
    zoomSel.value = '100';
    zoomSel.addEventListener('change', function () { setZoom(+zoomSel.value); });

    var tb = U.toolbar([
      U.tbtn({ g: 'print', label: { ru: 'Печать', en: 'Print' }, big: true, onClick: printJoke }),
      U.tbtn({ g: 'preview', label: { ru: 'Предварительный просмотр', en: 'Print Preview' }, big: true, onClick: function () { root.classList.toggle('preview'); } }),
      U.tsep(),
      fontSel, zoomSel,
      U.tsep(),
      fmtBtn('b', 'B', { ru: 'Полужирный', en: 'Bold' }), fmtBtn('i', 'I', { ru: 'Курсив', en: 'Italic' }), fmtBtn('u', 'U', { ru: 'Подчёркнутый', en: 'Underline' }),
      U.tsep(),
      copyBtn
    ]);

    var ruler = h('div.xpa-ruler', { 'aria-hidden': 'true' }, [h('div.xpa-ruler-in')]);
    var page = h('article.xpa-res-page.xpa-selectable');
    var scroller = h('div.xpa-res-scroll', { tabindex: '0' }, [page]);
    var st = U.statusbar(3);
    [menu, tb, ruler, scroller, st.el].forEach(function (n) { root.appendChild(n); });

    function selectAll() {
      try { var r = document.createRange(); r.selectNodeContents(page); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* ignore */ }
    }

    function build() {
      page.innerHTML = '';
      var lang0 = U.lang();
      var contactLine = h('div.xpa-res-contacts', X.contacts.map(function (c) {
        return h('span', [h('span.xpa-muted', t(c.label) + ': '), c.href ? h('a', { href: c.href, target: '_blank', rel: 'noopener noreferrer' }, c.value) : h('span', c.value)]);
      }));
      page.appendChild(h('header.xpa-res-head', [
        h('div.xpa-res-photo', { 'aria-hidden': 'true' }, lang0 === 'ru' ? 'ДИ' : 'DI'),
        h('div.xpa-grow', [h('h1', t(X.person.name)), h('div.xpa-res-role', t(R.title)), h('div.xpa-res-city', t(X.person.city)), contactLine])
      ]));
      page.appendChild(h('p.xpa-res-lead', t(R.lead)));
      function sec(ru, en) { return h('h2', [h('span', ru), h('span.xpa-res-alt', ' / ' + en)]); }
      var lang = U.lang();
      page.appendChild(lang === 'ru' ? sec('Опыт работы', 'Experience') : sec('Experience', 'Опыт работы'));
      R.jobs.forEach(function (j) {
        page.appendChild(h('section.xpa-res-job', [
          h('div.xpa-res-jhead', [h('b', t(j.org)), h('span', ' — ' + t(j.role)), j.link ? h('span', [' · ', h('a', { href: 'https://' + j.link, target: '_blank', rel: 'noopener noreferrer' }, j.link)]) : null, h('span.xpa-res-when', t(j.when))]),
          j.stack ? h('div.xpa-res-stack', j.stack) : null,
          h('ul', j.items.map(function (x) { return h('li', t(x)); }))
        ]));
      });
      page.appendChild(lang === 'ru' ? sec('Навыки', 'Skills') : sec('Skills', 'Навыки'));
      page.appendChild(h('dl.xpa-res-skills', R.skills.map(function (s) { return [h('dt', t(s[0])), h('dd', t(s[1]))]; })));
      page.appendChild(lang === 'ru' ? sec('Образование', 'Education') : sec('Education', 'Образование'));
      page.appendChild(h('ul.xpa-res-edu', R.edu.map(function (e) { return h('li', [h('span', t(e[0])), h('span.xpa-res-when', e[1])]); })));
      page.appendChild(h('div.xpa-res-end', '— ' + t({ ru: 'конец документа', en: 'end of document' }) + ' —'));
      api.win.setTitle(t({ ru: 'Резюме — Иванов Даниил.rtf — ДокПад', en: 'Resume — Daniil Ivanov.rtf — DocPad' }));
      st.set(0, t({ ru: 'Для справки нажмите F1', en: 'For Help, press F1' }));
      st.set(1, t({ ru: 'Стр. 1 из 1', en: 'Page 1 of 1' }));
      st.set(2, zoom + '%');
    }
    root.addEventListener('keydown', function (e) {
      if (e.key === 'F1') { e.preventDefault(); U.aboutDialog({ ru: 'ДокПад', en: 'DocPad' }, { ru: 'Справка: читайте сверху вниз. Контакты в шапке.', en: 'Help: read from top to bottom. Contacts are at the top.' }); }
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'p') { e.preventDefault(); printJoke(); }
      else if (e.key === 'a') { e.preventDefault(); selectAll(); }
      else if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(zoom + 10); }
      else if (e.key === '-') { e.preventDefault(); setZoom(zoom - 10); }
    });
    U.bind(build);
    U.later(30, function () { scroller.focus({ preventScroll: true }); });
    return U.destroy;
  }

  X.register({
    id: 'resume',
    title: { ru: 'Резюме', en: 'Resume' },
    icon: X.icons.resume,
    desktop: true,
    startMenu: 'pinned',
    defaultSize: { w: 700, h: 560 },
    minSize: { w: 300, h: 240 },
    singleton: true,
    render: render
  });
})();

export {};
