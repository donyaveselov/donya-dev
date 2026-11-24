/* eslint-disable @typescript-eslint/restrict-plus-operands -- markup concatenated as in the product's own code, from fixed data */
import type { Lang } from '../../../shared/types';

type BatchStatus = 'draft' | 'awaiting_platform' | 'awaiting_manufacturer' | 'confirmed';
type JobStatus = 'running' | 'success' | 'failed' | 'cancelled';

/* Verifikat project screens rebuilt from the real product UI (truesign-ui tokens, truesign-frontend
 VerifyCodeView, truesign-manufacturer BatchesView / ExportsView). Real HTML + CSS at a fixed design
 size, scaled to the container by mocks-verifikat.css. XPApps.mocks[kind](lang) -> markup string. */

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function L(lang: Lang, ru: string, en: string): string {
  return esc(lang === 'ru' ? ru : en);
}
function root(kind: string, size: number, inner: string): string {
  return (
    '<div class="vfk-root vfk-' +
    kind +
    '" aria-hidden="true"><div class="vfk-stage vfk-s' +
    size +
    '">' +
    inner +
    '</div></div>'
  );
}
function svg(w: number, h: number, vb: string, body: string, extra = ''): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    vb +
    '" fill="none" style="width:' +
    w +
    'px;height:' +
    h +
    'px"' +
    extra +
    '>' +
    body +
    '</svg>'
  );
}

/* ---- icons copied from the project (truesign-frontend/src/components/icons, truesign-ui icons) */
const LOGO = svg(
  46,
  46,
  '0 0 46 46',
  '<path d="M22.9998 3.14453C23.4305 3.14453 23.8665 3.34111 24.7371 3.73438C26.6501 4.59858 29.757 5.9401 32.0378 6.61816C33.8699 7.16278 36.2354 7.59652 38.0867 7.8877C39.565 8.1202 40.3045 8.23627 40.7781 8.75684C41.2516 9.2775 41.2932 9.95037 41.3757 11.2959C41.8226 18.5789 41.1821 37.0419 24.0925 42.6035C23.5758 42.7717 23.317 42.8555 22.9998 42.8555C22.6827 42.8554 22.4244 42.7716 21.908 42.6035C4.81823 37.042 4.17786 18.579 4.62476 11.2959C4.70731 9.95051 4.74802 9.27748 5.22144 8.75684C5.69497 8.23618 6.43456 8.1202 7.91284 7.8877C9.76411 7.59653 12.1296 7.16278 13.9617 6.61816C16.2426 5.94009 19.3503 4.59861 21.2634 3.73438C22.1338 3.3412 22.5691 3.14462 22.9998 3.14453ZM32.157 16.5488C31.3996 15.7892 30.1694 15.7884 29.4109 16.5469L23.5281 22.4297C21.9986 23.9592 19.5186 23.9591 17.989 22.4297L16.5886 21.0293C15.8304 20.2713 14.6005 20.272 13.8435 21.0312C13.0881 21.789 13.0891 23.0158 13.8455 23.7725L16.6169 26.5439C18.9082 28.8351 22.624 28.8337 24.9138 26.541L32.156 19.29C32.912 18.5331 32.9122 17.3065 32.157 16.5488Z" fill="#22C55E"/>',
);
const MENU = svg(
  24,
  24,
  '0 0 24 24',
  '<path d="M3 12H15M3 6H21M3 18H21" stroke="#414651" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
);
const FLAG = svg(
  20,
  20,
  '0 0 20 20',
  '<path d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z" fill="#F0F0F0"/><path d="M19.378 13.478C19.78 12.3946 20 11.2229 20 9.99973C20 8.77652 19.78 7.6048 19.378 6.52148H0.621992C0.220039 7.6048 0 8.77652 0 9.99973C0 11.2229 0.220039 12.3946 0.621992 13.478L10 14.3475L19.378 13.478Z" fill="#0052B4"/><path d="M10.0001 19.9998C14.2997 19.9998 17.9652 17.286 19.3781 13.478H0.62207C2.035 17.286 5.70043 19.9998 10.0001 19.9998Z" fill="#D80027"/>',
);
const RING_I =
  'M19.5 6C26.6797 6 32.5 11.8203 32.5 19C32.5 26.1797 26.6797 32 19.5 32C12.3203 32 6.5 26.1797 6.5 19C6.5 11.8203 12.3203 6 19.5 6Z';
const RING_O =
  'M19.5 1C29.4411 1 37.5 9.05887 37.5 19C37.5 28.9411 29.4411 37 19.5 37C9.55887 37 1.5 28.9411 1.5 19C1.5 9.05887 9.55887 1 19.5 1Z';
const INFO_GLYPH =
  'M19.4998 22.3333V19M19.4998 15.6666H19.5082M27.8332 19C27.8332 23.6023 24.1022 27.3333 19.4998 27.3333C14.8975 27.3333 11.1665 23.6023 11.1665 19C11.1665 14.3976 14.8975 10.6666 19.4998 10.6666C24.1022 10.6666 27.8332 14.3976 27.8332 19Z';
function infoIcon(c: string): string {
  return svg(
    39,
    38,
    '0 0 39 38',
    '<path opacity=".3" d="' +
      RING_I +
      '" stroke="' +
      c +
      '" stroke-width="2"/><path opacity=".1" d="' +
      RING_O +
      '" stroke="' +
      c +
      '" stroke-width="2"/><path d="' +
      INFO_GLYPH +
      '" stroke="' +
      c +
      '" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>',
  );
}
const ICO_OK = svg(
  35,
  36,
  '0 0 35 36',
  '<path opacity=".3" d="M17.4995 5.49968C24.403 5.49968 29.9993 11.0963 29.9995 17.9997C29.9995 24.9032 24.4031 30.4997 17.4995 30.4997C10.5961 30.4995 4.99951 24.9031 4.99951 17.9997C4.99969 11.0964 10.5962 5.49986 17.4995 5.49968Z" stroke="#079455" stroke-width="1.66667"/><path opacity=".1" d="M16.667 1.33301H18.333C27.0775 1.33301 34.167 8.42248 34.167 17.167V18.833C34.167 27.5775 27.0775 34.667 18.333 34.667H16.667C7.92248 34.667 0.833008 27.5775 0.833008 18.833V17.167C0.833008 8.42248 7.92248 1.33301 16.667 1.33301Z" stroke="#079455" stroke-width="1.66667"/><path d="M13.7498 18L16.2498 20.5L21.2498 15.5M25.8332 18C25.8332 22.6024 22.1022 26.3333 17.4998 26.3333C12.8975 26.3333 9.1665 22.6024 9.1665 18C9.1665 13.3976 12.8975 9.66667 17.4998 9.66667C22.1022 9.66667 25.8332 13.3976 25.8332 18Z" stroke="#079455" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>',
);
const PLAY = svg(
  25,
  24,
  '0 0 25 24',
  '<path d="M12.5 1.5C18.299 1.5 23 6.20101 23 12C23 17.799 18.299 22.5 12.5 22.5C6.70101 22.5 2 17.799 2 12C2 6.20101 6.70101 1.5 12.5 1.5Z" stroke="white" stroke-width="3"/><path d="M17.375 11.3712C17.875 11.6507 17.875 12.3493 17.375 12.6288L10.625 16.4016C10.125 16.6811 9.5 16.3318 9.5 15.7728L9.5 8.22716C9.5 7.66823 10.125 7.31889 10.625 7.59836L17.375 11.3712Z" fill="white"/>',
);
const SEARCH = svg(
  20,
  20,
  '0 0 24 24',
  '<path d="M22.5 22.5L18.4168 18.4167M21.3333 11.4167C21.3333 16.8935 16.8935 21.3333 11.4167 21.3333C5.93984 21.3333 1.5 16.8935 1.5 11.4167C1.5 5.93984 5.93984 1.5 11.4167 1.5C16.8935 1.5 21.3333 5.93984 21.3333 11.4167Z" stroke="#667085" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
);
const FILTERS = svg(
  20,
  20,
  '0 0 20 20',
  '<path d="M5 10H15M2.5 5H17.5M7.5 15H12.5" stroke="#475467" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>',
);
const GEAR = svg(
  24,
  24,
  '0 0 24 24',
  '<g stroke="#475467" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M18.73 14.73a1.5 1.5 0 0 0 .3 1.65l.05.06a1.82 1.82 0 1 1-2.57 2.57l-.06-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.91 1.37v.15a1.82 1.82 0 0 1-3.64 0v-.08a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.05a1.82 1.82 0 1 1-2.57-2.57l.05-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.91h-.15a1.82 1.82 0 0 1 0-3.64h.08a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.05-.06a1.82 1.82 0 1 1 2.57-2.57l.06.05a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .91-1.37v-.15a1.82 1.82 0 0 1 3.64 0v.08a1.5 1.5 0 0 0 .91 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.05a1.82 1.82 0 1 1 2.57 2.57l-.05.06a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.91h.15a1.82 1.82 0 0 1 0 3.64h-.08a1.5 1.5 0 0 0-1.37.91z"/></g>',
);
const CHAT = svg(
  22,
  22,
  '0 0 24 24',
  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
);
const STATUS_ICONS = svg(
  68,
  13,
  '0 0 68 13',
  '<g fill="#101828"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="6" width="3" height="6" rx="1"/><rect x="10" y="3.5" width="3" height="8.5" rx="1"/><rect x="15" y="1" width="3" height="11" rx="1"/><path d="M31.5 3.2c2.3 0 4.4.9 6 2.4l1.1-1.1A10 10 0 0 0 31.5 1.6c-2.8 0-5.3 1.1-7.1 2.9l1.1 1.1a8.4 8.4 0 0 1 6-2.4zm0 3.3c1.4 0 2.6.5 3.6 1.4l1.1-1.1a6.7 6.7 0 0 0-9.4 0l1.1 1.1c1-.9 2.2-1.4 3.6-1.4zm0 3.2c.5 0 .9.2 1.3.5L31.5 11.4l-1.3-1.2c.4-.3.8-.5 1.3-.5z"/><rect x="43.5" y=".5" width="22" height="11.5" rx="3.5" fill="none" stroke="#101828" opacity=".4"/><rect x="45.5" y="2.5" width="18" height="7.5" rx="2"/><rect x="66.5" y="4.5" width="1.5" height="4" rx=".75" opacity=".45"/></g>',
);

/* generic product photo (no real brand): a jar of honey on the light studio background */
function jar(w: number, h: number, v: number): string {
  const lid = v === 2 ? '#7a5a22' : '#8a6a2a';
  return svg(
    w,
    h,
    '0 0 200 200',
    '<ellipse cx="100" cy="176" rx="58" ry="7" fill="#000" opacity=".08"/>' +
      '<rect x="56" y="58" width="88" height="118" rx="20" fill="#e0a33a"/><rect x="56" y="58" width="88" height="118" rx="20" fill="url(#vfkJ' +
      v +
      ')"/>' +
      '<rect x="62" y="40" width="76" height="24" rx="6" fill="' +
      lid +
      '"/><rect x="62" y="40" width="76" height="6" rx="3" fill="#fff" opacity=".18"/>' +
      '<rect x="66" y="96" width="68" height="46" rx="4" fill="#fffaf0"/><rect x="76" y="106" width="48" height="6" rx="3" fill="#c98a1f"/><rect x="82" y="118" width="36" height="4" rx="2" fill="#d9c39a"/><rect x="86" y="127" width="28" height="4" rx="2" fill="#d9c39a"/>' +
      '<rect x="64" y="68" width="9" height="96" rx="4.5" fill="#fff" opacity=".22"/>' +
      '<defs><linearGradient id="vfkJ' +
      v +
      '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8741a" stop-opacity=".35"/><stop offset=".5" stop-color="#f6c55a" stop-opacity="0"/><stop offset="1" stop-color="#9a5e10" stop-opacity=".4"/></linearGradient></defs>',
  );
}

/* ================= Buyer: public verification page (truesign-frontend VerifyCodeView, mobile) */
function ntf(color: string, icon: string, title: string, sub: string, column?: boolean): string {
  return (
    '<div class="vfk-ntf vfk-' +
    color +
    (column ? ' vfk-col' : '') +
    '">' +
    icon +
    '<div><div class="vfk-ntf-t">' +
    title +
    '</div>' +
    (sub ? '<div class="vfk-ntf-s">' + sub + '</div>' : '') +
    '</div></div>'
  );
}
function phone(lang: Lang, cls: string, state: 'ok' | 'used'): string {
  const sub = L(lang, 'ID партии: 24 · Номер в партии: 1532', 'Batch ID: 24 · No. in batch: 1532');
  const top =
    state === 'ok'
      ? ntf('success', ICO_OK, L(lang, 'Товар успешно прошёл проверку', 'The product has passed verification'), sub)
      : ntf(
          'error',
          infoIcon('#D92D20'),
          L(lang, 'Код уже был использован ранее', 'This code has already been used'),
          sub,
        );
  return (
    '<div class="vfk-phone ' +
    cls +
    '"><div class="vfk-scr">' +
    '<div class="vfk-sbar"><span>9:41</span>' +
    STATUS_ICONS +
    '</div>' +
    '<div class="vfk-navc"><div class="vfk-nav">' +
    '<div class="vfk-brand">' +
    LOGO +
    '<span>' +
    L(lang, 'Верификат', 'Verifikat') +
    '</span></div>' +
    '<span class="vfk-ibtn">' +
    FLAG +
    '</span><span class="vfk-ibtn">' +
    MENU +
    '</span>' +
    '</div></div>' +
    '<div class="vfk-main"><div class="vfk-mb16">' +
    top +
    '</div>' +
    '<div class="vfk-car"><div class="vfk-car-main">' +
    jar(250, 250, 1) +
    '</div>' +
    '<div class="vfk-thumbs"><span class="vfk-th vfk-on">' +
    jar(80, 80, 1) +
    '</span>' +
    '<span class="vfk-th vfk-vid"><span class="vfk-blur">' +
    jar(80, 80, 2) +
    '</span>' +
    PLAY +
    '</span>' +
    '<span class="vfk-th vfk-th3"><i></i><i></i><i></i></span><span class="vfk-th">' +
    jar(80, 80, 3) +
    '</span></div></div>' +
    '<div class="vfk-pt">' +
    L(lang, 'Мёд липовый, 250 г', 'Linden honey, 250 g') +
    '</div>' +
    '<div class="vfk-pd">' +
    L(
      lang,
      'Натуральный мёд урожая 2026 года. Фасовка на пасеке производителя.',
      'Natural honey, 2026 harvest. Packed at the producer’s apiary.',
    ) +
    '</div>' +
    '<div class="vfk-pd vfk-mt16">' +
    L(lang, 'Партия № 24 от 20.11.2026', 'Batch No. 24 of 20.11.2026') +
    '</div>' +
    '<div class="vfk-mt32">' +
    ntf(
      'blue',
      infoIcon('#1570EF'),
      L(lang, 'Код является одноразовым', 'The code is single-use'),
      L(
        lang,
        'Он не может быть использован повторно. Если вы попытаетесь проверить этот код еще раз, вы получите уведомление о том, что код уже использован или не существует.',
        'It cannot be used again. If you try to check this code once more, you will be told that the code has already been used or does not exist.',
      ),
      true,
    ) +
    '</div>' +
    '</div></div></div>'
  );
}
export function verify(lang: Lang): string {
  return root(
    'verify',
    1120,
    '<div class="vfk-bg"></div>' + phone(lang, 'vfk-back', 'used') + phone(lang, 'vfk-front', 'ok'),
  );
}

/* ================= Manufacturer portal (truesign-manufacturer ManufacturerLayout + u-datatable) */
function shell(lang: Lang, active: number, table: string): string {
  const tabs = [L(lang, 'Товары', 'Products'), L(lang, 'Партии', 'Batches'), L(lang, 'Экспорты', 'Exports')];
  return (
    '<div class="vfk-shell">' +
    '<div class="vfk-hdr"><div class="vfk-h-t">' +
    L(lang, 'Портал производителя', 'Manufacturer portal') +
    '</div>' +
    '<div class="vfk-row vfk-g16"><span class="vfk-icb">' +
    GEAR +
    '</span><span class="vfk-btn">' +
    L(lang, 'Выйти', 'Log out') +
    '</span></div></div>' +
    '<div class="vfk-tabsw"><div class="vfk-tabs">' +
    tabs
      .map(function (t, i) {
        return '<span class="vfk-tab' + (i === active ? ' vfk-on' : '') + '">' + t + '</span>';
      })
      .join('') +
    '</div></div>' +
    '<div class="vfk-body">' +
    table +
    '</div>' +
    '<span class="vfk-fab">' +
    CHAT +
    '<span>' +
    L(lang, 'Поддержка', 'Support') +
    '</span></span></div>'
  );
}
function grid(cols: [string, number][], rows: (string | number)[][]): string {
  return (
    '<table class="vfk-tbl"><colgroup>' +
    cols
      .map(function (c) {
        return '<col style="width:' + c[1] + 'px">';
      })
      .join('') +
    '</colgroup>' +
    '<thead><tr>' +
    cols
      .map(function (c) {
        return '<th><span class="vfk-hx">' + c[0] + '</span></th>';
      })
      .join('') +
    '</tr></thead><tbody>' +
    rows
      .map(function (r) {
        return (
          '<tr>' +
          r
            .map(function (v) {
              return '<td><div class="vfk-cell">' + v + '</div></td>';
            })
            .join('') +
          '</tr>'
        );
      })
      .join('') +
    '</tbody></table>'
  );
}
function tb(t: string): string {
  return '<span class="vfk-tbtn">' + t + '</span>';
}

export function batches(lang: Lang): string {
  const ST: Record<BatchStatus, string> = {
    draft: L(lang, 'Черновик', 'Draft'),
    awaiting_platform: L(lang, 'Ожидает площадку', 'Awaiting platform'),
    awaiting_manufacturer: L(lang, 'Ожидает производителя', 'Awaiting manufacturer'),
    confirmed: L(lang, 'Подтверждён', 'Confirmed'),
  };
  const A = {
    prev: L(lang, 'Просмотр', 'Preview'),
    dl: L(lang, 'Скачать коды', 'Download codes'),
    edit: L(lang, 'Редактировать', 'Edit'),
    req: L(lang, 'Запросить коды', 'Request codes'),
    sub: L(lang, 'Отправить на проверку', 'Submit for review'),
    resp: L(lang, 'Рассмотреть', 'Review'),
  };
  const data: [number, string, string, string, number, BatchStatus, string][] = [
    [
      48,
      L(lang, 'Мёд липовый, 250 г', 'Linden honey, 250 g'),
      L(lang, 'Лот 24-11', 'Lot 24-11'),
      '20.11.2026',
      50000,
      'confirmed',
      '20.11.2026 10:14',
    ],
    [
      47,
      L(lang, 'Мёд гречишный, 500 г', 'Buckwheat honey, 500 g'),
      L(lang, 'Лот 23-11', 'Lot 23-11'),
      '18.11.2026',
      20000,
      'confirmed',
      '18.11.2026 16:02',
    ],
    [
      46,
      L(lang, 'Пыльца цветочная, 100 г', 'Bee pollen, 100 g'),
      L(lang, 'Лот 22-11', 'Lot 22-11'),
      '16.11.2026',
      0,
      'awaiting_platform',
      '16.11.2026 11:47',
    ],
    [
      45,
      L(lang, 'Прополис, 30 мл', 'Propolis, 30 ml'),
      L(lang, 'Лот 21-11', 'Lot 21-11'),
      '14.11.2026',
      0,
      'awaiting_manufacturer',
      '14.11.2026 09:30',
    ],
    [44, L(lang, 'Перга, 200 г', 'Bee bread, 200 g'), '—', '12.11.2026', 0, 'draft', '12.11.2026 18:05'],
    [
      43,
      L(lang, 'Мёд липовый, 250 г', 'Linden honey, 250 g'),
      L(lang, 'Лот 19-10', 'Lot 19-10'),
      '19.10.2026',
      5000,
      'confirmed',
      '19.10.2026 12:21',
    ],
  ];
  const rows = data.map(function (d) {
    const s = d[5];
    let acts = tb(A.prev);
    if (d[4] > 0) acts += tb(A.dl);
    if (s !== 'confirmed') acts += tb(A.edit);
    if (s === 'confirmed') acts += tb(A.req);
    if (s === 'draft') acts += tb(A.sub);
    if (s === 'awaiting_manufacturer') acts += tb(A.resp);
    return [
      d[0],
      d[1],
      d[2],
      d[3],
      d[4],
      '<span class="vfk-badge vfk-' + s + '">' + ST[s] + '</span>',
      d[6],
      '<div class="vfk-acts">' + acts + '</div>',
    ];
  });
  const cols: [string, number][] = [
    ['ID', 80],
    [L(lang, 'Название', 'Name'), 160],
    [L(lang, 'Информация о партии', 'Batch info'), 220],
    [L(lang, 'Дата партии', 'Batch date'), 130],
    [L(lang, 'Кол-во кодов', 'Codes'), 130],
    [L(lang, 'Статус', 'Status'), 200],
    [L(lang, 'Создано', 'Created'), 160],
    [L(lang, 'Действия', 'Actions'), 260],
  ];
  const table =
    '<div class="vfk-dt">' +
    '<div class="vfk-dt-h"><div class="vfk-row vfk-g8"><div class="vfk-search">' +
    SEARCH +
    '<span>' +
    L(lang, 'Поиск', 'Search') +
    '</span></div>' +
    '<span class="vfk-btn vfk-h40">' +
    FILTERS +
    '</span></div><span class="vfk-btn vfk-primary vfk-h40">' +
    L(lang, 'Создать', 'Create') +
    '</span></div>' +
    '<div class="vfk-dt-b">' +
    grid(cols, rows) +
    '</div>' +
    '<div class="vfk-dt-f"><span class="vfk-btn vfk-h40">' +
    L(lang, 'Дальше', 'Next') +
    '</span><span class="vfk-pg">' +
    L(lang, 'Страница  1 из 3', 'Page 1 of 3') +
    '</span></div></div>';
  return root('batches', 1440, shell(lang, 1, table));
}

export function exports(lang: Lang): string {
  const ST: Record<JobStatus, string> = {
    running: L(lang, 'Выполняется', 'Running'),
    success: L(lang, 'Готово', 'Done'),
    failed: L(lang, 'Ошибка', 'Failed'),
    cancelled: L(lang, 'Отменено', 'Cancelled'),
  };
  const data: [number, string, string, JobStatus, number, number, string, string][] = [
    [
      31,
      'PDF',
      L(lang, 'Мёд липовый, 250 г', 'Linden honey, 250 g'),
      'running',
      31000,
      50000,
      '24.11.2026',
      '10:42:07',
    ],
    [
      30,
      'Excel',
      L(lang, 'Мёд гречишный, 500 г', 'Buckwheat honey, 500 g'),
      'success',
      20000,
      20000,
      '23.11.2026',
      '15:18:51',
    ],
    [
      29,
      'PDF',
      L(lang, 'Мёд гречишный, 500 г', 'Buckwheat honey, 500 g'),
      'success',
      20000,
      20000,
      '23.11.2026',
      '15:02:33',
    ],
    [28, 'PDF', L(lang, 'Мёд липовый, 250 г', 'Linden honey, 250 g'), 'failed', 1200, 5000, '20.10.2026', '12:40:16'],
    [27, 'Excel', L(lang, 'Мёд липовый, 250 г', 'Linden honey, 250 g'), 'cancelled', 0, 5000, '20.10.2026', '12:31:09'],
  ];
  const rows = data.map(function (d) {
    const s = d[3],
      pct = Math.round((d[4] / d[5]) * 100);
    const prog =
      '<div class="vfk-prog"><div class="vfk-track"><div class="vfk-fill vfk-j-' +
      s +
      '" style="width:' +
      pct +
      '%"></div></div>' +
      '<span class="vfk-pn">' +
      (s === 'running' ? '<i class="vfk-count"></i>' : d[4]) +
      ' / ' +
      d[5] +
      '</span></div>';
    const act =
      s === 'running'
        ? L(lang, 'Отмена', 'Cancel')
        : s === 'success'
          ? L(lang, 'Скачать', 'Download')
          : L(lang, 'Перезапустить', 'Restart');
    return [
      d[0],
      d[1],
      d[2],
      '<span class="vfk-badge vfk-j-' + s + '">' + ST[s] + '</span>',
      prog,
      d[6] + ' ' + d[7],
      tb(act),
    ];
  });
  const cols: [string, number][] = [
    ['ID', 60],
    [L(lang, 'Формат файла', 'File format'), 200],
    [L(lang, 'Партия', 'Batch'), 220],
    [L(lang, 'Статус', 'Status'), 130],
    [L(lang, 'Прогресс', 'Progress'), 170],
    [L(lang, 'Создано', 'Created'), 170],
    [L(lang, 'Действия', 'Actions'), 110],
  ];
  return root(
    'exports',
    1440,
    shell(lang, 2, '<div class="vfk-dt vfk-dt-x"><div class="vfk-dt-b">' + grid(cols, rows) + '</div></div>'),
  );
}
