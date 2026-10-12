import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGameBoardUndoShortcut } from './useGameBoardUndoShortcut';

const press = (overrides: KeyboardEventInit = {}, target: EventTarget = window) => {
  const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true, ...overrides });
  act(() => { target.dispatchEvent(event); });
  return event;
};
const args = () => ({ canUndo: true, blocked: false, draggingRef: { current: false }, onUndo: vi.fn() });

describe('useGameBoardUndoShortcut', () => {
  it.each([{ ctrlKey: true, metaKey: false }, { ctrlKey: false, metaKey: true }])('executes normal Undo once for %j and consumes only handled keys', modifiers => {
    const props = args();
    renderHook(() => useGameBoardUndoShortcut(props));
    expect(press(modifiers).defaultPrevented).toBe(true);
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(press({ ...modifiers, repeat: true }).defaultPrevented).toBe(false);
    expect(props.onUndo).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ctrlKey: false }, { key: 'y' }, { shiftKey: true }, { altKey: true },
    { metaKey: true }, { repeat: true }, { isComposing: true }, { keyCode: 229 },
  ])('leaves unrelated shortcuts, redo, repeat and IME untouched: %j', overrides => {
    const props = args();
    renderHook(() => useGameBoardUndoShortcut(props));
    expect(press(overrides).defaultPrevented).toBe(false);
    expect(props.onUndo).not.toHaveBeenCalled();
  });

  it('accepts an uppercase Z without Shift and respects a previously handled event', () => {
    const props = args();
    renderHook(() => useGameBoardUndoShortcut(props));
    press({ key: 'Z' });
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    event.preventDefault();
    act(() => window.dispatchEvent(event));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
  });

  it.each(['input', 'textarea', 'select', 'editable', 'textbox', 'searchbox', 'combobox'])('preserves native Undo inside %s', kind => {
    const props = args();
    const element = document.createElement(['input', 'textarea', 'select'].includes(kind) ? kind : 'div');
    if (kind === 'editable') element.setAttribute('contenteditable', 'true');
    else if (['textbox', 'searchbox', 'combobox'].includes(kind)) element.setAttribute('role', kind);
    document.body.append(element);
    const { unmount } = renderHook(() => useGameBoardUndoShortcut(props));
    try {
      expect(press({}, element).defaultPrevented).toBe(false);
      expect(props.onUndo).not.toHaveBeenCalled();
    } finally { unmount(); element.remove(); }
  });

  it('protects nested editable targets and the active input even when the event targets window', () => {
    const props = args();
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    editable.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    editable.append(child);
    const input = document.createElement('input');
    document.body.append(editable, input);
    const { unmount } = renderHook(() => useGameBoardUndoShortcut(props));
    try {
      expect(press({}, child).defaultPrevented).toBe(false);
      input.focus();
      expect(press().defaultPrevented).toBe(false);
      expect(props.onUndo).not.toHaveBeenCalled();
    } finally { unmount(); editable.remove(); input.remove(); }
  });

  it('protects editable elements inside an open shadow root', () => {
    const props = args();
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const input = document.createElement('input');
    root.append(input); document.body.append(host);
    const { unmount } = renderHook(() => useGameBoardUndoShortcut(props));
    try {
      expect(press({ composed: true }, input).defaultPrevented).toBe(false);
      expect(props.onUndo).not.toHaveBeenCalled();
    } finally { unmount(); host.remove(); }
  });

  it('blocks composition sessions even if isComposing is missing, and resets on blur', () => {
    const props = args();
    renderHook(() => useGameBoardUndoShortcut(props));
    act(() => window.dispatchEvent(new CompositionEvent('compositionstart')));
    press();
    expect(props.onUndo).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new CompositionEvent('compositionend')));
    press();
    act(() => window.dispatchEvent(new CompositionEvent('compositionstart')));
    act(() => window.dispatchEvent(new Event('blur')));
    press();
    expect(props.onUndo).toHaveBeenCalledTimes(2);
  });

  it('keeps the composition guard across callback and availability changes', () => {
    const props = args();
    const { rerender } = renderHook(p => useGameBoardUndoShortcut(p), { initialProps: props });
    act(() => window.dispatchEvent(new CompositionEvent('compositionstart')));
    const onUndo = vi.fn();
    rerender({ ...props, onUndo });
    expect(press().defaultPrevented).toBe(false);
    expect(onUndo).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new CompositionEvent('compositionend')));
    expect(press().defaultPrevented).toBe(true);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it.each(['dialog', 'menu', 'listbox', 'touch-sheet', 'expanded-menu'])('blocks keys behind a visible %s', kind => {
    const props = args();
    const overlay = document.createElement('div');
    if (kind === 'touch-sheet') overlay.dataset.testid = 'gameboard-touch-action-sheet';
    else if (kind === 'expanded-menu') { overlay.setAttribute('aria-haspopup', 'menu'); overlay.setAttribute('aria-expanded', 'true'); }
    else overlay.setAttribute('role', kind);
    document.body.append(overlay);
    const { unmount } = renderHook(() => useGameBoardUndoShortcut(props));
    try {
      expect(press().defaultPrevented).toBe(false);
      overlay.hidden = true;
      expect(press().defaultPrevented).toBe(true);
      expect(props.onUndo).toHaveBeenCalledTimes(1);
    } finally { unmount(); overlay.remove(); }
  });

  it('uses latest availability and handler, blocks drag immediately, and removes listeners on unmount', () => {
    const initial = args();
    const { rerender, unmount } = renderHook(props => useGameBoardUndoShortcut(props), { initialProps: initial });
    initial.draggingRef.current = true;
    expect(press().defaultPrevented).toBe(false);
    initial.draggingRef.current = false;
    rerender({ ...initial, blocked: true });
    expect(press().defaultPrevented).toBe(false);
    rerender({ ...initial, canUndo: false });
    expect(press().defaultPrevented).toBe(false);
    const onUndo = vi.fn();
    rerender({ ...initial, onUndo });
    expect(press().defaultPrevented).toBe(true);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(initial.onUndo).not.toHaveBeenCalled();
    unmount();
    expect(press().defaultPrevented).toBe(false);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
