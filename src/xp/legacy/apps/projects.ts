// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/projects.js. Replace module by module; do not edit in place.
/* My Projects: an Explorer-style window (projects) and a document window per project (project). */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;

  var README = {
    ru: 'Привет! Это папка с проектами.\r\n\r\nКаждая подпапка — один проект: описание, «скриншоты»,\r\nстек и ссылка, если проект публичный.\r\n\r\nДвойной щелчок открывает, Backspace — на уровень вверх,\r\nAlt+← / Alt+→ — назад и вперёд.\r\n\r\nСтарые проекты лежат в Корзине. Восстановить их нельзя.\r\nМы пробовали.',
    en: 'Hi! This is the projects folder.\r\n\r\nEach subfolder is one project: an overview, "screenshots",\r\nthe stack and a link when the project is public.\r\n\r\nDouble-click opens, Backspace goes up a level,\r\nAlt+Left / Alt+Right go back and forward.\r\n\r\nOld projects live in the Recycle Bin. They cannot be restored.\r\nWe tried.'
  };

  function stackText(p, t) {
    return t(p.name) + ' — ' + t({ ru: 'стек', en: 'stack' }) + '\r\n' + new Array(32).join('=') + '\r\n\r\n' +
      p.stack.map(function (s) { return '  * ' + s; }).join('\r\n') + '\r\n';
  }

  /* items of a folder. path: [] (root) or [projectId] */
  function listItems(path, t) {
    if (!path.length) {
      var items = X.projects.map(function (p) {
        return { key: p.id, kind: 'folder', icon: p.icon, name: p.name, type: { ru: 'Папка проекта', en: 'Project folder' }, desc: p.tagline, sub: p.type, open: { path: [p.id] } };
      });
      items.push({ key: 'readme', kind: 'file', icon: 'txt', name: 'README.txt', type: { ru: 'Текстовый документ', en: 'Text Document' }, desc: { ru: 'Как пользоваться этой папкой', en: 'How to use this folder' }, sub: '1 KB', open: { app: 'notepad', params: { title: 'README.txt', text: README } } });
      return items;
    }
    var p = X.findProject(path[0]);
    if (!p) return [];
    var out = [{ key: 'doc', kind: 'file', icon: 'doc', name: { ru: t(p.name) + ' — обзор.doc', en: t(p.name) + ' — overview.doc' }, type: { ru: 'Документ', en: 'Document' }, desc: p.summary, sub: p.period, open: { app: 'project', params: { id: p.id } } }];
    p.shots.forEach(function (s, i) {
      out.push({ key: 'shot' + i, kind: 'file', icon: 'image', name: (s.kind + '.png'), type: { ru: 'Изображение PNG', en: 'PNG Image' }, desc: s.title, sub: s.title, open: { app: 'project', params: { id: p.id, shot: i } } });
    });
    out.push({ key: 'stack', kind: 'file', icon: 'txt', name: 'stack.txt', type: { ru: 'Текстовый документ', en: 'Text Document' }, desc: { ru: 'Технологии проекта', en: 'Technologies used' }, sub: p.stack.length + ' ' + t({ ru: 'строк', en: 'lines' }), open: { app: 'notepad', params: { title: 'stack.txt', text: { ru: stackText(p, function (d) { return d.ru || d; }), en: stackText(p, function (d) { return d.en || d; }) } } } });
    if (p.repo) out.push({ key: 'repo', kind: 'file', icon: 'url', name: 'github.url', type: { ru: 'Интернет-ярлык', en: 'Internet Shortcut' }, desc: p.repo, sub: p.repo.replace(/^https?:\/\//, ''), open: { app: 'browser', params: { url: p.repo } } });
    if (p.url) out.push({ key: 'url', kind: 'file', icon: 'url', name: p.url.replace(/^https?:\/\//, '') + '.url', type: { ru: 'Интернет-ярлык', en: 'Internet Shortcut' }, desc: p.url, sub: p.url.replace(/^https?:\/\//, ''), open: { app: 'browser', params: { url: p.url } } });
    return out;
  }

  /* ================================================================ Explorer */
  function renderExplorer(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-explorer', 560);
    var state = { path: [], back: [], fwd: [], sel: -1, view: 'tiles', items: [] };
    if (api.params && api.params.path) state.path = api.params.path.slice();

    function folderTitle(path) {
      if (!path.length) return { ru: 'Мои проекты', en: 'My Projects' };
      var p = X.findProject(path[0]); return p ? p.name : { ru: '?', en: '?' };
    }
    function addr(path) {
      var base = t({ ru: 'C:\\Пользователи\\Даниил\\Мои проекты', en: 'C:\\Users\\Daniil\\My Projects' });
      return path.length ? base + '\\' + t(folderTitle(path)) : base;
    }

    /* menus */
    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Открыть', en: 'Open' }, key: 'Enter', action: function () { openSel(); }, disabled: function () { return state.sel < 0; } },
        { label: { ru: 'Свойства', en: 'Properties' }, key: 'Alt+Enter', action: function () { props(); }, disabled: function () { return state.sel < 0; } },
        { sep: true },
        { label: { ru: 'Закрыть', en: 'Close' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Копировать путь', en: 'Copy address' }, action: function () { X.copyText(addr(state.path)); } },
        { label: { ru: 'Выделить следующий', en: 'Select next' }, key: '\u2192', action: function () { select(Math.min(state.items.length - 1, state.sel + 1)); } }
      ] },
      { label: { ru: 'Вид', en: 'View' }, items: [
        { label: { ru: 'Плитка', en: 'Tiles' }, radio: true, checked: function () { return state.view === 'tiles'; }, action: function () { setView('tiles'); } },
        { label: { ru: 'Значки', en: 'Icons' }, radio: true, checked: function () { return state.view === 'icons'; }, action: function () { setView('icons'); } },
        { label: { ru: 'Таблица', en: 'Details' }, radio: true, checked: function () { return state.view === 'details'; }, action: function () { setView('details'); } },
        { sep: true },
        { label: { ru: 'Панель задач', en: 'Task pane' }, checked: function () { return !root.classList.contains('no-pane'); }, action: function () { root.classList.toggle('no-pane'); } }
      ] },
      { label: { ru: 'Переход', en: 'Go' }, items: [
        { label: { ru: 'Назад', en: 'Back' }, key: 'Alt+\u2190', action: function () { goBack(); }, disabled: function () { return !state.back.length; } },
        { label: { ru: 'Вперёд', en: 'Forward' }, key: 'Alt+\u2192', action: function () { goFwd(); }, disabled: function () { return !state.fwd.length; } },
        { label: { ru: 'Вверх', en: 'Up one level' }, key: 'Backspace', action: function () { goUp(); }, disabled: function () { return !state.path.length; } }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About' }, action: function () { U.aboutDialog({ ru: 'Проводник проектов', en: 'Project Explorer' }, { ru: 'Здесь только то, что можно показать. Остальное под NDA и в памяти.', en: 'Only what can be shown lives here. The rest is under NDA and in memory.' }); } }
      ] }
    ]);

    var bBack = U.tbtn({ g: 'back', label: { ru: 'Назад', en: 'Back' }, showLabel: true, big: true, onClick: goBack });
    var bFwd = U.tbtn({ g: 'fwd', label: { ru: 'Вперёд', en: 'Forward' }, big: true, onClick: goFwd });
    var bUp = U.tbtn({ g: 'up', label: { ru: 'Вверх', en: 'Up' }, big: true, onClick: goUp });
    var bViews = U.tbtn({ g: 'views', label: { ru: 'Вид', en: 'Views' }, drop: true, big: true, onClick: function () { setView(state.view === 'tiles' ? 'icons' : state.view === 'icons' ? 'details' : 'tiles'); } });
    var bPane = U.tbtn({ g: 'folders', label: { ru: 'Папки', en: 'Folders' }, showLabel: true, big: true, onClick: function () { root.classList.toggle('no-pane'); } });
    var tb = U.toolbar([bBack, bFwd, bUp, U.tsep(), bPane, U.tsep(), bViews]);

    var addrText = h('span.xpa-addr-text.xpa-selectable');
    var addrIcon = h('span.xpa-g16');
    var addrBar = h('div.xpa-addr', [
      h('span.xpa-addr-label', { ru: 'Адрес', en: 'Address' }),
      h('div.xpa-addr-box', [addrIcon, addrText, h('span.xpa-addr-dd', '\u25BC')]),
      h('button.xpa-go', { type: 'button', on: { click: function () { U.sound('click'); render(); } } }, [U.glyph(X.g16.go ? 'go' : 'fwd'), h('span', { ru: 'Переход', en: 'Go' })])
    ]);

    /* task pane */
    function tpBox(title, body) {
      var box = h('div.xpa-tp-box');
      var head = h('button.xpa-tp-head', { type: 'button', 'aria-expanded': 'true' }, [h('span', title), h('span.xpa-tp-chev', '\u25B2')]);
      head.addEventListener('click', function () { var c = box.classList.toggle('collapsed'); head.setAttribute('aria-expanded', String(!c)); });
      box.appendChild(head); box.appendChild(h('div.xpa-tp-body', body));
      return box;
    }
    function tpLink(g, label, fn) { return h('button.xpa-tp-link', { type: 'button', on: { click: function () { U.sound('click'); fn(); } } }, [U.glyph(g), h('span', label)]); }
    var tasksBody = h('div');
    var details = h('div.xpa-tp-details');
    var pane = h('div.xpa-taskpane', [
      tpBox({ ru: 'Задачи', en: 'Project Tasks' }, [tasksBody]),
      tpBox({ ru: 'Другие места', en: 'Other Places' }, [
        tpLink('props', { ru: 'Резюме', en: 'Resume' }, function () { api.openApp('resume'); }),
        tpLink('send', { ru: 'Написать мне', en: 'Contact me' }, function () { api.openApp('contact'); }),
        tpLink('home', { ru: 'Стартовая страница', en: 'Start page' }, function () { api.openApp('browser'); }),
        tpLink('trash', { ru: 'Корзина', en: 'Recycle Bin' }, function () { api.openApp('recycle'); })
      ]),
      tpBox({ ru: 'Подробно', en: 'Details' }, [details])
    ]);

    var view = h('div.xpa-ex-view', { tabindex: '0', role: 'listbox', 'aria-label': { ru: 'Содержимое папки', en: 'Folder contents' } });
    var st = U.statusbar(2);
    var body = h('div.xpa-ex-body', [pane, view]);
    [menu, tb, addrBar, body, st.el].forEach(function (n) { root.appendChild(n); });

    function navigate(path, push) {
      if (push !== false) { state.back.push(state.path); state.fwd = []; }
      state.path = path; state.sel = -1;
      render(true);
    }
    function goBack() { if (!state.back.length) return; state.fwd.push(state.path); state.path = state.back.pop(); state.sel = -1; render(true); }
    function goFwd() { if (!state.fwd.length) return; state.back.push(state.path); state.path = state.fwd.pop(); state.sel = -1; render(true); }
    function goUp() { if (state.path.length) navigate([]); }
    function setView(v) { state.view = v; render(); }

    function openItem(it) {
      if (!it) return;
      U.sound('click');
      if (it.open.path) navigate(it.open.path);
      else api.openApp(it.open.app, it.open.params);
    }
    function openSel() { openItem(state.items[state.sel]); }
    function props() {
      var it = state.items[state.sel]; if (!it) return;
      U.dialog({ title: t({ ru: 'Свойства: ', en: 'Properties: ' }) + t(it.name), icon: 'info', text: t(it.type) + '\n\n' + t(it.desc), buttons: [{ label: 'OK', primary: true }] });
    }
    function select(i, focusIt) {
      state.sel = i;
      Array.prototype.forEach.call(view.querySelectorAll('.xpa-ex-item'), function (el, k) { el.classList.toggle('sel', k === i); el.setAttribute('aria-selected', String(k === i)); });
      var el = view.querySelectorAll('.xpa-ex-item')[i];
      if (el && focusIt !== false) el.scrollIntoView({ block: 'nearest' });
      updateSide();
    }

    function updateSide() {
      var it = state.items[state.sel];
      details.innerHTML = '';
      if (it) {
        details.appendChild(h('b', t(it.name)));
        details.appendChild(h('div', t(it.type)));
        details.appendChild(h('div.xpa-muted', t(it.desc)));
        st.set(0, t(it.type) + ': ' + t(it.desc));
      } else {
        var ft = folderTitle(state.path);
        details.appendChild(h('b', t(ft)));
        details.appendChild(h('div', t({ ru: 'Папка с файлами', en: 'File Folder' })));
        st.set(0, state.items.length + ' ' + t({ ru: 'объектов', en: 'objects' }));
      }
      tasksBody.innerHTML = '';
      tasksBody.style.display = 'grid'; tasksBody.style.gap = '6px';
      if (it) tasksBody.appendChild(tpLink('fwd', { ru: 'Открыть «' + t(it.name) + '»', en: 'Open "' + t(it.name) + '"' }, openSel));
      var p = state.path.length ? X.findProject(state.path[0]) : null;
      if (p) {
        tasksBody.appendChild(tpLink('props', { ru: 'Обзор проекта', en: 'Project overview' }, function () { api.openApp('project', { id: p.id }); }));
        if (p.url) tasksBody.appendChild(tpLink('link', { ru: 'Открыть сайт', en: 'Visit the site' }, function () { api.openApp(p.id === 'wax' ? 'wax' : p.id === 'kompy' ? 'kompy-app' : 'browser', { url: p.url }); }));
        if (p.repo) tasksBody.appendChild(tpLink('link', { ru: 'Код на GitHub', en: 'Code on GitHub' }, function () { window.open(p.repo, '_blank', 'noopener'); }));
        tasksBody.appendChild(tpLink('up', { ru: 'На уровень вверх', en: 'Up one level' }, goUp));
      } else {
        X.projects.forEach(function (pp) { tasksBody.appendChild(tpLink('folders', pp.name, function () { navigate([pp.id]); })); });
      }
    }

    function render(navigated) {
      state.items = listItems(state.path, t);
      api.win.setTitle(t(folderTitle(state.path)));
      addrText.textContent = addr(state.path);
      addrIcon.innerHTML = X.g16.folders;
      bBack.disabled = !state.back.length; bFwd.disabled = !state.fwd.length; bUp.disabled = !state.path.length;
      view.className = 'xpa-ex-view v-' + state.view + (navigated && !X.reduced() ? ' entering' : '');
      view.innerHTML = '';
      if (state.view === 'details') {
        view.appendChild(h('div.xpa-ex-dhead', [h('span', { ru: 'Имя', en: 'Name' }), h('span', { ru: 'Тип', en: 'Type' }), h('span', { ru: 'Описание', en: 'Description' })]));
      }
      state.items.forEach(function (it, i) {
        var el = h('div.xpa-ex-item', { role: 'option', 'aria-selected': 'false', 'data-key': it.key }, [
          U.icon(it.icon),
          h('div.xpa-ex-txt', [h('div.xpa-ex-name', t(it.name)), state.view === 'tiles' ? h('div.xpa-ex-sub', t(it.sub)) : null, state.view === 'tiles' ? h('div.xpa-ex-sub', t(it.type)) : null]),
          state.view === 'details' ? h('div.xpa-ex-col', t(it.type)) : null,
          state.view === 'details' ? h('div.xpa-ex-col', t(it.desc)) : null
        ]);
        var lastTap = 0;
        el.addEventListener('click', function (e) {
          select(i, false);
          var touch = e.pointerType === 'touch' || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
          var now = Date.now();
          if (touch || now - lastTap < 400) { openItem(it); lastTap = 0; } else lastTap = now;
        });
        el.addEventListener('dblclick', function (e) { e.preventDefault(); });
        view.appendChild(el);
      });
      if (!state.items.length) view.appendChild(h('div.xpa-muted', { style: { padding: '12px' } }, { ru: 'Эта папка пуста.', en: 'This folder is empty.' }));
      if (state.sel >= 0) select(state.sel, false); else updateSide();
      st.set(1, { ru: 'Мой компьютер', en: 'My Computer' });
    }

    view.addEventListener('click', function (e) { if (e.target === view) select(-1); });
    view.addEventListener('keydown', function (e) {
      var n = state.items.length, i = state.sel;
      var cols = 1;
      if (state.view !== 'details') {
        var items = view.querySelectorAll('.xpa-ex-item');
        if (items.length > 1) { var top0 = items[0].offsetTop; cols = 0; for (var k = 0; k < items.length && items[k].offsetTop === top0; k++) cols++; }
      }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); return; }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goFwd(); return; }
      if (e.altKey && e.key === 'Enter') { e.preventDefault(); props(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); select(Math.min(n - 1, i + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); select(Math.max(0, i - 1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(n - 1, i < 0 ? 0 : i + cols)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, i - cols)); }
      else if (e.key === 'Home') { e.preventDefault(); select(0); }
      else if (e.key === 'End') { e.preventDefault(); select(n - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); openSel(); }
      else if (e.key === 'Backspace') { e.preventDefault(); goUp(); }
    });
    U.bind(function () { render(); });
    U.later(30, function () { view.focus({ preventScroll: true }); });
    return U.destroy;
  }

  /* ================================================================ Project document */
  function renderProject(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-projdoc', 560);
    var idx = 0;
    var id = api.params && api.params.id;
    X.projects.forEach(function (p, i) { if (p.id === id) idx = i; });
    var shot = (api.params && typeof api.params.shot === 'number') ? api.params.shot : 0;
    var zoom = 1;

    var linkBtn = h('a.xpa-tb.xpa-tb-link', { target: '_blank', rel: 'noopener noreferrer' }, [U.glyph('link'), h('span.xpa-tb-l', { ru: 'Открыть сайт', en: 'Visit site' })]);
    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Открыть папку проекта', en: 'Open project folder' }, action: function () { api.openApp('projects', { path: [proj().id] }); } },
        { label: { ru: 'Следующий проект', en: 'Next project' }, key: 'Ctrl+\u2192', action: function () { go(1); } },
        { label: { ru: 'Предыдущий проект', en: 'Previous project' }, key: 'Ctrl+\u2190', action: function () { go(-1); } },
        { sep: true },
        { label: { ru: 'Закрыть', en: 'Close' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Копировать ссылку', en: 'Copy link' }, disabled: function () { return !proj().url; }, action: function () { X.copyText(proj().url); } },
        { label: { ru: 'Копировать стек', en: 'Copy stack' }, action: function () { X.copyText(proj().stack.join(', ')); } }
      ] },
      { label: { ru: 'Вид', en: 'View' }, items: [
        { label: { ru: 'Крупнее', en: 'Zoom in' }, key: 'Ctrl++', action: function () { setZoom(zoom + 0.1); } },
        { label: { ru: 'Мельче', en: 'Zoom out' }, key: 'Ctrl+-', action: function () { setZoom(zoom - 0.1); } },
        { label: { ru: 'Обычный размер', en: 'Actual size' }, key: 'Ctrl+0', action: function () { setZoom(1); } }
      ] }
    ]);
    var tb = U.toolbar([
      U.tbtn({ g: 'up', label: { ru: 'К папке', en: 'Folder' }, showLabel: true, big: true, onClick: function () { api.openApp('projects', { path: [proj().id] }); } }),
      U.tsep(),
      U.tbtn({ g: 'back', label: { ru: 'Предыдущий проект', en: 'Previous project' }, big: true, onClick: function () { go(-1); } }),
      U.tbtn({ g: 'fwd', label: { ru: 'Следующий проект', en: 'Next project' }, big: true, onClick: function () { go(1); } }),
      U.tsep(),
      linkBtn
    ]);
    var page = h('div.xpa-pd-page.xpa-selectable');
    var scroller = h('div.xpa-pd-scroll', { tabindex: '0' }, [page]);
    var st = U.statusbar(2);
    [menu, tb, scroller, st.el].forEach(function (n) { root.appendChild(n); });

    function proj() { return X.projects[idx]; }
    function go(d) { idx = (idx + d + X.projects.length) % X.projects.length; shot = 0; U.sound('click'); render(); scroller.scrollTop = 0; }
    function setZoom(z) { zoom = Math.max(0.8, Math.min(1.4, Math.round(z * 10) / 10)); page.style.fontSize = (12 * zoom) + 'px'; st.set(1, Math.round(zoom * 100) + '%'); }

    var gallery = null;
    function renderGallery(p) {
      var frame = h('div.xpa-pd-frame', { tabindex: '0', role: 'img' });
      var cap = h('div.xpa-pd-cap');
      var thumbs = h('div.xpa-pd-thumbs', { role: 'tablist' });
      var prev = h('button.xpa-pd-arrow.l', { type: 'button', 'aria-label': { ru: 'Предыдущий', en: 'Previous' } }, X.g24.back ? h('span.xpa-g16.x24', { html: X.g24.back }) : '\u2039');
      var next = h('button.xpa-pd-arrow.r', { type: 'button', 'aria-label': { ru: 'Следующий', en: 'Next' } }, X.g24.fwd ? h('span.xpa-g16.x24', { html: X.g24.fwd }) : '\u203A');
      function show(i, anim) {
        shot = (i + p.shots.length) % p.shots.length;
        var s = p.shots[shot];
        var fn = X.mocks && (X.mocks[s.kind] || X.mocks.generic);
        frame.innerHTML = fn ? fn(U.lang(), t(s.title)) : '';
        frame.setAttribute('aria-label', t(s.title));
        if (anim && !X.reduced()) { frame.classList.remove('flip'); void frame.offsetWidth; frame.classList.add('flip'); }
        cap.textContent = t({ ru: 'Рис. ', en: 'Fig. ' }) + (shot + 1) + ' / ' + p.shots.length + ' — ' + t(s.title);
        Array.prototype.forEach.call(thumbs.children, function (b, k) { b.setAttribute('aria-selected', String(k === shot)); });
      }
      p.shots.forEach(function (s, i) {
        var fn = X.mocks && (X.mocks[s.kind] || X.mocks.generic);
        var b = h('button.xpa-pd-thumb', { type: 'button', role: 'tab', title: t(s.title), html: fn ? fn(U.lang(), t(s.title)) : '' });
        b.addEventListener('click', function () { U.sound('click'); show(i, true); });
        thumbs.appendChild(b);
      });
      prev.addEventListener('click', function () { show(shot - 1, true); });
      next.addEventListener('click', function () { show(shot + 1, true); });
      frame.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(shot - 1, true); }
        if (e.key === 'ArrowRight') { e.preventDefault(); show(shot + 1, true); }
      });
      var g = h('div.xpa-pd-gallery', [h('div.xpa-pd-stage', [prev, frame, next]), cap, thumbs]);
      show(shot, false);
      return g;
    }

    function render() {
      var p = proj();
      api.win.setTitle(t(p.name) + ' — ' + t({ ru: 'Документ', en: 'Document' }));
      if (p.url) { linkBtn.href = p.url; linkBtn.style.display = ''; } else { linkBtn.removeAttribute('href'); linkBtn.style.display = 'none'; }
      page.innerHTML = '';
      page.appendChild(h('header.xpa-pd-head', [
        U.icon(p.icon, 'xpa-pd-icon'),
        h('div.xpa-grow', [
          h('h1.xpa-pd-title', t(p.name)),
          h('div.xpa-pd-tag', t(p.tagline)),
          h('div.xpa-pd-meta', [h('span', t(p.type)), h('span', t(p.period))])
        ])
      ]));
      page.appendChild(h('dl.xpa-pd-facts', [
        h('dt', { ru: 'Роль', en: 'Role' }), h('dd', t(p.role)),
        h('dt', { ru: 'Ссылка', en: 'Link' }), h('dd', p.url ? h('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer' }, p.url.replace(/^https?:\/\//, '')) : t({ ru: 'пока не публичный', en: 'not public yet' }))
      ]));
      page.appendChild(h('p.xpa-pd-summary', t(p.summary)));
      page.appendChild(h('h2', { ru: 'Стек', en: 'Stack' }));
      page.appendChild(h('div.xpa-chips', p.stack.map(function (s) { return h('span.xpa-chip', s); })));
      page.appendChild(h('h2', { ru: 'Что я сделал', en: 'What I did' }));
      page.appendChild(h('ul.xpa-pd-hl', p.highlights.map(function (x) { return h('li', t(x)); })));
      page.appendChild(h('h2', { ru: 'Как это выглядит', en: 'What it looks like' }));
      gallery = renderGallery(p);
      page.appendChild(gallery);
      page.appendChild(h('div.xpa-pd-foot', [
        p.url ? h('a.xpa-btn.primary', { href: p.url, target: '_blank', rel: 'noopener noreferrer' }, [U.glyph('link'), h('span', { ru: 'Открыть ' + p.url.replace(/^https?:\/\//, ''), en: 'Open ' + p.url.replace(/^https?:\/\//, '') })]) : null,
        U.button({ ru: 'Следующий проект \u203A', en: 'Next project \u203A' }, function () { go(1); })
      ]));
      st.set(0, t({ ru: 'Проект ', en: 'Project ' }) + (idx + 1) + t({ ru: ' из ', en: ' of ' }) + X.projects.length + ' · ' + t(p.type));
      st.set(1, Math.round(zoom * 100) + '%');
    }
    root.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(zoom + 0.1); }
      else if (e.key === '-') { e.preventDefault(); setZoom(zoom - 0.1); }
      else if (e.key === '0') { e.preventDefault(); setZoom(1); }
    });
    U.bind(render);
    if (api.params && typeof api.params.shot === 'number') U.later(60, function () { if (gallery) { gallery.scrollIntoView({ block: 'center' }); var f = gallery.querySelector('.xpa-pd-frame'); if (f) f.focus({ preventScroll: true }); } });
    else U.later(30, function () { scroller.focus({ preventScroll: true }); });
    return U.destroy;
  }

  X.register({
    id: 'projects',
    title: { ru: 'Мои проекты', en: 'My Projects' },
    icon: X.icons.projects,
    desktop: true,
    startMenu: 'pinned',
    defaultSize: { w: 680, h: 460 },
    minSize: { w: 300, h: 240 },
    singleton: true,
    render: renderExplorer
  });
  /* My live sites as desktop programs: the site in a window, like a game in its own exe. A no-cors probe resolves for any
     reachable site and rejects when it is down or offline: only then is the frame shown, so a site that is not deployed yet
     gets a Windows-style page instead of the browser's broken-page icon. */
  function siteWindow(cfg) {
    return function (content, api) {
      var U = X.ui(api), h = U.h;
      var root = U.root(content, 'xpa-wax', 320);
      var lang = (document.documentElement.lang === 'en') ? 'en' : 'ru';
      var url = cfg.url(lang), host = cfg.home.replace(/^https?:\/\//, '').replace(/\/$/, '');
      var links = [h('a.xpa-br-out', { href: url, target: '_blank', rel: 'noopener noreferrer' }, { ru: 'Открыть в новой вкладке', en: 'Open in a new tab' })];
      if (cfg.repo) links.push(h('a.xpa-br-out', { href: cfg.repo, target: '_blank', rel: 'noopener noreferrer' }, { ru: 'Код на GitHub', en: 'Code on GitHub' }));
      root.appendChild(h('div.xpa-wax-bar', links));
      var wait = h('div.xpa-wax-msg', t2({ ru: 'Открывается ', en: 'Opening ' }) + host + '…');
      function t2(d) { return d[lang]; }
      root.appendChild(wait);
      var alive = true; U.onCleanup(function () { alive = false; });
      var probe = window.fetch ? fetch(cfg.home, { mode: 'no-cors', cache: 'no-store' }) : Promise.reject();
      probe.then(function () {
        if (alive) root.replaceChild(h('iframe.xpa-wax-frame', { src: url, title: host, allow: 'fullscreen', referrerpolicy: 'no-referrer' }), wait);
      }, function () {
        if (!alive) return;
        root.replaceChild(h('div.xpa-wax-msg', [
          h('b', { ru: 'Сайт ' + host + ' сейчас недоступен', en: host + ' is not reachable right now' }),
          h('p', { ru: 'Возможно, его ещё не выложили или нет интернета. В папке «Мои проекты» есть описание и скриншоты.', en: 'It may not be deployed yet, or the internet is off. «My Projects» has the overview and screenshots.' }),
          U.button({ ru: 'Открыть описание', en: 'Open the overview' }, function () { api.openApp('project', { id: cfg.project }); }, { primary: true })
        ]), wait);
      });
      return U.destroy;
    };
  }
  [
    { id: 'wax', project: 'wax', title: { ru: 'Wax', en: 'Wax' }, icon: X.icons.wax, home: 'https://wax.donya.dev/', repo: 'https://github.com/le5tef/wax',
      url: function (l) { return 'https://wax.donya.dev/?lang=' + l; } },
    { id: 'kompy-app', project: 'kompy', title: { ru: 'Компи', en: 'Kompi' }, icon: X.icons.kompy, home: 'https://kompy.app/',
      url: function () { return 'https://kompy.app/'; } }
  ].forEach(function (c) {
    X.register({ id: c.id, title: c.title, icon: c.icon, desktop: true, startMenu: true, defaultSize: { w: 760, h: 540 }, minSize: { w: 320, h: 360 }, singleton: true, render: siteWindow(c) });
  });
  X.register({
    id: 'project',
    title: { ru: 'Проект', en: 'Project' },
    icon: X.icons.doc,
    desktop: false,
    startMenu: false,
    defaultSize: { w: 640, h: 520 },
    minSize: { w: 300, h: 260 },
    singleton: false,
    render: renderProject
  });
})();

export {};
