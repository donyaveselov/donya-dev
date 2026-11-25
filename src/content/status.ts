// What the owner is doing, in words: My Computer and the terminal's `status` both read it from here.
import type { Bilingual, Status } from '../types';
import { d } from './text';

export const OWNER_STATUS: Readonly<Record<Status, { label: Bilingual; note: Bilingual }>> = {
  work: {
    label: d('Работает', 'At work'),
    note: d(
      'Пишет код. Не отвлекать, если только не с оффером.',
      'Writing code. Do not disturb, unless it is an offer.',
    ),
  },
  play: {
    label: d('Играет', 'Gaming'),
    note: d('Видеокарта занята. Код подождёт до конца катки.', 'The GPU is busy. Code waits until the match ends.'),
  },
  sleep: {
    label: d('Спит', 'Asleep'),
    note: d('Энергосбережение. Ответит утром по времени Пхукета.', 'Power saving. Will reply in the Phuket morning.'),
  },
  outside: {
    label: d('Вне дома', 'Away'),
    note: d('Где-то на острове. Телефон с собой.', 'Somewhere on the island. Has the phone.'),
  },
};
