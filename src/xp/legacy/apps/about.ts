// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/about.js. Replace module by module; do not edit in place.
/* About / My Computer: a System Properties dialog about the owner. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;
  function d(ru, en) { return { ru: ru, en: en }; }

  var STATUS = {
    work: { label: d('Работает', 'At work'), load: [62, 94], note: d('Пишет код. Не отвлекать, если только не с оффером.', 'Writing code. Do not disturb, unless it is an offer.') },
    play: { label: d('Играет', 'Gaming'), load: [88, 100], note: d('Видеокарта занята. Код подождёт до конца катки.', 'The GPU is busy. Code waits until the match ends.') },
    sleep: { label: d('Спит', 'Asleep'), load: [1, 6], note: d('Энергосбережение. Ответит утром по времени Пхукета.', 'Power saving. Will reply in the Phuket morning.') },
    outside: { label: d('Вне дома', 'Away'), load: [8, 22], note: d('Где-то на острове. Телефон с собой.', 'Somewhere on the island. Has the phone.') }
  };

  // the real stack comes from stack.js (shared with the resume and the terminal); the two joke categories live here
  var DEVICES = (X.stack ? X.stack.devices : []).map(function (g) {
    return { cat: g.cat, g: g.glyph, items: g.items.map(function (i) { return [i.name, i.note]; }) };
  }).concat([
    { cat: d('Устройства ввода', 'Input devices'), g: 'props', items: [[d('Клавиатура', 'Keyboard'), d('Буквы «Ctrl», «C» и «V» стёрты меньше, чем можно подумать.', 'The Ctrl, C and V keys are less worn than you might think.')], [d('Резиновая уточка (отладка)', 'Rubber duck (debugging)'), d('Выслушивает молча. Помогает в 80% случаев.', 'Listens silently. Helps in 80% of cases.')]] },
    { cat: d('Другие устройства', 'Other devices'), g: 'warn', warn: true, items: [[d('Режим сна', 'Sleep schedule'), d('Драйвер не найден. Устройство работает непредсказуемо (код 28).', 'Driver not found. The device behaves unpredictably (code 28).'), true]] }
  ]);

  function logoSvg() {
    return '<svg viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="8" y="4" width="104" height="70" rx="8" fill="#3b7be0" stroke="#1b4fa8"/>' +
      '<circle cx="84" cy="24" r="9" fill="#ffd767"/>' +
      '<path d="M8 56c22-16 52-20 104-8v18a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#4fae3c"/>' +
      '<path d="M8 64c30-10 64-10 104 0v2a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#3c9330"/>' +
      '<path d="M30 58c0-10 2-18 6-24M36 34c-6-2-12 0-14 4M36 34c4-4 10-4 13 0M36 34c-2-5-7-7-11-6M36 34c3-4 8-6 12-4" fill="none" stroke="#2b5a1f" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M12 10h96v18c-30 6-66 6-96 0z" fill="#fff" opacity=".18"/>' +
      '<text x="60" y="90" text-anchor="middle" font-family="Tahoma,Verdana,sans-serif" font-size="11" fill="#1b4fa8"><tspan font-weight="bold" font-style="italic">Windows</tspan><tspan fill="#f7941d" font-weight="bold" font-style="italic" font-size="8" dy="-4">XD</tspan></text></svg>';
  }

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-about', 400);
    var openedAt = Date.now();
    var tabsDef = [
      { id: 'general', label: d('Общие', 'General') },
      { id: 'hardware', label: d('Оборудование', 'Hardware') },
      { id: 'perf', label: d('Быстродействие', 'Performance') },
      { id: 'remote', label: d('Удалённый доступ', 'Remote') }
    ];
    var cur = (api.params && api.params.tab) || 'general';
    var tabs = h('div.xpa-tabs', { role: 'tablist' });
    var panel = h('div.xpa-tabpanel', { role: 'tabpanel', tabindex: '0' });
    var dirty = false;
    var btnOk = U.button('OK', function () { U.sound('click'); api.win.close(); }, { primary: true });
    var btnCancel = U.button({ ru: 'Отмена', en: 'Cancel' }, function () { api.win.close(); });
    var btnApply = U.button({ ru: 'Применить', en: 'Apply' }, function () {
      dirty = false; btnApply.disabled = true;
      U.dialog({ title: { ru: 'Свойства системы', en: 'System Properties' }, icon: 'info', text: { ru: 'Изменения применены.\nДаниил по-прежнему ищет интересные задачи.', en: 'Changes applied.\nDaniil is still looking for interesting work.' }, buttons: [{ label: 'OK', primary: true }] });
    });
    btnApply.disabled = true;
    function markDirty() { if (!dirty) { dirty = true; btnApply.disabled = false; } }
    var foot = h('div.xpa-about-foot', [btnOk, btnCancel, btnApply]);
    var body = h('div.xpa-about-body', [tabs, panel]);
    root.appendChild(body); root.appendChild(foot);

    var tabEls = tabsDef.map(function (tb, i) {
      var b = h('button.xpa-tab', { type: 'button', role: 'tab', 'aria-selected': 'false', tabindex: '-1' }, tb.label);
      b.addEventListener('click', function () { U.sound('click'); show(tb.id); });
      b.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (k) { e.preventDefault(); var n = tabsDef[(i + k + tabsDef.length) % tabsDef.length]; show(n.id); tabEls[tabsDef.indexOf(n)].focus(); }
      });
      tabs.appendChild(b);
      return b;
    });

    var stopFns = [];
    function show(id) {
      cur = id;
      stopFns.forEach(function (f) { f(); }); stopFns = [];
      tabEls.forEach(function (b, i) { var on = tabsDef[i].id === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      panel.innerHTML = '';
      ({ general: general, hardware: hardware, perf: perf, remote: remote })[id]();
      api.win.setTitle(t({ ru: 'Свойства системы', en: 'System Properties' }));
    }

    function status() { var s = 'work'; try { s = api.status() || 'work'; } catch (e) { /* default */ } return STATUS[s] ? s : 'work'; }
    function uptime() {
      var s = Math.floor((Date.now() - openedAt) / 1000);
      return X.pad(Math.floor(s / 3600)) + ':' + X.pad(Math.floor(s / 60) % 60) + ':' + X.pad(s % 60);
    }

    function general() {
      var timeEl = h('span'), upEl = h('span');
      function tick() {
        var p = X.phuketNow(api);
        timeEl.textContent = X.pad(p.h) + ':' + X.pad(p.m) + ' (UTC+7)';
        upEl.textContent = uptime();
      }
      tick();
      var id = setInterval(tick, 1000); stopFns.push(function () { clearInterval(id); });
      var compName = h('input.xpa-field.xpa-about-name', { type: 'text', value: X.pcName, maxlength: '15', 'aria-label': { ru: 'Имя компьютера', en: 'Computer name' }, spellcheck: 'false' });
      compName.addEventListener('input', function () { compName.value = compName.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); markDirty(); });
      panel.appendChild(h('div.xpa-about-gen', [
        h('div.xpa-about-logo', { html: logoSvg() }),
        h('div.xpa-about-info.xpa-selectable', [
          h('div.xpa-about-h', { ru: 'Система:', en: 'System:' }),
          h('div.xpa-about-v', [h('div', t(X.osName)), h('div', t(X.osEdition)), h('div', X.osVersion), h('div', { ru: 'Пакет обновления: 4,5 года опыта', en: 'Service Pack: 4.5 years of experience' })]),
          h('div.xpa-about-h', { ru: 'Зарегистрирован на:', en: 'Registered to:' }),
          h('div.xpa-about-v', [h('div', t(X.person.name)), h('div', t(X.person.role)), h('div', t(X.person.city)), h('div.xpa-muted', 'VUE3-DJANGO-NUXT-PY2022')]),
          h('div.xpa-about-h', { ru: 'Компьютер:', en: 'Computer:' }),
          h('div.xpa-about-v', [
            h('div', { ru: 'Процессор: 1 × Fullstack-разработчик', en: 'Processor: 1 × Fullstack developer' }),
            h('div', { ru: 'Охлаждение: кофе, 2 чашки в день, разгон до 3', en: 'Cooling: coffee, 2 cups a day, overclocks to 3' }),
            h('div', { ru: 'Память: помнит, почему этот костыль здесь', en: 'Memory: remembers why that workaround is there' }),
            h('div', [t({ ru: 'Местное время: ', en: 'Local time: ' }), timeEl]),
            h('div', [t({ ru: 'Состояние: ', en: 'Status: ' }), h('b', t(STATUS[status()].label))]),
            h('div', [t({ ru: 'Время работы окна: ', en: 'Window uptime: ' }), upEl])
          ])
        ])
      ]));
      panel.appendChild(h('div.xpa-about-row', [h('label', { ru: 'Имя компьютера:', en: 'Computer name:' }), compName]));
    }

    function hardware() {
      var info = h('div.xpa-about-devinfo');
      var tree = h('div.xpa-about-tree.xpa-sunken', { role: 'tree', tabindex: '0', 'aria-label': { ru: 'Диспетчер устройств', en: 'Device Manager' } });
      var rows = [];
      DEVICES.forEach(function (cat, ci) {
        var open = !!cat.warn || ci === 0;
        var kids = h('div.xpa-tree-kids', { role: 'group' });
        var row = h('div.xpa-tree-row.cat', { role: 'treeitem', 'aria-expanded': String(open) }, [h('span.xpa-tree-tog', open ? '−' : '+'), U.glyph(cat.g === 'warn' ? 'props' : cat.g), h('span', t(cat.cat))]);
        if (cat.g === 'computer') row.querySelector('.xpa-g16').innerHTML = X.icons.computer;
        function toggle(v) { open = v == null ? !open : v; row.setAttribute('aria-expanded', String(open)); row.querySelector('.xpa-tree-tog').textContent = open ? '−' : '+'; kids.style.display = open ? '' : 'none'; }
        row.addEventListener('click', function () { toggle(); pick(row); U.sound('click'); });
        row._toggle = toggle;
        rows.push(row);
        cat.items.forEach(function (it) {
          var name = t(it[0]);
          var r = h('div.xpa-tree-row.dev' + (it[2] ? '.bad' : ''), { role: 'treeitem' }, [
            h('span.xpa-tree-ico', { html: it[2] ? X.icons.warn : X.g16.hardware || X.svg('<rect x="2" y="4" width="12" height="9" rx="1" fill="#cfd8e6" stroke="#5a6b86"/><rect x="4" y="6" width="8" height="4" fill="#6c9be0"/><path d="M5 13v2M11 13v2" stroke="#5a6b86"/>', '0 0 16 16') }),
            h('span', name)
          ]);
          r._info = function () {
            info.innerHTML = '';
            info.appendChild(h('b', name));
            info.appendChild(h('div', it[2] ? t({ ru: 'Состояние: устройство работает неправильно.', en: 'Device status: this device is not working properly.' }) : t({ ru: 'Состояние: устройство работает нормально.', en: 'Device status: this device is working properly.' })));
            if (it[1]) info.appendChild(h('div.xpa-muted', t(it[1])));
          };
          r.addEventListener('click', function () { pick(r); });
          rows.push(r);
          kids.appendChild(r);
        });
        kids.style.display = open ? '' : 'none';
        tree.appendChild(row); tree.appendChild(kids);
      });
      var sel = null;
      function pick(r) {
        if (sel) sel.classList.remove('sel');
        sel = r; r.classList.add('sel');
        if (r._info) r._info(); else { info.innerHTML = ''; info.appendChild(h('div.xpa-muted', t({ ru: 'Выберите устройство, чтобы увидеть его состояние.', en: 'Select a device to see its status.' }))); }
        r.scrollIntoView({ block: 'nearest' });
      }
      tree.addEventListener('keydown', function (e) {
        var vis = rows.filter(function (r) { return r.offsetParent !== null; });
        var i = vis.indexOf(sel);
        if (e.key === 'ArrowDown') { e.preventDefault(); pick(vis[Math.min(vis.length - 1, i + 1)]); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); pick(vis[Math.max(0, i - 1)]); }
        else if (e.key === 'ArrowRight' && sel && sel._toggle) { e.preventDefault(); sel._toggle(true); }
        else if (e.key === 'ArrowLeft' && sel && sel._toggle) { e.preventDefault(); sel._toggle(false); }
        else if (e.key === 'Enter' && sel && sel._toggle) { e.preventDefault(); sel._toggle(); }
      });
      panel.appendChild(h('div.xpa-about-hwhead', [h('span.xpa-ico', { html: X.icons.computer }), h('div', [h('b', { ru: 'Диспетчер устройств', en: 'Device Manager' }), h('div.xpa-muted', { ru: 'Установленное «оборудование» — реальный стек. Щёлкните категорию, чтобы раскрыть.', en: 'The installed "hardware" is the real stack. Click a category to expand it.' })])]));
      panel.appendChild(tree);
      panel.appendChild(info);
      pick(rows[rows.length - 1]);
    }

    function perf() {
      var s = status(), S = STATUS[s];
      var cv = h('canvas.xpa-about-graph', { width: '300', height: '110', 'aria-label': { ru: 'График загрузки', en: 'Load graph' } });
      var pct = h('div.xpa-about-pct');
      var meter = h('div.xpa-about-meter', [h('div.xpa-about-meter-fill')]);
      var coffee = h('div.xpa-about-coffee', [h('div.xpa-about-coffee-fill')]);
      panel.appendChild(h('div.xpa-about-perf', [
        h('div.xpa-group.xpa-about-g1', [h('span.xpa-legend', { ru: 'Загрузка фокуса', en: 'Focus usage' }), h('div.xpa-about-mbox', [meter, pct])]),
        h('div.xpa-group.xpa-about-g2', [h('span.xpa-legend', { ru: 'Хронология загрузки', en: 'Focus usage history' }), cv]),
        h('div.xpa-group', [h('span.xpa-legend', { ru: 'Процессы', en: 'Processes' }), h('dl.xpa-about-kv', [
          h('dt', { ru: 'Состояние', en: 'Status' }), h('dd', t(S.label)),
          h('dt', { ru: 'Примечание', en: 'Note' }), h('dd', t(S.note)),
          h('dt', { ru: 'Кофе в чашке', en: 'Coffee in cup' }), h('dd', [coffee]),
          h('dt', { ru: 'Открытые вкладки', en: 'Open tabs' }), h('dd', { ru: 'много (документация)', en: 'many (documentation)' })
        ])])
      ]));
      var hist = [], ctx = cv.getContext('2d'), off = 0, cup = 1;
      for (var i = 0; i < 60; i++) hist.push(sample());
      function sample() { var r = S.load; var last = hist.length ? hist[hist.length - 1] : (r[0] + r[1]) / 2; var v = last + (Math.random() - 0.5) * (r[1] - r[0]) * 0.6; return Math.max(r[0], Math.min(r[1], v)); }
      function draw() {
        var w = cv.width, hh = cv.height;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, hh);
        ctx.strokeStyle = '#008040'; ctx.lineWidth = 1;
        for (var x = -off; x < w; x += 12) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, hh); ctx.stroke(); }
        for (var y = 0; y < hh; y += 12) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
        ctx.strokeStyle = '#00ff00'; ctx.beginPath();
        hist.forEach(function (v, i) { var px = w - (hist.length - 1 - i) * 5, py = hh - 2 - v / 100 * (hh - 4); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
        ctx.stroke();
        var v = Math.round(hist[hist.length - 1]);
        pct.textContent = v + '%';
        meter.firstChild.style.height = v + '%';
        coffee.firstChild.style.width = Math.round(cup * 100) + '%';
      }
      function tick() { hist.push(sample()); if (hist.length > 80) hist.shift(); off = (off + 5) % 12; cup = cup <= 0.05 ? 1 : cup - 0.01 * (S.load[1] / 50); draw(); }
      draw();
      if (!X.reduced()) { var id = setInterval(tick, 1000); stopFns.push(function () { clearInterval(id); }); }
    }

    function remote() {
      var cb1 = h('input', { type: 'checkbox', id: 'xpa-rem-1', checked: true });
      cb1.addEventListener('change', function () {
        if (!cb1.checked) {
          cb1.checked = true; U.sound('error');
          U.dialog({ title: { ru: 'Удалённый доступ', en: 'Remote' }, icon: 'warn', text: { ru: 'Этот параметр заблокирован владельцем.\nДаниил открыт к предложениям.', en: 'This setting is locked by the owner.\nDaniil is open to offers.' }, buttons: [{ label: 'OK', primary: true }] });
        }
      });
      var tz = h('select.xpa-field', { 'aria-label': { ru: 'Часовой пояс', en: 'Time zone' } }, [
        h('option', { ru: '(UTC+07:00) Пхукет — живу здесь', en: '(UTC+07:00) Phuket — I live here' }),
        h('option', { ru: '(UTC+03:00) Москва — удобно созвониться', en: '(UTC+03:00) Moscow — easy to sync' }),
        h('option', { ru: '(UTC+01:00) Европа — тоже ок', en: '(UTC+01:00) Europe — fine too' })
      ]);
      tz.addEventListener('change', markDirty);
      panel.appendChild(h('div.xpa-about-remote', [
        h('div.xpa-about-hwhead', [h('span.xpa-ico', { html: X.icons.contact }), h('div', { ru: 'Выберите, как этот компьютер может использоваться удалённо.', en: 'Select the ways this computer can be used from another location.' })]),
        h('div.xpa-group', [h('span.xpa-legend', { ru: 'Удалённая работа', en: 'Remote work' }),
          h('label.xpa-check', [cb1, h('span', { ru: 'Разрешить приглашения на проекты и собеседования', en: 'Allow invitations to projects and interviews' })]),
          h('div.xpa-muted', { style: { margin: '6px 0 0 20px' } }, { ru: 'Fullstack (Vue 3 / Nuxt + Python / Django), удалённо или релокация.', en: 'Fullstack (Vue 3 / Nuxt + Python / Django), remote or relocation.' })
        ]),
        h('div.xpa-group', [h('span.xpa-legend', { ru: 'Часовой пояс', en: 'Time zone' }), tz]),
        h('div.xpa-about-rbtns', [
          U.button({ ru: 'Связаться…', en: 'Contact…' }, function () { api.openApp('contact'); }, { primary: true }),
          U.button({ ru: 'Резюме…', en: 'Resume…' }, function () { api.openApp('resume'); })
        ])
      ]));
    }

    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { api.win.close(); }
      if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); var i = tabsDef.findIndex(function (x) { return x.id === cur; }); show(tabsDef[(i + (e.shiftKey ? -1 : 1) + tabsDef.length) % tabsDef.length].id); }
    });
    U.bind(function () { show(cur); });
    U.onCleanup(function () { stopFns.forEach(function (f) { f(); }); });
    U.later(30, function () { var b = tabEls[tabsDef.findIndex(function (x) { return x.id === cur; })]; if (b) b.focus({ preventScroll: true }); });
    return U.destroy;
  }

  X.register({
    id: 'about',
    title: { ru: 'Мой компьютер', en: 'My Computer' },
    icon: X.icons.computer,
    desktop: true,
    startMenu: 'pinned',
    defaultSize: { w: 440, h: 500 },
    minSize: { w: 300, h: 360 },
    singleton: true,
    render: render
  });
})();

export {};
