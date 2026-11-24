// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/minesweeper.js. Replace module by module; do not edit in place.
/* Minesweeper: classic rules, first click safe, flags, question marks, chording, three sizes. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;
  function d(ru, en) { return { ru: ru, en: en }; }

  var LEVELS = {
    beginner: { r: 9, c: 9, m: 10, label: d('Новичок', 'Beginner') },
    intermediate: { r: 16, c: 16, m: 40, label: d('Любитель', 'Intermediate') },
    expert: { r: 16, c: 30, m: 99, label: d('Профессионал', 'Expert') }
  };

  // seven-segment digits: segments a b c d e f g
  var SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
  var SEGP = {
    a: 'M2 1h9l-2 2H4z', b: 'M11.5 1.5v9l-2-1.5V3.5z', c: 'M11.5 12.5v9l-2-2v-5.5z', d: 'M2 22h9l-2-2H4z',
    e: 'M1.5 12.5v9l2-2v-5.5z', f: 'M1.5 1.5v9l2-1.5V3.5z', g: 'M2 11.5l2-1.3h5l2 1.3-2 1.3H4z'
  };
  function led(n) {
    var s = n < 0 ? '-' + X.pad(Math.min(99, -n), 2) : X.pad(Math.min(999, n), 3);
    var out = '<svg viewBox="0 0 41 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    for (var i = 0; i < 3; i++) {
      var on = SEG[s[i]] || '';
      out += '<g transform="translate(' + (i * 13.5 + 0.5) + ' 0)">';
      Object.keys(SEGP).forEach(function (k) { out += '<path d="' + SEGP[k] + '" fill="' + (on.indexOf(k) >= 0 ? '#ff0000' : '#2a0000') + '"/>'; });
      out += '</g>';
    }
    return out + '</svg>';
  }
  var FACE = {
    smile: '<path d="M8 15.5c2.2 2.4 5.8 2.4 8 0" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/><rect x="8" y="8.5" width="2.2" height="2.2"/><rect x="13.8" y="8.5" width="2.2" height="2.2"/>',
    oh: '<rect x="8" y="8" width="2.2" height="2.2"/><rect x="13.8" y="8" width="2.2" height="2.2"/><ellipse cx="12" cy="15.5" rx="2" ry="2.4" fill="none" stroke="#000" stroke-width="1.5"/>',
    dead: '<path d="M7.5 7.5l3 3M10.5 7.5l-3 3M13.5 7.5l3 3M16.5 7.5l-3 3" stroke="#000" stroke-width="1.3"/><path d="M8 17c2.2-2.2 5.8-2.2 8 0" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>',
    cool: '<path d="M5.5 9h13M6.5 9l1 3h3.5l1-3M12 9l1 3h3.5l1-3" fill="#000" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/><path d="M8.5 15.5c2 1.8 5 1.8 7 0" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>'
  };
  function face(k) { return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#ffff00" stroke="#000" stroke-width="1.2"/>' + FACE[k] + '</svg>'; }
  var MINE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v13M1.5 8h13M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="#000" stroke-width="1.4"/><circle cx="8" cy="8" r="4.6"/><rect x="5.8" y="5.6" width="2" height="2" fill="#fff"/></svg>';
  var FLAG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.5 2.5L3.5 5.5 8.5 8.2z" fill="#f00"/><path d="M8.5 2v8.5" stroke="#000" stroke-width="1.2"/><path d="M6 11h5v1.3H6zM4 12.3h9V14H4z"/></svg>';
  var QMARK = '<span class="q">?</span>';
  /* the original winmine.exe sprites replace the drawings above when the XP bitmaps are loaded (16 px cells: 1 px grid line on an open cell, 2 px bevel on a closed one) */
  var MSI = window.XP_ICO || {};
  function spr(key, vb, w, hgt) { return MSI[key] ? '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><image href="' + MSI[key] + '" width="' + (w || 16) + '" height="' + (hgt || 16) + '" style="image-rendering:pixelated"/></svg>' : null; }
  var OPEN_VB = '1 1 15 15', SHUT_VB = '2 2 12 12';
  var MINE_S = spr('ms_mine', OPEN_VB) || MINE, BOOM_S = spr('ms_boom', OPEN_VB) || MINE, WRONG_S = spr('ms_misflagged', OPEN_VB) || MINE;
  var FLAG_S = spr('ms_flag', SHUT_VB) || FLAG, QMARK_S = spr('ms_question', SHUT_VB) || QMARK, FLAG_BTN = spr('ms_flag', '0 0 16 16') || FLAG;
  var NUM_S = [];
  for (var nn = 1; nn <= 8; nn++) NUM_S[nn] = spr('ms_n' + nn, OPEN_VB);
  var FACE_S = { smile: spr('ms_smile', '0 0 17 17', 17, 17), oh: spr('ms_ohh', '0 0 17 17', 17, 17), dead: spr('ms_dead', '0 0 17 17', 17, 17), cool: spr('ms_win', '0 0 17 17', 17, 17) };
  if (MSI.ms_d0) {
    led = function (n) {
      var s = n < 0 ? '-' + X.pad(Math.min(99, -n), 2) : X.pad(Math.min(999, n), 3), out = '<svg viewBox="0 0 39 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
      for (var i = 0; i < 3; i++) out += '<image href="' + MSI[s[i] === '-' ? 'ms_dminus' : 'ms_d' + s[i]] + '" x="' + i * 13 + '" width="13" height="23" style="image-rendering:pixelated"/>';
      return out + '</svg>';
    };
  }

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-mines', 520);
    var level = 'beginner', marks = true, flagMode = false;
    try { var saved = JSON.parse(localStorage.getItem('xpa-mines') || '{}'); if (LEVELS[saved.level]) level = saved.level; if (saved.marks === false) marks = false; } catch (e) { /* storage blocked */ }
    var best = {};
    try { best = JSON.parse(localStorage.getItem('xpa-mines-best') || '{}') || {}; } catch (e) { best = {}; }
    function save() { try { localStorage.setItem('xpa-mines', JSON.stringify({ level: level, marks: marks })); localStorage.setItem('xpa-mines-best', JSON.stringify(best)); } catch (e) { /* ignore */ } }

    var G; // game state
    var timerId = null;
    var cursor = 0;

    var menu = U.menubar([
      { label: { ru: 'Игра', en: 'Game' }, items: [
        { label: { ru: 'Новая игра', en: 'New' }, key: 'F2', action: function () { newGame(); } },
        { sep: true },
        { label: LEVELS.beginner.label, radio: true, checked: function () { return level === 'beginner'; }, action: function () { setLevel('beginner'); } },
        { label: LEVELS.intermediate.label, radio: true, checked: function () { return level === 'intermediate'; }, action: function () { setLevel('intermediate'); } },
        { label: LEVELS.expert.label, radio: true, checked: function () { return level === 'expert'; }, action: function () { setLevel('expert'); } },
        { sep: true },
        { label: { ru: 'Метки (?)', en: 'Marks (?)' }, checked: function () { return marks; }, action: function () { marks = !marks; save(); } },
        { label: { ru: 'Режим флажков (касание)', en: 'Flag mode (touch)' }, checked: function () { return flagMode; }, action: function () { toggleFlagMode(); } },
        { sep: true },
        { label: { ru: 'Лучшие результаты…', en: 'Best Times…' }, action: showBest },
        { sep: true },
        { label: { ru: 'Выход', en: 'Exit' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'Как играть', en: 'How to play' }, key: 'F1', action: help },
        { label: { ru: 'О программе', en: 'About' }, action: function () { U.aboutDialog({ ru: 'Сапёр', en: 'Minesweeper' }, { ru: 'Первый ход всегда безопасен. Как и первое сообщение в Telegram.', en: 'The first click is always safe. So is the first message on Telegram.' }); } }
      ] }
    ]);

    var mineLed = h('div.xpa-ms-led', { role: 'img' });
    var timeLed = h('div.xpa-ms-led', { role: 'img' });
    var smiley = h('button.xpa-ms-face', { type: 'button', 'aria-label': { ru: 'Новая игра', en: 'New game' } });
    var flagBtn = h('button.xpa-ms-flagmode', { type: 'button', 'aria-pressed': 'false', title: { ru: 'Режим флажков', en: 'Flag mode' }, html: FLAG_BTN });
    var board = h('div.xpa-ms-board', { role: 'grid', tabindex: '0', 'aria-label': { ru: 'Минное поле', en: 'Minefield' } });
    var game = h('div.xpa-ms-game', [h('div.xpa-ms-top', [mineLed, h('div.xpa-ms-mid', [smiley, flagBtn]), timeLed]), h('div.xpa-ms-field', [board])]);
    var wrapEl = h('div.xpa-ms-wrap', [game]);
    var live = h('div.xpa-sr', { 'aria-live': 'polite' });
    root.appendChild(menu); root.appendChild(wrapEl); root.appendChild(live);

    function idx(r, c) { return r * G.c + c; }
    function neighbors(i) {
      var r = Math.floor(i / G.c), c = i % G.c, out = [];
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < G.r && cc >= 0 && cc < G.c) out.push(idx(rr, cc));
      }
      return out;
    }

    function setLevel(l) { level = l; save(); newGame(); fitWindow(); }
    function toggleFlagMode() { flagMode = !flagMode; flagBtn.setAttribute('aria-pressed', String(flagMode)); flagBtn.classList.toggle('on', flagMode); }

    function newGame() {
      var L = LEVELS[level];
      clearInterval(timerId); timerId = null;
      G = { r: L.r, c: L.c, m: L.m, mine: [], open: [], flag: [], n: [], placed: false, over: false, won: false, time: 0, opened: 0, cells: [] };
      var total = L.r * L.c;
      for (var i = 0; i < total; i++) { G.mine.push(false); G.open.push(false); G.flag.push(0); G.n.push(0); }
      board.innerHTML = '';
      board.style.gridTemplateColumns = 'repeat(' + L.c + ', var(--cs))';
      for (var k = 0; k < total; k++) {
        var cell = h('div.xpa-ms-cell', { role: 'gridcell', 'data-i': String(k) });
        G.cells.push(cell); board.appendChild(cell);
      }
      cursor = Math.min(cursor, total - 1);
      setFace('smile'); updateLeds(); sizeCells(); paintCursor();
      root.setAttribute('data-level', level);
    }

    function place(safe) {
      var banned = {}; banned[safe] = 1; neighbors(safe).forEach(function (j) { banned[j] = 1; });
      var cand = [];
      for (var i = 0; i < G.mine.length; i++) if (!banned[i]) cand.push(i);
      for (var k = 0; k < G.m; k++) { var p = k + Math.floor(Math.random() * (cand.length - k)); var tmp = cand[k]; cand[k] = cand[p]; cand[p] = tmp; G.mine[cand[k]] = true; }
      for (var j = 0; j < G.mine.length; j++) G.n[j] = neighbors(j).filter(function (q) { return G.mine[q]; }).length;
      G.placed = true;
      timerId = setInterval(function () { if (G.time < 999) { G.time++; updateLeds(); } }, 1000);
      G.time = 1; updateLeds();
    }

    function paint(i) {
      var el = G.cells[i];
      el.className = 'xpa-ms-cell';
      el.innerHTML = '';
      if (G.open[i]) {
        el.classList.add('open');
        if (G.mine[i]) { el.innerHTML = G.boom === i ? BOOM_S : MINE_S; if (G.boom === i) el.classList.add('boom'); }
        else if (G.n[i]) { if (NUM_S[G.n[i]]) el.innerHTML = NUM_S[G.n[i]]; else el.textContent = G.n[i]; el.classList.add('n' + G.n[i]); }
      } else if (G.over && G.mine[i] && G.flag[i] !== 1 && !G.won) { el.classList.add('open'); el.innerHTML = MINE_S; }
      else if (G.over && !G.mine[i] && G.flag[i] === 1) { el.classList.add('open', 'wrong'); el.innerHTML = WRONG_S; }
      else if (G.flag[i] === 1) { el.innerHTML = FLAG_S; el.classList.add('flag'); }
      else if (G.flag[i] === 2) { el.innerHTML = QMARK_S; }
      if (i === cursor) el.classList.add('cur');
      el.setAttribute('aria-label', G.open[i] ? (G.mine[i] ? 'mine' : String(G.n[i] || t({ ru: 'пусто', en: 'empty' }))) : (G.flag[i] === 1 ? t({ ru: 'флажок', en: 'flag' }) : t({ ru: 'закрыто', en: 'closed' })));
    }

    function reveal(i) {
      if (G.over || G.open[i] || G.flag[i] === 1) return;
      if (!G.placed) place(i);
      if (G.mine[i]) { G.open[i] = true; G.boom = i; lose(); return; }
      var stack = [i];
      while (stack.length) {
        var k = stack.pop();
        if (G.open[k] || G.flag[k] === 1) continue;
        G.open[k] = true; G.opened++; if (G.flag[k]) G.flag[k] = 0;
        paint(k);
        if (G.n[k] === 0) neighbors(k).forEach(function (q) { if (!G.open[q] && !G.mine[q]) stack.push(q); });
      }
      checkWin();
    }

    function chord(i) {
      if (G.over || !G.open[i] || !G.n[i]) return;
      var nb = neighbors(i);
      var flags = nb.filter(function (q) { return G.flag[q] === 1; }).length;
      if (flags !== G.n[i]) return;
      nb.forEach(function (q) { if (!G.open[q] && G.flag[q] !== 1) reveal(q); });
    }

    function toggleFlag(i) {
      if (G.over || G.open[i]) return;
      G.flag[i] = G.flag[i] === 0 ? 1 : (G.flag[i] === 1 && marks ? 2 : 0);
      paint(i); updateLeds();
      U.sound('click');
    }

    function lose() {
      G.over = true; clearInterval(timerId);
      setFace('dead');
      for (var i = 0; i < G.mine.length; i++) paint(i);
      U.sound('error');
      live.textContent = t({ ru: 'Бум! Игра окончена.', en: 'Boom! Game over.' });
      if (!X.reduced()) { game.classList.remove('shake'); void game.offsetWidth; game.classList.add('shake'); }
    }
    function checkWin() {
      if (G.opened !== G.mine.length - G.m || G.over) return;
      G.over = true; G.won = true; clearInterval(timerId);
      for (var i = 0; i < G.mine.length; i++) if (G.mine[i]) G.flag[i] = 1;
      for (var j = 0; j < G.mine.length; j++) paint(j);
      updateLeds(); setFace('cool');
      U.sound('notify');
      live.textContent = t({ ru: 'Победа!', en: 'You win!' });
      var prev = best[level];
      if (!prev || G.time < prev) {
        best[level] = G.time; save();
        U.dialog({ title: { ru: 'Сапёр', en: 'Minesweeper' }, icon: 'info',
          text: t({ ru: 'Новый рекорд для уровня «', en: 'New best time for ' }) + t(LEVELS[level].label) + t({ ru: '»: ', en: ': ' }) + G.time + t({ ru: ' с.\n\nТакая внимательность пригодится и в код-ревью.', en: ' s.\n\nThat kind of attention also works well in code review.' }),
          buttons: [{ label: 'OK', primary: true }] });
      }
    }

    function updateLeds() {
      var flags = G.flag.filter(function (f) { return f === 1; }).length;
      mineLed.innerHTML = led(G.m - flags);
      mineLed.setAttribute('aria-label', t({ ru: 'Мин осталось: ', en: 'Mines left: ' }) + (G.m - flags));
      timeLed.innerHTML = led(G.time);
      timeLed.setAttribute('aria-label', t({ ru: 'Время: ', en: 'Time: ' }) + G.time);
    }
    var faceNow = '';
    function setFace(k) { if (faceNow === k) return; faceNow = k; smiley.innerHTML = FACE_S[k] || face(k); }

    /* ---- pointer input */
    var press = null; // { id, buttons, both, longT, flagged, i, type }
    function cellAt(e) { var el = e.target.closest && e.target.closest('.xpa-ms-cell'); return el ? +el.getAttribute('data-i') : -1; }
    function clearPressed() { Array.prototype.forEach.call(board.querySelectorAll('.pressed'), function (el) { el.classList.remove('pressed'); }); }
    function showPressed(i, both) {
      clearPressed();
      if (i < 0 || G.over) return;
      var list = both || G.open[i] ? [i].concat(neighbors(i)) : [i];
      list.forEach(function (q) { if (!G.open[q] && G.flag[q] !== 1) G.cells[q].classList.add('pressed'); });
    }
    board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    board.addEventListener('pointerdown', function (e) {
      if (G.over && e.button !== 0) return;
      var i = cellAt(e); if (i < 0) return;
      cursor = i; paintCursor();
      if (e.pointerType === 'touch') {
        press = { i: i, type: 'touch', flagged: false };
        press.longT = setTimeout(function () { if (press && !G.open[press.i]) { toggleFlag(press.i); press.flagged = true; if (navigator.vibrate) try { navigator.vibrate(20); } catch (er) { /* ignore */ } } }, 420);
        if (!G.over) setFace('oh');
        showPressed(i, false);
        return;
      }
      if (e.button === 2 && !(e.buttons & 1)) { toggleFlag(i); press = { i: i, rightOnly: true }; return; }
      if (e.button === 0 || e.button === 1 || (e.buttons & 3) === 3) {
        e.preventDefault();
        press = { i: i, both: e.button === 1 || (e.buttons & 3) === 3 };
        if (!G.over) setFace('oh');
        showPressed(i, press.both);
        try { board.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      }
    });
    board.addEventListener('pointermove', function (e) {
      if (!press || press.rightOnly) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var c = el && el.closest && el.closest('.xpa-ms-cell');
      var i = c && board.contains(c) ? +c.getAttribute('data-i') : -1;
      if (press.type === 'touch' && i !== press.i) { clearTimeout(press.longT); press.cancel = true; }
      if (i !== press.i) { press.i = i; showPressed(i, press.both); }
      if ((e.buttons & 3) === 3) press.both = true;
    });
    function endPress(e) {
      if (!press) return;
      var p = press; press = null;
      clearTimeout(p.longT); clearPressed();
      if (!G.over) setFace('smile');
      if (p.rightOnly) return;
      if (p.i < 0 || p.cancel) return;
      if (p.type === 'touch') {
        if (p.flagged) return;
        if (flagMode && !G.open[p.i]) { toggleFlag(p.i); return; }
        if (G.open[p.i]) chord(p.i); else reveal(p.i);
        return;
      }
      if (p.both || G.open[p.i]) chord(p.i); else reveal(p.i);
      if (!G.over) setFace('smile');
    }
    board.addEventListener('pointerup', endPress);
    board.addEventListener('pointercancel', function () { if (press) { clearTimeout(press.longT); press = null; clearPressed(); if (!G.over) setFace('smile'); } });

    smiley.addEventListener('click', function () { U.sound('click'); newGame(); });
    flagBtn.addEventListener('click', function () { U.sound('click'); toggleFlagMode(); });

    /* ---- keyboard */
    function paintCursor() {
      var prev = board.querySelector('.cur'); if (prev) prev.classList.remove('cur');
      if (G.cells[cursor]) G.cells[cursor].classList.add('cur');
    }
    board.addEventListener('keydown', function (e) {
      var r = Math.floor(cursor / G.c), c = cursor % G.c;
      if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
      else if (e.key === 'ArrowDown') r = Math.min(G.r - 1, r + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') c = Math.min(G.c - 1, c + 1);
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (G.open[cursor]) chord(cursor); else reveal(cursor); return; }
      else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') { e.preventDefault(); toggleFlag(cursor); return; }
      else return;
      e.preventDefault(); cursor = idx(r, c); paintCursor();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'F2') { e.preventDefault(); newGame(); }
      else if (e.key === 'F1') { e.preventDefault(); help(); }
    });

    function help() {
      U.dialog({ title: { ru: 'Как играть', en: 'How to play' }, icon: 'info', text: {
        ru: 'Откройте все клетки без мин.\n\n• Щелчок — открыть клетку (первый всегда безопасен).\n• Правая кнопка или долгое касание — флажок.\n• Щелчок по цифре, у которой стоят все флажки, открывает соседей.\n• Клавиатура: стрелки, пробел — открыть, F — флажок, F2 — новая игра.',
        en: 'Open every cell that has no mine.\n\n• Click opens a cell (the first one is always safe).\n• Right click or long press places a flag.\n• Clicking a number whose flags are all placed opens its neighbours.\n• Keyboard: arrows, Space opens, F flags, F2 starts a new game.' }, buttons: [{ label: 'OK', primary: true }] });
    }
    function showBest() {
      var lines = Object.keys(LEVELS).map(function (k) { return t(LEVELS[k].label) + ': ' + (best[k] ? best[k] + t({ ru: ' с', en: ' s' }) : '999 ' + t({ ru: 'Аноним', en: 'Anonymous' })); });
      U.dialog({ title: { ru: 'Лучшие результаты', en: 'Fastest Mine Sweepers' }, icon: 'info', text: lines.join('\n'), buttons: [
        { label: { ru: 'Сбросить', en: 'Reset Scores' }, onClick: function () { best = {}; save(); } },
        { label: 'OK', primary: true }] });
    }

    function sizeCells() {
      var avail = wrapEl.clientWidth - 30;
      var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      var fit = Math.floor(avail / G.c);
      var cs = 16;
      if (coarse || root.clientWidth < 520) cs = Math.max(16, Math.min(26, fit));
      root.style.setProperty('--cs', cs + 'px');
    }
    function fitWindow() {
      // api.win.resize is a shell extra (not in the contract): fit the window around the board when available
      if (!api.win || typeof api.win.resize !== 'function') return;
      requestAnimationFrame(function () {
        try { api.win.resize(game.offsetWidth + 34, game.offsetHeight + 22 + 28 + 34); } catch (e) { /* optional */ }
      });
    }
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (G) sizeCells(); }); ro.observe(wrapEl); U.onCleanup(function () { ro.disconnect(); }); }

    newGame();
    fitWindow();
    U.bind(function () { api.win.setTitle(t({ ru: 'Сапёр', en: 'Minesweeper' })); updateLeds(); });
    U.onCleanup(function () { clearInterval(timerId); });
    U.later(30, function () { board.focus({ preventScroll: true }); });
    // test hook (used by automated checks; harmless)
    root.__ms = { state: function () { return G; }, reveal: reveal, chord: chord, flag: toggleFlag, newGame: newGame, setLevel: setLevel };
    return U.destroy;
  }

  X.register({
    id: 'minesweeper',
    title: { ru: 'Сапёр', en: 'Minesweeper' },
    icon: X.icons.minesweeper,
    desktop: true,
    startMenu: 'programs',
    defaultSize: { w: 300, h: 380 },
    minSize: { w: 220, h: 260 },
    singleton: true,
    render: render
  });
})();

export {};
