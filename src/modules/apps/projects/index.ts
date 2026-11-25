// The projects' programs, registered in the order of their desktop icons: the My Projects folder (explorer.ts), the
// live sites in their own windows (site-windows.ts), and the document window of a project (project-doc.ts).
import { d } from '../../../content/text';
import { registerApp } from '../../desktop/apps';
import { renderExplorer } from './explorer';
import { ICONS } from '../../../components/kit/icons';
import { renderProject } from './project-doc';
import { SITES, siteWindow } from './site-windows';
import { APP } from '../../../components/kit/strings';

registerApp({
  id: 'projects',
  title: APP.myProjects,
  icon: ICONS.projects,
  desktop: true,
  startMenu: 'pinned',
  defaultSize: { w: 680, h: 460 },
  minSize: { w: 300, h: 240 },
  singleton: true,
  render: renderExplorer,
});
for (const p of SITES)
  registerApp({
    id: p.site.app,
    title: p.name,
    icon: ICONS[p.icon],
    desktop: true,
    startMenu: true,
    defaultSize: { w: 760, h: 540 },
    minSize: { w: 320, h: 360 },
    singleton: true,
    render: siteWindow(p),
  });
registerApp({
  id: 'project',
  title: d('Проект', 'Project'),
  icon: ICONS.doc,
  desktop: false,
  startMenu: false,
  defaultSize: { w: 640, h: 520 },
  minSize: { w: 300, h: 260 },
  singleton: false,
  render: renderProject,
});
