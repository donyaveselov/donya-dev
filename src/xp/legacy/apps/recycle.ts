// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/recycle.js. Replace module by module; do not edit in place.
/* Recycle Bin: retired old projects as greyed file names. Nothing can be restored, and nothing is shown. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;
  function d(ru, en) { return { ru: ru, en: en }; }

  var FILES = [
    { name: 'башмак.exe', from: 'C:\\Projects\\2022', when: d('давно', 'long ago'), size: '1,4 MB', type: d('Приложение', 'Application') },
    { name: 'sandwich.glb', from: 'C:\\Projects\\2022', when: d('давно', 'long ago'), size: '6,2 MB', type: d('3D-модель', '3D model') },
    { name: 'aparts-template.zip', from: 'C:\\Projects\\2022', when: d('давно', 'long ago'), size: '880 KB', type: d('Архив', 'Archive') },
    { name: 'portfolio-2022.vue', from: 'C:\\Projects\\old', when: d('в этом году', 'this year'), size: '31 KB', type: d('Компонент Vue', 'Vue component') }
  ];

  var RESTORE_JOKES = [
    d('Невозможно восстановить «%s».\n\nФайл находится в заслуженном отпуске и просил не беспокоить.', 'Cannot restore "%s".\n\nThe file is on a well-deserved retirement and asked not to be disturbed.'),
    d('Восстановление «%s» отменено.\n\nЭтот проект писал Даниил из 2022 года. Даниил из 2026 года против.', 'Restoring "%s" was cancelled.\n\nThis project was written by Daniil from 2022. Daniil from 2026 objects.'),
    d('Ошибка 0x2022: «%s» слишком старый для этого рабочего стола.\n\nСвежие проекты лежат в папке «Мои проекты».', 'Error 0x2022: "%s" is too old for this desktop.\n\nFresh projects live in the My Projects folder.'),
    d('«%s» восстановлен на 0%.\n\nПроверьте папку «Мои проекты»: там гораздо интереснее.', '"%s" restored: 0%.\n\nCheck My Projects instead: it is much more interesting there.')
  ];

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-recycle', 560);
    var sel = -1, jokeI = 0, emptyTries = 0;

    function restore(i) {
      var f = FILES[i < 0 ? 0 : i];
      var j = RESTORE_JOKES[jokeI++ % RESTORE_JOKES.length];
      U.sound('error');
      U.dialog({ title: { ru: 'Ошибка восстановления', en: 'Error Restoring File' }, icon: 'error', text: t(j).replace('%s', i < 0 ? t({ ru: 'все объекты', en: 'all items' }) : f.name),
        buttons: [{ label: { ru: 'Открыть «Мои проекты»', en: 'Open My Projects' }, onClick: function () { api.openApp('projects'); } }, { label: 'OK', primary: true }] });
    }
    function empty() {
      U.dialog({ title: { ru: 'Подтверждение удаления', en: 'Confirm Multiple File Delete' }, icon: 'warn',
        text: t({ ru: 'Вы действительно хотите удалить эти ' + FILES.length + ' объекта навсегда?', en: 'Are you sure you want to delete these ' + FILES.length + ' items for good?' }),
        buttons: [{ label: { ru: 'Да', en: 'Yes' }, primary: true, onClick: function () {
          U.sound('recycle');
          emptyTries++;
          list.classList.remove('wobble'); void list.offsetWidth; if (!X.reduced()) list.classList.add('wobble');
          U.later(450, function () {
            U.dialog({ title: { ru: 'Корзина', en: 'Recycle Bin' }, icon: 'info',
              text: emptyTries > 2 ? t({ ru: 'Попытка №' + emptyTries + '. Они всё ещё здесь.\nНекоторые вещи остаются с нами навсегда. Как первый проект.', en: 'Attempt #' + emptyTries + '. They are still here.\nSome things stay with you forever. Like a first project.' })
                : t({ ru: 'Файлы не удалось удалить: они дороги владельцу как память.\nНо и показывать их никто не будет.', en: 'The files could not be deleted: the owner keeps them as memories.\nBut nobody is going to show them either.' }),
              buttons: [{ label: 'OK', primary: true }] });
          });
        } }, { label: { ru: 'Нет', en: 'No' } }] });
    }
    function props() {
      var f = FILES[sel];
      if (!f) { U.dialog({ title: { ru: 'Свойства: Корзина', en: 'Recycle Bin Properties' }, icon: 'info', text: t({ ru: 'Объектов: ' + FILES.length + '\nМаксимальный размер: сколько не жалко\nВосстановление: отключено владельцем', en: 'Items: ' + FILES.length + '\nMaximum size: whatever it takes\nRestore: disabled by the owner' }), buttons: [{ label: 'OK', primary: true }] }); return; }
      U.dialog({ title: t({ ru: 'Свойства: ', en: 'Properties: ' }) + f.name, icon: 'info',
        text: t(f.type) + '\n' + t({ ru: 'Исходное расположение: ', en: 'Origin: ' }) + f.from + '\n' + t({ ru: 'Удалён: ', en: 'Deleted: ' }) + t(f.when) + '\n' + t({ ru: 'Размер: ', en: 'Size: ' }) + f.size + '\n' + t({ ru: 'Причина: вырос из него', en: 'Reason: outgrew it' }) + '\n\n' + t({ ru: 'Атрибуты: только для ностальгии', en: 'Attributes: read-only nostalgia' }),
        buttons: [{ label: 'OK', primary: true }] });
    }
    function open(i) {
      U.sound('error');
      U.dialog({ title: FILES[i].name, icon: 'warn', text: { ru: 'Чтобы открыть этот файл, его нужно сначала восстановить из Корзины.\nА восстановить его нельзя.', en: 'To open this file you need to restore it from the Recycle Bin first.\nAnd it cannot be restored.' }, buttons: [{ label: { ru: 'Восстановить', en: 'Restore' }, onClick: function () { restore(i); } }, { label: 'OK', primary: true }] });
    }

    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Очистить корзину', en: 'Empty Recycle Bin' }, action: empty },
        { label: { ru: 'Восстановить', en: 'Restore' }, disabled: function () { return sel < 0; }, action: function () { restore(sel); } },
        { label: { ru: 'Свойства', en: 'Properties' }, action: props },
        { sep: true },
        { label: { ru: 'Закрыть', en: 'Close' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Выделить всё', en: 'Select All' }, key: 'Ctrl+A', action: function () { select(0); } },
        { label: { ru: 'Отменить удаление', en: 'Undo Delete' }, key: 'Ctrl+Z', action: function () { restore(-1); } }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About' }, action: function () { U.aboutDialog({ ru: 'Корзина', en: 'Recycle Bin' }, { ru: 'Здесь лежат старые проекты из прошлой версии портфолио.', en: 'Old projects from the previous portfolio live here.' }); } }
      ] }
    ]);
    var tb = U.toolbar([
      U.tbtn({ g: 'trash', label: { ru: 'Очистить корзину', en: 'Empty Recycle Bin' }, showLabel: true, big: true, onClick: empty }),
      U.tbtn({ g: 'restore', label: { ru: 'Восстановить всё', en: 'Restore all' }, showLabel: true, big: true, onClick: function () { restore(-1); } }),
      U.tsep(),
      U.tbtn({ g: 'props', label: { ru: 'Свойства', en: 'Properties' }, big: true, onClick: props })
    ]);
    var head = h('div.xpa-rb-head', [h('span', { ru: 'Имя', en: 'Name' }), h('span', { ru: 'Исходное расположение', en: 'Original Location' }), h('span', { ru: 'Дата удаления', en: 'Date Deleted' }), h('span', { ru: 'Размер', en: 'Size' })]);
    var list = h('div.xpa-rb-list', { role: 'listbox', tabindex: '0', 'aria-label': { ru: 'Удалённые файлы', en: 'Deleted files' } });
    var pane = h('div.xpa-taskpane.xpa-rb-pane', [
      h('div.xpa-tp-box', [h('div.xpa-tp-head', { role: 'heading' }, [h('span', { ru: 'Задачи корзины', en: 'Recycle Bin Tasks' })]), h('div.xpa-tp-body', [
        h('button.xpa-tp-link', { type: 'button', on: { click: empty } }, [U.glyph('trash'), h('span', { ru: 'Очистить корзину', en: 'Empty the Recycle Bin' })]),
        h('button.xpa-tp-link', { type: 'button', on: { click: function () { restore(-1); } } }, [U.glyph('restore'), h('span', { ru: 'Восстановить все объекты', en: 'Restore all items' })])
      ])]),
      h('div.xpa-tp-box', [h('div.xpa-tp-head', { role: 'heading' }, [h('span', { ru: 'Другие места', en: 'Other Places' })]), h('div.xpa-tp-body', [
        h('button.xpa-tp-link', { type: 'button', on: { click: function () { api.openApp('projects'); } } }, [U.glyph('folders'), h('span', { ru: 'Мои проекты', en: 'My Projects' })]),
        h('button.xpa-tp-link', { type: 'button', on: { click: function () { api.openApp('about'); } } }, [U.glyph('props'), h('span', { ru: 'Мой компьютер', en: 'My Computer' })])
      ])])
    ]);
    var st = U.statusbar(2);
    [menu, tb, h('div.xpa-rb-body', [pane, h('div.xpa-rb-view', [head, list])]), st.el].forEach(function (n) { root.appendChild(n); });

    function select(i) {
      sel = i;
      Array.prototype.forEach.call(list.children, function (el, k) { el.classList.toggle('sel', k === i); el.setAttribute('aria-selected', String(k === i)); });
      st.set(0, i >= 0 ? FILES[i].name + ' — ' + t({ ru: 'восстановление недоступно', en: 'cannot be restored' }) : FILES.length + ' ' + t({ ru: 'объекта', en: 'objects' }));
    }
    function build() {
      list.innerHTML = '';
      FILES.forEach(function (f, i) {
        var row = h('div.xpa-rb-row', { role: 'option', 'aria-selected': 'false' }, [
          h('span.xpa-rb-name', [h('span.xpa-g16', { html: X.icons.ghost }), h('span', f.name)]),
          h('span', f.from), h('span', t(f.when)), h('span', f.size)
        ]);
        row.addEventListener('click', function () { select(i); });
        row.addEventListener('dblclick', function () { open(i); });
        list.appendChild(row);
      });
      select(sel);
      st.set(1, '9,3 MB');
      api.win.setTitle(t({ ru: 'Корзина', en: 'Recycle Bin' }));
    }
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(FILES.length - 1, sel + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, sel - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (sel >= 0) open(sel); }
      else if (e.key === 'Delete') { e.preventDefault(); empty(); }
    });
    U.bind(build);
    U.later(30, function () { list.focus({ preventScroll: true }); });
    return U.destroy;
  }

  X.register({
    id: 'recycle',
    title: { ru: 'Корзина', en: 'Recycle Bin' },
    icon: X.icons.recycleFull,
    desktop: true,
    startMenu: false,
    defaultSize: { w: 600, h: 380 },
    minSize: { w: 300, h: 220 },
    singleton: true,
    render: render
  });
})();

export {};
