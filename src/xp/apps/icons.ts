// The apps' icons: Windows XP bitmaps (32 px, with the 16 px original where XP had one), toolbar glyphs (16 px and
// the 24 px originals for large toolbar buttons), and the drawn icons of the three projects.
import { bmp, ico, svg, svgImage } from '../icons';

// Style of the drawn icons: flat fills, a darker 1 px outline, a soft white highlight on the upper half, a faint shadow.
const SH = '<ellipse cx="16" cy="29.5" rx="11" ry="1.6" fill="#000" opacity=".18"/>';

export const ICONS = {
  folder: bmp('folder'),
  projects: bmp('mydocs'),
  computer: bmp('computer'),
  contact: bmp('mail'),
  terminal: bmp('console'),
  minesweeper: bmp('mine'),
  paint: bmp('paint'),
  browser: bmp('ie'),
  notepad: bmp('notepad'),
  calc: bmp('calc'),
  recycleEmpty: bmp('recycle'),
  recycleFull: bmp('recycleFull'),
  txt: bmp('txt'),
  url: bmp('iepaper', true),
  resume: bmp('rtf'),
  doc: bmp('rtf'),
  image: bmp('jpg'),
  ghost: bmp('unknown'),
  info: bmp('info'),
  warn: bmp('warn'),
  verifikat: svg(
    SH +
      '<path d="M16 3l11 4v8c0 7-4.8 11.6-11 14-6.2-2.4-11-7-11-14V7z" fill="#2f9e5b" stroke="#17663a"/>' +
      '<path d="M16 4.6l9.4 3.4v7c0 1.1-.1 2-.4 3-5.6-1.6-12.4-1.6-18 0-.3-1-.4-1.9-.4-3V8z" fill="#fff" opacity=".28"/>' +
      '<path d="M10.5 15.8l3.8 3.8 7.4-7.6" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  kompy: svg(
    SH +
      '<circle cx="16" cy="16" r="13.6" fill="#fff"/>' +
      '<circle cx="16" cy="16" r="12.4" fill="none" stroke="#0a7ff2" stroke-width="3.4"/>' +
      '<path d="M16 7.4l2.3 6.3 6.3 2.3-6.3 2.3-2.3 6.3-2.3-6.3-6.3-2.3 6.3-2.3z" fill="#0a7ff2" stroke="#0a7ff2" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="16" cy="16" r="1.6" fill="#fff"/>',
  ),
  wax: svg(
    SH +
      '<path d="M6 7h20l-2.6 21H8.6z" fill="#f2f2ee" stroke="#8a8a86"/>' +
      '<path d="M6.6 11.2h18.8" stroke="#c9c9c4"/>' +
      '<ellipse cx="16" cy="7" rx="10" ry="2.6" fill="#fff" stroke="#8a8a86"/>' +
      '<ellipse cx="16" cy="7.3" rx="8.4" ry="1.8" fill="#b03adf"/>' +
      '<path d="M11 6.6l2.4-1.4 1.6 1.6-2.2 1.2zM17.4 6.2l2.6-.8.8 1.6-2.6.6z" fill="#e7b6ff" opacity=".85"/>' +
      '<path d="M9 10l1.8 16" stroke="#fff" stroke-width="1.4" opacity=".7"/>',
  ),
} as const;

export type IconName = keyof typeof ICONS;

/** Toolbar glyphs: [16 px original, 24 px original for the large toolbar buttons]. */
const GLYPHS: Readonly<Record<string, readonly [string, string?]>> = {
  back: ['tbBack', 'tbBack24'],
  fwd: ['tbFwd', 'tbFwd24'],
  up: ['tbUp', 'tbUp24'],
  search: ['search16'],
  folders: ['tbFolders', 'tbFolders24'],
  views: ['tbViews', 'tbViews24'],
  print: ['tbPrint'],
  preview: ['tbPreview'],
  copy: ['tbCopy', 'tbCopy24'],
  cut: ['tbCut', 'tbCut24'],
  paste: ['tbPaste', 'tbPaste24'],
  home: ['tbHome', 'tbHome24'],
  refresh: ['tbRefresh', 'tbRefresh24'],
  stop: ['tbStop', 'tbStop24'],
  star: ['star16', 'tbFave24'],
  send: ['tbSend'],
  undo: ['tbUndo', 'tbUndo24'],
  redo: ['tbRedo', 'tbRedo24'],
  link: ['iepaper'],
  trash: ['recycle16', 'recycle24'],
  restore: ['tbRestore'],
  props: ['tbProps'],
  computer: ['computer16'],
  warn: ['warn16'],
  bold: ['tbBold'],
  italic: ['tbItalic'],
  underline: ['tbUnderline'],
  hardware: ['hardware16'],
};

const sized = (key: string | undefined, size: number): string | undefined => {
  const src = key ? ico(key) : undefined;
  return src ? svg(svgImage(src, '', size), `0 0 ${String(size)} ${String(size)}`) : undefined;
};

export const G16: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(GLYPHS).flatMap(([k, [a]]) => {
      const g = sized(a, 16);
      return g ? [[k, g]] : [];
    }),
  ),
  // Internet Explorer's Go button (normal / hot)
  go: svg(svgImage(ico('tbGo') ?? '', 'xn', 20) + svgImage(ico('tbGoHot') ?? '', 'xh', 20), '0 0 20 20'),
};
export const G24: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(GLYPHS).flatMap(([k, [, b]]) => {
    const g = sized(b, 24);
    return g ? [[k, g]] : [];
  }),
);

/** An app icon or a toolbar glyph by name ('' when there is none). */
export const iconMarkup = (name: string): string => (ICONS as Partial<Record<string, string>>)[name] ?? G16[name] ?? '';
