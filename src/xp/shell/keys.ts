// The shell's keyboard shortcuts, as pure functions of a key event (unit-tested in keys.test.ts).

export type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey' | 'repeat'>;

/**
 * Switches the input language the way the visitor's own computer does: Alt+Shift or Ctrl+Shift (Windows), Ctrl+Space
 * or Ctrl+Option+Space (macOS). Win+Space and Cmd+Space never reach a web page.
 */
export function langSwitchKey(e: KeyLike): 'combo' | 'space' | null {
  if (e.repeat) return null;
  if ((e.key === 'Shift' && (e.altKey || e.ctrlKey)) || ((e.key === 'Alt' || e.key === 'Control') && e.shiftKey))
    return 'combo';
  if (e.code === 'Space' && e.ctrlKey && !e.metaKey && !e.shiftKey) return 'space';
  return null;
}

export type ShellCommand = 'taskmgr' | 'start' | 'altF4' | null;

/** The shell's own shortcuts. */
export function shellCommand(e: KeyLike): ShellCommand {
  if (e.key === 'Escape' && (e.ctrlKey || e.metaKey)) return e.shiftKey ? 'taskmgr' : 'start';
  if (e.key === 'F4' && e.altKey) return 'altF4';
  return null;
}
