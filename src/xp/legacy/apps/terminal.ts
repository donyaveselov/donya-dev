// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/terminal.js. Replace module by module; do not edit in place.
/* Terminal: a cmd-like console with real commands, history and tab completion. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;
  function d(ru, en) { return { ru: ru, en: en }; }

  var COLORS = { '0': '#000', '1': '#000080', '2': '#008000', '3': '#008080', '4': '#800000', '5': '#800080', '6': '#808000', '7': '#c0c0c0', '8': '#808080', '9': '#0000ff', a: '#00ff00', b: '#00ffff', c: '#ff0000', d: '#ff00ff', e: '#ffff00', f: '#ffffff' };
  var OPENABLE = ['projects', 'resume', 'about', 'contact', 'minesweeper', 'paint', 'recycle', 'browser', 'notepad', 'calc', 'terminal'];

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-term', 420);
    var out = h('div.xpa-term-out.xpa-selectable', { role: 'log', 'aria-live': 'polite' });
    var promptEl = h('span.xpa-term-prompt');
    var input = h('input.xpa-term-in', { type: 'text', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': { ru: 'Командная строка', en: 'Command line' } });
    var line = h('div.xpa-term-line', [promptEl, input]);
    var screen = h('div.xpa-term-screen', { tabindex: '-1' }, [out, line]);
    root.appendChild(screen);
    var hist = [], hi = 0, cwd = ['C:', 'Andaman', 'Daniil'], matrixStop = null;
    var fg = '#c0c0c0', bg = '#000';

    function prompt() { return cwd.join('\\') + (cwd.length === 1 ? '\\' : '') + '>'; }
    function setPrompt() { promptEl.textContent = prompt(); }
    function print(s, cls) {
      String(s).split('\n').forEach(function (ln) { out.appendChild(h('div.xpa-term-l' + (cls ? '.' + cls : ''), ln === '' ? '\u00A0' : ln)); });
      while (out.children.length > 600) out.removeChild(out.firstChild);
      screen.scrollTop = screen.scrollHeight;
    }
    function pt(dict) { print(t(dict)); }
    function banner() {
      print(X.osVersion + ' — ' + t(X.osEdition));
      print('(C) ' + t({ ru: 'Даниил Иванов, Пхукет. Все баги защищены.', en: 'Daniil Ivanov, Phuket. All bugs reserved.' }));
      print('');
      pt({ ru: 'Введите help, чтобы увидеть список команд.', en: 'Type help to see the list of commands.' });
      print('');
    }

    var CMDS = {
      help: { d: d('этот список', 'this list'), run: function () {
        var names = Object.keys(CMDS).filter(function (k) { return !CMDS[k].hidden; });
        names.forEach(function (k) { var pad = (k + (CMDS[k].a ? ' ' + CMDS[k].a : '')); while (pad.length < 16) pad += ' '; print('  ' + pad + t(CMDS[k].d)); });
        print('');
        pt({ ru: 'Стрелки ↑/↓ — история, Tab — дополнение. Есть и скрытые команды.', en: 'Arrows Up/Down: history, Tab: completion. There are hidden commands too.' });
      } },
      whoami: { d: d('кто здесь живёт', 'who lives here'), run: function () {
        print('daniil-pc\\daniil');
        print(t(X.person.name) + ' — ' + t(X.person.role) + ' (Vue 3 / Nuxt + Python / Django, ' + t({ ru: 'немного Node', en: 'some Node' }) + ')');
        pt({ ru: 'Живу на Пхукете. 4,5 года в разработке. Люблю, когда в системе всё продумано до мелочей.', en: 'Based in Phuket. 4.5 years in development. Likes systems where every small thing is thought through.' });
      } },
      projects: { d: d('список проектов', 'list projects'), run: function () {
        print(' ' + t({ ru: 'Содержимое папки', en: 'Directory of' }) + ' C:\\Andaman\\Daniil\\' + t({ ru: 'Мои проекты', en: 'My Projects' }));
        print('');
        X.projects.forEach(function (p) {
          var n = t(p.name); while (n.length < 16) n += ' ';
          print('  <DIR>  ' + n + t(p.tagline));
        });
        print('');
        pt({ ru: 'Откройте: open projects  или  open verifikat', en: 'Open with: open projects  or  open verifikat' });
      } },
      open: { a: '<app>', d: d('открыть программу', 'open an app'), run: function (args) {
        var name = (args[0] || '').toLowerCase().replace(/\.exe$/, '');
        if (!name) { print(t({ ru: 'Что открыть? ', en: 'Open what? ' }) + OPENABLE.join(', ')); return; }
        var proj = X.findProject(name);
        if (proj) { api.openApp('project', { id: proj.id }); print(t({ ru: 'Открываю ', en: 'Opening ' }) + t(proj.name) + '...'); return; }
        var id = X.appAliases[name];
        if (!id) { U.sound('error'); print(t({ ru: '«' + name + '» не является внутренней или внешней командой, исполняемой программой или проектом.', en: '\'' + name + '\' is not recognized as an app, a project or a batch file.' })); return; }
        if (id === 'terminal') { pt({ ru: 'Вы уже здесь.', en: 'You are already here.' }); return; }
        api.openApp(id); print(t({ ru: 'Запуск ', en: 'Starting ' }) + id + '.exe...');
      } },
      skills: { d: d('стек технологий', 'tech stack'), run: function () {
        var rows = X.stack.byArea().map(function (g) { return [(g.id + '        ').slice(0, 8), X.stack.line(g.id, U.lang())]; });   // from stack.js
        rows.forEach(function (r) { print('  ' + r[0] + '  ' + r[1]); });
      } },
      time: { d: d('время на Пхукете', 'time in Phuket'), run: function () {
        var p = X.phuketNow(api);
        var hh = p.h, part = hh < 6 ? d('ночь', 'night') : hh < 12 ? d('утро', 'morning') : hh < 18 ? d('день', 'afternoon') : d('вечер', 'evening');
        print(t({ ru: 'Пхукет (UTC+7): ', en: 'Phuket (UTC+7): ' }) + X.pad(p.h) + ':' + X.pad(p.m) + ', ' + t(part));
      } },
      status: { d: d('чем владелец занят сейчас', 'what the owner is doing now'), run: function () {
        var s = 'work'; try { s = api.status() || 'work'; } catch (e) { /* default */ }
        var m = { work: d('работает. Код компилируется, кофе остывает.', 'working. Code compiling, coffee cooling.'), play: d('играет. Вернётся после катки.', 'gaming. Back after this match.'), sleep: d('спит. Zzz… ответит утром.', 'asleep. Zzz... will reply in the morning.'), outside: d('вне дома. Пхукет сам себя не исследует.', 'outside. Phuket will not explore itself.') };
        print('STATUS: ' + s.toUpperCase() + ' — ' + t(m[s] || m.work));
      } },
      contact: { d: d('контакты', 'contacts'), run: function () {
        X.contacts.forEach(function (c) { var l = t(c.label); while (l.length < 10) l += ' '; print('  ' + l + c.value); });
      } },
      cls: { d: d('очистить экран', 'clear the screen'), run: function () { out.innerHTML = ''; } },
      ver: { d: d('версия системы', 'system version'), run: function () { print(''); print(X.osVersion + ' — ' + t(X.osEdition)); } },
      date: { d: d('дата', 'date'), run: function () { var p = X.phuketNow(api).date; print(p.getUTCFullYear() + '-' + X.pad(p.getUTCMonth() + 1) + '-' + X.pad(p.getUTCDate())); } },
      echo: { a: '<text>', d: d('повторить текст', 'print text'), run: function (args, raw) { print(raw.replace(/^\s*echo\s?/i, '') || 'ECHO is on.'); } },
      dir: { d: d('содержимое папки', 'list folder'), run: function () {
        var here = cwd.join('\\');
        print(' ' + t({ ru: 'Содержимое папки', en: 'Directory of' }) + ' ' + here); print('');
        if (cwd.length === 3) ['<DIR>  ' + t({ ru: 'Мои проекты', en: 'My Projects' }), '<DIR>  ' + t({ ru: 'Рабочий стол', en: 'Desktop' }), '       about.txt', '       resume.rtf', '       README.txt'].forEach(function (x) { print('  ' + x); });
        else if (cwd.length > 3) X.projects.forEach(function (p) { print('  <DIR>  ' + t(p.name)); });
        else print('  <DIR>  Andaman');
      } },
      cd: { a: '<dir>', d: d('сменить папку', 'change folder'), run: function (args) {
        var a = (args.join(' ') || '').trim();
        if (!a) { print(cwd.join('\\')); return; }
        if (a === '..') { if (cwd.length > 1) cwd.pop(); }
        else if (a === '\\' || a === '/') cwd = ['C:'];
        else if (/^(my ?projects|projects|мои проекты)$/i.test(a) && cwd.length === 3) cwd.push(t({ ru: 'Мои проекты', en: 'My Projects' }));
        else if (/^andaman$/i.test(a) && cwd.length === 1) cwd.push('Andaman');
        else if (/^daniil$/i.test(a) && cwd.length === 2) cwd.push('Daniil');
        else { pt({ ru: 'Системе не удаётся найти указанный путь.', en: 'The system cannot find the path specified.' }); return; }
        setPrompt();
      } },
      color: { a: '<bf>', d: d('цвет консоли, напр. color 0a', 'console colour, e.g. color 0a'), run: function (args) {
        var c = (args[0] || '07').toLowerCase();
        if (!/^[0-9a-f]{1,2}$/.test(c)) { pt({ ru: 'Использование: color 0a (фон, текст)', en: 'Usage: color 0a (background, text)' }); return; }
        if (c.length === 1) c = '0' + c;
        if (c[0] === c[1]) { pt({ ru: 'Фон и текст одного цвета? Смело, но нет.', en: 'Same background and text? Bold, but no.' }); return; }
        bg = COLORS[c[0]]; fg = COLORS[c[1]]; screen.style.background = bg; screen.style.color = fg; input.style.color = fg;
      } },
      history: { d: d('история команд', 'command history'), run: function () { hist.forEach(function (x, i) { print('  ' + (i + 1) + '  ' + x); }); } },
      exit: { d: d('закрыть окно', 'close the window'), run: function () { api.win.close(); } },
      sudo: { hidden: true, run: function (args) {
        if (/make me a sandwich/i.test(args.join(' '))) { pt({ ru: 'Сэндвич давно в Корзине. Попробуйте open recycle.', en: 'The sandwich has been in the Recycle Bin for a while. Try: open recycle.' }); return; }
        U.sound('error');
        pt({ ru: 'daniil не входит в файл sudoers. Об этом инциденте будет доложено.', en: 'daniil is not in the sudoers file. This incident will be reported.' });
        pt({ ru: '…маме. Шутка. Здесь и так всё доступно без пароля.', en: '...to mom. Kidding. Everything here is available without a password anyway.' });
      } },
      rm: { hidden: true, async: true, run: function (args) {
        if (args.join(' ').indexOf('-rf') < 0) { pt({ ru: 'Здесь нечего удалять. Старые проекты уже в Корзине.', en: 'Nothing to delete here. Old projects are already in the Recycle Bin.' }); return; }
        input.disabled = true;
        var steps = ['node_modules (1/∞)', 'node_modules (2/∞)', 'C:\\Andaman\\System32... ', 'C:\\Andaman\\Daniil\\' + t({ ru: 'Мои проекты', en: 'My Projects' }) + '...'];
        var i = 0;
        pt({ ru: 'Удаление всего…', en: 'Deleting everything...' });
        (function step() {
          if (i < steps.length) { print('  rm ' + steps[i++]); U.later(X.reduced() ? 10 : 380, step); return; }
          U.sound('error');
          pt({ ru: 'Отказано в доступе. Проекты защищены резервной копией в голове владельца.', en: 'Access denied. The projects are backed up in the owner\'s head.' });
          pt({ ru: 'Хорошая попытка :)', en: 'Nice try :)' }); print('');
          input.disabled = false; input.focus();
        })();
      } },
      matrix: { d: d('проснись, Нео', 'wake up, Neo'), run: function () { startMatrix(); } },
      coffee: { hidden: true, run: function () { pt({ ru: 'Варю кофе… ☕ Готово. Производительность +15%.', en: 'Brewing coffee... ☕ Done. Productivity +15%.' }); } },
      hire: { hidden: true, run: function () { pt({ ru: 'Отличное решение. Открываю контакты…', en: 'Excellent decision. Opening contacts...' }); api.openApp('contact'); } },
      ping: { hidden: true, async: true, run: function (args) {
        var host = args[0] || 'donya.dev';
        print(t({ ru: 'Обмен пакетами с ', en: 'Pinging ' }) + host + ':');
        var n = 0; input.disabled = true;
        (function p() {
          if (n++ < 3) { print('  ' + t({ ru: 'Ответ от ', en: 'Reply from ' }) + host + ': ' + t({ ru: 'время', en: 'time' }) + '=' + (/phuket|пхукет/i.test(host) ? t({ ru: '7 ч (разница поясов)', en: '7h (time zones)' }) : (7 + Math.floor(Math.random() * 30)) + 'ms') + ' TTL=64'); U.later(X.reduced() ? 10 : 400, p); return; }
          pt({ ru: '(Пинг симулирован: этот компьютер живёт в мониторе и в сеть не ходит.)', en: '(Ping simulated: this computer lives in a monitor and does not go online.)' }); print('');
          input.disabled = false; input.focus();
        })();
      } },
      cat: { a: '<file>', d: d('показать файл', 'print a file'), run: function (args) {
        var f = (args[0] || '').toLowerCase();
        if (f === 'about.txt') { CMDS.whoami.run(); return; }
        if (f === 'readme.txt') { api.openApp('notepad'); pt({ ru: 'README.txt открыт в Блокноте.', en: 'README.txt opened in Notepad.' }); return; }
        if (f === 'resume.rtf') { CMDS.cv.run(); return; }
        if (/пароли|passwords/.test(f)) { print('hunter2'); pt({ ru: 'Серьёзно? Напишите мне лучше в Telegram.', en: 'Seriously? Better write me on Telegram.' }); return; }
        pt({ ru: 'Не удаётся найти указанный файл. Попробуйте cat about.txt', en: 'The system cannot find the file specified. Try cat about.txt' });
      } },
      tree: { d: d('дерево проектов', 'project tree'), run: function () {
        print('C:\\Andaman\\Daniil');
        print('├── ' + t({ ru: 'Мои проекты', en: 'My Projects' }));
        X.projects.forEach(function (p, i) {
          var last = i === X.projects.length - 1, br = last ? '└── ' : '├── ', pre = last ? '    ' : '│   ';
          print('│   ' + br + t(p.name));
          print('│   ' + pre + '└── ' + p.stack.slice(0, 4).join(', ') + '…');
        });
        print('├── resume.rtf');
        print('└── ' + t({ ru: 'Корзина (не открывать)', en: 'Recycle Bin (do not open)' }));
      } },
      neofetch: { d: d('сведения о системе', 'system info'), run: function () {
        var p = X.phuketNow(api);
        var art = ['      _  _      ', '    (  \\/  )    ', ' .--\\      /--. ', '(    ) () (    )', ' \'--/      \\--\' ', '    (  /\\  )    ', '      \u2019  \u2018      '];
        var info = ['daniil@' + X.pcName, '-------------', 'OS: ' + X.osVersion, t({ ru: 'Хост: монитор в изометрической комнате', en: 'Host: a monitor in an isometric room' }), t({ ru: 'Аптайм: 4,5 года в разработке', en: 'Uptime: 4.5 years in development' }),
          t({ ru: 'Оболочка: Vue 3 / Nuxt + Python / Django', en: 'Shell: Vue 3 / Nuxt + Python / Django' }), t({ ru: 'Процессор: 1 × Fullstack-разработчик', en: 'CPU: 1 × Fullstack developer' }), t({ ru: 'Время: ', en: 'Time: ' }) + X.pad(p.h) + ':' + X.pad(p.m) + ' (UTC+7)'];
        for (var i = 0; i < Math.max(art.length, info.length); i++) print((art[i] || '                ') + '  ' + (info[i] || ''));
      } },
      bsod: { hidden: true, run: function () { api.openApp('bsod'); } },
      taskmgr: { hidden: true, run: function () { api.openApp('taskmgr'); } },
      format: { hidden: true, async: true, run: function (args) {
        if (!/^c:?$/i.test(args[0] || '')) { pt({ ru: 'Использование: format c:', en: 'Usage: format c:' }); return; }
        input.disabled = true; var pc = 0;
        pt({ ru: 'Форматирование диска C: (Andaman)…', en: 'Formatting drive C: (Andaman)...' });
        var ln = h('div.xpa-term-l', ''); out.appendChild(ln);
        (function step() {
          pc = Math.min(99, pc + 7 + Math.floor(Math.random() * 9));
          ln.textContent = '[' + new Array(Math.round(pc / 5) + 1).join('#') + new Array(21 - Math.round(pc / 5)).join('.') + '] ' + pc + '%';
          screen.scrollTop = screen.scrollHeight;
          if (pc < 99) { U.later(X.reduced() ? 10 : 160, step); return; }
          U.sound('error'); pt({ ru: 'Недостаточно прав. И совести.', en: 'Insufficient privileges. And conscience.' }); print('');
          input.disabled = false; input.focus();
        })();
      } },
      credits: { hidden: true, run: function () { pt({ ru: 'Использованные технологии: HTML, CSS, JS, упрямство.', en: 'Technologies used: HTML, CSS, JS, stubbornness.' }); pt({ ru: 'Режиссёр, сценарист, все роли — Даниил Иванов.', en: 'Directed, written and performed by Daniil Ivanov.' }); } },
      lang: { hidden: true, run: function () { pt({ ru: 'Язык переключается значком RU/EN в трее, справа внизу.', en: 'Switch the language with the RU/EN icon in the tray, bottom right.' }); } },
      weather: { hidden: true, run: function () { pt({ ru: 'Пхукет: +30, влажно, к вечеру ливень. Как всегда.', en: 'Phuket: +30, humid, a downpour by evening. As always.' }); } },
      hello: { hidden: true, run: function () { pt({ ru: 'Привет! Спасибо, что заглянули в консоль. Тут бывают пасхалки.', en: 'Hi! Thanks for opening the console. Easter eggs live here.' }); } }
    };
    CMDS.clear = { hidden: true, run: CMDS.cls.run };
    CMDS.ls = { hidden: true, run: CMDS.dir.run };
    CMDS.cv = { hidden: true, run: function () { api.openApp('resume'); pt({ ru: 'Открываю резюме…', en: 'Opening the resume...' }); } };
    CMDS.привет = { hidden: true, run: CMDS.hello.run };

    function exec(raw) {
      var s = raw.trim();
      print(prompt() + raw, 'cmd');
      if (!s) return;
      hist.push(s); if (hist.length > 50) hist.shift(); hi = hist.length;
      var parts = s.split(/\s+/), name = parts[0].toLowerCase().replace(/\.exe$/, ''), args = parts.slice(1);
      var c = CMDS[name];
      if (!c && X.appAliases[name]) { CMDS.open.run([name]); return; }
      if (!c) { U.sound('error'); print(t({ ru: '«' + parts[0] + '» не является внутренней или внешней командой. Введите help.', en: '\'' + parts[0] + '\' is not recognized as an internal or external command. Type help.' })); return; }
      try { c.run(args, s); } catch (e) { print('Error: ' + e.message); }
      if (name !== 'cls' && name !== 'clear' && !(c.async && (name !== 'rm' || args.join(' ').indexOf('-rf') >= 0) && (name !== 'format' || /^c:?$/i.test(args[0] || ''))) && out.lastChild && out.lastChild.textContent !== ' ') print('');
    }

    function complete() {
      var v = input.value, m = v.match(/^(\s*)(\S*)(\s+)?(\S*)$/);
      if (!m) return;
      var pool, word;
      if (m[3] !== undefined && /^open$/i.test(m[2])) { pool = OPENABLE.concat(X.projects.map(function (p) { return p.id; })); word = m[4]; }
      else if (m[3] === undefined) { pool = Object.keys(CMDS).filter(function (k) { return !CMDS[k].hidden; }).concat(OPENABLE.filter(function (a) { return !CMDS[a]; })); word = m[2]; }
      else return;
      var hits = pool.filter(function (x) { return x.indexOf(word.toLowerCase()) === 0; });
      if (hits.length === 1) input.value = (m[3] !== undefined ? m[1] + m[2] + ' ' : m[1]) + hits[0] + (m[3] === undefined && hits[0] === 'open' ? ' ' : '');
      else if (hits.length > 1) {
        print(prompt() + v, 'cmd'); print('  ' + hits.join('  '));
        var pre = hits.reduce(function (a, b) { var i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
        input.value = (m[3] !== undefined ? m[1] + m[2] + ' ' : m[1]) + pre;
      } else U.sound('error');
    }

    input.addEventListener('keydown', function (e) {
      if (matrixStop) { e.preventDefault(); matrixStop(); return; }
      if (e.key === 'Enter') { e.preventDefault(); var v = input.value; input.value = ''; exec(v); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) { hi--; input.value = hist[hi] || ''; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length) { hi++; input.value = hist[hi] || ''; } }
      else if (e.key === 'Tab') { e.preventDefault(); complete(); }
      else if (e.key === 'Escape') { input.value = ''; }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
      else if (e.key === 'c' && e.ctrlKey && !String(window.getSelection())) { e.preventDefault(); print(prompt() + input.value + '^C', 'cmd'); input.value = ''; }
    });
    screen.addEventListener('mouseup', function () { if (!String(window.getSelection())) input.focus({ preventScroll: true }); });

    function startMatrix() {
      var cv = h('canvas.xpa-term-matrix');
      root.appendChild(cv);
      var w = cv.width = root.clientWidth, hh = cv.height = root.clientHeight;
      var ctx = cv.getContext('2d'), size = 14, cols = Math.ceil(w / size), drops = [];
      for (var i = 0; i < cols; i++) drops.push(Math.random() * -20);
      var chars = 'アイウエオカキクケコサシスセソ0123456789VUEDJANGOPYTHON<>{}=/';
      var id = null, stopT = null;
      function frame() {
        ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, w, hh);
        ctx.font = size + 'px monospace';
        for (var i = 0; i < cols; i++) {
          var ch = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillStyle = Math.random() < 0.05 ? '#d7ffd7' : '#00e040';
          ctx.fillText(ch, i * size, drops[i] * size);
          if (drops[i] * size > hh && Math.random() > 0.97) drops[i] = 0;
          drops[i] += 1;
        }
      }
      function stop() {
        clearInterval(id); clearTimeout(stopT); if (cv.parentNode) cv.parentNode.removeChild(cv); matrixStop = null;
        pt({ ru: 'Проснись, посетитель… Матрица — это просто много div-ов.', en: 'Wake up, visitor... The Matrix is just a lot of divs.' });
        input.focus();
      }
      matrixStop = stop;
      cv.addEventListener('click', stop);
      if (X.reduced()) { for (var k = 0; k < 40; k++) frame(); stopT = setTimeout(stop, 1500); }
      else { id = setInterval(frame, 50); stopT = setTimeout(stop, 6000); }
      U.onCleanup(function () { clearInterval(id); clearTimeout(stopT); });
    }

    setPrompt();
    banner();
    if (api.params && api.params.cmd) exec(String(api.params.cmd));
    U.bind(function () { api.win.setTitle(t({ ru: 'Командная строка', en: 'Command Prompt' })); });
    U.later(30, function () { input.focus({ preventScroll: true }); });
    return U.destroy;
  }

  X.register({
    id: 'terminal',
    title: { ru: 'Командная строка', en: 'Command Prompt' },
    icon: X.icons.terminal,
    desktop: true,
    startMenu: 'programs',
    defaultSize: { w: 640, h: 400 },
    minSize: { w: 280, h: 200 },
    singleton: false,
    render: render
  });
})();

export {};
