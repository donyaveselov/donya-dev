// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/contact.js. Replace module by module; do not edit in place.
/* Contact: an Outlook-Express-like "New Message" window that only shows contacts to copy. */
(function () {
  'use strict';
  var X = window.XPApps;
  if (!X) return;

  var BADGES = {
    telegram: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2aa3df"/><path d="M5.5 11.6l11.2-4.4c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1l-6.6 4.1-2.8-.9c-.6-.2-.6-.6.1-.9z" fill="#fff"/></svg>',
    email: '<svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" fill="#fff" stroke="#c0392b"/><path d="M1.5 5l10.5 8 10.5-8" fill="none" stroke="#c0392b" stroke-width="1.6"/></svg>',
    github: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#24292e"/><path d="M12 5.5a6.6 6.6 0 0 0-2.1 12.9c.3 0 .5-.1.5-.3v-1.2c-1.8.4-2.2-.8-2.2-.8-.3-.8-.7-1-.7-1-.6-.4 0-.4 0-.4.7 0 1 .7 1 .7.6 1 1.5.7 1.9.5 0-.4.2-.7.4-.9-1.5-.2-3-.7-3-3.2 0-.7.3-1.3.7-1.8-.1-.2-.3-.8 0-1.7 0 0 .6-.2 1.8.7a6 6 0 0 1 3.3 0c1.3-.9 1.8-.7 1.8-.7.4.9.2 1.5.1 1.7.4.5.7 1 .7 1.8 0 2.5-1.5 3-3 3.2.2.2.5.6.5 1.2v1.8c0 .2.1.4.5.3A6.6 6.6 0 0 0 12 5.5z" fill="#fff"/></svg>',
    site: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2f9e5b"/><path d="M1.5 12h21M12 1.5c3 3 3 18 0 21M12 1.5c-3 3-3 18 0 21M3.5 6.5h17M3.5 17.5h17" fill="none" stroke="#fff" stroke-width="1.2"/></svg>'
  };

  function render(content, api) {
    var U = X.ui(api), h = U.h, t = U.t;
    var root = U.root(content, 'xpa-contact', 560);
    var to = X.contacts[0];
    var showBook = true;

    function allText() { return t(X.person.name) + '\n' + X.contacts.map(function (c) { return t(c.label) + ': ' + c.value; }).join('\n'); }
    function sendJoke() {
      U.sound('error');
      U.dialog({ title: { ru: 'Отправка сообщения', en: 'Send Message' }, icon: 'warn',
        text: { ru: 'Не удалось связаться с почтовым сервером: этот компьютер живёт внутри монитора.\n\nСкопируйте адрес и напишите из своего мессенджера или почты. Даниил отвечает быстро.', en: 'Could not reach the mail server: this computer lives inside a monitor.\n\nCopy the address and write from your own messenger or mail. Daniil replies fast.' },
        buttons: [{ label: { ru: 'Копировать адрес', en: 'Copy address' }, primary: true, onClick: function () { X.copyText(to.value); } }, { label: { ru: 'Отмена', en: 'Cancel' } }] });
    }

    var menu = U.menubar([
      { label: { ru: 'Файл', en: 'File' }, items: [
        { label: { ru: 'Отправить', en: 'Send Message' }, key: 'Alt+S', action: sendJoke },
        { sep: true },
        { label: { ru: 'Закрыть', en: 'Close' }, action: function () { api.win.close(); } }
      ] },
      { label: { ru: 'Правка', en: 'Edit' }, items: [
        { label: { ru: 'Копировать все контакты', en: 'Copy all contacts' }, action: function () { X.copyText(allText()); } },
        { label: { ru: 'Копировать адрес получателя', en: 'Copy recipient address' }, action: function () { X.copyText(to.value); } }
      ] },
      { label: { ru: 'Вид', en: 'View' }, items: [
        { label: { ru: 'Адресная книга', en: 'Address book' }, checked: function () { return showBook; }, action: function () { showBook = !showBook; root.classList.toggle('no-book', !showBook); } }
      ] },
      { label: { ru: 'Справка', en: 'Help' }, items: [
        { label: { ru: 'О программе', en: 'About' }, action: function () { U.aboutDialog({ ru: 'Почта без почты', en: 'Mail Without Mail' }, { ru: 'Ссылки mailto: здесь ненадёжны, поэтому только копирование.', en: 'mailto: links are unreliable here, so it is copy only.' }); } }
      ] }
    ]);
    var tb = U.toolbar([
      U.tbtn({ g: 'send', label: { ru: 'Отправить', en: 'Send' }, showLabel: true, big: true, onClick: sendJoke }),
      U.tsep(),
      U.tbtn({ g: 'cut', label: { ru: 'Вырезать', en: 'Cut' }, big: true, onClick: function () { U.dialog({ title: { ru: 'Вырезать', en: 'Cut' }, icon: 'info', text: { ru: 'Контакты нельзя вырезать. Только копировать.', en: 'Contacts cannot be cut. Only copied.' }, buttons: [{ label: 'OK', primary: true }] }); } }),
      U.tbtn({ g: 'copy', label: { ru: 'Копировать всё', en: 'Copy all' }, big: true, onClick: function () { X.copyText(allText()).then(function (ok) { st.set(0, ok ? { ru: 'Все контакты скопированы.', en: 'All contacts copied.' } : { ru: 'Не удалось скопировать.', en: 'Copy failed.' }); }); } }),
      U.tbtn({ g: 'paste', label: { ru: 'Вставить', en: 'Paste' }, big: true, disabled: true }),
      U.tbtn({ g: 'undo', label: { ru: 'Отменить', en: 'Undo' }, big: true, disabled: true })
    ]);

    var toBox = h('div.xpa-ct-to.xpa-field', { tabindex: '0', role: 'combobox', 'aria-label': { ru: 'Кому', en: 'To' } });
    var subj = h('input.xpa-field.xpa-ct-subj', { type: 'text', spellcheck: 'false' });
    var subjTouched = false;
    subj.addEventListener('input', function () { subjTouched = true; });
    var fields = h('div.xpa-ct-fields', [
      h('label.xpa-ct-lbl', [U.glyph('props'), h('span', { ru: 'Кому:', en: 'To:' })]), toBox,
      h('label.xpa-ct-lbl', [h('span.xpa-g16'), h('span', { ru: 'Тема:', en: 'Subject:' })]), subj
    ]);

    var book = h('div.xpa-ct-book');
    var cards = h('div.xpa-ct-cards');
    var msg = h('div.xpa-ct-msg.xpa-sunken');
    var st = U.statusbar(2);
    var main = h('div.xpa-ct-main', [fields, msg]);
    [menu, tb, h('div.xpa-ct-body', [book, main]), st.el].forEach(function (n) { root.appendChild(n); });

    function setTo(c, focusCard) {
      to = c;
      toBox.innerHTML = '';
      toBox.appendChild(h('span.xpa-ct-badge', { html: BADGES[c.id] || '' }));
      toBox.appendChild(h('span.xpa-ct-to-name', t(X.person.name)));
      toBox.appendChild(h('span.xpa-muted', '<' + c.value + '>'));
      Array.prototype.forEach.call(book.querySelectorAll('.xpa-ct-bi'), function (el) { el.classList.toggle('sel', el.getAttribute('data-id') === c.id); el.setAttribute('aria-selected', String(el.getAttribute('data-id') === c.id)); });
      Array.prototype.forEach.call(cards.children, function (el) { el.classList.toggle('sel', el.getAttribute('data-id') === c.id); });
      if (focusCard) { var card = cards.querySelector('[data-id="' + c.id + '"]'); if (card) card.scrollIntoView({ block: 'nearest' }); }
      st.set(1, t(c.label) + ': ' + c.value);
    }

    function build() {
      book.innerHTML = '';
      book.appendChild(h('div.xpa-ct-bhead', [h('span', { ru: 'Контакты', en: 'Contacts' }), h('span', '▾')]));
      var list = h('div.xpa-ct-blist', { role: 'listbox', tabindex: '0', 'aria-label': { ru: 'Адресная книга', en: 'Address book' } });
      X.contacts.forEach(function (c) {
        var it = h('div.xpa-ct-bi', { role: 'option', 'data-id': c.id }, [h('span.xpa-ct-badge', { html: BADGES[c.id] || '' }), h('span', t(c.label))]);
        it.addEventListener('click', function () { U.sound('click'); setTo(c, true); });
        list.appendChild(it);
      });
      list.addEventListener('keydown', function (e) {
        var i = X.contacts.indexOf(to);
        if (e.key === 'ArrowDown') { e.preventDefault(); setTo(X.contacts[Math.min(X.contacts.length - 1, i + 1)], true); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setTo(X.contacts[Math.max(0, i - 1)], true); }
        if (e.key === 'Enter') { e.preventDefault(); X.copyText(to.value).then(function (ok) { if (ok) st.set(0, t({ ru: 'Скопировано: ', en: 'Copied: ' }) + to.value); }); }
      });
      book.appendChild(list);
      book.appendChild(h('div.xpa-ct-bhint.xpa-muted', { ru: 'Enter — копировать адрес', en: 'Enter copies the address' }));

      if (!subjTouched) subj.value = t({ ru: 'Есть задача для fullstack-разработчика', en: 'A project for a fullstack developer' });

      msg.innerHTML = '';
      msg.appendChild(h('p', { ru: 'Здравствуйте, Даниил!', en: 'Hi Daniil,' }));
      msg.appendChild(h('p.xpa-muted', { ru: 'Отправка писем отсюда не работает (компьютер внутри монитора), поэтому вот прямые контакты. Выделяются мышью, копируются кнопкой:', en: 'Sending mail from here does not work (the computer is inside a monitor), so here are the direct contacts. Select them with the mouse or use the copy buttons:' }));
      cards.innerHTML = '';
      X.contacts.forEach(function (c) {
        var card = h('div.xpa-ct-card', { 'data-id': c.id, style: { '--c': c.color } }, [
          h('span.xpa-ct-cbadge', { html: BADGES[c.id] || '' }),
          h('div.xpa-ct-cmain', [
            h('div.xpa-ct-clabel', [h('b', t(c.label)), h('span.xpa-muted', ' — ' + t(c.note))]),
            h('div.xpa-ct-cval.xpa-selectable', c.value)
          ]),
          h('div.xpa-ct-cbtns', [
            U.copyButton(c.value, { onCopied: function (ok) { setTo(c); st.set(0, ok ? t({ ru: 'Скопировано: ', en: 'Copied: ' }) + c.value : t({ ru: 'Не удалось скопировать — выделите текст вручную.', en: 'Copy failed: select the text manually.' })); } }),
            c.href ? h('a.xpa-btn.xpa-ct-open', { href: c.href, target: '_blank', rel: 'noopener noreferrer', title: c.href }, [U.glyph('link'), h('span', { ru: 'Открыть', en: 'Open' })]) : null
          ])
        ]);
        card.addEventListener('click', function (e) { if (!e.target.closest('button,a')) setTo(c); });
        cards.appendChild(card);
      });
      msg.appendChild(cards);
      msg.appendChild(h('p', [t({ ru: 'С уважением,', en: 'Best regards,' }), h('br'), h('span.xpa-muted', { ru: 'посетитель сайта', en: 'a site visitor' })]));
      setTo(to);
      st.set(0, { ru: 'Готово. Telegram отвечает быстрее всего.', en: 'Ready. Telegram gets the fastest reply.' });
      api.win.setTitle(t({ ru: 'Новое сообщение', en: 'New Message' }));
    }
    toBox.addEventListener('keydown', function (e) {
      var i = X.contacts.indexOf(to);
      if (e.key === 'ArrowDown') { e.preventDefault(); setTo(X.contacts[(i + 1) % X.contacts.length], true); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setTo(X.contacts[(i - 1 + X.contacts.length) % X.contacts.length], true); }
    });
    toBox.addEventListener('click', function () { var i = X.contacts.indexOf(to); setTo(X.contacts[(i + 1) % X.contacts.length], true); U.sound('click'); });
    root.addEventListener('keydown', function (e) { if (e.altKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); sendJoke(); } });
    U.bind(build);
    return U.destroy;
  }

  X.register({
    id: 'contact',
    title: { ru: 'Написать мне', en: 'Contact me' },
    icon: X.icons.contact,
    desktop: true,
    startMenu: 'pinned',
    defaultSize: { w: 620, h: 480 },
    minSize: { w: 300, h: 300 },
    singleton: true,
    render: render
  });
})();

export {};
