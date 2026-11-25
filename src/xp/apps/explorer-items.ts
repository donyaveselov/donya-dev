// What the My Projects folder holds, without the DOM (unit-tested in explorer-items.test.ts): the projects and a
// README at the root, and in each project its overview, screenshots, stack and links.
import { fill, type Text } from '../../shared/i18n';
import type { Bilingual, Lang, XPAppParams } from '../../shared/types';
import { findProject, type Project, PROJECTS } from '../content/projects';
import { PROJECTS_README } from '../content/readme';
import { counted } from '../content/text';
import { APP } from './strings';

const T = {
  stack: { ru: 'стек', en: 'stack' },
  projectFolder: { ru: 'Папка проекта', en: 'Project folder' },
  textDoc: { ru: 'Текстовый документ', en: 'Text Document' },
  readmeDesc: { ru: 'Как пользоваться этой папкой', en: 'How to use this folder' },
  overviewDoc: { ru: '%s — обзор.doc', en: '%s — overview.doc' },
  pngImage: { ru: 'Изображение PNG', en: 'PNG Image' },
  stackDesc: { ru: 'Технологии проекта', en: 'Technologies used' },
  shortcut: { ru: 'Интернет-ярлык', en: 'Internet Shortcut' },
} as const satisfies Record<string, Bilingual>;

export const bare = (url: string): string => url.replace(/^https?:\/\//, '');

/** stack.txt of a project, in one language. */
function stackText(p: Project, lang: Lang): string {
  return `${p.name[lang]} — ${T.stack[lang]}\r\n${'='.repeat(31)}\r\n\r\n${p.stack.map((s) => `  * ${s}`).join('\r\n')}\r\n`;
}

/** What opening an item does: go into a folder, or open an app with params. */
export type Opener = { path: string[] } | { app: string; params: XPAppParams };

export interface Item {
  key: string;
  icon: string;
  name: Text;
  type: Bilingual;
  desc: Text;
  sub: Text;
  open: Opener;
}

/** The items of a folder; path is [] (the root) or [projectId]. */
export function listItems(path: readonly string[], t: (d: Text) => string): Item[] {
  const id = path[0];
  if (id === undefined)
    return [
      ...PROJECTS.map((p): Item => ({
        key: p.id,
        icon: p.icon,
        name: p.name,
        type: T.projectFolder,
        desc: p.tagline,
        sub: p.type,
        open: { path: [p.id] },
      })),
      {
        key: 'readme',
        icon: 'txt',
        name: 'README.txt',
        type: T.textDoc,
        desc: T.readmeDesc,
        sub: '1 KB',
        open: { app: 'notepad', params: { title: 'README.txt', text: PROJECTS_README } },
      },
    ];
  const p = findProject(id);
  if (!p) return [];
  const out: Item[] = [
    {
      key: 'doc',
      icon: 'doc',
      name: fill(T.overviewDoc, t(p.name)),
      type: APP.document,
      desc: p.summary,
      sub: p.period,
      open: { app: 'project', params: { id: p.id } },
    },
    ...p.shots.map((s, i): Item => ({
      key: `shot${String(i)}`,
      icon: 'image',
      name: `${s.kind}.png`,
      type: T.pngImage,
      desc: s.title,
      sub: s.title,
      open: { app: 'project', params: { id: p.id, shot: i } },
    })),
    {
      key: 'stack',
      icon: 'txt',
      name: 'stack.txt',
      type: T.textDoc,
      desc: T.stackDesc,
      sub: counted(p.stack.length, ['строка', 'строки', 'строк'], ['line', 'lines']),
      open: {
        app: 'notepad',
        params: { title: 'stack.txt', text: { ru: stackText(p, 'ru'), en: stackText(p, 'en') } },
      },
    },
  ];
  if (p.repo)
    out.push({
      key: 'repo',
      icon: 'url',
      name: 'github.url',
      type: T.shortcut,
      desc: p.repo,
      sub: bare(p.repo),
      open: { app: 'browser', params: { url: p.repo } },
    });
  out.push({
    key: 'url',
    icon: 'url',
    name: `${bare(p.url)}.url`,
    type: T.shortcut,
    desc: p.url,
    sub: bare(p.url),
    open: { app: 'browser', params: { url: p.url } },
  });
  return out;
}
