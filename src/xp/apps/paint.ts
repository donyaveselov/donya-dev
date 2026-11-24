// Paint: pencil, brush, airbrush, eraser, fill, line, rectangle, ellipse, colour picker, undo/redo, save as PNG.
import type { Bilingual, XPAppApi } from '../../shared/types';
import { ico, svg } from '../icons';
import { registerApp } from '../shell/apps';
import { ICONS } from './icons';
import { ui } from './kit';
import { bresenham, floodFill, flipHorizontal, invertColors, rgbToHex, shapeBox } from './paint-raster';

const d = (ru: string, en: string): Bilingual => ({ ru, en });

const T = {
  title: d('Кисть', 'Paint'),
  untitled: d('рисунок', 'untitled'),
  canvas: d('Холст', 'Canvas'),
  saveFailed: d('Не удалось сохранить файл.', 'Could not save the file.'),
  file: d('Файл', 'File'),
  new: d('Создать', 'New'),
  saveChanges: d('Сохранить изменения в рисунке?', 'Save changes to untitled?'),
  yes: d('Да', 'Yes'),
  no: d('Нет', 'No'),
  cancel: d('Отмена', 'Cancel'),
  savePng: d('Сохранить как PNG', 'Save as PNG'),
  exit: d('Выход', 'Exit'),
  edit: d('Правка', 'Edit'),
  undo: d('Отменить', 'Undo'),
  redo: d('Повторить', 'Repeat'),
  clear: d('Очистить', 'Clear Image'),
  image: d('Рисунок', 'Image'),
  flip: d('Отразить по горизонтали', 'Flip Horizontal'),
  invert: d('Обратить цвета', 'Invert Colors'),
  help: d('Справка', 'Help'),
  about: d('О программе', 'About'),
  paint: d('Paint', 'Paint'),
  aboutText: d(
    'Левая кнопка — основной цвет, правая — фоновый. Шедевры сохраняются в PNG.',
    'Left button paints the primary colour, right button the secondary. Masterpieces save as PNG.',
  ),
  tools: d('Инструменты', 'Tools'),
  outline: d('Контур', 'Outline'),
  both: d('Контур и заливка', 'Outline and fill'),
  fillOnly: d('Заливка', 'Fill'),
  colours: d('Основной и фоновый цвет', 'Primary and secondary colour'),
  doodle: d('Порисуйте! Ctrl+Z, если что.', 'Draw something! Ctrl+Z if needed.'),
} as const;

const PALETTE = [
  '#000000',
  '#808080',
  '#800000',
  '#808000',
  '#008000',
  '#008080',
  '#000080',
  '#800080',
  '#808040',
  '#004040',
  '#0080ff',
  '#004080',
  '#8000ff',
  '#804000',
  '#ffffff',
  '#c0c0c0',
  '#ff0000',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0000ff',
  '#ff00ff',
  '#ffff80',
  '#00ff80',
  '#80ffff',
  '#8080ff',
  '#ff0080',
  '#ff8040',
];

type Tool = 'pick' | 'fill' | 'pencil' | 'brush' | 'air' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'rrect';
type FillMode = 'outline' | 'both' | 'fill';
// the original mspaint tool box bitmaps (pt_<tool>)
const TOOLS: readonly { id: Tool; label: Bilingual }[] = [
  { id: 'pick', label: d('Пипетка', 'Pick Color') },
  { id: 'fill', label: d('Заливка', 'Fill With Color') },
  { id: 'pencil', label: d('Карандаш', 'Pencil') },
  { id: 'brush', label: d('Кисть', 'Brush') },
  { id: 'air', label: d('Распылитель', 'Airbrush') },
  { id: 'eraser', label: d('Ластик', 'Eraser') },
  { id: 'line', label: d('Линия', 'Line') },
  { id: 'rect', label: d('Прямоугольник', 'Rectangle') },
  { id: 'ellipse', label: d('Эллипс', 'Ellipse') },
  { id: 'rrect', label: d('Скруглённый прямоугольник', 'Rounded Rectangle') },
];
/** The pen sizes a tool offers. */
const SIZES: Partial<Record<Tool, number[]>> = {
  eraser: [4, 8, 12, 20],
  air: [8, 14, 22],
  pencil: [1, 2, 3],
  brush: [2, 4, 6, 10],
  line: [2, 4, 6, 10],
};
const SHAPES: readonly Tool[] = ['rect', 'ellipse', 'rrect'];
const FILL_MODES: readonly [FillMode, Bilingual][] = [
  ['outline', T.outline],
  ['both', T.both],
  ['fill', T.fillOnly],
];

interface Pt {
  x: number;
  y: number;
}

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-paint', 480);
  let W = 640;
  let H = 400;
  let tool: Tool = 'pencil';
  let prevTool: Tool | null = null;
  let size = 2;
  let fill: FillMode = 'outline';
  let fg = '#000000';
  let bg = '#ffffff';
  let undo: ImageData[] = [];
  let redo: ImageData[] = [];
  let dirty = false;

  const cv = h('canvas.xpa-pt-canvas', { width: String(W), height: String(H), 'aria-label': T.canvas, tabindex: '0' });
  const ov = h('canvas.xpa-pt-overlay', { width: String(W), height: String(H), 'aria-hidden': 'true' });
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const octx = ov.getContext('2d');
  if (!ctx || !octx) return U.destroy;

  const refreshTitle = (): void => {
    api.win.setTitle(`${dirty ? '*' : ''}${t(T.untitled)} — ${t(T.title)}`);
  };
  const grab = (): ImageData => ctx.getImageData(0, 0, W, H);
  function snapshot(): void {
    undo.push(grab());
    if (undo.length > 30) undo.shift();
    redo = [];
    dirty = true;
    refreshTitle();
  }
  function doUndo(): void {
    const img = undo.pop();
    if (!img) {
      U.sound('error');
      return;
    }
    redo.push(grab());
    ctx?.putImageData(img, 0, 0);
  }
  function doRedo(): void {
    const img = redo.pop();
    if (!img) {
      U.sound('error');
      return;
    }
    undo.push(grab());
    ctx?.putImageData(img, 0, 0);
  }
  function clearAll(): void {
    snapshot();
    if (!ctx) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }
  function newImage(): void {
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    undo = [];
    redo = [];
    dirty = false;
    refreshTitle();
  }
  function savePng(): void {
    try {
      const a = document.createElement('a');
      a.download = `${U.lang() === 'ru' ? 'рисунок' : 'untitled'}.png`;
      a.href = cv.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      a.remove();
      dirty = false;
      refreshTitle();
    } catch {
      U.dialog({ title: 'Paint', icon: 'error', text: T.saveFailed, buttons: [{ label: 'OK', primary: true }] });
    }
  }
  function flipH(): void {
    snapshot();
    if (!ctx) return;
    const img = grab();
    const out = ctx.createImageData(W, H);
    flipHorizontal(img.data, out.data, W, H);
    ctx.putImageData(out, 0, 0);
  }
  function invert(): void {
    snapshot();
    const img = grab();
    invertColors(img.data);
    ctx?.putImageData(img, 0, 0);
  }

  const menu = U.menubar([
    {
      label: T.file,
      items: [
        {
          label: T.new,
          key: 'Ctrl+N',
          action: () => {
            if (!dirty) {
              newImage();
              return;
            }
            U.dialog({
              title: 'Paint',
              icon: 'warn',
              text: T.saveChanges,
              buttons: [
                {
                  label: T.yes,
                  primary: true,
                  onClick: () => {
                    savePng();
                    newImage();
                  },
                },
                { label: T.no, onClick: newImage },
                { label: T.cancel },
              ],
            });
          },
        },
        { label: T.savePng, key: 'Ctrl+S', action: savePng },
        { sep: true },
        {
          label: T.exit,
          action: () => {
            api.win.close();
          },
        },
      ],
    },
    {
      label: T.edit,
      items: [
        { label: T.undo, key: 'Ctrl+Z', disabled: () => !undo.length, action: doUndo },
        { label: T.redo, key: 'Ctrl+Y', disabled: () => !redo.length, action: doRedo },
        { sep: true },
        { label: T.clear, key: 'Ctrl+Shift+N', action: clearAll },
      ],
    },
    {
      label: T.image,
      items: [
        { label: T.flip, action: flipH },
        { label: T.invert, key: 'Ctrl+I', action: invert },
      ],
    },
    {
      label: T.help,
      items: [
        {
          label: T.about,
          action: () => {
            U.aboutDialog(T.paint, T.aboutText);
          },
        },
      ],
    },
  ]);

  /* tool box */
  const toolBtns = new Map<Tool, HTMLButtonElement>();
  const sizesBox = h('div.xpa-pt-opts.xpa-sunken');
  const box = h('div.xpa-pt-tools', { role: 'toolbar', 'aria-label': T.tools });
  for (const tl of TOOLS) {
    const b = h('button.xpa-pt-tool', {
      type: 'button',
      title: tl.label,
      'aria-label': tl.label,
      'aria-pressed': 'false',
      html: svg(
        `<image href="${ico(`pt_${tl.id}`) ?? ''}" width="16" height="16" style="image-rendering:pixelated"/>`,
        '0 0 16 16',
      ),
    });
    b.addEventListener('click', () => {
      U.sound('click');
      setTool(tl.id);
      // the colour picker goes back to the tool used before it
      if (tl.id !== 'pick') prevTool = tl.id;
    });
    toolBtns.set(tl.id, b);
    box.appendChild(b);
  }

  /* palette */
  const swFg = h('div.xpa-pt-swfg');
  const swBg = h('div.xpa-pt-swbg');
  const colorsEl = h('div.xpa-pt-colors');
  const pal = h('div.xpa-pt-palette', [h('div.xpa-pt-cur.xpa-sunken', { title: T.colours }, [swBg, swFg]), colorsEl]);
  const paintSwatch = (): void => {
    swFg.style.background = fg;
    swBg.style.background = bg;
  };
  for (const c of PALETTE) {
    const b = h('button.xpa-pt-color', { type: 'button', style: { background: c }, title: c, 'aria-label': c });
    b.addEventListener('click', () => {
      fg = c;
      paintSwatch();
    });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      bg = c;
      paintSwatch();
    });
    // a double click edits the colour, as XP's Edit Colors did
    b.addEventListener('dblclick', () => {
      const inp = document.createElement('input');
      inp.type = 'color';
      inp.value = fg;
      inp.addEventListener('input', () => {
        fg = inp.value;
        b.style.background = fg;
        paintSwatch();
      });
      inp.click();
    });
    colorsEl.appendChild(b);
  }

  const stage = h('div.xpa-pt-stage', [h('div.xpa-pt-paper', [cv, ov])]);
  const st = U.statusbar(3);
  root.append(menu, h('div.xpa-pt-main', [h('div.xpa-pt-left', [box, sizesBox]), stage]), pal, st.el);

  function setTool(id: Tool): void {
    tool = id;
    for (const [k, b] of toolBtns) {
      b.classList.toggle('on', k === id);
      b.setAttribute('aria-pressed', String(k === id));
    }
    sizesBox.innerHTML = '';
    const list = SIZES[id];
    if (list) {
      if (!list.includes(size)) size = list[1] ?? list[0] ?? size;
      for (const s of list) {
        const px = `${String(Math.min(18, Math.max(2, s)))}px`;
        const b = h(
          'button.xpa-pt-opt',
          { type: 'button', title: `${String(s)} px` },
          h('span.xpa-pt-dot', { style: { width: px, height: px, 'border-radius': id === 'eraser' ? '0' : '50%' } }),
        );
        if (s === size) b.classList.add('on');
        b.addEventListener('click', () => {
          size = s;
          setTool(tool);
        });
        sizesBox.appendChild(b);
      }
    } else if (SHAPES.includes(id))
      for (const [mode, label] of FILL_MODES) {
        const b = h('button.xpa-pt-opt.shape', { type: 'button', title: label }, h('span.xpa-pt-sh', { class: mode }));
        if (fill === mode) b.classList.add('on');
        b.addEventListener('click', () => {
          fill = mode;
          setTool(tool);
        });
        sizesBox.appendChild(b);
      }
    cv.setAttribute('data-tool', id);
    st.set(0, t(TOOLS.find((x) => x.id === id)?.label));
  }

  /* drawing */
  const pos = (e: PointerEvent): Pt => {
    const r = cv.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) * W) / r.width), y: Math.floor(((e.clientY - r.top) * H) / r.height) };
  };
  function strokeSeg(c: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, color: string, square = false): void {
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = w;
    c.lineCap = square ? 'square' : 'round';
    c.lineJoin = 'round';
    if (w <= 1) {
      // a crisp 1 px line for the pencil
      bresenham(a.x, a.y, b.x, b.y, (x, y) => {
        c.fillRect(x, y, 1, 1);
      });
      return;
    }
    c.beginPath();
    c.moveTo(a.x + 0.5, a.y + 0.5);
    c.lineTo(b.x + 0.5, b.y + 0.5);
    c.stroke();
  }
  function spray(p: Pt, color: string): void {
    if (!ctx) return;
    ctx.fillStyle = color;
    for (let i = 0; i < size * 1.5; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * size;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 1, 1);
    }
  }
  function shape(c: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, other: string, square: boolean): void {
    const { x, y, w, h: hh } = shapeBox(a, b, square);
    c.beginPath();
    if (tool === 'rect') c.rect(x, y, w, hh);
    else if (tool === 'rrect') {
      const r = Math.min(10, w / 2, hh / 2);
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + hh, r);
      c.arcTo(x + w, y + hh, x, y + hh, r);
      c.arcTo(x, y + hh, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    } else c.ellipse(x + w / 2, y + hh / 2, Math.max(0.5, w / 2), Math.max(0.5, hh / 2), 0, 0, Math.PI * 2);
    if (fill !== 'outline') {
      c.fillStyle = fill === 'both' ? other : color;
      c.fill();
    }
    if (fill !== 'fill') {
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.stroke();
    }
  }

  let drag: { a: Pt; last: Pt; color: string; other: string; timer: number } | null = null;
  cv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  cv.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    cv.focus({ preventScroll: true });
    const p = pos(e);
    const right = e.button === 2;
    const color = right ? bg : fg;
    const other = right ? fg : bg;
    if (tool === 'pick') {
      const [r = 0, g = 0, b = 0] = ctx.getImageData(p.x, p.y, 1, 1).data;
      if (right) bg = rgbToHex(r, g, b);
      else fg = rgbToHex(r, g, b);
      paintSwatch();
      setTool(prevTool ?? 'pencil');
      return;
    }
    snapshot();
    if (tool === 'fill') {
      const img = grab();
      if (floodFill(img.data, W, H, p.x, p.y, color)) ctx.putImageData(img, 0, 0);
      return;
    }
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
    const dg = { a: p, last: p, color, other, timer: 0 };
    drag = dg;
    if (tool === 'pencil' || tool === 'brush') strokeSeg(ctx, p, p, size, color);
    if (tool === 'eraser') strokeSeg(ctx, p, p, size, bg, true);
    if (tool === 'air') {
      spray(p, color);
      dg.timer = window.setInterval(() => {
        spray(dg.last, color);
      }, 40);
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = pos(e);
    st.set(1, `${String(Math.max(0, Math.min(W - 1, p.x)))}, ${String(Math.max(0, Math.min(H - 1, p.y)))}`);
    if (!drag) return;
    if (tool === 'pencil' || tool === 'brush') strokeSeg(ctx, drag.last, p, size, drag.color);
    else if (tool === 'eraser') strokeSeg(ctx, drag.last, p, size, bg, true);
    else if (tool === 'air') spray(p, drag.color);
    else if (tool === 'line' || SHAPES.includes(tool)) {
      octx.clearRect(0, 0, W, H);
      if (tool === 'line') strokeSeg(octx, drag.a, p, size, drag.color);
      else shape(octx, drag.a, p, drag.color, drag.other, e.shiftKey);
      st.set(2, `${String(Math.abs(p.x - drag.a.x))}×${String(Math.abs(p.y - drag.a.y))}`);
    }
    drag.last = p;
  });
  function end(e: PointerEvent | null): void {
    if (!drag) return;
    const p = e ? pos(e) : drag.last;
    clearInterval(drag.timer);
    octx?.clearRect(0, 0, W, H);
    if (ctx) {
      if (tool === 'line') strokeSeg(ctx, drag.a, p, size, drag.color);
      else if (SHAPES.includes(tool)) shape(ctx, drag.a, p, drag.color, drag.other, !!e?.shiftKey);
    }
    drag = null;
    st.set(2, `${String(W)}×${String(H)}`);
  }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', () => {
    end(null);
  });
  cv.addEventListener('pointerleave', () => {
    st.set(1, '');
  });

  root.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const run: (() => void) | undefined = {
      z: e.shiftKey ? doRedo : doUndo,
      y: doRedo,
      s: savePng,
      i: invert,
    }[e.key.toLowerCase()];
    if (run) {
      e.preventDefault();
      run();
    }
  });

  /* a small welcome doodle, a Phuket sunset, so the canvas is not empty */
  function drawArt(c: CanvasRenderingContext2D): void {
    c.fillStyle = '#ffd24a';
    c.beginPath();
    c.arc(520, 92, 34, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#2f6fe0';
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      for (let x = 380; x <= 620; x += 10) c.lineTo(x, 150 + i * 14 + Math.sin(x / 18 + i) * 3);
      c.stroke();
    }
    c.strokeStyle = '#8a5a2b';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(430, 210);
    c.quadraticCurveTo(440, 150, 470, 112);
    c.stroke();
    c.strokeStyle = '#2f9e5b';
    c.lineWidth = 5;
    for (const [vx, vy] of [
      [-40, 10],
      [-30, -18],
      [0, -30],
      [30, -12],
      [36, 14],
    ] as const) {
      c.beginPath();
      c.moveTo(470, 112);
      c.quadraticCurveTo(470 + vx / 2, 112 + vy - 14, 470 + vx, 112 + vy + 6);
      c.stroke();
    }
  }
  function doodle(c: CanvasRenderingContext2D): void {
    // fit the canvas to small windows (phones) once, before the first paint
    const sw = stage.clientWidth - 10;
    const sh = stage.clientHeight - 10;
    if (sw > 100 && sw < 640) {
      W = Math.max(240, sw);
      H = Math.max(220, Math.min(400, sh));
      cv.width = ov.width = W;
      cv.height = ov.height = H;
    }
    c.fillStyle = '#fff';
    c.fillRect(0, 0, W, H);
    const s = Math.min(1, W / 640);
    c.save();
    c.translate(W - 640 * s, H > 300 ? 0 : 20 * s);
    c.scale(s, s);
    drawArt(c);
    c.restore();
    c.fillStyle = '#444';
    c.font = `${W < 400 ? '13' : '16'}px Tahoma, Verdana, sans-serif`;
    c.fillText(t(T.doodle), 14, W < 400 ? H - 16 : 40);
  }
  doodle(ctx);
  paintSwatch();
  U.bind(() => {
    setTool(tool);
    refreshTitle();
    st.set(2, `${String(W)}×${String(H)}`);
  });
  return U.destroy;
}

registerApp({
  id: 'paint',
  title: T.title,
  icon: ICONS.paint,
  desktop: true,
  startMenu: 'programs',
  defaultSize: { w: 720, h: 540 },
  minSize: { w: 300, h: 300 },
  singleton: true,
  render,
});
