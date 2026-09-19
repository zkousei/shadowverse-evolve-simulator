import { describe, expect, it } from 'vitest';
import {
  shouldDismissAttackModeOnPointerDown,
  shouldDismissModalOnBackdropClick,
  shouldDismissOnEscapeKey,
  shouldDismissInspectorOnPointerDown,
} from './gameBoardDismissals';

describe('gameBoardDismissals', () => {
  it('recognizes Escape as the dismissal key', () => {
    expect(shouldDismissOnEscapeKey('Escape')).toBe(true);
    expect(shouldDismissOnEscapeKey('Enter')).toBe(false);
  });

  it('dismisses modal backdrops only when the overlay itself is clicked', () => {
    const overlay = document.createElement('div');
    const dialog = document.createElement('div');
    overlay.appendChild(dialog);

    expect(shouldDismissModalOnBackdropClick(overlay, overlay)).toBe(true);
    expect(shouldDismissModalOnBackdropClick(dialog, overlay)).toBe(false);
    expect(shouldDismissModalOnBackdropClick(null, overlay)).toBe(false);
  });

  it('keeps attack mode open when the pointer lands on cards, buttons, or leader zones', () => {
    const card = document.createElement('div');
    card.className = 'game-card';

    const cardChild = document.createElement('span');
    card.appendChild(cardChild);

    const button = document.createElement('button');
    const leaderZone = document.createElement('div');
    leaderZone.setAttribute('data-leader-zone', 'leader-host');
    const leaderChild = document.createElement('span');
    leaderZone.appendChild(leaderChild);

    expect(shouldDismissAttackModeOnPointerDown(cardChild)).toBe(false);
    expect(shouldDismissAttackModeOnPointerDown(button)).toBe(false);
    expect(shouldDismissAttackModeOnPointerDown(leaderChild)).toBe(false);
  });

  it('dismisses attack mode when the pointer lands outside allowed elements', () => {
    const backdrop = document.createElement('div');

    expect(shouldDismissAttackModeOnPointerDown(backdrop)).toBe(true);
    expect(shouldDismissAttackModeOnPointerDown(null)).toBe(false);
  });

  it('keeps the inspector open when clicking inside the inspector or on a card', () => {
    const inspector = document.createElement('div');
    const inspectorChild = document.createElement('span');
    inspector.appendChild(inspectorChild);

    const card = document.createElement('div');
    card.className = 'game-card';
    const cardChild = document.createElement('span');
    card.appendChild(cardChild);

    expect(shouldDismissInspectorOnPointerDown(inspectorChild, inspector)).toBe(false);
    expect(shouldDismissInspectorOnPointerDown(cardChild, inspector)).toBe(false);
  });

  it('dismisses the inspector when clicking outside both the inspector and cards', () => {
    const inspector = document.createElement('div');
    const backdrop = document.createElement('div');

    expect(shouldDismissInspectorOnPointerDown(backdrop, inspector)).toBe(true);
    expect(shouldDismissInspectorOnPointerDown(null, inspector)).toBe(false);
  });
});
