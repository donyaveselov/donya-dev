// My Computer: a System Properties dialog about the owner (General, Device Manager with the real stack,
// Performance, Remote).
import type { Bilingual, Status, XPAppApi } from '../../shared/types';
import { HEADLINE, OS, PERSON } from '../content/profile';
import { DEVICES, type StackItem } from '../content/stack';
import { registerApp } from '../shell/apps';
import { G16, ICONS } from './icons';
import { pad, phuketNow, reduced, ui } from './kit';
import { hms, nextLoad } from './about-stats';
import { EXPERIENCE } from '../../shared/experience';
import { d } from '../content/text';
import { APP } from './strings';

const T = {
  title: d('Мой компьютер', 'My Computer'),
  sysProps: d('Свойства системы', 'System Properties'),
  general: d('Общие', 'General'),
  hardware: d('Оборудование', 'Hardware'),
  perf: d('Быстродействие', 'Performance'),
  remote: d('Удалённый доступ', 'Remote'),
  apply: d('Применить', 'Apply'),
  applied: d(
    'Изменения применены.\nДаниил по-прежнему ищет интересные задачи.',
    'Changes applied.\nDaniil is still looking for interesting work.',
  ),
  compNameLabel: d('Имя компьютера', 'Computer name'),
  compName: d('Имя компьютера:', 'Computer name:'),
  system: d('Система:', 'System:'),
  servicePack: d(`Пакет обновления: ${EXPERIENCE.ru} опыта`, `Service Pack: ${EXPERIENCE.en} of experience`),
  registered: d('Зарегистрирован на:', 'Registered to:'),
  computer: d('Компьютер:', 'Computer:'),
  cpu: d('Процессор: 1 × Fullstack-разработчик', 'Processor: 1 × Fullstack developer'),
  cooling: d('Охлаждение: кофе, 2 чашки в день, разгон до 3', 'Cooling: coffee, 2 cups a day, overclocks to 3'),
  localTime: d('Местное время: ', 'Local time: '),
  status: d('Состояние: ', 'Status: '),
  uptime: d('Время работы окна: ', 'Window uptime: '),
  deviceManager: d('Диспетчер устройств', 'Device Manager'),
  devBad: d('Состояние: устройство работает неправильно.', 'Device status: this device is not working properly.'),
  devOk: d('Состояние: устройство работает нормально.', 'Device status: this device is working properly.'),
  pickDevice: d('Выберите устройство, чтобы увидеть его состояние.', 'Select a device to see its status.'),
  hwIntro: d(
    'Установленное «оборудование» — реальный стек. Щёлкните категорию, чтобы раскрыть.',
    'The installed "hardware" is the real stack. Click a category to expand it.',
  ),
  loadGraph: d('График загрузки', 'Load graph'),
  focusUsage: d('Загрузка фокуса', 'Focus usage'),
  focusHistory: d('Хронология загрузки', 'Focus usage history'),
  processes: d('Процессы', 'Processes'),
  statusKey: d('Состояние', 'Status'),
  note: d('Примечание', 'Note'),
  coffee: d('Кофе в чашке', 'Coffee in cup'),
  tabs: d('Открытые вкладки', 'Open tabs'),
  tabsValue: d('много (документация)', 'many (documentation)'),
  locked: d(
    'Этот параметр заблокирован владельцем.\nДаниил открыт к предложениям.',
    'This setting is locked by the owner.\nDaniil is open to offers.',
  ),
  timeZone: d('Часовой пояс', 'Time zone'),
  tzPhuket: d('(UTC+07:00) Пхукет — живу здесь', '(UTC+07:00) Phuket — I live here'),
  tzMoscow: d('(UTC+03:00) Москва — удобно созвониться', '(UTC+03:00) Moscow — easy to sync'),
  tzEurope: d('(UTC+01:00) Европа — тоже ок', '(UTC+01:00) Europe — fine too'),
  remoteIntro: d(
    'Выберите, как этот компьютер может использоваться удалённо.',
    'Select the ways this computer can be used from another location.',
  ),
  remoteWork: d('Удалённая работа', 'Remote work'),
  allowInvites: d('Разрешить приглашения на проекты и собеседования', 'Allow invitations to projects and interviews'),
  remoteNote: d(
    `Fullstack (${HEADLINE.join(' + ')}), удалённо или релокация.`,
    `Fullstack (${HEADLINE.join(' + ')}), remote or relocation.`,
  ),
  contact: d('Связаться…', 'Contact…'),
  resume: d('Резюме…', 'Resume…'),
} as const;

interface StatusInfo {
  label: Bilingual;
  /** The range the focus graph wanders in, in %. */
  load: [number, number];
  note: Bilingual;
}
const STATUS: Record<Status, StatusInfo> = {
  work: {
    label: d('Работает', 'At work'),
    load: [62, 94],
    note: d(
      'Пишет код. Не отвлекать, если только не с оффером.',
      'Writing code. Do not disturb, unless it is an offer.',
    ),
  },
  play: {
    label: d('Играет', 'Gaming'),
    load: [88, 100],
    note: d('Видеокарта занята. Код подождёт до конца катки.', 'The GPU is busy. Code waits until the match ends.'),
  },
  sleep: {
    label: d('Спит', 'Asleep'),
    load: [1, 6],
    note: d('Энергосбережение. Ответит утром по времени Пхукета.', 'Power saving. Will reply in the Phuket morning.'),
  },
  outside: {
    label: d('Вне дома', 'Away'),
    load: [8, 22],
    note: d('Где-то на острове. Телефон с собой.', 'Somewhere on the island. Has the phone.'),
  },
};

interface Device {
  name: StackItem['name'];
  note: Bilingual | null;
  bad?: boolean;
}
interface DeviceCat {
  cat: Bilingual;
  glyph: string;
  warn?: boolean;
  items: Device[];
}

// the real stack comes from content/stack (shared with the resume and the terminal); the two joke categories live here
const DEVICE_TREE: DeviceCat[] = [
  ...DEVICES.map((g) => ({ cat: g.cat, glyph: g.glyph, items: g.items.map((i) => ({ name: i.name, note: i.note })) })),
  {
    cat: d('Устройства ввода', 'Input devices'),
    glyph: 'props',
    items: [
      {
        name: d('Клавиатура', 'Keyboard'),
        note: d(
          'Буквы «Ctrl», «C» и «V» стёрты меньше, чем можно подумать.',
          'The Ctrl, C and V keys are less worn than you might think.',
        ),
      },
      {
        name: d('Резиновая уточка (отладка)', 'Rubber duck (debugging)'),
        note: d('Выслушивает молча. Помогает в 80% случаев.', 'Listens silently. Helps in 80% of cases.'),
      },
    ],
  },
  {
    cat: d('Другие устройства', 'Other devices'),
    glyph: 'warn',
    warn: true,
    items: [
      {
        name: d('Режим сна', 'Sleep schedule'),
        note: d(
          'Драйвер не найден. Устройство работает непредсказуемо (код 28).',
          'Driver not found. The device behaves unpredictably (code 28).',
        ),
        bad: true,
      },
    ],
  },
];

const LOGO =
  '<svg viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<rect x="8" y="4" width="104" height="70" rx="8" fill="#3b7be0" stroke="#1b4fa8"/>' +
  '<circle cx="84" cy="24" r="9" fill="#ffd767"/>' +
  '<path d="M8 56c22-16 52-20 104-8v18a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#4fae3c"/>' +
  '<path d="M8 64c30-10 64-10 104 0v2a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#3c9330"/>' +
  '<path d="M30 58c0-10 2-18 6-24M36 34c-6-2-12 0-14 4M36 34c4-4 10-4 13 0M36 34c-2-5-7-7-11-6M36 34c3-4 8-6 12-4" fill="none" stroke="#2b5a1f" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M12 10h96v18c-30 6-66 6-96 0z" fill="#fff" opacity=".18"/>' +
  '<text x="60" y="90" text-anchor="middle" font-family="Tahoma,Verdana,sans-serif" font-size="11" fill="#1b4fa8"><tspan font-weight="bold" font-style="italic">Windows</tspan><tspan fill="#f7941d" font-weight="bold" font-style="italic" font-size="8" dy="-4">XD</tspan></text></svg>';

type TabId = 'general' | 'hardware' | 'perf' | 'remote';
const TABS: readonly { id: TabId; label: Bilingual }[] = [
  { id: 'general', label: T.general },
  { id: 'hardware', label: T.hardware },
  { id: 'perf', label: T.perf },
  { id: 'remote', label: T.remote },
];
const isTab = (v: unknown): v is TabId => TABS.some((x) => x.id === v);

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-about', 400);
  const openedAt = Date.now();
  let cur: TabId = isTab(api.params?.tab) ? api.params.tab : 'general';
  const tabs = h('div.xpa-tabs', { role: 'tablist' });
  const panel = h('div.xpa-tabpanel', { role: 'tabpanel', tabindex: '0' });
  let dirty = false;
  const btnOk = U.button(
    'OK',
    () => {
      U.sound('click');
      api.win.close();
    },
    { primary: true },
  );
  const btnCancel = U.button(APP.cancel, () => {
    api.win.close();
  });
  const btnApply = U.button(T.apply, () => {
    dirty = false;
    btnApply.disabled = true;
    U.dialog({ title: T.sysProps, icon: 'info', text: T.applied, buttons: [{ label: 'OK', primary: true }] });
  });
  btnApply.disabled = true;
  const markDirty = (): void => {
    if (dirty) return;
    dirty = true;
    btnApply.disabled = false;
  };
  root.append(h('div.xpa-about-body', [tabs, panel]), h('div.xpa-about-foot', [btnOk, btnCancel, btnApply]));

  const tabEls = TABS.map((tb, i) => {
    const b = h('button.xpa-tab', { type: 'button', role: 'tab', 'aria-selected': 'false', tabindex: '-1' }, tb.label);
    b.addEventListener('click', () => {
      U.sound('click');
      show(tb.id);
    });
    b.addEventListener('keydown', (e) => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return;
      e.preventDefault();
      const j = (i + k + TABS.length) % TABS.length;
      const next = TABS[j];
      if (!next) return;
      show(next.id);
      tabEls[j]?.focus();
    });
    tabs.appendChild(b);
    return b;
  });

  let stopFns: (() => void)[] = [];
  const stopAll = (): void => {
    for (const f of stopFns) f();
    stopFns = [];
  };
  function show(id: TabId): void {
    cur = id;
    stopAll();
    tabEls.forEach((b, i) => {
      const on = TABS[i]?.id === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    panel.innerHTML = '';
    ({ general, hardware, perf, remote })[id]();
    api.win.setTitle(t(T.sysProps));
  }

  const status = (): StatusInfo => STATUS[api.status()];
  const uptime = (): string => hms(Math.floor((Date.now() - openedAt) / 1000));

  function general(): void {
    const timeEl = h('span');
    const upEl = h('span');
    const tick = (): void => {
      const p = phuketNow(api);
      timeEl.textContent = `${pad(p.h)}:${pad(p.m)} (UTC+7)`;
      upEl.textContent = uptime();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    stopFns.push(() => {
      clearInterval(id);
    });
    const compName = h('input.xpa-field.xpa-about-name', {
      type: 'text',
      value: OS.pcName,
      maxlength: '15',
      'aria-label': T.compNameLabel,
      spellcheck: 'false',
    });
    compName.addEventListener('input', () => {
      compName.value = compName.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      markDirty();
    });
    panel.appendChild(
      h('div.xpa-about-gen', [
        h('div.xpa-about-logo', { html: LOGO }),
        h('div.xpa-about-info.xpa-selectable', [
          h('div.xpa-about-h', T.system),
          h('div.xpa-about-v', [
            h('div', OS.name),
            h('div', t(OS.edition)),
            h('div', OS.version),
            h('div', T.servicePack),
          ]),
          h('div.xpa-about-h', T.registered),
          h('div.xpa-about-v', [
            h('div', t(PERSON.name)),
            h('div', t(PERSON.role)),
            h('div', t(PERSON.city)),
            h('div.xpa-muted', 'VUE3-DJANGO-NUXT-PY2022'),
          ]),
          h('div.xpa-about-h', T.computer),
          h('div.xpa-about-v', [
            h('div', T.cpu),
            h('div', T.cooling),
            h('div', [t(T.localTime), timeEl]),
            h('div', [t(T.status), h('b', t(status().label))]),
            h('div', [t(T.uptime), upEl]),
          ]),
        ]),
      ]),
    );
    panel.appendChild(h('div.xpa-about-row', [h('label', T.compName), compName]));
  }

  function hardware(): void {
    const info = h('div.xpa-about-devinfo');
    const tree = h('div.xpa-about-tree.xpa-sunken', { role: 'tree', tabindex: '0', 'aria-label': T.deviceManager });
    interface Row {
      el: HTMLDivElement;
      toggle?: (v?: boolean) => void;
      info?: () => void;
    }
    const rows: Row[] = [];
    let sel: Row | null = null;
    const pick = (r: Row | undefined): void => {
      if (!r) return;
      sel?.el.classList.remove('sel');
      sel = r;
      r.el.classList.add('sel');
      if (r.info) r.info();
      else {
        info.innerHTML = '';
        info.appendChild(h('div.xpa-muted', t(T.pickDevice)));
      }
      r.el.scrollIntoView({ block: 'nearest' });
    };
    DEVICE_TREE.forEach((cat, ci) => {
      let open = !!cat.warn || ci === 0;
      const kids = h('div.xpa-tree-kids', { role: 'group' });
      const tog = h('span.xpa-tree-tog', open ? '−' : '+');
      const glyph = U.glyph(cat.glyph === 'warn' ? 'props' : cat.glyph);
      if (cat.glyph === 'computer') glyph.innerHTML = ICONS.computer;
      const el = h('div.xpa-tree-row.cat', { role: 'treeitem', 'aria-expanded': String(open) }, [
        tog,
        glyph,
        h('span', t(cat.cat)),
      ]);
      const row: Row = {
        el,
        toggle: (v) => {
          open = v ?? !open;
          el.setAttribute('aria-expanded', String(open));
          tog.textContent = open ? '−' : '+';
          kids.style.display = open ? '' : 'none';
        },
      };
      el.addEventListener('click', () => {
        row.toggle?.();
        pick(row);
        U.sound('click');
      });
      rows.push(row);
      for (const it of cat.items) {
        const name = t(it.name);
        const rel = h('div.xpa-tree-row.dev', { role: 'treeitem' }, [
          h('span.xpa-tree-ico', { html: it.bad ? ICONS.warn : (G16.hardware ?? '') }),
          h('span', name),
        ]);
        if (it.bad) rel.classList.add('bad');
        const r: Row = {
          el: rel,
          info: () => {
            info.innerHTML = '';
            info.appendChild(h('b', name));
            info.appendChild(h('div', t(it.bad ? T.devBad : T.devOk)));
            if (it.note) info.appendChild(h('div.xpa-muted', t(it.note)));
          },
        };
        rel.addEventListener('click', () => {
          pick(r);
        });
        rows.push(r);
        kids.appendChild(rel);
      }
      kids.style.display = open ? '' : 'none';
      tree.append(el, kids);
    });
    tree.addEventListener('keydown', (e) => {
      const vis = rows.filter((r) => r.el.offsetParent !== null);
      const i = sel ? vis.indexOf(sel) : -1;
      const toggle = sel?.toggle;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        pick(vis[Math.min(vis.length - 1, i + 1)]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        pick(vis[Math.max(0, i - 1)]);
      } else if (toggle && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter')) {
        e.preventDefault();
        toggle(e.key === 'Enter' ? undefined : e.key === 'ArrowRight');
      }
    });
    panel.appendChild(
      h('div.xpa-about-hwhead', [
        h('span.xpa-ico', { html: ICONS.computer }),
        h('div', [h('b', T.deviceManager), h('div.xpa-muted', T.hwIntro)]),
      ]),
    );
    panel.appendChild(tree);
    panel.appendChild(info);
    pick(rows[rows.length - 1]);
  }

  function perf(): void {
    const S = status();
    const cv = h('canvas.xpa-about-graph', { width: '300', height: '110', 'aria-label': T.loadGraph });
    const pct = h('div.xpa-about-pct');
    const meterFill = h('div.xpa-about-meter-fill');
    const coffeeFill = h('div.xpa-about-coffee-fill');
    panel.appendChild(
      h('div.xpa-about-perf', [
        h('div.xpa-group.xpa-about-g1', [
          h('span.xpa-legend', T.focusUsage),
          h('div.xpa-about-mbox', [h('div.xpa-about-meter', [meterFill]), pct]),
        ]),
        h('div.xpa-group.xpa-about-g2', [h('span.xpa-legend', T.focusHistory), cv]),
        h('div.xpa-group', [
          h('span.xpa-legend', T.processes),
          h('dl.xpa-about-kv', [
            h('dt', T.statusKey),
            h('dd', t(S.label)),
            h('dt', T.note),
            h('dd', t(S.note)),
            h('dt', T.coffee),
            h('dd', [h('div.xpa-about-coffee', [coffeeFill])]),
            h('dt', T.tabs),
            h('dd', T.tabsValue),
          ]),
        ]),
      ]),
    );
    const hist: number[] = [];
    const ctx = cv.getContext('2d');
    let off = 0;
    let cup = 1;
    const sample = (): number => nextLoad(hist[hist.length - 1], S.load, Math.random());
    for (let i = 0; i < 60; i++) hist.push(sample());
    const draw = (): void => {
      const w = cv.width;
      const hh = cv.height;
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, hh);
        ctx.strokeStyle = '#008040';
        ctx.lineWidth = 1;
        for (let x = -off; x < w; x += 12) {
          ctx.beginPath();
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, hh);
          ctx.stroke();
        }
        for (let y = 0; y < hh; y += 12) {
          ctx.beginPath();
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(w, y + 0.5);
          ctx.stroke();
        }
        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();
        hist.forEach((v, i) => {
          const px = w - (hist.length - 1 - i) * 5;
          const py = hh - 2 - (v / 100) * (hh - 4);
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        });
        ctx.stroke();
      }
      const v = Math.round(hist[hist.length - 1] ?? 0);
      pct.textContent = `${String(v)}%`;
      meterFill.style.height = `${String(v)}%`;
      coffeeFill.style.width = `${String(Math.round(cup * 100))}%`;
    };
    const tick = (): void => {
      hist.push(sample());
      if (hist.length > 80) hist.shift();
      off = (off + 5) % 12;
      cup = cup <= 0.05 ? 1 : cup - 0.01 * (S.load[1] / 50);
      draw();
    };
    draw();
    if (!reduced()) {
      const id = window.setInterval(tick, 1000);
      stopFns.push(() => {
        clearInterval(id);
      });
    }
  }

  function remote(): void {
    const cb1 = h('input', { type: 'checkbox', id: 'xpa-rem-1', checked: true });
    cb1.addEventListener('change', () => {
      if (cb1.checked) return;
      cb1.checked = true;
      U.sound('error');
      U.dialog({ title: T.remote, icon: 'warn', text: T.locked, buttons: [{ label: 'OK', primary: true }] });
    });
    const tz = h('select.xpa-field', { 'aria-label': T.timeZone }, [
      h('option', T.tzPhuket),
      h('option', T.tzMoscow),
      h('option', T.tzEurope),
    ]);
    tz.addEventListener('change', markDirty);
    panel.appendChild(
      h('div.xpa-about-remote', [
        h('div.xpa-about-hwhead', [h('span.xpa-ico', { html: ICONS.contact }), h('div', T.remoteIntro)]),
        h('div.xpa-group', [
          h('span.xpa-legend', T.remoteWork),
          h('label.xpa-check', [cb1, h('span', T.allowInvites)]),
          h('div.xpa-muted', { style: { margin: '6px 0 0 20px' } }, T.remoteNote),
        ]),
        h('div.xpa-group', [h('span.xpa-legend', T.timeZone), tz]),
        h('div.xpa-about-rbtns', [
          U.button(T.contact, () => api.openApp('contact'), { primary: true }),
          U.button(T.resume, () => api.openApp('resume')),
        ]),
      ]),
    );
  }

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') api.win.close();
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      const i = TABS.findIndex((x) => x.id === cur);
      const next = TABS[(i + (e.shiftKey ? -1 : 1) + TABS.length) % TABS.length];
      if (next) show(next.id);
    }
  });
  U.bind(() => {
    show(cur);
  });
  U.onCleanup(stopAll);
  U.later(30, () => tabEls[TABS.findIndex((x) => x.id === cur)]?.focus({ preventScroll: true }));
  return U.destroy;
}

registerApp({
  id: 'about',
  title: T.title,
  icon: ICONS.computer,
  desktop: true,
  startMenu: 'pinned',
  defaultSize: { w: 440, h: 500 },
  minSize: { w: 300, h: 360 },
  singleton: true,
  render,
});
