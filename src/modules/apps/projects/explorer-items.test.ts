import { describe, expect, it } from 'vitest';
import { tr, type Text } from '../../../i18n/i18n';
import { PROJECTS } from '../../../content/projects';
import { bare } from '../browser/browser-url';
import { listItems } from './explorer-items';

const en = (text: Text): string => tr(text, 'en');
const ru = (text: Text): string => tr(text, 'ru');

describe('the My Projects folder', () => {
  it('holds a folder per project and a README at the root', () => {
    const items = listItems([], en);
    expect(items.map((i) => i.key)).toEqual([...PROJECTS.map((p) => p.id), 'readme']);
    const first = items[0];
    expect(first?.open).toEqual({ path: [PROJECTS[0]?.id] });
    expect(en(first?.name ?? '')).toBe(PROJECTS[0]?.name.en);
    const readme = items.at(-1);
    expect(readme?.name).toBe('README.txt');
    expect(readme?.open).toMatchObject({ app: 'notepad', params: { title: 'README.txt' } });
  });

  it('holds the overview, the screenshots, the stack and the links of a project', () => {
    for (const p of PROJECTS) {
      const items = listItems([p.id], en);
      expect(items.map((i) => i.key)).toEqual([
        'doc',
        ...p.shots.map((_, i) => `shot${String(i)}`),
        'stack',
        ...(p.repo ? ['repo'] : []),
        'url',
      ]);
      expect(items[0]?.open).toEqual({ app: 'project', params: { id: p.id } });
      expect(en(items[0]?.name ?? '')).toBe(`${p.name.en} — overview.doc`);
      expect(items[1]?.open).toEqual({ app: 'project', params: { id: p.id, shot: 0 } });
      expect(items[1]?.name).toBe(`${p.shots[0]?.kind ?? ''}.png`);
      expect(items.at(-1)?.open).toEqual({ app: 'browser', params: { url: p.url } });
      expect(items.at(-1)?.name).toBe(`${bare(p.url)}.url`);
    }
  });

  it('writes stack.txt in the language and counts its lines', () => {
    const p = PROJECTS[0];
    if (!p) throw new Error('no projects');
    const stack = listItems([p.id], ru).find((i) => i.key === 'stack');
    expect(ru(stack?.sub ?? '')).toMatch(new RegExp(`^${String(p.stack.length)} (строка|строки|строк)$`));
    expect(en(stack?.sub ?? '')).toBe(`${String(p.stack.length)} lines`);
    const open = stack?.open;
    if (!open || !('params' in open)) throw new Error('stack.txt opens in an app');
    const text = open.params.text as { ru: string; en: string };
    expect(text.ru.startsWith(`${p.name.ru} — стек\r\n`)).toBe(true);
    expect(text.en.split('\r\n').filter((l) => l.startsWith('  * '))).toEqual(p.stack.map((s) => `  * ${s}`));
  });

  it('is empty for a folder that does not exist', () => {
    expect(listItems(['nope'], en)).toEqual([]);
  });
});
