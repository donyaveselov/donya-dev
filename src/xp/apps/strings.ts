// Strings the apps share: the menu names every window has, and the kit's own labels.
import { d } from '../content/text';

export const APP = {
  file: d('Файл', 'File'),
  edit: d('Правка', 'Edit'),
  view: d('Вид', 'View'),
  help: d('Справка', 'Help'),
  about: d('О программе', 'About'),
  close: d('Закрыть', 'Close'),
  exit: d('Выход', 'Exit'),
  cancel: d('Отмена', 'Cancel'),
  open: d('Открыть', 'Open'),
  properties: d('Свойства', 'Properties'),
  selectAll: d('Выделить всё', 'Select All'),
  back: d('Назад', 'Back'),
  forward: d('Вперёд', 'Forward'),
  address: d('Адрес', 'Address'),
  go: d('Переход', 'Go'),
  document: d('Документ', 'Document'),
  github: d('Код на GitHub', 'Code on GitHub'),
  myProjects: d('Мои проекты', 'My Projects'),
  myComputer: d('Мой компьютер', 'My Computer'),
  copy: d('Копировать', 'Copy'),
  copyToClipboard: d('Скопировать в буфер обмена', 'Copy to clipboard'),
  copied: d('Скопировано', 'Copied'),
  copyFailed: d('Не вышло: выделите вручную', 'Failed: select it manually'),
  version: d('Версия 1.0 · сделано вручную для этого рабочего стола', 'Version 1.0 · handmade for this desktop'),
} as const;
