// Temporary: the apps not yet ported still read window.XPApps (the old common.js / stack.js / mocks*.js globals).
// Removed once the last legacy app is ported.
import { registerApp } from './shell/apps';
import { CONTACTS, APP_ALIASES, OS, PERSON } from './content/profile';
import { findProject, PROJECTS } from './content/projects';
import { AREAS, byArea, DEVICES, itemName, stackLine } from './content/stack';
import { svg } from './icons';
import { G16, G24, ICONS } from './apps/icons';
import { copyText, pad, phuketNow, reduced, ui } from './apps/kit';
import { isBilingual } from '../shared/i18n';
import type { XPAppDef } from '../shared/types';

window.XPApps = {
  version: 1,
  icons: ICONS,
  g16: G16,
  g24: G24,
  svg,
  person: PERSON,
  contacts: CONTACTS,
  osName: { ru: OS.name, en: OS.name },
  osEdition: OS.edition,
  osVersion: OS.version,
  pcName: OS.pcName,
  projects: PROJECTS,
  appAliases: APP_ALIASES,
  ui,
  copyText,
  phuketNow,
  pad,
  reduced,
  isDict: isBilingual,
  register: (def: XPAppDef) => {
    registerApp(def);
  },
  findProject,
  stack: { areas: AREAS, devices: DEVICES, byArea, line: stackLine, name: itemName },
};
