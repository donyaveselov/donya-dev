// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/notepad.js. Replace module by module; do not edit in place.
/* Notepad (with a README) and Calculator. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;

  var README = {
    ru: 'README.txt\r\n==========\r\n\r\nЭтот рабочий стол живёт внутри монитора на сайте Даниила Иванова.\r\nВсё нарисовано и написано вручную: никаких фреймворков, картинок\r\nи сетевых запросов. Только HTML, CSS и немного упрямства.\r\n\r\nС чего начать:\r\n  * «Мои проекты» — над чем я работаю сейчас\r\n  * «Резюме» — коротко и по делу\r\n  * «Написать мне» — контакты, которые можно скопировать\r\n  * «Командная строка» — введите help\r\n  * «Сапёр» — первый ход всегда безопасен\r\n\r\nМелочи, которые стоит найти:\r\n  * F5 в Блокноте вставляет время на Пхукете\r\n  * В Корзине лежат старые проекты. Попробуйте их восстановить\r\n  * В консоли есть скрытые команды\r\n\r\nP.S. Этот файл можно редактировать. Сохранять — тоже.\r\n',
    en: 'README.txt\r\n==========\r\n\r\nThis desktop lives inside a monitor on Daniil Ivanov\'s website.\r\nEverything is drawn and written by hand: no frameworks, no images\r\nand no network requests. Just HTML, CSS and some stubbornness.\r\n\r\nWhere to start:\r\n  * My Projects: what I am working on now\r\n  * Resume: short and to the point\r\n  * Contact me: contacts you can copy\r\n  * Command Prompt: type help\r\n  * Minesweeper: the first click is always safe\r\n\r\nSmall things worth finding:\r\n  * F5 in Notepad inserts the time in Phuket\r\n  * The Recycle Bin holds old projects. Try restoring them\r\n  * The console has hidden commands\r\n\r\nP.S. You can edit this file. And save it, too.\r\n'
  };

  function renderNotepad(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-notepad', 400);
    var p = api.params || {};
    var src = p.text || README;
    var name = p.title || 'README.txt';
    var modified = false, wrap = true, showStatus = true, fontSize = 13;

    var ta = h('textarea.xpa-np-text', { spellcheck: 'false', wrap: 'soft', 'aria-label': name });
    var st = U.statusbar(2);
    function save() {
      try {
        var a = document.createElement('a');
        a.download = name.replace(/[\\/:*?"<>|]/g, '_');
        a.href = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' }));
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        modified = false; title();
      } catch (e) { U.sound('error'); }
    }
    function insertTime() {
      var n = X.phuketNow(api), dt = n.date;
      var s = X.pad(n.h) + ':' + X.pad(n.m) + ' ' + X.pad(dt.getUTCDate()) + '.' + X.pad(dt.getUTCMonth() + 1) + '.' + dt.getUTCFullYear() + ' (' + t({ ru: 'Пхукет', en: 'Phuket' }) + ')';
      var a = ta.selectionStart, b = ta.selectionEnd;
      ta.value = ta.value.slice(0, a) + s + ta.value.slice(b);
      ta.selectionStart = ta.selectionEnd = a + s.length;
      ta.focus(); changed();
    }
    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Создать', en: 'New' }, key: 'Ctrl+N', action: function () { ta.value = ''; name = t({ ru: 'Безымянный.txt', en: 'Untitled.txt' }); modified = false; src = null; title(); pos(); } },
        { label: { ru: 'Сохранить как…', en: 'Save As…' }, key: 'Ctrl+S', action: save },
        { sep: true },
        { label: { ru: 'Выход', en: 'Exit' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Выделить всё', en: 'Select All' }, key: 'Ctrl+A', action: function () { ta.focus(); ta.select(); } },
        { label: { ru: 'Копировать всё', en: 'Copy all' }, action: function () { X.copyText(ta.value); } },
        { label: { ru: 'Время и дата', en: 'Time/Date' }, key: 'F5', action: insertTime }
      ] },
      { label: { ru: 'Формат', en: 'Format' }, items: [
        { label: { ru: 'Перенос по словам', en: 'Word Wrap' }, checked: function () { return wrap; }, action: function () { wrap = !wrap; ta.setAttribute('wrap', wrap ? 'soft' : 'off'); root.classList.toggle('nowrap', !wrap); } },
        { label: { ru: 'Шрифт крупнее', en: 'Larger font' }, action: function () { fontSize = Math.min(22, fontSize + 1); ta.style.fontSize = fontSize + 'px'; } },
        { label: { ru: 'Шрифт мельче', en: 'Smaller font' }, action: function () { fontSize = Math.max(10, fontSize - 1); ta.style.fontSize = fontSize + 'px'; } }
      ] },
      { label: { ru: 'Вид', en: 'View' }, items: [
        { label: { ru: 'Строка состояния', en: 'Status Bar' }, checked: function () { return showStatus; }, action: function () { showStatus = !showStatus; st.el.style.display = showStatus ? '' : 'none'; } }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About Notepad' }, action: function () { U.aboutDialog({ ru: 'Блокнот', en: 'Notepad' }, { ru: 'Лучший редактор кода, если других нет.', en: 'The best code editor when there is no other.' }); } }
      ] }
    ]);
    [menu, ta, st.el].forEach(function (n) { root.appendChild(n); });

    function title() { api.win.setTitle((modified ? '*' : '') + name + ' — ' + t({ ru: 'Блокнот', en: 'Notepad' })); }
    function pos() {
      var before = ta.value.slice(0, ta.selectionStart).split('\n');
      st.set(1, t({ ru: 'Стр ', en: 'Ln ' }) + before.length + t({ ru: ', стлб ', en: ', Col ' }) + (before[before.length - 1].length + 1));
    }
    function changed() { if (!modified) { modified = true; title(); } pos(); }
    ta.addEventListener('input', changed);
    ['keyup', 'click', 'select'].forEach(function (ev) { ta.addEventListener(ev, pos); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'F5') { e.preventDefault(); insertTime(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      else if (e.key === 'Tab') { e.preventDefault(); var a = ta.selectionStart; ta.value = ta.value.slice(0, a) + '\t' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = a + 1; changed(); }
    });
    U.bind(function () {
      if (!modified && src) ta.value = (typeof src === 'string' ? src : t(src)).replace(/\r\n/g, '\n');
      title(); pos(); st.set(0, '');
    });
    U.later(30, function () { ta.focus({ preventScroll: true }); ta.setSelectionRange(0, 0); ta.scrollTop = 0; pos(); });
    return U.destroy;
  }

  /* ---------------------------------------------------------------- Calculator */
  function renderCalc(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-calc', 300);
    var cur = '0', acc = null, op = null, fresh = true, mem = 0, err = false;
    var disp = h('div.xpa-calc-disp.xpa-selectable', { role: 'status', 'aria-live': 'polite' }, '0.');
    var memEl = h('div.xpa-calc-mem.xpa-sunken');
    var hint = h('div.xpa-calc-hint', { 'aria-live': 'polite' });
    function fmt(n) {
      if (!isFinite(n)) { err = true; return t({ ru: 'Деление на ноль невозможно.', en: 'Cannot divide by zero.' }); }
      var s = String(n);
      if (s.length > 20) s = String(+n.toPrecision(14));
      if (s.length > 20) s = n.toExponential(9);
      return s;
    }
    function show() { disp.textContent = err ? cur : (cur.indexOf('.') < 0 && cur.indexOf('e') < 0 ? cur + '.' : cur); memEl.textContent = mem ? 'M' : ''; }
    function apply(a, b, o) { return o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : o === '/' ? a / b : b; }
    function press(k) {
      if (err && k !== 'C') { return; }
      if (/^[0-9]$/.test(k)) { if (fresh || cur === '0') { cur = k; fresh = false; } else if (cur.replace(/[-.]/g, '').length < 16) cur += k; }
      else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (cur.indexOf('.') < 0) cur += '.'; }
      else if (k === 'C') { cur = '0'; acc = null; op = null; fresh = true; err = false; }
      else if (k === 'CE') { cur = '0'; fresh = true; }
      else if (k === 'BS') { if (!fresh) { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; if (cur === '-') cur = '0'; } }
      else if (k === '+/-') { if (cur !== '0') cur = cur[0] === '-' ? cur.slice(1) : '-' + cur; }
      else if (k === 'sqrt') { var v = +cur; cur = v < 0 ? (err = true, t({ ru: 'Недопустимый ввод.', en: 'Invalid input.' })) : fmt(Math.sqrt(v)); fresh = true; }
      else if (k === '%') { cur = fmt((acc || 0) * +cur / 100); fresh = true; }
      else if (k === '1/x') { cur = fmt(1 / +cur); fresh = true; }
      else if (/^[-+*/]$/.test(k)) { if (op && !fresh) { cur = fmt(apply(acc, +cur, op)); } acc = +cur; op = k; fresh = true; }
      else if (k === '=') { if (op) { var r = apply(acc, +cur, op); cur = fmt(r); acc = null; op = null; fresh = true; if (cur === '42') U.sound('notify'); hint.textContent = cur === '0.30000000000000004' ? t({ ru: 'Это не баг, это IEEE 754.', en: 'Not a bug, that is IEEE 754.' }) : ''; } }
      else if (k === 'MC') mem = 0; else if (k === 'MR') { cur = fmt(mem); fresh = true; } else if (k === 'MS') mem = +cur; else if (k === 'M+') mem += +cur;
      show();
    }
    var keys = [
      ['MC', 'MC'], ['7', '7'], ['8', '8'], ['9', '9'], ['/', '/'], ['sqrt', 'sqrt'],
      ['MR', 'MR'], ['4', '4'], ['5', '5'], ['6', '6'], ['*', '*'], ['%', '%'],
      ['MS', 'MS'], ['1', '1'], ['2', '2'], ['3', '3'], ['-', '-'], ['1/x', '1/x'],
      ['M+', 'M+'], ['0', '0'], ['+/-', '+/-'], ['.', '.'], ['+', '+'], ['=', '=']
    ];
    var top = h('div.xpa-calc-top', [memEl,
      h('button.xpa-calc-k.red.wide', { type: 'button', 'data-k': 'BS' }, 'Backspace'),
      h('button.xpa-calc-k.red', { type: 'button', 'data-k': 'CE' }, 'CE'),
      h('button.xpa-calc-k.red', { type: 'button', 'data-k': 'C' }, 'C')]);
    var pad = h('div.xpa-calc-pad', keys.map(function (k) {
      var cls = /^M/.test(k[0]) ? '.red' : /^[-+*/=]$/.test(k[0]) ? '.red' : /^[0-9.]$|\+\/-/.test(k[0]) ? '.blue' : '.blue';
      return h('button.xpa-calc-k' + cls, { type: 'button', 'data-k': k[0] }, k[1] === 'sqrt' ? '√' : k[1] === '*' ? '×' : k[1] === '/' ? '÷' : k[1]);
    }));
    var menu = U.menubar([
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Копировать', en: 'Copy' }, key: 'Ctrl+C', action: function () { X.copyText(err ? '' : cur); } }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About Calculator' }, action: function () { U.aboutDialog({ ru: 'Калькулятор', en: 'Calculator' }, { ru: 'Считает точнее, чем оценки сроков.', en: 'More accurate than time estimates.' }); } }
      ] }
    ]);
    root.appendChild(menu);
    root.appendChild(h('div.xpa-calc-body', [disp, hint, top, pad]));
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-k]'); if (!b) return;
      U.sound('click'); press(b.getAttribute('data-k'));
    });
    root.addEventListener('keydown', function (e) {
      var k = e.key, map = { Enter: '=', '=': '=', Escape: 'C', Delete: 'CE', Backspace: 'BS', ',': '.', '.': '.', '@': 'sqrt', '%': '%' };
      if (e.ctrlKey || e.metaKey) { if (k === 'c') X.copyText(cur); return; }
      var m = /^[0-9+\-*/]$/.test(k) ? k : map[k];
      if (!m) return;
      e.preventDefault(); press(m);
      var b = root.querySelector('[data-k="' + (m === '/' ? '/' : m) + '"]');
      if (b) { b.classList.add('down'); setTimeout(function () { b.classList.remove('down'); }, 90); }
    });
    root.tabIndex = 0;
    U.bind(function () { api.win.setTitle(t({ ru: 'Калькулятор', en: 'Calculator' })); show(); });
    U.later(30, function () { root.focus({ preventScroll: true }); });
    return U.destroy;
  }

  X.register({
    id: 'notepad',
    title: { ru: 'Блокнот', en: 'Notepad' },
    icon: X.icons.notepad,
    desktop: true,
    startMenu: 'programs',
    defaultSize: { w: 560, h: 420 },
    minSize: { w: 260, h: 200 },
    singleton: false,
    render: renderNotepad
  });
  X.register({
    id: 'calc',
    title: { ru: 'Калькулятор', en: 'Calculator' },
    icon: X.icons.calc,
    desktop: false,
    startMenu: 'programs',
    defaultSize: { w: 300, h: 330 },
    minSize: { w: 260, h: 280 },
    singleton: true,
    render: renderCalc
  });
})();

export {};
