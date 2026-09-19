const isWithinGameCard = (target: HTMLElement): boolean => Boolean(target.closest('.game-card'));
const isWithinButton = (target: HTMLElement): boolean => Boolean(target.closest('button'));
const isWithinLeaderZone = (target: HTMLElement): boolean => Boolean(target.closest('[data-leader-zone]'));

export const shouldDismissOnEscapeKey = (key: string): boolean => key === 'Escape';

export const shouldDismissModalOnBackdropClick = (
  target: EventTarget | null,
  currentTarget: EventTarget | null
): boolean => target !== null && currentTarget !== null && target === currentTarget;

export const shouldDismissAttackModeOnPointerDown = (
  target: HTMLElement | null
): boolean => {
  if (!target) return false;

  return !isWithinGameCard(target)
    && !isWithinButton(target)
    && !isWithinLeaderZone(target);
};

export const shouldDismissInspectorOnPointerDown = (
  target: HTMLElement | null,
  inspectorElement: HTMLElement | null
): boolean => {
  if (!target) return false;
  if (inspectorElement?.contains(target)) return false;

  return !isWithinGameCard(target);
};
