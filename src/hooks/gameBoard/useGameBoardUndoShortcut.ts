import { useEffect, useRef, type RefObject } from 'react';

type Args = {
  canUndo: boolean;
  blocked: boolean;
  draggingRef: RefObject<boolean>;
  onUndo: () => void;
};

const isEditing = (target: EventTarget | null): boolean => target instanceof Element && Boolean(
  target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]'),
);

const isVisible = (element: Element): boolean => {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true' ||
      style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
};

export function useGameBoardUndoShortcut({ canUndo, blocked, draggingRef, onUndo }: Args) {
  const composingRef = useRef(false);
  useEffect(() => {
    const startComposition = () => { composingRef.current = true; };
    const endComposition = () => { composingRef.current = false; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key.toLowerCase() !== 'z' ||
        event.ctrlKey === event.metaKey || event.shiftKey || event.altKey ||
        event.repeat || event.isComposing || event.keyCode === 229 || composingRef.current ||
        !canUndo || blocked || draggingRef.current) return;
      if (event.composedPath().some(isEditing) || isEditing(document.activeElement)) return;
      // Include app navigation and touch popovers outside the page's dialog state.
      if ([...document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"], [aria-haspopup][aria-expanded="true"], [data-testid="gameboard-touch-action-sheet"]')].some(isVisible)) return;
      event.preventDefault();
      onUndo();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('compositionstart', startComposition);
    window.addEventListener('compositionend', endComposition);
    window.addEventListener('blur', endComposition);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('compositionstart', startComposition);
      window.removeEventListener('compositionend', endComposition);
      window.removeEventListener('blur', endComposition);
    };
  }, [canUndo, blocked, draggingRef, onUndo]);
}
