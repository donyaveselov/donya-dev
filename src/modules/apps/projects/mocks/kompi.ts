/* Kompi (kompy.app) screens for the project gallery, rebuilt from the real product:
   markup and class rules ported from its frontend (the quiz, the question card, the
   citizenship picker, the result list, the language switcher, the logo) and the PDF
   cover and country page from the backend's report builder. Copy comes from the
   product's locales, demo data from its sample report. Styles: mocks-kompi.css. */
import type { Lang } from '../../../../types';

function L<T>(lang: Lang, ru: T, en: T): T {
  return lang === 'en' ? en : ru;
}

// brand.ts MARK: ring r26/6, 4-point star with a round-joined 3.5 stroke, hub r3
const MARK =
  '<svg class="kmp-mark" viewBox="0 0 64 64" aria-hidden="true">' +
  '<circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="6"/>' +
  '<path d="M32 14.5 L36.6 27.4 L49.5 32 L36.6 36.6 L32 49.5 L27.4 36.6 L14.5 32 L27.4 27.4 Z" fill="currentColor" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>' +
  '<circle class="kmp-hub" cx="32" cy="32" r="3"/></svg>';

// the app draws flags as emoji; emoji flags don't render on Windows, so small SVG stand-ins
function h3(a: string, b: string, c: string): string {
  return (
    '<rect width="24" height="6" fill="' +
    a +
    '"/><rect y="6" width="24" height="6" fill="' +
    b +
    '"/><rect y="12" width="24" height="6" fill="' +
    c +
    '"/>'
  );
}
function v3(a: string, b: string, c: string): string {
  return (
    '<rect width="8" height="18" fill="' +
    a +
    '"/><rect x="8" width="8" height="18" fill="' +
    b +
    '"/><rect x="16" width="8" height="18" fill="' +
    c +
    '"/>'
  );
}
const FLAGS: Record<string, string> = {
  RU: h3('#fff', '#0039a6', '#d52b1e'),
  UA: '<rect width="24" height="9" fill="#0057b7"/><rect y="9" width="24" height="9" fill="#ffd700"/>',
  BY: '<rect width="24" height="12" fill="#c8313e"/><rect y="12" width="24" height="6" fill="#4aa657"/><rect width="4" height="18" fill="#fff"/><path d="M2 1v16" stroke="#c8313e" stroke-width="1.4" stroke-dasharray="1.6 1.2"/>',
  KZ: '<rect width="24" height="18" fill="#00afca"/><circle cx="12" cy="8" r="3.2" fill="#fec50c"/><path d="M7 13.2h10" stroke="#fec50c" stroke-width="1.2"/><path d="M2.2 2v14" stroke="#fec50c" stroke-width="1" stroke-dasharray="1 1"/>',
  US: '<rect width="24" height="18" fill="#fff"/><path d="M0 1.3h24M0 6.4h24M0 11.6h24M0 16.7h24M0 3.9h24M0 9h24M0 14.1h24" stroke="#b22234" stroke-width="1.38"/><path d="M0 3.9h24M0 9h24M0 14.1h24" stroke="#fff" stroke-width="1.2"/><rect width="10.5" height="9.6" fill="#3c3b6e"/>',
  GB: '<rect width="24" height="18" fill="#012169"/><path d="M0 0l24 18M24 0L0 18" stroke="#fff" stroke-width="3.6"/><path d="M0 0l24 18M24 0L0 18" stroke="#c8102e" stroke-width="1.2"/><path d="M12 0v18M0 9h24" stroke="#fff" stroke-width="5"/><path d="M12 0v18M0 9h24" stroke="#c8102e" stroke-width="3"/>',
  DE: h3('#000', '#dd0000', '#ffce00'),
  IN:
    h3('#ff9933', '#fff', '#138808') +
    '<circle cx="12" cy="9" r="2.2" fill="none" stroke="#000080" stroke-width=".7"/>',
  CN: '<rect width="24" height="18" fill="#de2910"/><path d="M4.8 2.2l1 3h3.1l-2.5 1.8 1 3-2.6-1.9-2.5 1.9 1-3L.8 5.2h3z" fill="#ffde00"/><circle cx="9.6" cy="2" r=".7" fill="#ffde00"/><circle cx="11" cy="4" r=".7" fill="#ffde00"/><circle cx="11" cy="7" r=".7" fill="#ffde00"/><circle cx="9.6" cy="9" r=".7" fill="#ffde00"/>',
  BR: '<rect width="24" height="18" fill="#009c3b"/><path d="M12 2l10 7-10 7L2 9z" fill="#ffdf00"/><circle cx="12" cy="9" r="4" fill="#002776"/>',
  TR: '<rect width="24" height="18" fill="#e30a17"/><circle cx="9.5" cy="9" r="4.5" fill="#fff"/><circle cx="10.7" cy="9" r="3.6" fill="#e30a17"/><circle cx="15.4" cy="9" r="1.5" fill="#fff"/>',
  IR: h3('#239f40', '#fff', '#da0000') + '<circle cx="12" cy="9" r="1.6" fill="#da0000"/>',
  MX: v3('#006847', '#fff', '#ce1126') + '<circle cx="12" cy="9" r="1.8" fill="#8c6b3e"/>',
  AR: h3('#74acdf', '#fff', '#74acdf') + '<circle cx="12" cy="9" r="1.6" fill="#f6b40e"/>',
  GE: '<rect width="24" height="18" fill="#fff"/><path d="M12 0v18M0 9h24" stroke="#ff0000" stroke-width="3.2"/><path d="M6 2.4v4.2M3.9 4.5h4.2M18 2.4v4.2M15.9 4.5h4.2M6 11.4v4.2M3.9 13.5h4.2M18 11.4v4.2M15.9 13.5h4.2" stroke="#ff0000" stroke-width="1.2"/>',
  AM: h3('#d90012', '#0033a0', '#f2a800'),
};
function flag(code: string): string {
  return '<svg class="kmp-flag" viewBox="0 0 24 18" aria-hidden="true">' + (FLAGS[code] ?? '') + '</svg>';
}

function brand(lang: Lang): string {
  return (
    '<div class="kmp-brand">' +
    MARK +
    '<span class="kmp-word">' +
    L(lang, 'Компи', 'Kompi') +
    '</span></div>' +
    '<div class="kmp-lang"><span' +
    (lang === 'en' ? '' : ' class="kmp-on"') +
    '>RU</span><span' +
    (lang === 'en' ? ' class="kmp-on"' : '') +
    '>EN</span><span>ES</span></div>'
  );
}
function shell(kind: string, inner: string): string {
  return '<div class="kmp-root kmp-' + kind + '"><div class="kmp-stage">' + inner + '</div></div>';
}

// ---- 1. the quiz: first step, «Какое у вас гражданство?» (CitizenshipPicker.vue) ----
const NAMES: Record<Lang, Record<string, string>> = {
  ru: {
    RU: 'Россия',
    UA: 'Украина',
    BY: 'Беларусь',
    KZ: 'Казахстан',
    US: 'США',
    GB: 'Великобритания',
    DE: 'Германия',
    IN: 'Индия',
    CN: 'Китай',
    BR: 'Бразилия',
    TR: 'Турция',
    IR: 'Иран',
    MX: 'Мексика',
    AR: 'Аргентина',
  },
  en: {
    RU: 'Russia',
    UA: 'Ukraine',
    BY: 'Belarus',
    KZ: 'Kazakhstan',
    US: 'United States',
    GB: 'United Kingdom',
    DE: 'Germany',
    IN: 'India',
    CN: 'China',
    BR: 'Brazil',
    TR: 'Türkiye',
    IR: 'Iran',
    MX: 'Mexico',
    AR: 'Argentina',
  },
};
// locale-config.ts pinnedCitizenships(): PINNED_FIRST per language, then the researched list
const PINNED: Record<Lang, string[]> = {
  ru: ['RU', 'UA', 'BY', 'KZ', 'US', 'GB', 'DE', 'IN', 'CN', 'BR', 'TR', 'IR', 'MX', 'AR'],
  en: ['US', 'GB', 'IN', 'DE', 'RU', 'UA', 'BY', 'KZ', 'CN', 'BR', 'TR', 'IR', 'MX', 'AR'],
};

export function kompyQuiz(lang: Lang): string {
  const k = lang === 'en' ? 'en' : 'ru';
  const opts = PINNED[k]
    .map(function (c, i) {
      return (
        '<div class="kmp-opt kmp-cz-opt' +
        (i === 0 ? ' kmp-sel' : '') +
        '">' +
        flag(c) +
        '<span class="kmp-cz-name">' +
        (NAMES[k][c] ?? '') +
        '</span></div>'
      );
    })
    .join('');
  return shell(
    'quiz',
    '<i class="kmp-cloud kmp-cloud-a"></i><i class="kmp-cloud kmp-cloud-b"></i>' +
      brand(lang) +
      '<div class="kmp-col">' +
      '<div class="kmp-progress"><div class="kmp-progress-fill"></div></div>' +
      '<div class="kmp-question">' +
      '<div class="kmp-back">' +
      L(lang, '← Назад', '← Back') +
      '</div>' +
      '<div><div class="kmp-title">' +
      L(lang, 'Какое у вас гражданство?', "What's your citizenship?") +
      '</div>' +
      '<div class="kmp-subtext">' +
      L(
        lang,
        'От паспорта зависят доступные визы, сроки и пошлины. Если паспортов несколько — выберите тот, по которому планируете переезжать.',
        'Your passport decides which visas are open to you, how long they take and what they cost. Hold more than one? Pick the one you plan to move on.',
      ) +
      '</div></div>' +
      '<div class="kmp-cz"><div class="kmp-cz-label">' +
      L(lang, 'Чаще всего выбирают', 'Most common') +
      '</div>' +
      '<div class="kmp-cz-grid">' +
      opts +
      '</div></div>' +
      '</div>' +
      '</div>',
  );
}

// ---- 2. the result screen (ResultList.vue) with the mockReport.ts fixtures ----
export function kompyReport(lang: Lang): string {
  const reasons = L(
    lang,
    [
      'ВНЖ по ИП или покупке недвижимости — без визового интервью',
      'Бюджет $3 500/мес с запасом покрывает жизнь в Тбилиси',
      'Тёплый климат почти круглый год, как вы указали в приоритетах',
    ],
    [
      'Residency via a sole-proprietor business or property — no visa interview',
      'A $3,500/month budget comfortably covers life in Tbilisi',
      'Warm weather almost all year, as you prioritised',
    ],
  );
  return shell(
    'result',
    '<i class="kmp-ground"></i>' +
      brand(lang) +
      '<div class="kmp-col kmp-wide">' +
      '<div class="kmp-r-title">' +
      L(lang, 'Вот он, ваш вариант', "Here's your match") +
      '</div>' +
      '<div class="kmp-primary">' +
      '<div class="kmp-head"><span class="kmp-bigflag">' +
      flag('GE') +
      '</span><div>' +
      '<div class="kmp-h3">' +
      L(lang, 'Грузия', 'Georgia') +
      '</div><span class="kmp-score">87%</span></div></div>' +
      '<div class="kmp-visa">' +
      L(lang, 'Маршрут: ВНЖ через ИП', 'Route: Residency via sole proprietorship') +
      '</div>' +
      '<div class="kmp-bar"><div class="kmp-fill"></div></div>' +
      '<div class="kmp-reasons"><div>' +
      reasons.join('</div><div>') +
      '</div></div>' +
      '<div class="kmp-move"><div class="kmp-move-text">' +
      L(lang, 'Как переехать: визы, шаги, стоимость жизни', 'How to move: visas, steps, cost of living') +
      '</div>' +
      '<span class="kmp-report-btn">' +
      L(lang, 'Получить полный отчёт в Telegram', 'Get the full report on Telegram') +
      '</span></div>' +
      '</div>' +
      '<div class="kmp-section-label">' +
      L(lang, 'Ещё варианты', 'Other options') +
      '</div>' +
      '<div class="kmp-row">' +
      flag('AM') +
      '<span class="kmp-name">' +
      L(lang, 'Армения', 'Armenia') +
      '</span><span class="kmp-rscore">74%</span></div>' +
      '<div class="kmp-row kmp-failed">' +
      flag('MX') +
      '<span class="kmp-name">' +
      L(lang, 'Мексика', 'Mexico') +
      '</span><span class="kmp-rscore">' +
      L(lang, 'не подходит', 'not a fit') +
      '</span></div>' +
      '<div class="kmp-restart">' +
      L(lang, 'Пройти заново', 'Start over') +
      '</div>' +
      '</div>',
  );
}

// ---- 3. the PDF the bot sends (report_pdf.py): cover + first country page, laid out
//         the way the /example page shows them (caption above each page) ----
export function kompyPdf(lang: Lang): string {
  const en = lang === 'en';
  const tk = [
    ['am', L(lang, 'Армения', 'Armenia'), L(lang, 'ИП + плоский налог', 'Sole proprietorship + flat tax')],
    ['mx', L(lang, 'Мексика', 'Mexico'), 'Temporary Resident Visa'],
    [
      'ge',
      L(lang, 'Грузия', 'Georgia'),
      L(
        lang,
        'Право на трудовую деятельность + D1/ВНЖ (удалёнка)',
        'Right to Work + D1/residence permit (remote work)',
      ),
    ],
  ]
    .map(function (t, i) {
      return (
        `<div class="kmp-tk"><span class="kmp-photo kmp-tk-thumb kmp-ph-${t[0] ?? ''}"></span>` +
        `<span class="kmp-tk-num">${String(i + 1)}</span><span class="kmp-tk-body">` +
        `<span class="kmp-tk-name">${t[1] ?? ''}</span><span class="kmp-tk-visa">${t[2] ?? ''}</span></span></div>`
      );
    })
    .join('');
  const chips = (
    en
      ? ['$3,500 / mo', '$30,000 in savings', 'family of 2', 'residence permit', 'warm all year round', 'for good']
      : ['$3 500 / мес', '$30 000 накоплений', 'семья 2', 'вид на жительство', 'тёплый круглый год', 'навсегда']
  )
    .map(function (c) {
      return '<span class="kmp-chip">' + c + '</span>';
    })
    .join('');
  const cover =
    '<div class="kmp-cover">' +
    '<div class="kmp-cover-top"><span class="kmp-logo">' +
    MARK +
    ' ' +
    L(lang, 'Компи', 'Kompi') +
    '</span>' +
    '<span class="kmp-logo-sub">' +
    L(lang, 'подбор страны для переезда', 'matching a country for relocation') +
    '</span></div>' +
    '<div class="kmp-h1">' +
    L(lang, 'Ваш подбор', 'Your match') +
    '</div>' +
    '<div class="kmp-hero"><span class="kmp-photo kmp-ph-am"></span><span class="kmp-scrim"></span><span class="kmp-hero-text">' +
    '<span class="kmp-kicker">' +
    L(lang, 'Ближе всего к вашим вводным', 'Closest to your inputs') +
    '</span>' +
    '<span class="kmp-hero-name">' +
    L(lang, 'Армения', 'Armenia') +
    '</span></span></div>' +
    '<div class="kmp-lead">' +
    L(
      lang,
      'Три страны, которые лучше всего сходятся с вашими деньгами, целями и ограничениями. Дальше — по странице на каждую: подходящая виза, как её получить и сколько стоит жизнь.',
      'Three countries that best match your money, goals and constraints. Next, a page for each: the suitable visa, how to get it and the cost of living.',
    ) +
    '</div>' +
    '<div class="kmp-tickets">' +
    tk +
    '</div>' +
    '<div class="kmp-recap">' +
    L(lang, 'Вводные, по которым отбирали', 'Inputs used for matching') +
    '</div>' +
    '<div class="kmp-chips">' +
    chips +
    '</div>' +
    '</div>';
  const facts = (
    en
      ? [
          'How you enter with your passport: visa-free, up to 180 days in 365',
          'Status duration — 1 year, renewable',
          'Income threshold — from $700 per month',
          'Allows working for a local employer',
          'Path to permanent residence — after 3 years of residence',
          'Path to citizenship — after 6 years',
        ]
      : [
          'Как въехать с вашим паспортом: без визы, до 180 дней из 365',
          'Срок статуса — 1 год, с продлением',
          'Порог дохода — от $700 в месяц',
          'Разрешает работать на местного работодателя',
          'Путь к ПМЖ — после 3 лет проживания',
          'Путь к гражданству — после 6 лет',
        ]
  )
    .map(function (f) {
      return '<div class="kmp-fact">' + f + '</div>';
    })
    .join('');
  const r1 = L(lang, 'ИП + плоский налог', 'Sole proprietorship + flat tax');
  const r2 = L(lang, 'Временный ВНЖ по учёбе (языковые курсы)', 'Temporary study residence permit (language courses)');
  const rows = (
    en
      ? [
          ['Financial entry requirement', 'income from $700/mo', 'tuition ~$3,000/year'],
          ['Work for a local employer', 'allowed', 'prohibited'],
          ['Eligible income', 'any', 'source of income is not checked'],
          ['Path to status', 'permanent residence after 3 years · citizenship after 6 years', 'leads nowhere'],
        ]
      : [
          ['Вход по деньгам', 'доход от $700/мес', 'оплата учёбы ~$3 000/год'],
          ['Работа на местного работодателя', 'разрешена', 'запрещена'],
          ['Какой доход подходит', 'любой', 'источник дохода не проверяется'],
          ['Путь к статусу', 'ПМЖ через 3 года · гражданство через 6 лет', 'никуда не ведёт'],
        ]
  )
    .map(function (r) {
      return `<span class="kmp-th">${r[0] ?? ''}</span><span>${r[1] ?? ''}</span><span>${r[2] ?? ''}</span>`;
    })
    .join('');
  const country =
    '<div class="kmp-cpage">' +
    '<div class="kmp-hdr"><span class="kmp-photo kmp-ph-am"></span><span class="kmp-hdr-scrim"></span><span class="kmp-hdr-text">' +
    '<span class="kmp-hdr-kicker">' +
    L(lang, '№1 в подборе', '#1 in your match') +
    '</span>' +
    '<span class="kmp-hdr-name">' +
    L(lang, 'Армения', 'Armenia') +
    '</span><span class="kmp-hdr-visa">' +
    r1 +
    '</span></span></div>' +
    '<div class="kmp-card"><div class="kmp-card-title">' +
    L(lang, 'Визовый маршрут', 'Visa route') +
    '</div>' +
    '<div class="kmp-visa-name">' +
    r1 +
    '</div>' +
    facts +
    '</div>' +
    '<div class="kmp-card"><div class="kmp-card-title">' +
    L(lang, 'Какая виза лучше', 'Which visa is better') +
    '</div>' +
    '<div class="kmp-rc-intro">' +
    L(
      lang,
      'Вам подходит несколько маршрутов — вот чем они различаются:',
      "Several routes suit you — here's how they differ:",
    ) +
    '</div>' +
    '<div class="kmp-rc-guide">' +
    L(
      lang,
      '«' + r2 + '» подходит, только если готовы реально ходить на занятия и платить за курс.',
      '“' + r2 + "” only suits you if you're ready to actually attend classes and pay for the course.",
    ) +
    '</div>' +
    '<div class="kmp-rc-table"><span class="kmp-th kmp-thead"></span><span class="kmp-thead">' +
    r1 +
    '</span><span class="kmp-thead">' +
    r2 +
    '</span>' +
    rows +
    '</div>' +
    '<div class="kmp-rc-cav-name">' +
    r2 +
    '</div>' +
    '<div class="kmp-rc-cav">• ' +
    L(lang, 'Нельзя работать по найму на местного работодателя', 'Cannot be employed by a local employer') +
    '</div>' +
    '<div class="kmp-rc-cav">• ' +
    L(
      lang,
      'Не ведёт к ПМЖ/гражданству — годы по этой визе в стаж не идут',
      "Does not lead to permanent residence/citizenship — years on this visa don't count",
    ) +
    '</div>' +
    '</div>' +
    '<div class="kmp-pfoot"><span>' +
    L(lang, 'Компи · подбор страны для переезда', 'Kompi · matching a country for relocation') +
    '</span><span>2 / 7</span></div>' +
    '</div>';
  return shell(
    'pdf',
    '<div class="kmp-fig kmp-fig-1"><div class="kmp-figcap">' +
      L(lang, 'Обложка: три подходящие страны', 'Cover: three matching countries') +
      '</div>' +
      '<div class="kmp-sheet"><div class="kmp-a4">' +
      cover +
      '</div></div></div>' +
      '<div class="kmp-fig kmp-fig-2"><div class="kmp-figcap">' +
      L(lang, 'Армения — визовый маршрут и сравнение вариантов', 'Armenia — visa route and comparing the options') +
      '</div>' +
      '<div class="kmp-sheet"><div class="kmp-a4">' +
      country +
      '</div></div></div>',
  );
}
// the old kind name keeps working until common.js switches to 'kompy-pdf'
