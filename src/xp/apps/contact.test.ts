import { describe, expect, it } from 'vitest';
import { CONTACTS } from '../content/profile';
import { sendUrl, stepContact } from './contact-logic';

describe('contact me', () => {
  it('steps through the contacts, wrapping or stopping at the ends', () => {
    expect(stepContact(0, 1, true, 4)).toBe(1);
    expect(stepContact(3, 1, true, 4)).toBe(0);
    expect(stepContact(0, -1, true, 4)).toBe(3);
    expect(stepContact(3, 1, false, 4)).toBe(3);
    expect(stepContact(0, -1, false, 4)).toBe(0);
    expect(stepContact(2, -1, false, 4)).toBe(1);
  });
  it('sends through a real channel', () => {
    expect(sendUrl({ id: 'telegram', value: 't.me/x', href: 'https://t.me/x' }, 'Hi')).toBe('https://t.me/x');
    expect(sendUrl({ id: 'email', value: 'a@b.c', href: null }, ' A job & more ')).toBe(
      'mailto:a@b.c?subject=A%20job%20%26%20more',
    );
    expect(sendUrl({ id: 'email', value: 'a@b.c', href: null }, '  ')).toBe('mailto:a@b.c');
  });
  it('gives every contact a place to send to', () => {
    for (const c of CONTACTS) expect(sendUrl(c, 'x')).toMatch(/^(https:\/\/|mailto:[^@\s]+@[^@\s]+\?subject=x$)/);
  });
});
