// The two README.txt files of the desktop, as Notepad shows them.
import type { Bilingual } from '../types';

/** README.txt of the desktop: what Notepad opens by default (and `cat readme.txt` in the terminal). */
export const DESKTOP_README: Bilingual = {
  ru: 'README.txt\r\n==========\r\n\r\nЭтот рабочий стол живёт внутри монитора на сайте Даниила Иванова.\r\n\r\nС чего начать:\r\n  * «Мои проекты» — над чем я работаю сейчас\r\n  * «Резюме» — коротко и по делу\r\n  * «Написать мне» — контакты, которые можно скопировать\r\n  * «Командная строка» — введите help\r\n  * «Сапёр» — первый ход всегда безопасен\r\n\r\nМелочи, которые стоит найти:\r\n  * F5 в Блокноте вставляет время на Пхукете\r\n  * В Корзине лежат старые проекты. Попробуйте их восстановить\r\n  * В консоли есть скрытые команды\r\n\r\nP.S. Этот файл можно редактировать. Сохранять — тоже.\r\n',
  en: "README.txt\r\n==========\r\n\r\nThis desktop lives inside a monitor on Daniil Ivanov's website.\r\n\r\nWhere to start:\r\n  * My Projects: what I am working on now\r\n  * Resume: short and to the point\r\n  * Contact me: contacts you can copy\r\n  * Command Prompt: type help\r\n  * Minesweeper: the first click is always safe\r\n\r\nSmall things worth finding:\r\n  * F5 in Notepad inserts the time in Phuket\r\n  * The Recycle Bin holds old projects. Try restoring them\r\n  * The console has hidden commands\r\n\r\nP.S. You can edit this file. And save it, too.\r\n",
};

/** README.txt inside the My Projects folder. */
export const PROJECTS_README: Bilingual = {
  ru: 'Привет! Это папка с проектами.\r\n\r\nКаждая подпапка — один проект: описание, «скриншоты»,\r\nстек и ссылка, если проект публичный.\r\n\r\nДвойной щелчок открывает, Backspace — на уровень вверх,\r\nAlt+← / Alt+→ — назад и вперёд.\r\n\r\nСтарые проекты лежат в Корзине. Восстановить их нельзя.\r\nМы пробовали.',
  en: 'Hi! This is the projects folder.\r\n\r\nEach subfolder is one project: an overview, "screenshots",\r\nthe stack and a link when the project is public.\r\n\r\nDouble-click opens, Backspace goes up a level,\r\nAlt+Left / Alt+Right go back and forward.\r\n\r\nOld projects live in the Recycle Bin. They cannot be restored.\r\nWe tried.',
};
