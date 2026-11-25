// Contact me: an Outlook-Express-like "New Message" window. Send opens the chosen channel for real (Telegram, a
// mailto: with the subject, GitHub, the site); every address can also be copied.
import type { Bilingual, XPAppApi } from '../../shared/types';
import { type Contact, CONTACTS, PERSON } from '../content/profile';
import { registerApp } from '../shell/apps';
import { ICONS } from './icons';
import { sendUrl, stepContact } from './contact-logic';
import { copyText, ui } from './kit';

const d = (ru: string, en: string): Bilingual => ({ ru, en });

const T = {
  title: d('Написать мне', 'Contact me'),
  winTitle: d('Новое сообщение', 'New Message'),
  sending: d('Открывается: ', 'Opening: '),
  file: d('Файл', 'File'),
  sendMenu: d('Отправить', 'Send Message'),
  close: d('Закрыть', 'Close'),
  edit: d('Правка', 'Edit'),
  copyAll: d('Копировать все контакты', 'Copy all contacts'),
  copyTo: d('Копировать адрес получателя', 'Copy recipient address'),
  view: d('Вид', 'View'),
  book: d('Адресная книга', 'Address book'),
  help: d('Справка', 'Help'),
  about: d('О программе', 'About'),
  aboutName: d('Почта без почты', 'Mail Without Mail'),
  aboutText: d(
    '«Отправить» открывает выбранный канал: Telegram или вашу почтовую программу.',
    'Send opens the selected channel: Telegram or your own mail program.',
  ),
  send: d('Отправить', 'Send'),
  cut: d('Вырезать', 'Cut'),
  noCut: d('Контакты нельзя вырезать. Только копировать.', 'Contacts cannot be cut. Only copied.'),
  copyAllBtn: d('Копировать всё', 'Copy all'),
  allCopied: d('Все контакты скопированы.', 'All contacts copied.'),
  copyFailed: d('Не удалось скопировать.', 'Copy failed.'),
  paste: d('Вставить', 'Paste'),
  undo: d('Отменить', 'Undo'),
  to: d('Кому', 'To'),
  toLabel: d('Кому:', 'To:'),
  subject: d('Тема:', 'Subject:'),
  contacts: d('Контакты', 'Contacts'),
  copied: d('Скопировано: ', 'Copied: '),
  enterCopies: d('Enter — копировать адрес', 'Enter copies the address'),
  defaultSubject: d('Есть задача для fullstack-разработчика', 'A project for a fullstack developer'),
  hello: d('Здравствуйте, Даниил!', 'Hi Daniil,'),
  intro: d(
    'Вот прямые контакты. «Отправить» откроет выбранный, а адреса выделяются мышью и копируются кнопкой:',
    'Here are the direct contacts. Send opens the selected one; the addresses can be selected with the mouse or copied with the buttons:',
  ),
  manualCopy: d('Не удалось скопировать — выделите текст вручную.', 'Copy failed: select the text manually.'),
  open: d('Открыть', 'Open'),
  regards: d('С уважением,', 'Best regards,'),
  visitor: d('посетитель сайта', 'a site visitor'),
  ready: d('Готово. Telegram отвечает быстрее всего.', 'Ready. Telegram gets the fastest reply.'),
} as const;

const BADGES: Record<Contact['id'], string> = {
  telegram:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2aa3df"/><path d="M5.5 11.6l11.2-4.4c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1l-6.6 4.1-2.8-.9c-.6-.2-.6-.6.1-.9z" fill="#fff"/></svg>',
  email:
    '<svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" fill="#fff" stroke="#c0392b"/><path d="M1.5 5l10.5 8 10.5-8" fill="none" stroke="#c0392b" stroke-width="1.6"/></svg>',
  github:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#24292e"/><path d="M12 5.5a6.6 6.6 0 0 0-2.1 12.9c.3 0 .5-.1.5-.3v-1.2c-1.8.4-2.2-.8-2.2-.8-.3-.8-.7-1-.7-1-.6-.4 0-.4 0-.4.7 0 1 .7 1 .7.6 1 1.5.7 1.9.5 0-.4.2-.7.4-.9-1.5-.2-3-.7-3-3.2 0-.7.3-1.3.7-1.8-.1-.2-.3-.8 0-1.7 0 0 .6-.2 1.8.7a6 6 0 0 1 3.3 0c1.3-.9 1.8-.7 1.8-.7.4.9.2 1.5.1 1.7.4.5.7 1 .7 1.8 0 2.5-1.5 3-3 3.2.2.2.5.6.5 1.2v1.8c0 .2.1.4.5.3A6.6 6.6 0 0 0 12 5.5z" fill="#fff"/></svg>',
  site: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2f9e5b"/><path d="M1.5 12h21M12 1.5c3 3 3 18 0 21M12 1.5c-3 3-3 18 0 21M3.5 6.5h17M3.5 17.5h17" fill="none" stroke="#fff" stroke-width="1.2"/></svg>',
};

const step = (i: number, dir: 1 | -1, wrap: boolean): number => stepContact(i, dir, wrap, CONTACTS.length);

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-contact', 560);
  let toIdx = 0;
  const to = (): Contact => CONTACTS[toIdx] ?? CONTACTS[0];
  let showBook = true;

  const allText = (): string => `${t(PERSON.name)}\n${CONTACTS.map((c) => `${t(c.label)}: ${c.value}`).join('\n')}`;
  /** Opens the recipient's channel: a link in a new tab, or the visitor's mail program with the subject filled in. */
  const send = (): void => {
    const c = to();
    const url = sendUrl(c, subj.value);
    if (url.startsWith('mailto:')) h('a', { href: url }).click();
    else window.open(url, '_blank', 'noopener');
    st.set(0, t(T.sending) + c.value);
  };

  const menu = U.menubar([
    {
      label: T.file,
      items: [
        { label: T.sendMenu, key: 'Alt+S', action: send },
        { sep: true },
        {
          label: T.close,
          action: () => {
            api.win.close();
          },
        },
      ],
    },
    {
      label: T.edit,
      items: [
        { label: T.copyAll, action: () => void copyText(allText()) },
        { label: T.copyTo, action: () => void copyText(to().value) },
      ],
    },
    {
      label: T.view,
      items: [
        {
          label: T.book,
          checked: () => showBook,
          action: () => {
            showBook = !showBook;
            root.classList.toggle('no-book', !showBook);
          },
        },
      ],
    },
    {
      label: T.help,
      items: [
        {
          label: T.about,
          action: () => {
            U.aboutDialog(T.aboutName, T.aboutText);
          },
        },
      ],
    },
  ]);
  const tb = U.toolbar([
    U.tbtn({ g: 'send', label: T.send, showLabel: true, big: true, onClick: send }),
    U.tsep(),
    U.tbtn({
      g: 'cut',
      label: T.cut,
      big: true,
      onClick: () => {
        U.dialog({ title: T.cut, icon: 'info', text: T.noCut, buttons: [{ label: 'OK', primary: true }] });
      },
    }),
    U.tbtn({
      g: 'copy',
      label: T.copyAllBtn,
      big: true,
      onClick: () => {
        void copyText(allText()).then((ok) => {
          st.set(0, ok ? T.allCopied : T.copyFailed);
        });
      },
    }),
    U.tbtn({ g: 'paste', label: T.paste, big: true, disabled: true }),
    U.tbtn({ g: 'undo', label: T.undo, big: true, disabled: true }),
  ]);

  const toBox = h('div.xpa-ct-to.xpa-field', { tabindex: '0', role: 'combobox', 'aria-label': T.to });
  const subj = h('input.xpa-field.xpa-ct-subj', { type: 'text', spellcheck: 'false' });
  let subjTouched = false;
  subj.addEventListener('input', () => {
    subjTouched = true;
  });
  const fields = h('div.xpa-ct-fields', [
    h('label.xpa-ct-lbl', [U.glyph('props'), h('span', T.toLabel)]),
    toBox,
    h('label.xpa-ct-lbl', [h('span.xpa-g16'), h('span', T.subject)]),
    subj,
  ]);

  const book = h('div.xpa-ct-book');
  const cards = h('div.xpa-ct-cards');
  const msg = h('div.xpa-ct-msg.xpa-sunken');
  const st = U.statusbar(2);
  root.append(menu, tb, h('div.xpa-ct-body', [book, h('div.xpa-ct-main', [fields, msg])]), st.el);

  function setTo(i: number, focusCard = false): void {
    toIdx = i;
    const c = to();
    toBox.innerHTML = '';
    toBox.append(
      h('span.xpa-ct-badge', { html: BADGES[c.id] }),
      h('span.xpa-ct-to-name', t(PERSON.name)),
      h('span.xpa-muted', `<${c.value}>`),
    );
    for (const el of book.querySelectorAll('.xpa-ct-bi')) {
      const on = el.getAttribute('data-id') === c.id;
      el.classList.toggle('sel', on);
      el.setAttribute('aria-selected', String(on));
    }
    for (const el of cards.children) el.classList.toggle('sel', el.getAttribute('data-id') === c.id);
    if (focusCard) cards.querySelector(`[data-id="${c.id}"]`)?.scrollIntoView({ block: 'nearest' });
    st.set(1, `${t(c.label)}: ${c.value}`);
  }

  function build(): void {
    book.innerHTML = '';
    book.appendChild(h('div.xpa-ct-bhead', [h('span', T.contacts), h('span', '▾')]));
    const list = h('div.xpa-ct-blist', { role: 'listbox', tabindex: '0', 'aria-label': T.book });
    CONTACTS.forEach((c, i) => {
      const it = h('div.xpa-ct-bi', { role: 'option', 'data-id': c.id }, [
        h('span.xpa-ct-badge', { html: BADGES[c.id] }),
        h('span', t(c.label)),
      ]);
      it.addEventListener('click', () => {
        U.sound('click');
        setTo(i, true);
      });
      list.appendChild(it);
    });
    list.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTo(step(toIdx, 1, false), true);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTo(step(toIdx, -1, false), true);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = to().value;
        void copyText(v).then((ok) => {
          if (ok) st.set(0, t(T.copied) + v);
        });
      }
    });
    book.appendChild(list);
    book.appendChild(h('div.xpa-ct-bhint.xpa-muted', T.enterCopies));

    if (!subjTouched) subj.value = t(T.defaultSubject);

    msg.innerHTML = '';
    msg.appendChild(h('p', T.hello));
    msg.appendChild(h('p.xpa-muted', T.intro));
    cards.innerHTML = '';
    CONTACTS.forEach((c, i) => {
      const card = h('div.xpa-ct-card', { 'data-id': c.id, style: { '--c': c.color } }, [
        h('span.xpa-ct-cbadge', { html: BADGES[c.id] }),
        h('div.xpa-ct-cmain', [
          h('div.xpa-ct-clabel', [h('b', t(c.label)), h('span.xpa-muted', ` — ${t(c.note)}`)]),
          h('div.xpa-ct-cval.xpa-selectable', c.value),
        ]),
        h('div.xpa-ct-cbtns', [
          U.copyButton(c.value, {
            onCopied: (ok) => {
              setTo(i);
              st.set(0, ok ? t(T.copied) + c.value : t(T.manualCopy));
            },
          }),
          c.href
            ? h(
                'a.xpa-btn.xpa-ct-open',
                { href: c.href, target: '_blank', rel: 'noopener noreferrer', title: c.href },
                [U.glyph('link'), h('span', T.open)],
              )
            : null,
        ]),
      ]);
      card.addEventListener('click', (e) => {
        if (!(e.target instanceof Element && e.target.closest('button,a'))) setTo(i);
      });
      cards.appendChild(card);
    });
    msg.appendChild(cards);
    msg.appendChild(h('p', [t(T.regards), h('br'), h('span.xpa-muted', T.visitor)]));
    setTo(toIdx);
    st.set(0, T.ready);
    api.win.setTitle(t(T.winTitle));
  }
  toBox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setTo(step(toIdx, 1, true), true);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setTo(step(toIdx, -1, true), true);
    }
  });
  toBox.addEventListener('click', () => {
    setTo(step(toIdx, 1, true), true);
    U.sound('click');
  });
  root.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      send();
    }
  });
  U.bind(build);
  return U.destroy;
}

registerApp({
  id: 'contact',
  title: T.title,
  icon: ICONS.contact,
  desktop: true,
  startMenu: 'pinned',
  defaultSize: { w: 620, h: 480 },
  minSize: { w: 300, h: 300 },
  singleton: true,
  render,
});
