import { describe, expect, it } from 'vitest';
import { type KeyLike, langSwitchKey, shellCommand } from './keys';

const key = (k: Partial<KeyLike>): KeyLike => ({
  key: '',
  code: '',
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  metaKey: false,
  repeat: false,
  ...k,
});

describe('language switch', () => {
  it('follows Windows: Alt+Shift and Ctrl+Shift in either order', () => {
    expect(langSwitchKey(key({ key: 'Shift', altKey: true }))).toBe('combo');
    expect(langSwitchKey(key({ key: 'Alt', shiftKey: true }))).toBe('combo');
    expect(langSwitchKey(key({ key: 'Shift', ctrlKey: true }))).toBe('combo');
    expect(langSwitchKey(key({ key: 'Control', shiftKey: true }))).toBe('combo');
  });
  it('follows macOS: Ctrl+Space and Ctrl+Option+Space, not Cmd or Shift with it', () => {
    expect(langSwitchKey(key({ key: ' ', code: 'Space', ctrlKey: true }))).toBe('space');
    expect(langSwitchKey(key({ key: ' ', code: 'Space', ctrlKey: true, altKey: true }))).toBe('space');
    expect(langSwitchKey(key({ key: ' ', code: 'Space', ctrlKey: true, metaKey: true }))).toBeNull();
    expect(langSwitchKey(key({ key: ' ', code: 'Space', ctrlKey: true, shiftKey: true }))).toBeNull();
  });
  it('ignores auto-repeat and plain keys', () => {
    expect(langSwitchKey(key({ key: 'Shift', altKey: true, repeat: true }))).toBeNull();
    expect(langSwitchKey(key({ key: 'Shift' }))).toBeNull();
    expect(langSwitchKey(key({ key: 'a', ctrlKey: true }))).toBeNull();
  });
});

describe('shell shortcuts', () => {
  it('opens Start with Ctrl+Esc (or Cmd+Esc) and Task Manager with Ctrl+Shift+Esc', () => {
    expect(shellCommand(key({ key: 'Escape', ctrlKey: true }))).toBe('start');
    expect(shellCommand(key({ key: 'Escape', metaKey: true }))).toBe('start');
    expect(shellCommand(key({ key: 'Escape', ctrlKey: true, shiftKey: true }))).toBe('taskmgr');
  });
  it('closes with Alt+F4', () => {
    expect(shellCommand(key({ key: 'F4', altKey: true }))).toBe('altF4');
    expect(shellCommand(key({ key: 'F4' }))).toBeNull();
    expect(shellCommand(key({ key: 'Escape' }))).toBeNull();
  });
});
