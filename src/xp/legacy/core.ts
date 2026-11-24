// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/core.js. Replace module by module; do not edit in place.
/* Windows XD — the desktop shell that lives inside the monitor of the room page.
   Defines window.XPDesktop (see CONTRACT.md): window manager, taskbar, start menu, tray, dialogs, sounds,
   boot / welcome / shutdown, game hand-off. Vanilla ES2017, no network, no libraries, all artwork original. */
(function () {
  'use strict';
  if (window.XPDesktop && window.XPDesktop.__shell) return;

  /* =========================================================== basics */
  var BRAND = 'Windows XD';
  var VERSION = 'Windows XD 5.1 (build 2026.11, Phuket)';
  var PC_NAME = 'PHUKET-PC';
  var USER = { ru: 'Даниил', en: 'Daniil' };
  var MQ_REDUCED = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var MQ_COARSE = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
  function reduced() { return !!(MQ_REDUCED && MQ_REDUCED.matches); }
  function D(ms) { return reduced() ? 1 : ms; }              // motion duration
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function noop() {}
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt || false); return function () { el.removeEventListener(ev, fn, opt || false); }; }
  function rm(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  function css(el, o) { for (var k in o) el.style[k] = typeof o[k] === 'number' && k !== 'opacity' && k !== 'zIndex' ? o[k] + 'px' : o[k]; return el; }
  function store(k, v) {
    try {
      if (arguments.length > 1) { localStorage.setItem('donyaos.' + k, JSON.stringify(v)); return v; }
      var s = localStorage.getItem('donyaos.' + k); return s == null ? undefined : JSON.parse(s);
    } catch (e) { return undefined; }
  }
  function sess(k, v) {
    try {
      if (arguments.length > 1) { sessionStorage.setItem('donyaos.' + k, v); return v; }
      return sessionStorage.getItem('donyaos.' + k);
    } catch (e) { return null; }
  }
  function animate(el, frames, ms, easing, extra) {
    ms = D(ms);
    if (!el || !el.animate || ms <= 1) return Promise.resolve();
    var o = { duration: ms, easing: easing || 'ease', fill: 'both' };
    if (extra) for (var k in extra) o[k] = extra[k];
    var a = el.animate(frames, o);
    return new Promise(function (res) { a.onfinish = function () { res(a); }; a.oncancel = function () { res(a); }; });
  }
  var EASE_OUT = 'cubic-bezier(.2,.8,.2,1)', EASE_IN = 'cubic-bezier(.6,0,.9,.4)', EASE_STD = 'cubic-bezier(.3,0,.2,1)';

  /* =========================================================== state */
  var S = {
    mounted: false, open: false, lang: 'ru', opts: {},
    apps: {}, appOrder: [],
    wins: [], active: null, seq: 0,
    recent: [], booted: sess('booted') === '1',
    busy: false,            // boot / shutdown overlay in progress
    size: 'desk', touch: false, w: 0, h: 0,
    prefs: Object.assign({ muted: false, volume: 0.8, wall: 'bliss', tint: true, crt: true, saver: 'logo', saverMin: 3, icons: {}, autoArrange: false }, store('prefs') || {}),
    langCbs: [], timers: {}
  };
  function savePrefs() { store('prefs', S.prefs); }
  if (!store('wall3')) { S.prefs.wall = 'bliss'; S.prefs.saver = 'logo'; store('wall3', 1); savePrefs(); }   // the default wallpaper changed: move earlier visitors to it once
  var R = {};                 // DOM refs

  /* =========================================================== i18n */
  var T = {
    start: ['пуск', 'start'],
    allPrograms: ['Все программы', 'All Programs'],
    logOff: ['Выход из системы', 'Log Off'],
    turnOff: ['Выключение', 'Turn Off Computer'],
    turnOffTitle: ['Выключить компьютер', 'Turn off computer'],
    logOffTitle: ['Выход из ' + BRAND, 'Log Off ' + BRAND],
    standBy: ['Ждущий режим', 'Stand By'],
    shutDown: ['Выключение', 'Turn Off'],
    restart: ['Перезагрузка', 'Restart'],
    switchUser: ['Смена пользователя', 'Switch User'],
    cancel: ['Отмена', 'Cancel'],
    ok: ['OK', 'OK'],
    yes: ['Да', 'Yes'], no: ['Нет', 'No'],
    apply: ['Применить', 'Apply'],
    close: ['Закрыть', 'Close'],
    open: ['Открыть', 'Open'],
    restore: ['Восстановить', 'Restore'],
    move: ['Переместить', 'Move'],
    size: ['Размер', 'Size'],
    minimize: ['Свернуть', 'Minimize'],
    maximize: ['Развернуть', 'Maximize'],
    help: ['Справка', 'Help'],
    arrangeBy: ['Упорядочить значки', 'Arrange Icons By'],
    byName: ['Имя', 'Name'], byType: ['Тип', 'Type'],
    autoArrange: ['Автоматически', 'Auto Arrange'], alignGrid: ['Выровнять по сетке', 'Align to Grid'],
    refresh: ['Обновить', 'Refresh'],
    paste: ['Вставить', 'Paste'], pasteShortcut: ['Вставить ярлык', 'Paste Shortcut'],
    newItem: ['Создать', 'New'], folder: ['Папку', 'Folder'], shortcut: ['Ярлык', 'Shortcut'],
    properties: ['Свойства', 'Properties'],
    createShortcut: ['Создать ярлык', 'Create Shortcut'], del: ['Удалить', 'Delete'], rename: ['Переименовать', 'Rename'],
    toolbars: ['Панели инструментов', 'Toolbars'],
    cascade: ['Окна каскадом', 'Cascade Windows'],
    tileH: ['Окна сверху вниз', 'Tile Windows Horizontally'],
    tileV: ['Окна слева направо', 'Tile Windows Vertically'],
    showDesktop: ['Свернуть все окна', 'Show the Desktop'],
    showDesktopQL: ['Показать рабочий стол', 'Show Desktop'],
    taskMgr: ['Диспетчер задач', 'Task Manager'],
    lockTaskbar: ['Закрепить панель задач', 'Lock the Taskbar'],
    controlPanel: ['Панель управления', 'Control Panel'],
    display: ['Свойства: Экран', 'Display Properties'],
    helpSupport: ['Справка и поддержка', 'Help and Support'],
    run: ['Выполнить…', 'Run…'],
    runTitle: ['Запуск программы', 'Run'],
    runText: ['Введите имя программы, папки, документа или ресурса, и ' + BRAND + ' откроет их.', 'Type the name of a program, folder, document, or resource, and ' + BRAND + ' will open it for you.'],
    runOpen: ['Открыть:', 'Open:'],
    browse: ['Обзор…', 'Browse…'],
    runNotFound: ['Не удаётся найти «%s». Проверьте, правильно ли указано имя, и повторите попытку.\nПодсказка: попробуйте имя программы с рабочего стола.', 'Cannot find \'%s\'. Make sure you typed the name correctly, and then try again.\nHint: try the name of a program on the desktop.'],
    about: ['О программе ' + BRAND, 'About ' + BRAND],
    myResume: ['Моё резюме', 'My Resume'],
    welcome: ['добро пожаловать', 'welcome'],
    loadingSettings: ['Загрузка личных параметров…', 'Loading your personal settings…'],
    savingSettings: ['Сохранение параметров…', 'Saving your settings…'],
    loggingOff: ['Выход из системы…', 'Logging off…'],
    toBegin: ['Чтобы начать работу, щёлкните имя пользователя', 'To begin, click your user name'],
    turnOffBtn: ['Выключить компьютер', 'Turn off computer'],
    afterLogOff: ['После выхода вы можете снова войти — всё уже настроено.', 'After you log off, you can log right back on. Everything is set up already.'],
    account: ['Fullstack-разработчик', 'Fullstack developer'],
    skip: ['Щёлкните или нажмите любую клавишу, чтобы пропустить', 'Click or press any key to skip'],
    copyright: ['© Даниил Иванов, 2026', '© Daniil Ivanov, 2026'],
    edition: ['Professional', 'Professional'],
    volume: ['Громкость', 'Volume'],
    mute: ['Выкл. звук', 'Mute'],
    volumeTip: ['Громкость: %s', 'Volume: %s'],
    muted: ['выкл.', 'muted'],
    langTip: ['Язык ввода: русский (RU)\nЩёлкните, чтобы переключить', 'Input language: English (EN)\nClick to switch'],
    clockTipPre: ['Пхукет, ', 'Phuket, '],
    clockTipPost: [' · Пхукет (UTC+7)', ' · Phuket (UTC+7)'],
    status_work: ['Даниил сейчас работает', 'Daniil is working right now'],
    status_play: ['Даниил сейчас играет', 'Daniil is playing right now'],
    status_sleep: ['Даниил сейчас спит', 'Daniil is asleep right now'],
    status_outside: ['Даниил сейчас гуляет', 'Daniil is out and about'],
    statusLine_work: ['работает · Пхукет', 'working · Phuket'],
    statusLine_play: ['играет · Пхукет', 'playing · Phuket'],
    statusLine_sleep: ['спит · Пхукет', 'asleep · Phuket'],
    statusLine_outside: ['гуляет · Пхукет', 'outside · Phuket'],
    welcomeBalloonT: ['Найдено новое оборудование', 'Found New Hardware'],
    welcomeBalloon: ['Посетитель. Драйверы любопытства установлены — дважды щёлкните любой значок.', 'Visitor. Curiosity drivers installed: double-click any icon.'],
    welcomeBalloonTouch: ['Посетитель. Драйверы любопытства установлены — коснитесь любого значка.', 'Visitor. Curiosity drivers installed: tap any icon.'],
    statusChanged_work: ['Даниил сел за работу', 'Daniil sat down to work'],
    statusChanged_play: ['Даниил запустил игру', 'Daniil started a game'],
    statusChanged_sleep: ['Даниил ушёл спать', 'Daniil went to bed'],
    statusChanged_outside: ['Даниил вышел прогуляться', 'Daniil stepped outside'],
    sleepScreen: ['Тсс. Владелец спит.\nПошевелите мышью, чтобы разбудить компьютер (но не его).', 'Shh. The owner is asleep.\nMove the mouse to wake the computer (but not him).'],
    sleepScreenTouch: ['Тсс. Владелец спит.\nКоснитесь экрана, чтобы разбудить компьютер (но не его).', 'Shh. The owner is asleep.\nTap to wake the computer (but not him).'],
    locked: ['Компьютер заблокирован', 'This computer is locked'],
    lockedWhy: ['Владелец на пляже, в зале или за кофе.', 'The owner is at the beach, the gym or out for coffee.'],
    guest: ['Войти как гость', 'Log on as Guest'],
    restoreIcons: ['Восстановить значки (%s)', 'Restore icons (%s)'],
    recycleSelf: ['Корзина не может содержать саму себя. Рекурсия отключена администратором.', 'The Recycle Bin cannot contain itself. Recursion has been disabled by the administrator.'],
    langRu: ['Русский (RU)', 'Russian (RU)'], langEn: ['Английский (EN)', 'English (EN)'],
    gameHint: ['Esc / щелчок — свернуть', 'Esc / tap — minimize'],
    gameMin: ['Игра свёрнута', 'Game minimized'],
    appMin: ['Окно свёрнуто', 'Window minimized'],
    gameMinText: ['«%s» свернута на панель задач. Щёлкните кнопку, чтобы вернуться.', '“%s” is minimized to the taskbar. Click its button to go back.'],
    noProps: ['Свойства объекта', 'Properties'],
    deleteNo: ['Этот значок нужен ' + BRAND + ' для работы. Удалять его мы не будем.', BRAND + ' needs this icon to work. We are not going to delete it.'],
    pinned: ['Закреплённые', 'Pinned'],
    emptyMenu: ['(пусто)', '(Empty)'],
    accessories: ['Стандартные', 'Accessories'],
    systemTools: ['Служебные', 'System Tools'],
    desktopTab: ['Рабочий стол', 'Desktop'],
    saverTab: ['Заставка', 'Screen Saver'],
    appearanceTab: ['Оформление', 'Appearance'],
    background: ['Фоновый рисунок:', 'Background:'],
    tint: ['Подстраивать под свет в комнате', 'Tint with room light'],
    crt: ['Эффект ЭЛТ-монитора', 'CRT monitor effect'],
    saver: ['Заставка', 'Screen saver'],
    wait: ['Интервал:', 'Wait:'],
    minutes: ['мин.', 'minutes'],
    preview: ['Просмотр', 'Preview'],
    none: ['(нет)', '(None)'],
    wall_bliss: ['Безмятежность', 'Bliss'], wall_hill: ['Холм', 'Hill'], wall_andaman: ['Андаман', 'Andaman'], wall_blueprint: ['Чертёж', 'Blueprint'], wall_none: ['(нет)', '(None)'],
    saver_stars: ['Звёздное небо', 'Starfield'], saver_logo: ['Плавающий логотип', 'Floating logo'], saver_none: ['(нет)', '(None)'],
    tmApps: ['Приложения', 'Applications'], tmPerf: ['Быстродействие', 'Performance'],
    tmTask: ['Задача', 'Task'], tmStatus: ['Состояние', 'Status'], tmRunning: ['Работает', 'Running'],
    tmEnd: ['Снять задачу', 'End Task'], tmSwitch: ['Переключиться', 'Switch To'], tmNew: ['Новая задача…', 'New Task…'],
    tmProc: ['Процессов: %s', 'Processes: %s'], tmCpu: ['Загрузка ЦП: %s%', 'CPU Usage: %s%'], tmMem: ['Выделение памяти: %s', 'Commit Charge: %s'],
    tmCpuGraph: ['Загрузка ЦП', 'CPU Usage'], tmCoffee: ['Уровень кофе', 'Coffee level'],
    aboutLicensed: ['Эта копия лицензирована для:', 'This product is licensed to:'],
    aboutVisitor: ['Гость портфолио', 'Portfolio visitor'],
    aboutMem: ['Доступно физической памяти: %s', 'Physical memory available to ' + BRAND + ': %s'],
    aboutText: ['Собрано вручную на Пхукете: окна и звуки написаны кодом, иконки и обои взяты из Windows XP.', 'Handmade in Phuket: windows and sounds are written in code, icons and the wallpaper come from Windows XP.'],
    appsCount: ['Программ: %s', 'Programs: %s'],
    bsodKey: ['Нажмите любую клавишу для перезагрузки', 'Press any key to restart'],
    modalBusy: ['Сначала закройте диалоговое окно.', 'Close the dialog box first.'],
    standingBy: ['Ждущий режим. Щёлкните, чтобы проснуться.', 'Standing by. Click to wake up.'],
    typeLabel: ['Тип: приложение', 'Type: Application'],
    locLabel: ['Расположение: C:\\Andaman\\Programs', 'Location: C:\\Andaman\\Programs'],
    notResponding: ['(не отвечает)', '(Not Responding)'],
    endTaskQ: ['Завершить «%s»? Несохранённые данные будут потеряны.', 'End “%s”? Any unsaved data will be lost.']
  };
  function L(key, arg) {
    var v = T[key]; if (!v) return key;
    var s = v[S.lang === 'en' ? 1 : 0];
    return arg != null ? s.replace('%s', arg) : s;
  }
  function tr(o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    return o[S.lang] != null ? o[S.lang] : (o.en != null ? o.en : (o.ru != null ? o.ru : ''));
  }

  /* =========================================================== icons (original, 32x32 grid) */
  function svg(body, vb) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb || '0 0 32 32') + '" aria-hidden="true" focusable="false">' + body + '</svg>'; }
  function lg(id, stops, x1, y1, x2, y2) {
    var s = '<linearGradient id="' + id + '" x1="' + (x1 == null ? 0 : x1) + '" y1="' + (y1 == null ? 0 : y1) + '" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">';
    stops.forEach(function (st, i) { s += '<stop offset="' + (st[1] != null ? st[1] : i / (stops.length - 1)) + '" stop-color="' + st[0] + '"' + (st[2] != null ? ' stop-opacity="' + st[2] + '"' : '') + '/>'; });
    return s + '</linearGradient>';
  }
  function rg(id, stops, cx, cy, r, user) {
    var s = '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + (user ? ' gradientUnits="userSpaceOnUse"' : '') + '>';
    stops.forEach(function (st, i) { s += '<stop offset="' + (st[1] != null ? st[1] : i / (stops.length - 1)) + '" stop-color="' + st[0] + '"/>'; });
    return s + '</radialGradient>';
  }
  var SHADOW = '<ellipse cx="17" cy="29" rx="11" ry="2.5" fill="#000" opacity=".22"/>';
  function petals(cx, cy, scale, gid) {
    var p = '';
    for (var i = 0; i < 5; i++) {
      p += '<path transform="rotate(' + (i * 72) + ' ' + cx + ' ' + cy + ')" d="M' + cx + ' ' + cy + 'C' + (cx - 5.2 * scale) + ' ' + (cy - 3.2 * scale) + ' ' + (cx - 6.4 * scale) + ' ' + (cy - 11.6 * scale) + ' ' + (cx - 1.6 * scale) + ' ' + (cy - 13.6 * scale) + 'C' + (cx + 3.6 * scale) + ' ' + (cy - 14.8 * scale) + ' ' + (cx + 5.8 * scale) + ' ' + (cy - 9.6 * scale) + ' ' + cx + ' ' + cy + 'Z" fill="url(#' + gid + ')" stroke="#C98A00" stroke-opacity=".6" stroke-width="' + (0.7 * scale) + '"/>';
    }
    return p;
  }
  var ICON = {
    logo: function () {
      return svg('<defs>' + rg('dxl-p', [['#FFB81C', 0], ['#FFE680', .45], ['#FFFFFF', 1]], 16, 16, 14, true) + '</defs>' +
        petals(16, 16, 1, 'dxl-p') + '<circle cx="16" cy="16" r="2.4" fill="#F7941D"/><circle cx="15.3" cy="15.3" r=".8" fill="#fff" opacity=".7"/>');
    },
    avatar: function () {
      return svg('<defs>' + lg('dxa-s', [['#2C6FD6'], ['#8DC2F7', .62], ['#FFD08A']]) + lg('dxa-sea', [['#2E86C9'], ['#62B6E6']]) + lg('dxa-sand', [['#FFE7A8'], ['#E9C27A']]) + '</defs>' +
        '<rect width="32" height="32" fill="url(#dxa-s)"/><circle cx="22" cy="13" r="5" fill="#FFE3A0"/><circle cx="22" cy="13" r="3.6" fill="#FFF3CF"/>' +
        '<rect y="19" width="32" height="5" fill="url(#dxa-sea)"/><path d="M0 24c8-2 18-2.6 32-.6V32H0z" fill="url(#dxa-sand)"/>' +
        '<path d="M8.5 27c.6-5 1.8-9.5 4-13" fill="none" stroke="#5A3A1E" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M12.5 14c-3-1.6-6.5-1-8 1.4M12.5 14c-1.2-3-4-4.6-6.8-4M12.5 14c1-3 3.8-4.6 6.6-3.6M12.5 14c3 .2 5.6 2 6.2 4.6M12.5 14c-1.8 1-3.2 3.4-3 6" fill="none" stroke="#2B7A26" stroke-width="1.7" stroke-linecap="round"/>' +
        '<path d="M24 22.2h5.5l-1 1.2h-3.6z" fill="#7A4B2A"/><path d="M26.4 22.2v-3" stroke="#7A4B2A" stroke-width=".6"/>');
    },
    computer: function () {
      return svg('<defs>' + lg('dxc-m', [['#F2F4F7'], ['#B8C0CC']], 0, 0, 1, 1) + lg('dxc-g', [['#BFE6FF'], ['#4E98F8', .6], ['#3C8CF5']]) + '</defs>' + SHADOW +
        '<rect x="4.5" y="3.5" width="23" height="18" rx="2" fill="url(#dxc-m)" stroke="#6C7684" stroke-opacity=".85"/>' +
        '<rect x="7" y="6" width="18" height="12.5" rx=".5" fill="url(#dxc-g)" stroke="#0B3FAE" stroke-opacity=".7"/>' +
        '<path d="M7 15.5c3.5-2.6 8-3 18-.8v3.8H7z" fill="#6CC23E"/><path d="M7 16.8c5-2.2 11-1.2 18 .4v1.3H7z" fill="#3F9A2E"/>' +
        '<path d="M7.6 6.6h16.8" stroke="#fff" stroke-opacity=".6"/><path d="M13 21.5h6l1.2 2.5h-8.4z" fill="#B8C0CC" stroke="#6C7684" stroke-opacity=".85"/>' +
        '<path d="M6 25.5h20l1.5 2.5h-23z" fill="url(#dxc-m)" stroke="#6C7684" stroke-opacity=".85" stroke-linejoin="round"/><circle cx="24.6" cy="20" r=".7" fill="#5DD35A"/>');
    },
    folder: function () {
      return svg('<defs>' + lg('dxf-f', [['#FFE48A'], ['#F9C835']]) + '</defs>' + SHADOW +
        '<path d="M3.5 8.5c0-.8.6-1.5 1.5-1.5h7l2 2h13c.8 0 1.5.7 1.5 1.5v15c0 .8-.7 1.5-1.5 1.5H5c-.9 0-1.5-.7-1.5-1.5z" fill="#D99A12" stroke="#A8730A" stroke-opacity=".85"/>' +
        '<path d="M3.5 12.5h25v13c0 .8-.7 1.5-1.5 1.5H5c-.9 0-1.5-.7-1.5-1.5z" fill="url(#dxf-f)" stroke="#B88209" stroke-opacity=".85"/>' +
        '<path d="M4.5 13.5h23" stroke="#fff" stroke-opacity=".65"/>');
    },
    doc: function () {
      return svg('<defs>' + lg('dxd-p', [['#FFFFFF'], ['#E8EEF8']], 0, 0, 1, 1) + '</defs>' + SHADOW +
        '<path d="M7.5 3.5h12l5 5v19h-17z" fill="url(#dxd-p)" stroke="#9AA9C4"/><path d="M19.5 3.5v5h5" fill="#C9D6EA" stroke="#9AA9C4" stroke-linejoin="round"/>' +
        '<path d="M10.5 12.5h11M10.5 15.5h11M10.5 18.5h11M10.5 21.5h8" stroke="#9AA9C4"/>');
    },
    recycle: function () {
      return svg('<defs>' + lg('dxr-b', [['#DCE8F4', 0], ['#A9BED6', .55], ['#7F98B8', 1]], 0, 0, 1, 0) + '</defs>' + SHADOW +
        '<path d="M7 8.5l2.5 19c.1.6.6 1 1.2 1h10.6c.6 0 1.1-.4 1.2-1l2.5-19z" fill="url(#dxr-b)" stroke="#5E7898" stroke-opacity=".85"/>' +
        '<path d="M11.5 11.5l1 15M16 11.5v15M20.5 11.5l-1 15" stroke="#fff" stroke-opacity=".55"/>' +
        '<ellipse cx="16" cy="8.5" rx="9" ry="2.6" fill="#EAF2FA" stroke="#5E7898" stroke-opacity=".85"/><ellipse cx="16" cy="8.8" rx="7" ry="1.6" fill="#7F98B8" opacity=".6"/>');
    },
    help: function () {
      return svg('<defs>' + rg('dxh-g', [['#8FC2FF', 0], ['#3C8CF5', .55], ['#1450C8', 1]], .35, .3, .75) + '</defs>' + SHADOW +
        '<circle cx="16" cy="15" r="12" fill="url(#dxh-g)" stroke="#0B3FAE" stroke-opacity=".8"/><ellipse cx="13" cy="9" rx="6" ry="3.4" fill="#fff" opacity=".3"/>' +
        '<path d="M12.2 11.6c.4-2.4 2-3.6 4-3.6 2.4 0 4 1.5 4 3.4 0 2.6-3.5 2.8-3.5 5.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="16.7" cy="21.4" r="1.6" fill="#fff"/>');
    },
    run: function () {
      return svg('<defs>' + lg('dxu-g', [['#4E98F8'], ['#1464E4']]) + '</defs>' + SHADOW +
        '<rect x="4.5" y="6.5" width="23" height="19" rx="1.5" fill="#fff" stroke="#6C7684" stroke-opacity=".85"/><rect x="4.5" y="6.5" width="23" height="4.5" rx="1.5" fill="url(#dxu-g)"/>' +
        '<path d="M10 14.5l4 3.5-4 3.5M16 14.5l4 3.5-4 3.5" fill="none" stroke="#2C8530" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>');
    },
    settings: function () {
      return svg('<defs>' + lg('dxs-p', [['#F2F4F7'], ['#B8C0CC']], 0, 0, 1, 1) + lg('dxs-w', [['#E8ECF2'], ['#8A94A4']]) + '</defs>' + SHADOW +
        '<rect x="4.5" y="4.5" width="21" height="21" rx="2" fill="url(#dxs-p)" stroke="#6C7684" stroke-opacity=".85"/>' +
        '<path d="M8.5 10.5h13M8.5 17.5h13" stroke="#6C7684" stroke-width="2" stroke-linecap="round"/><rect x="11" y="8" width="4" height="5" rx="1" fill="#3C8CF5" stroke="#1450C8"/><rect x="16" y="15" width="4" height="5" rx="1" fill="#3C9E3C" stroke="#226A25"/>' +
        '<path d="M18.5 28l8-8a3.6 3.6 0 1 1 3-4.6l-2.2.2-.8 2 1.4 1.6a3.6 3.6 0 0 1-4.6-.5l-8 8z" fill="url(#dxs-w)" stroke="#6C7684" stroke-linejoin="round"/>');
    },
    display: function () { return ICON.computer(); },
    key: function () {
      return svg('<circle cx="11" cy="16" r="5.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M16 16h11M23 16v4M26.5 16v3" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>');
    },
    power: function () {
      return svg('<path d="M10.2 9.6a9 9 0 1 0 11.6 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M16 5v10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>');
    },
    restartG: function () {
      return svg('<path d="M23.5 11.5A9 9 0 1 0 25 18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M19.5 10.5h5.5V5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
    },
    moonG: function () {
      return svg('<path d="M20 5.5a10.5 10.5 0 1 0 7 15.5A9 9 0 0 1 20 5.5z" fill="#fff"/>');
    },
    info: function () {
      return svg('<defs>' + rg('dxi-g', [['#7FB4FA', 0], ['#2F74E8', .55], ['#0B3FAE', 1]], .35, .3, .8) + '</defs>' +
        '<circle cx="16" cy="16" r="13" fill="url(#dxi-g)" stroke="#0A246A" stroke-opacity=".6"/><ellipse cx="13" cy="9.5" rx="7" ry="3.6" fill="#fff" opacity=".28"/>' +
        '<circle cx="16" cy="9.4" r="2" fill="#fff"/><path d="M13.4 13.5h4v9h2v2.2h-6.8v-2.2h2v-6.8h-1.2z" fill="#fff"/>');
    },
    warn: function () {
      return svg('<defs>' + lg('dxw-g', [['#FFE97A'], ['#FFD83C', .4], ['#F2A900']]) + '</defs>' +
        '<path d="M16 3.5L29.5 27.5h-27z" fill="url(#dxw-g)" stroke="#8A5A00" stroke-linejoin="round"/><path d="M16 6.5L5.8 25" stroke="#fff" stroke-opacity=".55"/>' +
        '<path d="M14.4 11h3.2l-.6 9h-2z" fill="#000"/><circle cx="16" cy="23.2" r="1.7" fill="#000"/>');
    },
    error: function () {
      return svg('<defs>' + rg('dxe-g', [['#FFA08A', 0], ['#F0563A', .5], ['#B8200A', 1]], .35, .3, .8) + '</defs>' +
        '<circle cx="16" cy="16" r="13" fill="url(#dxe-g)" stroke="#7A1404" stroke-opacity=".6"/><ellipse cx="13" cy="9.5" rx="7" ry="3.6" fill="#fff" opacity=".28"/>' +
        '<path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>');
    },
    question: function () {
      return svg('<defs>' + rg('dxq-g', [['#7FB4FA', 0], ['#2F74E8', .55], ['#0B3FAE', 1]], .35, .3, .8) + '</defs>' +
        '<path d="M16 3a13 12 0 1 1-7.4 21.8L3.5 28l2-5.6A13 12 0 0 1 16 3z" fill="url(#dxq-g)" stroke="#0A246A" stroke-opacity=".6"/>' +
        '<path d="M12.4 11.6c.4-2.4 2-3.4 3.8-3.4 2.3 0 3.8 1.4 3.8 3.2 0 2.5-3.3 2.7-3.3 5.3" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="16.7" cy="20.6" r="1.6" fill="#fff"/>');
    },
    speaker: function (muted, level) {
      var arcs = muted ? '<circle cx="24" cy="22" r="5.5" fill="#fff" stroke="#E2603E" stroke-width="2"/><path d="M20.2 25.8l7.6-7.6" stroke="#E2603E" stroke-width="2"/>'
        : '<path d="M19.5 11.5a6 6 0 0 1 0 9" fill="none" stroke="#BFE0FF" stroke-width="2.2" stroke-linecap="round"/>' + (level > .4 ? '<path d="M23 8a11 11 0 0 1 0 16" fill="none" stroke="#BFE0FF" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>' : '');
      return svg('<defs>' + lg('dxv-g', [['#F2F4F7'], ['#8A94A4']]) + '</defs><path d="M4.5 12.5h5l6-5.5v18l-6-5.5h-5z" fill="url(#dxv-g)" stroke="#3C4656" stroke-linejoin="round"/>' + arcs);
    },
    gamepad: function () {
      return svg('<defs>' + lg('dxg-g', [['#F59B80'], ['#E2603E', .5], ['#A82B10']]) + '</defs>' +
        '<path d="M9 9.5h14c3.5 0 5.5 3 6 7l.8 6c.3 2.6-2.6 4-4.4 2.2L22 21h-12l-3.4 3.7C4.8 26.5 1.9 25.1 2.2 22.5l.8-6c.5-4 2.5-7 6-7z" fill="url(#dxg-g)" stroke="#7A1E08" stroke-opacity=".85"/>' +
        '<path d="M9.5 13v6M6.5 16h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="21.5" cy="14.5" r="1.6" fill="#fff"/><circle cx="24.5" cy="17.5" r="1.6" fill="#FFD83C"/>');
    },
    swords: function () {
      return svg('<defs>' + lg('dxw-s', [['#F2F4F7'], ['#8A94A4']], 0, 0, 1, 1) + '</defs>' +
        '<path d="M5 4l15 15-2 2L3 6V4z" fill="url(#dxw-s)" stroke="#3C4656" stroke-linejoin="round"/><path d="M27 4L12 19l2 2L29 6V4z" fill="url(#dxw-s)" stroke="#3C4656" stroke-linejoin="round"/>' +
        '<path d="M16 21l-6 6M10 21l-3 1M16 21l6 6M22 21l3 1" stroke="#A82B10" stroke-width="2.6" stroke-linecap="round"/>');
    },
    crosshair: function () {
      return svg('<circle cx="16" cy="16" r="10" fill="none" stroke="#5DD35A" stroke-width="2.4"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8" stroke="#5DD35A" stroke-width="2.4"/><circle cx="16" cy="16" r="1.8" fill="#E2603E"/>');
    },
    showDesktop: function () {
      return svg('<defs>' + lg('dxk-g', [['#8DC2F7'], ['#CFE8FB']]) + '</defs><rect x="3.5" y="6.5" width="25" height="17" rx="1" fill="url(#dxk-g)" stroke="#0B3FAE"/><path d="M4 19c6-4 13-4.6 24-.8v4.8H4z" fill="#6CC23E"/><path d="M8 26.5h16" stroke="#fff" stroke-width="2"/><rect x="6" y="9" width="3" height="3" fill="#fff" stroke="#9AA9C4" stroke-width=".6"/>');
    },
    taskmgr: function () {
      return svg('<rect x="4.5" y="5.5" width="23" height="20" rx="1.5" fill="#101418" stroke="#6C7684"/><path d="M5 11h22M5 16h22M5 21h22M11 6v19M17 6v19M23 6v19" stroke="#1E6E2A" stroke-width=".7"/>' +
        '<path d="M5 20l4-4 3 2 4-7 3 5 3-3 5 2" fill="none" stroke="#5DD35A" stroke-width="1.8" stroke-linejoin="round"/>');
    },
    window: function () {
      return svg('<defs>' + lg('dxn-g', [['#4E98F8'], ['#1464E4']]) + '</defs>' + SHADOW +
        '<rect x="4.5" y="5.5" width="23" height="20" rx="1.5" fill="#fff" stroke="#6C7684" stroke-opacity=".85"/><rect x="4.5" y="5.5" width="23" height="5" rx="1.5" fill="url(#dxn-g)"/><path d="M7.5 14.5h11M7.5 17.5h15M7.5 20.5h9" stroke="#9AA9C4"/>');
    },
    laptop: function () {
      return svg('<rect x="6.5" y="7.5" width="19" height="13" rx="1" fill="#4E98F8" stroke="#E8EEF8" stroke-width="1.4"/><path d="M9 11.5h8M9 14h11M9 16.5h6" stroke="#fff" stroke-width="1.2"/><path d="M3 22.5h26l-2 3H5z" fill="#E8EEF8"/>');
    },
    moon: function () { return svg('<path d="M20 4.5a11 11 0 1 0 8 16A9.5 9.5 0 0 1 20 4.5z" fill="#F4F1DC" stroke="#8FA6E4"/><circle cx="25" cy="6" r="1" fill="#fff"/><circle cx="28" cy="11" r=".7" fill="#fff"/>'); },
    sun: function () {
      return svg('<circle cx="16" cy="16" r="6" fill="#FFD83C" stroke="#F7941D"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" stroke="#FFE680" stroke-width="2.2" stroke-linecap="round"/>');
    },
    programs: function () {
      return svg('<defs>' + lg('dxp-f', [['#FFE48A'], ['#F9C835']]) + '</defs><path d="M3.5 8.5c0-.8.6-1.5 1.5-1.5h7l2 2h13c.8 0 1.5.7 1.5 1.5v15c0 .8-.7 1.5-1.5 1.5H5c-.9 0-1.5-.7-1.5-1.5z" fill="#D99A12"/><path d="M3.5 12.5h25v13c0 .8-.7 1.5-1.5 1.5H5c-.9 0-1.5-.7-1.5-1.5z" fill="url(#dxp-f)"/><rect x="12" y="15" width="8" height="8" rx="1" fill="#3C8CF5" stroke="#1450C8"/>');
    }
  };
  /* Windows XP bitmaps replace the drawn icons wherever the set has one (wrapped in <svg> so all sizing rules still apply) */
  /* An icon that has an original 16 px version (XP_ICO[key + '16']) carries both bitmaps: the 32 px one (class xi32) shows by default,
     the 16 px one (class xi16) in the 16 px slots listed in xp.css. A key with only a 16 px original is used as is. */
  function xImg(src, cls, pixel) { return '<image' + (cls ? ' class="' + cls + '"' : '') + ' href="' + src + '" width="32" height="32"' + (pixel ? ' style="image-rendering:pixelated"' : '') + '/>'; }
  function bmp(key, pixel) {
    var I = window.XP_ICO || {}, src = I[key], s16 = I[key + '16'];
    if (!src) src = I[key + '16'], s16 = null;
    if (!src) return null;
    return svg(s16 ? xImg(src, 'xi32', pixel) + xImg(s16, 'xi16') : xImg(src, '', pixel));
  }
  /* two-state bitmap (normal / hot) for buttons drawn by the theme: the hot one (class xh) shows on hover, see xp.css */
  function bmpHot(key) {
    var I = window.XP_ICO || {};
    return I[key] ? svg(xImg(I[key], 'xn') + (I[key + 'Hot'] ? xImg(I[key + 'Hot'], 'xh') : '')) : null;
  }
  (function () {
    var map = { logo: 'logo', avatar: 'avatar', computer: 'computer', display: 'computer', folder: 'folder', doc: 'rtf', recycle: 'recycle', help: 'help',
      run: 'run', settings: 'settings', key: 'key', power: 'power', error: 'error', programs: 'programs',
      info: 'info', warn: 'warn', question: 'question', window: 'window', showDesktop: 'showdesk', laptop: 'laptop', gamepad: 'gamepad',
      swords: 'gamepad', crosshair: 'gamepad', moon: 'ginaStandby', sun: 'tree' };
    Object.keys(map).forEach(function (k) { var b = bmp(map[k]); if (b) ICON[k] = function () { return b; }; });
    var hot = { moonG: 'ginaStandby', restartG: 'ginaRestart', ginaOff: 'ginaOff', ginaLogoff: 'ginaLogoff', ginaSwitch: 'ginaSwitch', smLogoff: 'smLogoff', smOff: 'smOff' };
    Object.keys(hot).forEach(function (k) { var b = bmpHot(hot[k]); if (b) ICON[k] = function () { return b; }; });
    var vol = bmp('volume'), mute = bmp('mute');
    if (vol && mute) ICON.speaker = function (muted) { return muted ? mute : vol; };
  })();
  /* theme bitmaps (caption buttons, scroll bars, check boxes, tabs...) reach the stylesheets as custom properties: .xp { --xpi-<key>: url(data:...) } */
  (function () {
    var I = window.XP_ICO, d = window.document;
    if (!I || !d || !d.head || d.getElementById('xp-ico-css')) return;
    var css = Object.keys(I).filter(function (k) { return /^(cap|sb|cb|combo|menuCheck|tab|prog|tree[PM]|btn|allProg|tp[CE]|startBtn)/.test(k); })
      .map(function (k) { return '--xpi-' + k + ':url("' + I[k] + '")'; }).join(';');
    var st = d.createElement('style'); st.id = 'xp-ico-css'; st.textContent = '.xp{' + css + '}';
    d.head.appendChild(st);
  })();
  function gameIcon(kind) { if (kind === 'saver') return ICON.logo(); if (kind === 'term') return bmp('cmd', true) || ICON.window(); return kind === 'dota' ? ICON.swords() : kind === 'cs' ? ICON.crosshair() : ICON.gamepad(); }
  function statusIcon(st) { return st === 'work' ? ICON.laptop() : st === 'play' ? ICON.gamepad() : st === 'sleep' ? ICON.moon() : ICON.sun(); }
  var STATUS_DOT = { work: '#5DD35A', play: '#FFB81C', sleep: '#8FA6E4', outside: '#4FC0FA' };

  /* =========================================================== wallpapers (inline SVG, 1600x1000, anchored bottom) */
  function bez(p0, p1, p2, p3, t) { var u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; }
  function nearCrest(x) { // y of the near hill crest at x (two cubic segments)
    var segs = [[0, 760, 300, 640, 620, 610, 900, 700], [900, 700, 1180, 790, 1380, 860, 1600, 740]];
    var s = x < 900 ? segs[0] : segs[1], lo = 0, hi = 1;
    for (var i = 0; i < 18; i++) { var m = (lo + hi) / 2; if (bez(s[0], s[2], s[4], s[6], m) < x) lo = m; else hi = m; }
    return bez(s[1], s[3], s[5], s[7], lo);
  }
  var rnd = (function () { var seed = 7; return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; })();
  function resetRnd() { rnd = (function () { var seed = 7; return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; })(); }
  function stars(n, maxY, tw) {
    var s = '';
    for (var i = 0; i < n; i++) {
      s += '<circle' + (i < tw ? ' class="xp-twinkle" ' : ' ') + 'cx="' + (rnd() * 1600).toFixed(0) + '" cy="' + (rnd() * maxY).toFixed(0) + '" r="' + (0.6 + rnd()).toFixed(2) + '" fill="#fff" opacity="' + (0.4 + rnd() * 0.6).toFixed(2) + '"/>';
    }
    return s;
  }
  function wallHill(tod) {
    resetRnd();
    var sky = tod === 'night' ? [['#050B24', 0], ['#0E1C4A', .55], ['#1E3A78', 1]]
      : tod === 'dusk' ? [['#2B3C8C', 0], ['#8A4FA3', .4], ['#F0845A', .75], ['#FFD08A', 1]]
        : [['#2C6FD6', 0], ['#4E93EA', .35], ['#8DC2F7', .65], ['#CFE8FB', 1]];
    var cloudFill = tod === 'dusk' ? '#FFC9A3' : tod === 'night' ? '#8FA6E4' : '#FFFFFF';
    var cloudUnder = tod === 'dusk' ? '#B86A8E' : tod === 'night' ? '#5A6E9E' : '#DCEBFA';
    var cloudOp = tod === 'night' ? .25 : .92;
    var far = tod === 'night' ? [['#1A5236'], ['#12402A', .5], ['#0A2A1E']] : [['#7CCB4A'], ['#57AE38', .45], ['#3A8E2C']];
    var near = tod === 'night' ? [['#1C5A34'], ['#12402A', .5], ['#0A2A1E']] : [['#A6E05A'], ['#6CC23E', .35], ['#3F9A2E', .75], ['#2B7A26']];
    var d = '<defs>' + lg('xw-sky', sky, 0, 0, 0, 1).replace('<linearGradient', '<linearGradient gradientUnits="userSpaceOnUse"').replace('x2="0" y2="1"', 'x2="0" y2="620"') +
      lg('xw-sea', tod === 'night' ? [['#10275A'], ['#1E3A78']] : tod === 'dusk' ? [['#7A5FA8'], ['#F0A07A']] : [['#2E86C9'], ['#62B6E6']]) +
      lg('xw-far', far) + lg('xw-near', near, 0, .41, 1, .59) +
      '<filter id="xw-b6" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>' +
      '<filter id="xw-b30" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="30"/></filter>' +
      '<filter id="xw-b40" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="40"/></filter>' +
      '<clipPath id="xw-nearclip"><path d="M0,760 C300,640 620,610 900,700 S1380,860 1600,740 L1600,1000 L0,1000 Z"/></clipPath>' +
      '<clipPath id="xw-hills"><path d="M0,640 C260,560 520,585 800,640 S1320,720 1600,600 L1600,1000 L0,1000 Z"/></clipPath></defs>';
    d += '<rect width="1600" height="1000" fill="url(#xw-sky)"/>';
    if (tod === 'night') {
      d += stars(70, 560, 8) + '<circle cx="1310" cy="170" r="34" fill="#F4F1DC"/><circle cx="1324" cy="160" r="30" fill="#0B1838" opacity=".92"/>';
    }
    if (tod === 'dusk') d += '<circle cx="1240" cy="590" r="70" fill="#FFE3A0" opacity=".35" filter="url(#xw-b30)"/><circle cx="1240" cy="590" r="46" fill="#FFE3A0"/>';
    if (tod === 'day') d += '<circle cx="250" cy="120" r="160" fill="#fff" opacity=".18" filter="url(#xw-b40)"/>';
    var clouds = [[220, 170], [640, 90], [1010, 230], [1380, 140], [1560, 330]];
    d += '<g opacity="' + cloudOp + '" filter="url(#xw-b6)">';
    clouds.forEach(function (c, i) {
      var g = '', n = 4 + (i % 3);
      for (var k = 0; k < n; k++) {
        var rx = 60 + rnd() * 100, ry = 22 + rnd() * 26, ox = (k - n / 2) * 52 + rnd() * 20, oy = (rnd() - .5) * 24;
        g += '<ellipse cx="' + (c[0] + ox).toFixed(0) + '" cy="' + (c[1] + oy + 6).toFixed(0) + '" rx="' + rx.toFixed(0) + '" ry="' + ry.toFixed(0) + '" fill="' + cloudUnder + '"/>';
        g += '<ellipse cx="' + (c[0] + ox).toFixed(0) + '" cy="' + (c[1] + oy).toFixed(0) + '" rx="' + rx.toFixed(0) + '" ry="' + ry.toFixed(0) + '" fill="' + cloudFill + '"/>';
      }
      d += '<g class="xp-cloud' + (i % 2 ? ' xp-cloud--b' : '') + '">' + g + '</g>';
    });
    d += '</g>';
    // sea sliver behind the hills, with two karst islands and a longtail boat
    d += '<rect y="596" width="1600" height="404" fill="url(#xw-sea)"/><path d="M0 596.5H1600" stroke="#E8F6FF" stroke-opacity=".4"/>';
    var isl = tod === 'night' ? '#163252' : tod === 'dusk' ? '#5A3E6E' : '#4E8FA8';
    d += '<path d="M1157 618c2-14 8-22 23-22s21 8 23 22z" fill="' + isl + '"/><path d="M1275 618c1-9 6-15 15-15s14 6 15 15z" fill="' + isl + '"/>';
    d += '<g class="xp-boat"><path d="M1000 640h12l-2 2.6h-8.6z" fill="#7A4B2A"/><path d="M1006 640v-7" stroke="#7A4B2A"/><path d="M1006.5 634l4 4h-4z" fill="#F4F1DC" opacity=".8"/></g>';
    // far hill + palm on its crest
    d += '<path d="M0,640 C260,560 520,585 800,640 S1320,720 1600,600 L1600,1000 L0,1000 Z" fill="url(#xw-far)"/>';
    var pc = tod === 'night' ? '#0A2216' : '#2B6A2A';
    d += '<g fill="none" stroke="' + pc + '" stroke-linecap="round"><path d="M1120 690c1-14 3-26 9-36" stroke-width="3"/><path d="M1129 654c-8-5-18-4-23 2M1129 654c-4-8-12-12-20-10M1129 654c3-8 11-11 19-8M1129 654c8-1 15 3 18 10M1129 654c-6 3-9 9-9 16M1129 654c5 4 8 9 8 15" stroke-width="2.2"/></g>';
    // near hill with light sweep, shadow band, grass tufts
    d += '<path d="M0,760 C300,640 620,610 900,700 S1380,860 1600,740 L1600,1000 L0,1000 Z" fill="url(#xw-near)"/>';
    d += '<g clip-path="url(#xw-nearclip)"><ellipse cx="520" cy="720" rx="520" ry="120" fill="' + (tod === 'night' ? '#4E7FA8' : '#E8FF9A') + '" opacity="' + (tod === 'night' ? .12 : .28) + '" filter="url(#xw-b30)"/>' +
      '<ellipse cx="1250" cy="880" rx="480" ry="110" fill="#1E5E22" opacity=".3" filter="url(#xw-b40)"/>';
    if (tod === 'dusk') d += '<rect width="1600" height="1000" fill="#7A4A6A" opacity=".35"/>';
    d += '</g>';
    if (tod === 'dusk') d += '<g clip-path="url(#xw-hills)"><rect y="560" width="1600" height="440" fill="#7A4A6A" opacity=".2"/></g>';
    var tufts = '';
    for (var i = 0; i < 40; i++) {
      var x = 20 + i * 39 + rnd() * 12, y = nearCrest(x) + 3;
      tufts += 'M' + x.toFixed(0) + ' ' + y.toFixed(0) + 'l-2 -7M' + (x + 3).toFixed(0) + ' ' + y.toFixed(0) + 'l1 -8M' + (x + 6).toFixed(0) + ' ' + y.toFixed(0) + 'l3 -6';
    }
    d += '<path d="' + tufts + '" stroke="' + (tod === 'night' ? '#2E6A3E' : '#8FD650') + '" stroke-width="2" stroke-linecap="round"/>';
    if (tod === 'night') d += '<g class="xp-flies"><circle cx="420" cy="760" r="2.4" fill="#E8FF9A"/><circle cx="760" cy="720" r="2" fill="#E8FF9A"/><circle cx="1320" cy="850" r="2.2" fill="#E8FF9A"/></g>';
    return d;
  }
  function wallAndaman(tod) {
    resetRnd();
    var night = tod === 'night';
    var sky = night ? [['#070B24'], ['#101A44', .5], ['#24305E']] : [['#1B2A6B', 0], ['#6A3D9A', .3], ['#F0695A', .62], ['#FFC46B', .78], ['#FFC46B', 1]];
    var d = '<defs>' + lg('xa-sky', sky) + lg('xa-sea', night ? [['#24305E'], ['#121B44', .5], ['#070B24']] : [['#F2955E'], ['#6A4C93', .45], ['#1D2B5C']]) +
      '<filter id="xa-b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter></defs>';
    d += '<rect width="1600" height="1000" fill="url(#xa-sky)"/>';
    if (night) d += stars(80, 600, 8) + '<circle cx="800" cy="300" r="40" fill="#F4F1DC"/>';
    else d += '<circle cx="800" cy="660" r="220" fill="#FFD27A" opacity=".35" filter="url(#xa-b)"/><circle cx="800" cy="660" r="90" fill="#FFE9B0"/>';
    d += '<rect y="660" width="1600" height="340" fill="url(#xa-sea)"/>';
    for (var i = 0; i < 14; i++) {
      var w = 180 - i * 11.5, y = 672 + i * 16;
      d += '<rect class="xp-shimmer" x="' + (800 - w / 2).toFixed(0) + '" y="' + y + '" width="' + w.toFixed(0) + '" height="' + (3 + i * .3).toFixed(1) + '" rx="2" fill="' + (night ? '#F4F1DC' : '#FFE9B0') + '" opacity="' + (.7 - i * .036).toFixed(2) + '"/>';
    }
    [[260, 220, 110], [1180, 300, 150], [1420, 150, 90]].forEach(function (k) {
      var x = k[0], hgt = k[1], w = k[2], top = 660 - hgt;
      d += '<path d="M' + (x - w / 2) + ' 662C' + (x - w / 2 + 6) + ' ' + (top + 60) + ' ' + (x - w / 2 + 4) + ' ' + top + ' ' + x + ' ' + top + 'S' + (x + w / 2 - 2) + ' ' + (top + 70) + ' ' + (x + w / 2) + ' 662Z" fill="#231A3D"/>';
      d += '<path d="M' + (x - w / 2) + ' 662C' + (x - w / 2 + 6) + ' ' + (top + 60) + ' ' + (x - w / 2 + 4) + ' ' + top + ' ' + x + ' ' + top + '" fill="none" stroke="#F0695A" stroke-opacity="' + (night ? .3 : .9) + '"/>';
    });
    // longtail boat in the foreground
    d += '<g transform="translate(1040 860)"><path d="M0 0h160c-10 14-30 22-60 22H30C14 22 4 12 0 0z" fill="#140F26"/><path d="M150 0c8-10 12-24 10-36" stroke="#140F26" stroke-width="5" fill="none"/>' +
      '<path d="M158 -34c6 4 10 10 12 18M157 -30c7 2 12 7 15 14M156 -27c8 0 13 4 17 9" stroke-width="2" fill="none" stroke="#E33"/><path d="M157 -30c7 2 12 7 15 14" stroke="#FFD23C" stroke-width="2" fill="none"/><path d="M156 -27c8 0 13 4 17 9" stroke="#3A8EE6" stroke-width="2" fill="none"/>' +
      '<path d="M20 0l-16 30" stroke="#140F26" stroke-width="3"/></g>';
    return d;
  }
  function wallBlueprint() {
    var d = '<defs><pattern id="xb-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#2D63B5"/></pattern>' +
      '<pattern id="xb-major" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200 0H0V200" fill="none" stroke="#3F78CC"/></pattern>' +
      rg('xb-p', [['#FFB81C', 0], ['#FFE680', .45], ['#FFFFFF', 1]], 800, 430, 80, true) + '</defs>';
    d += '<rect width="1600" height="1000" fill="#1B4E9B"/><rect width="1600" height="1000" fill="url(#xb-grid)"/><rect width="1600" height="1000" fill="url(#xb-major)"/>';
    d += '<g fill="none" stroke="#7FB4FA" stroke-opacity=".35" stroke-width="1.5"><path d="M1180 820l180-104 180 104-180 104z"/><path d="M1180 820v-150l180-104v150M1540 820V670l-180-104"/><path d="M1240 786l60-35 60 35-60 35zM1420 786v-60l-40-23"/><path d="M1260 700l40-23v40M1460 760l40 23"/></g>';
    d += '<g opacity=".9">' + petals(800, 430, 5.6, 'xb-p').replace(/stroke-width="[\d.]+"/g, 'stroke-width="2"') + '<circle cx="800" cy="430" r="13" fill="#F7941D"/></g>';
    d += '<text x="800" y="560" text-anchor="middle" font-family="Trebuchet MS, Tahoma, sans-serif" font-size="46" font-weight="bold" font-style="italic" fill="#fff">Windows<tspan dy="-18" font-size="24" fill="#F7941D" font-style="italic">XD</tspan></text>';
    d += '<text x="1570" y="975" text-anchor="end" font-family="Lucida Console, Menlo, monospace" font-size="14" fill="#9CC6FF">PHUKET-PC · 7.88N 98.39E · rev 5.1</text>';
    return d;
  }
  /* the wallpapers Windows XP shipped with; Bliss is inlined, the rest load from wall/<id>.jpg on demand */
  var WALLS = [["bliss", "Безмятежность", "Bliss"], ["ascent", "Восхождение", "Ascent"], ["autumn", "Осень", "Autumn"], ["azul", "Лазурь", "Azul"], ["blue-hills", "Голубые холмы", "Blue hills"], ["crystal", "Кристалл", "Crystal"], ["follow", "Следы", "Follow"], ["friend", "Друг", "Friend"], ["home", "Дом", "Home"], ["moon-flower", "Лунный цветок", "Moon flower"], ["peace", "Мир", "Peace"], ["power", "Мощь", "Power"], ["purple-flower", "Пурпурный цветок", "Purple flower"], ["radiance", "Сияние", "Radiance"], ["red-moon-desert", "Красная луна в пустыне", "Red moon desert"], ["ripple", "Рябь", "Ripple"], ["stonehenge", "Стоунхендж", "Stonehenge"], ["sunset", "Закат", "Sunset"], ["tulips", "Тюльпаны", "Tulips"], ["vortec-space", "Космический вихрь", "Vortec space"], ["water-lilies", "Водяные лилии", "Water lilies"], ["wind", "Ветер", "Wind"], ["winter", "Зима", "Winter"]];
  function wallKnown(id) { return id === 'none' || WALLS.some(function (w) { return w[0] === id; }); }
  function wallLabel(id) { var w = WALLS.filter(function (x) { return x[0] === id; })[0]; return w ? w[S.lang === 'ru' ? 1 : 2] : L('wall_none'); }
  function wallSVG(name, tod) {
    if (name === 'none' || !wallKnown(name)) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true"><rect width="800" height="600" fill="#3A6EA5"/></svg>';
    var src = name === 'bliss' && window.XP_WALL ? window.XP_WALL : ((S.opts && S.opts.wallBase) || 'wall/') + name + '.jpg';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="600" fill="#3A6EA5"/><image href="' + src + '" width="800" height="600"/></svg>';
  }
  function timeOfDay() {
    if (!S.prefs.tint) return 'day';
    var t = phuketTime(), m = t.h * 60 + t.m;
    if (m >= 6 * 60 + 30 && m < 17 * 60 + 30) return 'day';
    if ((m >= 17 * 60 + 30 && m < 19 * 60 + 15) || (m >= 5 * 60 + 30 && m < 6 * 60 + 30)) return 'dusk';
    return 'night';
  }
  function paintWall(force) {
    if (!R.wall) return;
    var tod = timeOfDay(), key = S.prefs.wall + '/' + tod;
    if (!force && R.wall.getAttribute('data-k') === key) return;
    R.wall.setAttribute('data-k', key);
    R.wall.innerHTML = wallSVG(S.prefs.wall, tod);
    R.root.classList.remove('xp--day', 'xp--dusk', 'xp--night');
    R.root.classList.add('xp--' + tod);
  }

  /* =========================================================== time & status */
  function phuketTime() {
    try { if (S.opts.phuketTime) { var t = S.opts.phuketTime(); if (t && t.h != null) return { h: +t.h, m: +t.m || 0 }; } } catch (e) { }
    var d = new Date(Date.now() + 7 * 3600e3);
    return { h: d.getUTCHours(), m: d.getUTCMinutes() };
  }
  function phuketDate() { return new Date(Date.now() + 7 * 3600e3); }
  function status() {
    try { if (S.opts.status) return S.opts.status() || 'work'; } catch (e) { }
    var t = phuketTime().h; return t < 8 ? 'sleep' : t < 19 ? 'work' : t < 23 ? 'play' : 'sleep';
  }
  function clockText() {
    var t = phuketTime(), mm = (t.m < 10 ? '0' : '') + t.m;
    if (S.lang === 'en') { var hh = t.h % 12 || 12; return hh + ':' + mm + ' ' + (t.h < 12 ? 'AM' : 'PM'); }
    return t.h + ':' + mm;
  }
  function dateText() {
    var d = phuketDate();
    try { return d.toLocaleDateString(S.lang === 'en' ? 'en-GB' : 'ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
    catch (e) { return d.toUTCString().slice(0, 16); }
  }

  /* =========================================================== sound (WebAudio synthesis, original motifs) */
  var Snd = (function () {
    var ctx = null, master = null, comp = null, unlocked = false, last = {}, voices = 0, delayBus = null;
    function init() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = level();
      master.connect(comp); comp.connect(ctx.destination);
      // simple feedback delay for the long motifs
      var dl = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
      dl.delayTime.value = .26; fb.gain.value = .28; wet.gain.value = .2;
      dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
      delayBus = dl;
      return ctx;
    }
    function level() { return S.prefs.muted ? 0 : 0.22 * (S.prefs.volume == null ? .8 : S.prefs.volume) / .8; }
    function unlock() {
      if (!init()) return;
      if (ctx.state === 'suspended') ctx.resume();
      unlocked = true;
    }
    function setLevel() { if (master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(level(), ctx.currentTime, .01); } }
    function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
    function out(node, pan, toDelay) {
      var dest = master;
      if (pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(master); if (toDelay) p.connect(delayBus); return; }
      node.connect(dest); if (toDelay) node.connect(delayBus);
    }
    function osc(type, f, t, a, peak, dec, opt) {
      opt = opt || {};
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (opt.glide) o.frequency.exponentialRampToValueAtTime(opt.glide, t + (opt.glideT || dec));
      if (opt.detune) o.detune.value = opt.detune;
      env(g, t, a, peak, dec);
      var node = g;
      o.connect(g);
      if (opt.lp) { var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(opt.lp, t); if (opt.lpTo) f2.frequency.exponentialRampToValueAtTime(opt.lpTo, t + a + dec); g.connect(f2); node = f2; }
      out(node, opt.pan, opt.delay);
      o.start(t); o.stop(t + a + dec + .05);
      voices++; o.onended = function () { voices--; };
    }
    function bell(f, t, peak, dec, opt) {
      opt = opt || {};
      osc('sine', f, t, .004, peak, dec, opt);
      osc('sine', f * 2.01, t, .004, peak * .35, dec * .7, opt);
      osc('sine', f * 3, t, .004, peak * .12, dec * .5, opt);
    }
    function pad(fs, t, attack, hold, rel, peak, opt) {
      fs.forEach(function (f) {
        [-6, 6].forEach(function (dt) {
          var o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
          o.type = 'triangle'; o.frequency.value = f; o.detune.value = dt;
          lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t);
          if (opt && opt.sweep) lp.frequency.exponentialRampToValueAtTime(opt.sweep, t + attack + hold + rel);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak / fs.length, t + attack);
          g.gain.setValueAtTime(peak / fs.length, t + attack + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + rel);
          o.connect(lp); lp.connect(g); out(g, 0, true);
          o.start(t); o.stop(t + attack + hold + rel + .1);
        });
      });
    }
    var noiseBuf = null;
    function noise(t, dur, peak, type, f, q, fTo) {
      if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; bp.type = type || 'bandpass'; bp.frequency.setValueAtTime(f, t); if (fTo) bp.frequency.exponentialRampToValueAtTime(fTo, t + dur); bp.Q.value = q || 1;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + Math.min(.004, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(bp); bp.connect(g); out(g);
      s.start(t, Math.random() * .5); s.stop(t + dur + .02);
    }
    var R = {
      click: function (t) { osc('sine', 1250, t, .002, .35, .026, { glide: 800 }); noise(t, .006, .08, 'bandpass', 3500, 1.2); },
      tick: function (t) { noise(t, .004, .04, 'highpass', 4000, .7); },
      open: function (t) { bell(880, t, .28, .095); bell(1174.7, t + .055, .32, .095); },
      close: function (t) { bell(1174.7, t, .28, .095); bell(880, t + .055, .24, .095, { lp: 2500 }); },
      minimize: function (t) { osc('triangle', 700, t, .005, .26, .185, { glide: 330, glideT: .17 }); osc('sine', 1400, t, .005, .06, .185, { glide: 660, glideT: .17 }); },
      maximize: function (t) { osc('triangle', 330, t, .005, .26, .185, { glide: 740, glideT: .17 }); bell(1174.7, t + .17, .12, .03); },
      error: function (t) {
        [0, .14].forEach(function (dt) { osc('square', 246.9, t + dt, .003, .22, .12, { lp: 900 }); osc('square', 349.2, t + dt, .003, .22, .12, { lp: 900 }); });
        osc('sine', 123.5, t, .005, .18, .2);
      },
      notify: function (t) { bell(740, t, .25, .18, { pan: -.3 }); bell(987.8, t + .11, .3, .3, { pan: .3 }); },
      balloonPop: function (t) { bell(740, t, .2, .16); },
      start: function (t) {
        pad([146.8, 220, 370], t, .6, 1.1, .9, .16);
        [[587.3, .10, .22], [880, .34, .24], [1318.5, .58, .26], [1480, .86, .28]].forEach(function (n) { bell(n[0], t + n[1], n[2], .55, { delay: true }); });
        bell(1760, t + 1.2, .3, 1.2, { delay: true });
        noise(t, 1, .02, 'bandpass', 5000, .8);
      },
      shutdown: function (t) {
        pad([123.5, 185, 293.7], t, .3, .6, .9, .16, { sweep: 400 });
        [[1480, 0, .28], [1318.5, .22, .25], [880, .46, .22], [587.3, .74, .2]].forEach(function (n, i) { bell(n[0], t + n[1], n[2], i === 3 ? 1 : .45, { delay: true }); });
      },
      recycle: function (t) {
        for (var i = 0; i < 5; i++) noise(t + i * .06 + Math.random() * .02, .02 + Math.random() * .025, .05 + Math.random() * .25, 'bandpass', 2200 - i * 300, .9);
        osc('sine', 150, t + .3, .005, .3, .09, { glide: 70 });
      },
      tada: function (t) { [587.3, 740, 880, 1174.7].forEach(function (f, i) { bell(f, t + i * .08, .22, .6, { delay: true }); }); },
      crtOn: function (t) { osc('sine', 60, t, .02, .08, .3); osc('sine', 12000, t, .01, .015, .3, { glide: 200 }); },
      keyclack: function (t) { for (var i = 0; i < 3; i++) noise(t + i * .03 + Math.random() * .01, .012, .06, 'highpass', 2500, .8); }
    };
    function play(name) {
      if (!unlocked || !ctx || S.prefs.muted) return;
      var fn = R[name]; if (!fn) return;
      var n = now(); if (last[name] && n - last[name] < 60) return; last[name] = n;
      if (voices > 40) return;
      if (ctx.state === 'suspended') ctx.resume();
      try { fn(ctx.currentTime + .01); } catch (e) { }
    }
    return { unlock: unlock, play: play, setLevel: setLevel, get ready() { return unlocked; } };
  })();
  function sound(name) { Snd.play(name); }

  /* =========================================================== geometry helpers (root may be CSS-scaled by the room) */
  function rootScale() { var r = R.root.getBoundingClientRect(); return { x: r.width / (R.root.offsetWidth || 1) || 1, y: r.height / (R.root.offsetHeight || 1) || 1, l: r.left, t: r.top }; }
  function localPt(e) { var s = rootScale(); return { x: (e.clientX - s.l) / s.x, y: (e.clientY - s.t) / s.y }; }
  function localRect(el) {
    var s = rootScale(), r = el.getBoundingClientRect();
    return { x: (r.left - s.l) / s.x, y: (r.top - s.t) / s.y, w: r.width / s.x, h: r.height / s.y };
  }
  function work() { return { w: R.desk.clientWidth || S.w, h: R.desk.clientHeight || S.h }; }
  function isPhone() { return S.size === 'phone'; }
  function wordmark(big) { return '<div class="xp-word' + (big ? ' xp-word--big' : '') + '">Windows<sup>XD</sup></div>'; }

  /* =========================================================== tooltip */
  var Tip = (function () {
    var el = null, timer = 0, lastHide = 0, cur = null, hideT = 0;
    function text(t) { var v = t._xpTip || t.getAttribute('data-xp-tip'); return typeof v === 'function' ? v() : v; }
    function show(t, x, y) {
      var s = text(t); if (!s) return;
      hide(true);
      el = h('div', 'xp-tip'); el.textContent = s; R.root.appendChild(el);
      var W = R.root.clientWidth, H = R.root.clientHeight, w = el.offsetWidth, hh = el.offsetHeight;
      var left = clamp(x + 12, 2, W - w - 2), top = y + 18;
      if (top + hh > H - 2) top = y - hh - 6;
      css(el, { left: left, top: top });
      clearTimeout(hideT); hideT = setTimeout(function () { hide(); }, 5000);
    }
    function hide(quiet) { clearTimeout(timer); if (el) { rm(el); el = null; if (!quiet) lastHide = now(); } }
    function over(e) {
      if (S.touch && e.pointerType !== 'mouse') return;
      var t = e.target.closest && e.target.closest('[data-xp-tip]');
      if (t === cur) return;
      cur = t; var wasShown = !!el || now() - lastHide < 400; hide(true); if (wasShown) lastHide = now();
      if (!t) return;
      var p = localPt(e);
      clearTimeout(timer);
      timer = setTimeout(function () { if (cur === t) show(t, p.x, p.y); }, wasShown ? 0 : 600);
    }
    function move(e) { if (!el && cur && timer) { var p = localPt(e); clearTimeout(timer); var t = cur; timer = setTimeout(function () { if (cur === t) show(t, p.x, p.y); }, 600); } }
    return { over: over, move: move, hide: function () { cur = null; hide(); }, set: function (node, v) { node._xpTip = v; node.setAttribute('data-xp-tip', ''); } };
  })();

  /* =========================================================== menus */
  var Menus = [];   // open menu stack
  function closeMenus(from) {
    from = from || 0;
    if (!from) Menus.inside = 0;
    while (Menus.length > from) { var m = Menus.pop(); clearTimeout(m.subT); rm(m.el); if (m.onClose) m.onClose(); }
  }
  function openMenu(items, x, y, opts) {
    opts = opts || {};
    var level = opts.level || 0;
    closeMenus(level);
    if (typeof items === 'function') items = items();
    var m = { items: items, level: level, hot: -1, onClose: opts.onClose, subT: 0 };
    var el = m.el = h('div', 'xp-menu' + (opts.cls ? ' ' + opts.cls : '') + (opts.up ? ' xp--up' : ''));
    el.setAttribute('role', 'menu');
    if (!items.length) el.appendChild(h('div', 'xp-menu__empty', esc(L('emptyMenu'))));
    m.rows = [];
    items.forEach(function (it, i) {
      if (it.sep) { el.appendChild(h('div', 'xp-msep')); m.rows.push(null); return; }
      var cls = 'xp-mi' + (it.bold ? ' xp-mi--bold' : '') + (it.disabled ? ' xp-mi--dis' : '') + (it.sub ? ' xp-mi--sub' : '') + (it.check ? ' xp-mi--check' : '');
      var row = h('div', cls, '<span class="xp-mi__ic">' + (it.icon || '') + '</span><span class="xp-mi__t">' + esc(it.label) + '</span>');
      row.setAttribute('role', 'menuitem');
      row.addEventListener('pointerenter', function () { keepParents(m); setHot(m, i, true); });
      row.addEventListener('click', function (e) { e.stopPropagation(); activate(m, i); });
      el.appendChild(row); m.rows.push(row);
    });
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    el.addEventListener('pointerenter', function () { Menus.inside = (Menus.inside || 0) + 1; keepParents(m); });
    el.addEventListener('pointerleave', function () { Menus.inside = Math.max(0, (Menus.inside || 0) - 1); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    R.root.appendChild(el);
    var W = R.root.clientWidth, H = R.root.clientHeight, w = el.offsetWidth, hh = el.offsetHeight;
    var left = x, top = y;
    if (opts.anchor) { // submenu: to the right of the parent row, flip left if needed
      var a = opts.anchor; left = a.x + a.w - 3; top = opts.alignBottom ? a.y + a.h - hh + 3 : a.y - 3;
      if (left + w > W) left = Math.max(0, a.x - w + 3);
    } else if (left + w > W) left = Math.max(0, left - w);
    if (top + hh > H) top = Math.max(0, opts.up ? H - hh : top - hh);
    if (opts.bottomSheet) { left = 0; top = H - S.tbH - hh; css(el, { width: W, maxWidth: W }); }
    css(el, { left: clamp(left, 0, Math.max(0, W - w)), top: clamp(top, 0, Math.max(0, H - hh)) });
    Menus.push(m);
    if (opts.keyboard) setHot(m, nextRow(m, -1, 1));
    sound(level ? 'tick' : 'click');
    return m;
  }
  // The pointer reached menu `m`: every menu above it must stay open. Crossing sibling rows on the way to a submenu
  // starts their "close the submenu" timers; cancel them and put the highlight back on the row that owns the submenu.
  function keepParents(m) {
    var idx = Menus.indexOf(m);
    for (var k = idx; k > 0; k--) {
      var child = Menus[k], parent = Menus[k - 1];
      clearTimeout(parent.subT);
      if (child.from != null && parent.hot !== child.from) {
        if (parent.hot >= 0 && parent.rows[parent.hot]) parent.rows[parent.hot].classList.remove('xp--hot');
        parent.hot = child.from;
        if (parent.rows[parent.hot]) parent.rows[parent.hot].classList.add('xp--hot');
      }
    }
  }
  function nextRow(m, from, dir) {
    var n = m.rows.length; if (!n) return -1;
    for (var k = 1; k <= n; k++) { var i = (from + dir * k + n * 4) % n; if (m.rows[i] && !m.items[i].disabled) return i; }
    return -1;
  }
  function setHot(m, i, fromHover) {
    if (m.hot >= 0 && m.rows[m.hot]) m.rows[m.hot].classList.remove('xp--hot');
    m.hot = i;
    var idx = Menus.indexOf(m);
    clearTimeout(m.subT);
    if (i < 0 || !m.rows[i]) return;
    m.rows[i].classList.add('xp--hot');
    var it = m.items[i];
    if (fromHover) {
      if (it.sub && !it.disabled) m.subT = setTimeout(function () { openSub(m, i); }, 280);
      else if (Menus.length > idx + 1) m.subT = setTimeout(function () { closeMenus(idx + 1); }, 280);
    }
  }
  function openSub(m, i, kb) {
    var it = m.items[i], idx = Menus.indexOf(m);
    if (idx < 0) return;
    if (Menus[idx + 1] && Menus[idx + 1].from === i) return;
    var sub = openMenu(typeof it.sub === 'function' ? it.sub() : it.sub, 0, 0, { level: idx + 1, anchor: localRect(m.rows[i]), cls: m.el.classList.contains('xp-menu--prog') ? 'xp-menu--prog' : '', keyboard: kb });
    sub.from = i;
  }
  function activate(m, i) {
    var it = m.items[i]; if (!it || it.disabled) return;
    if (it.sub) { openSub(m, i, true); return; }
    var row = m.rows[i];
    // the era-true double blink before the menu goes away
    var blinks = reduced() ? 0 : 2, k = 0;
    (function blink() {
      if (k < blinks * 2) { row.classList.toggle('xp--hot'); k++; setTimeout(blink, 40); return; }
      closeMenus(0); closeStart(true);
      if (it.onClick) it.onClick();
    })();
  }
  function menuKey(e) {
    var m = Menus[Menus.length - 1]; if (!m) return false;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') { setHot(m, nextRow(m, m.hot, k === 'ArrowDown' ? 1 : -1)); return true; }
    if (k === 'ArrowRight') { if (m.hot >= 0 && m.items[m.hot].sub) openSub(m, m.hot, true); return true; }
    if (k === 'ArrowLeft' || k === 'Escape') { closeMenus(Menus.length - 1); return true; }
    if (k === 'Enter' || k === ' ') { if (m.hot >= 0) activate(m, m.hot); return true; }
    if (k.length === 1) {
      var ch = k.toLowerCase();
      for (var j = 1; j <= m.items.length; j++) { var i = (m.hot + j) % m.items.length; var it = m.items[i]; if (it && it.label && !it.disabled && it.label.toLowerCase()[0] === ch) { setHot(m, i); return true; } }
      return true;
    }
    return false;
  }

  /* =========================================================== balloon tips */
  var Balloon = (function () {
    var q = [], cur = null;
    function show(o) { q.push(o); if (!cur) next(); }
    function next() {
      var o = q.shift(); if (!o || !R.root) { cur = null; return; }
      var ic = o.icon === 'warn' ? ICON.warn() : o.icon === 'error' ? ICON.error() : o.icon === 'none' ? '' : ICON.info();
      var el = h('div', 'xp-balloon', '<div class="xp-balloon__t">' + ic + '<span>' + esc(tr(o.title)) + '</span></div><div class="xp-balloon__b">' + esc(tr(o.text)) + '</div><button class="xp-balloon__x" aria-label="' + esc(L('close')) + '"></button>');
      R.root.appendChild(el);
      var t0 = 0, left = o.timeout || 8000, paused = false, sx = null;
      cur = { el: el };
      function close() { if (!cur || cur.el !== el) return; clearTimeout(t0); el.classList.add('xp--out'); setTimeout(function () { rm(el); cur = null; next(); }, D(400)); }
      function arm() { clearTimeout(t0); t0 = setTimeout(close, left); }
      el.addEventListener('pointerenter', function () { paused = true; clearTimeout(t0); });
      el.addEventListener('pointerleave', function () { if (paused) { paused = false; left = 3000; arm(); } });
      el.querySelector('.xp-balloon__x').addEventListener('click', function (e) { e.stopPropagation(); close(); });
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); sx = localPt(e).x; });
      el.addEventListener('pointerup', function (e) {
        if (sx != null && localPt(e).x - sx > 60) { close(); sx = null; return; }
        sx = null;
        if (e.target.closest('.xp-balloon__x')) return;
        if (o.onClick) o.onClick(); close();
      });
      cur.close = close;
      sound('notify'); arm();
    }
    function clear() { q = []; if (cur) { rm(cur.el); cur = null; } }
    return { show: show, clear: clear };
  })();

  /* =========================================================== window manager */
  var TB = { tbH: 30 };
  function zSort() {
    S.wins.sort(function (a, b) { return (a.modalRank - b.modalRank) || (a.zo - b.zo); });
    S.wins.forEach(function (w, i) { w.el.style.zIndex = w.o.cover && w.state !== 'min' ? 8000 : 100 + i * 2; });
  }
  var zCounter = 0;
  function setActive(w) {
    if (w && w.closed) w = null;
    S.active = w;
    S.wins.forEach(function (x) { x.el.classList.toggle('xp--inactive', x !== w); if (x.task) x.task.classList.toggle('xp--on', x === w && x.state !== 'min'); });
    if (w && w.task) stopFlash(w);
    if (R.desk) R.desk.classList.toggle('xp--blur', !!w);
  }
  function topWindow(excl) {
    for (var i = S.wins.length - 1; i >= 0; i--) { var w = S.wins[i]; if (w !== excl && w.state !== 'min' && !w.closed) return w; }
    return null;
  }
  function cascadePos(w, hgt) {
    var W = work(), step = S.size === 'compact' ? 16 : 22;
    var n = S.wins.filter(function (x) { return !x.closed && x.kind === 'app'; }).length;
    var maxN = Math.max(1, Math.floor(Math.min((W.w - w) / step, (W.h - hgt) / step)));
    var k = n % (maxN + 1);
    return { x: Math.max(0, (W.w >= 900 ? 110 : 40) + k * step - (W.w < 700 ? 30 : 0)), y: Math.max(0, 24 + k * step - (W.h < 500 ? 16 : 0)) };
  }

  function Win(o) {
    var w = this;
    w.o = o; w.id = 'w' + (++S.seq); w.kind = o.kind || 'app'; w.app = o.app || null;
    w.state = 'normal'; w.closed = false; w.langCbs = []; w.zo = ++zCounter; w.modalRank = o.modal ? 1 : 0;
    w.resizable = o.resizable !== false && w.kind === 'app';
    var el = w.el = h('div', 'xp-win xp--inactive' + (w.resizable ? '' : ' xp--fixed') + (o.frameless ? ' xp--frameless' : '') + (w.kind === 'dialog' ? ' xp-win--dialog' : ''));
    el.setAttribute('role', w.kind === 'dialog' ? 'alertdialog' : 'dialog');
    el.tabIndex = -1;
    var btns = '';
    if (w.kind !== 'dialog' && o.minimizable !== false) btns += '<button class="xp-tbtn xp-tbtn--min" data-a="min" tabindex="-1"></button>';
    if (w.resizable && o.maximizable !== false) btns += '<button class="xp-tbtn xp-tbtn--max" data-a="max" tabindex="-1"></button>';
    if (o.help) btns += '<button class="xp-tbtn xp-tbtn--help" data-a="help" tabindex="-1"></button>';
    btns += '<button class="xp-tbtn xp-tbtn--close" data-a="close" tabindex="-1"></button>';
    el.innerHTML = (o.frameless ? '' : '<div class="xp-win__title"><span class="xp-win__icon"></span><span class="xp-win__text"></span><span class="xp-win__btns">' + btns + '</span></div>') +
      '<div class="xp-win__body"></div><div class="xp-win__shield"></div>' +
      (w.resizable ? '<i class="xp-grip xp-grip--n" data-d="n"></i><i class="xp-grip xp-grip--s" data-d="s"></i><i class="xp-grip xp-grip--e" data-d="e"></i><i class="xp-grip xp-grip--w" data-d="w"></i><i class="xp-grip xp-grip--ne" data-d="ne"></i><i class="xp-grip xp-grip--nw" data-d="nw"></i><i class="xp-grip xp-grip--se" data-d="se"></i><i class="xp-grip xp-grip--sw" data-d="sw"></i>' : '');
    w.body = el.querySelector('.xp-win__body');
    w.titleEl = el.querySelector('.xp-win__title');
    w.textEl = el.querySelector('.xp-win__text');
    w.iconEl = el.querySelector('.xp-win__icon');
    w.title = o.title; w.icon = o.icon || ICON.window();
    if (w.iconEl) w.iconEl.innerHTML = w.icon;
    w.renderTitle();
    // geometry
    var W = work();
    var ww = Math.min(o.w || 480, W.w - (S.size === 'compact' ? 24 : 8)), hh = Math.min(o.h || 340, W.h - 8);
    w.minW = Math.min(o.minW || 200, ww); w.minH = Math.min(o.minH || 120, hh);
    var p = o.center ? null : cascadePos(ww, hh);
    if (o.center) {
      var ref = o.owner && !o.owner.closed && o.owner.state !== 'min' ? o.owner.rect : { x: 0, y: 0, w: W.w, h: W.h };
      p = { x: ref.x + (ref.w - ww) / 2, y: ref.y + (ref.h - hh) / 2 };
    }
    w.rect = { x: Math.round(clamp(p.x, 0, Math.max(0, W.w - ww))), y: Math.round(clamp(p.y, 0, Math.max(0, W.h - hh))), w: ww, h: hh };
    w.applyRect();
    R.wins.appendChild(el);
    if (o.autoSize) { // dialogs size to content
      css(el, { width: 'auto', height: 'auto' });
      var rr = { w: Math.min(el.offsetWidth, W.w - 16), h: Math.min(el.offsetHeight, W.h - 16) };
      var ref2 = o.owner && !o.owner.closed && o.owner.state !== 'min' ? o.owner.rect : { x: 0, y: 0, w: W.w, h: W.h };
      w.rect = { x: Math.round(clamp(ref2.x + (ref2.w - rr.w) / 2, 0, W.w - rr.w)), y: Math.round(clamp(ref2.y + (ref2.h - rr.h) / 2, 0, W.h - rr.h)), w: rr.w, h: rr.h };
      w.applyRect();
    }
    if (o.cover) { el.classList.add('xp--cover'); }
    else if (isPhone() && w.kind === 'app') { w.prev = Object.assign({}, w.rect); w.state = 'max'; w.autoMax = true; el.classList.add('xp--max'); }
    else if (o.maximized && w.resizable) { w.prev = Object.assign({}, w.rect); w.state = 'max'; el.classList.add('xp--max'); }
    w.syncMaxBtn();
    S.wins.push(w);
    zSort();
    if (!o.noTask) w.makeTask();
    w.wire();
  }
  Win.prototype.renderTitle = function () {
    var t = this.customTitle != null ? this.customTitle : tr(this.title);
    if (this.textEl) this.textEl.textContent = t;
    if (this.task) { this.task.querySelector('span').textContent = t; }
    this.el.setAttribute('aria-label', t);
  };
  Win.prototype.titleText = function () { return this.customTitle != null ? this.customTitle : tr(this.title); };
  Win.prototype.applyRect = function () {
    if (this.state === 'max' || this.o.cover) { css(this.el, { left: '', top: '', width: '', height: '' }); return; }
    css(this.el, { left: this.rect.x, top: this.rect.y, width: this.rect.w, height: this.rect.h });
  };
  Win.prototype.syncMaxBtn = function () {
    var b = this.el.querySelector('.xp-tbtn--max'); if (!b) return;
    b.classList.toggle('xp--restore', this.state === 'max');
    Tip.set(b, function () { return this.state === 'max' ? L('restore') : L('maximize'); }.bind(this));
  };
  Win.prototype.makeTask = function () {
    var w = this, b = h('button', 'xp-task xp--appear', w.icon + '<span></span>');
    b.tabIndex = -1;
    b.querySelector('span').textContent = w.titleText();
    Tip.set(b, function () { return w.titleText(); });
    b.addEventListener('click', function () {
      if (S.modalBlock && w.blockedBy) { w.blockedBy.focus(); w.blockedBy.flashTitle(); return; }
      if (w.state === 'min') w.restore();
      else if (S.active === w) w.minimize();
      else w.focus();
    });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); var r = localRect(b); w.focus(true); w.sysMenu(r.x, r.y, true); });
    w.task = b; R.tasks.appendChild(b);
    setTimeout(function () { b.classList.remove('xp--appear'); }, 300);
  };
  Win.prototype.wire = function () {
    var w = this, el = w.el;
    el.addEventListener('pointerdown', function () { if (!w.closed) w.focus(); }, true);
    if (w.titleEl) {
      w.titleEl.addEventListener('pointerdown', function (e) { titleDown(w, e); });
      w.titleEl.addEventListener('contextmenu', function (e) { e.preventDefault(); var p = localPt(e); w.sysMenu(p.x, p.y); });
      w.iconEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); w.focus(); });
      w.iconEl.addEventListener('click', function (e) {
        e.stopPropagation();
        var t = now(); if (w._icT && t - w._icT < 450) { closeMenus(0); w.close(); return; } w._icT = t;
        var r = localRect(w.iconEl); w.sysMenu(r.x - 2, r.y + r.h + 4);
      });
      Array.prototype.forEach.call(el.querySelectorAll('.xp-tbtn'), function (b) {
        Tip.set(b, b._xpTip || (b.dataset.a === 'min' ? function () { return L('minimize'); } : b.dataset.a === 'close' ? function () { return L('close'); } : function () { return L('help'); }));
        b.addEventListener('pointerdown', function (e) { e.stopPropagation(); w.focus(); });
        b.addEventListener('click', function (e) {
          e.stopPropagation(); Tip.hide();
          var a = b.dataset.a;
          if (a === 'min') w.minimize(); else if (a === 'max') w.toggleMax(); else if (a === 'close') w.close(); else if (a === 'help' && w.o.onHelp) w.o.onHelp();
        });
      });
    }
    Array.prototype.forEach.call(el.querySelectorAll('.xp-grip'), function (g) { g.addEventListener('pointerdown', function (e) { gripDown(w, g.dataset.d, e); }); });
  };
  Win.prototype.focus = function (silent) {
    if (this.closed) return this;
    if (this.blockedBy && !this.blockedBy.closed) { var d = this.blockedBy; d.focus(); return this; }
    if (this.state === 'min') { this.restore(); return this; }
    this.zo = ++zCounter; zSort();
    if (S.active !== this) setActive(this);
    closeStart(true);
    var ae = document.activeElement;
    if (!silent && !(ae && this.el.contains(ae))) { try { this.el.focus({ preventScroll: true }); } catch (e) { } }
    return this;
  };
  Win.prototype.sysMenu = function (x, y, up) {
    var w = this;
    openMenu([
      { label: L('restore'), disabled: w.state === 'normal', onClick: function () { if (w.state === 'min') w.restore(); else w.toggleMax(); } },
      { label: L('move'), disabled: true }, { label: L('size'), disabled: true },
      { label: L('minimize'), disabled: w.state === 'min' || w.o.minimizable === false || w.kind === 'dialog', onClick: function () { w.minimize(); } },
      { label: L('maximize'), disabled: w.state === 'max' || !w.resizable || w.o.maximizable === false || isPhone(), onClick: function () { if (w.state === 'min') w.restore(); w.maximize(); } },
      { sep: true },
      { label: L('close') + '        Alt+F4', bold: true, onClick: function () { w.close(); } }
    ], x, y, { up: up });
  };
  function ghost(from, to, ms, opts) {
    opts = opts || {};
    if (reduced() || !R.root.animate) return Promise.resolve();
    var g = h('div', 'xp-ghost' + (opts.caption ? ' xp-ghost--cap' : ''));
    if (opts.caption) g.innerHTML = '<span class="xp-ghost__ic">' + (opts.icon || '') + '</span><span class="xp-ghost__t">' + esc(opts.caption) + '</span>';
    R.root.appendChild(g);
    var frames = [
      { left: from.x + 'px', top: from.y + 'px', width: from.w + 'px', height: from.h + 'px', opacity: opts.fadeFrom != null ? opts.fadeFrom : 1 },
      { left: to.x + 'px', top: to.y + 'px', width: to.w + 'px', height: to.h + 'px', opacity: opts.fadeTo != null ? opts.fadeTo : 1 }
    ];
    return animate(g, frames, ms, opts.easing || 'steps(9, end)').then(function () { rm(g); });
  }
  Win.prototype.titleRect = function () {
    var r = localRect(this.el);
    return { x: r.x, y: r.y, w: r.w, h: Math.min(r.h, this.o.frameless ? r.h : 28) };
  };
  Win.prototype.minimize = function (quiet) {           // quiet: no ghost, no sound (the host already showed the minimize)
    var w = this; if (w.closed || w.state === 'min' || w.o.minimizable === false) return;
    if (w.kind === 'dialog') return;
    closeMenus(0);
    // a full-screen window flies down as a caption strip, like XP did: not as a screen-sized blue slab
    var fr = localRect(w.el), from = w.o.frameless ? { x: fr.x, y: fr.y, w: fr.w, h: Math.min(fr.h, 28) } : w.titleRect(), to = w.task ? localRect(w.task) : { x: 0, y: S.h - 30, w: 160, h: 24 };
    w.restoreState = w.state; w.state = 'min';
    w.el.classList.add('xp--min');
    if (!quiet) sound('minimize');
    if (S.active === w) setActive(topWindow(w));
    if (w.task) w.task.classList.remove('xp--on');
    zSort();
    if (w.o.onMinimize) w.o.onMinimize();
    if (quiet) return Promise.resolve();
    return ghost(from, to, w.o.cover ? 260 : 220, { caption: w.titleText(), icon: w.icon, easing: w.o.cover ? 'steps(10, end)' : 'steps(9, end)' });
  };
  Win.prototype.restore = function () {
    var w = this; if (w.closed) return;
    if (w.state !== 'min') { if (w.state === 'max') w.toggleMax(); return; }
    var to; w.state = w.restoreState || 'normal';
    w.el.classList.remove('xp--min');
    w.zo = ++zCounter; zSort();
    var tr = localRect(w.el); to = w.o.frameless ? { x: tr.x, y: tr.y, w: tr.w, h: Math.min(tr.h, 28) } : w.titleRect();
    w.el.classList.add('xp--min');
    var from = w.task ? localRect(w.task) : { x: 0, y: S.h - 30, w: 160, h: 24 };
    sound('maximize');
    setActive(w);
    if (w.o.onRestore) w.o.onRestore();
    return ghost(from, to, 200, { caption: w.titleText(), icon: w.icon }).then(function () {
      if (w.closed || w.state === 'min') return;
      w.el.classList.remove('xp--min');
      animate(w.el, [{ opacity: 0 }, { opacity: 1 }], 60, 'linear');
      w.focus();
    });
  };
  Win.prototype.maximize = function () { if (this.state !== 'max') this.toggleMax(); };
  Win.prototype.toggleMax = function () {
    var w = this; if (w.closed || !w.resizable || w.o.maximizable === false) return;
    if (isPhone() && w.state === 'max') return;
    var before = localRect(w.el);
    if (w.state === 'max') { w.state = 'normal'; w.el.classList.remove('xp--max'); w.autoMax = false; if (w.prev) w.rect = w.prev; }
    else { w.prev = Object.assign({}, w.rect); w.state = 'max'; w.el.classList.add('xp--max'); }
    w.applyRect(); w.syncMaxBtn();
    var after = localRect(w.el);
    sound('maximize');
    if (!reduced() && after.w && after.h) {
      animate(w.el, [
        { transformOrigin: '0 0', transform: 'translate(' + (before.x - after.x) + 'px,' + (before.y - after.y) + 'px) scale(' + (before.w / after.w) + ',' + (before.h / after.h) + ')' },
        { transformOrigin: '0 0', transform: 'none' }
      ], 180, EASE_STD).then(function (a) { if (a && a.cancel) a.cancel(); });
    }
    if (w.o.onResize) w.o.onResize();
  };
  Win.prototype.close = function (force) {
    var w = this; if (w.closed) return;
    if (!force && w.blockedBy && !w.blockedBy.closed) { w.blockedBy.focus(); w.blockedBy.flashTitle(); return; }
    if (!force && w.o.beforeClose && w.o.beforeClose() === false) return;
    w.closed = true;
    closeMenus(0);
    // close owned dialogs first
    S.wins.slice().forEach(function (x) { if (x.o.owner === w) x.close(true); });
    if (w.cleanup) { try { w.cleanup(); } catch (e) { console.error(e); } }
    if (w.o.onClose) { try { w.o.onClose(); } catch (e) { console.error(e); } }
    w.langCbs = [];
    var i = S.wins.indexOf(w); if (i >= 0) S.wins.splice(i, 1);
    if (S.active === w || !S.active) setActive(w.o.owner && !w.o.owner.closed ? w.o.owner : topWindow());
    if (S.active && w.kind === 'dialog') S.active.focus();
    if (w.kind !== 'game') sound('close');
    var el = w.el;
    if (w.state === 'min') rm(el);
    else animate(el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.96)' }], 110, EASE_IN).then(function () { rm(el); });
    if (w.task) {
      var t = w.task;
      animate(t, [{ flexBasis: t.offsetWidth + 'px', opacity: 1 }, { flexBasis: '0px', minWidth: '0px', padding: '0px', opacity: 0 }], 150, EASE_OUT).then(function () { rm(t); });
    }
    if (w.unblock) w.unblock();
    if (S.openApps && w.app) delete S.openApps[w.app.id + (w.app.singleton === false ? ':' + w.id : '')];
  };
  Win.prototype.flashTitle = function () {
    var w = this, n = reduced() ? 2 : 6, k = 0;
    sound('error');
    clearInterval(w._ft);
    w._ft = setInterval(function () {
      w.el.classList.toggle('xp--inactive'); k++;
      if (k >= n) { clearInterval(w._ft); w.el.classList.toggle('xp--inactive', S.active !== w); }
    }, 70);
  };
  Win.prototype.flash = function () { startFlash(this); };
  function startFlash(w) {
    if (!w.task || S.active === w) return;
    stopFlash(w);
    var k = 0, max = reduced() ? 4 : 8;
    w.task.classList.add('xp--flashed');
    w._fl = setInterval(function () {
      k++;
      if (k >= max) { clearInterval(w._fl); w.task.classList.add('xp--flashed'); return; }
      w.task.classList.toggle('xp--flashed');
    }, 500);
  }
  function stopFlash(w) { clearInterval(w._fl); if (w.task) w.task.classList.remove('xp--flashed'); }

  // dragging the title bar (with double-click / double-tap to maximise)
  function titleDown(w, e) {
    if (e.button && e.button !== 0) return;
    if (e.target.closest('.xp-tbtn') || e.target.closest('.xp-win__icon')) return;
    var t = now(), p = localPt(e);
    if (w._tdT && t - w._tdT < 380 && Math.abs(p.x - w._tdP.x) < 8 && Math.abs(p.y - w._tdP.y) < 8) { w._tdT = 0; w.toggleMax(); return; }
    w._tdT = t; w._tdP = p;
    if (w.state === 'max' || w.o.cover) return;
    e.preventDefault();
    var sx = p.x, sy = p.y, ox = w.rect.x, oy = w.rect.y, moved = false, el = w.el;
    try { w.titleEl.setPointerCapture(e.pointerId); } catch (err) { }
    function mv(ev) {
      var q = localPt(ev), dx = q.x - sx, dy = q.y - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!moved) { moved = true; el.classList.add('xp--dragging'); Tip.hide(); }
      var W = work();
      w.rect.x = Math.round(clamp(ox + dx, 40 - w.rect.w, W.w - 40));
      w.rect.y = Math.round(clamp(oy + dy, 0, W.h - 28));
      w.applyRect();
    }
    function up() {
      w.titleEl.removeEventListener('pointermove', mv); w.titleEl.removeEventListener('pointerup', up); w.titleEl.removeEventListener('pointercancel', up);
      el.classList.remove('xp--dragging');
    }
    w.titleEl.addEventListener('pointermove', mv); w.titleEl.addEventListener('pointerup', up); w.titleEl.addEventListener('pointercancel', up);
  }
  function gripDown(w, d, e) {
    if (w.state === 'max' || (e.button && e.button !== 0)) return;
    e.preventDefault(); e.stopPropagation(); w.focus();
    var p = localPt(e), r0 = Object.assign({}, w.rect), g = e.target, el = w.el;
    try { g.setPointerCapture(e.pointerId); } catch (err) { }
    el.classList.add('xp--dragging');
    function mv(ev) {
      var q = localPt(ev), dx = q.x - p.x, dy = q.y - p.y, r = Object.assign({}, r0), W = work();
      if (d.indexOf('e') >= 0) r.w = clamp(r0.w + dx, w.minW, W.w - r0.x + 200);
      if (d.indexOf('s') >= 0) r.h = clamp(r0.h + dy, w.minH, W.h - r0.y);
      if (d.indexOf('w') >= 0) { var nw = clamp(r0.w - dx, w.minW, r0.x + r0.w + 200); r.x = r0.x + r0.w - nw; r.w = nw; }
      if (d.indexOf('n') >= 0) { var nh = clamp(r0.h - dy, w.minH, r0.y + r0.h); r.y = r0.y + r0.h - nh; r.h = nh; }
      w.rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
      w.applyRect();
      if (w.o.onResize) w.o.onResize();
    }
    function up() { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); el.classList.remove('xp--dragging'); }
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  }
  function clampWindows() {
    var W = work();
    S.wins.forEach(function (w) {
      if (isPhone() && w.kind === 'app' && w.state === 'normal' && !w.o.cover) { w.prev = Object.assign({}, w.rect); w.state = 'max'; w.autoMax = true; w.el.classList.add('xp--max'); w.syncMaxBtn(); }
      else if (!isPhone() && w.autoMax && w.state === 'max') { w.state = 'normal'; w.autoMax = false; w.el.classList.remove('xp--max'); if (w.prev) w.rect = w.prev; w.syncMaxBtn(); }
      var r = w.rect;
      r.w = Math.min(r.w, W.w); r.h = Math.min(r.h, W.h);
      r.x = clamp(r.x, 40 - r.w, W.w - 40); r.y = clamp(r.y, 0, Math.max(0, W.h - 28));
      w.applyRect();
    });
  }
  function arrangeWindows(mode) {
    var list = S.wins.filter(function (w) { return !w.closed && w.state !== 'min' && w.kind === 'app' && w.resizable && !w.o.cover; });
    var W = work(), n = list.length; if (!n) return;
    list.forEach(function (w, i) {
      if (w.state === 'max') { w.state = 'normal'; w.el.classList.remove('xp--max'); w.syncMaxBtn(); }
      if (mode === 'cascade') w.rect = { x: 20 + i * 26, y: 20 + i * 26, w: Math.min(w.rect.w, W.w - 40 - i * 26), h: Math.min(w.rect.h, W.h - 40 - i * 26) };
      else if (mode === 'h') w.rect = { x: 0, y: Math.round(i * W.h / n), w: W.w, h: Math.round(W.h / n) };
      else w.rect = { x: Math.round(i * W.w / n), y: 0, w: Math.round(W.w / n), h: W.h };
      w.rect.w = Math.max(w.rect.w, w.minW); w.rect.h = Math.max(w.rect.h, w.minH);
      w.applyRect(); w.zo = ++zCounter;
    });
    zSort();
  }
  var shownDesktop = null;
  function showDesktopToggle() {
    var vis = S.wins.filter(function (w) { return w.state !== 'min' && w.kind === 'app' && w.o.minimizable !== false; });
    if (vis.length) { shownDesktop = vis; vis.forEach(function (w) { w.minimize(); }); }
    else if (shownDesktop) { shownDesktop.forEach(function (w) { if (!w.closed) w.restore(); }); shownDesktop = null; }
  }

  /* =========================================================== apps */
  S.openApps = {};
  function appTitle(app) { return tr(app.title) || app.id; }
  function makeApi(w, app, params) {
    var api = {
      win: {
        el: w.el, body: w.body,
        setTitle: function (s) { w.customTitle = s == null ? null : tr(s); w.renderTitle(); },
        close: function () { w.close(); }, minimize: function () { w.minimize(); }, maximize: function () { w.maximize(); },
        restore: function () { if (w.state === 'min') w.restore(); else if (w.state === 'max') w.toggleMax(); },
        focus: function () { w.focus(); }, flash: function () { startFlash(w); },
        isActive: function () { return S.active === w; }, state: function () { return w.state; },
        resize: function (ww, hh) {
          if (w.state !== 'normal') return; var W = work();
          w.rect.w = Math.round(clamp(ww, w.minW, W.w)); w.rect.h = Math.round(clamp(hh, w.minH, W.h));
          w.rect.x = clamp(w.rect.x, 0, Math.max(0, W.w - w.rect.w)); w.rect.y = clamp(w.rect.y, 0, Math.max(0, W.h - w.rect.h)); w.applyRect();
        }
      },
      params: params,
      openApp: function (id, p) { return openApp(id, p); },
      lang: function () { return S.lang; },
      t: function (o) { return tr(o); },
      onLang: function (cb) { w.langCbs.push(cb); return function () { var i = w.langCbs.indexOf(cb); if (i >= 0) w.langCbs.splice(i, 1); }; },
      sound: function (n) { sound(n); },
      balloon: function (o) { Balloon.show(o || {}); if (S.active !== w) startFlash(w); },
      dialog: function (o) { return dialog(Object.assign({ owner: w }, o || {})); },
      status: status, phuketTime: phuketTime,
      openResume: function () { if (S.opts.onOpenResume) S.opts.onOpenResume(); }
    };
    return api;
  }
  function openApp(id, params, origin) {
    var app = S.apps[id];
    if (!app) { sysApp(id, params); return null; }
    if (!S.open) return null;
    var key = app.id;
    var ex = S.openApps[key];
    if (ex && !ex.closed && app.singleton !== false) {
      if (params !== undefined && ex.app.render) { // re-render with new params
        if (ex.cleanup) { try { ex.cleanup(); } catch (e) { } }
        ex.body.innerHTML = ''; ex.langCbs = [];
        runRender(ex, app, params);
      }
      ex.focus();
      if (ex.state === 'min') ex.restore();
      return ex;
    }
    var ds = app.defaultSize || {}, ms = app.minSize || {};
    var w = new Win({ app: app, title: app.title, icon: app.icon || ICON.window(), w: ds.w || 560, h: ds.h || 400, minW: ms.w, minH: ms.h, resizable: app.resizable, maximizable: app.maximizable, maximized: app.maximized });
    if (app.singleton !== false) S.openApps[key] = w;
    trackRecent(app.id);
    w.el.classList.add('xp--busy');
    runRender(w, app, params);
    setTimeout(function () { w.el.classList.remove('xp--busy'); }, 350);
    // opening animation: caption ghost from the launcher, then fade/scale in
    var target = w.state === 'max' ? { x: 0, y: 0, w: work().w, h: 28 } : { x: w.rect.x, y: w.rect.y, w: w.rect.w, h: 28 };
    sound('open');
    w.focus();
    if (origin && !reduced()) {
      w.el.style.visibility = 'hidden';
      ghost(origin, target, 180, { caption: w.titleText(), icon: w.icon, easing: EASE_OUT }).then(function () {
        w.el.style.visibility = '';
        animate(w.el, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], 120, EASE_OUT).then(function (a) { if (a && a.cancel) a.cancel(); });
      });
    } else {
      animate(w.el, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], 120, EASE_OUT).then(function (a) { if (a && a.cancel) a.cancel(); });
    }
    return w;
  }
  function runRender(w, app, params) {
    var api = makeApi(w, app, params);
    w.api = api;
    try {
      var c = app.render ? app.render(w.body, api) : null;
      w.cleanup = typeof c === 'function' ? c : null;
    } catch (e) {
      console.error(e);
      w.body.innerHTML = '';
      setTimeout(function () {
        dialog({ owner: w, title: appTitle(app), icon: 'error', text: S.lang === 'en' ? appTitle(app) + ' has encountered a problem and needs to close. We are sorry for the inconvenience.\n\n' + (e && e.message || e) : 'В программе «' + appTitle(app) + '» произошла ошибка, она будет закрыта. Приносим извинения за неудобства.\n\n' + (e && e.message || e), buttons: [{ label: L('close'), primary: true, onClick: function () { setTimeout(function () { w.close(true); }, 0); } }] });
      }, 50);
    }
  }
  function trackRecent(id) {
    var a = S.apps[id]; if (!a || a.startMenu === 'pinned') return;
    S.recent = [id].concat(S.recent.filter(function (x) { return x !== id; })).slice(0, 4);
  }

  /* =========================================================== dialogs */
  function dialog(o) {
    o = o || {};
    var owner = o.owner && !o.owner.closed ? o.owner : null;
    var icon = o.icon === 'warn' ? ICON.warn() : o.icon === 'error' ? ICON.error() : o.icon === 'question' ? ICON.question() : o.icon === 'none' ? '' : ICON.info();
    var w = new Win({ kind: 'dialog', title: o.title || BRAND, icon: owner ? owner.icon : ICON.logo(), resizable: false, modal: true, owner: owner, noTask: true, center: true, autoSize: true, w: 420, h: 160 });
    var body = h('div', 'xp-dlg');
    var row = h('div', 'xp-dlg__row', (icon ? '<div class="xp-dlg__ic">' + icon + '</div>' : '') + '<div class="xp-dlg__text"></div>');
    var txt = row.querySelector('.xp-dlg__text');
    if (o.html) txt.innerHTML = o.html; else txt.textContent = tr(o.text);
    body.appendChild(row);
    var btns = h('div', 'xp-dlg__btns');
    var list = o.buttons && o.buttons.length ? o.buttons : [{ label: L('ok'), primary: true }];
    var primaryBtn = null;
    list.forEach(function (b) {
      var bt = h('button', 'xp-btn' + (b.primary ? ' xp-btn--default' : ''));
      bt.textContent = tr(b.label);
      bt.addEventListener('click', function () {
        var r = b.onClick ? b.onClick() : undefined;
        if (r !== false) w.close();
      });
      if (b.primary) primaryBtn = bt;
      btns.appendChild(bt);
    });
    body.appendChild(btns);
    w.body.appendChild(body);
    // re-measure now that content exists
    css(w.el, { width: 'auto', height: 'auto' });
    // offsetWidth/Height round fractional sizes, and a fraction of a pixel short is enough for a scrollbar: add a spare pixel,
    // and only let the body scroll when the dialog really is taller than the screen
    var W = work(), fits = w.el.offsetHeight + 1 <= W.h - 16;
    var ww = Math.min(w.el.offsetWidth + 1, W.w - 16), hh = Math.min(w.el.offsetHeight + 1, W.h - 16);
    w.body.style.overflow = fits ? 'hidden' : 'auto';
    var ref = owner && owner.state !== 'min' ? owner.rect : { x: 0, y: 0, w: W.w, h: W.h };
    if (owner && owner.state === 'max') ref = { x: 0, y: 0, w: W.w, h: W.h };
    w.rect = { x: Math.round(clamp(ref.x + (ref.w - ww) / 2, 0, W.w - ww)), y: Math.round(clamp(ref.y + (ref.h - hh) / 2, 0, W.h - hh)), w: ww, h: hh };
    w.applyRect();
    // modality: the owner (or the whole desktop) becomes inert, clicks on it flash the dialog
    var shield;
    if (owner) {
      owner.blockedBy = w;
      shield = h('div', 'xp-modal-shield'); owner.el.appendChild(shield);
    } else {
      shield = h('div', 'xp-modal'); R.wins.appendChild(shield); shield.style.zIndex = 99; S.modalBlock = w;
      S.wins.forEach(function (x) { if (x !== w) x.blockedBy = w; });
    }
    shield.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); w.focus(); w.flashTitle(); }, true);
    w.unblock = function () {
      rm(shield);
      if (owner) { if (owner.blockedBy === w) owner.blockedBy = null; }
      else { S.modalBlock = null; S.wins.forEach(function (x) { if (x.blockedBy === w) x.blockedBy = null; }); }
    };
    w.o.onEsc = function () { var c = list.filter(function (b) { return b.cancel; })[0]; if (c && c.onClick) c.onClick(); w.close(); };
    w.focus();
    if (owner && owner.state === 'min') startFlash(owner);
    sound(o.icon === 'error' || o.icon === 'warn' ? 'error' : o.sound || 'notify');
    animate(w.el, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], 120, EASE_OUT).then(function (a) { if (a && a.cancel) a.cancel(); });
    setTimeout(function () { if (primaryBtn) primaryBtn.focus(); }, 0);
    return { close: function () { w.close(true); }, el: w.el, win: w };
  }

  /* =========================================================== desktop icons */
  var Icons = { els: {}, sel: [], focus: null };
  S.trash = [];
  function desktopApps() { return S.appOrder.map(function (id) { return S.apps[id]; }).filter(function (a) { return a && a.desktop && S.trash.indexOf(a.id) < 0; }); }
  function overRecycle(p) {
    var r = Icons.els.recycle; if (!r || Icons.sel.indexOf('recycle') >= 0 || !p) return false;
    var x = parseFloat(r.style.left), y = parseFloat(r.style.top);
    return p.x >= x && p.x <= x + r.offsetWidth && p.y >= y && p.y <= y + r.offsetHeight;
  }
  function cell() { return isPhone() ? { w: 84, h: 92 } : { w: 76, h: 82 }; }
  function gridRows() { return Math.max(1, Math.floor((work().h - 8) / cell().h)); }
  function gridCols() { return Math.max(1, Math.floor((work().w - 8) / cell().w)); }
  function cellXY(c, r) { var cl = cell(); return { x: 4 + c * cl.w + (cl.w - (isPhone() ? 80 : 74)) / 2, y: 4 + r * cl.h }; }
  function layoutIcons(stagger) {
    if (!R.icons) return;
    var apps = desktopApps(), rows = gridRows(), cols = gridCols(), taken = {}, pos = {};
    var ids = apps.map(function (a) { return a.id; });
    Object.keys(Icons.els).forEach(function (id) { if (ids.indexOf(id) < 0) { rm(Icons.els[id]); delete Icons.els[id]; } });
    if (!S.prefs.autoArrange) apps.forEach(function (a) {
      var p = S.prefs.icons[a.id];
      if (p && p[1] < rows && p[0] < cols + 4 && !taken[p[0] + ',' + p[1]]) { taken[p[0] + ',' + p[1]] = 1; pos[a.id] = p; }
    });
    var c = 0, r = 0;
    apps.forEach(function (a) {
      if (pos[a.id]) return;
      while (taken[c + ',' + r]) { r++; if (r >= rows) { r = 0; c++; } }
      taken[c + ',' + r] = 1; pos[a.id] = [c, r];
    });
    apps.forEach(function (a, i) {
      var el = Icons.els[a.id];
      if (!el) {
        el = h('div', 'xp-icon', '<div class="xp-icon__img"></div><div class="xp-icon__label"></div>');
        el.dataset.id = a.id; el.setAttribute('role', 'button');
        wireIcon(el, a.id);
        R.icons.appendChild(el); Icons.els[a.id] = el;
      }
      el.querySelector('.xp-icon__img').innerHTML = a.icon || ICON.window();
      el.querySelector('.xp-icon__label').textContent = appTitle(a);
      el.setAttribute('aria-label', appTitle(a));
      el._pos = pos[a.id];
      var xy = cellXY(pos[a.id][0], pos[a.id][1]);
      css(el, { left: xy.x, top: xy.y });
      if (stagger) {
        el.classList.remove('xp--appear'); void el.offsetWidth;
        el.style.animationDelay = D(i * 40) + 'ms'; el.classList.add('xp--appear');
      }
    });
  }
  function hideIcons(v) { if (R.icons) R.icons.classList.toggle('xp--preicons', !!v); }
  function selectIcons(ids, focusId) {
    Icons.sel = ids.slice();
    Object.keys(Icons.els).forEach(function (id) { Icons.els[id].classList.toggle('xp--sel', ids.indexOf(id) >= 0); Icons.els[id].classList.toggle('xp--focus', id === focusId); });
    if (focusId !== undefined) Icons.focus = focusId;
  }
  function iconOrigin(id) { var el = Icons.els[id]; if (!el) return null; var r = localRect(el.querySelector('.xp-icon__img')); return { x: r.x - 4, y: r.y, w: r.w + 8, h: Math.min(r.h, 28) }; }
  function launch(id, origin) {
    sound('click');
    var o = origin || iconOrigin(id);
    var app = S.apps[id];
    if (app) { var el = Icons.els[id]; if (el) { el.classList.add('xp--launch'); setTimeout(function () { el.classList.remove('xp--launch'); }, 300); } }
    return openApp(id, undefined, o);
  }
  function lpRing(p) {
    var r = h('div', 'xp-lpring'); css(r, { left: p.x - 12, top: p.y - 12 }); R.root.appendChild(r);
    animate(r, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], 500, 'linear');
    return function () { rm(r); };
  }
  function wireIcon(el, id) {
    var down = null, lastDown = 0, lpT = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.button === 2) return;
      e.stopPropagation(); closeMenus(0); closeStart(true);
      setActive(null); R.desk.focus({ preventScroll: true });
      var t = now(), p = localPt(e), touch = e.pointerType !== 'mouse';
      if (e.ctrlKey || e.metaKey) { var s = Icons.sel.slice(), k = s.indexOf(id); if (k >= 0) s.splice(k, 1); else s.push(id); selectIcons(s, id); return; }
      if (Icons.sel.indexOf(id) < 0) selectIcons([id], id); else selectIcons(Icons.sel, id);
      if (!touch && t - lastDown < 420) { lastDown = 0; launch(id); return; }
      lastDown = t;
      down = { p: p, id: e.pointerId, moved: false, touch: touch, start: {} };
      Icons.sel.forEach(function (sid) { var x = Icons.els[sid]; down.start[sid] = { x: parseFloat(x.style.left), y: parseFloat(x.style.top) }; });
      try { el.setPointerCapture(e.pointerId); } catch (err) { }
      if (touch) {
        clearTimeout(lpT);
        var offRing = lpRing(p); down.ring = offRing;
        lpT = setTimeout(function () { offRing(); if (down && !down.moved) { var dd = down; down = null; dd.cancelled = true; if (navigator.vibrate) try { navigator.vibrate(10); } catch (e2) { } iconMenu(id, dd.p.x, dd.p.y); } }, 500);
      }
    });
    el.addEventListener('pointermove', function (e) {
      if (!down || down.id !== e.pointerId) return;
      var q = localPt(e), dx = q.x - down.p.x, dy = q.y - down.p.y;
      if (!down.moved && Math.abs(dx) + Math.abs(dy) < (down.touch ? 10 : 4)) return;
      clearTimeout(lpT); if (down.ring) down.ring();
      if (!down.moved) { down.moved = true; Icons.sel.forEach(function (sid) { Icons.els[sid].classList.add('xp--dragging'); }); Tip.hide(); }
      Icons.sel.forEach(function (sid) { var s = down.start[sid]; css(Icons.els[sid], { left: s.x + dx, top: s.y + dy }); });
      down.last = q;
      if (Icons.els.recycle) Icons.els.recycle.classList.toggle('xp--drop', overRecycle(q));
    });
    function up(e) {
      clearTimeout(lpT);
      if (!down || down.id !== e.pointerId) return;
      if (down.ring) down.ring();
      var d = down; down = null;
      if (d.moved) { dropIcons(d.last); return; }
      if (d.touch && e.type === 'pointerup') launch(id);
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', function (e) { clearTimeout(lpT); if (down && down.moved) dropIcons(); down = null; });
    el.addEventListener('contextmenu', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (Icons.sel.indexOf(id) < 0) selectIcons([id], id);
      var p = localPt(e); iconMenu(id, p.x, p.y);
    });
  }
  function dropIcons(p) {
    if (Icons.els.recycle) Icons.els.recycle.classList.remove('xp--drop');
    if (overRecycle(p)) {
      var bin = Icons.els.recycle;
      Icons.sel.forEach(function (id) {
        var el = Icons.els[id]; S.trash.push(id);
        var bx = parseFloat(bin.style.left), by = parseFloat(bin.style.top), x = parseFloat(el.style.left), y = parseFloat(el.style.top);
        el.classList.remove('xp--dragging');
        animate(el, [{ transform: 'none', opacity: .6 }, { transform: 'translate(' + (bx - x) + 'px,' + (by - y) + 'px) scale(.2)', opacity: 0 }], 220, EASE_IN).then(function () { rm(el); delete Icons.els[id]; });
      });
      sound('recycle');
      animate(bin, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 260, EASE_OUT);
      Icons.sel = [];
      return;
    }
    var cl = cell(), rows = gridRows(), cols = gridCols(), taken = {};
    Object.keys(Icons.els).forEach(function (id) { if (Icons.sel.indexOf(id) < 0) { var p = Icons.els[id]._pos; taken[p[0] + ',' + p[1]] = 1; } });
    Icons.sel.forEach(function (id) {
      var el = Icons.els[id]; el.classList.remove('xp--dragging');
      var x = parseFloat(el.style.left), y = parseFloat(el.style.top);
      var c0 = clamp(Math.round((x - 4) / cl.w), 0, cols - 1), r0 = clamp(Math.round((y - 4) / cl.h), 0, rows - 1), best = null, bd = 1e9;
      for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) {
        if (taken[c + ',' + r]) continue;
        var dd = (c - c0) * (c - c0) * cl.w * cl.w + (r - r0) * (r - r0) * cl.h * cl.h;
        if (dd < bd) { bd = dd; best = [c, r]; }
      }
      if (!best) best = el._pos;
      taken[best[0] + ',' + best[1]] = 1;
      el._pos = best; S.prefs.icons[id] = best;
      var xy = cellXY(best[0], best[1]);
      el.classList.add('xp--snap'); css(el, { left: xy.x, top: xy.y });
      setTimeout(function () { el.classList.remove('xp--snap'); }, 200);
    });
    S.prefs.autoArrange = false;
    savePrefs();
  }
  function arrangeIcons(by) {
    var apps = desktopApps().slice();
    apps.sort(function (a, b) { return by === 'type' ? ((a.startMenu || '') + '').localeCompare((b.startMenu || '') + '') || appTitle(a).localeCompare(appTitle(b)) : appTitle(a).localeCompare(appTitle(b)); });
    var rows = gridRows();
    S.prefs.icons = {};
    apps.forEach(function (a, i) { S.prefs.icons[a.id] = [Math.floor(i / rows), i % rows]; });
    savePrefs(); layoutIcons();
  }
  function refreshDesktop() {
    if (!R.icons) return;
    R.icons.classList.add('xp--flicker');
    setTimeout(function () { R.icons.classList.remove('xp--flicker'); paintWall(true); layoutIcons(); }, D(90) + 30);
  }
  function iconMenu(id, x, y) {
    var app = S.apps[id];
    openMenu([
      { label: L('open'), bold: true, onClick: function () { launch(id); } },
      { sep: true },
      { label: L('createShortcut'), disabled: true },
      { label: L('del'), onClick: function () { dialog({ title: appTitle(app), icon: 'warn', text: L('deleteNo') }); } },
      { label: L('rename'), disabled: true },
      { sep: true },
      { label: L('properties'), onClick: function () { appProps(app); } }
    ].concat(id === 'recycle' && S.trash.length ? [{ sep: true }, { label: L('restoreIcons', S.trash.length), onClick: function () { S.trash = []; layoutIcons(true); sound('maximize'); } }] : []), x, y, { bottomSheet: S.w < 400 });
  }
  function appProps(app) {
    dialog({ title: L('properties') + ': ' + appTitle(app), icon: 'none', html: '<div class="xp-props"><div class="xp-props__ic">' + (app.icon || ICON.window()) + '</div><div><b>' + esc(appTitle(app)) + '</b><br>' + esc(L('typeLabel')) + '<br>' + esc(L('locLabel')) + '<br>ID: ' + esc(app.id) + '</div></div>' });
  }
  function deskMenu(x, y) {
    openMenu([
      { label: L('arrangeBy'), sub: [
        { label: L('byName'), onClick: function () { arrangeIcons('name'); } },
        { label: L('byType'), onClick: function () { arrangeIcons('type'); } },
        { sep: true },
        { label: L('autoArrange'), check: S.prefs.autoArrange, onClick: function () { S.prefs.autoArrange = !S.prefs.autoArrange; if (S.prefs.autoArrange) arrangeIcons('name'); savePrefs(); } },
        { label: L('alignGrid'), check: true, disabled: true }
      ] },
      { label: L('refresh'), onClick: refreshDesktop },
      { sep: true },
      { label: L('paste'), disabled: true }, { label: L('pasteShortcut'), disabled: true },
      { sep: true },
      { label: L('newItem'), sub: [{ label: L('folder'), icon: ICON.folder(), disabled: true }, { label: L('shortcut'), disabled: true }] },
      { sep: true },
      { label: L('properties'), onClick: function () { sysApp('display'); } }
    ], x, y, { bottomSheet: S.w < 400 });
  }
  function wireDesk() {
    var band = null, bs = null, lpT = 0;
    R.desk.addEventListener('pointerdown', function (e) {
      if (e.target !== R.desk && e.target !== R.icons && e.target !== R.wins) return;
      closeMenus(0); closeStart(true);
      setActive(null);
      R.desk.focus({ preventScroll: true });
      if (e.button === 2) return;
      if (!(e.ctrlKey || e.metaKey)) selectIcons([], null);
      var p = localPt(e);
      if (e.pointerType !== 'mouse') {
        clearTimeout(lpT);
        var sx = p.x, sy = p.y;
        var offR = lpRing(p);
        lpT = setTimeout(function () { offR(); if (navigator.vibrate) try { navigator.vibrate(10); } catch (e2) { } deskMenu(sx, sy); }, 520);
        var cancel = function () { clearTimeout(lpT); offR(); R.desk.removeEventListener('pointerup', cancel); R.desk.removeEventListener('pointermove', mvc); };
        var mvc = function (ev) { var q = localPt(ev); if (Math.abs(q.x - sx) + Math.abs(q.y - sy) > 10) cancel(); };
        R.desk.addEventListener('pointerup', cancel); R.desk.addEventListener('pointermove', mvc);
        return;
      }
      bs = { x: p.x, y: p.y, base: Icons.sel.slice() };
      try { R.desk.setPointerCapture(e.pointerId); } catch (err) { }
    });
    R.desk.addEventListener('pointermove', function (e) {
      if (!bs) return;
      var p = localPt(e);
      if (!band) { if (Math.abs(p.x - bs.x) + Math.abs(p.y - bs.y) < 3) return; band = h('div', 'xp-band'); R.desk.appendChild(band); }
      var W = work();
      var x1 = Math.min(bs.x, p.x), y1 = Math.min(bs.y, p.y), x2 = clamp(Math.max(bs.x, p.x), 0, W.w), y2 = clamp(Math.max(bs.y, p.y), 0, W.h);
      x1 = Math.max(0, x1); y1 = Math.max(0, y1);
      css(band, { left: x1, top: y1, width: x2 - x1, height: y2 - y1 });
      var hit = bs.base.slice();
      Object.keys(Icons.els).forEach(function (id) {
        var el = Icons.els[id], ix = parseFloat(el.style.left), iy = parseFloat(el.style.top), iw = el.offsetWidth, ih = el.offsetHeight;
        if (ix < x2 && ix + iw > x1 && iy < y2 && iy + ih > y1 && hit.indexOf(id) < 0) hit.push(id);
      });
      selectIcons(hit, hit[hit.length - 1] || null);
    });
    function end() { bs = null; if (band) { rm(band); band = null; } }
    R.desk.addEventListener('pointerup', end); R.desk.addEventListener('pointercancel', end);
    R.desk.addEventListener('contextmenu', function (e) {
      if (e.target !== R.desk && e.target !== R.icons && e.target !== R.wins) return;
      e.preventDefault(); var p = localPt(e); deskMenu(p.x, p.y);
    });
  }
  function deskKey(e) {
    var ids = Object.keys(Icons.els); if (!ids.length) return false;
    var k = e.key, cur = Icons.focus && Icons.els[Icons.focus] ? Icons.focus : null;
    if (k === 'Enter') { if (Icons.sel.length) Icons.sel.slice(0, 3).forEach(function (id) { launch(id); }); return true; }
    if ((e.ctrlKey || e.metaKey) && (k === 'a' || k === 'A')) { selectIcons(ids, cur || ids[0]); return true; }
    if (k === 'F5') { refreshDesktop(); return true; }
    if (k === 'Delete') { if (Icons.sel.length) { sound('recycle'); dialog({ title: BRAND, icon: 'warn', text: L('deleteNo') }); } return true; }
    if ((k === 'F10' && e.shiftKey) || k === 'ContextMenu') { if (cur) { var r = localRect(Icons.els[cur]); iconMenu(cur, r.x + 30, r.y + 30); } else deskMenu(40, 40); return true; }
    var dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
    if (dir) {
      if (!cur) { selectIcons([ids[0]], ids[0]); return true; }
      var p = Icons.els[cur]._pos, best = null, bd = 1e9;
      ids.forEach(function (id) {
        if (id === cur) return; var q = Icons.els[id]._pos, dx = q[0] - p[0], dy = q[1] - p[1];
        if (dir[0] && Math.sign(dx) !== dir[0]) return; if (dir[1] && Math.sign(dy) !== dir[1]) return;
        var dist = dir[0] ? Math.abs(dx) * 10 + Math.abs(dy) : Math.abs(dy) * 10 + Math.abs(dx);
        if (dist < bd) { bd = dist; best = id; }
      });
      if (best) selectIcons(e.shiftKey ? Icons.sel.concat([best]) : [best], best);
      return true;
    }
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var ch = k.toLowerCase(), order = ids.slice().sort(function (a, b) { var pa = Icons.els[a]._pos, pb = Icons.els[b]._pos; return pa[0] - pb[0] || pa[1] - pb[1]; });
      var start = order.indexOf(cur);
      for (var j = 1; j <= order.length; j++) { var id = order[(start + j) % order.length]; if (appTitle(S.apps[id]).toLowerCase()[0] === ch) { selectIcons([id], id); return true; } }
      return true;
    }
    return false;
  }

  /* =========================================================== taskbar & tray */
  function buildTaskbar() {
    var tb = R.taskbar = h('div', 'xp-taskbar');
    tb.innerHTML = '<button class="xp-startbtn" tabindex="-1"><span class="xp-startbtn__logo">' + (bmp('startFlag') || ICON.logo()) + '</span><span class="xp-startbtn__t"></span></button>' +
      '<div class="xp-ql"></div><div class="xp-tasks"></div>' +
      '<div class="xp-tray"><button class="xp-trayic xp-tray-status" tabindex="-1"></button><button class="xp-lang" tabindex="-1"></button><button class="xp-trayic xp-tray-vol" tabindex="-1" hidden></button><span class="xp-clock"></span></div>';
    R.startBtn = tb.querySelector('.xp-startbtn'); R.ql = tb.querySelector('.xp-ql'); R.tasks = tb.querySelector('.xp-tasks');
    R.tray = tb.querySelector('.xp-tray'); R.clock = tb.querySelector('.xp-clock'); R.lang = tb.querySelector('.xp-lang');
    R.vol = tb.querySelector('.xp-tray-vol'); R.statusIc = tb.querySelector('.xp-tray-status');
    R.startBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    R.startBtn.addEventListener('click', function () { toggleStart(); });
    Tip.set(R.startBtn, function () { return S.lang === 'en' ? 'Click here to begin' : 'Начните работу с нажатия этой кнопки'; });
    R.lang.addEventListener('pointerdown', function (e) { e.stopPropagation(); closeMenus(0); });
    R.lang.addEventListener('click', function () {
      var r = localRect(R.lang);
      openMenu([
        { label: L('langRu'), check: S.lang === 'ru', icon: '', onClick: function () { setLang('ru'); if (S.opts && S.opts.onLangChange) S.opts.onLangChange('ru'); } },
        { label: L('langEn'), check: S.lang === 'en', onClick: function () { setLang('en'); if (S.opts && S.opts.onLangChange) S.opts.onLangChange('en'); } }
      ], r.x - 60, r.y, { up: true });
    });
    Tip.set(R.lang, function () { return L('langTip'); });
    R.vol.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    R.vol.addEventListener('click', function () { volumePopup(); });
    R.vol.addEventListener('dblclick', function () { toggleMute(); });
    Tip.set(R.vol, function () { return L('volumeTip', S.prefs.muted ? L('muted') : Math.round(S.prefs.volume * 100) + '%'); });
    Tip.set(R.clock, function () { return dateText() + L('clockTipPost'); });
    R.clock.addEventListener('dblclick', function () { sysApp('about'); });
    Tip.set(R.statusIc, function () { return L('status_' + status()) + '\n' + L('clockTipPre') + clockText(); });
    R.statusIc.addEventListener('click', function () { var st = status(); Balloon.show({ title: L('status_' + st), text: L('clockTipPre') + clockText() + ' · ' + dateText() }); });
    tb.addEventListener('contextmenu', function (e) {
      if (e.target.closest('.xp-task')) return;
      e.preventDefault(); var p = localPt(e);
      openMenu([
        { label: L('toolbars'), disabled: true }, { sep: true },
        { label: L('cascade'), onClick: function () { arrangeWindows('cascade'); } },
        { label: L('tileH'), onClick: function () { arrangeWindows('h'); } },
        { label: L('tileV'), onClick: function () { arrangeWindows('v'); } },
        { label: L('showDesktop'), onClick: showDesktopToggle }, { sep: true },
        { label: L('taskMgr'), onClick: function () { sysApp('taskmgr'); } }, { sep: true },
        { label: L('lockTaskbar'), check: true, onClick: noop },
        { label: L('properties'), onClick: function () { sysApp('about'); } }
      ], p.x, p.y, { up: true, bottomSheet: S.w < 400 });
    });
    tb.addEventListener('pointerdown', function (e) { if (!e.target.closest('.xp-startbtn')) closeStart(true); });
    return tb;
  }
  function buildQuickLaunch() {
    if (!R.ql) return;
    R.ql.innerHTML = '';
    var b = h('button', 'xp-qlbtn', ICON.showDesktop()); b.tabIndex = -1;
    Tip.set(b, function () { return L('showDesktopQL'); });
    b.addEventListener('click', function () { sound('click'); showDesktopToggle(); });
    R.ql.appendChild(b);
    S.appOrder.map(function (id) { return S.apps[id]; }).filter(function (a) { return a && (a.quickLaunch || a.startMenu === 'pinned'); }).slice(0, 2).forEach(function (a) {
      var q = h('button', 'xp-qlbtn', a.icon || ICON.window()); q.tabIndex = -1;
      Tip.set(q, function () { return appTitle(a); });
      q.addEventListener('click', function () { var r = localRect(q); launch(a.id, r); });
      R.ql.appendChild(q);
    });
  }
  function updateTray() {
    if (!R.clock) return;
    var ct = clockText(); if (R.clock.textContent !== ct) R.clock.textContent = ct;
    R.lang.textContent = S.lang === 'en' ? 'EN' : 'RU';
    var st = status();
    if (R.statusIc.dataset.st !== st) { R.statusIc.dataset.st = st; R.statusIc.innerHTML = statusIcon(st); }
    R.vol.innerHTML = ICON.speaker(S.prefs.muted, S.prefs.volume);
    R.startBtn.querySelector('.xp-startbtn__t').textContent = L('start');
  }
  function toggleMute(v) {
    S.prefs.muted = v == null ? !S.prefs.muted : !!v; savePrefs(); Snd.setLevel(); updateTray();
    if (!S.prefs.muted) { Snd.unlock(); sound('click'); }
  }
  var volPop = null;
  function closeVol() { if (volPop) { rm(volPop); volPop = null; } }
  function volumePopup() {
    if (volPop) { closeVol(); return; }
    var p = volPop = h('div', 'xp-pop xp-vol', '<b>' + esc(L('volume')) + '</b><input type="range" min="0" max="100" step="5" class="xp-vol__r"><label class="xp-check"><input type="checkbox" class="xp-vol__m"><span>' + esc(L('mute')) + '</span></label>');
    var r = p.querySelector('.xp-vol__r'), m = p.querySelector('.xp-vol__m');
    r.value = Math.round(S.prefs.volume * 100); m.checked = !!S.prefs.muted;
    r.addEventListener('input', function () { S.prefs.volume = r.value / 100; if (S.prefs.muted && r.value > 0) { S.prefs.muted = false; m.checked = false; } savePrefs(); Snd.setLevel(); updateTray(); });
    r.addEventListener('change', function () { Snd.unlock(); sound('click'); });
    m.addEventListener('change', function () { toggleMute(m.checked); });
    p.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    R.root.appendChild(p);
    var vr = localRect(R.vol), W = R.root.clientWidth;
    css(p, { left: clamp(vr.x + vr.w / 2 - p.offsetWidth / 2, 4, W - p.offsetWidth - 4), top: localRect(R.taskbar).y - p.offsetHeight - 2 });
    sound('click');
  }

  /* =========================================================== start menu */
  var Start = { el: null, hot: -1 };
  function sItem(o) {
    var b = h('button', 'xp-sitem' + (o.big ? ' xp-sitem--big' : '') + (o.bold ? ' xp-sitem--bold' : ''), (o.icon || '') + '<span class="xp-sitem__txt"><span class="xp-sitem__t">' + esc(o.label) + '</span>' + (o.sub ? '<span class="xp-sitem__sub">' + esc(o.sub) + '</span>' : '') + '</span>');
    b.tabIndex = -1;
    b.addEventListener('click', function (e) { e.stopPropagation(); if (o.onClick) o.onClick(b); });
    b.addEventListener('pointerenter', function () { startHot(b); if (!o.keepMenus) setTimeout(function () { if (Start.hotEl === b && !Menus.inside && b.matches(':hover')) closeMenus(0); }, 300); });
    return b;
  }
  function startHot(b) {
    if (!Start.el) return;
    Array.prototype.forEach.call(Start.el.querySelectorAll('.xp--hot'), function (x) { x.classList.remove('xp--hot'); });
    Start.hotEl = b; if (b) b.classList.add('xp--hot');
  }
  function programItems() {
    var list = S.appOrder.map(function (id) { return S.apps[id]; }).filter(function (a) { return a && (a.startMenu === 'pinned' || a.startMenu === 'programs'); });
    list.sort(function (a, b) { return appTitle(a).localeCompare(appTitle(b)); });
    var items = [
      { label: L('accessories'), icon: ICON.programs(), sub: function () { return [
        { label: L('runTitle'), icon: ICON.run(), onClick: function () { sysApp('run'); } },
        { label: L('systemTools'), icon: ICON.programs(), sub: [
          { label: L('taskMgr'), icon: ICON.taskmgr(), onClick: function () { sysApp('taskmgr'); } },
          { label: L('display'), icon: ICON.display(), onClick: function () { sysApp('display'); } }
        ] },
        { label: L('about'), icon: ICON.logo(), onClick: function () { sysApp('about'); } }
      ]; } },
      { sep: true }
    ];
    list.forEach(function (a) { items.push({ label: appTitle(a), icon: a.icon, onClick: function () { launch(a.id, null); } }); });
    return items;
  }
  function buildStart() {
    var el = h('div', 'xp-start');
    el.setAttribute('role', 'menu');
    var st = status();
    el.innerHTML = '<div class="xp-start__head"><div class="xp-start__pic">' + ICON.avatar() + '</div><div class="xp-start__who"><div class="xp-start__name">' + esc(tr(USER)) + '</div><div class="xp-start__status"><i></i><span></span></div></div></div>' +
      '<div class="xp-start__cols"><div class="xp-start__left"><div class="xp-start__list"></div><div class="xp-allprog"><div class="xp-ssep"></div></div><div class="xp-start__acc"></div></div><div class="xp-start__right"></div></div>' +
      '<div class="xp-start__foot"></div>';
    el.querySelector('.xp-start__status i').style.background = STATUS_DOT[st] || '#5DD35A';
    el.querySelector('.xp-start__status span').textContent = L('statusLine_' + st) + ' · ' + clockText();
    var left = el.querySelector('.xp-start__list'), right = el.querySelector('.xp-start__right');
    var all = S.appOrder.map(function (id) { return S.apps[id]; }).filter(Boolean);
    var pinned = all.filter(function (a) { return a.startMenu === 'pinned'; });
    pinned.forEach(function (a) { left.appendChild(sItem({ big: true, bold: true, icon: a.icon, label: appTitle(a), sub: a.subtitle ? tr(a.subtitle) : '', onClick: function (b) { launch(a.id, localRect(b.querySelector('svg') || b)); } })); });
    var recent = S.recent.map(function (id) { return S.apps[id]; }).filter(function (a) { return a && a.startMenu !== 'pinned'; });
    if (!recent.length) recent = all.filter(function (a) { return a.startMenu === 'programs'; }).slice(0, 3);
    if (pinned.length && recent.length) left.appendChild(h('div', 'xp-ssep'));
    recent.forEach(function (a) { left.appendChild(sItem({ icon: a.icon, label: appTitle(a), onClick: function (b) { launch(a.id, localRect(b.querySelector('svg') || b)); } })); });
    var ap = sItem({ label: L('allPrograms'), keepMenus: true, onClick: function (b) { allPrograms(b, false); } });
    ap.classList.add('xp-sitem--all'); ap.insertAdjacentHTML('beforeend', '<span class="xp-arrow"></span>');
    ap.addEventListener('pointerenter', function () { clearTimeout(Start.apT); Start.apT = setTimeout(function () { if (Start.hotEl === ap && !isPhone()) allPrograms(ap, false); }, 350); });
    el.querySelector('.xp-allprog').appendChild(ap);
    // right column: desktop places in bold, then system
    var places = all.filter(function (a) { return a.desktop && a.startMenu !== 'pinned' && recent.indexOf(a) < 0; }).slice(0, 4);
    places.forEach(function (a) { right.appendChild(sItem({ bold: true, icon: a.icon, label: appTitle(a), onClick: function (b) { launch(a.id, localRect(b.querySelector('svg') || b)); } })); });
    if (S.opts.onOpenResume) right.appendChild(sItem({ bold: true, icon: ICON.doc(), label: L('myResume'), onClick: function () { closeStart(true); S.opts.onOpenResume(); } }));
    if (right.children.length) right.appendChild(h('div', 'xp-ssep'));
    right.appendChild(sItem({ icon: ICON.settings(), label: L('controlPanel'), onClick: function () { sysApp('display'); } }));
    right.appendChild(sItem({ icon: ICON.taskmgr(), label: L('taskMgr'), onClick: function () { sysApp('taskmgr'); } }));
    right.appendChild(h('div', 'xp-ssep'));
    right.appendChild(sItem({ icon: ICON.help(), label: L('helpSupport'), onClick: function () { if (S.apps.help) launch('help'); else sysApp('about'); } }));
    right.appendChild(sItem({ icon: ICON.run(), label: L('run'), onClick: function () { sysApp('run'); } }));
    var foot = el.querySelector('.xp-start__foot');
    [['logoff', 'xp-fbtn--key', (ICON.smLogoff || ICON.key)(), L('logOff'), function () { logOffDialog(); }], ['off', 'xp-fbtn--power', (ICON.smOff || ICON.power)(), L('turnOff'), function () { turnOffDialog(); }]].forEach(function (f) {
      var b = h('button', 'xp-fbtn ' + f[1], '<span class="xp-fbtn__i">' + f[2] + '</span><span>' + esc(f[3]) + '</span>');
      b.tabIndex = -1;
      b.addEventListener('click', function (e) { e.stopPropagation(); closeStart(true); f[4](); });
      b.addEventListener('pointerenter', function () { startHot(b); });
      foot.appendChild(b);
    });
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (!e.target.closest('.xp-sitem--all')) closeMenus(0); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return el;
  }
  function allPrograms(b, kb) {
    if (isPhone()) { // in-place accordion
      var acc = Start.el.querySelector('.xp-start__acc');
      if (acc.children.length) { acc.innerHTML = ''; return; }
      programItems().forEach(function (it) {
        if (it.sep || it.sub) return;
        acc.appendChild(sItem({ icon: it.icon, label: it.label, onClick: it.onClick }));
      });
      acc.appendChild(sItem({ icon: ICON.run(), label: L('runTitle'), onClick: function () { sysApp('run'); } }));
      acc.scrollIntoView && acc.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (Menus.length && Menus[0].fromAll) return;
    var m = openMenu(programItems(), 0, 0, { anchor: localRect(b), alignBottom: true, cls: 'xp-menu--prog', keyboard: kb, onClose: function () { if (Start.hotEl === b) b.classList.remove('xp--open'); } });
    m.fromAll = true; b.classList.add('xp--open');
  }
  function openStart(kb) {
    if (Start.el || S.busy) return;
    closeMenus(0); closeVol();
    var el = Start.el = buildStart();
    R.screen.appendChild(el);
    css(el, { maxHeight: (S.h - S.tbH) + 'px' });
    el.classList.add('xp--anim-in');
    R.startBtn.classList.add('xp--on');
    sound('click');
    Start.hotEl = null;
    if (kb) { var f = el.querySelector('.xp-sitem'); startHot(f); }
  }
  function closeStart(quiet) {
    if (!Start.el) return;
    var el = Start.el; Start.el = null; Start.hotEl = null;
    clearTimeout(Start.apT);
    R.startBtn.classList.remove('xp--on');
    closeMenus(0);
    if (reduced()) { rm(el); return; }
    el.classList.remove('xp--anim-in'); el.classList.add('xp--anim-out');
    setTimeout(function () { rm(el); }, 90);
  }
  function toggleStart(kb) { if (Start.el) closeStart(); else openStart(kb); }
  function startKey(e) {
    if (!Start.el) return false;
    var k = e.key;
    var items = Array.prototype.slice.call(Start.el.querySelectorAll('.xp-sitem, .xp-fbtn'));
    var i = items.indexOf(Start.hotEl);
    if (k === 'Escape') { closeStart(); return true; }
    if (k === 'ArrowDown' || k === 'ArrowUp') { var n = items.length; startHot(items[((i < 0 ? (k === 'ArrowDown' ? -1 : 0) : i) + (k === 'ArrowDown' ? 1 : -1) + n) % n]); return true; }
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      if (Start.hotEl && Start.hotEl.classList.contains('xp-sitem--all') && k === 'ArrowRight') { allPrograms(Start.hotEl, true); return true; }
      var inRight = Start.hotEl && Start.hotEl.closest('.xp-start__right');
      var col = Start.el.querySelector(k === 'ArrowRight' && !inRight ? '.xp-start__right .xp-sitem' : '.xp-start__left .xp-sitem');
      if (col) startHot(col); return true;
    }
    if (k === 'Enter' || k === ' ') { if (Start.hotEl) Start.hotEl.click(); return true; }
    if (k.length === 1) {
      var ch = k.toLowerCase();
      for (var j = 1; j <= items.length; j++) { var it = items[(i + j) % items.length]; if ((it.textContent || '').trim().toLowerCase()[0] === ch) { startHot(it); return true; } }
      return true;
    }
    return false;
  }

  /* =========================================================== overlays: boot, welcome, login, shutdown */
  function overlay(cls, html) { var o = h('div', 'xp-ov ' + cls, html || ''); R.root.appendChild(o); return o; }
  function Seq() {
    var sk = false, pend = [];
    return {
      wait: function (ms) { if (sk) return Promise.resolve(); return new Promise(function (r) { var t = setTimeout(r, ms); pend.push(function () { clearTimeout(t); r(); }); }); },
      skip: function () { if (sk) return; sk = true; pend.splice(0).forEach(function (f) { f(); }); },
      get skipped() { return sk; }
    };
  }
  function userTile(cls) {
    return '<button class="xp-login__user ' + (cls || '') + '" tabindex="-1"><span class="xp-start__pic">' + ICON.avatar() + '</span><span><span class="xp-login__name">' + esc(tr(USER)) + '</span><small>' + esc(L('account')) + '</small></span></button>';
  }
  function welcomeHTML(line) {
    return '<div class="xp-welcome__band xp-welcome__band--t"></div><div class="xp-welcome__mid"><div class="xp-welcome__l"><div class="xp-welcome__logo">' + ICON.logo() + '</div><div class="xp-welcome__w">' + esc(L('welcome')) + '</div></div>' +
      '<div class="xp-login__div"></div><div class="xp-welcome__r">' + userTile('xp--static') + '<div class="xp-welcome__line">' + esc(line) + '</div></div></div><div class="xp-welcome__band xp-welcome__band--b"></div>';
  }
  function preDesktop(v) { R.root.classList.toggle('xp--pre', !!v); }
  function boot(fast) {
    if (S.busy) return Promise.resolve();
    S.busy = true; preDesktop(true);
    var sq = Seq(), ov = overlay('xp-boot', '<div class="xp-crtline"></div><div class="xp-boot__in"><div class="xp-boot__logo"><div class="xp-boot__mark">' + ICON.logo() + '</div>' + wordmark(true) + '</div><div class="xp-boot__bar"><i></i><i></i><i></i></div></div>' +
      '<div class="xp-boot__foot"><span>' + esc(L('copyright')) + '</span><span class="xp-boot__dev"></span></div><div class="xp-boot__skip">' + esc(L('skip')) + '</div>');
    ov.querySelector('.xp-boot__dev').textContent = PC_NAME + ' · ' + L('statusLine_' + status());
    var offK = noop, offP = noop;
    function armSkip() { offK = on(R.root, 'keydown', function () { sq.skip(); }); offP = on(ov, 'pointerdown', function () { Snd.unlock(); sq.skip(); }); }
    var wel = null, st = status();
    var p = Promise.resolve()
      .then(function () {
        if (fast || st !== 'sleep') return;
        // the owner is asleep: the computer is in stand-by, wake it first (the wake gesture also unlocks audio)
        ov.classList.add('xp--sleep');
        ov.querySelector('.xp-boot__skip').textContent = S.touch ? L('sleepScreenTouch') : L('sleepScreen');
        return new Promise(function (res) {
          var t0 = now(), sx = null;
          function wake(e) {
            if (now() - t0 < 300) return;
            if (e && e.type === 'pointermove') { var q = localPt(e); if (sx == null) { sx = q; return; } if (Math.abs(q.x - sx.x) + Math.abs(q.y - sx.y) < 12) return; }
            offs.forEach(function (f) { f(); }); Snd.unlock(); sound('crtOn');
            ov.classList.remove('xp--sleep'); ov.querySelector('.xp-boot__skip').textContent = L('skip'); res();
          }
          var offs = [on(ov, 'pointermove', wake), on(ov, 'pointerdown', wake), on(R.root, 'keydown', wake)];
        });
      })
      .then(function () { armSkip(); if (reduced()) { ov.classList.add('xp--on'); return sq.wait(300); } return sq.wait(200).then(function () { ov.classList.add('xp--on'); sound('crtOn'); return sq.wait(fast ? 600 : 1100); }); })
      .then(function () {
        if (!fast && st === 'outside') {
          // the owner is out: a locked screen with a guest log-on
          var lk = overlay('xp-welcome xp-login xp-lock', '<div class="xp-welcome__band xp-welcome__band--t"></div><div class="xp-welcome__mid"><div class="xp-login__l"><div class="xp-welcome__logo">' + ICON.logo() + '</div>' + wordmark(true) + '<p><b>' + esc(L('locked')) + '</b><br>' + esc(L('lockedWhy')) + '</p></div><div class="xp-login__div"></div><div class="xp-welcome__r"><button class="xp-login__user xp-login__guest" tabindex="-1"><span class="xp-start__pic">' + ICON.avatar() + '</span><span><span class="xp-login__name">' + esc(L('guest')) + '</span><small>' + esc(tr(USER)) + ' · ' + esc(L('statusLine_outside')) + '</small></span></button></div></div><div class="xp-welcome__band xp-welcome__band--b"></div>');
          rm(ov); offK(); offP();
          return new Promise(function (res) {
            function go() { offA(); offB(); Snd.unlock(); sound('click'); lk.querySelector('.xp-login__user').classList.add('xp--chosen'); setTimeout(function () { rm(lk); res(); }, D(250)); }
            var offA = on(lk.querySelector('.xp-login__user'), 'click', go);
            var offB = on(R.root, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') go(); });
          }).then(function () { sq = Seq(); });
        }
      })
      .then(function () {
        if (sq.skipped) return;
        wel = overlay('xp-welcome', welcomeHTML(L('loadingSettings')));
        rm(ov);
        on(wel, 'pointerdown', function () { sq.skip(); });
        return sq.wait(reduced() ? 300 : 900);
      })
      .then(function () {
        offK(); offP(); rm(ov);
        S.busy = false; S.booted = true; sess('booted', '1');
        if (wel) { wel.classList.add('xp--fadeout'); setTimeout(function () { rm(wel); }, D(220) + 20); }
        reveal(true);
      });
    return p;
  }
  function reveal(intro) {
    preDesktop(false);
    if (intro) {
      R.taskbar.classList.remove('xp--intro'); void R.taskbar.offsetWidth; R.taskbar.classList.add('xp--intro');
      layoutIcons(true);
      sound('start');
      if (!sess('welcomed')) {
        sess('welcomed', '1');
        setTimeout(function () { if (S.open && !S.busy) Balloon.show({ title: L('welcomeBalloonT'), text: S.touch ? L('welcomeBalloonTouch') : L('welcomeBalloon') }); }, D(1400));
      }
    } else layoutIcons(false);
  }
  function shutdownDialog(kind) {
    if (S.busy || R.root.querySelector('.xp-shutdlg')) return;
    closeStart(true); closeMenus(0);
    R.screen.classList.add('xp--grey');
    var isOff = kind === 'off';
    var d = h('div', 'xp-shutdlg', '<div class="xp-shutdlg__h"><span>' + esc(isOff ? L('turnOffTitle') : L('logOffTitle')) + '</span><span class="xp-shutdlg__logo">' + ICON.logo() + '</span></div><div class="xp-shutdlg__b"></div><div class="xp-shutdlg__f"><button class="xp-btn">' + esc(L('cancel')) + '</button></div>');
    var body = d.querySelector('.xp-shutdlg__b');
    var choices = isOff ? [['standby', 'amber', ICON.moonG(), L('standBy')], ['off', 'red', (ICON.ginaOff || ICON.power)(), L('shutDown')], ['restart', 'green', ICON.restartG(), L('restart')]]
      : [['switch', 'green', (ICON.ginaSwitch || ICON.restartG)(), L('switchUser')], ['logoff', 'amber', (ICON.ginaLogoff || ICON.key)(), L('logOff')]];
    var holder = h('div', 'xp-shutblock');
    R.root.appendChild(holder);
    function done() { rm(d); rm(holder); S.dlgKey = null; }
    function cancel() { done(); R.screen.classList.remove('xp--grey'); sound('click'); }
    choices.forEach(function (c) {
      var b = h('button', 'xp-shutbtn', '<span class="xp-shutbtn__i xp--' + c[1] + '">' + c[2] + '</span><span>' + esc(c[3]) + '</span>');
      b.addEventListener('click', function () { done(); sysAction(c[0]); });
      body.appendChild(b);
    });
    d.querySelector('.xp-btn').addEventListener('click', cancel);
    holder.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    S.dlgKey = function (e) { if (e.key === 'Escape') { cancel(); return true; } return false; };
    setTimeout(function () { R.root.appendChild(d); var f = d.querySelectorAll('.xp-shutbtn')[isOff ? 1 : 1]; if (f) f.focus({ preventScroll: true }); }, D(150));
  }
  function turnOffDialog() { shutdownDialog('off'); }
  function logOffDialog() { shutdownDialog('logoff'); }
  function sysAction(a) {
    if (a === 'standby') { R.screen.classList.remove('xp--grey'); standBy(); }
    else if (a === 'off') powerOff();
    else if (a === 'restart') restart();
    else if (a === 'logoff') logOff(true);
    else if (a === 'switch') logOff(false);
  }
  function closeAll() { S.wins.slice().forEach(function (w) { w.close(true); }); S.openApps = {}; S.game = null; }
  function savingScreen(text, ms) {
    var ov = overlay('xp-welcome xp-saving', '<div class="xp-welcome__band xp-welcome__band--t"></div><div class="xp-welcome__mid xp--center"><div class="xp-welcome__logo">' + ICON.logo() + '</div><div class="xp-saving__t">' + esc(text) + '</div></div><div class="xp-welcome__band xp-welcome__band--b"></div>');
    return wait(D(ms)).then(function () { return ov; });
  }
  function crtOff(target) {
    if (reduced()) return Promise.resolve();
    var dot = h('div', 'xp-crtdot');
    return animate(target, [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'scale(1, .004)', filter: 'brightness(3)' }], 160, 'ease-in')
      .then(function () { return animate(target, [{ transform: 'scale(1, .004)', filter: 'brightness(3)' }, { transform: 'scale(0, .004)', filter: 'brightness(4)' }], 140, 'ease-in'); })
      .then(function () { R.root.appendChild(dot); return animate(dot, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.4)' }], 300, 'ease-out'); })
      .then(function () { rm(dot); });
  }
  function powerOff() {
    S.busy = true;
    sound('shutdown');
    savingScreen(L('savingSettings'), 900).then(function (ov) {
      var black = h('div', 'xp-ov xp-black'); R.root.insertBefore(black, ov);
      return crtOff(ov).then(function () {
        closeAll(); rm(ov); R.screen.classList.remove('xp--grey');
        S.busy = false; S.booted = false; sess('booted', '0');
        var exit = S.opts.onExit; var wasOpen = S.open;
        setTimeout(function () { rm(black); }, 400);
        if (exit) { try { exit('off'); } catch (e) { console.error(e); } }      // the host knows the screen is black now
        if (S.open && wasOpen) close({ instant: true });
      });
    });
  }
  function restart() {
    S.busy = true;
    sound('shutdown');
    savingScreen(L('savingSettings'), 900).then(function (ov) {
      closeAll(); R.screen.classList.remove('xp--grey');
      var black = overlay('xp-black');
      rm(ov); S.busy = false; S.booted = false;
      return wait(D(700)).then(function () { rm(black); return boot(); });
    });
  }
  function logOff(closeApps) {
    S.busy = true;
    sound('shutdown');
    savingScreen(closeApps ? L('loggingOff') : L('savingSettings'), 900).then(function (ov) {
      if (closeApps) closeAll();
      R.screen.classList.remove('xp--grey');
      preDesktop(true);
      var lg = overlay('xp-welcome xp-login', '<div class="xp-welcome__band xp-welcome__band--t"></div><div class="xp-welcome__mid"><div class="xp-login__l"><div class="xp-welcome__logo">' + ICON.logo() + '</div>' + wordmark(true) + '<p>' + esc(L('toBegin')) + '</p></div><div class="xp-login__div"></div><div class="xp-welcome__r">' + userTile() + '</div></div>' +
        '<div class="xp-welcome__band xp-welcome__band--b"><button class="xp-login__off" tabindex="-1"><span class="xp-shutbtn__i xp--red">' + (ICON.smOff || ICON.power)() + '</span><span>' + esc(L('turnOffBtn')) + '</span></button><span class="xp-login__hint">' + esc(L('afterLogOff')) + '</span></div>');
      rm(ov);
      S.busy = false;
      var u = lg.querySelector('.xp-login__user');
      u.addEventListener('click', function () {
        sound('click');
        u.classList.add('xp--chosen');
        S.busy = true;
        setTimeout(function () {
          lg.innerHTML = welcomeHTML(L('loadingSettings'));
          setTimeout(function () { S.busy = false; lg.classList.add('xp--fadeout'); setTimeout(function () { rm(lg); }, D(220) + 20); reveal(true); }, D(900));
        }, D(250));
      });
      lg.querySelector('.xp-login__off').addEventListener('click', function () { rm(lg); powerOff(); });
      S.loginEl = lg;
    });
  }
  function standBy() {
    var ov = overlay('xp-black xp-standby', '<span>' + esc(L('standingBy')) + '</span>');
    sound('shutdown');
    setTimeout(function () {
      var off = on(ov, 'pointerdown', wake), offK = on(R.root, 'keydown', wake);
      function wake() { off(); offK(); sound('crtOn'); ov.classList.add('xp--fadeout'); setTimeout(function () { rm(ov); }, D(500)); }
    }, 600);
  }
  function bsod() {
    if (R.root.querySelector('.xp-bsod')) return;
    closeStart(true); closeMenus(0); Balloon.clear();
    sound('error');
    var en = S.lang === 'en';
    var txt = en ?
      'A problem has been detected and ' + BRAND + ' has been shut down to prevent damage\nto your impression of this portfolio.\n\nOWNER_TOO_RELAXED\n\nIf this is the first time you\'ve seen this Stop error screen, restart your computer.\nIf this screen appears again, follow these steps:\n\nCheck to make sure the coffee is hot and the sea is still there. Ask Daniil to fix it:\nhe is a fullstack developer, after all.\n\nTechnical information:\n\n*** STOP: 0x0000D0E7 (0x07880983, 0x00000000, 0xC0FFEE00, 0x00000001)\n\n***  donya.sys - Address 7.88N base at 98.39E, DateStamp 2026-11\n\n'
      : 'Обнаружена проблема, и ' + BRAND + ' была остановлена, чтобы не испортить\nвпечатление от этого портфолио.\n\nOWNER_TOO_RELAXED\n\nЕсли вы видите этот экран впервые, перезагрузите компьютер.\nЕсли он появится снова, выполните следующее:\n\nУбедитесь, что кофе горячий, а море на месте. Попросите Даниила всё починить:\nон всё-таки fullstack-разработчик.\n\nТехническая информация:\n\n*** STOP: 0x0000D0E7 (0x07880983, 0x00000000, 0xC0FFEE00, 0x00000001)\n\n***  donya.sys - Address 7.88N base at 98.39E, DateStamp 2026-11\n\n';
    var ov = overlay('xp-bsod');
    ov.textContent = txt;
    var k = h('span', '', esc(L('bsodKey')) + ' <span class="xp-caret">_</span>'); ov.appendChild(k);
    S.busy = true;
    setTimeout(function () {
      var off = on(ov, 'pointerdown', go), offK = on(R.root, 'keydown', go);
      function go(e) { if (e) { e.preventDefault(); e.stopPropagation(); } off(); offK(); closeAll(); var b = overlay('xp-black'); rm(ov); S.busy = false; S.booted = false; setTimeout(function () { rm(b); boot(true); }, D(600)); }
    }, 700);
  }

  /* =========================================================== screensaver */
  var Saver = { el: null, raf: 0 };
  function startSaver(kind) {
    if (Saver.el) return;
    kind = kind || S.prefs.saver; if (kind === 'none') return;
    closeMenus(0); Tip.hide();
    var ov = Saver.el = overlay('xp-saver'), cv = h('canvas'); ov.appendChild(cv);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = S.w, H = S.h;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var stars = [], i;
    for (i = 0; i < 220; i++) stars.push({ x: (Math.random() - .5) * W, y: (Math.random() - .5) * H, z: Math.random() * W });
    var lx = Math.random() * (W - 220), ly = Math.random() * (H - 90), vx = 1.2, vy = 1, hue = 40, t0 = now();
    var flag = null; if (window.XP_ICO && window.XP_ICO.logo) { flag = new Image(); flag.src = window.XP_ICO.logo; }
    function frame() {
      if (!Saver.el) return;
      if (kind === 'stars') {
        c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, H);
        stars.forEach(function (s) {
          s.z -= reduced() ? 0.5 : 6; if (s.z <= 1) { s.x = (Math.random() - .5) * W; s.y = (Math.random() - .5) * H; s.z = W; }
          var k = 160 / s.z, x = s.x * k + W / 2, y = s.y * k + H / 2, r = Math.max(.4, 2.2 - s.z / W * 2.2);
          if (x < 0 || x > W || y < 0 || y > H) { s.z = 0; return; }
          c.fillStyle = 'rgba(255,255,255,' + Math.min(1, 1.2 - s.z / W) + ')'; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
        });
      } else {
        c.fillStyle = '#0a1a4a'; c.fillRect(0, 0, W, H);      // the room's monitors show the same deep blue (site app.js SAVER_BG)
        // The host can drive the logo (S.opts.saverPos -> {u, v}, 0..1 of the free travel) and give the width its own copy
        // of the saver is drawn at (saverBase): then this one matches it in place and in relative size, with no jump.
        // The host shows its saver on a 16:9 glass and this screen sits centred on that glass with its own proportions,
        // so this canvas is a window into the host's picture: same scale, shifted by the bars it does not cover.
        var sb = S.opts && S.opts.saverPos && S.opts.saverBase, k = 1;
        if (sb) {
          var bw0 = sb, bh0 = sb * 9 / 16, A = 16 / 9, V = W / H, fw = V > A ? 1 : V / A, fh = V > A ? A / V : 1;
          k = W / (bw0 * fw);
          var uv = S.opts.saverPos() || { u: 0, v: 0 };
          lx = uv.u * (bw0 - 250) - bw0 * (1 - fw) / 2; ly = uv.v * (bh0 - 78) - bh0 * (1 - fh) / 2;
        } else {
          lx += vx; ly += vy;
          if (lx < 0 || lx > W - 250) { vx = -vx; lx = clamp(lx, 0, W - 250); }
          if (ly < 0 || ly > H - 80) { vy = -vy; ly = clamp(ly, 0, H - 80); }
        }
        c.save(); c.scale(k, k);
        if (flag && flag.complete && flag.naturalWidth) { c.imageSmoothingQuality = 'high'; c.drawImage(flag, lx, ly + 4, 70, 70 * flag.naturalHeight / flag.naturalWidth); }
        c.textBaseline = 'alphabetic';
        c.fillStyle = '#fff'; c.font = 'italic bold 34px "Trebuchet MS", Tahoma, sans-serif'; c.fillText('Windows', lx + 80, ly + 54);
        var ww = c.measureText('Windows').width;
        c.fillStyle = '#F7941D'; c.font = 'italic bold 20px "Trebuchet MS", Tahoma, sans-serif'; c.fillText('XD', lx + 82 + ww, ly + 38);
        c.restore();
      }
      Saver.raf = requestAnimationFrame(frame);
    }
    frame();
    var sx = null, sy = null;
    function stop(e) {
      if (e && e.type === 'pointermove') { var p = localPt(e); if (sx == null) { sx = p.x; sy = p.y; return; } if (Math.abs(p.x - sx) + Math.abs(p.y - sy) < 8) return; }
      if (now() - t0 < 400) return;
      stopSaver();
    }
    Saver.off = [on(ov, 'pointermove', stop), on(ov, 'pointerdown', stop), on(R.root, 'keydown', stop)];
  }
  function stopSaver() {
    if (!Saver.el) return;
    cancelAnimationFrame(Saver.raf); (Saver.off || []).forEach(function (f) { f(); });
    var el = Saver.el; Saver.el = null; el.classList.add('xp--fadeout'); setTimeout(function () { rm(el); }, D(300));
    S.lastInput = now();
  }
  function drawLogo(c, x, y, s, hue) {
    c.save(); c.translate(x, y);
    for (var i = 0; i < 5; i++) {
      c.save(); c.rotate(i * 72 * Math.PI / 180);
      var g = c.createRadialGradient(0, 0, 0, 0, 0, 14 * s);
      g.addColorStop(0, hue == null ? '#FFB81C' : 'hsl(' + hue + ',90%,55%)'); g.addColorStop(.45, hue == null ? '#FFE680' : 'hsl(' + hue + ',90%,75%)'); g.addColorStop(1, '#fff');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0);
      c.bezierCurveTo(-5.2 * s, -3.2 * s, -6.4 * s, -11.6 * s, -1.6 * s, -13.6 * s);
      c.bezierCurveTo(3.6 * s, -14.8 * s, 5.8 * s, -9.6 * s, 0, 0); c.fill();
      c.restore();
    }
    c.fillStyle = '#F7941D'; c.beginPath(); c.arc(0, 0, 2.4 * s, 0, 6.283); c.fill();
    c.restore();
  }

  /* =========================================================== built-in system programs */
  var SYS = {};
  function sysApp(id, params) {
    id = String(id || '').replace(/^sys[:\-]/, '');
    if (id === 'bsod') { bsod(); return null; }
    var def = SYS[id]; if (!def || !S.open) return null;
    var ex = S.openApps['sys:' + id];
    if (ex && !ex.closed) { ex.focus(); return ex; }
    var w = new Win({ kind: 'app', title: def.title, icon: def.icon(), w: def.w, h: def.h, resizable: def.resizable || false, maximizable: !!def.resizable, minW: def.minW, minH: def.minH, center: !def.cascade });
    S.openApps['sys:' + id] = w;
    w.sysId = id;
    w.o.escClose = true;
    var paint = function () { w.body.innerHTML = ''; w.cleanup && w.cleanup(); w.cleanup = def.render(w.body, w, params) || null; w.renderTitle(); };
    w.langCbs.push(paint);
    paint();
    sound('open');
    w.focus();
    animate(w.el, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], 120, EASE_OUT).then(function (a) { if (a && a.cancel) a.cancel(); });
    if (isPhone()) { w.state = 'normal'; }
    return w;
  }
  function findApp(q) {
    q = String(q || '').trim().toLowerCase().replace(/\.exe$/, '');
    if (!q) return null;
    var ids = S.appOrder.filter(function (id) { return S.apps[id]; });
    var hit = ids.filter(function (id) { return id.toLowerCase() === q; })[0] ||
      ids.filter(function (id) { var a = S.apps[id]; return [a.title && a.title.ru, a.title && a.title.en].some(function (t) { return t && t.toLowerCase() === q; }); })[0] ||
      ids.filter(function (id) { var a = S.apps[id]; return id.toLowerCase().indexOf(q) === 0 || [a.title && a.title.ru, a.title && a.title.en].some(function (t) { return t && t.toLowerCase().indexOf(q) === 0; }); })[0];
    return hit || null;
  }
  SYS.run = {
    title: T.runTitle && { ru: T.runTitle[0], en: T.runTitle[1] }, icon: ICON.run, w: 360, h: 176,
    render: function (body, w) {
      var box = h('div', 'xp-sys xp-run');
      box.innerHTML = '<div class="xp-sys__row xp-run__top"><span class="xp-run__ic">' + ICON.run() + '</span><span>' + esc(L('runText')) + '</span></div>' +
        '<div class="xp-sys__row"><label>' + esc(L('runOpen')) + '</label><input class="xp-field xp-run__in" list="xp-run-list" autocomplete="off" spellcheck="false"></div>' +
        '<div class="xp-sys__btns"><button class="xp-btn xp-btn--default xp-run__ok">' + esc(L('ok')) + '</button><button class="xp-btn xp-run__cancel">' + esc(L('cancel')) + '</button><button class="xp-btn" disabled>' + esc(L('browse')) + '</button></div>';
      var inp = box.querySelector('.xp-run__in');
      inp.value = store('lastRun') || '';
      function go() {
        var q = inp.value.trim(); if (!q) return;
        store('lastRun', q);
        var lq = q.toLowerCase().replace(/\.exe$/, '');
        var special = { bsod: 'bsod', crash: 'bsod', winver: 'about', ver: 'about', about: 'about', taskmgr: 'taskmgr', control: 'display', 'desk.cpl': 'display', display: 'display' };
        if (special[lq]) { w.close(true); sysApp(special[lq]); return; }
        if (lq === 'shutdown' || lq === 'shutdown -s') { w.close(true); turnOffDialog(); return; }
        if (/^https?:\/\//.test(q)) { w.close(true); try { window.open(q, '_blank', 'noopener'); } catch (e) { } return; }
        var id = findApp(lq);
        if (id) { w.close(true); openApp(id); return; }
        dialog({ owner: w, title: q, icon: 'error', text: L('runNotFound', q) });
      }
      box.querySelector('.xp-run__ok').addEventListener('click', go);
      box.querySelector('.xp-run__cancel').addEventListener('click', function () { w.close(); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      body.appendChild(box);
      setTimeout(function () { inp.focus(); inp.select(); }, 30);
    }
  };
  SYS.about = {
    title: T.about && { ru: T.about[0], en: T.about[1] }, icon: ICON.logo, w: 420, h: 330,
    render: function (body, w) {
      var mem = navigator.deviceMemory ? navigator.deviceMemory * 1024 * 1024 + ' KB' : '524 288 KB';
      var box = h('div', 'xp-about');
      box.innerHTML = '<div class="xp-about__band"><div class="xp-boot__mark">' + ICON.logo() + '</div>' + wordmark(true) + '</div>' +
        '<div class="xp-about__txt"><b>' + esc(VERSION) + '</b><br>' + esc(L('aboutText')) + '<hr>' + esc(L('aboutLicensed')) + '<br>&nbsp;&nbsp;' + esc(L('aboutVisitor')) + '<br>&nbsp;&nbsp;' + PC_NAME + '<hr>' + esc(L('aboutMem', mem)) + '<br>' + esc(L('appsCount', S.appOrder.length)) + '</div>' +
        '<div class="xp-sys__btns xp-about__btns"><button class="xp-btn xp-btn--default">' + esc(L('ok')) + '</button></div>';
      box.querySelector('.xp-btn').addEventListener('click', function () { w.close(); });
      body.appendChild(box);
    }
  };
  SYS.taskmgr = {
    title: T.taskMgr && { ru: T.taskMgr[0], en: T.taskMgr[1] }, icon: ICON.taskmgr, w: 400, h: 420, resizable: true, cascade: true, minW: 300, minH: 320,
    render: function (body, w) {
      var tab = w._tab || 'apps', sel = null;
      var box = h('div', 'xp-sys xp-tm');
      box.innerHTML = '<div class="xp-tabs"><button class="xp-tab" data-t="apps">' + esc(L('tmApps')) + '</button><button class="xp-tab" data-t="perf">' + esc(L('tmPerf')) + '</button></div>' +
        '<div class="xp-tabpane"></div><div class="xp-statusbar"><span class="xp-tm__p"></span><span class="xp-tm__c"></span><span class="xp-tm__m"></span></div>';
      var pane = box.querySelector('.xp-tabpane');
      body.appendChild(box);
      var cpu = [], coffee = 72, timer = 0;
      function list() {
        var arr = S.wins.filter(function (x) { return x.kind !== 'dialog' && x !== w; }).map(function (x) { return { w: x, t: x.titleText(), ic: x.icon }; });
        arr.push({ shell: true, t: S.lang === 'en' ? 'Desktop shell (donya.sys)' : 'Оболочка рабочего стола (donya.sys)', ic: ICON.computer() });
        return arr;
      }
      function paintApps() {
        pane.innerHTML = '<div class="xp-list xp-tm__list" tabindex="0"><div class="xp-tm__hd"><span>' + esc(L('tmTask')) + '</span><span>' + esc(L('tmStatus')) + '</span></div></div><div class="xp-sys__btns"><button class="xp-btn" data-a="end">' + esc(L('tmEnd')) + '</button><button class="xp-btn" data-a="sw">' + esc(L('tmSwitch')) + '</button><button class="xp-btn" data-a="new">' + esc(L('tmNew')) + '</button></div>';
        var l = pane.querySelector('.xp-tm__list');
        list().forEach(function (it, i) {
          var r = h('div', 'xp-list__i' + (sel === i ? ' xp--on' : ''), it.ic + '<span class="xp-tm__n"></span><span class="xp-tm__s">' + esc(L('tmRunning')) + '</span>');
          r.querySelector('.xp-tm__n').textContent = it.t;
          r.addEventListener('pointerdown', function () { sel = i; Array.prototype.forEach.call(l.querySelectorAll('.xp-list__i'), function (x, j) { x.classList.toggle('xp--on', j === i); }); });
          r.addEventListener('dblclick', function () { if (it.w) it.w.focus(); });
          l.appendChild(r);
        });
        pane.querySelector('[data-a="end"]').addEventListener('click', function () {
          var it = list()[sel]; if (!it) return;
          if (it.shell) { dialog({ owner: w, title: L('taskMgr'), icon: 'warn', text: L('endTaskQ', it.t), buttons: [{ label: L('yes'), onClick: function () { setTimeout(bsod, 300); } }, { label: L('no'), primary: true, cancel: true }] }); return; }
          it.w.close(); sel = null; setTimeout(paintApps, 150);
        });
        pane.querySelector('[data-a="sw"]').addEventListener('click', function () { var it = list()[sel]; if (it && it.w) it.w.focus(); });
        pane.querySelector('[data-a="new"]').addEventListener('click', function () { sysApp('run'); });
      }
      function paintPerf() {
        pane.innerHTML = '<div class="xp-group"><span class="xp-group__t">' + esc(L('tmCpuGraph')) + '</span><canvas class="xp-graph" width="300" height="90"></canvas></div><div class="xp-group"><span class="xp-group__t">' + esc(L('tmCoffee')) + '</span><div class="xp-progress"><i></i></div></div>';
      }
      function tick() {
        var load = Math.round(clamp((cpu.length ? cpu[cpu.length - 1] : 8) + (Math.random() - .5) * 18 + (S.wins.length * 1.5 - 4) * .2, 2, 96));
        cpu.push(load); if (cpu.length > 60) cpu.shift();
        coffee = Math.max(4, coffee - .15);
        box.querySelector('.xp-tm__p').textContent = L('tmProc', 18 + S.wins.length * 2);
        box.querySelector('.xp-tm__c').textContent = L('tmCpu', load);
        box.querySelector('.xp-tm__m').textContent = L('tmMem', (180 + S.wins.length * 23) + 'M / 1024M');
        var cv = pane.querySelector('canvas');
        if (cv) {
          var c = cv.getContext('2d'), W = cv.width, H = cv.height;
          c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.strokeStyle = '#0a5e1e'; c.lineWidth = 1;
          for (var x = (W - (cpu.length % 2) * 6) % 12; x < W; x += 12) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, H); c.stroke(); }
          for (var y = 0; y < H; y += 12) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(W, y + .5); c.stroke(); }
          c.strokeStyle = '#3cff3c'; c.lineWidth = 1.5; c.beginPath();
          cpu.forEach(function (v, i) { var px = W - (cpu.length - 1 - i) * 5, py = H - v / 100 * H; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
          c.stroke();
        }
        var bar = pane.querySelector('.xp-progress i'); if (bar) bar.style.width = coffee + '%';
        if (tab === 'apps' && pane.querySelector('.xp-tm__list') && pane.querySelectorAll('.xp-list__i').length !== list().length) paintApps();
      }
      function setTab(t) {
        tab = w._tab = t;
        Array.prototype.forEach.call(box.querySelectorAll('.xp-tab'), function (b) { b.classList.toggle('xp--on', b.dataset.t === t); });
        if (t === 'apps') paintApps(); else paintPerf();
        tick();
      }
      Array.prototype.forEach.call(box.querySelectorAll('.xp-tab'), function (b) { b.addEventListener('click', function () { sound('click'); setTab(b.dataset.t); }); });
      setTab(tab);
      timer = setInterval(tick, 1000);
      return function () { clearInterval(timer); };
    }
  };
  SYS.display = {
    title: T.display && { ru: T.display[0], en: T.display[1] }, icon: ICON.display, w: 400, h: 450,
    render: function (body, w) {
      var draft = { wall: S.prefs.wall, tint: S.prefs.tint, crt: S.prefs.crt, saver: S.prefs.saver, saverMin: S.prefs.saverMin };
      var tab = w._tab || 'desk';
      var box = h('div', 'xp-sys xp-disp');
      box.innerHTML = '<div class="xp-tabs"><button class="xp-tab" data-t="desk">' + esc(L('desktopTab')) + '</button><button class="xp-tab" data-t="saver">' + esc(L('saverTab')) + '</button></div><div class="xp-tabpane"></div>' +
        '<div class="xp-sys__btns"><button class="xp-btn xp-btn--default" data-a="ok">' + esc(L('ok')) + '</button><button class="xp-btn" data-a="cancel">' + esc(L('cancel')) + '</button><button class="xp-btn" data-a="apply" disabled>' + esc(L('apply')) + '</button></div>';
      var pane = box.querySelector('.xp-tabpane'), applyB = box.querySelector('[data-a="apply"]');
      body.appendChild(box);
      function dirty() { applyB.disabled = false; }
      function monitor(inner) { return '<div class="xp-mon"><div class="xp-mon__case"></div><div class="xp-mon__screen">' + inner + '</div><div class="xp-mon__stand"></div></div>'; }
      function paint() {
        Array.prototype.forEach.call(box.querySelectorAll('.xp-tab'), function (b) { b.classList.toggle('xp--on', b.dataset.t === tab); });
        if (tab === 'desk') {
          pane.innerHTML = monitor(wallSVG(draft.wall, draft.tint ? timeOfDay() : 'day').replace(/id="x([wab])-/g, 'id="xpv$1-').replace(/url\(#x([wab])-/g, 'url(#xpv$1-')) + '<div>' + esc(L('background')) + '</div><div class="xp-list xp-disp__list" tabindex="0"></div>' +
            '<label class="xp-check"><input type="checkbox" data-k="crt"><span>' + esc(L('crt')) + '</span></label>';
          var l = pane.querySelector('.xp-disp__list');
          ['none'].concat(WALLS.map(function (w) { return w[0]; })).forEach(function (k) {
            var r = h('div', 'xp-list__i' + (draft.wall === k ? ' xp--on' : ''), (k === 'none' ? ICON.window() : ICON.display()) + '<span>' + esc(wallLabel(k)) + '</span>');
            r.addEventListener('pointerdown', function () { draft.wall = k; dirty(); paint(); });
            l.appendChild(r);
          });
          ['crt'].forEach(function (k) { var c = pane.querySelector('[data-k="' + k + '"]'); c.checked = !!draft[k]; c.addEventListener('change', function () { draft[k] = c.checked; dirty(); if (k === 'tint') paint(); }); });
        } else {
          pane.innerHTML = monitor('<div class="xp-mon__saver"></div>') + '<div class="xp-group"><span class="xp-group__t">' + esc(L('saver')) + '</span><div class="xp-sys__row"><select class="xp-field xp-disp__sel"></select><button class="xp-btn" data-a="prev">' + esc(L('preview')) + '</button></div>' +
            '<div class="xp-sys__row"><span>' + esc(L('wait')) + '</span><input class="xp-field xp-disp__min" type="number" min="1" max="60"><span>' + esc(L('minutes')) + '</span></div></div>';
          var sel = pane.querySelector('select');
          ['none', 'logo', 'stars'].forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = L('saver_' + k); sel.appendChild(o); });
          sel.value = draft.saver;
          sel.addEventListener('change', function () { draft.saver = sel.value; dirty(); paint(); });
          var mi = pane.querySelector('.xp-disp__min'); mi.value = draft.saverMin;
          mi.addEventListener('change', function () { draft.saverMin = clamp(parseInt(mi.value, 10) || 3, 1, 60); dirty(); });
          pane.querySelector('[data-a="prev"]').addEventListener('click', function () { startSaver(draft.saver === 'none' ? 'logo' : draft.saver); });
          var ms = pane.querySelector('.xp-mon__saver');
          if (draft.saver === 'logo') ms.innerHTML = '<div class="xp-mon__mini">' + ICON.logo() + '</div>';
          else if (draft.saver === 'stars') ms.innerHTML = '<div class="xp-mon__stars"><i></i><i></i><i></i></div>';
        }
      }
      function apply() { Object.assign(S.prefs, draft); savePrefs(); paintWall(true); applyCrt(); applyB.disabled = true; }
      Array.prototype.forEach.call(box.querySelectorAll('.xp-tab'), function (b) { b.addEventListener('click', function () { sound('click'); tab = w._tab = b.dataset.t; paint(); }); });
      box.querySelector('[data-a="ok"]').addEventListener('click', function () { apply(); w.close(); });
      box.querySelector('[data-a="cancel"]').addEventListener('click', function () { w.close(); });
      applyB.addEventListener('click', apply);
      paint();
    }
  };
  function applyCrt() { if (R.crt) R.crt.hidden = !S.prefs.crt; }

  /* =========================================================== game hand-off */
  function gameMedia(img) {
    if (!img) return h('div');
    if (typeof img === 'string') { var i = document.createElement('img'); i.alt = ''; i.src = img; i.draggable = false; return i; }
    if (img.tagName === 'CANVAS') {
      var c = document.createElement('canvas'); c.width = img.width || 1; c.height = img.height || 1;
      try { c.getContext('2d').drawImage(img, 0, 0); } catch (e) { try { var im = document.createElement('img'); im.src = img.toDataURL(); return im; } catch (e2) { } }
      return c;
    }
    if (img.tagName === 'IMG') { var j = document.createElement('img'); j.src = img.src; j.alt = ''; return j; }
    return h('div');
  }
  function startGame(g, instant) {
    if (S.game && !S.game.closed) S.game.close(true);
    var w = new Win({ kind: 'game', title: g.name || 'Game', icon: gameIcon(g.kind), frameless: true, cover: true, resizable: false, maximizable: false });
    S.game = w;
    var box = h('div', 'xp-game' + (g.kind === 'term' ? ' xp-game--term' : '')), media = gameMedia(g.image);
    box.appendChild(media);
    // g.frame: the picture is the host monitor's own canvas, stretched over a glass of this aspect ratio and covering the
    // screen the way the host's camera ends up covering the window with that glass. Same box, same crop: the first frame of
    // this window is the last frame of the host's camera move.
    function frameMedia() {
      if (!g.frame) return;
      var W = S.w || R.root.clientWidth, H = S.h || R.root.clientHeight, A = g.frame, bw, bh;
      if (W / H > A) { bw = W; bh = W / A; } else { bh = H; bw = H * A; }
      media.style.inset = 'auto';
      css(media, { position: 'absolute', left: (W - bw) / 2 + 'px', top: (H - bh) / 2 + 'px', width: bw + 'px', height: bh + 'px', objectFit: 'fill' });
    }
    frameMedia();
    var fps = h('div', 'xp-game__fps', (g.kind === 'cs' ? 'fps ' : 'FPS ') + (110 + Math.round(Math.random() * 30)));
    if (g.kind === 'dota' || g.kind === 'cs' || g.kind === 'other') box.appendChild(fps);
    w.body.appendChild(box);
    var fpsT = setInterval(function () { fps.textContent = (g.kind === 'cs' ? 'fps ' : 'FPS ') + (112 + Math.round(Math.random() * 28)); }, 500);
    // a live source (a canvas the host keeps drawing): mirror it every frame, so the window is the very picture on the
    // host's monitor and not a frozen copy of it
    var liveOn = !!(g.live && g.image && g.image.tagName === 'CANVAS' && media.tagName === 'CANVAS'), src = g.image;
    // g.after: once the hand-off is over, the window shows this canvas instead (the host's copy in the window's own shape),
    // filling the window plainly: readable on a phone, where the monitor's wide picture would be cropped
    function useAfter() {
      if (!g.after || src === g.after) return;
      src = g.after; media.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block';
    }
    w.useAfter = useAfter;
    (function mirror() {
      if (!liveOn || w.closed) return;
      if (w.state !== 'min') { try { if (media.width !== src.width || media.height !== src.height) { media.width = src.width; media.height = src.height; } media.getContext('2d').drawImage(src, 0, 0); } catch (e) { liveOn = false; } }
      requestAnimationFrame(mirror);
    })();
    w.cleanup = function () { clearInterval(fpsT); liveOn = false; };
    box.addEventListener('click', function () { if (w.state !== 'min' && !S.busy) w.minimize(); });
    w.o.onEsc = function () { w.minimize(); };
    w.o.onRestore = function () {
      setTimeout(function () {
        var hint = h('div', 'xp-game__hint', esc(L('gameHint'))); box.appendChild(hint);
        setTimeout(function () { hint.classList.add('xp--out'); setTimeout(function () { rm(hint); }, 400); }, 2200);
      }, D(220));
    };
    w.o.onMinimize = function () { setTimeout(function () { layoutIcons(false); }, 0); };
    w.focus();
    if (instant) { w.minimize(true); useAfter(); return; }
    R.root.classList.add('xp--gamehold');
    hideIcons(true);
    var hold = reduced() ? 400 : (g.hold || 900);       // the host may ask to keep it up longer, e.g. until its camera has arrived
    S.busy = true;
    setTimeout(function () { if (!reduced()) animate(box, [{ transform: 'translate(2px, 1px)' }, { transform: 'translate(2px, 1px)' }], 34, 'linear').then(function (a) { if (a && a.cancel) a.cancel(); }); }, Math.min(700, hold - 60));
    setTimeout(function () {
      R.root.classList.remove('xp--gamehold');
      setTimeout(function () {
        S.busy = false;
        if (w.closed) return;
        if (g.dismiss === 'close') {        // a screen saver: it simply goes away and the desktop is there
          hideIcons(false); layoutIcons(true);
          box.style.transition = 'opacity ' + D(450) + 'ms ease'; box.style.opacity = 0;
          setTimeout(function () { if (!w.closed) w.close(true); }, D(470));
          return;
        }
        w.minimize();
        useAfter();                        // from now on (restored from the taskbar) the window shows the readable copy
        setTimeout(function () { hideIcons(false); layoutIcons(true); }, D(260));
        if (!sess('gametip')) { sess('gametip', '1'); setTimeout(function () { if (S.open) Balloon.show({ title: L(g.kind === 'term' ? 'appMin' : 'gameMin'), text: L('gameMinText', g.name || 'Game') }); }, D(1500)); }
      }, D(120));
    }, hold);
  }

  /* =========================================================== global input */
  function onKey(e) {
    S.lastInput = now();
    S.metaAlone = e.key === 'Meta' && !e.repeat;
    // switch the input language the way the visitor's own computer does: Alt+Shift or Ctrl+Shift (Windows),
    // Ctrl+Space or Ctrl+Option+Space (macOS); Win+Space and Cmd+Space never reach a web page
    var mod = e.key === 'Shift' && (e.altKey || e.ctrlKey) || (e.key === 'Alt' || e.key === 'Control') && e.shiftKey;
    var sp = e.code === 'Space' && e.ctrlKey && !e.metaKey && !e.shiftKey;
    if ((mod || sp) && !e.repeat) { if (sp) e.preventDefault(); setLang(S.lang === 'ru' ? 'en' : 'ru'); if (S.opts && S.opts.onLangChange) S.opts.onLangChange(S.lang); return; }
    if (S.busy || Saver.el) return;
    if (S.dlgKey && S.dlgKey(e)) { e.preventDefault(); return; }
    var k = e.key;
    if (Menus.length && menuKey(e)) { e.preventDefault(); return; }
    if (k === 'Escape' && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); sysApp('taskmgr'); return; }
    if (k === 'Escape' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleStart(true); return; }
    if (Start.el && startKey(e)) { e.preventDefault(); return; }
    if (k === 'F4' && e.altKey) { e.preventDefault(); if (S.active) S.active.close(); else turnOffDialog(); return; }
    if (k === 'Escape') {
      var a = S.active;
      if (a && a.o.onEsc) { e.preventDefault(); a.o.onEsc(); return; }
      if (a && a.o.escClose) { e.preventDefault(); a.close(); return; }
      if (volPop) { closeVol(); return; }
    }
    if (document.activeElement === R.desk && deskKey(e)) { e.preventDefault(); return; }
  }
  function onRootDown(e) {
    S.lastInput = now();
    Tip.hide();
    if (!e.target.closest('.xp-menu')) closeMenus(0);
    if (Start.el && !e.target.closest('.xp-start') && !e.target.closest('.xp-startbtn') && !e.target.closest('.xp-menu')) closeStart(true);   // a press inside its own submenu must not close the Start menu: the click would never land
    if (volPop && !e.target.closest('.xp-vol')) closeVol();
  }

  /* =========================================================== size classes */
  function computeSize() {
    if (!R.root) return;
    var w = R.root.clientWidth, hgt = R.root.clientHeight;
    if (!w || !hgt) return;
    var prev = S.size;
    S.w = w; S.h = hgt;
    S.size = w <= 520 ? 'phone' : w <= 820 ? 'compact' : 'desk';
    S.touch = !!(MQ_COARSE && MQ_COARSE.matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    R.root.classList.toggle('xp--phone', S.size === 'phone');
    R.root.classList.toggle('xp--compact', S.size === 'compact');
    R.root.classList.toggle('xp--tiny', w < 400);
    R.root.classList.toggle('xp--touch', S.touch);
    S.tbH = S.size === 'phone' ? 40 : 30;
    if (prev !== S.size || S._lastH !== hgt || S._lastW !== w) { S._lastH = hgt; S._lastW = w; layoutIcons(); clampWindows(); }
  }

  /* =========================================================== public API */
  function mount(rootEl, opts) {
    if (!rootEl) throw new Error('XPDesktop.mount: no root element');
    if (S.mounted) unmount();
    S.opts = opts || {};
    S.lang = S.opts.lang === 'en' ? 'en' : 'ru';
    var root = R.root = h('div', 'xp xp--hidden');
    root.tabIndex = -1;
    root.setAttribute('role', 'application');
    root.setAttribute('aria-label', BRAND);
    var screen = R.screen = h('div', 'xp-screen');
    R.wall = h('div', 'xp-wall');
    R.desk = h('div', 'xp-desk'); R.desk.tabIndex = 0; R.desk.setAttribute('aria-label', S.lang === 'en' ? 'Desktop' : 'Рабочий стол');
    R.icons = h('div', 'xp-icons'); R.wins = h('div', 'xp-wins');
    R.desk.appendChild(R.icons); R.desk.appendChild(R.wins);
    screen.appendChild(R.wall); screen.appendChild(R.desk); screen.appendChild(buildTaskbar());
    root.appendChild(screen);
    R.crt = h('div', 'xp-crt'); root.appendChild(R.crt); applyCrt();
    rootEl.appendChild(root);
    S.host = rootEl;
    buildQuickLaunch();
    wireDesk();
    root.addEventListener('keydown', onKey);
    root.addEventListener('keyup', function (e) { if (e.key === 'Meta' && S.metaAlone && !S.busy) { S.metaAlone = false; toggleStart(true); } });
    root.addEventListener('pointerdown', onRootDown, true);
    root.addEventListener('pointerover', Tip.over);
    root.addEventListener('pointermove', function (e) { S.lastInput = now(); Tip.move(e); });
    root.addEventListener('pointerleave', function () { Tip.hide(); });
    root.addEventListener('contextmenu', function (e) { if (!e.target.closest('input, textarea, [contenteditable="true"]')) e.preventDefault(); });
    root.addEventListener('dragstart', function (e) { if (!e.target.closest || !e.target.closest('[draggable="true"]')) e.preventDefault(); });
    var unlock = function () { Snd.unlock(); };
    S.offUnlock = [on(document, 'pointerdown', unlock, true), on(document, 'keydown', unlock, true)];
    if (window.ResizeObserver) { S.ro = new ResizeObserver(function () { computeSize(); }); S.ro.observe(root); }
    else S.offResize = on(window, 'resize', computeSize);
    S.timers.clock = setInterval(function () {
      updateTray();
      var st = status();
      if (S.lastStatus && st !== S.lastStatus && S.open && !S.busy) Balloon.show({ title: L('statusChanged_' + st), text: L('clockTipPre') + clockText() });
      S.lastStatus = st;
    }, 5000);
    S.lastStatus = status();
    S.timers.slow = setInterval(function () {
      paintWall();
      if (S.open && !S.busy && !Saver.el && S.prefs.saver !== 'none' && !document.hidden && now() - (S.lastInput || now()) > S.prefs.saverMin * 60000) startSaver();
    }, 5000);
    S.mounted = true;
    computeSize(); paintWall(true); updateTray(); layoutIcons();
    return api;
  }
  function unmount() {
    closeAll(); closeMenus(0); closeStart(true); stopSaver(); Balloon.clear();
    Object.keys(S.timers).forEach(function (k) { clearInterval(S.timers[k]); });
    (S.offUnlock || []).forEach(function (f) { f(); });
    if (S.ro) S.ro.disconnect(); if (S.offResize) S.offResize();
    rm(R.root); R = {}; Icons.els = {}; S.mounted = false; S.open = false;
  }
  function open(o) {
    o = o || {};
    if (!S.mounted) { console.warn('XPDesktop.open before mount'); return; }
    var wasOpen = S.open;
    S.open = true; S.lastInput = now();
    R.root.classList.remove('xp--hidden');
    if (o.instant) { R.root.style.transition = 'none'; void R.root.offsetWidth; R.root.style.transition = ''; }
    try { R.root.focus({ preventScroll: true }); } catch (e) { }
    if (navigator.userActivation ? navigator.userActivation.hasBeenActive : true) Snd.unlock();
    computeSize(); paintWall(); updateTray();
    if (o.game && o.game !== null) {
      S.booted = true; sess('booted', '1'); preDesktop(false);
      startGame(o.game, o.instant);
      return;
    }
    if (S.game && !S.game.closed && !wasOpen) { S.game.close(true); S.game = null; }
    if (!S.booted && !o.instant && !o.noBoot) { boot(); return; }
    if (!S.booted) { S.booted = true; sess('booted', '1'); }
    if (!S.busy) { preDesktop(false); layoutIcons(!wasOpen && !o.instant); }
  }
  function close(o) {
    if (!S.mounted) return;
    o = o || {};
    S.open = false;
    closeMenus(0); closeStart(true); closeVol(); stopSaver(); Tip.hide();
    if (o.instant) { R.root.style.transition = 'none'; R.root.classList.add('xp--hidden'); void R.root.offsetWidth; R.root.style.transition = ''; }
    else R.root.classList.add('xp--hidden');
    try { R.root.blur(); } catch (e) { }
  }
  function setLang(l) {
    l = l === 'en' ? 'en' : 'ru';
    if (l === S.lang) return;
    S.lang = l;
    if (!S.mounted) return;
    updateTray(); layoutIcons(); buildQuickLaunch();
    S.wins.forEach(function (w) { w.renderTitle(); w.langCbs.slice().forEach(function (cb) { try { cb(l); } catch (e) { console.error(e); } }); });
    S.langCbs.forEach(function (cb) { try { cb(l); } catch (e) { } });
    if (Start.el) { closeStart(true); openStart(); }
    closeMenus(0);
    R.desk.setAttribute('aria-label', l === 'en' ? 'Desktop' : 'Рабочий стол');
    if (S.loginEl && S.loginEl.parentNode) { var p = S.loginEl.querySelector('p'); if (p) p.textContent = L('toBegin'); }
  }
  var regT = 0;
  function registerApp(def) {
    if (!def || !def.id) { console.warn('XPDesktop.registerApp: id required'); return; }
    if (!S.apps[def.id]) S.appOrder.push(def.id);
    S.apps[def.id] = def;
    if (S.mounted) { clearTimeout(regT); regT = setTimeout(function () { layoutIcons(S.open && !S.busy && false); buildQuickLaunch(); }, 0); }
  }

  var api = {
    __shell: true,
    version: VERSION,
    mount: mount, open: open, close: close,
    isOpen: function () { return S.open; },
    setLang: setLang, lang: function () { return S.lang; },
    registerApp: registerApp,
    // extras (not part of the contract, handy for the room page and for debugging)
    openApp: function (id, p) { return openApp(id, p); },
    dialog: function (o) { return dialog(o); },
    balloon: function (o) { Balloon.show(o || {}); },
    sound: sound,
    bsod: function () { bsod(); },
    screensaver: function (k) { startSaver(k || 'logo'); },
    stopScreensaver: function () { stopSaver(); },
    unmount: unmount
  };
  window.XPDesktop = api;
})();

export {};
