// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/paint.js. Replace module by module; do not edit in place.
/* Paint: pencil, brush, airbrush, eraser, fill, line, rectangle, ellipse, colour picker, undo/redo, save PNG. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;
  function d(ru, en) { return { ru: ru, en: en }; }

  var PALETTE = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'];

  var TOOLS = [
    { id: 'pick', label: d('Пипетка', 'Pick Color'), icon: '<path d="M11 2.5l2.5 2.5-1.4 1.4-1-1L5 11.5 3 13l-.5-.5L4 10.5l6-6-1-1z" fill="#ddd" stroke="#333" stroke-width=".9"/>' },
    { id: 'fill', label: d('Заливка', 'Fill With Color'), icon: '<path d="M3 8l5-5 5 5-5 5z" fill="#fff" stroke="#333"/><path d="M12.5 9.5c1 1.5 1.5 2.3 1.5 3a1.5 1.5 0 0 1-3 0c0-.7.5-1.5 1.5-3z" fill="#2f6fe0"/><path d="M3 8h10l-5 5z" fill="#2f6fe0" opacity=".6"/>' },
    { id: 'pencil', label: d('Карандаш', 'Pencil'), icon: '<path d="M3 13l1-3 7-7 2 2-7 7z" fill="#f2c14e" stroke="#7a5a12" stroke-width=".9"/><path d="M3 13l1-3 2 2z" fill="#333"/>' },
    { id: 'brush', label: d('Кисть', 'Brush'), icon: '<path d="M13.5 2.5l-6 6 1 1 6-6z" fill="#8a5a2b"/><path d="M7.5 8.5c-2 0-3.5 1.5-3.5 3S3 13.5 2 14c2.5.3 6 0 6.5-3.5z" fill="#2f6fe0"/>' },
    { id: 'air', label: d('Распылитель', 'Airbrush'), icon: '<rect x="6" y="6" width="5" height="8" rx="1" fill="#bbb" stroke="#555" stroke-width=".8"/><rect x="7.5" y="4" width="2" height="2" fill="#555"/><g fill="#2f6fe0"><circle cx="3" cy="3" r=".7"/><circle cx="5" cy="2" r=".7"/><circle cx="4" cy="5" r=".7"/><circle cx="2" cy="6" r=".6"/></g>' },
    { id: 'eraser', label: d('Ластик', 'Eraser'), icon: '<path d="M2.5 10.5l6-6 5 5-4 4h-4z" fill="#f5a3b5" stroke="#8a3a4a" stroke-width=".9"/><path d="M2.5 10.5l3 3" stroke="#8a3a4a" stroke-width=".9"/>' },
    { id: 'line', label: d('Линия', 'Line'), icon: '<path d="M2.5 13.5l11-11" stroke="#000" stroke-width="1.6"/>' },
    { id: 'rect', label: d('Прямоугольник', 'Rectangle'), icon: '<rect x="2.5" y="4.5" width="11" height="8" fill="none" stroke="#000" stroke-width="1.4"/>' },
    { id: 'ellipse', label: d('Эллипс', 'Ellipse'), icon: '<ellipse cx="8" cy="8.5" rx="5.5" ry="4" fill="none" stroke="#000" stroke-width="1.4"/>' },
    { id: 'rrect', label: d('Скруглённый прямоугольник', 'Rounded Rectangle'), icon: '<rect x="2.5" y="4.5" width="11" height="8" rx="3" fill="none" stroke="#000" stroke-width="1.4"/>' }
  ];
  // the original mspaint tool box bitmaps replace the drawings when the XP bitmaps are loaded
  TOOLS.forEach(function (tl) {
    var src = window.XP_ICO && window.XP_ICO['pt_' + tl.id];
    if (src) tl.icon = '<image href="' + src + '" width="16" height="16" style="image-rendering:pixelated"/>';
  });

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-paint', 480);
    var W = 640, H = 400;
    var tool = 'pencil', size = 2, fill = 'outline';
    var fg = '#000000', bg = '#ffffff';
    var undo = [], redo = [];
    var dirty = false;

    var cv = h('canvas.xpa-pt-canvas', { width: String(W), height: String(H), 'aria-label': { ru: 'Холст', en: 'Canvas' }, tabindex: '0' });
    var ov = h('canvas.xpa-pt-overlay', { width: String(W), height: String(H), 'aria-hidden': 'true' });
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var octx = ov.getContext('2d');

    function snapshot() { undo.push(ctx.getImageData(0, 0, W, H)); if (undo.length > 30) undo.shift(); redo = []; dirty = true; refreshTitle(); }
    function doUndo() { if (!undo.length) { U.sound('error'); return; } redo.push(ctx.getImageData(0, 0, W, H)); ctx.putImageData(undo.pop(), 0, 0); }
    function doRedo() { if (!redo.length) { U.sound('error'); return; } undo.push(ctx.getImageData(0, 0, W, H)); ctx.putImageData(redo.pop(), 0, 0); }
    function clearAll() { snapshot(); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
    function newImage() { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); undo = []; redo = []; dirty = false; refreshTitle(); }
    function savePng() {
      try {
        var a = document.createElement('a');
        a.download = (U.lang() === 'ru' ? 'рисунок' : 'untitled') + '.png';
        a.href = cv.toDataURL('image/png');
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        dirty = false; refreshTitle();
      } catch (e) {
        U.dialog({ title: 'Paint', icon: 'error', text: { ru: 'Не удалось сохранить файл.', en: 'Could not save the file.' }, buttons: [{ label: 'OK', primary: true }] });
      }
    }
    function flipH() { snapshot(); var img = ctx.getImageData(0, 0, W, H), out = ctx.createImageData(W, H); for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var s = (y * W + x) * 4, dd = (y * W + (W - 1 - x)) * 4; for (var k = 0; k < 4; k++) out.data[dd + k] = img.data[s + k]; } ctx.putImageData(out, 0, 0); }
    function invert() { snapshot(); var img = ctx.getImageData(0, 0, W, H); for (var i = 0; i < img.data.length; i += 4) { img.data[i] = 255 - img.data[i]; img.data[i + 1] = 255 - img.data[i + 1]; img.data[i + 2] = 255 - img.data[i + 2]; } ctx.putImageData(img, 0, 0); }

    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Создать', en: 'New' }, key: 'Ctrl+N', action: function () {
          if (!dirty) { newImage(); return; }
          U.dialog({ title: 'Paint', icon: 'warn', text: { ru: 'Сохранить изменения в рисунке?', en: 'Save changes to untitled?' }, buttons: [
            { label: { ru: 'Да', en: 'Yes' }, primary: true, onClick: function () { savePng(); newImage(); } },
            { label: { ru: 'Нет', en: 'No' }, onClick: newImage }, { label: { ru: 'Отмена', en: 'Cancel' } }] });
        } },
        { label: { ru: 'Сохранить как PNG', en: 'Save as PNG' }, key: 'Ctrl+S', action: savePng },
        { sep: true },
        { label: { ru: 'Выход', en: 'Exit' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Отменить', en: 'Undo' }, key: 'Ctrl+Z', disabled: function () { return !undo.length; }, action: doUndo },
        { label: { ru: 'Повторить', en: 'Repeat' }, key: 'Ctrl+Y', disabled: function () { return !redo.length; }, action: doRedo },
        { sep: true },
        { label: { ru: 'Очистить', en: 'Clear Image' }, key: 'Ctrl+Shift+N', action: clearAll }
      ] },
      { label: { ru: 'Рисунок', en: 'Image' }, items: [
        { label: { ru: 'Отразить по горизонтали', en: 'Flip Horizontal' }, action: flipH },
        { label: { ru: 'Обратить цвета', en: 'Invert Colors' }, key: 'Ctrl+I', action: invert }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About' }, action: function () { U.aboutDialog({ ru: 'Paint', en: 'Paint' }, { ru: 'Левая кнопка — основной цвет, правая — фоновый. Шедевры сохраняются в PNG.', en: 'Left button paints the primary colour, right button the secondary. Masterpieces save as PNG.' }); } }
      ] }
    ]);

    /* tool box */
    var toolBtns = {};
    var sizesBox = h('div.xpa-pt-opts.xpa-sunken');
    var box = h('div.xpa-pt-tools', { role: 'toolbar', 'aria-label': { ru: 'Инструменты', en: 'Tools' } });
    TOOLS.forEach(function (tl) {
      var b = h('button.xpa-pt-tool', { type: 'button', title: tl.label, 'aria-label': tl.label, 'aria-pressed': 'false', html: X.svg(tl.icon, '0 0 16 16') });
      b.addEventListener('click', function () { U.sound('click'); setTool(tl.id); });
      toolBtns[tl.id] = b; box.appendChild(b);
    });
    var toolbox = h('div.xpa-pt-left', [box, sizesBox]);

    function setTool(id) {
      tool = id;
      Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.toggle('on', k === id); toolBtns[k].setAttribute('aria-pressed', String(k === id)); });
      sizesBox.innerHTML = '';
      var opts = [];
      if (id === 'brush' || id === 'eraser' || id === 'line' || id === 'pencil' || id === 'air') {
        var list = id === 'eraser' ? [4, 8, 12, 20] : id === 'air' ? [8, 14, 22] : id === 'pencil' ? [1, 2, 3] : [2, 4, 6, 10];
        if (list.indexOf(size) < 0) size = list[1] || list[0];
        list.forEach(function (s) {
          var b = h('button.xpa-pt-opt' + (s === size ? '.on' : ''), { type: 'button', title: s + ' px' }, h('span.xpa-pt-dot', { style: { width: Math.min(18, Math.max(2, s)) + 'px', height: Math.min(18, Math.max(2, s)) + 'px', 'border-radius': id === 'eraser' ? '0' : '50%' } }));
          b.addEventListener('click', function () { size = s; setTool(tool); });
          opts.push(b);
        });
      } else if (id === 'rect' || id === 'ellipse' || id === 'rrect') {
        [['outline', d('Контур', 'Outline')], ['both', d('Контур и заливка', 'Outline and fill')], ['fill', d('Заливка', 'Fill')]].forEach(function (o) {
          var b = h('button.xpa-pt-opt.shape' + (fill === o[0] ? '.on' : ''), { type: 'button', title: o[1] }, h('span.xpa-pt-sh.' + o[0]));
          b.addEventListener('click', function () { fill = o[0]; setTool(tool); });
          opts.push(b);
        });
      }
      opts.forEach(function (o) { sizesBox.appendChild(o); });
      cv.setAttribute('data-tool', id);
      st.set(0, t(TOOLS.filter(function (x) { return x.id === id; })[0].label));
    }

    /* palette */
    var swFg = h('div.xpa-pt-swfg'), swBg = h('div.xpa-pt-swbg');
    var pal = h('div.xpa-pt-palette', [h('div.xpa-pt-cur.xpa-sunken', { title: { ru: 'Основной и фоновый цвет', en: 'Primary and secondary colour' } }, [swBg, swFg]), h('div.xpa-pt-colors')]);
    var colorsEl = pal.lastChild;
    PALETTE.forEach(function (c) {
      var b = h('button.xpa-pt-color', { type: 'button', style: { background: c }, title: c, 'aria-label': c });
      b.addEventListener('click', function () { fg = c; paintSwatch(); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); bg = c; paintSwatch(); });
      b.addEventListener('dblclick', function () {
        var inp = document.createElement('input'); inp.type = 'color'; inp.value = fg;
        inp.addEventListener('input', function () { fg = inp.value; b.style.background = fg; paintSwatch(); });
        inp.click();
      });
      colorsEl.appendChild(b);
    });
    function paintSwatch() { swFg.style.background = fg; swBg.style.background = bg; }

    var stage = h('div.xpa-pt-stage', [h('div.xpa-pt-paper', [cv, ov])]);
    var st = U.statusbar(3);
    var main = h('div.xpa-pt-main', [toolbox, stage]);
    [menu, main, pal, st.el].forEach(function (n) { root.appendChild(n); });

    /* drawing */
    function pos(e) {
      var r = cv.getBoundingClientRect();
      return { x: Math.floor((e.clientX - r.left) * W / r.width), y: Math.floor((e.clientY - r.top) * H / r.height) };
    }
    var drag = null;
    function strokeSeg(c, a, b, w, color, square) {
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.lineCap = square ? 'square' : 'round'; c.lineJoin = 'round';
      if (w <= 1) { // crisp 1px Bresenham for the pencil
        var x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
        for (;;) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
        return;
      }
      c.beginPath(); c.moveTo(a.x + 0.5, a.y + 0.5); c.lineTo(b.x + 0.5, b.y + 0.5); c.stroke();
    }
    function spray(p, color) {
      ctx.fillStyle = color;
      for (var i = 0; i < size * 1.5; i++) { var a = Math.random() * Math.PI * 2, r = Math.random() * size; ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 1, 1); }
    }
    function hexToRgb(hx) { var n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function floodFill(p, color) {
      var img = ctx.getImageData(0, 0, W, H), D = img.data, i0 = (p.y * W + p.x) * 4;
      var tr = D[i0], tg = D[i0 + 1], tb = D[i0 + 2], ta = D[i0 + 3], rgb = hexToRgb(color);
      if (tr === rgb[0] && tg === rgb[1] && tb === rgb[2] && ta === 255) return;
      function match(i) { return D[i] === tr && D[i + 1] === tg && D[i + 2] === tb && D[i + 3] === ta; }
      var stack = [[p.x, p.y]];
      while (stack.length) {
        var q = stack.pop(), x = q[0], y = q[1], i = (y * W + x) * 4;
        while (x >= 0 && match(i)) { x--; i -= 4; }
        x++; i += 4;
        var up = false, dn = false;
        while (x < W && match(i)) {
          D[i] = rgb[0]; D[i + 1] = rgb[1]; D[i + 2] = rgb[2]; D[i + 3] = 255;
          if (y > 0) { if (match(i - W * 4)) { if (!up) { stack.push([x, y - 1]); up = true; } } else up = false; }
          if (y < H - 1) { if (match(i + W * 4)) { if (!dn) { stack.push([x, y + 1]); dn = true; } } else dn = false; }
          x++; i += 4;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    function shape(c, a, b, color, other, shift) {
      var x = Math.min(a.x, b.x) + 0.5, y = Math.min(a.y, b.y) + 0.5, w = Math.abs(b.x - a.x), hh = Math.abs(b.y - a.y);
      if (shift) { var m = Math.max(w, hh); w = hh = m; if (b.x < a.x) x = a.x - m + 0.5; if (b.y < a.y) y = a.y - m + 0.5; }
      c.beginPath();
      if (tool === 'rect') c.rect(x, y, w, hh);
      else if (tool === 'rrect') { var r = Math.min(10, w / 2, hh / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      else c.ellipse(x + w / 2, y + hh / 2, Math.max(0.5, w / 2), Math.max(0.5, hh / 2), 0, 0, Math.PI * 2);
      if (fill !== 'outline') { c.fillStyle = fill === 'both' ? other : color; c.fill(); }
      if (fill !== 'fill') { c.strokeStyle = color; c.lineWidth = 1; c.stroke(); }
    }
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      cv.focus({ preventScroll: true });
      var p = pos(e), color = e.button === 2 ? bg : fg, other = e.button === 2 ? fg : bg;
      if (tool === 'pick') { var px = ctx.getImageData(p.x, p.y, 1, 1).data; var hx = '#' + [px[0], px[1], px[2]].map(function (v) { return X.pad(v.toString(16)); }).join(''); if (e.button === 2) bg = hx; else fg = hx; paintSwatch(); setTool(prevTool || 'pencil'); return; }
      snapshot();
      if (tool === 'fill') { floodFill(p, color); return; }
      try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      drag = { a: p, last: p, color: color, other: other };
      if (tool === 'pencil' || tool === 'brush') strokeSeg(ctx, p, p, tool === 'pencil' ? size === 1 ? 1 : size : size, color);
      if (tool === 'eraser') strokeSeg(ctx, p, p, size, bg, true);
      if (tool === 'air') { spray(p, color); drag.timer = setInterval(function () { spray(drag.last, color); }, 40); }
    });
    var prevTool = null;
    cv.addEventListener('pointermove', function (e) {
      var p = pos(e);
      st.set(1, Math.max(0, Math.min(W - 1, p.x)) + ', ' + Math.max(0, Math.min(H - 1, p.y)));
      if (!drag) return;
      if (tool === 'pencil' || tool === 'brush') strokeSeg(ctx, drag.last, p, tool === 'pencil' ? size === 1 ? 1 : size : size, drag.color);
      else if (tool === 'eraser') strokeSeg(ctx, drag.last, p, size, bg, true);
      else if (tool === 'air') spray(p, drag.color);
      else if (tool === 'line' || tool === 'rect' || tool === 'ellipse' || tool === 'rrect') {
        octx.clearRect(0, 0, W, H);
        if (tool === 'line') strokeSeg(octx, drag.a, p, size, drag.color);
        else shape(octx, drag.a, p, drag.color, drag.other, e.shiftKey);
        st.set(2, Math.abs(p.x - drag.a.x) + '×' + Math.abs(p.y - drag.a.y));
      }
      drag.last = p;
    });
    function end(e) {
      if (!drag) return;
      var p = e ? pos(e) : drag.last;
      clearInterval(drag.timer);
      octx.clearRect(0, 0, W, H);
      if (tool === 'line') strokeSeg(ctx, drag.a, p, size, drag.color);
      else if (tool === 'rect' || tool === 'ellipse' || tool === 'rrect') shape(ctx, drag.a, p, drag.color, drag.other, e && e.shiftKey);
      drag = null; st.set(2, W + '×' + H);
    }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', function () { end(null); });
    cv.addEventListener('pointerleave', function () { st.set(1, ''); });

    root.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
      else if (k === 'y') { e.preventDefault(); doRedo(); }
      else if (k === 's') { e.preventDefault(); savePng(); }
      else if (k === 'i') { e.preventDefault(); invert(); }
    });
    // remember previous tool for the colour picker
    Object.keys(toolBtns).forEach(function (k) { toolBtns[k].addEventListener('click', function () { if (k !== 'pick') prevTool = k; }); });

    function refreshTitle() { api.win.setTitle((dirty ? '*' : '') + t({ ru: 'рисунок', en: 'untitled' }) + ' — ' + t({ ru: 'Кисть', en: 'Paint' })); }

    /* a small welcome doodle: Phuket sunset, so the canvas is not empty */
    function doodle() {
      // fit the canvas to small windows (phones) once, before the first paint
      var sw = stage.clientWidth - 10, sh = stage.clientHeight - 10;
      if (sw > 100 && sw < 640) { W = Math.max(240, sw); H = Math.max(220, Math.min(400, sh)); cv.width = ov.width = W; cv.height = ov.height = H; }
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      var s = Math.min(1, W / 640);
      ctx.save(); ctx.translate(W - 640 * s, H > 300 ? 0 : 20 * s); ctx.scale(s, s);
      drawArt();
      ctx.restore();
      ctx.fillStyle = '#444'; ctx.font = (W < 400 ? 13 : 16) + 'px Tahoma, Verdana, sans-serif';
      ctx.fillText(t({ ru: 'Порисуйте! Ctrl+Z, если что.', en: 'Draw something! Ctrl+Z if needed.' }), 14, W < 400 ? H - 16 : 40);
    }
    function drawArt() {
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(520, 92, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2f6fe0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (var i = 0; i < 4; i++) { ctx.beginPath(); for (var x = 380; x <= 620; x += 10) ctx.lineTo(x, 150 + i * 14 + Math.sin(x / 18 + i) * 3); ctx.stroke(); }
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(430, 210); ctx.quadraticCurveTo(440, 150, 470, 112); ctx.stroke();
      ctx.strokeStyle = '#2f9e5b'; ctx.lineWidth = 5;
      [[-40, 10], [-30, -18], [0, -30], [30, -12], [36, 14]].forEach(function (v) { ctx.beginPath(); ctx.moveTo(470, 112); ctx.quadraticCurveTo(470 + v[0] / 2, 112 + v[1] - 14, 470 + v[0], 112 + v[1] + 6); ctx.stroke(); });
    }
    doodle();
    paintSwatch();
    U.bind(function () { setTool(tool); refreshTitle(); st.set(2, W + '×' + H); });
    root.__paint = { ctx: ctx, size: function () { return [W, H]; }, undoLen: function () { return undo.length; } };
    return U.destroy;
  }

  X.register({
    id: 'paint',
    title: { ru: 'Кисть', en: 'Paint' },
    icon: X.icons.paint,
    desktop: true,
    startMenu: 'programs',
    defaultSize: { w: 720, h: 540 },
    minSize: { w: 300, h: 300 },
    singleton: true,
    render: render
  });
})();

export {};
