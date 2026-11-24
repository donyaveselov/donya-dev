// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/browser.js. Replace module by module; do not edit in place.
/* Browser: an Internet-Explorer-like window. Home is the portfolio start page; external sites
   cannot be embedded, so they get a friendly "cannot be displayed" page with a real link out. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;
  function d(ru, en) { return { ru: ru, en: en }; }
  var HOME = 'about:start';

  var FAVS = [
    { label: 'GitHub — le5tef', url: 'https://github.com/le5tef' },
    { label: 'Telegram — work_veselov', url: 'https://t.me/work_veselov' },
    { label: 'donya.dev', url: 'https://donya.dev' },
    { label: 'verifikat.ru', url: 'https://verifikat.ru' }
  ];

  function normalize(s) {
    s = String(s || '').trim();
    if (!s) return HOME;
    if (/^about:/i.test(s)) return s.toLowerCase();
    if (/^(home|start|старт)$/i.test(s)) return HOME;
    if (/^[a-z]+:\/\//i.test(s)) return s;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return 'https://' + s;
    return 'about:search?q=' + encodeURIComponent(s);
  }

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-browser', 560);
    var hist = [], hi = -1, loadT = null, url = HOME;

    var flag = window.XP_ICO && window.XP_ICO.startFlag;   // the Internet Explorer 6 throbber is the Windows flag
    var throbber = h('div.xpa-br-throb', { 'aria-hidden': 'true', html: flag ? X.svg('<image href="' + flag + '" width="20" height="20"/>', '0 0 20 20') : X.icons.browser });
    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Домой', en: 'Home' }, key: 'Alt+Home', action: function () { go(HOME); } },
        { label: { ru: 'Открыть в новой вкладке…', en: 'Open in a new tab…' }, disabled: function () { return !/^https?:/.test(url); }, action: function () { window.open(url, '_blank', 'noopener'); } },
        { sep: true },
        { label: { ru: 'Закрыть', en: 'Close' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Копировать адрес', en: 'Copy address' }, action: function () { X.copyText(url); } }
      ] },
      { label: { ru: 'Вид', en: 'View' }, items: [
        { label: { ru: 'Обновить', en: 'Refresh' }, key: 'F5', action: function () { load(url, false); } },
        { label: { ru: 'Строка ссылок', en: 'Links bar' }, checked: function () { return !root.classList.contains('no-links'); }, action: function () { root.classList.toggle('no-links'); } }
      ] },
      { label: { ru: 'Избранное', en: 'Favorites' }, items: FAVS.map(function (f) { return { label: f.label, action: function () { go(f.url); } }; }).concat([{ sep: true }, { label: { ru: 'Стартовая страница', en: 'Start page' }, action: function () { go(HOME); } }]) },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About' }, action: function () { U.aboutDialog({ ru: 'Навигатор', en: 'Navigator' }, { ru: 'Шифрование: 0 бит. Зато без трекеров.', en: 'Cipher strength: 0-bit. But no trackers either.' }); } }
      ] }
    ]);
    menu.appendChild(throbber);

    var bBack = U.tbtn({ g: 'back', label: { ru: 'Назад', en: 'Back' }, showLabel: true, big: true, onClick: back });
    var bFwd = U.tbtn({ g: 'fwd', label: { ru: 'Вперёд', en: 'Forward' }, big: true, onClick: fwd });
    var bStop = U.tbtn({ g: 'stop', label: { ru: 'Остановить', en: 'Stop' }, big: true, onClick: stop });
    var tb = U.toolbar([bBack, bFwd, bStop,
      U.tbtn({ g: 'refresh', label: { ru: 'Обновить', en: 'Refresh' }, big: true, onClick: function () { load(url, false); } }),
      U.tbtn({ g: 'home', label: { ru: 'Домой', en: 'Home' }, big: true, onClick: function () { go(HOME); } }),
      U.tsep(),
      U.tbtn({ g: 'star', label: { ru: 'Избранное', en: 'Favorites' }, showLabel: true, big: true, onClick: function () { go('https://github.com/le5tef'); } })
    ]);
    var addrIn = h('input', { type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': { ru: 'Адрес', en: 'Address' } });
    var addrIcon = h('span.xpa-g16', { html: X.icons.url });
    var addr = h('form.xpa-addr', { action: '#' }, [
      h('span.xpa-addr-label', { ru: 'Адрес', en: 'Address' }),
      h('div.xpa-addr-box', [addrIcon, addrIn, h('span.xpa-addr-dd', '▼')]),
      h('button.xpa-go', { type: 'submit' }, [U.glyph(X.g16.go ? 'go' : 'fwd'), h('span', { ru: 'Переход', en: 'Go' })])
    ]);
    addr.addEventListener('submit', function (e) { e.preventDefault(); U.sound('click'); go(normalize(addrIn.value)); });
    addrIn.addEventListener('focus', function () { addrIn.select(); });
    var links = h('div.xpa-br-links', [h('span.xpa-muted', { ru: 'Ссылки', en: 'Links' })].concat(FAVS.slice(0, 3).map(function (f) {
      return h('button.xpa-br-link', { type: 'button', on: { click: function () { go(f.url); } } }, [h('span.xpa-g16', { html: X.icons.url }), h('span', f.label.split(' ')[0])]);
    })));
    var view = h('div.xpa-br-view', { tabindex: '0' });
    var prog = h('div.xpa-br-prog', [h('div.xpa-br-prog-fill')]);
    var st = U.statusbar(2);
    st.cell(1).classList.add('xpa-br-zone');
    st.el.insertBefore(prog, st.cell(1));
    [menu, tb, addr, links, view, st.el].forEach(function (n) { root.appendChild(n); });

    function go(u) { if (hist[hi] !== u) { hist = hist.slice(0, hi + 1); hist.push(u); hi = hist.length - 1; } load(u, true); }
    function back() { if (hi > 0) { hi--; load(hist[hi], true); } }
    function fwd() { if (hi < hist.length - 1) { hi++; load(hist[hi], true); } }
    function stop() { clearTimeout(loadT); root.classList.remove('loading'); st.set(0, { ru: 'Остановлено', en: 'Stopped' }); }

    function load(u, anim) {
      url = u;
      addrIn.value = u;
      bBack.disabled = hi <= 0; bFwd.disabled = hi >= hist.length - 1;
      clearTimeout(loadT);
      var ext = /^https?:/i.test(u), own = /^https:\/\/([a-z0-9-]+\.)*donya\.dev(\/|$)/i.test(u), bad = ext && !own;      // my own sites open inside
      st.set(0, t({ ru: 'Открывается ', en: 'Opening page ' }) + u + '...');
      root.classList.add('loading');
      prog.firstChild.style.transition = 'none'; prog.firstChild.style.width = '0';
      void prog.offsetWidth;
      var dur = X.reduced() ? 0 : (ext ? 900 : 350);
      prog.firstChild.style.transition = 'width ' + dur + 'ms ease-out'; prog.firstChild.style.width = '100%';
      loadT = setTimeout(function () {
        root.classList.remove('loading');
        draw(u);
        st.set(0, bad ? { ru: 'Не удаётся отобразить страницу', en: 'Cannot display the webpage' } : { ru: 'Готово', en: 'Done' });
        prog.firstChild.style.transition = 'none'; prog.firstChild.style.width = '0';
        if (bad) U.sound('error');
      }, dur);
    }

    function draw(u) {
      view.innerHTML = '';
      view.scrollTop = 0;
      var ext = /^https?:/i.test(u);
      if (u === HOME) { view.appendChild(startPage()); api.win.setTitle(t({ ru: 'Даниил Иванов — стартовая страница', en: 'Daniil Ivanov — Start Page' }) + ' — ' + t({ ru: 'Навигатор', en: 'Navigator' })); }
      else if (ext && /^https:\/\/([a-z0-9-]+\.)*donya\.dev(\/|$)/i.test(u)) { view.appendChild(h('iframe.xpa-wax-frame', { src: u, title: u })); api.win.setTitle(u.replace(/^https?:\/\//, '') + ' — ' + t({ ru: 'Навигатор', en: 'Navigator' })); }
      else if (ext) { view.appendChild(errorPage(u)); api.win.setTitle(t({ ru: 'Не удаётся отобразить страницу', en: 'The page cannot be displayed' }) + ' — ' + t({ ru: 'Навигатор', en: 'Navigator' })); }
      else if (/^about:search/.test(u)) { view.appendChild(searchPage(decodeURIComponent(u.split('q=')[1] || ''))); api.win.setTitle(t({ ru: 'Поиск', en: 'Search' })); }
      else { view.appendChild(h('div.xpa-br-blank', u === 'about:blank' ? '' : t({ ru: 'Нет такой страницы: ', en: 'No such page: ' }) + u)); api.win.setTitle(u); }
      st.set(1, ext ? { ru: 'Интернет', en: 'Internet' } : { ru: 'Мой компьютер', en: 'My Computer' });
      addrIcon.innerHTML = ext ? X.icons.url : X.icons.browser;
    }

    function appLink(id, label, iconName) {
      var b = h('button.xpa-br-app', { type: 'button' }, [U.icon(iconName), h('span', label)]);
      b.addEventListener('click', function () { U.sound('click'); api.openApp(id); });
      b.addEventListener('mouseenter', function () { st.set(0, 'app://' + id); });
      b.addEventListener('mouseleave', function () { st.set(0, { ru: 'Готово', en: 'Done' }); });
      return b;
    }

    function visitorNo() {
      var n = 41;
      try { n = (+localStorage.getItem('xpa-visits') || 41) + 1; localStorage.setItem('xpa-visits', String(n)); } catch (e) { n = 42; }
      return X.pad(n, 6);
    }
    var visitor = visitorNo();

    function startPage() {
      var q = h('input.xpa-field', { type: 'search', placeholder: { ru: 'Найти на этом компьютере…', en: 'Search this computer…' }, 'aria-label': { ru: 'Поиск', en: 'Search' } });
      var form = h('form.xpa-br-search', { action: '#' }, [q, U.button({ ru: 'Найти', en: 'Search' }, null, { primary: true })]);
      form.lastChild.type = 'submit';
      form.addEventListener('submit', function (e) { e.preventDefault(); go('about:search?q=' + encodeURIComponent(q.value)); });
      return h('div.xpa-br-start', [
        h('div.xpa-br-hero', [
          h('div.xpa-br-hero-txt', [
            h('div.xpa-br-hello', { ru: 'Добро пожаловать на домашнюю страницу', en: 'Welcome to the home page of' }),
            h('h1', t(X.person.name)),
            h('div.xpa-br-role', [t(X.person.role), ' · Vue 3 / Nuxt · Python / Django']),
            h('div.xpa-br-city', ['☀ ', t(X.person.city), ' · ', h('span.xpa-br-new', 'NEW!'), ' ', t({ ru: 'открыт к предложениям', en: 'open to offers' })])
          ]),
          h('div.xpa-br-hero-art', { 'aria-hidden': 'true', html: X.icons.browser })
        ]),
        form,
        h('div.xpa-br-cols', [
          h('section.xpa-br-box', [h('h2', { ru: 'Проекты', en: 'Projects' }), h('div', X.projects.map(function (p) {
            var b = h('button.xpa-br-proj', { type: 'button' }, [U.icon(p.icon), h('span', [h('b', t(p.name)), h('br'), h('span.xpa-muted', t(p.tagline))])]);
            b.addEventListener('click', function () { U.sound('click'); api.openApp('project', { id: p.id }); });
            return b;
          }))]),
          h('section.xpa-br-box', [h('h2', { ru: 'Программы', en: 'Programs' }), h('div.xpa-br-apps', [
            appLink('resume', { ru: 'Резюме', en: 'Resume' }, 'resume'),
            appLink('contact', { ru: 'Контакты', en: 'Contact' }, 'contact'),
            appLink('about', { ru: 'О себе', en: 'About me' }, 'computer'),
            appLink('terminal', { ru: 'Консоль', en: 'Terminal' }, 'terminal'),
            appLink('minesweeper', { ru: 'Сапёр', en: 'Minesweeper' }, 'minesweeper'),
            appLink('paint', { ru: 'Кисть', en: 'Paint' }, 'paint')
          ])])
        ]),
        h('section.xpa-br-box', [h('h2', { ru: 'В интернете', en: 'On the web' }), h('ul.xpa-br-ext', X.contacts.filter(function (c) { return c.href; }).map(function (c) {
          return h('li', [h('a', { href: c.href, target: '_blank', rel: 'noopener noreferrer' }, c.value), h('span.xpa-muted', ' — ' + t(c.note))]);
        }))]),
        h('div.xpa-br-foot', [
          h('div', [t({ ru: 'Вы посетитель №', en: 'You are visitor #' }), h('span.xpa-br-counter', visitor)]),
          h('div.xpa-muted', { ru: 'Лучше всего смотреть в разрешении 1024×768. Сделано вручную, без фреймворков.', en: 'Best viewed at 1024×768. Handmade, no frameworks.' })
        ])
      ]);
    }

    function errorPage(u) {
      var host = u.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return h('div.xpa-br-err', [
        h('div.xpa-br-err-head', [h('span.xpa-ico', { html: X.icons.info }), h('h1', { ru: 'Не удаётся отобразить страницу', en: 'The page cannot be displayed' })]),
        h('p', [t({ ru: 'Страница ', en: 'The page ' }), h('b', host), t({ ru: ' живёт в настоящем интернете, а этот компьютер — внутри монитора. Встроить чужой сайт сюда нельзя (и это правильно: сайты сами запрещают так делать).', en: ' lives on the real internet, and this computer lives inside a monitor. Other sites cannot be embedded here (and rightly so: sites forbid it themselves).' })]),
        h('hr'),
        h('p', { ru: 'Попробуйте следующее:', en: 'Please try the following:' }),
        h('ul', [
          h('li', [t({ ru: 'Откройте страницу в новой вкладке: ', en: 'Open the page in a new tab: ' }), h('a.xpa-br-out', { href: u, target: '_blank', rel: 'noopener noreferrer' }, u)]),
          h('li', [t({ ru: 'Нажмите кнопку ', en: 'Click the ' }), h('button.xpa-br-inl', { type: 'button', on: { click: back } }, { ru: 'Назад', en: 'Back' }), t({ ru: ', чтобы вернуться.', en: ' button to go back.' })]),
          h('li', { ru: 'Проверьте, существует ли интернет в 2003 году.', en: 'Check whether the internet exists in 2003.' }),
          h('li', [t({ ru: 'Или вернитесь на ', en: 'Or return to the ' }), h('button.xpa-br-inl', { type: 'button', on: { click: function () { go(HOME); } } }, { ru: 'стартовую страницу', en: 'start page' }), '.'])
        ]),
        h('p.xpa-muted.xpa-br-tech', ['HTTP 418 — ', t({ ru: 'Я монитор', en: 'I\'m a monitor' }), h('br'), t({ ru: 'Навигатор', en: 'Navigator' })])
      ]);
    }

    function searchPage(q) {
      var ql = q.toLowerCase();
      var hits = [];
      Object.keys(X.appAliases).forEach(function (k) { if (ql && (k.indexOf(ql) >= 0 || ql.indexOf(k) >= 0) && hits.indexOf(X.appAliases[k]) < 0) hits.push(X.appAliases[k]); });
      X.projects.forEach(function (p) { var hay = (p.id + ' ' + p.name.ru + ' ' + p.name.en + ' ' + p.stack.join(' ')).toLowerCase(); if (ql && hay.indexOf(ql) >= 0) hits.push('project:' + p.id); });
      return h('div.xpa-br-start', [
        h('h2', [t({ ru: 'Результаты поиска: ', en: 'Search results: ' }), h('b', q)]),
        hits.length ? h('ul.xpa-br-results', hits.map(function (id) {
          var isP = id.indexOf('project:') === 0, p = isP ? X.findProject(id.slice(8)) : null;
          var b = h('button.xpa-br-inl', { type: 'button' }, isP ? t(p.name) : id + '.exe');
          b.addEventListener('click', function () { if (isP) api.openApp('project', { id: p.id }); else api.openApp(id); });
          return h('li', [b, h('span.xpa-muted', isP ? ' — ' + t(p.tagline) : '')]);
        })) : h('p', { ru: 'Ничего не найдено. Попробуйте «vue», «django», «resume» или «mines».', en: 'Nothing found. Try "vue", "django", "resume" or "mines".' })
      ]);
    }

    root.addEventListener('keydown', function (e) {
      if (e.key === 'F5') { e.preventDefault(); load(url, false); }
      else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); fwd(); }
      else if (e.altKey && e.key === 'Home') { e.preventDefault(); go(HOME); }
      else if (e.key === 'Escape') stop();
    });
    view.addEventListener('mouseover', function (e) { var a = e.target.closest && e.target.closest('a[href]'); if (a) st.set(0, a.href); });

    U.bind(function () { draw(url); st.set(0, { ru: 'Готово', en: 'Done' }); });
    go(normalize(api.params && api.params.url) || HOME);
    U.onCleanup(function () { clearTimeout(loadT); });
    return U.destroy;
  }

  X.register({
    id: 'browser',
    title: { ru: 'Навигатор', en: 'Navigator' },
    icon: X.icons.browser,
    desktop: true,
    startMenu: 'pinned',
    defaultSize: { w: 720, h: 520 },
    minSize: { w: 300, h: 260 },
    singleton: true,
    render: render
  });
})();

export {};
